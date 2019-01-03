import { Component } from '@angular/core';
import { FileService } from '../../services/fileService';
import { DmnProjectService } from '../../services/dmnProjectService';
import { ElectronService } from 'ngx-electron';
import { tap } from 'rxjs/operators/tap';
import { FsResultType, FileSystemAccessResult } from '../../model/fileSystemAccessResult';
import { filter } from 'rxjs/operators/filter';

@Component({
    selector: 'xn-app-root',
    templateUrl: 'app.html',
    styleUrls: ['app.scss'],
})
export class AppComponent {

    private _filesystemError: string;

    public fileMenuVisible = false;
    public editMenuVisible = false;
    public projectMenuVisible = false;
    public aboutMenuVisisble = false;

    public set filesystemError(filesystemError: string) {
        this._filesystemError = filesystemError;
        this.showErrorDialog = true;
    }

    public get filesystemError() {
        return this._filesystemError;
    }

    public showErrorDialog = false;

    public constructor(private _fileService: FileService,
                       private _projectService: DmnProjectService,
                       private _electronService: ElectronService) {}

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

    public exit() {
        this._electronService.process.exit();
    }

    public onOpenChange($event) {
        if (!open) {
            this.clearError();
        }
    }

    public clearError() {
        this.showErrorDialog = false;
    }

    private processError(result: FileSystemAccessResult<any>) {
        if (result.type === FsResultType.ERROR) {
            this.filesystemError = result.message;
        }
    }
}
