import { Component, ChangeDetectionStrategy, Output, EventEmitter, Input, HostListener } from '@angular/core';
import { BehaviorSubject, combineLatest, zip, ReplaySubject } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { SaveStateService } from '../../services/saveStateService';
import { EventService } from '../../services/eventService';
import { EventType } from '../../model/event/eventType';
import { NewViewEvent } from '../../model/event/newViewEvent';
import { PluginRegistryService } from '../../services/pluginRegistryService';
import { DmnProjectService } from '../../services/dmnProjectService';
import { PluginMetaDescriptor } from '../../model/plugin/pluginMetaDescriptor';
import { PluginDescriptor } from '../../model/plugin/pluginDescriptor';
import { GitService } from '../../services/gitService';
import { AppConfigurationService } from '../../services/appConfigurationService';
import { Command } from '../../model/command';

@Component({
    selector: 'xn-main-menu',
    templateUrl: 'mainMenu.html',
    styleUrls: ['mainMenu.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainMenuComponent {

    private INTERNAL_HOTKEY_MAPPING: {[key: string]: () => void} = {
        KeyR: () => this.toggleRecentFiles(),
    };

    private HOTKEY_MAPPING: {[key: string]: string} = {
        KeyO: 'openProject',
        KeyN: 'createNewProject',
        KeyS: 'saveProject',
        KeyH: 'showDocumentation',
        KeyE: 'exportCurrentTable',
        KeyP: 'openFolder',
        KeyK: 'showSettings',
        KeyI: 'showInfo',
    };

    public fileMenuVisible$ = new BehaviorSubject(false);
    public testMenuVisible$ = new BehaviorSubject(false);
    public repositoryMenuVisible$ = new BehaviorSubject(false);
    public bearbeitenMenuVisible$ = new BehaviorSubject(false);
    public pluginMenuVisible$ = new BehaviorSubject(false);
    public engineMenuVisible$ = new BehaviorSubject(false);
    public helpMenuVisible$ = new BehaviorSubject(false);
    public menuVisible$ = new BehaviorSubject(false);
    public recentFilesMenuVisible$ = new BehaviorSubject(false);

    @Output()
    public commandDispatched = new EventEmitter<Command>();

    public hasChanges$ = this._saveStateService.hasChanges$();

    public mostRecentFiles$ = this._appConfiguration.getMostRecentFiles();

    public plugins$ = this._pluginService.getPlugins();
    public pluginsConfigured$ = this._projectService.getPlugins();
    public pluginsMerged$ = combineLatest(this.plugins$, this.pluginsConfigured$)
        .pipe (map(([pluginsMeta, plugins]) => this.mergePluginListAndConfiguration(pluginsMeta, plugins)));

    public isHeadDetached$ = this._gitService.isHeadDetached();
    public isRepositoryConnected$ = this._gitService.isRepositoryConnected();
    public isRepositoryNotConnected$ = this._gitService.isRepositoryConnected().pipe(map(connected => !connected));
    public hasChangesInTree$ = this._gitService.getCurrentChangesInTree()
        .pipe(map(changes => !!changes && changes.length > 0));
    public connectedHasChangesAndNotDetached$ =
        zip(this.isRepositoryConnected$, this.isHeadDetached$, this.hasChangesInTree$)
            .pipe(map(([connected, detached, hasChanges]) => connected && !detached && hasChanges));
    public connectedAndClean$ =
        zip(this.isRepositoryConnected$, this.isHeadDetached$, this.hasChangesInTree$)
            .pipe(map(([connected, detached, hasChanges]) => connected && !detached && !hasChanges));

    public isDecicionTableMode$ = new ReplaySubject<boolean>(1);

    public constructor(
        private _saveStateService: SaveStateService,
        private _eventService: EventService,
        private _pluginService: PluginRegistryService,
        private _projectService: DmnProjectService,
        private _gitService: GitService,
        private _appConfiguration: AppConfigurationService,
    ) {
        this._eventService
            .getEvent<NewViewEvent>((event) => event.type === EventType.NEW_VIEW)
            .pipe(map(ev => ev.data.isDecisionTable))
            .subscribe(decisionTableMode => this.isDecicionTableMode$.next(decisionTableMode));
    }

    public toggleMenuVisible() {
        this.menuVisible$
            .pipe(take(1))
            .subscribe(visible => this.menuVisible$.next((!visible)));
    }

    public openMenu(menuName: string) {
        this.fileMenuVisible$.next(false);
        this.testMenuVisible$.next(false);
        this.bearbeitenMenuVisible$.next(false);
        this.pluginMenuVisible$.next(false);
        this.engineMenuVisible$.next(false);
        this.helpMenuVisible$.next(false);
        this.repositoryMenuVisible$.next(false);
        this.recentFilesMenuVisible$.next(false);
        this[menuName + '$'].next(true);
    }

    public openInnerMenu(menuName: string) {
        this[menuName + '$'].next(true);
    }

    public dispatchCommand(command: string, args?: any[]) {
        this.commandDispatched.emit(new Command(command, args));
    }

    public closeMenu(menuName: string) {
        this[menuName + '$'].next(false);
    }

    public onMenuOutsideClick() {
        this.menuVisible$.next(false);
    }

    public toggleRecentFiles() {
        this.menuVisible$.next(true);
        this.fileMenuVisible$.next(true);
        this.recentFilesMenuVisible$.next(true);
    }

    @HostListener('window:keyup', ['$event'])
    public handleKeyboardEvent(event: KeyboardEvent) {
        if (!event.ctrlKey) { return; }
        if (!this.HOTKEY_MAPPING[event.code] &&
            !this.INTERNAL_HOTKEY_MAPPING[event.code]) { return; }

        if (!!this.INTERNAL_HOTKEY_MAPPING[event.code]) {
            this.INTERNAL_HOTKEY_MAPPING[event.code]();
            return;
        }
        this.dispatchCommand(this.HOTKEY_MAPPING[event.code]);
    }

    private mergePluginListAndConfiguration(
        pluginsMeta: PluginMetaDescriptor[],
        plugins: PluginDescriptor[],
    ) {
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
    }
}
