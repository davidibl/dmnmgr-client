import { Component, OnInit, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { EditorType } from '../../model/json/editorType';
import { DataModelService } from '../../services/dataModelService';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { SessionDataService } from '../../services/sessionDataService';
import { TestDecisionService } from '../../services/testDecisionService';
import { DecisionSimulationResult } from '../../model/decisionSimulationResult';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event/event';

@Component({
    selector: 'xn-dmn-simulator',
    templateUrl: 'dmnSimulator.html',
    styleUrls: ['dmnSimulator.scss'],
})
export class DmnSimulatorComponent implements OnInit {

    public editorTypes = EditorType;

    public dataModel$: Observable<ObjectDefinition>;
    public valueObject: Object;

    public currentlyTesting = false;

    public showHitsOnly$ = this._testDecisionService.getShowHitsOnly();

    @Input()
    public isVisisble = false;
    public simulatorVisisble = false;

    public simulationResult$: Observable<DecisionSimulationResult>;
    public responseModel$: Observable<ObjectDefinition>;

    public constructor(private _dataModelService: DataModelService,
                       private _sessionDataService: SessionDataService,
                       private _testDecisionService: TestDecisionService,
                       private _eventService: EventService) {}

    public ngOnInit() {
        this.dataModel$ = this._dataModelService.getDataModel();
        this._sessionDataService
            .getValue('tempObject', {})
            .pipe(
                take(1)
            )
            .subscribe(value => this.valueObject = (value) ? value : {});

        this.responseModel$ = this._dataModelService.getResponseModel();

        this.simulationResult$ = this._testDecisionService
            .getResult()
            .pipe( tap(_ => this.currentlyTesting = false ));
    }

    public simulate() {

        this.currentlyTesting = true;
        this._testDecisionService.simulateDecision(this.valueObject);
    }

    public reset() {
        this._testDecisionService.resetTest();
        this.valueObject = {};
    }

    public setShowHitsOnly(showHitsOnly: boolean) {
        this._testDecisionService.setShowHitsOnly(showHitsOnly);
    }

    public openSimulator() {
        if (this.simulatorVisisble) {
            this.simulate();
            return;
        }
        this.simulatorVisisble = true;
    }

    public onNewValueObjectCreated(value: Object) {
        this.valueObject = value;
        this._sessionDataService.setValue('tempObject', this.valueObject);
    }

    public takeAsTest(expectedResultData: Object[]) {
        const newTestData = {
            testdata: JSON.parse(JSON.stringify(this.valueObject)),
            expectedResult: expectedResultData
        };
        const ev = new BaseEvent('newTest', newTestData);
        this._eventService.publishEvent(ev);
    }
}
