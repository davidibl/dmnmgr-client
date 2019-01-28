import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { DmnProject } from '../model/project/dmnProject';
import { isNull } from '@xnoname/web-components';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs';
import { FileSystemAccessResult, FsResultType } from '../model/fileSystemAccessResult';

export interface ConfigFile {
    mostRecent: MostRecentFile[];
}

export interface MostRecentFile {
    name: string;
    path: string;
}

@Injectable()
export class FileService {

    private _errorMessageImporting = 'Beim öffnen der Datei ist ein Fehler aufgreten.' +
                                     ' Evtl. verfügen Sie nicht über ausreichende Berechtigungen.'
    private _errorSavingProject = 'Die Projektdatei konnte nicht gespeichert werden. Wählen Sie ' +
                                  'ein Verzeichnisc auf das Sie Schreibberechtigung haben.';
    private _errorSavingDmn = 'Die DMN XML Datei konnte nicht gespeichert werden.';
    private _errorOpeningProject = 'Die Projektdatei konnte nicht gelesen werden.';
    private _errorOpeningDmn = 'Die im Projekt referenzierte DMN konnte nicht geladen werden.';

    private _filesystem;
    private _currentPath: string;

    public constructor(private _electronService: ElectronService) {
        if (!window['require']) {
            return;
        }
        this._filesystem = window['require']('fs');
    }

    public openProject(): Observable<FileSystemAccessResult<{xml?: string, project?: DmnProject}>> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        const openOptions = <OpenDialogOptions>{
            filters: [{ name: 'DMN Projekt Files', extensions: ['dmnapp.json'] }],
            title: 'DMN Projekt öffnen',
            properties: ['openFile']
        };

        return Observable.create(observer => {
            dialog.showOpenDialog(window, openOptions, (fileNames) => {
                if (fileNames === undefined || fileNames.length < 1) {
                    observer.next({ error: false });
                    observer.complete();
                    return;
                }

                const filename = fileNames[0];
                this._currentPath = filename;
                const path = filename.substring(0, filename.lastIndexOf('\\') + 1);
                this._filesystem.readFile(filename, (err, data) => {
                    if (err) {
                        observer.next({ type: FsResultType.ERROR, message: this._errorOpeningProject });
                        observer.complete();
                        return;
                    }
                    const project = <DmnProject>JSON.parse(data);
                    this._filesystem.readFile(path + project.dmnPath, "utf-8", (err, data) => {
                        if (err) {
                            observer.next({ type: FsResultType.ERROR, message: this._errorOpeningDmn });
                            observer.complete();
                            return;
                        }
                        observer.next({ type: FsResultType.OK, data: { xml: data, project: project }});
                        observer.complete();
                    });
                });

            });
        });
    }

    public openOrCreateConfigFile(): Observable<ConfigFile> {
        const filename = 'dmnmgr.config.json';
        return Observable.create(observer => {
            if (!this._filesystem.existsSync(filename)) {
                this._filesystem.writeFile(filename, JSON.stringify({ mostRecent: []}), err => {
                    if (isNull(err)) {
                        this.readConfigFile(filename, observer);
                    } else {
                        return;
                    }
                });
            } else {
                this.readConfigFile(filename, observer);
            }
        });
    }

    public saveProject(xml: string, project: DmnProject, chooseLocation = false):
            Observable<FileSystemAccessResult<void>> {
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
                    if (isNull(filename)) {
                        observer.next({ type: FsResultType.NOTHING_SELECTED });
                        return;
                    }
                    this.writeFiles(filename, xml, project, observer);
                });
                return;
            }
            this.writeFiles(this._currentPath, xml, project, observer);
        });
    }

    public importExistingDmn(): Observable<FileSystemAccessResult<string>> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        const openOptions = <OpenDialogOptions>{
            filters: [{ name: 'DMN Files', extensions: ['xml', 'dmn'] }],
            title: 'DMN importieren',
            properties: ['openFile']
        };

        return Observable.create(observer => {
            dialog.showOpenDialog(window, openOptions, (fileNames) => {
                if (isNull(fileNames) || fileNames.length < 1) {
                    observer.next({ type: FsResultType.NOTHING_SELECTED, message: this._errorMessageImporting });
                    observer.complete();
                    return;
                }

                const filename = fileNames[0];
                this._filesystem.readFile(filename, "utf-8", (err, data) => {
                    if (err) {
                        observer.next({ type: FsResultType.ERROR, message: this._errorMessageImporting });
                        observer.complete();
                        return;
                    }
                    observer.next({ type: FsResultType.OK, data: data });
                    observer.complete();
                });

            });
        });
    }

    public resetCurrentPath() {
        this._currentPath = null;
    }

    private writeFiles(filename: string,
                       xml: string,
                       project: DmnProject,
                       observable: Observer<FileSystemAccessResult<void>>) {
        const filenameParts = filename.split('.');
        const withoutExtension = filenameParts.slice(0, filenameParts.length - 2).join('.');
        const dmnFilename = withoutExtension.substr(withoutExtension.lastIndexOf('\\') + 1) + '.dmn';
        const targetPathDmn = withoutExtension + '.dmn';
        project.dmnPath = dmnFilename;
        this._currentPath = filename;

        this._filesystem.writeFile(filename, JSON.stringify(project), err => {
            if (isNull(err)) {

                this._filesystem.writeFile(targetPathDmn, xml, err => {
                    if (isNull(err)) {
                    } else {
                        observable.next({ type: FsResultType.ERROR, message: this._errorSavingDmn });
                        observable.complete();
                        return;
                    }
                    observable.next({ type: FsResultType.OK });
                    observable.complete();
                });
            } else {
                observable.next({ type: FsResultType.ERROR, message: this._errorSavingProject });
                observable.complete();
                return;
            }
        });
    }

    private readConfigFile(filename, observable: Observer<FileSystemAccessResult<ConfigFile>>) {
        this._filesystem.readFile(filename, "utf-8", (err, data) => {
            if (err) {
                observable.next({ type: FsResultType.ERROR, message: this._errorMessageImporting });
                observable.complete();
                return;
            }
            observable.next({ type: FsResultType.OK, data: JSON.parse(data) });
            observable.complete();
        });
    }
}
