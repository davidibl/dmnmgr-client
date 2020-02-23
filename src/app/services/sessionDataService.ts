import { Injectable } from '@angular/core';
import { ReplaySubject, BehaviorSubject, Subject, merge } from 'rxjs';
import { EventService } from './eventService';
import { map, take, switchMap } from 'rxjs/operators';
import { NewViewEvent } from '../model/event/newViewEvent';
import { EventType } from '../model/event/eventType';
import { RenameArtefactEvent } from '../model/event/renameArtefactEvent';

@Injectable()
export class SessionDataService {

    private _sessionData = new Map<string, Map<String, Subject<Object>>>();
    private _permanentData = new Map<string, Subject<Object>>();

    private _artefactId = merge(
        this._eventService
            .getEvent<NewViewEvent>((ev) => ev.type === EventType.NEW_VIEW)
            .pipe( map(event => event.data.artefactId)),
        this._eventService
            .getEvent<RenameArtefactEvent>((ev) => ev.type === EventType.RENAME_ARTEFACT)
            .pipe(map(event => event.data.newArtefactId))
    );

    public constructor(
        private _eventService: EventService,
    ) {}

    public setValue(key: string, value: Object) {
        this._artefactId
            .pipe(take(1))
            .subscribe(artefactId => {
                this.initializeSessionIfNotPresent(artefactId, key, value);
                this._sessionData.get(artefactId).get(key).next(value);
            });
    }

    public setPermanentValue(key: string, value: Object) {
        if (!this._permanentData.has(key)) {
            this._permanentData.set(key, new ReplaySubject(1));
        }
        this._permanentData.get(key).next(value);
    }

    public getValue(key: string, optionalDefault?: unknown) {
        return this._artefactId
            .pipe(
                switchMap(artefactId => {
                    this.initializeSessionIfNotPresent(artefactId, key, optionalDefault);
                    return this._sessionData.get(artefactId).get(key);
                })
            );
    }

    public getPermanentValue(key: string) {
        if (!this._permanentData.has(key)) { this._permanentData.set(key, new BehaviorSubject<Object>(null)); }
        return this._permanentData.get(key).asObservable();
    }

    private initializeSessionIfNotPresent(artefactId: string, key: string, optionalDefault: unknown) {
        if (!this._sessionData.has(artefactId)) { this._sessionData.set(artefactId, new Map()); }
        if (!this._sessionData.get(artefactId).has(key)) {
            this._sessionData.get(artefactId).set(key, new BehaviorSubject(optionalDefault));
        }
    }

}
