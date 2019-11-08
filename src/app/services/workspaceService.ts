import { Injectable } from '@angular/core';
import { EventService } from './eventService';
import { EventType } from '../model/event/eventType';
import { switchMap, map, filter } from 'rxjs/operators';
import { FileService } from './fileService';
import { BehaviorSubject, Observable } from 'rxjs';
import { WorkspaceFileModel } from '../model/workspaceFileModel';
import { GenericCache2 } from '@xnoname/web-components';

@Injectable()
export class WorkspaceService {

    private _filesCache: GenericCache2<WorkspaceFileModel[]>;
    private _fileCache: GenericCache2<WorkspaceFileModel>;

    public constructor(
        private _eventService: EventService,
        private _fileService: FileService
    ) {

        this._filesCache = GenericCache2
            .create<WorkspaceFileModel[]>()
            .basedOn(this.getNewDirectoryPathEvent())
            .switchTo(directoryPath => _fileService.findFiles(directoryPath),
                (directoryPath, files) => this.createWorkspaceFiles(directoryPath, files))
            .initialize();

        this._fileCache = GenericCache2
            .create<WorkspaceFileModel>()
            .switchTo(() => this.getCurrentWorkspaceFile())
            .initialize();
    }

    public getCurrentFiles() {
        return this._filesCache.getCache();
    }

    public getCurrentFile() {
        return this._fileCache.getCache();
    }

    private getNewDirectoryPathEvent(): Observable<string> {
        return this._eventService
            .getEvent((ev) => ev.type === EventType.FOLDER_CHANGED)
            .pipe(
                map(ev => this._fileService.getDirectory(ev.data))
            );
    }

    private getCurrentWorkspaceFile(): Observable<WorkspaceFileModel> {
        return this._eventService
            .getEvent((ev) => ev.type === EventType.OPENED_FILE_CHANGED)
            .pipe(
                map(ev => <string>ev.data),
                map(path => new WorkspaceFileModel(this._fileService.getFilename(path), path))
            );
    }

    private createWorkspaceFiles(directoryPath: string, files: string[]): WorkspaceFileModel[] {
        return files.map(filename => new WorkspaceFileModel(filename, this.concatPath(directoryPath, filename)));
    }

    private concatPath(pathLeft: string, pathRight: string) {
        pathLeft = (pathLeft.endsWith('\\')) ? pathLeft.substr(0, pathLeft.length - 1) : pathLeft;
        pathRight = (pathRight.startsWith('\\')) ? pathRight.substr(1) : pathRight;
        return pathLeft.concat('\\').concat(pathRight);
    }
}
