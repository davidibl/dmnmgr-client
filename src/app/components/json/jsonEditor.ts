import { Component, Input, OnInit, ViewChild, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { EditorType } from '../../model/json/editorType';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { JsonDatatype } from '../../model/json/jsonDatatypes';
import { ImportApiDefinitionComponent } from './importWorkflow/importApiDefinition';

@Component({
    selector: 'xn-json-editor',
    templateUrl: 'jsonEditor.html',
    styleUrls: ['jsonEditor.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonEditorComponent implements OnInit {

    @ViewChild(ImportApiDefinitionComponent)
    private _importer: ImportApiDefinitionComponent;

    private _requestModel: ObjectDefinition;
    private _value: Object;

    public editorTypes = EditorType;
    public importerOpen = false;

    @Input()
    public type = EditorType.MODEL;

    @Input()
    public viewOnly = false;

    @Input()
    public hideButtons = false;

    public get value() {
        return this._value;
    }

    @Input()
    public set value(value: Object) {
        this._value = value;
    }

    public get requestModel() {
        return this._requestModel;
    }

    @Input()
    public set requestModel(requestModel: ObjectDefinition) {
        this._requestModel = requestModel;
    }

    @Output()
    public requestModelChange = new EventEmitter<ObjectDefinition>();

    @Output()
    public newModelCreate = new EventEmitter<ObjectDefinition>();

    @Output()
    public valueChange = new EventEmitter<Object>();

    public get editorNodeVisible() {
        return (!!this.requestModel) ||
               (this.type === EditorType.VALUE &&
                !!this._value && !!this.requestModel);
    }

    public constructor() {}

    public ngOnInit() {
    }

    public openImporter() {
        this.importerOpen = true;
    }

    public onImportWorkflowCompleted(objectDefinition: ObjectDefinition) {
        this._requestModel = objectDefinition;
        this.importerOpen = false;
        this.newModelCreate.emit(this._requestModel);
        this._importer.reset();
    }

    public createNewEmptyModel() {
        this._requestModel = this.createEmptyObject();
        this.newModelCreate.emit(this._requestModel);
    }

    public createNewEmptyValue() {
        this._value = this.createEmptyValue();
        this.valueChange.emit(this._value);
    }

    public onDatamodelChange() {
        this.requestModel = Object.assign({}, this.requestModel);
        this.requestModelChange.emit(this.requestModel);
    }

    private createEmptyObject(): ObjectDefinition {
        return { type: JsonDatatype.OBJECT };
    }

    private createEmptyValue() {
        return {};
    }

}
