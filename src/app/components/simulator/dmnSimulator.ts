import { Component, OnInit, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { take, tap, map } from 'rxjs/operators';
import { EditorType } from '../../model/json/editorType';
import { DataModelService } from '../../services/dataModelService';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { SessionDataService } from '../../services/sessionDataService';
import { TestDecisionService } from '../../services/testDecisionService';
import { DecisionSimulationResult } from '../../model/decisionSimulationResult';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event/event';
import { AppConfigurationService } from '../../services/appConfigurationService';
import { EventType } from '../../model/event/eventType';
import { TabIds } from '../../model/tabIds';

@Component({
    selector: 'xn-dmn-simulator',
    templateUrl: 'dmnSimulator.html',
    styleUrls: ['dmnSimulator.scss'],
})
export class DmnSimulatorComponent implements OnInit {

    private readonly SESSION_NAME = 'tempObject';

    private _simulatorVisible = false;
    public editorTypes = EditorType;

    public dataModel$: Observable<ObjectDefinition>;
    public valueObject$ = this._sessionDataService.getValue(this.SESSION_NAME, {});

    public currentlyTesting = false;

    public showHitsOnly$ = this._testDecisionService.getShowHitsOnly();

    public urlConfigured$ = this._appConfigurationService
        .getBaseUrlSimulator().pipe(map(url => !!url));

    @Input()
    public isVisible = false;

    public set simulatorVisible(simulatorVisible: boolean) {
        this._simulatorVisible = simulatorVisible;
        if (simulatorVisible) {
            this.valueObject$
                .pipe(take(1), map(value => Object.assign({}, value)))
                .subscribe(value => this._sessionDataService.setValue(this.SESSION_NAME, value));
        }
    }

    public get simulatorVisible() {
        return this._simulatorVisible;
    }

    public simulationResult$: Observable<DecisionSimulationResult>;
    public responseModel$: Observable<ObjectDefinition>;

    public constructor(
        private _dataModelService: DataModelService,
        private _sessionDataService: SessionDataService,
        private _testDecisionService: TestDecisionService,
        private _eventService: EventService,
        private _appConfigurationService: AppConfigurationService,
    ) {}

    public ngOnInit() {
        this.dataModel$ = this._dataModelService.getDataModel();

        this.responseModel$ = this._dataModelService.getResponseModel();

        this.simulationResult$ = this._testDecisionService
            .getResult()
            .pipe( tap(_ => this.currentlyTesting = false ));
    }

    public simulate() {

        this.currentlyTesting = true;
        this.valueObject$
            .pipe(take(1))
            .subscribe(value => this._testDecisionService.simulateDecision(value));
    }

    public reset() {
        this._testDecisionService.resetTest();
        this._sessionDataService.setValue('tempObject', null);
    }

    public setShowHitsOnly(showHitsOnly: boolean) {
        this._testDecisionService.setShowHitsOnly(showHitsOnly);
    }

    public openSimulator() {
        if (this.simulatorVisible) {
            this.simulate();
            return;
        }
        this.simulatorVisible = true;
    }

    public onNewValueObjectCreated(value: Object) {
        this._sessionDataService.setValue(this.SESSION_NAME, value);
    }

    public takeAsTest(expectedResultData: Object[]) {
        this.valueObject$
            .pipe(take(1))
            .subscribe(value => {
                const newTestData = {
                    testdata: JSON.parse(JSON.stringify(value)),
                    expectedResult: expectedResultData
                };
                const ev = new BaseEvent(EventType.NEW_TEST, newTestData);
                this._eventService.publishEvent(ev);
            });
    }

    public openSettings() {
        this._eventService.publishEvent(new BaseEvent(EventType.JUMP_TO_TAB, TabIds.settings));
    }
}
