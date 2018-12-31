import { Injectable } from "@angular/core";
import { Testsuite } from "../model/testsuite";
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { Test } from '../model/test';
import { EventService } from './eventService';

@Injectable()
export class TestSuiteService {

    private _currentTestsuite: Testsuite;
    private _testSuiteSubject = new ReplaySubject<Testsuite>(1);

    public constructor(private _eventService: EventService) {
        this._eventService
            .getEvent((ev) => ev.type === 'newTest')
            .subscribe(event => {
                this.addTestCase(event.data.testdata, event.data.expectedResult);
            });
    }

    public addTestCase(testdata?: any, expectedResult?: any) {
        if (!this._currentTestsuite) {
            this._currentTestsuite = new Testsuite();
        }
        const nextName = 'Test' + this._currentTestsuite.tests.length;
        this._currentTestsuite.addTestCase(nextName, testdata, expectedResult);
        this._testSuiteSubject.next(this._currentTestsuite);
    }

    public getTestSuite(): Observable<Testsuite> {
        return this._testSuiteSubject.asObservable();
    }

    public editTestCase(item) {
        this._testSuiteSubject.next(this._currentTestsuite);
    }

    public deleteTestCase(item: Test) {
        this._currentTestsuite.tests.splice(this._currentTestsuite.tests.findIndex(x => x === item), 1);
        this._testSuiteSubject.next(this._currentTestsuite);
    }
}
