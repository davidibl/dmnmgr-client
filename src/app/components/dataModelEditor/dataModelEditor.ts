import { Component, OnInit } from '@angular/core';
import { EditorType } from '../../model/json/editorType';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { DataModelService } from '../../services/dataModelService';
import { Observable } from 'rxjs/Observable';

@Component({
    selector: 'xn-data-model-editor',
    templateUrl: 'dataModelEditor.html',
    styleUrls: ['dataModelEditor.scss'],
})
export class DataModelEditorComponent implements OnInit {

    public editorTypes = EditorType;

    public responseModel$: Observable<ObjectDefinition>;
    public requestModel$: Observable<ObjectDefinition>;
    public requestModelsExceptCurrent$: Observable<string[]>;
    public requestModelReferenced$: Observable<string>;

    public constructor(private _dataModelService: DataModelService) {}

    public ngOnInit() {
        this.requestModel$ = this._dataModelService.getDataModel();
        this.responseModel$ = this._dataModelService.getResponseModel();
        this.requestModelsExceptCurrent$ = this._dataModelService.getDataModelsExceptCurrent();
        this.requestModelReferenced$ = this._dataModelService.getCurrentDataModelReference();
    }

    public onNewModelCreated(requestModel: ObjectDefinition) {
        this._dataModelService.newDataModel(requestModel);
    }

    public onRequestModelChanged(requestModel: ObjectDefinition) {
        this._dataModelService.dataModelChanged(requestModel);
    }

    public onExistingModelSelected(existingModel: string) {
        this._dataModelService.setCurrentDataModelReference(existingModel);
    }
}
