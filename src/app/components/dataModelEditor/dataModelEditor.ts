import { Component } from '@angular/core';
import { EditorType } from '../../model/json/editorType';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { DataModelService } from '../../services/dataModelService';

@Component({
    selector: 'xn-data-model-editor',
    templateUrl: 'dataModelEditor.html',
    styleUrls: ['dataModelEditor.scss'],
})
export class DataModelEditorComponent {

    public editorTypes = EditorType;

    public constructor(private _dataModelService: DataModelService) {}

    public onRequestModelChanged(requestModel: ObjectDefinition) {
        this._dataModelService.newDataModel(requestModel);
    }
}
