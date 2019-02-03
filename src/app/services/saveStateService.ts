import { Injectable } from "@angular/core";
import { EventService } from './eventService';
import { EventType } from '../model/event/eventType';
import { DataChangeTypes } from '../model/event/dataChangedType';

@Injectable()
export class SaveStateService {

    private _unsavedChanges: DataChangeTypes[] = [];

    public constructor(private _eventService: EventService) {
        this._eventService
            .getEvent((ev) => ev.type === EventType.DATA_CHANGED)
            .subscribe(ev => {
                this.addToUnsavedChanges(ev.data);
            });
    }

    public hasChanges() {
        return this._unsavedChanges.length > 0;
    }

    public resetChanges() {
        this._unsavedChanges = [];
    }

    public resetChange(changeType: DataChangeTypes) {
        this.removeFromUnsavedChanges(changeType);
    }

    private addToUnsavedChanges(changeType: DataChangeTypes) {
        if (this._unsavedChanges.indexOf(changeType) < 0) {
            this._unsavedChanges.push(changeType);
        }
    }

    private removeFromUnsavedChanges(changeType: DataChangeTypes) {
        this._unsavedChanges.splice(this._unsavedChanges.findIndex(type => type === changeType), 1);
    }
}
