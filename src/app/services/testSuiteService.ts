import { Injectable } from "@angular/core";
import { Testsuite } from "../model/testsuite";
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { Test } from '../model/test';
import { EventService } from './eventService';
import { NewViewEvent } from '../model/newViewEvent';
import { EventType } from '../model/eventType';
import { RenameArtefactEvent } from '../model/renameArtefactEvent';
import { TestsuiteProject } from '../model/project/testsuiteproject';

@Injectable()
export class TestSuiteService {

    private _currentArtefactId: string;
    private _testsuiteProject = <TestsuiteProject>{};

    private _testSuiteSubject = new ReplaySubject<Testsuite>(1);

    public constructor(private _eventService: EventService) {
        this._eventService
            .getEvent((ev) => ev.type === 'newTest')
            .subscribe(event => {
                this.addTestCase(event.data.testdata, event.data.expectedResult);
            });
        this._eventService
            .getEvent<NewViewEvent>((ev) => ev.type === EventType.NEW_VIEW)
            .subscribe(event => this.changeView(event.data.artefactId));
        this._eventService
            .getEvent<RenameArtefactEvent>((ev) => ev.type === EventType.RENAME_ARTEFACT)
            .subscribe(event => this.renameCurrentArtefact(event.data.newArtefactId));
    }

    public addTestCase(testdata?: any, expectedResult?: any) {
        const currentTestsuite = this.getOrCreateCurrentTestsuite();
        const nextName = 'Test' + currentTestsuite.tests.length;
        this.addTestCaseToTestSuite(currentTestsuite, nextName, testdata, expectedResult);
        this._testSuiteSubject.next(currentTestsuite);
    }

    public getTestSuite(): Observable<Testsuite> {
        return this._testSuiteSubject.asObservable();
    }

    public deleteTestCase(item: Test) {
        const currentTestsuite = this.getOrCreateCurrentTestsuite();
        currentTestsuite.tests.splice(currentTestsuite.tests.findIndex(x => x === item), 1);
        this._testSuiteSubject.next(currentTestsuite);
    }

    private getOrCreateCurrentTestsuite() {
        if (!this._testsuiteProject[this._currentArtefactId]) {
            this._testsuiteProject[this._currentArtefactId] = { tests: [] };
        }
        return this._testsuiteProject[this._currentArtefactId];
    }

    private addTestCaseToTestSuite(testsuite: Testsuite, nextName: string, testdata: Object, expectedResult: Object) {
        testsuite.tests.push(this.createTest(name, testdata, expectedResult));
    }

    private createTest(name: string, testdata: Object, expectedResult: Object) {
        return <Test>  { name: name, data: testdata || {}, expectedData: expectedResult || []};
    }

    private changeView(artefactId: string) {
        this._currentArtefactId = artefactId;
        this._testSuiteSubject.next(this.getOrCreateCurrentTestsuite());
    }

    private renameCurrentArtefact(newArtefactId: string) {
        if (this._testsuiteProject[this._currentArtefactId]) {
            this._testsuiteProject[newArtefactId] = this._testsuiteProject[this._currentArtefactId];
            delete this._testsuiteProject[this._currentArtefactId];
        }
        this._currentArtefactId = newArtefactId;
    }
}
