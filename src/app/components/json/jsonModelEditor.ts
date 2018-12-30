import { Component, Input, Output, EventEmitter } from '@angular/core';
import { JsonObjectDefinition } from '../../model/json/jsonObjectDefinition';
import { JsonDatatypeOptions, JsonDatatypes, JsonDatatype } from '../../model/json/jsonDatatypes';
import { ObjectDefinition } from '../../model/json/objectDefinition';

@Component({
    selector: 'xn-json-model-editor',
    templateUrl: 'jsonModelEditor.html',
    styleUrls: ['jsonModelEditor.scss'],
})
export class JsonModelEditorComponent {

    private static DEFAULT_NEW: ObjectDefinition = { type: JsonDatatype.STRING };

    private _datamodel: ObjectDefinition;

    public jsonDatatypeOptions = JsonDatatypeOptions;
    public jsonDatatype = JsonDatatype;

    @Input()
    public open = true;

    @Input()
    public name: string;

    @Input()
    public set datamodel(datamodel: ObjectDefinition) {
        this._datamodel = datamodel;
    }

    @Output()
    public removePropertyRequested = new EventEmitter<ObjectDefinition>();

    public get datamodel() {
        return this._datamodel;
    }

    public onDatamodelTypeChange(datatype: JsonDatatypes) {
        if (datatype == this.datamodel.type) { return; }
        if (datatype !== JsonDatatype.OBJECT && this.datamodel.properties) {
            this.datamodel.properties = void 0;
        }
        if (datatype !== JsonDatatype.ARRAY && this.datamodel.items) {
            this.datamodel.items = void 0;
        }
        if (datatype !== JsonDatatype.ENUMERATION) {
            this.datamodel.enum = void 0;
        }
        if (datatype === JsonDatatype.ARRAY) {
            this.datamodel.items = Object.assign({}, JsonModelEditorComponent.DEFAULT_NEW);
        }
        this.datamodel.type = datatype;
    }

    public removeProperty() {
        this.removePropertyRequested.emit(this._datamodel);
    }

    public onRemovePropertyRequested(property: ObjectDefinition) {
        this._datamodel.properties.splice(this._datamodel.properties.indexOf(property), 1);
    }

    public addProperty() {
        console.log(this.datamodel);
        if (!this.datamodel.properties) {
            this.datamodel.properties = [];
        }

        const suffix = this.findFreePropertyIndex();
        const newElement = Object.assign({}, JsonModelEditorComponent.DEFAULT_NEW);
        newElement.name = 'Eigenschaft' + suffix;
        this.datamodel.properties.push(newElement);
    }

    private findFreePropertyIndex(): string {
        if (!this.hasPropertyWithName(this.datamodel.properties, 'Eigenschaft')) {
            return '';
        }
        let counter = 1;
        while (true) {
            if (!this.hasPropertyWithName(this.datamodel.properties, 'Eigenschaft' + counter)) {
                return '' + counter;
            }
            counter++;
        }
    }

    private hasPropertyWithName(properties: ObjectDefinition[], name: string) {
        return !!properties.find(prop => prop.name === name);
    }

    public toggleNode() {
        this.open = !this.open;
    }

}
