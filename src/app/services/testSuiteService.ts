import { Injectable } from "@angular/core";
import { Testsuite } from "../model/testsuite";
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { Test } from '../model/test';

@Injectable()
export class TestSuiteService {

    private _currentTestsuite: Testsuite;
    private _testSuiteSubject = new ReplaySubject<Testsuite>(1);

    public addTestCase() {
        if (!this._currentTestsuite) {
            this._currentTestsuite = new Testsuite();
        }
        this._currentTestsuite.addTestCase();
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
