import { TestBed, async } from '@angular/core/testing';
import { SessionDataService } from './sessionDataService';
import { EventService } from './eventService';
import { take } from 'rxjs/operators';
import { NewViewEvent } from '../model/event/newViewEvent';
import { RenameArtefactEvent } from '../model/event/renameArtefactEvent';

describe('SessionDataService', () => {

    let cut: SessionDataService;
    let eventService: EventService;

    beforeEach(async(() => {

        TestBed.configureTestingModule({
            providers: [
                SessionDataService,
                EventService,
            ]
        });

        cut = TestBed.inject(SessionDataService);
        eventService = TestBed.inject(EventService);

        eventService.publishEvent(new NewViewEvent('aaa'));
    }));

    describe('initialize', () => {

        it('should have two maps for deifferent data scopes', async(() => {

            expect(cut['_permanentData']).not.toBeNull();
            expect(cut['_sessionData']).not.toBeNull();
        }));

        it('should create a event bus when getting any value', async(() => {

            const dataSubject = cut.getValue('testKey');
            const permanentSubject = cut.getPermanentValue('testKey');

            expect(dataSubject).not.toBeNull();
            expect(permanentSubject).not.toBeNull();
        }));

        it('should emit undefined when getting a new data cache', async(() => {

            const dataSubject = cut.getValue('testKey');

            dataSubject.subscribe(value => expect(value).toBeUndefined());
        }));

        it('should emit undefined when getting a new permanent data cache', async(() => {

            const dataSubject = cut.getValue('testKey');

            dataSubject.subscribe(value => expect(value).toBeUndefined());
        }));

        it('should create bus and emit set value when setting a new value', async(() => {
            const testKey = 'testKey';

            cut.setValue(testKey, { test: 'a' });

            cut.getValue(testKey).subscribe(value => expect(value['test']).toBe('a'));
        }));

        it('should create bus on first get and emit undefined and emit correct value after first set', async(() => {
            const testKey = 'testKey';
            const newValue = { test: 'a' };

            cut.getValue(testKey).pipe(take(1)).subscribe(value => expect(value).toBeUndefined());

            cut.setValue(testKey, newValue);

            cut.getValue(testKey).pipe(take(1)).subscribe(value => expect(value).toEqual(newValue));
        }));

        it(`should emit undefined and emit correct value after first set in permanent session store`, async(() => {

            const testKey = 'testKey';
            const newValue = { test: 'a' };

            cut.getPermanentValue(testKey).pipe(take(1)).subscribe(value => expect(value).toBeNull());

            cut.setPermanentValue(testKey, newValue);

            cut.getPermanentValue(testKey).pipe(take(1)).subscribe(value => expect(value).toEqual(newValue));
        }));

        it('should not emit permanent value when setting normal value', async(() => {
            const testKey = 'testKey';

            cut.getValue(testKey).pipe(take(1)).subscribe(value => expect(value).toBeUndefined());

            cut.setPermanentValue(testKey, { test: 'a' });

            cut.getValue(testKey).pipe(take(1)).subscribe(value => expect(value).toBeUndefined());
        }));

        it('should clear all values correctly', async(() => {
            const testKey = 'testKey';

            cut.getValue(testKey).pipe(take(1)).subscribe(value => expect(value).toBeUndefined());

            cut.setValue(testKey, { test: 'a' });

            eventService.publishEvent(new RenameArtefactEvent('bbb', 'fff'));

            cut.getValue(testKey).subscribe(value => expect(value).toBeUndefined());
        }));

        it('should not clear permanent values', async(() => {
            const testKey = 'testKey';
            const testValue = { test: 'a' };

            cut.getPermanentValue(testKey).pipe(take(1)).subscribe(value => expect(value).toBeNull());

            cut.setPermanentValue(testKey, testValue);

            eventService.publishEvent(new NewViewEvent('ccc'));

            cut.getPermanentValue(testKey).pipe(take(1)).subscribe(value => expect(value).toEqual(testValue));
        }));

    });
});
