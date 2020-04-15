import { TestBed, async, tick, fakeAsync } from '@angular/core/testing';
import { ElectronService } from './electronService';
import { EventService } from './eventService';
import { ErrorMessageService } from './errorMessageService';
import { FileService } from './fileService';
import { FileSystemAccessResult, FsResultType } from '../model/fileSystemAccessResult';
import { OpenDialogReturnValue } from 'electron';
import { EventType } from '../model/event/eventType';
import { DmnProject } from '../model/project/dmnProject';
import { BaseEvent } from '../model/event/event';
import { FileSaveDialogOptions } from '../model/fileSaveDialogOptions';

let cut: FileService;
let eventService: EventService;
let errorMessageService: jasmine.SpyObj<ErrorMessageService>;
let electronService;
let fakeFs;
let fakeDialog: jasmine.SpyObj<Electron.Dialog>;

const fakeWindow = {bla: 'blubb'};

const aFileName = 'dmn.xml';
const aDirectoryPath = 'c:\\users\\david\\desktop\\gittest';

describe('FileService', () => {
    beforeEach(async(() => {
        const errorMessageServiceSpy = jasmine.createSpyObj('ErrorMessageService', ['getErrorMessage']);
        fakeFs = jasmine.createSpyObj('fs', ['readdir', 'lstatSync', 'readFile', 'writeFile', 'existsSync']);
        fakeDialog = jasmine.createSpyObj('Dialog', ['showOpenDialog', 'showSaveDialog']);
        electronService = {
            remote: {
                dialog: fakeDialog,
                getCurrentWindow() {
                    return fakeWindow;
                }
            }
        };

        const require = (_) => fakeFs;
        window.require = <any>require;

        TestBed.configureTestingModule({
            providers: [
                FileService,
                EventService,
                { provide: ElectronService, useValue: electronService },
                { provide: ErrorMessageService, useValue: errorMessageServiceSpy },
            ]
        });

        cut = TestBed.inject(FileService);
        eventService = TestBed.inject(EventService);
        errorMessageService = <any>TestBed.inject(ErrorMessageService);
    }));

    describe('Initialize', () => {

        it('should be initialized after startup', async(() => {

            expect(cut).not.toBeNull();
            expect(cut['_filesystem']).not.toBeNull();
        }));
    });

    describe('findFiles', () => {

        it('should read a directory and return an obseravble of path strings from fs', fakeAsync(() => {

            const aFolderPath = 'c:\\';

            const filename1 = 'hallo.txt';
            const filename2 = 'text.dmn';

            fakeFs.readdir.and.callFake((_, param2) => {
                param2(null, [filename1, filename2]);
            });

            let filePaths: string[];
            cut.findFiles(aFolderPath).subscribe(result => filePaths = result);

            tick(1);

            expect(filePaths.length).toBe(2);
            expect(filePaths[0]).toEqual(filename1);
            expect(filePaths[1]).toEqual(filename2);
        }));

        it('should return an empty array when find files is called with falsy url parameter', fakeAsync(() => {

            const aFolderPath = '';

            let filePaths: string[];
            cut.findFiles(aFolderPath).subscribe(result => filePaths = result);

            tick(1);

            expect(filePaths.length).toBe(0);
            expect(fakeFs.readdir).toHaveBeenCalledTimes(0);
        }));

        it('should return an empty array when find files is called with null as url parameter', fakeAsync(() => {

            const aFolderPath = null;

            let filePaths: string[];
            cut.findFiles(aFolderPath).subscribe(result => filePaths = result);

            tick(1);

            expect(filePaths.length).toBe(0);
            expect(fakeFs.readdir).toHaveBeenCalledTimes(0);
        }));
    });

    describe('getDirectory', () => {

        it('should provide the directory of a given filepath', fakeAsync(() => {

            fakeFs.lstatSync.and.returnValue({ isDirectory() { return false; }});

            const directory = cut.getDirectory(`${aDirectoryPath}\\${aFileName}`);

            expect(directory).toEqual(aDirectoryPath);
        }));

        it('should provide just the given path if it is already a directory', fakeAsync(() => {

            fakeFs.lstatSync.and.returnValue({ isDirectory() { return true; }});

            const directory = cut.getDirectory(`${aDirectoryPath}`);

            expect(directory).toEqual(aDirectoryPath);
        }));

        it('should provide null if given path is falsy when requesting a directory', fakeAsync(() => {

            const aEmptyDirectoryPath = '';

            const directory = cut.getDirectory(`${aEmptyDirectoryPath}`);

            expect(directory).toBeNull();
            expect(fakeFs.lstatSync).toHaveBeenCalledTimes(0);
        }));
    });

    describe('getFilename', () => {

        it('should give back the filename of a given path with extension', fakeAsync(() => {

            const filename = cut.getFilename(`${aDirectoryPath}\\${aFileName}`);

            const expectedFilename = `\\${aFileName}`;
            expect(filename).toEqual(expectedFilename);
        }));
    });

    describe('getCurrentFilename', () => {

        it('should provide the current filename without path', fakeAsync(() => {

            cut['_currentPath'] = `${aDirectoryPath}\\${aFileName}`;
            const filename = cut.getCurrentFilename();

            const expectedFilename = `\\${aFileName}`;
            expect(filename).toEqual(expectedFilename);
        }));
    });

    describe('getUserDataPath', () => {

        it('should provide user data path', fakeAsync(() => {

            const userDataPathExpected = 'c:\\david\\data';
            const appFake = jasmine.createSpyObj('app', ['getPath']);
            appFake.getPath.and.returnValue(userDataPathExpected);
            electronService.remote.app = appFake;

            const userDataPath = cut.getUserDataPath();
            expect(userDataPath).toEqual(userDataPathExpected);
            expect(appFake.getPath).toHaveBeenCalledWith('userData');
        }));
    });

    describe('importExistingDmn', () => {

        it('should open an dialog to choose existing dmn file', fakeAsync(() => {

            const chosenFilepath = 'c:\\david\\test.dmn';
            const dmnXmlData = '<dmnxml>';
            const openDialogReturnValue: OpenDialogReturnValue = {
                canceled: false,
                filePaths: [chosenFilepath]
            };
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve(openDialogReturnValue));
            fakeFs.readFile.and.callFake((_, __, callback: (err, data) => void) => {
                callback(null, dmnXmlData);
            });

            let fileSystemResult: FileSystemAccessResult<string>;
            cut.importExistingDmn().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fileSystemResult.data).toEqual(dmnXmlData);
            expect(fakeDialog.showOpenDialog).toHaveBeenCalledWith(fakeWindow, cut['_openOptionsImportExistingDmn']);
            expect(fakeFs.readFile).toHaveBeenCalledWith(chosenFilepath, 'utf-8', jasmine.any(Function));
        }));

        it('should return correct result when no file is selected', fakeAsync(() => {

            const openDialogReturnValue: OpenDialogReturnValue = {
                canceled: false,
                filePaths: []
            };
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve(openDialogReturnValue));

            let fileSystemResult: FileSystemAccessResult<string>;
            cut.importExistingDmn().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.NOTHING_SELECTED);
            expect(fileSystemResult.message).toBe(cut['_errorMessageImporting']);
            expect(fakeDialog.showOpenDialog).toHaveBeenCalledWith(fakeWindow, cut['_openOptionsImportExistingDmn']);
            expect(fakeFs.readFile).toHaveBeenCalledTimes(0);
        }));

        it('should pass back an error if an error occurs when reading the file', fakeAsync(() => {

            const chosenFilepath = 'c:\\david\\test.dmn';
            const openDialogReturnValue: OpenDialogReturnValue = {
                canceled: false,
                filePaths: [chosenFilepath]
            };
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve(openDialogReturnValue));
            fakeFs.readFile.and.callFake((_, __, callback: (err, data) => void) => {
                callback('a error', null);
            });

            let fileSystemResult: FileSystemAccessResult<string>;
            cut.importExistingDmn().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.ERROR);
            expect(fileSystemResult.message).toBe(cut['_errorMessageImporting']);
            expect(fakeDialog.showOpenDialog).toHaveBeenCalledWith(fakeWindow, cut['_openOptionsImportExistingDmn']);
            expect(fakeFs.readFile).toHaveBeenCalledTimes(1);
            expect(fakeFs.readFile).toHaveBeenCalledWith(chosenFilepath, 'utf-8', jasmine.any(Function));
        }));
    });

    describe('openFolder', () => {

        it('should open a folder potentially containing a project', fakeAsync(() => {

            const chosenFilepath = 'c:\\david';
            const openDialogReturnValue: OpenDialogReturnValue = {
                canceled: false,
                filePaths: [chosenFilepath]
            };
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve(openDialogReturnValue));

            let folderChangedEvent;
            eventService.getEvent(ev => ev.type === EventType.FOLDER_CHANGED).subscribe(ev => folderChangedEvent = ev);
            let fileSystemResult: FileSystemAccessResult<string>;
            cut.openFolder().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(folderChangedEvent).not.toBeNull();
            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fileSystemResult.filepath).toEqual(chosenFilepath);
            expect(fakeDialog.showOpenDialog).toHaveBeenCalledWith(fakeWindow, cut['_openOptionsChooseProjectFolder']);
        }));

        it('should emit no event when nothing is selected while opening project folder', fakeAsync(() => {

            const openDialogReturnValue: OpenDialogReturnValue = {
                canceled: false,
                filePaths: []
            };
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve(openDialogReturnValue));

            let folderChangedEvent;
            eventService.getEvent(ev => ev.type === EventType.FOLDER_CHANGED).subscribe(ev => folderChangedEvent = ev);
            let fileSystemResult: FileSystemAccessResult<string>;
            cut.openFolder().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(folderChangedEvent).toBeUndefined();
            expect(fileSystemResult.type).toBe(FsResultType.NOTHING_SELECTED);
        }));
    });

    describe('chooseFolder', () => {

        it('should emit no event and pass back filepath when just choosing a directory', fakeAsync(() => {

            const chosenFilepath = 'c:\\david';
            const openDialogReturnValue: OpenDialogReturnValue = {
                canceled: false,
                filePaths: [chosenFilepath]
            };
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve(openDialogReturnValue));

            let folderChangedEvent;
            eventService.getEvent(ev => ev.type === EventType.FOLDER_CHANGED).subscribe(ev => folderChangedEvent = ev);
            let fileSystemResult: FileSystemAccessResult<string>;
            cut.chooseFolder().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(folderChangedEvent).toBeUndefined();
            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fileSystemResult.filepath).toEqual(chosenFilepath);
            expect(fakeDialog.showOpenDialog).toHaveBeenCalledWith(fakeWindow, cut['_openOptionsChooseFolderOnly']);
        }));

        it('should emit no event when nothing is selected while choosing a directory', fakeAsync(() => {

            const openDialogReturnValue: OpenDialogReturnValue = {
                canceled: false,
                filePaths: []
            };
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve(openDialogReturnValue));

            let folderChangedEvent;
            eventService.getEvent(ev => ev.type === EventType.FOLDER_CHANGED).subscribe(ev => folderChangedEvent = ev);
            let fileSystemResult: FileSystemAccessResult<string>;
            cut.chooseFolder().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(folderChangedEvent).toBeUndefined();
            expect(fileSystemResult.type).toBe(FsResultType.NOTHING_SELECTED);
        }));
    });

    describe('openProject', () => {

        const chosenFilename = 'test.dmnapp.json';
        const chosenPath = 'c:\\david';
        const chosenFilepath = `${chosenPath}\\${chosenFilename}`;
        const chosenDmnFilepath = `${chosenPath}\\test.dmn`;
        const dmnXmlData = '<dmnxml>';
        const projectfileData = <DmnProject>{dmnPath: 'test.dmn', definitions: null, plugins: null, testsuite: null};

        beforeEach(async(() => {
            fakeFs.lstatSync.and.returnValue({ isDirectory() { return false; }});
        }));

        it('should read project file and corresponding dmn file for given path', fakeAsync(() => {

            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((filepath, callbackOrEncoding: (err, data) => void, callback: (err, data) => void) => {
                if (filepath === chosenFilepath) {
                    callbackOrEncoding(null, JSON.stringify(projectfileData));
                    return;
                }
                callback(null, dmnXmlData);
            });

            let fileSystemResult: FileSystemAccessResult<{xml?: string, project?: DmnProject}>;
            cut.openProject(chosenFilepath).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fileSystemResult.data.project).toEqual(projectfileData);
            expect(fileSystemResult.data.xml).toEqual(dmnXmlData);
            expect(cut['_currentPath']).toBe(chosenFilepath);
            expect(fakeFs.readFile).toHaveBeenCalledWith(chosenFilepath, jasmine.any(Function));
            expect(fakeFs.readFile).toHaveBeenCalledWith(chosenDmnFilepath, 'utf-8', jasmine.any(Function));
        }));

        it('should publish folder change and file change event', fakeAsync(() => {

            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((filepath, callbackOrEncoding: (err, data) => void, callback: (err, data) => void) => {
                if (filepath === chosenFilepath) {
                    callbackOrEncoding(null, JSON.stringify(projectfileData));
                    return;
                }
                callback(null, dmnXmlData);
            });

            let folderChangeEvent: BaseEvent<string> = null;
            eventService.getEvent(ev => ev.type === EventType.FOLDER_CHANGED).subscribe(ev => folderChangeEvent = ev);

            let fileChangeEvent: BaseEvent<string> = null;
            eventService.getEvent(ev => ev.type === EventType.OPENED_FILE_CHANGED).subscribe(ev => fileChangeEvent = ev);

            let fileSystemResult: FileSystemAccessResult<{xml?: string, project?: DmnProject}>;
            cut.openProject(chosenFilepath).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(folderChangeEvent).not.toBeNull();
            expect(fileChangeEvent).not.toBeNull();
            expect(folderChangeEvent.data).toEqual(chosenPath);
            expect(fileChangeEvent.data).toEqual(chosenFilepath);
        }));

        it('should should pass back meaningful error when reading project file failes', fakeAsync(() => {

            const unknownFsError = 'a simple error';

            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((filepath, callbackOrEncoding: (err, data) => void, callback: (err, data) => void) => {
                if (filepath === chosenFilepath) {
                    callbackOrEncoding({message: unknownFsError}, null);
                    return;
                }
            });

            errorMessageService.getErrorMessage.and.callFake((_, defaultMessage) => defaultMessage);

            let fileSystemResult: FileSystemAccessResult<{xml?: string, project?: DmnProject}>;
            cut.openProject(chosenFilepath).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.ERROR);
            expect(fileSystemResult.message).toBe(cut['_errorOpeningProject']);
            expect(fakeFs.readFile).toHaveBeenCalledWith(chosenFilepath, jasmine.any(Function));
            expect(fakeFs.readFile).toHaveBeenCalledTimes(1);
            expect(errorMessageService.getErrorMessage)
                .toHaveBeenCalledWith(unknownFsError, cut['_errorOpeningProject'], jasmine.any(Object));
        }));

        it('should pass back meaningful error when reading dmn file failes', fakeAsync(() => {

            const unknownFsError = 'a simple error';

            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((filepath, callbackOrEncoding: (err, data) => void, callback: (err, data) => void) => {
                if (filepath === chosenDmnFilepath) {
                    callback({message: unknownFsError}, null);
                    return;
                }
                callbackOrEncoding(null, JSON.stringify(projectfileData));
            });

            errorMessageService.getErrorMessage.and.callFake((_, defaultMessage) => defaultMessage);

            let fileSystemResult: FileSystemAccessResult<{xml?: string, project?: DmnProject}>;
            cut.openProject(chosenFilepath).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.ERROR);
            expect(fileSystemResult.message).toBe(cut['_errorOpeningDmn']);
            expect(fakeFs.readFile).toHaveBeenCalledWith(chosenFilepath, jasmine.any(Function));
            expect(fakeFs.readFile).toHaveBeenCalledTimes(2);
            expect(errorMessageService.getErrorMessage)
                .toHaveBeenCalledWith(unknownFsError, cut['_errorOpeningDmn'], jasmine.any(Object));
        }));

        it('should pass back not found error with meaningful message when given file dows not exist', fakeAsync(() => {

            fakeFs.existsSync.and.returnValue(false);

            let fileSystemResult: FileSystemAccessResult<{xml?: string, project?: DmnProject}>;
            cut.openProject(chosenFilepath).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.NOT_FOUND);
            expect(fileSystemResult.message).toBe(`Die Datei ${chosenFilepath} kann nicht gefunden werden.`);
        }));

        it('should read project file and corresponding dmn file for a new chosen path', fakeAsync(() => {

            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((filepath, callbackOrEncoding: (err, data) => void, callback: (err, data) => void) => {
                if (filepath === chosenFilepath) {
                    callbackOrEncoding(null, JSON.stringify(projectfileData));
                    return;
                }
                callback(null, dmnXmlData);
            });
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve({ filePaths: [chosenFilepath] }));

            let fileSystemResult: FileSystemAccessResult<{xml?: string, project?: DmnProject}>;
            cut.openProject().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fileSystemResult.data.project).toEqual(projectfileData);
            expect(fileSystemResult.data.xml).toEqual(dmnXmlData);
            expect(cut['_currentPath']).toBe(chosenFilepath);
            expect(fakeFs.readFile).toHaveBeenCalledWith(chosenFilepath, jasmine.any(Function));
            expect(fakeFs.readFile).toHaveBeenCalledWith(chosenDmnFilepath, 'utf-8', jasmine.any(Function));
        }));

        it('should publish folder change and file change event when path is chosen via dialog', fakeAsync(() => {

            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((filepath, callbackOrEncoding: (err, data) => void, callback: (err, data) => void) => {
                if (filepath === chosenFilepath) {
                    callbackOrEncoding(null, JSON.stringify(projectfileData));
                    return;
                }
                callback(null, dmnXmlData);
            });
            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve({ filePaths: [chosenFilepath] }));

            let folderChangeEvent: BaseEvent<string> = null;
            eventService.getEvent(ev => ev.type === EventType.FOLDER_CHANGED).subscribe(ev => folderChangeEvent = ev);

            let fileChangeEvent: BaseEvent<string> = null;
            eventService.getEvent(ev => ev.type === EventType.OPENED_FILE_CHANGED).subscribe(ev => fileChangeEvent = ev);

            let fileSystemResult: FileSystemAccessResult<{xml?: string, project?: DmnProject}>;
            cut.openProject().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(folderChangeEvent).not.toBeNull();
            expect(fileChangeEvent).not.toBeNull();
            expect(folderChangeEvent.data).toEqual(chosenPath);
            expect(fileChangeEvent.data).toEqual(chosenFilepath);
        }));

        it('should not pass back OK if no file is chosen in opren dialog', fakeAsync(() => {

            fakeDialog.showOpenDialog.and.returnValue(Promise.resolve({ filePaths: [] }));

            let fileSystemResult: FileSystemAccessResult<{xml?: string, project?: DmnProject}>;
            cut.openProject().subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).not.toBe(FsResultType.OK);
        }));
    });

    describe('getSaveLocation', () => {

        it('should return a location chosen by the user via dialog', fakeAsync(() => {

            const aFilePath = 'c:\\david\\test.txt';
            const dialogOptions = new FileSaveDialogOptions(['csv'], 'CSV Datei', 'CSV Export speichern');
            fakeDialog.showSaveDialog.and.returnValue(Promise.resolve({ filePath: aFilePath }));

            let getSaveLocationResult: FileSystemAccessResult<void> = null;
            cut.getSaveLocation(dialogOptions).subscribe(result => getSaveLocationResult = result);

            tick(1);

            expect(getSaveLocationResult).not.toBeNull();
            expect(getSaveLocationResult.type).toBe(FsResultType.OK);
            expect(getSaveLocationResult.filepath).toEqual(aFilePath);
        }));

        it('should return nothing selected if dialog has no filepath set', fakeAsync(() => {

            const aFilePath = 'c:\\david\\test.txt';
            const dialogOptions = new FileSaveDialogOptions(['csv'], 'CSV Datei', 'CSV Export speichern');
            fakeDialog.showSaveDialog.and.returnValue(Promise.resolve({ filePath: null }));

            let getSaveLocationResult: FileSystemAccessResult<void> = null;
            cut.getSaveLocation(dialogOptions).subscribe(result => getSaveLocationResult = result);

            tick(1);

            expect(getSaveLocationResult).not.toBeNull();
            expect(getSaveLocationResult.type).toBe(FsResultType.NOTHING_SELECTED);
        }));
    });

    describe('ResetCurrentPath', () => {
        it('should reset the loaded current path', fakeAsync(() => {
            cut['_currentPath'] = 'anypath';
            expect(cut['_currentPath']).not.toBeNull();
            cut.resetCurrentPath();
            expect(cut['_currentPath']).toBeNull();
        }));
    });

    describe('OpenOrCreate', () => {

        it('should open a file if it exists', fakeAsync(() => {

            const filepath = 'c:\\david\\aFile.txt';
            const filecontent = { test: 'testtesttest' };
            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((_, __, callback: (err, data) => void) => {
                callback(null, JSON.stringify(filecontent));
            });

            let fileSystemResult: FileSystemAccessResult<{test?: string}>;
            cut.openOrCreateFile(filepath, {test: 'aaa'}).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fileSystemResult.data.test).toBe(filecontent.test);
            expect(fakeFs.readFile).toHaveBeenCalledWith(filepath, 'utf-8', jasmine.any(Function));
            expect(fakeFs.readFile).toHaveBeenCalledTimes(1);
        }));

        it('should open or create a file dependent to its existence', fakeAsync(() => {

            const filepath = 'c:\\david\\aFile.txt';
            const filecontent = { test: 'testtesttest' };
            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((_, __, callback: (err, data) => void) => {
                callback(null, JSON.stringify(filecontent));
            });

            let fileSystemResult: FileSystemAccessResult<{test?: string}>;
            cut.openOrCreateFile(filepath, {test: 'aaa'}).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fileSystemResult.data.test).toBe(filecontent.test);
            expect(fakeFs.readFile).toHaveBeenCalledWith(filepath, 'utf-8', jasmine.any(Function));
            expect(fakeFs.readFile).toHaveBeenCalledTimes(1);
        }));

        it('should craete a file and read it if it does not exist', fakeAsync(() => {

            const filepath = 'c:\\david\\aFile.txt';
            const filecontent = { test: 'testtesttest' };
            const filecontentFormatted =
`{
  "test": "aaa"
}`;
            fakeFs.existsSync.and.returnValue(false);
            fakeFs.readFile.and.callFake((_, __, callback: (err, data) => void) => {
                callback(null, JSON.stringify(filecontent));
            });
            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback(null);
            });

            let fileSystemResult: FileSystemAccessResult<{test?: string}>;
            cut.openOrCreateFile(filepath, {test: 'aaa'}).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fileSystemResult.data.test).toBe(filecontent.test);
            expect(fakeFs.readFile).toHaveBeenCalledWith(filepath, 'utf-8', jasmine.any(Function));
            expect(fakeFs.readFile).toHaveBeenCalledTimes(1);
            expect(fakeFs.writeFile).toHaveBeenCalledWith(filepath, filecontentFormatted, jasmine.any(Function));
        }));

        it('should return an error if reading the file failes', fakeAsync(() => {

            const filepath = 'c:\\david\\aFile.txt';
            fakeFs.existsSync.and.returnValue(true);
            fakeFs.readFile.and.callFake((_, __, callback: (err, data) => void) => {
                callback('a error', null);
            });

            let fileSystemResult: FileSystemAccessResult<{test?: string}>;
            cut.openOrCreateFile(filepath, {test: 'aaa'}).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.ERROR);
            expect(fileSystemResult.message).toBe(cut['_errorMessageImporting']);
            expect(fakeFs.readFile).toHaveBeenCalledWith(filepath, 'utf-8', jasmine.any(Function));
            expect(fakeFs.readFile).toHaveBeenCalledTimes(1);
        }));

        it('should return an error if writing the file failes', fakeAsync(() => {

            const filepath = 'c:\\david\\aFile.txt';
            fakeFs.existsSync.and.returnValue(false);
            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback('an');
            });

            let fileSystemResult: FileSystemAccessResult<{test?: string}>;
            cut.openOrCreateFile(filepath, {test: 'aaa'}).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.ERROR);
            expect(fileSystemResult.message).toBeUndefined();
            expect(fakeFs.writeFile).toHaveBeenCalledTimes(1);
            expect(fakeFs.readFile).toHaveBeenCalledTimes(0);
        }));
    });

    describe('saveTextToTextFile', () => {

        it('should write a file to a given location', fakeAsync(() => {

            const filename = 'c:\\david\\text.txt';
            const content = 'some content';

            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback(null);
            });

            let fileSystemResult: FileSystemAccessResult<void>;
            cut.saveTextToFile(filename, content).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fakeFs.writeFile).toHaveBeenCalledWith(filename, content, jasmine.any(Function));
        }));

        it('should return an error when writing to file failes', fakeAsync(() => {

            const filename = 'c:\\david\\text.txt';
            const content = 'some content';

            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback('an error');
            });

            let fileSystemResult: FileSystemAccessResult<void>;
            cut.saveTextToFile(filename, content).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.ERROR);
        }));
    });

    describe('saveFile', () => {

        it('should serialize content and save it to a file', fakeAsync(() => {

            const filename = 'c:\\david\\text.txt';
            const content = { hallo: 'welt', 'attribut': 2 };

            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback(null);
            });

            let fileSystemResult: FileSystemAccessResult<void>;
            cut.saveFile(filename, content).subscribe(result => fileSystemResult = result);

            tick(1);

            expect(fileSystemResult.type).toBe(FsResultType.OK);
            expect(fakeFs.writeFile).toHaveBeenCalledWith(filename,
`{
  "hallo": "welt",
  "attribut": 2
}`
                , jasmine.any(Function));
        }));
    });

    describe('saveProject', () => {

        it('should save the files if current path is set and no saveAs is requested without prompt', fakeAsync(() => {

            const filename = 'test.dmnapp.json';
            const dmnFilename = 'test.dmn';
            const path = 'c:\\users\\david\\';
            const currentPath = `${path}${filename}`;
            const dmnPath = `${path}${dmnFilename}`;
            const dmnXml = '<dmn-xml>';
            const project: DmnProject = {dmnPath: dmnFilename, definitions: null, plugins: null, testsuite: null};
            const projectJson =
`{
  "dmnPath": "${dmnFilename}",
  "definitions": null,
  "plugins": null,
  "testsuite": null
}`;

            cut['_currentPath'] = currentPath;

            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback(null);
            });

            let result: FileSystemAccessResult<void>;
            cut.saveProject(dmnXml, project, false).subscribe(res => result = res);

            tick(1);

            expect(result.type).toBe(FsResultType.OK);
            expect(fakeDialog.showSaveDialog).not.toHaveBeenCalled();
            expect(fakeFs.writeFile).toHaveBeenCalledWith(dmnPath, dmnXml, jasmine.any(Function));
            expect(fakeFs.writeFile).toHaveBeenCalledWith(currentPath, projectJson, jasmine.any(Function));
        }));

        it('should prompt for location and  save the files if current path is not set', fakeAsync(() => {

            const filename = 'test.dmnapp.json';
            const dmnFilename = 'test.dmn';
            const path = 'c:\\users\\david\\';
            const currentPath = `${path}${filename}`;
            const dmnPath = `${path}${dmnFilename}`;
            const dmnXml = '<dmn-xml>';
            const project: DmnProject = {dmnPath: dmnFilename, definitions: null, plugins: null, testsuite: null};

            fakeDialog.showSaveDialog.and.returnValue(Promise.resolve({filePath: currentPath}));

            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback(null);
            });

            let result: FileSystemAccessResult<void>;
            cut.saveProject(dmnXml, project, false).subscribe(res => result = res);

            tick(1);

            expect(result.type).toBe(FsResultType.OK);
            expect(fakeDialog.showSaveDialog).toHaveBeenCalledTimes(1);
            expect(fakeFs.writeFile).toHaveBeenCalledWith(dmnPath, dmnXml, jasmine.any(Function));
            expect(fakeFs.writeFile).toHaveBeenCalledWith(currentPath, jasmine.any(String), jasmine.any(Function));
        }));

        it('should prompt for location and save the files if saveAs is requested explicit', fakeAsync(() => {

            const filename = 'test.dmnapp.json';
            const dmnFilename = 'test.dmn';
            const path = 'c:\\users\\david\\';
            const otherPath = 'c:\\xx\\yy\\';
            const currentPath = `${path}${filename}`;
            const nextPath = `${otherPath}${filename}`;
            const dmnPath = `${otherPath}${dmnFilename}`;
            const dmnXml = '<dmn-xml>';
            const project: DmnProject = {dmnPath: dmnFilename, definitions: null, plugins: null, testsuite: null};

            fakeDialog.showSaveDialog.and.returnValue(Promise.resolve({filePath: nextPath}));

            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback(null);
            });

            cut['_currentPath'] = currentPath;
            let result: FileSystemAccessResult<void>;
            cut.saveProject(dmnXml, project, true).subscribe(res => result = res);

            tick(1);

            expect(result.type).toBe(FsResultType.OK);
            expect(fakeDialog.showSaveDialog).toHaveBeenCalledTimes(1);
            expect(fakeFs.writeFile).toHaveBeenCalledWith(dmnPath, dmnXml, jasmine.any(Function));
            expect(fakeFs.writeFile).toHaveBeenCalledWith(nextPath, jasmine.any(String), jasmine.any(Function));
        }));

        it('should emit folder change event when a new location is chosen', fakeAsync(() => {

            const filename = 'test.dmnapp.json';
            const dmnFilename = 'test.dmn';
            const otherPath = 'c:\\xx\\yy\\';
            const nextPath = `${otherPath}${filename}`;
            const dmnXml = '<dmn-xml>';
            const project: DmnProject = {dmnPath: dmnFilename, definitions: null, plugins: null, testsuite: null};

            fakeDialog.showSaveDialog.and.returnValue(Promise.resolve({filePath: nextPath}));

            fakeFs.writeFile.and.callFake((_, __, callback: (error) => void) => {
                callback(null);
            });

            let folderChangeEvent: BaseEvent<string> = null;
            eventService.getEvent(ev => ev.type === EventType.FOLDER_CHANGED).subscribe(ev => folderChangeEvent = ev);

            let result: FileSystemAccessResult<void>;
            cut.saveProject(dmnXml, project, true).subscribe(res => result = res);

            tick(1);

            expect(result.type).toBe(FsResultType.OK);
            expect(folderChangeEvent).not.toBeNull();
            expect(folderChangeEvent.data).toEqual(nextPath);
        }));
    });
});
