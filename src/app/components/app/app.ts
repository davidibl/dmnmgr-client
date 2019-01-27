import { Component, HostListener, OnInit } from '@angular/core';
import { FileService } from '../../services/fileService';
import { DmnProjectService } from '../../services/dmnProjectService';
import { ElectronService } from 'ngx-electron';
import { tap } from 'rxjs/operators/tap';
import { FsResultType, FileSystemAccessResult } from '../../model/fileSystemAccessResult';
import { filter } from 'rxjs/operators/filter';
import { TestSuiteService } from '../../services/testSuiteService';
import { Test } from '../../model/test';
import { of } from 'rxjs/Observable/of';
import { map } from 'rxjs/operators/map';
import { TestsuiteProject } from '../../model/project/testsuiteproject';
import { TestDecisionService } from '../../services/testDecisionService';
import { mergeMap } from 'rxjs/operators/mergeMap';
import { concat, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators/switchMap';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event';
import { EventType } from '../../model/eventType';
import { PluginRegistryService } from '../../services/pluginRegistryService';
import { PluginDescriptor } from '../../model/plugin/pluginDescriptor';
import { PluginMetaDescriptor } from '../../model/plugin/pluginMetaDescriptor';
import { combineLatest } from 'rxjs';

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

export interface PluginItem extends PluginMetaDescriptor {
    activated: boolean;
}

@Component({
    selector: 'xn-app-root',
    templateUrl: 'app.html',
    styleUrls: ['app.scss'],
})
export class AppComponent implements OnInit {

    private _filesystemError: string;

    public fileMenuVisible = false;
    public testMenuVisible = false;
    public bearbeitenMenuVisible = false;
    public pluginMenuVisible = false;
    public engineMenuVisible = false;

    public plugins$: Observable<PluginMetaDescriptor[]>;
    public pluginsConfigured$: Observable<PluginDescriptor[]>;
    public pluginsMerged$: Observable<PluginItem[]>;

    public testSuite: TestSuiteItem[];
    public isTestSuiteEmpty = false;

    public showErrorDialog = false;
    public showAllTestsDialog = false;

    public set filesystemError(filesystemError: string) {
        this._filesystemError = filesystemError;
        this.showErrorDialog = true;
    }

    public get filesystemError() {
        return this._filesystemError;
    }

    public constructor(private _fileService: FileService,
                       private _projectService: DmnProjectService,
                       private _testsuiteService: TestSuiteService,
                       private _testDecisionService: TestDecisionService,
                       private _eventService: EventService,
                       private _pluginService: PluginRegistryService,
                       private _electronService: ElectronService) {}

    public ngOnInit() {
        this.loadMostRecentFiles();
        this.plugins$ = this._pluginService.getPlugins();
        this.pluginsConfigured$ = this._projectService.getPlugins();
        this.pluginsMerged$ = combineLatest(this.plugins$, this.pluginsConfigured$)
            .pipe (
                map(([pluginsMeta, plugins]) => {
                    return pluginsMeta.map(plugin => {
                        const configuration = plugins.find(pl => pl.id === plugin.id);
                        const active = (configuration) ? configuration.activated : false;
                        return {
                            id: plugin.id,
                            label: plugin.label,
                            icon: plugin.icon,
                            activated: active,
                        }
                    })
                })
            );
    }

    public openProject() {
        this._fileService
            .openProject()
            .pipe(
                tap(result => this.processError(result)),
                filter(result => result.type === FsResultType.OK)
            )
            .subscribe(result => this._projectService.readProject(result.data.xml, result.data.project));
    }

    public saveProject() {
        this._projectService
            .getProject()
            .subscribe(project => {
                this._fileService
                    .saveProject(project.xml, project.project)
                    .pipe(
                        tap(result => this.processError(result)),
                        filter(result => result.type === FsResultType.OK)
                    )
                    .subscribe();
            });
    }

    public saveProjectAs() {
        this._projectService
            .getProject()
            .subscribe(project => {
                this._fileService
                    .saveProject(project.xml, project.project, true)
                    .pipe(
                        tap(result => this.processError(result)),
                        filter(result => result.type === FsResultType.OK)
                    )
                    .subscribe();
            });
    }

    public createNewProject() {
        this._fileService.resetCurrentPath();
        this._projectService.createNewProject();
    }

    public importExistingDmn() {
        this._fileService
            .importExistingDmn()
            .pipe(
                tap(result => this.processError(result)),
                filter(result => result.type === FsResultType.OK)
            )
            .subscribe(result => this._projectService.importDmn(result.data));
    }

    public clearDeployments() {
        this._testDecisionService.clearProcessEngine();
    }

    public deploy() {
        this._testDecisionService.deployDecision().subscribe();
    }

    public quit() {
        this._electronService.process.exit();
    }

    public onOpenChange($event) {
        if (!open) {
            this.clearError();
        }
    }

    public openSearch() {
        this._eventService.publishEvent(new BaseEvent(EventType.OPEN_SEARCH))
    }

    public clearError() {
        this.showErrorDialog = false;
    }

    public openAllTestsDialog() {
        this.testSuite = this.mapTestSuite(this._testsuiteService.getTestSuiteProject());
        if (!this.testSuite || this.testSuite.length < 1 ||
            this.testSuite.map(item => item.tests).reduce((acc, next) => acc += next.length, 0) < 1) {
            this.isTestSuiteEmpty = true;
        } else { this.isTestSuiteEmpty = false; }

        this.showAllTestsDialog = true;
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

    @HostListener('window:keyup', ['$event'])
    public handleKeyboardEvent(event: KeyboardEvent) {
        if (!event.ctrlKey) { return; }

        switch (event.code) {
            case 'KeyO':
                this.openProject();
                break;
            case 'KeyN':
                this.createNewProject();
                break;
            case 'KeyS':
                this.saveProject();
                break;
        }
    }

    public enablePlugin(plugin: PluginItem) {
        this._projectService.togglePluginActivation(plugin);
    }

    private processError(result: FileSystemAccessResult<any>) {
        if (result.type === FsResultType.ERROR) {
            this.filesystemError = result.message;
        }
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
                }
            });
    }

    private loadMostRecentFiles() {
        this._fileService
            .openConfigFile()
            .subscribe(_ => console.log(''));
    }
}
