import { Component } from "@angular/core";
import { DataEntity } from '../../model/dataEntity';
import { TestDecisionService } from '../../services/testDecisionService';
import { KeyValuePair } from "@xnoname/web-components";
import { catchError } from "rxjs/operators";

@Component({
    selector: 'xn-data-model',
    templateUrl: 'dataModel.html',
    styleUrls: ['dataModel.scss'],
})
export class DataModelComponent {

    public dataModel: DataEntity;
    public result: KeyValuePair[];
    public errorMessage: string;
    public evaluatingDecision = false;

    public constructor(private _testDecisionService: TestDecisionService) {}

    public addDataModel() {
        const newDataEntity = new DataEntity('object', 'request');
        newDataEntity.addProperty(new DataEntity('string', 'property-1'))
        this.dataModel = newDataEntity;
    }

    public tryIt() {
        this.evaluatingDecision = true;
        this._testDecisionService
            .testDecision(this.dataModel)
            .subscribe(response => {
                this.result = response.result;
                this.errorMessage = response.message;
                this.evaluatingDecision = false;
            });
    }
}
