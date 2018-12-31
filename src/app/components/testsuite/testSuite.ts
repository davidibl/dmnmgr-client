import { Component, OnInit } from '@angular/core';
import { TestSuiteService } from '../../services/testSuiteService';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators/map';
import { take } from 'rxjs/operators/take';
import { Test } from '../../model/test';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { DataModelService } from '../../services/dataModelService';
import { TestDecisionService } from '../../services/testDecisionService';
import { merge } from 'rxjs/operators/merge';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { mergeMap } from 'rxjs/operators/mergeMap';
import { tap } from 'rxjs/operators/tap';
import { from } from 'rxjs';

export class TestCaseContainer {
    public result: boolean;
    public clazz?: string;
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

    public constructor(private _testSuiteService: TestSuiteService,
        private _dataModelService: DataModelService,
        private _testDecisionService: TestDecisionService) { }

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

    public testCase(item: TestCaseContainer) {
        this.runTestInternal(item)
            .subscribe();
    }

    public runAllTests() {
        this.testCases$
            .pipe( take(1) )
            .subscribe(tests => {
                from(tests)
                    .pipe(
                        mergeMap(test => this.runTestInternal(test), (o, i) => { return { test: o, result: i}; })
                    )
                    .subscribe(result => {
                        tests.splice(tests.findIndex(item => item === result.test), 1, result.test);
                        this._testCasesAfterExecution.next(tests);
                    });
            });
    }

    private runTestInternal(item: TestCaseContainer) {
        return this._testDecisionService
            .testDecision(item.testcase)
            .pipe(
                tap(result => {
                    this.assignTestResult(item, result);
                })
            );
    }

    private assignTestResult(item: TestCaseContainer, result: Object) {
        item.result = result['testSucceded']
        item.clazz = (item.result) ? 'success' : 'error';
    }
}
