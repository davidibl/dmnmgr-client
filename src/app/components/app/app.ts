import { Component } from '@angular/core';
import { FileService } from '../../services/fileService';
import { DmnProjectService } from '../../services/dmnProjectService';
import { ElectronService } from 'ngx-electron';

@Component({
    selector: 'xn-app-root',
    templateUrl: 'app.html',
    styleUrls: ['app.scss'],
})
export class AppComponent {

    public fileMenuVisible = false;
    public editMenuVisible = false;
    public projectMenuVisible = false;
    public aboutMenuVisisble = false;

    public constructor(private _fileService: FileService,
                       private _projectService: DmnProjectService,
                       private _electronService: ElectronService) {}

    public openProject() {
        this._fileService
            .openProject()
            .subscribe(result => {
                if (!result.error) {
                    this._projectService.readProject(result.xml, result.project);
                }
            });
    }

    public saveProject() {
        this._projectService
            .getProject()
            .subscribe(project => {
                this._fileService
                    .saveProject(project.xml, project.project)
                    .subscribe();
            });
    }

    public saveProjectAs() {
        this._projectService
            .getProject()
            .subscribe(project => {
                this._fileService
                    .saveProject(project.xml, project.project, true)
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
            .subscribe(xml => this._projectService.importDmn(xml));
    }

    public exit() {
        this._electronService.process.exit();
    }
}
