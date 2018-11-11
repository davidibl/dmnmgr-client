import { Injectable } from "@angular/core";
import { ReplaySubject,Observable } from "rxjs";
import { BaseEvent } from '../model/event';
import { filter } from 'rxjs/operators';

@Injectable()
export class EventService {

    private _events: ReplaySubject<BaseEvent<any>>;

    public publishEvent(event: BaseEvent<any>) {
        this._events.next(event);
    }

    public getEvent(filterCallback?: (event: BaseEvent<any>) => boolean): Observable<BaseEvent<any>> {
        return this._events
            .pipe(
                filter(filterCallback)
            );
    }

}
