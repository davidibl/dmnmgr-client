import { Component, OnInit, Input } from '@angular/core';
import { EditorType } from '../../model/json/editorType';
import { DataModelService } from '../../services/dataModelService';
import { Observable } from 'rxjs/Observable';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { SessionDataService } from '../../services/sessionDataService';
import { take } from 'rxjs/operators/take';
import { TestDecisionService } from '../../services/testDecisionService';
import { DecisionTestCaseResult } from '../../model/decisionTestCaseResult';
import { tap } from 'rxjs/operators/tap';

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

    @Input()
    public isVisisble = false;
    public simulatorVisisble = false;

    public simulationResult$: Observable<DecisionTestCaseResult>;

    public constructor(private _dataModelService: DataModelService,
                       private _sessionDataService: SessionDataService,
                       private _testDecisionService: TestDecisionService) {}

    public ngOnInit() {
        this.dataModel$ = this._dataModelService.getDataModel();
        this._sessionDataService
            .getValue('tempObject')
            .pipe(
                take(1)
            )
            .subscribe(value => this.valueObject = (value) ? value : {});

        this.simulationResult$ = this._testDecisionService
            .getResult()
            .pipe( tap(_ => this.currentlyTesting = false ));
    }

    public simulate() {

        this.currentlyTesting = true;
        this._testDecisionService.simulateDecision(this.valueObject);
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
}
