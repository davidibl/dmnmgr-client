import { TestBed, async } from '@angular/core/testing';
import { SaveStateService } from './saveStateService';
import { ReplaySubject } from 'rxjs';
import { DataChangedEvent } from '../model/event/dataChangedEvent';
import { DataChangeType } from '../model/event/dataChangedType';
import { EventService } from './eventService';

describe('SaveState Service', () => {

    let cut: SaveStateService;
    let eventService: EventService;

    beforeEach(async(() => {

        TestBed.configureTestingModule({
            providers: [
                SaveStateService,
                EventService,
            ]
        });

        cut = TestBed.inject(SaveStateService);
        eventService = TestBed.inject(EventService);
    }));

    describe('initialize', () => {

        it('should have an array to store unsaved changes', async(() => {
            expect(cut['_unsavedChanges']).not.toBeNull();
        }));

    });

    describe('handle changes', () => {

        it('should handle any new change correct', async(() => {

            expect(cut.hasChanges()).toBeFalsy();

            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut.hasChanges()).toBeTruthy();
        }));

        it('should be able to remove specific change', async(() => {

            expect(cut.hasChanges()).toBeFalsy();

            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut.hasChanges()).toBeTruthy();

            cut.resetChange(DataChangeType.DMN_MODEL);
            expect(cut.hasChanges()).toBeFalsy();
        }));

        it('should store every change exactly one time', async(() => {

            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));
            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));
            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut['_unsavedChanges'].length).toBe(1);
        }));

        it('should store every change exactly one time, but really every', async(() => {

            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));
            eventService.publishEvent(new DataChangedEvent(DataChangeType.DATAMODEL));
            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut['_unsavedChanges'].length).toBe(2);
        }));

        it('should reset completly', async(() => {

            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));
            eventService.publishEvent(new DataChangedEvent(DataChangeType.DATAMODEL));
            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));

            expect(cut.hasChanges()).toBeTruthy();
            cut.resetChanges();
            expect(cut.hasChanges()).toBeFalsy();
        }));

        it('should provide current state as observable', async(() => {

            eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));

            cut.hasChanges$().subscribe(changes => expect(changes).toBeTruthy());
        }));

    });
});
