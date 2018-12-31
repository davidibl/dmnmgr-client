import { Component, OnInit } from '@angular/core';
import { TestSuiteService } from '../../services/testSuiteService';
import { Observable } from 'rxjs/Observable';
import { Testsuite } from '../../model/testsuite';
import { map } from 'rxjs/operators/map';
import { take } from 'rxjs/operators/take';
import { Test } from '../../model/test';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { DataModelService } from '../../services/dataModelService';
import { TestDecisionService } from '../../services/testDecisionService';

export class TestCaseContainer {
    public result: boolean;
    public constructor(public testcase: Test) {}
}

@Component({
    selector: 'xn-test-suite',
    templateUrl: 'testSuite.html',
    styleUrls: ['testSuite.scss'],
})
export class TestSuiteComponent implements OnInit{

    public testCases$: Observable<TestCaseContainer[]>;
    public dataModel$: Observable<ObjectDefinition>;
    public responseModel$: Observable<ObjectDefinition>;

    public constructor(private _testSuiteService: TestSuiteService,
                       private _dataModelService: DataModelService,
                       private _testDecisionService: TestDecisionService) {}

    public ngOnInit() {
        this.dataModel$ = this._dataModelService.getDataModel();
        this.responseModel$ = this._dataModelService.getResponseModel();
        this.testCases$ = this._testSuiteService
            .getTestSuite()
            .pipe(
                map(testsuite => testsuite.tests),
                map(testcases => testcases.map(testcase => new TestCaseContainer(testcase)))
            );
    }

    public addTestCase() {
        this._testSuiteService.addTestCase();
    }

    public deleteCase(item: TestCaseContainer) {
        this._testSuiteService.deleteTestCase(item.testcase);
    }

    public testCase(item: TestCaseContainer) {
        this._testDecisionService.getTestResult()
            .pipe( take(1) )
            .subscribe(result => item.result = result['testSucceded']);
        this._testDecisionService.testDecision(item.testcase);
    }
}
