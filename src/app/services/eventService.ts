import { Injectable } from "@angular/core";
import { ReplaySubject,Observable } from "rxjs";
import { BaseEvent } from '../model/event';
import { filter } from 'rxjs/operators';

@Injectable()
export class EventService {

    private _events = new ReplaySubject<BaseEvent<any>>(1);

    public publishEvent(event: BaseEvent<any>) {
        this._events.next(event);
    }

    public getEvent<T extends BaseEvent<any>>(filterCallback?: (event: T) => boolean): Observable<T> {
        return this._events
            .pipe(
                filter(filterCallback)
            );
    }

}
