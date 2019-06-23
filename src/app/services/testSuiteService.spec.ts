import { TestBed, async } from '@angular/core/testing';
import { TestSuiteService } from './testSuiteService';
import { EventService } from './eventService';
import { of } from 'rxjs';
import { BaseEvent } from '../model/event/event';
import { take } from 'rxjs/operators';


describe('Testsuite Service', () => {
    beforeEach(async(() => {

        TestBed.configureTestingModule({
        }).compileComponents();
    }));

    describe('initialize', () => {

        it('should subscribe to new test event', async(() => {
            const ev = new BaseEvent('', {});

            const eventService = new EventService();
            const getEventSpy = spyOn(eventService, 'getEvent').and.returnValue(of(ev));
            const cut = new TestSuiteService(eventService);
            expect(eventService.getEvent).toHaveBeenCalledTimes(4);
        }));

        it('should be not null after construction', async(() => {
            const ev = new BaseEvent('', {});

            const eventService = new EventService();
            const getEventSpy = spyOn(eventService, 'getEvent').and.returnValue(of(ev));
            const cut = new TestSuiteService(eventService);
            expect(cut).not.toBeNull();
        }));

        it('should be not null after construction', async(() => {
            const ev = new BaseEvent('', {});

            const eventService = new EventService();
            spyOn(eventService, 'getEvent').and.returnValue(of(ev));
            const cut = new TestSuiteService(eventService);
            expect(cut).not.toBeNull();
        }));
    });

    describe('tests', () => {

        let cut;

        beforeEach(() => {
            const ev = new BaseEvent('', {});

            const eventService = new EventService();
            spyOn(eventService, 'getEvent').and.returnValue(of(ev));
            cut = new TestSuiteService(eventService);
        });

        it('should create testsuite when adding a test', async(() => {
            cut.addTestCase({}, {});
            expect(cut.getTestSuite()).not.toBeNull();
            cut.getTestSuite()
                .subscribe(result => expect(result).not.toBeNull());
        }));

        it('added test should be present', async(() => {
            cut.addTestCase({ test: 'a' }, { test: 'b' });
            cut.addTestCase({ test: 'd' }, { test: 'e' });
            cut.getTestSuite()
                .subscribe(result => {
                    expect(result.tests.length).toBe(2);
                });
        }));

        it('added test should be a test with a name', async(() => {
            cut.addTestCase({ test: 'a' }, { test: 'b' });
            cut.getTestSuite()
                .subscribe(result => {
                    expect(result.tests[0].name).not.toBeNull();
                    expect(result.tests[0].data).not.toBeNull();
                    expect(result.tests[0].expectedData).not.toBeNull();
                    expect(result.tests[0].name).toBe('Test0');
                });
        }));

        it('tests should get different names automatically', async(() => {
            cut.addTestCase({ test: 'a' }, { test: 'b' });
            cut.addTestCase({ test: 'e' }, { test: 'd' });
            cut.getTestSuite()
                .subscribe(result => {
                    expect(result.tests[0].name).not.toBe(result.tests[1].name);
                });
        }));

        it('should delete tests correctly', async(() => {
            cut.addTestCase({ test: 'a' }, { test: 'b' });
            cut.addTestCase({ test: 'e' }, { test: 'd' });
            cut.getTestSuite()
                .pipe( take(1) )
                .subscribe(result => {
                    cut.deleteTestCase(result.tests.find(test => test.name === 'Test0'));
                    cut.getTestSuite()
                        .pipe( take(1) )
                        .subscribe(finalresult => {
                            expect(finalresult.tests.length).toBe(1);
                            expect(finalresult.tests[0].name).toBe('Test1');
                        });
                });
        }));
    });
});
