import { Injectable } from "@angular/core";
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { of } from 'rxjs/Observable/of';

@Injectable()
export class SessionDataService {

    private _sessionData = new Map<string, ReplaySubject<Object>>();

    public setValue(key: string, value: Object) {
        if (!this._sessionData.has(key)) {
            this._sessionData.set(key, new ReplaySubject(1));
        }
        this._sessionData.get(key).next(value);
    }

    public getValue(key: string) {
        if (!this._sessionData.has(key)) { return of(null); }
        return this._sessionData.get(key).asObservable();
    }

    public clearSession() {
        this._sessionData.forEach(keyValue => {
            keyValue.next(null);
        });
        this._sessionData.clear();
    }
}
