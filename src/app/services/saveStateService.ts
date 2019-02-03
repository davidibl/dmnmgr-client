import { Injectable } from "@angular/core";
import { EventService } from './eventService';
import { EventType } from '../model/event/eventType';

@Injectable()
export class SaveStateService {

    private hasChange = false;

    public constructor(private _eventService: EventService) {
        this._eventService
            .getEvent((ev) => ev.type === EventType.DATA_CHANGED)
            .subscribe(_ => {
                this.hasChange = true;
            });
    }

    public resetChanges() {
        this.hasChange = false;
    }
}
