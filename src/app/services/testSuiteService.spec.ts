import { TestBed, async, tick, fakeAsync } from '@angular/core/testing';
import { TestSuiteService } from './testSuiteService';
import { EventService } from './eventService';
import { of } from 'rxjs';
import { BaseEvent } from '../model/event/event';
import { take } from 'rxjs/operators';
import { NewViewEvent } from '../model/event/newViewEvent';
import { RenameArtefactEvent } from '../model/event/renameArtefactEvent';
import { DecisionDeleteEvent } from '../model/event/decisionDeleteEvent';
import { EventType } from '../model/event/eventType';

let cut: TestSuiteService;
let eventService: EventService;

const initialTestsuiteFirstTestName = 'test1';
const secondSuiteFirstTestName = 'testsecondSuite';
let initialTestsuiteProject;
let emptyTestSuiteProject;

describe('Testsuite Service', () => {
    beforeEach(async(() => {

        initialTestsuiteProject = {
            aaa: { tests: [{data: null, expectedData: null, name: initialTestsuiteFirstTestName}]},
            bbb: { tests: [{data: null, expectedData: null, name: secondSuiteFirstTestName}]}
        };

        emptyTestSuiteProject = {
            aaa: { tests: [] }
        };

        TestBed.configureTestingModule({
            providers: [
                TestSuiteService,
                EventService
            ]
        }).compileComponents();

        cut = TestBed.inject(TestSuiteService);
        eventService = TestBed.inject(EventService);
    }));

    describe('initialize', () => {

        it('should be not null after construction', async(() => {
            expect(cut).not.toBeNull();
        }));
    });

    describe('Event Handler', () => {

        it('should handle new view event and change current testsuite', async(() => {
            cut.setTestSuiteProject(initialTestsuiteProject);
            eventService.publishEvent(new NewViewEvent('aaa'));
            cut.getTestSuite().pipe(take(1)).subscribe(testsuite =>
                expect(testsuite.tests[0].name).toEqual(initialTestsuiteFirstTestName));

            eventService.publishEvent(new NewViewEvent('bbb'));

            cut.getTestSuite().pipe(take(1)).subscribe(testsuite =>
                expect(testsuite.tests[0].name).toEqual(secondSuiteFirstTestName));
        }));

        it('should handle rename event and rename current view', async(() => {
            cut.setTestSuiteProject(initialTestsuiteProject);
            eventService.publishEvent(new NewViewEvent('aaa'));

            const newName = 'zzz';
            eventService.publishEvent(new RenameArtefactEvent('aaa', newName));
            cut.getTestSuite().pipe(take(1)).subscribe(testsuite =>
                expect(testsuite.tests[0].name).toEqual(initialTestsuiteFirstTestName));

            expect(cut.getTestSuiteProject()[newName]).not.toBeNull();
            expect(cut.getTestSuiteProject()['aaa']).toBeUndefined();
            expect(cut.getTestSuiteProject()[newName].tests[0].name).toEqual(initialTestsuiteFirstTestName);
        }));

        it('should handle delete event and delete corresponding testsuite', async(() => {
            cut.setTestSuiteProject(initialTestsuiteProject);
            eventService.publishEvent(new NewViewEvent('aaa'));

            eventService.publishEvent(new DecisionDeleteEvent('aaa'));
            cut.getTestSuite().pipe(take(1)).subscribe(testsuite =>
                expect(testsuite.tests[0].name).toEqual(initialTestsuiteFirstTestName));

            expect(cut.getTestSuiteProject()['aaa']).toBeUndefined();
        }));

        it('should handle new test event and add the test', async(() => {
            cut.setTestSuiteProject(emptyTestSuiteProject);
            eventService.publishEvent(new NewViewEvent('aaa'));

            const newTest = {testdata: { bla: '1'}, expectedResult: {blubb: 2}};
            eventService.publishEvent(new BaseEvent(EventType.NEW_TEST, newTest));

            cut.getTestSuite()
                .subscribe(result => expect(result.tests[0]).not.toBeNull());
        }));

        it('should create a suite with id "null" for some unknown reason (Refactoring?)', async(() => {
            cut.setTestSuiteProject(emptyTestSuiteProject);
            eventService.publishEvent(new NewViewEvent('aaa'));

            expect(Object.keys(cut.getTestSuiteProject()).length).toBe(2);
            expect(Object.keys(cut.getTestSuiteProject())[1]).toEqual('null');
        }));
    });

    describe('tests', () => {

        it('should create testsuite when adding a test', async(() => {
            eventService.publishEvent(new NewViewEvent('aaa'));
            cut.addTestCase({}, {});
            expect(cut.getTestSuite()).not.toBeNull();
            cut.getTestSuite()
                .subscribe(result => expect(result).not.toBeNull());
        }));

        it('should set a testsuite project', async(() => {
            cut.setTestSuiteProject(initialTestsuiteProject);
            expect(cut['_testsuiteProject']).toEqual(initialTestsuiteProject);
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
