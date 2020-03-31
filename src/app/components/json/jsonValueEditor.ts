import { Component, Input, OnChanges, HostBinding, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { JsonDatatype } from '../../model/json/jsonDatatypes';
import { isNull } from '@xnoname/web-components';

@Component({
    selector: 'xn-json-value-editor',
    templateUrl: 'jsonValueEditor.html',
    styleUrls: ['jsonValueEditor.scss'],
})
export class JsonValueEditorComponent implements OnChanges {

    private _datamodel: ObjectDefinition;
    private _value: any;
    private _arrayIndex: number;

    public jsonDatatype = JsonDatatype;

    @Input()
    public open = true;

    @HostBinding('class.flex')
    public isPrimitive = false;

    public objectSetToNull = true;

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
        if (!isNull(value)) {
            this.objectSetToNull = false;
        }
        this._value = value;
        this._changeDetector.detectChanges();
    }

    public get value() {
        return this._value;
    }

    @Input()
    public viewOnly = false;

    @Output()
    public childObjectValueChange = new EventEmitter<{ newValue: any, propertyName: string}>();

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

    public constructor(private _changeDetector: ChangeDetectorRef) {}

    public ngOnChanges() {
        if (this.datamodel && this.value && this.datamodel.properties) {
            const obj = (isNull(this.arrayIndex)) ? this.value : this.value[this.arrayIndex];
            Object
                .getOwnPropertyNames(obj)
                .filter(propertyName => !this.findDatamodel(propertyName))
                .forEach(property => delete obj[property]);
        }
        if (this.datamodel && this.value
            && this.datamodel.type !== JsonDatatype.OBJECT
            && this.datamodel.type !== JsonDatatype.ARRAY) {
            if (isNull(this.value[this.datamodel.name])) {
                this.value[this.datamodel.name] = null;
            }
        }
    }

    public findDatamodel(propertyName) {
        return this.datamodel.properties.find(property => property.name === propertyName);
    }

    public getObjectValue(property: ObjectDefinition, value: any, objectSetToNull: boolean) {
        if (!isNull(this.arrayIndex)) {
            return this.value[this.arrayIndex];
        }
        if (value[property.name] === null || value[property.name] === undefined ||
            value[property.name] !== Object(value[property.name])) {

                if (!this.objectSetToNull) {
                    // value[property.name] = {};
                }
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

    public deleteObjectValue() {
        this.objectSetToNull = true;
        this.childObjectValueChange.emit({ newValue: null, propertyName: this.datamodel.name});
    }

    public addObjectValue() {
        this.objectSetToNull = false;
        this.childObjectValueChange.emit({ newValue: {}, propertyName: this.datamodel.name});
    }

    public onChildObjectValueChanged(newValue: {newValue: any, propertyName: string}) {
        this.value[newValue.propertyName] = newValue.newValue;
    }

    public toggleNode() {
        this.open = !this.open;
        if (this.open) {
            this._changeDetector.detectChanges();
        }
    }
}
