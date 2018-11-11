import { Component, Input, HostBinding, Output, EventEmitter } from "@angular/core";
import { DataEntity } from '../../model/dataEntity';

@Component({
    selector: 'xn-data-entity-view',
    templateUrl: 'dataEntityView.html',
    styleUrls: ['dataEntityView.scss'],
})
export class DataEntityViewComponent {

    @Input()
    public dataEntity: DataEntity;

    @Input()
    @HostBinding('class.root')
    public root = false;

    @Output()
    public removeClick = new EventEmitter<DataEntity>();

    @HostBinding('class.object')
    public get isObject() {
        return this.dataEntity.type === 'object';
    }

    public addProperty() {
        this.dataEntity.addProperty(new DataEntity());
    }

    public onDeleteRowClick() {
        this.removeClick.emit(this.dataEntity);
    }

    public onRemoveClick(childEntity: DataEntity) {
        this.dataEntity.removeProperty(childEntity);
    }
}
