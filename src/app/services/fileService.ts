import { Injectable, NgZone } from '@angular/core';
import { OpenDialogOptions, SaveDialogOptions, OpenDialogReturnValue, SaveDialogReturnValue } from 'electron';
import { DmnProject } from '../model/project/dmnProject';
import { Remote } from 'electron';
import { isNull } from '@xnoname/web-components';
import { Observable, Observer, of } from 'rxjs';
import { FileSystemAccessResult, FsResultType } from '../model/fileSystemAccessResult';
import { ErrorMessageService } from './errorMessageService';
import { FileSaveDialogOptions } from '../model/fileSaveDialogOptions';
import { EventService } from './eventService';
import { BaseEvent } from '../model/event/event';
import { EventType } from '../model/event/eventType';
import { ElectronService } from './electronService';

@Injectable()
export class FileService {

    private _errorMessageImporting = 'Beim öffnen der Datei ist ein Fehler aufgreten.' +
        ' Evtl. verfügen Sie nicht über ausreichende Berechtigungen.';
    private _errorSavingProject = 'Die Projektdatei konnte nicht gespeichert werden. Wählen Sie ' +
        'ein Verzeichnis auf das Sie Schreibberechtigung haben.';
    private _errorSavingDmn = 'Die DMN XML Datei konnte nicht gespeichert werden.';
    private _errorOpeningProject = 'Die Projektdatei konnte nicht gelesen werden.';
    private _errorOpeningDmn = 'Die im Projekt referenzierte DMN konnte nicht geladen werden.';

    private _filesystem;
    private _currentPath: string;

    private _openOptionsImportExistingDmn = <OpenDialogOptions>{
        filters: [{ name: 'DMN Files', extensions: ['xml', 'dmn'] }],
        title: 'DMN importieren',
        properties: ['openFile']
    };

    private _openOptionsChooseProjectFolder = <OpenDialogOptions>{
        title: 'Projektordner öffnen',
        properties: ['openDirectory']
    };

    private _openOptionsChooseFolderOnly = <OpenDialogOptions>{
        title: 'Zielordner wählen',
        properties: ['openDirectory']
    };

    public get currentPath() {
        return this._currentPath;
    }

    public constructor(
        private _errorMessageService: ErrorMessageService,
        private _zone: NgZone,
        private _electronService: ElectronService,
        private _eventService: EventService,
    ) {

        if (!window['require']) {
            return;
        }
        this._filesystem = window.require('fs');
    }

    public getUserDataPath() {
        return this._electronService.remote.app.getPath('userData');
    }

    public getCurrentFilename() {
        return (!!this._currentPath) ? this.getFilename(this._currentPath) : null;
    }

    public openProject(filepath?: string): Observable<FileSystemAccessResult<{ xml?: string, project?: DmnProject }>> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        const openOptions = <OpenDialogOptions>{
            filters: [{ name: 'DMN Projekt Files', extensions: ['dmnapp.json'] }],
            title: 'DMN Projekt öffnen',
            properties: ['openFile']
        };

        return Observable.create(observer => {
            if (filepath) {
                if (!this._filesystem.existsSync(filepath)) {
                    observer.next({ type: FsResultType.NOT_FOUND, message: `Die Datei ${filepath} kann nicht gefunden werden.` });
                    return;
                }
                this.openFile(filepath, observer);
                this._eventService.publishEvent(
                    new BaseEvent(EventType.FOLDER_CHANGED, this.getDirectory(filepath)));
                this._eventService.publishEvent(
                    new BaseEvent(EventType.OPENED_FILE_CHANGED, filepath));
                return;
            }
            dialog.showOpenDialog(window, openOptions).then((openDialogReturnValue: OpenDialogReturnValue) => {
                const fileNames = openDialogReturnValue.filePaths;
                if (fileNames === undefined || fileNames.length < 1) {
                    observer.next({ error: false });
                    observer.complete();
                    return;
                }

                const filename = fileNames[0];
                this.openFile(filename, observer);
                this._eventService.publishEvent(
                    new BaseEvent(EventType.FOLDER_CHANGED, this.getDirectory(filename)));
                this._eventService.publishEvent(
                    new BaseEvent(EventType.OPENED_FILE_CHANGED, filename));
            });
        });
    }

    public openFolder(): Observable<FileSystemAccessResult<string>> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        return Observable.create(observer => {
            dialog.showOpenDialog(window, this._openOptionsChooseProjectFolder)
                .then((openDialogReturnValue: OpenDialogReturnValue) => {

                const directoryNames = openDialogReturnValue.filePaths;
                if (directoryNames === undefined || directoryNames.length < 1) {
                    observer.next({ type: FsResultType.NOTHING_SELECTED });
                    observer.complete();
                    return;
                }

                const directoryName = directoryNames[0];
                this._eventService.publishEvent(
                    new BaseEvent(EventType.FOLDER_CHANGED, directoryName));
                observer.next({ type: FsResultType.OK, filepath: directoryName});
            });
        });
    }

    public chooseFolder(): Observable<FileSystemAccessResult<string>> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        return Observable.create(observer => {
            dialog.showOpenDialog(window, this._openOptionsChooseFolderOnly).
                then((openDialogReturnValue: OpenDialogReturnValue) => {

                const directoryNames = openDialogReturnValue.filePaths;
                if (directoryNames === undefined || directoryNames.length < 1) {
                    observer.next({ error: false, type: FsResultType.NOTHING_SELECTED });
                    observer.complete();
                    return;
                }

                const directoryName = directoryNames[0];
                observer.next({ error: false, filepath: directoryName, type: FsResultType.OK });
            });
        });
    }

    public findFiles(folderPath: string): Observable<string[]> {
        if (!folderPath) {
            return of([]);
        }
        return Observable.create(observer => {
            this._filesystem.readdir(folderPath, (err, files) => {
                observer.next(files);
                observer.complete();
            });
        });
    }

    public getDirectory(path: string) {
        if (!path) {
            return null;
        }
        return this._filesystem.lstatSync(path).isDirectory() ? path :
            path.substring(0, path.lastIndexOf('\\'));
    }

    public getFilename(path: string) {
        return path.substr(path.lastIndexOf('\\'));
    }

    public openFile(filepath: string, observer: Observer<FileSystemAccessResult<{ xml?: string, project?: DmnProject }>>) {
        this._currentPath = filepath;
        const path = filepath.substring(0, filepath.lastIndexOf('\\') + 1);

        this._filesystem.readFile(filepath, (err, data) => this.callback(() => {
            if (err) {
                this._zone.run(() => {
                    const errorMessage = this._errorMessageService
                        .getErrorMessage(err.message, this._errorOpeningProject, { path: filepath });
                    observer.next({ type: FsResultType.ERROR, message: errorMessage });
                    observer.complete();
                });
                return;
            }
            const project = <DmnProject>JSON.parse(data);
            this._filesystem.readFile(path + project.dmnPath, 'utf-8', (err2, data2) => this.callback(() => {
                if (err2) {
                    const errorMessage = this._errorMessageService
                        .getErrorMessage(err2.message, this._errorOpeningDmn, { path: path + project.dmnPath });
                    observer.next({ type: FsResultType.ERROR, message: errorMessage });
                    observer.complete();
                    return;
                }
                observer.next({ type: FsResultType.OK, filepath: filepath, data: { xml: data2, project: project } });
                observer.complete();
            }));
        }));
    }

    public openOrCreateFile<T>(filename: string, defaultValue: T): Observable<FileSystemAccessResult<T>> {
        // const path = (!this._electronService.process.env.PORTABLE_EXECUTABLE_FILE) ?
        //    './' : this._electronService.process.env.PORTABLE_EXECUTABLE_FILE;
        return Observable.create(observer => {
            if (!this._filesystem.existsSync(filename)) {
                this._filesystem.writeFile(filename, JSON.stringify(defaultValue, null, 2), err => this.callback(() => {
                    if (isNull(err)) {
                        this.readFile<T>(filename, observer);
                    } else {
                        observer.next({ type: FsResultType.ERROR });
                    }
                }));
            } else {
                this.readFile<T>(filename, observer);
            }
        });
    }

    public getSaveLocation(dialogOptions: FileSaveDialogOptions): Observable<FileSystemAccessResult<void>> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        const saveOptions = <SaveDialogOptions>{
            filters: [{ name: dialogOptions.typeName, extensions: dialogOptions.extension }],
            title: dialogOptions.title,
            properties: []
        };

        return Observable.create(observer => {
            dialog.showSaveDialog(window, saveOptions).then((saveDialogReturnValue: SaveDialogReturnValue) => {
                const filename = saveDialogReturnValue.filePath;
                if (isNull(filename) || filename.length < 1) {
                    this.callback(() => observer.next({ type: FsResultType.NOTHING_SELECTED }));
                    return;
                }
                this.callback(() => observer.next({ type: FsResultType.OK, filepath: filename }));
            });
        });
    }

    public saveFile<T>(filename: string, content: T): Observable<FileSystemAccessResult<void>> {
        return this.saveTextToFile(filename, JSON.stringify(content, null, 2));
    }

    public saveTextToFile(filename: string, content: string) {
        return Observable.create(observer => {
            this._filesystem.writeFile(filename, content, err => this.callback(() => {
                if (isNull(err)) {
                    observer.next({ type: FsResultType.OK });
                    observer.complete();
                } else {
                    observer.next({ type: FsResultType.ERROR });
                    observer.complete();
                }
            }));
        });
    }

    public saveProject(xml: string, project: DmnProject, chooseLocation = false):
        Observable<FileSystemAccessResult<void>> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        const saveOptions = <SaveDialogOptions>{
            filters: [{ name: 'DMN Projekt Files', extensions: ['dmnapp.json'] }],
            title: 'DMN Projekt speichern',
            properties: []
        };

        return Observable.create(observer => {
            if (!this._currentPath || chooseLocation) {
                dialog.showSaveDialog(window, saveOptions).then((saveDialogReturnValue: SaveDialogReturnValue) => {
                    const filename = saveDialogReturnValue.filePath;
                    if (isNull(filename) || filename.length < 1) {
                        observer.next({ type: FsResultType.NOTHING_SELECTED });
                        return;
                    }
                    this.writeFiles(filename, xml, project, observer);
                    this._eventService.publishEvent(
                        new BaseEvent(EventType.FOLDER_CHANGED, filename));
                });
                return;
            }
            this.writeFiles(this._currentPath, xml, project, observer);
        });
    }

    public importExistingDmn(): Observable<FileSystemAccessResult<string>> {
        const dialog = this._electronService.remote.dialog;
        const window = this._electronService.remote.getCurrentWindow();

        return Observable.create(observer => {
            dialog.showOpenDialog(window, this._openOptionsImportExistingDmn)
                .then((openDialogReturnValue: OpenDialogReturnValue) => {

                const fileNames = openDialogReturnValue.filePaths;
                if (isNull(fileNames) || fileNames.length < 1) {
                    observer.next({ type: FsResultType.NOTHING_SELECTED, message: this._errorMessageImporting });
                    observer.complete();
                    return;
                }

                const filename = fileNames[0];
                this._filesystem.readFile(filename, 'utf-8', (err, data) => this.callback(() => {
                    if (err) {
                        observer.next({ type: FsResultType.ERROR, message: this._errorMessageImporting });
                        observer.complete();
                        return;
                    }
                    observer.next({ type: FsResultType.OK, data: data });
                    observer.complete();
                }));

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

        this._filesystem.writeFile(filename, JSON.stringify(project, null, 2), err => this.callback(() => {
            if (isNull(err)) {

                this._filesystem.writeFile(targetPathDmn, xml, err2 => this.callback(() => {
                    if (isNull(err2)) {
                    } else {
                        observable.next({ type: FsResultType.ERROR, message: this._errorSavingDmn });
                        observable.complete();
                        return;
                    }
                    observable.next({ type: FsResultType.OK });
                    observable.complete();
                }));
            } else {
                observable.next({ type: FsResultType.ERROR, message: this._errorSavingProject });
                observable.complete();
                return;
            }
        }));
    }

    private readFile<T>(filename, observable: Observer<FileSystemAccessResult<T>>) {
        this._filesystem.readFile(filename, 'utf-8', (err, data) => this.callback(() => {
            if (err) {
                observable.next({ type: FsResultType.ERROR, message: this._errorMessageImporting });
                observable.complete();
                return;
            }
            observable.next({ type: FsResultType.OK, data: JSON.parse(data) });
            observable.complete();
        }));
    }

    private callback(func: () => void) {
        this._zone.run(func);
    }
}
