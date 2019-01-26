import { Injectable } from "@angular/core";
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/internal/Subject';

@Injectable()
export class SessionDataService {

    private _sessionData = new Map<string, Subject<Object>>();
    private _permanentData = new Map<string, Subject<Object>>();

    public setValue(key: string, value: Object) {
        if (!this._sessionData.has(key)) {
            this._sessionData.set(key, new ReplaySubject(1));
        }
        this._sessionData.get(key).next(value);
    }

    public setPermanentValue(key: string, value: Object) {
        if (!this._permanentData.has(key)) {
            this._permanentData.set(key, new ReplaySubject(1));
        }
        this._permanentData.get(key).next(value);
    }

    public getValue(key: string) {
        if (!this._sessionData.has(key)) { this._sessionData.set(key, new BehaviorSubject<Object>(null)); }
        return this._sessionData.get(key).asObservable();
    }

    public getPermanentValue(key: string) {
        if (!this._permanentData.has(key)) { this._permanentData.set(key, new BehaviorSubject<Object>(null)); }
        return this._permanentData.get(key).asObservable();
    }

    public clearSession() {
        this._sessionData.forEach(keyValue => {
            keyValue.next(null);
        });
        this._sessionData.clear();
    }
}
