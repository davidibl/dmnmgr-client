import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class WorkingStateService {

    private baseState = 'Bereit';
    private currentOpenStates = {};
    private stateSubject = new BehaviorSubject(this.baseState);

    public setState(id: string, state: string) {
        this.currentOpenStates[id] = state;
        this.stateSubject.next(state);
    }

    public resetState(id: string) {
        this.currentOpenStates[id] = undefined;
        if (JSON.stringify(this.currentOpenStates) === JSON.stringify({})) {
            this.stateSubject.next(this.baseState);
        }
    }

    public getWorkingState() {
        return this.stateSubject;
    }

}
