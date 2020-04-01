import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { EditorType } from '../../model/json/editorType';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { DataModelService } from '../../services/dataModelService';
import { EventService } from '../../services/eventService';
import { DataChangedEvent } from '../../model/event/dataChangedEvent';
import { DataChangeType } from '../../model/event/dataChangedType';
import { filter, take } from 'rxjs/operators';

@Component({
    selector: 'xn-data-model-editor',
    templateUrl: 'dataModelEditor.html',
    styleUrls: ['dataModelEditor.scss'],
})
export class DataModelEditorComponent {

    public editorTypes = EditorType;

    public responseModel$ = this._dataModelService.getResponseModel();
    public requestModel$ = this._dataModelService.getDataModel();
    public requestModelsExceptCurrent$ = this._dataModelService.getDataModelsExceptCurrent();
    public requestModelReferenced$ = this._dataModelService.getCurrentDataModelReference();

    public constructor(private _dataModelService: DataModelService,
                       private _eventService: EventService) {}

    public onNewModelCreated(requestModel: ObjectDefinition) {
        this._eventService.publishEvent(new DataChangedEvent(DataChangeType.DATAMODEL));
        this._dataModelService.newDataModel(requestModel);
    }

    public onRequestModelChanged(requestModel: ObjectDefinition) {
        this._eventService.publishEvent(new DataChangedEvent(DataChangeType.DATAMODEL));
        this._dataModelService.dataModelChanged(requestModel);
    }

    public onExistingModelSelected(existingModel: string) {
        this.requestModelReferenced$
            .pipe(
                take(1),
                filter(referencedModel => referencedModel !== existingModel)
            )
            .subscribe(_ => {
                this._eventService.publishEvent(new DataChangedEvent(DataChangeType.DATAMODEL));
                this._dataModelService.setCurrentDataModelReference(existingModel);
            });
    }
}
