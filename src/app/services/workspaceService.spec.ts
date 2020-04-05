import { TestBed, async } from '@angular/core/testing';
import { WorkspaceService } from './workspaceService';
import { EventService } from './eventService';
import { GitService } from './gitService';
import { FileService } from './fileService';
import { of } from 'rxjs';
import { BaseEvent } from '../model/event/event';
import { EventType } from '../model/event/eventType';
import { WorkspaceFileModel } from '../model/workspaceFileModel';

const filename1 = 'hallo.dmnapp.json';
const filename2 = 'welt.dmnapp.json';
const filenames = [
    filename1,
    filename2,
];
const directoryPath = 'c:\\data';
const filePath1 = `${directoryPath}\\${filename1}`;
const filePath2 = `${directoryPath}\\${filename2}`;

describe('Workspace Service', () => {

    let cut: WorkspaceService;
    let eventService: EventService;
    let fileService: jasmine.SpyObj<FileService>;
    let gitService: jasmine.SpyObj<GitService>;

    beforeEach(async(() => {
        const fileServiceSpy = jasmine.createSpyObj('FileService', ['findFiles', 'getDirectory', 'getFilename']);
        const gitServiceSpy = jasmine.createSpyObj('GitService', ['openRepository']);

        TestBed.configureTestingModule({
            providers: [
                WorkspaceService,
                EventService,
                { provide: GitService, useValue: gitServiceSpy },
                { provide: FileService, useValue: fileServiceSpy },
            ]
        });

        cut = TestBed.inject(WorkspaceService);
        eventService = TestBed.inject(EventService);
        fileService = <any>TestBed.inject(FileService);
        gitService = <any>TestBed.inject(GitService);
    }));

    describe('Handling current folder', () => {

        it('should initialize filecache', async(() => {
            fileService.findFiles.and.returnValue(of(filenames));
            fileService.getDirectory.and.returnValue(directoryPath);

            eventService.publishEvent(new BaseEvent(EventType.FOLDER_CHANGED, null));

            cut.getCurrentFiles().subscribe(files => {
                expect(files).toContain(new WorkspaceFileModel(filename1, filePath1));
                expect(files).toContain(new WorkspaceFileModel(filename2, filePath2));
            });
        }));

        it('should call open repository on gitservice when folder changes', async(() => {
            fileService.findFiles.and.returnValue(of(filenames));
            fileService.getDirectory.and.returnValue(directoryPath);

            eventService.publishEvent(new BaseEvent(EventType.FOLDER_CHANGED, null));

            expect(gitService.openRepository).toHaveBeenCalledWith(directoryPath);
        }));

        it('should refresh folder contents', async(() => {
            fileService.findFiles.and.returnValue(of(filenames));
            fileService.getDirectory.and.returnValue(directoryPath);

            eventService.publishEvent(new BaseEvent(EventType.FOLDER_CHANGED, null));

            cut.getCurrentFiles().subscribe();
            cut.refresh();

            expect(fileService.findFiles).toHaveBeenCalledTimes(2);
        }));

        it('should refresh folder contents when refresh event is published', async(() => {
            fileService.findFiles.and.returnValue(of(filenames));
            fileService.getDirectory.and.returnValue(directoryPath);

            eventService.publishEvent(new BaseEvent(EventType.FOLDER_CHANGED, null));

            cut.getCurrentFiles().subscribe();

            eventService.publishEvent(new BaseEvent(EventType.REFRESH_WORKSPACE, null));

            expect(fileService.findFiles).toHaveBeenCalledTimes(2);
        }));
    });

    describe('Handling of current file', () => {

        it('should provide current file in workspace', async(() => {
            fileService.getFilename.and.returnValue(filename1);

            eventService.publishEvent(new BaseEvent(EventType.OPENED_FILE_CHANGED, filePath1));

            cut.getCurrentFile().subscribe(file =>
                expect(file).toEqual(new WorkspaceFileModel(filename1, filePath1)));
        }));
    });
});
