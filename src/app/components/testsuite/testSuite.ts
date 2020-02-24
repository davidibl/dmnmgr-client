import { Component, OnInit } from '@angular/core';
import { TestSuiteService } from '../../services/testSuiteService';
import { Observable, ReplaySubject, from } from 'rxjs';
import { map, take, merge, mergeMap, tap, switchMap } from 'rxjs/operators';
import { Test } from '../../model/test';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { DataModelService } from '../../services/dataModelService';
import { TestDecisionService } from '../../services/testDecisionService';
import { DmnXmlService } from '../../services/dmnXmlService';
import { SessionDataService } from '../../services/sessionDataService';

export class TestCaseContainer {
    public result: boolean;
    public clazz?: string;
    public finalResult?: Object[];
    public message?: string;
    public showError?: boolean;
    public constructor(public testcase: Test) { }
}

@Component({
    selector: 'xn-test-suite',
    templateUrl: 'testSuite.html',
    styleUrls: ['testSuite.scss'],
})
export class TestSuiteComponent implements OnInit {

    private _testCasesAfterExecution = new ReplaySubject<TestCaseContainer[]>(1);

    public testCases$: Observable<TestCaseContainer[]>;
    public dataModel$: Observable<ObjectDefinition>;
    public responseModel$: Observable<ObjectDefinition>;
    public testitem: TestCaseContainer;

    public constructor(
        private _testSuiteService: TestSuiteService,
        private _dataModelService: DataModelService,
        private _testDecisionService: TestDecisionService,
        private dmnXmlService: DmnXmlService,
        private _sessionDateService: SessionDataService,
    ) { }

    public ngOnInit() {
        this.dataModel$ = this._dataModelService.getDataModel();
        this.responseModel$ = this._dataModelService.getResponseModel();
        this.testCases$ = this._testSuiteService
            .getTestSuite()
            .pipe(
                map(testsuite => testsuite.tests),
                map(testcases => testcases.map(testcase => new TestCaseContainer(testcase))),
                merge(this._testCasesAfterExecution)
            );
    }

    public addTestCase() {
        this._testSuiteService.addTestCase();
    }

    public deleteCase(item: TestCaseContainer) {
        this._testSuiteService.deleteTestCase(item.testcase);
    }

    public editCase(item: TestCaseContainer) {
        this.testitem = item;
    }

    public testCase(item: TestCaseContainer) {
        this._testDecisionService
            .deployAndTestDecision(item.testcase)
            .pipe(
                take(1),
                tap(result => this.assignTestResult(item, result))
            )
            .subscribe();
    }

    public runAllTests() {
        this.testCases$
            .pipe(
                take(1),
                switchMap(tests => this.dmnXmlService.getXmlModels('editor'), (o, i) => ({ tests: o, xml: i})),
                take(1),
            )
            .subscribe(({tests, xml}) => {
                from(tests)
                    .pipe(
                        mergeMap(test => this.runTestInternal(test, xml), (o, i) => ({ test: o, result: i}))
                    )
                    .subscribe(result => {
                        tests.splice(tests.findIndex(item => item === result.test), 1, result.test);
                        this._testCasesAfterExecution.next(tests);
                    });
            });
    }

    public takeOverFinalResult(item: TestCaseContainer) {
        const newExpectedData = item.finalResult.map(o => Object.assign({}, o));
        item.testcase.expectedData = newExpectedData;
    }

    public openInSimulator(item: TestCaseContainer) {
        this._sessionDateService.setValue('tempObject', item.testcase.data);
    }

    private runTestInternal(item: TestCaseContainer, xml: string) {
        return this._testDecisionService
            .testDecision(item.testcase, xml)
            .pipe(
                tap(result => this.assignTestResult(item, result))
            );
    }

    private assignTestResult(item: TestCaseContainer, result: Object) {
        item.result = result['testSucceded'];
        item.clazz = (item.result) ? 'success' : 'error';
        item.finalResult = result['result'];
        item.message = result['message'];
        item.showError = false;
    }
}
