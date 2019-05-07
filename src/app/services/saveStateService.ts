import { Injectable } from "@angular/core";
import { EventService } from './eventService';
import { EventType } from '../model/event/eventType';
import { DataChangeTypes } from '../model/event/dataChangedType';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@Injectable()
export class SaveStateService {

    private _unsavedChanges: DataChangeTypes[] = [];
    private _hasChanges$ = new BehaviorSubject<boolean>(false);

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

    public hasChanges$() {
        return this._hasChanges$.asObservable();
    }

    public resetChanges() {
        this._unsavedChanges = [];
        this.updateChangeState();
    }

    public resetChange(changeType: DataChangeTypes) {
        this.removeFromUnsavedChanges(changeType);
        this.updateChangeState();
    }

    private addToUnsavedChanges(changeType: DataChangeTypes) {
        if (this._unsavedChanges.indexOf(changeType) < 0) {
            this._unsavedChanges.push(changeType);
            this.updateChangeState();
        }
    }

    private removeFromUnsavedChanges(changeType: DataChangeTypes) {
        this._unsavedChanges.splice(this._unsavedChanges.findIndex(type => type === changeType), 1);
        this.updateChangeState();
    }

    private updateChangeState() {
        this._hasChanges$.next(this.hasChanges());
    }
}
