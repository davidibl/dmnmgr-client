import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EditorType } from '../../model/json/editorType';
import { JsonObjectDefinition } from '../../model/json/jsonObjectDefinition';

@Component({
    selector: 'xn-json-tree-node',
    templateUrl: 'jsonTreeNode.html',
    styleUrls: ['jsonTreeNode.scss'],
})
export class JsonTreeNodeComponent {

    private _open = false;

    public editorTypes = EditorType;

    @Input()
    public type = EditorType.MODEL;

    @Input()
    public datamodel: JsonObjectDefinition;

    @Input()
    public value: Object;

    @Input()
    public viewOnly = false;

    @Output()
    public openChange = new EventEmitter<boolean>();

    @Output()
    public datamodelChange = new EventEmitter<void>();

    public get open() {
        return this._open;
    }

    public set open(open: boolean) {
        this._open = open;
        this.openChange.emit(this._open);
    }

    public toggleOpenState() {
        this.open = !this.open;
    }
}
