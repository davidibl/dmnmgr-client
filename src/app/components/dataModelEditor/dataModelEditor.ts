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

    public constructor(private _dataModelService: DataModelService) {}

    public ngOnInit() {
        this.responseModel$ = this._dataModelService.getResponseModel();
    }

    public onRequestModelChanged(requestModel: ObjectDefinition) {
        this._dataModelService.newDataModel(requestModel);
    }
}
