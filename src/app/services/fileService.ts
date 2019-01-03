import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { DmnProject } from '../model/project/dmnProject';
import { isNull } from '@xnoname/web-components';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs';


@Injectable()
export class FileService {

    private _ipc: IpcRenderer | undefined;
    private _filesystem;
    private _currentPath: string;

    public constructor(private _electronService: ElectronService) {
        if (!window['require']) {
            return;
        }
        this._filesystem = window['require']('fs');
    }

    public openProject(): Observable<{xml?: string, project?: DmnProject, error?: boolean }> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        const openOptions = <OpenDialogOptions>{
            filters: [{ name: 'DMN Projekt Files', extensions: ['dmnapp.json'] }],
            title: 'DMN Projekt öffnen',
            properties: ['openFile']
        };

        return Observable.create(observer => {
            dialog.showOpenDialog(window, openOptions, (fileNames) => {
                if (fileNames === undefined) {
                    observer.next({ error: false });
                    observer.complete();
                    return;
                }

                const filename = fileNames[0];
                this._currentPath = filename;
                const path = filename.substring(0, filename.lastIndexOf('\\') + 1);
                this._filesystem.readFile(filename, "utf-8", (err, data) => {
                    if (err) {
                        observer.next({ error: true });
                        observer.complete();
                        return;
                    }
                    const project = <DmnProject>JSON.parse(data);
                    this._filesystem.readFile(path + project.dmnPath, "utf-8", (err, data) => {
                        if (err) {
                            observer.next({ error: true });
                            observer.complete();
                            return;
                        }
                        observer.next({ xml: data, project: project, error: false });
                        observer.complete();
                    });
                });

            });
        });
    }

    public saveProject(xml: string, project: DmnProject, chooseLocation = false): Observable<boolean> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        const saveOptions = <SaveDialogOptions>{
            filters: [{ name: 'DMN Projekt Files', extensions: ['dmnapp.json'] }],
            title: 'DMN Projekt speichern',
            properties: ['openFile']
        }

        return Observable.create(observer => {
            if (!this._currentPath || chooseLocation) {
                dialog.showSaveDialog(window, saveOptions, (filename, bookmark) => {
                    this.writeFiles(filename, xml, project, observer);
                });
                return;
            }
            this.writeFiles(this._currentPath, xml, project, observer);
        });
    }

    public importExistingDmn(): Observable<string> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        const openOptions = <OpenDialogOptions>{
            filters: [{ name: 'DMN Files', extensions: ['xml', 'dmn'] }],
            title: 'DMN importieren',
            properties: ['openFile']
        };

        return Observable.create(observer => {
            dialog.showOpenDialog(window, openOptions, (fileNames) => {
                if (fileNames === undefined) {
                    observer.next({ error: false });
                    observer.complete();
                    return;
                }

                const filename = fileNames[0];
                this._filesystem.readFile(filename, "utf-8", (err, data) => {
                    if (err) {
                        observer.next({ error: true });
                        observer.complete();
                        return;
                    }
                    observer.next(data);
                    observer.complete();
                });

            });
        });
    }

    public resetCurrentPath() {
        this._currentPath = null;
    }

    private writeFiles(filename: string, xml: string, project: DmnProject, observable: Observer<boolean>) {
        const filenameParts = filename.split('.');
        const withoutExtension = filenameParts.slice(0, filenameParts.length - 2).join('.');
        const dmnFilename = withoutExtension.substr(withoutExtension.lastIndexOf('\\') + 1) + '.dmn';
        const targetPathDmn = withoutExtension + '.dmn';
        project.dmnPath = dmnFilename;

        this._filesystem.writeFile(filename, JSON.stringify(project), err => {
            if (isNull(err)) {

                this._filesystem.writeFile(targetPathDmn, xml, err => {
                    if (isNull(err)) {
                    } else {
                        observable.next(false);
                        observable.complete();
                        return;
                    }
                    observable.next(true);
                    observable.complete();
                });
            } else {
                observable.next(false);
                observable.complete();
                return;
            }
        });
    }
}