import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
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
import { BaseEvent } from '../../model/event/event';
import { EventType } from '../../model/event/eventType';
import { PluginRegistryService } from '../../services/pluginRegistryService';
import { PluginDescriptor } from '../../model/plugin/pluginDescriptor';
import { PluginMetaDescriptor } from '../../model/plugin/pluginMetaDescriptor';
import { combineLatest } from 'rxjs';
import { MostRecentFile } from '../../model/appConfiguration/mostRecentFile';
import { AppConfigurationService } from '../../services/appConfigurationService';
import { SaveStateService } from '../../services/saveStateService';
import { DialogComponent, ButtonComponent } from '@xnoname/web-components';
import { take } from 'rxjs/operators/take';
import { merge } from 'rxjs/operators';
import { NewViewEvent } from '../../model/event/newViewEvent';
import { ExportCommandEvent } from '../../model/event/exportCommandEvent';
import { ExportDataType } from '../../model/event/exportDataType';
import { ExportService } from '../../services/exportService';

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

    @ViewChild('unsavedChangesDialog')
    private _unsavedChangesDialog: DialogComponent;

    @ViewChild('dontSaveButton')
    private _dontSaveButton: ButtonComponent;

    private _filesystemError: string;

    public fileMenuVisible = false;
    public testMenuVisible = false;
    public bearbeitenMenuVisible = false;
    public pluginMenuVisible = false;
    public engineMenuVisible = false;
    public helpMenuVisible = false;
    public menuVisible = false;

    public recentFilesMenuVisible = false;

    public plugins$: Observable<PluginMetaDescriptor[]>;
    public pluginsConfigured$: Observable<PluginDescriptor[]>;
    public pluginsMerged$: Observable<PluginItem[]>;
    public mostRecentFiles$: Observable<MostRecentFile[]>;

    public testSuite: TestSuiteItem[];
    public isTestSuiteEmpty = false;

    public showErrorDialog = false;
    public showAllTestsDialog = false;

    public isDecicionTableMode: boolean;

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
                       private _electronService: ElectronService,
                       private _appConfiguration: AppConfigurationService,
                       private _saveStateService: SaveStateService) {}

    public ngOnInit() {
        this.mostRecentFiles$ = this._appConfiguration.getMostRecentFiles();
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

        this._eventService
            .getEvent<NewViewEvent>((event) => event.type === EventType.NEW_VIEW)
            .pipe( map(ev => ev.data.isDecisionTable) )
            .subscribe(isDecisionTableMode => this.isDecicionTableMode = isDecisionTableMode);
    }

    public onMenuOutsideClick() {
        this.menuVisible = false;
    }

    public openMenu(menuName: string) {
        this.fileMenuVisible = false;
        this.testMenuVisible = false;
        this.bearbeitenMenuVisible = false;
        this.pluginMenuVisible = false;
        this.engineMenuVisible = false;
        this.helpMenuVisible = false;
        this[menuName] = true;
    }

    public openProject() {
        this.confirmActionWhenChangesAreUnsaved(() => {
            this._fileService
                .openProject()
                .pipe(
                    tap(result => this.processError(result)),
                    filter(result => result.type === FsResultType.OK)
                )
                .subscribe(result => {
                    this._appConfiguration.addMostRecentFile(result.filepath);
                    this._projectService.readProject(result.data.xml, result.data.project);
                    this._saveStateService.resetChanges();
                });
        });
    }

    public openRecentFile(recentProject: string) {
        this.recentFilesMenuVisible = false;
        this.confirmActionWhenChangesAreUnsaved(() => {
            this._fileService
                .openProject(recentProject)
                .pipe(
                    tap(result => this.processError(result)),
                    filter(result => result.type === FsResultType.OK)
                )
                .subscribe(result => {
                    this._projectService.readProject(result.data.xml, result.data.project);
                    this._saveStateService.resetChanges();
                });
        });
    }

    public confirmActionWhenChangesAreUnsaved(action: () => void) {
        if (this._saveStateService.hasChanges()) {
            const onSave = this._unsavedChangesDialog
                .confirm
                .pipe(
                    switchMap(_ => this.saveProjectSilent().pipe(take(1), map(_ => true)))
                );

            const onDontSave = this._dontSaveButton.clicked.pipe(map(_ => true));
            const onCancel = this._unsavedChangesDialog.cancel.pipe(map(_ => false));

            onSave.pipe(merge(onCancel, onDontSave), take(1))
                .subscribe(doAction => {
                    this._unsavedChangesDialog.open = false;
                    if (doAction) {
                        action();
                    }
                });

            this._unsavedChangesDialog.open = true;
        } else {
            action();
        }
    }

    public saveProject() {
        this.saveProjectSilent()
            .subscribe(_ => this._saveStateService.resetChanges());
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
                    .subscribe(_ => this._saveStateService.resetChanges());
            });
    }

    public createNewProject() {
        this.confirmActionWhenChangesAreUnsaved(() => {
            this._fileService.resetCurrentPath();
            this._projectService.createNewProject();
            this._saveStateService.resetChanges();
        });
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
            case 'KeyH':
                this.showDocumentation();
                break;
            case 'KeyR':
                this.fileMenuVisible = !this.fileMenuVisible;
                this.recentFilesMenuVisible = !this.recentFilesMenuVisible;
                break;
        }
    }

    public enablePlugin(plugin: PluginItem) {
        this._projectService.togglePluginActivation(plugin);
    }

    public showDocumentation() {

    }

    public exportCurrentTable() {
        this._eventService.publishEvent(new ExportCommandEvent(ExportDataType.CSV));
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

    private saveProjectSilent() {
        return this._projectService
            .getProject()
            .pipe(
                take(1),
                switchMap(project => {
                    return this._fileService
                        .saveProject(project.xml, project.project)
                        .pipe(
                            take(1),
                            tap(result => this.processError(result)),
                            filter(result => result.type === FsResultType.OK)
                        )
                })
            );
    }

}
