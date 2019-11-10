import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, filter, map, switchMap, take } from 'rxjs/operators';
import { FileService } from '../../services/fileService';
import { DmnProjectService } from '../../services/dmnProjectService';
import { ElectronService } from 'ngx-electron';
import { FsResultType, FileSystemAccessResult } from '../../model/fileSystemAccessResult';
import { TestDecisionService } from '../../services/testDecisionService';
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
import { merge } from 'rxjs/operators';
import { NewViewEvent } from '../../model/event/newViewEvent';
import { ExportCommandEvent } from '../../model/event/exportCommandEvent';
import { ExportDataType } from '../../model/event/exportDataType';
import { GitService } from '../../services/gitService';

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
                    switchMap(_ => this.saveProjectSilent().pipe(take(1), map(__ => true)))
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
        this.confirmActionWhenChangesAreUnsaved(() => {
            this._electronService.process.exit();
        });
    }

    public onOpenChange($event) {
        if (!open) {
            this.clearError();
        }
    }

    public openSearch() {
        this._eventService.publishEvent(new BaseEvent(EventType.OPEN_SEARCH));
    }

    public clearError() {
        this.showErrorDialog = false;
    }

    public commitChanges() {

    }

    public cloneRepository() {

    }

    public openAllTestsDialog() {
        this.showAllTestsDialog = true;
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
                        );
                })
            );
    }

}
