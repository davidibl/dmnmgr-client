import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { of, concat } from 'rxjs';
import { switchMap, mergeMap, tap, map } from 'rxjs/operators';
import { TestSuiteService } from '../../services/testSuiteService';
import { Test } from '../../model/test';
import { TestsuiteProject } from '../../model/project/testsuiteproject';
import { TestDecisionService } from '../../services/testDecisionService';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event/event';
import { EventType } from '../../model/event/eventType';

export interface TestSuiteItem {
    tableId: string;
    tests: TestItem[];
}

export interface TestItem {
    test: Test;
    tableId: string;
    deploymentId: string;
    clazz?: string;
    result: boolean;
}

@Component({
    selector: 'xn-all-tests-dialog',
    templateUrl: 'allTestsDialog.html',
    styleUrls: ['allTestsDialog.scss'],
})
export class AllTestsDialogComponent implements OnInit {

    public testSuite: TestSuiteItem[];
    public isTestSuiteEmpty = false;

    @Output()
    public openChange = new EventEmitter<boolean>();

    @Input()
    public open = false;

    public constructor(
        private _testsuiteService: TestSuiteService,
        private _eventService: EventService,
        private _testDecisionService: TestDecisionService,
    ) {}

    public ngOnInit() {
        this.testSuite = this.mapTestSuite(this._testsuiteService.getTestSuiteProject());
        if (!this.testSuite || this.testSuite.length < 1 ||
            this.testSuite.map(item => item.tests).reduce((acc, next) => acc += next.length, 0) < 1) {
            this.isTestSuiteEmpty = true;
        } else { this.isTestSuiteEmpty = false; }
    }

    public runAllTests() {
        this._testDecisionService
            .deployDecision()
            .pipe(
                switchMap(deployment =>
                    of(this.testSuite)
                        .pipe(
                            mergeMap(tests => tests),
                            mergeMap(test => test.tests),
                            tap(test => test.deploymentId = deployment.decisionRequirementsId))
                ),
                map(test => this._testDecisionService
                        .testDecision(test.test, test.deploymentId, test.tableId)
                        .pipe(
                            map(result => {
                                test.result = result['testSucceded'];
                                test.clazz = result['testSucceded'] ? 'success' : 'error';
                                return result;
                            })
                        ))
            )
            .subscribe(obs => concat(obs).subscribe());
    }

    public jumpToTest(tableId: string) {
        this._eventService.publishEvent(new BaseEvent(EventType.JUMP_TO_TEST, tableId));
        this.onDialogOpenChanged(false);
    }

    public onDialogOpenChanged(open: boolean) {
        this.open = open;
        this.openChange.emit(open);
    }

    private mapTestSuite(testSuite: TestsuiteProject): TestSuiteItem[] {
        return Object.getOwnPropertyNames(testSuite)
            .map(propertyName => {
                return <TestSuiteItem>{
                    tests: testSuite[propertyName].tests.map(test => {
                        return <TestItem>{
                            test: test,
                            tableId: propertyName
                        };
                    }),
                    tableId: propertyName,
                };
            });
    }
}
