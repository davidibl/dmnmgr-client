import { Component, EventEmitter, Output, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { WorkspaceService } from '../../services/workspaceService';
import { map, filter, tap } from 'rxjs/operators';
import { WorkspaceFileModel } from '../../model/workspaceFileModel';
import { merge, combineLatest, BehaviorSubject } from 'rxjs';
import { GitService } from '../../services/gitService';
import { GitCommit } from '../../model/git/gitCommit';
import { ContextMenuCommand } from '@xnoname/web-components';

@Component({
    selector: 'xn-workspace',
    templateUrl: 'workspace.html',
    styleUrls: ['workspace.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent implements OnInit {

    public readonly filetreeViewmode = 'FILETREE';
    public readonly historyViewmode = 'HISTORY';
    public readonly initialViewmode = this.filetreeViewmode;

    public viewmode = new BehaviorSubject<string>(this.initialViewmode);
    public isInFiletreeMode$ = this.viewmode
        .pipe(map(viewmode => viewmode === this.filetreeViewmode));
    public isInHistoryMode$ = this.viewmode
        .pipe(map(viewmode => viewmode === this.historyViewmode));

    public currentFiles$ = merge(this.getFilesOfCurrentFolder(), this.getFilesOfFolderOpenedMarked());
    public currentHistory$ = this._gitService.getCurrentHistory();
    public branchname$ = this._gitService.getCurrentBranchname();

    @Output()
    public openFileRequested = new EventEmitter<string>();

    public constructor(
        private _workspaceService: WorkspaceService,
        private _gitService: GitService,
    ) { }

    public ngOnInit() {
        combineLatest(this._gitService.getCurrentCommit(), this.currentHistory$)
            .pipe(
                filter(([commit, history]) => !!commit && !!history),
                tap(([commit, history]) => {
                    const currentCommit = history.find(c => c.sha === commit.sha);
                    if (!!currentCommit) { currentCommit.current = true; }
                })
            ).subscribe();
    }

    public openFile(file: WorkspaceFileModel) {
        this.openFileRequested.emit(file.filepath);
    }

    public isFileChanged(filepath: string) {
        filepath = filepath.replace(new RegExp('\\\\', 'g'), '/');
        const alternateFilePath = filepath.replace('dmnapp.json', 'dmn');
        return this._gitService.getCurrentChangesInTree()
            .pipe(
                map(changes => !!changes.find(change =>
                    filepath.endsWith(change.path) || alternateFilePath.endsWith(change.path)))
            );
    }

    public refresh() {
        this._workspaceService.refresh();
    }

    public switchViewMode(viewmode: string) {
        this.viewmode.next(viewmode);
    }

    public onContextMenuItemClick(command: ContextMenuCommand) {
        if (command.command === 'checkout-commit') {
            this.checkoutCommit(command.getContext() as GitCommit);
        }
    }

    public checkoutCommit(commit: GitCommit) {
        this._gitService.checkoutCommit(commit);
    }

    private getFilesOfCurrentFolder() {
        return this._workspaceService
            .getCurrentFiles()
            .pipe(
                map(files => (!!files) ? files.filter(file => file.filename.endsWith('dmnapp.json')) : [])
            );
    }

    private getFilesOfFolderOpenedMarked() {
        return combineLatest(this._workspaceService.getCurrentFile(), this.getFilesOfCurrentFolder())
            .pipe(
                filter(([currentFile, files]) => !!currentFile && !!files),
                map(([currentFile, files]) => files.map(file => this.markFileAsActive(file, currentFile)))
            );
    }

    private markFileAsActive(file: WorkspaceFileModel, currentFile: WorkspaceFileModel) {
        file.active = file.filepath === currentFile.filepath;
        return file;
    }

}
