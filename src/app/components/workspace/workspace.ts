import { Component, EventEmitter, Output } from '@angular/core';
import { WorkspaceService } from '../../services/workspaceService';
import { map, filter } from 'rxjs/operators';
import { WorkspaceFileModel } from '../../model/workspaceFileModel';
import { merge, combineLatest } from 'rxjs';

@Component({
    selector: 'xn-workspace',
    templateUrl: 'workspace.html',
    styleUrls: ['workspace.scss'],
})
export class WorkspaceComponent {

    public currentFiles$ = merge(this.getFilesOfCurrentFolder(), this.getFilesOfFolderOpenedMarked());

    @Output()
    public openFileRequested = new EventEmitter<string>();

    public constructor(private _workspaceService: WorkspaceService) {}

    public openFile(file: WorkspaceFileModel) {
        this.openFileRequested.emit(file.filepath);
    }

    private getFilesOfCurrentFolder() {
        return this._workspaceService
            .getCurrentFiles()
            .pipe(
                map(files => files.filter(file => file.filename.endsWith('dmnapp.json')))
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
