import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum ClipBoardDataType {
    DMN_RULES = 'dmnRules'
}

export class ClipboardData {
    public constructor(
        public type: ClipBoardDataType,
        public data: string
    ) {}
}

@Injectable()
export class DmnClipboardService {

    private _dataCache = new BehaviorSubject<ClipboardData>(null);

    public getData() {
        return this._dataCache.asObservable();
    }

    public copyData(type: ClipBoardDataType, data: string) {
        this._dataCache.next(new ClipboardData(type, data));
    }
}
