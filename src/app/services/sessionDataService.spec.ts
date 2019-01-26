import { TestBed, async } from '@angular/core/testing';
import { BaseEvent } from '../model/event';
import { SessionDataService } from './sessionDataService';

describe('SessionDataService', () => {
    beforeEach(async(() => {

        TestBed.configureTestingModule({
        }).compileComponents();
    }));

    describe('initialize', () => {

        it('should have two maps for deifferent data scopes', async(() => {
            const cut = new SessionDataService();
            expect(cut['_permanentData']).not.toBeNull();
            expect(cut['_sessionData']).not.toBeNull();
        }));

        it('should create a event bus when getting any value', async(() => {
            const cut = new SessionDataService();
            const dataSubject = cut.getValue('testKey');
            const permanentSubject = cut.getPermanentValue('testKey');

            expect(dataSubject).not.toBeNull();
            expect(permanentSubject).not.toBeNull();
        }));

        it('should emit null when getting a new data cache', async(() => {
            const cut = new SessionDataService();
            const dataSubject = cut.getValue('testKey');

            dataSubject.subscribe(value => expect(value).toBeNull());
        }));

        it('should emit null when getting a new permanent data cache', async(() => {
            const cut = new SessionDataService();
            const dataSubject = cut.getValue('testKey');

            dataSubject.subscribe(value => expect(value).toBeNull());
        }));

        it('should create bus and emit set value when setting a new value', async(() => {
            const testKey = 'testKey';

            const cut = new SessionDataService();
            cut.setValue(testKey, { test: 'a' });

            cut.getValue(testKey).subscribe(value => expect(value['test']).toBe('a'));
        }));

        it('should create bus on first get and emit null and emit correct value after first set', async(() => {
            const testKey = 'testKey';

            const cut = new SessionDataService();
            let counter = 0;
            cut.getValue(testKey).subscribe(value => {
                if (counter === 0) {
                    expect(value).toBeNull();
                    counter++;
                    return;
                }
                expect(value['test']).toBe('a')
            });

            cut.setValue(testKey, { test: 'a' });
        }));

        it('should create bus on first get and emit null and emit correct value after first set in permanent session store', async(() => {
            const testKey = 'testKey';

            const cut = new SessionDataService();
            let counter = 0;
            cut.getPermanentValue(testKey).subscribe(value => {
                if (counter === 0) {
                    expect(value).toBeNull();
                    counter++;
                    return;
                }
                expect(value['test']).toBe('a')
            });

            cut.setPermanentValue(testKey, { test: 'a' });
        }));

        it('should not emit permanent value when setting normal value', async(() => {
            const testKey = 'testKey';

            const cut = new SessionDataService();
            cut.getValue(testKey).subscribe(value => {
                expect(value).toBeNull();
            });

            cut.setPermanentValue(testKey, { test: 'a' });

            cut.getValue(testKey).subscribe(value => {
                expect(value).toBeNull();
            });
        }));

        it('should clear all values correctly', async(() => {
            const testKey = 'testKey';

            const cut = new SessionDataService();
            let counter = 0;
            cut.getValue(testKey).subscribe(value => {
                if (counter === 0 || counter === 2) {
                    expect(value).toBeNull();
                } else {
                    expect(value['test']).toBe('a');
                }
                counter++;
            });

            cut.setValue(testKey, { test: 'a' });
            cut.clearSession();

            cut.getValue(testKey).subscribe(value => {
                expect(value).toBeNull();
            });
        }));

        it('should not clear permanent values', async(() => {
            const testKey = 'testKey';

            const cut = new SessionDataService();
            let counter = 0;
            cut.getPermanentValue(testKey).subscribe(value => {
                if (counter === 0) {
                    expect(value).toBeNull();
                } else {
                    expect(value['test']).toBe('a');
                }
                counter++;
            });

            cut.setPermanentValue(testKey, { test: 'a' });
            cut.clearSession();

            cut.getPermanentValue(testKey).subscribe(value => {
                expect(value).not.toBeNull();
            });
        }));

    });
});
