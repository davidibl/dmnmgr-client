import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Observable, merge, combineLatest, zip } from 'rxjs';
import { tap, filter, map, switchMap, take } from 'rxjs/operators';
import { FileService } from '../../services/fileService';
import { DmnProjectService } from '../../services/dmnProjectService';
import { FsResultType, FileSystemAccessResult } from '../../model/fileSystemAccessResult';
import { TestDecisionService } from '../../services/testDecisionService';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event/event';
import { EventType } from '../../model/event/eventType';
import { PluginRegistryService } from '../../services/pluginRegistryService';
import { PluginDescriptor } from '../../model/plugin/pluginDescriptor';
import { PluginMetaDescriptor } from '../../model/plugin/pluginMetaDescriptor';
import { MostRecentFile } from '../../model/appConfiguration/mostRecentFile';
import { AppConfigurationService } from '../../services/appConfigurationService';
import { SaveStateService } from '../../services/saveStateService';
import { DialogComponent, ButtonComponent } from '@xnoname/web-components';
import { NewViewEvent } from '../../model/event/newViewEvent';
import { ExportCommandEvent } from '../../model/event/exportCommandEvent';
import { ExportDataType } from '../../model/event/exportDataType';
import { GitService } from '../../services/gitService';
import { CommitDialogComponent } from '../commitDialog/commitDialog';
import { ElectronService } from '../../services/electronService';
import { TabIds } from '../../model/tabIds';
import { MessageDialogComponent } from '../dialogs/messageDialog';

export interface PluginItem extends PluginMetaDescriptor {
    activated: boolean;
}

@Component({
    selector: 'xn-app-root',
    templateUrl: 'app.html',
    styleUrls: ['app.scss'],
})
export class AppComponent implements OnInit {

    private HOTKEY_MAPPING: {[key: string]: () => void} = {
        KeyO: () => this.openProject(),
        KeyN: () => this.createNewProject(),
        KeyS: () => this.saveProject(),
        KeyH: () => this.showDocumentation(),
        KeyE: () => this.exportCurrentTable(),
        KeyR: () => this.toggleRecentFiles(),
        KeyP: () => this.openFolder(),
        KeyK: () => this.showSettings(),
    };

    @ViewChild('unsavedChangesDialog')
    private _unsavedChangesDialog: DialogComponent;

    @ViewChild('commitMessageDialog')
    private _commitMessageDialog: CommitDialogComponent;

    @ViewChild('messageDialog')
    private _messageDialog: MessageDialogComponent;

    @ViewChild('dontSaveButton')
    private _dontSaveButton: ButtonComponent;

    private _error: string;
    private _errorTitle: string;

    public fileMenuVisible = false;
    public testMenuVisible = false;
    public repositoryMenuVisible = false;
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
    public hasChanges$: Observable<boolean>;

    public isRepositoryConnected$ = this._gitService.isRepositoryConnected();
    public isRepositoryNotConnected$ = this._gitService.isRepositoryConnected().pipe(map(connected => !connected));
    public isHeadDetached$ = this._gitService.isHeadDetached();
    public hasChangesInTree$ = this._gitService.getCurrentChangesInTree()
        .pipe(map(changes => !!changes && changes.length > 0));
    public connectedHasChangesAndNotDetached$ =
        zip(this.isRepositoryConnected$, this.isHeadDetached$, this.hasChangesInTree$)
            .pipe(map(([connected, detached, hasChanges]) => connected && !detached && hasChanges));
    public connectedAndClean$ =
        zip(this.isRepositoryConnected$, this.isHeadDetached$, this.hasChangesInTree$)
            .pipe(map(([connected, detached, hasChanges]) => connected && !detached && !hasChanges));


    public showErrorDialog = false;
    public showAllTestsDialog = false;

    public isDecicionTableMode: boolean;

    public get error() {
        return this._error;
    }

    public get errorTitle() {
        return this._errorTitle;
    }

    public constructor(private _fileService: FileService,
                       private _projectService: DmnProjectService,
                       private _testDecisionService: TestDecisionService,
                       private _eventService: EventService,
                       private _pluginService: PluginRegistryService,
                       private _electronService: ElectronService,
                       private _appConfiguration: AppConfigurationService,
                       private _saveStateService: SaveStateService,
                       private _gitService: GitService) {}

    public ngOnInit() {
        this.mostRecentFiles$ = this._appConfiguration.getMostRecentFiles();
        this.hasChanges$ = this._saveStateService.hasChanges$();
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
                        };
                    });
                })
            );

        this._eventService
            .getEvent<NewViewEvent>((event) => event.type === EventType.NEW_VIEW)
            .pipe( map(ev => ev.data.isDecisionTable) )
            .subscribe(isDecisionTableMode => this.isDecicionTableMode = isDecisionTableMode);

        this._eventService
            .getEvent<BaseEvent<string>>(ev => ev.type === EventType.GITERROR)
            .subscribe(ev => this.createError('GIT hat einen Fehler verursacht', ev.data));
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
        this.repositoryMenuVisible = false;
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

    public openFolder() {
        this.confirmActionWhenChangesAreUnsaved(() => {
            this._fileService
                .openFolder()
                .pipe(
                    tap(result => this.processError(result)),
                    filter(result => result.type === FsResultType.OK)
                )
                .subscribe(_ => {
                    this._projectService.readProject(null, null);
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
                    switchMap(_ => this.cancelActionWhenDetached()),
                    filter(result => !result),
                    switchMap(_ => this.saveProjectSilent().pipe(take(1), map(__ => true)))
                );

            const onDontSave = this._dontSaveButton.clicked.pipe(map(_ => true));
            const onCancel = this._unsavedChangesDialog.cancel.pipe(map(_ => false));

            merge(onSave, onCancel, onDontSave)
                .pipe(take(1))
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
        this.cancelActionWhenDetached()
            .pipe(filter(result => !result))
            .subscribe(_ => this.saveProjectSilent()
                .subscribe(__ => this._saveStateService.resetChanges()));
    }

    public saveProjectAs() {
        this.cancelActionWhenDetached()
            .pipe(filter(result => !result))
            .subscribe(_ => this._projectService
                .getProject()
                .subscribe(project => {
                    this._fileService
                        .saveProject(project.xml, project.project, true)
                        .pipe(
                            tap(result => this.processError(result)),
                            filter(result => result.type === FsResultType.OK),
                            tap(__ => this._eventService.publishEvent(new BaseEvent(EventType.REFRESH_WORKSPACE)))
                        )
                        .subscribe(___ => this._saveStateService.resetChanges());
                })
            );
    }

    public createNewProject() {
        this.confirmActionWhenChangesAreUnsaved(() => {
            this._fileService.resetCurrentPath();
            this._projectService.createNewProject();
            this._saveStateService.resetChanges();
            this._eventService.publishEvent(
                new BaseEvent(EventType.FOLDER_CHANGED, null));
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
        this.confirmActionWhenChangesAreUnsaved(() => {
            this._electronService.process.exit();
        });
    }

    public onOpenChange($event) {
        if (!open) {
            this.clearError();
            this._error = null;
            this._errorTitle = null;
        }
    }

    public openSearch() {
        this._eventService.publishEvent(new BaseEvent(EventType.OPEN_SEARCH));
    }

    public clearError() {
        this.showErrorDialog = false;
    }

    public commitChanges() {
        this.checkGitConfiguration()
            .pipe(
                take(1),
                filter(configured => configured)
            )
            .subscribe(_ => this.doCommit());
    }

    private doCommit() {
        const commitObservable = this._commitMessageDialog
            .commit
            .pipe(
                take(1),
                switchMap(message => this._gitService.commitCurrentChanges(message)),
                tap(_ => this._eventService.publishEvent(new BaseEvent(EventType.REFRESH_WORKSPACE)))
            );

        const cancelObservable = this._commitMessageDialog.cancel.pipe(take(1));

        merge(commitObservable, cancelObservable)
            .pipe(tap(_ => this._commitMessageDialog.commitMessage = null))
            .subscribe(_ => this._commitMessageDialog.open = false);

        this._commitMessageDialog.open = true;
    }

    public resetChanges() {
        this._gitService.resetCurrentChanges();
    }

    public checkoutMaster() {
        this._gitService.checkoutMasterAndDeleteDetached();
    }

    public cloneRepository() {
    }

    public pushCommits() {
        this.checkGitConfiguration()
            .pipe(
                take(1),
                filter(configured => configured)
            )
            .subscribe(_ => this._gitService.pushCommits());
    }

    public pullFromRemote() {
        this.checkGitConfiguration()
            .pipe(
                take(1),
                filter(configured => configured)
            )
            .subscribe(_ => this._gitService.pullFromRemote());
    }

    public openAllTestsDialog() {
        this.showAllTestsDialog = true;
    }

    @HostListener('window:keyup', ['$event'])
    public handleKeyboardEvent(event: KeyboardEvent) {
        if (!event.ctrlKey) { return; }
        if (!this.HOTKEY_MAPPING[event.code]) { return; }
        this.HOTKEY_MAPPING[event.code]();
    }

    public toggleRecentFiles() {
        this.fileMenuVisible = !this.fileMenuVisible;
        this.recentFilesMenuVisible = !this.recentFilesMenuVisible;
    }

    public enablePlugin(plugin: PluginItem) {
        this._projectService.togglePluginActivation(plugin);
    }

    public showDocumentation() {
        this._eventService.publishEvent(new BaseEvent(EventType.JUMP_TO_TAB, TabIds.documentation));
    }

    public exportCurrentTable() {
        this._eventService.publishEvent(new ExportCommandEvent(ExportDataType.CSV));
    }

    public importCsv() {
        this._eventService.publishEvent(new BaseEvent(EventType.JUMP_TO_TAB, TabIds.importer));
    }

    public showSettings() {
        this._eventService.publishEvent(new BaseEvent(EventType.JUMP_TO_TAB, TabIds.settings));
    }

    public createError(errorTitle: string, error: string) {
        this._error = error;
        this._errorTitle = errorTitle;
        this.showErrorDialog = true;
    }

    private cancelActionWhenDetached() {
        const isNotDetached = this.isHeadDetached$
            .pipe(
                take(1),
                filter(detached => !detached),
            );
        const isDetached = this.isHeadDetached$
            .pipe(
                take(1),
                filter(detached => !!detached),
                tap(_ => {
                    this._messageDialog.message =
                        'Derzeit kann nicht gespeichert werden! Ein älterer Arbeitsstand ist ausgecheckt.';
                    this._messageDialog.open = true;
                }),
            );
        return merge(isNotDetached, isDetached);
    }

    private processError(result: FileSystemAccessResult<any>) {
        if (result.type === FsResultType.ERROR) {
            this.createError('Fehler', result.message);
        }
    }

    private checkGitConfiguration() {
        const isConfigured$ = this._gitService
            .isConfigured()
            .pipe(
                filter(result => result)
            );
        const isNotConfigured$ = this._gitService
            .isConfigured()
            .pipe(
                filter(result => !result),
                tap(_ => this.showSettings())
            );

        return merge(isConfigured$, isNotConfigured$);
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
                            filter(result => result.type === FsResultType.OK),
                            tap(_ => this._eventService.publishEvent(new BaseEvent(EventType.REFRESH_WORKSPACE)))
                        );
                })
            );
    }

}
