import { Component, OnInit, ViewChild } from '@angular/core';
import { merge } from 'rxjs';
import { tap, filter, map, switchMap, take, catchError } from 'rxjs/operators';
import { FileService } from '../../services/fileService';
import { DmnProjectService } from '../../services/dmnProjectService';
import { FsResultType, FileSystemAccessResult } from '../../model/fileSystemAccessResult';
import { TestDecisionService } from '../../services/testDecisionService';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event/event';
import { EventType } from '../../model/event/eventType';
import { AppConfigurationService } from '../../services/appConfigurationService';
import { SaveStateService } from '../../services/saveStateService';
import { DialogComponent, ButtonComponent } from '@xnoname/web-components';
import { ExportCommandEvent } from '../../model/event/exportCommandEvent';
import { ExportDataType } from '../../model/event/exportDataType';
import { GitService } from '../../services/gitService';
import { CommitDialogComponent } from '../commitDialog/commitDialog';
import { ElectronService } from '../../services/electronService';
import { TabIds } from '../../model/tabIds';
import { MessageDialogComponent } from '../dialogs/messageDialog';
import { CloneData } from '../../model/git/cloneData';
import { PluginItem } from '../../model/pluginItem';
import { Command } from '../../model/command';

@Component({
    selector: 'xn-app-root',
    templateUrl: 'app.html',
    styleUrls: ['app.scss'],
})
export class AppComponent implements OnInit {

    private commanEventMap: { [key: string]: string} = {
        pasteRules: EventType.PASTE_RULES,
        copyRules:  EventType.COPY_RULES,
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

    public recentFilesMenuVisible = false;

    public isHeadDetached$ = this._gitService.isHeadDetached();

    public showErrorDialog = false;
    public showAllTestsDialog = false;
    public showInfoDialog = false;
    public showCloneRepositoryDialog = false;

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
                       private _electronService: ElectronService,
                       private _appConfiguration: AppConfigurationService,
                       private _saveStateService: SaveStateService,
                       private _gitService: GitService) {}

    public ngOnInit() {
        this._eventService
            .getEvent<BaseEvent<string>>(ev => ev.type === EventType.GITERROR)
            .subscribe(ev => this.createError('GIT hat einen Fehler verursacht', ev.data));

        this._eventService
            .getEvent(ev => ev.type === EventType.TEXT_REPLACED)
            .subscribe(ev => {
                this.openMessageDialog(
                    'Ersetzen',
                    `Insgesamt wurden ${ev.data} Stellen ersetzt.`
                );
            });
    }

    public onCommandDispatched(command: Command) {
        if (!command) { return; }
        if (this.commanEventMap[command.command]) {
            const eventType = this.commanEventMap[command.command];
            this._eventService.publishEvent(new BaseEvent(eventType));
            return;
        }
        this[command.command](...command.args);
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
                tap(_ => this.openLoadingIndicator('Commit der Änderungen...')),
                switchMap(message => this._gitService.commitCurrentChanges(message)),
                tap(_ => this._eventService.publishEvent(new BaseEvent(EventType.REFRESH_WORKSPACE)))
            );

        const cancelObservable = this._commitMessageDialog.cancel.pipe(take(1));

        merge(commitObservable, cancelObservable)
            .pipe(tap(_ => this.closeCommitMessageDialog()))
            .subscribe(_ => this.switchMessageDialogToMessage('Commit', 'Änderungen sind commited.'));

        this._commitMessageDialog.open = true;
    }

    private closeCommitMessageDialog() {
        this._commitMessageDialog.open = false;
        this._commitMessageDialog.commitMessage = null;
    }

    public resetChanges() {
        this._gitService.resetCurrentChanges();
    }

    public checkoutMaster() {
        this._gitService.checkoutMasterAndDeleteDetached();
    }

    public cloneRepository() {
        this.checkGitConfiguration()
            .pipe(
                take(1),
                filter(configured => configured)
            ).subscribe(_ => this.showCloneRepositoryDialog = true);
    }

    public doCloneRepository(cloneData: CloneData) {
        this.openLoadingIndicator('Klone Repository...');
        this.showCloneRepositoryDialog = false;
        this._gitService
            .cloneRepository(cloneData)
            .pipe(
                take(1),
                catchError(error => {
                    this._messageDialog.open = false;
                    throw error;
                }),
                tap(_ =>
                    this._eventService.publishEvent(
                        new BaseEvent(EventType.FOLDER_CHANGED, cloneData.destinationPath)))
            )
            .subscribe(_ =>
                this.switchMessageDialogToMessage('Klonen', 'Das Repository steht zur Verfügung.'));
    }

    public pushCommits() {
        this.checkGitConfiguration()
            .pipe(
                take(1),
                filter(configured => configured),
                tap(_ => this.openLoadingIndicator('Push zum Server...')),
                switchMap(_ => this._gitService.pushCommits()),
                catchError(error => {
                    this._messageDialog.open = false;
                    throw error;
                }),
            )
            .subscribe(_ =>
                this.switchMessageDialogToMessage('Push', 'Änderungen erfolgreich an Server übertragen.'));
    }

    public pullFromRemote() {
        this.checkGitConfiguration()
            .pipe(
                take(1),
                filter(configured => configured),
                tap(_ => this.openLoadingIndicator('Pull vom Server...')),
                switchMap(_ => this._gitService.pullFromRemote()),
                catchError(error => {
                    this._messageDialog.open = false;
                    throw error;
                }),
            )
            .subscribe(_ =>
                this.switchMessageDialogToMessage('Pull', 'Letzte Änderungen erfolgreich abgeholt.'));
    }

    public openAllTestsDialog() {
        this.showAllTestsDialog = true;
    }

    public enablePlugin(plugin: PluginItem) {
        this._projectService.togglePluginActivation(plugin);
    }

    public showDocumentation() {
        this._eventService.publishEvent(new BaseEvent(EventType.JUMP_TO_TAB, TabIds.documentation));
    }

    public showInfo() {
        this.showInfoDialog = true;
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
                    this.openMessageDialog(
                        'Änderungshinweis',
                        'Derzeit kann nicht gespeichert werden! Ein älterer Arbeitsstand ist ausgecheckt.'
                    );
                }),
            );
        return merge(isNotDetached, isDetached);
    }

    private openMessageDialog(title: string, message: string) {
        this._messageDialog.reset();
        this._messageDialog.title = title;
        this._messageDialog.message = message;
        this._messageDialog.open = true;
    }

    private openLoadingIndicator(title: string) {
        this._messageDialog.reset();
        this._messageDialog.title = title;
        this._messageDialog.showLoadingIndicator = true;
        this._messageDialog.isClosable = false;
        this._messageDialog.open = true;
    }

    private switchMessageDialogToMessage(title: string, message: string) {
        this._messageDialog.title = title;
        this._messageDialog.message = message;
        this._messageDialog.showLoadingIndicator = false;
        this._messageDialog.isClosable = true;
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
