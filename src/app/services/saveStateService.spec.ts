import { TestBed, async } from '@angular/core/testing';
import { SaveStateService } from './saveStateService';
import { ReplaySubject } from 'rxjs';
import { DataChangedEvent } from '../model/event/dataChangedEvent';
import { DataChangeType } from '../model/event/dataChangedType';

export class MockEventService {
    constructor(private events: ReplaySubject<any>) {}
    public getEvent(filter){
        return this.events;
    }
    public publishEvent(ev: any) {

    }
};

describe('SaveState Service', () => {
    beforeEach(async(() => {

        TestBed.configureTestingModule({
        }).compileComponents();
    }));

    describe('initialize', () => {

        it('should have an array to store unsaved changes', async(() => {
            const cut = new SaveStateService(<any>new MockEventService(new ReplaySubject(1)));
            expect(cut['_unsavedChanges']).not.toBeNull();
        }));

    });

    describe('handle changes', () => {

        it('should handle any new change correct', async(() => {
            const emitter = new ReplaySubject<any>(1);
            const cut = new SaveStateService(<any>new MockEventService(emitter));

            expect(cut.hasChanges()).toBeFalsy();

            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut.hasChanges()).toBeTruthy();
        }));

        it('should be able to remove specific change', async(() => {
            const emitter = new ReplaySubject<any>(1);
            const cut = new SaveStateService(<any>new MockEventService(emitter));

            expect(cut.hasChanges()).toBeFalsy();

            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut.hasChanges()).toBeTruthy();

            cut.resetChange(DataChangeType.DMN_MODEL);
            expect(cut.hasChanges()).toBeFalsy();
        }));

        it('should store every change exactly one time', async(() => {
            const emitter = new ReplaySubject<any>(1);
            const cut = new SaveStateService(<any>new MockEventService(emitter));

            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));
            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));
            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut['_unsavedChanges'].length).toBe(1);
        }));

        it('should store every change exactly one time, but really every', async(() => {
            const emitter = new ReplaySubject<any>(1);
            const cut = new SaveStateService(<any>new MockEventService(emitter));

            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));
            emitter.next(new DataChangedEvent(DataChangeType.DATAMODEL));
            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut['_unsavedChanges'].length).toBe(2);
        }));

        it('should reset completly', async(() => {
            const emitter = new ReplaySubject<any>(1);
            const cut = new SaveStateService(<any>new MockEventService(emitter));

            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));
            emitter.next(new DataChangedEvent(DataChangeType.DATAMODEL));
            emitter.next(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut.hasChanges()).toBeTruthy();
            cut.resetChanges();
            expect(cut.hasChanges()).toBeFalsy();
        }));

    });
});
