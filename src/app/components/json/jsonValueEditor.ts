import { Component, Input, OnChanges, HostBinding } from '@angular/core';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { JsonDatatype } from '../../model/json/jsonDatatypes';
import { isNull } from '@xnoname/web-components';

@Component({
    selector: 'xn-json-value-editor',
    templateUrl: 'jsonValueEditor.html',
    styleUrls: ['jsonValueEditor.scss'],
})
export class JsonValueEditor implements OnChanges {

    private _datamodel: ObjectDefinition;
    private _value: any;
    private _arrayIndex: number;

    public jsonDatatype = JsonDatatype;

    @Input()
    public open = true;

    @HostBinding('class.flex')
    public isPrimitive = false;

    public unknownProperties: string[];

    @Input()
    public set datamodel(datamodel: ObjectDefinition) {
        if (!datamodel) { return; }
        this._datamodel = datamodel;
        switch (this._datamodel.type) {
            case JsonDatatype.OBJECT:
            case JsonDatatype.ARRAY:
                break;
            default:
                this.isPrimitive = true;
                break;
        }
    }

    public get datamodel() {
        return this._datamodel;
    }

    @Input()
    public set arrayIndex(arrayIndex: number) {
        this._arrayIndex = arrayIndex;
    }

    public get arrayIndex() {
        return this._arrayIndex;
    }

    @Input()
    public set value(value: any) {
        this._value = value;
    }

    public get value() {
        return this._value;
    }

    @Input()
    public viewOnly = false;

    public get editValue() {
        return (isNull(this.arrayIndex)) ? this.value[this.datamodel.name] : this.value[this.arrayIndex];
    }

    public set editValue(value: any) {
        if (isNull(this.arrayIndex)) {
            this.value[this.datamodel.name] = value;
        } else {
            this.value[this.arrayIndex] = value;
        }
    }

    @Input()
    public valueWithName: { key?: string, value?: any };

    public ngOnChanges() {
        if (this.datamodel && this.value && this.datamodel.properties) {
            const obj = (isNull(this.arrayIndex)) ? this.value : this.value[this.arrayIndex];
            const unknownProperties = Object
                .getOwnPropertyNames(obj)
                .filter(propertyName => !this.findDatamodel(propertyName));
            if (unknownProperties && unknownProperties.length > 0) {
                this.unknownProperties = unknownProperties;
            }
        }
        if (this.datamodel && this.value
            && this.datamodel.type !== JsonDatatype.OBJECT
            && this.datamodel.type !== JsonDatatype.ARRAY) {
            if (!this.value[this.datamodel.name]) {
                this.value[this.datamodel.name] = null;
            }
        }
    }

    public findDatamodel(propertyName) {
        return this.datamodel.properties.find(property => property.name === propertyName);
    }

    public getObjectValue(property: ObjectDefinition, value: any) {
        if (!isNull(this.arrayIndex)) {
            return this.value[this.arrayIndex];
        }
        if (value[property.name] === null || value[property.name] === undefined ||
            value[property.name] !== Object(value[property.name])) {
            value[property.name] = {};
        }
        return value[property.name];
    }

    public getPropertyOrRoot(property: ObjectDefinition, value: any) {
        if (isNull(property.name)) {
            return value;
        }
        if (isNull(value[property.name])) {
            value[property.name] = [];
        }
        return value[property.name];
    }

    public getPropertyParent() {
        return (isNull(this.arrayIndex)) ? this.value : this.value[this.arrayIndex];
    }

    public addArrayElement() {
        if (Array.isArray(this.value)) {
            if (this.datamodel.items.type === JsonDatatype.OBJECT) {
                this.value.push({});
                return;
            }
            this.value.push(null);
            return;
        }
        if (!this.value[this.datamodel.name] || !Array.isArray(this.value[this.datamodel.name])) {
            this.value[this.datamodel.name] = [];
        }
        if (this.datamodel.items.type === JsonDatatype.OBJECT) {
            this.value[this.datamodel.name].push({});
            return;
        }
        this.value[this.datamodel.name].push(null);
    }

    public trackByFn(index, item) {
        return index;
    }

    public removeArrayItem(arrayIndex: number) {
        this.value.splice(arrayIndex, 1);
    }

    public toggleNode() {
        this.open = !this.open;
    }
}
