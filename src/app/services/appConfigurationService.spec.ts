import { TestBed, async } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AppConfigurationService } from './appConfigurationService';
import { FsResultType } from '../model/fileSystemAccessResult';
import { AppConfig } from '../model/appConfiguration/appConfig';

export class MockFileService {
    public openOrCreateFile() {}
    public saveFile() { return of(null); }
    public getUserDataPath(): string { return 'any'; }
}

describe('AppConfiguration Service', () => {
    beforeEach(async(() => {

        TestBed.configureTestingModule({
        }).compileComponents();
    }));

    describe('initialize', () => {

        it('should try to create a config file on initialization', async(() => {

            const mockFileService = <any>new MockFileService();

            const config = {mostRecent: [], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};
            const returnValue = {data: config, type: FsResultType.OK};
            spyOn(mockFileService, 'openOrCreateFile').and.returnValue(of(returnValue));

            const cut = new AppConfigurationService(mockFileService);
            expect(mockFileService.openOrCreateFile).toHaveBeenCalledTimes(1);
            expect(cut).not.toBeNull();
            expect(cut['_currentConfiguration']).toEqual(config);
        }));
    });

    describe('configuration handling', () => {

        it('should ignore filesystem errors and keep last configuration', async(() => {
            const mockFileService = <any>new MockFileService();

            const config = {mostRecent: [], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};
            const returnValue = {data: config, type: FsResultType.OK};
            const resultSubject = new BehaviorSubject(returnValue);
            spyOn(mockFileService, 'openOrCreateFile').and.returnValue(resultSubject);

            const cut = new AppConfigurationService(mockFileService);

            resultSubject.next({type: FsResultType.ERROR, data: null});

            expect(cut['_currentConfiguration']).toEqual(config);
        }));

        it('should take every new configuration pushed by filesystem service', async(() => {
            const mockFileService = <any>new MockFileService();

            const config = {mostRecent: [], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};
            const configSecond = <AppConfig>{mostRecent: [{name: 'x'}], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};

            const returnValue = {data: <AppConfig>config, type: FsResultType.OK};
            const resultSubject = new BehaviorSubject(returnValue);
            spyOn(mockFileService, 'openOrCreateFile').and.returnValue(resultSubject);

            const cut = new AppConfigurationService(mockFileService);

            resultSubject.next({type: FsResultType.OK, data: configSecond});

            expect(cut['_currentConfiguration']).toEqual(configSecond);
        }));
    });

    describe('Most recent files', () => {
        it('should publish most recent files', async(() => {
            const mockFileService = <any>new MockFileService();

            const mostRecent1 = {name: '1', path: 'a'};
            const mostRecent2 = {name: '2', path: 'b'};
            const config = {mostRecent: [mostRecent1, mostRecent2], simulatorBaseUrl: ''};
            const returnValue = {data: config, type: FsResultType.OK};
            const resultSubject = new BehaviorSubject(returnValue);

            spyOn(mockFileService, 'openOrCreateFile').and.returnValue(resultSubject);

            const cut = new AppConfigurationService(mockFileService);

            cut.getMostRecentFiles().subscribe(res => {
                expect(res.length).toBe(2);
                expect(res.find(el => el.name === '1')).not.toBeNull();
                expect(res.find(el => el.name === '2')).not.toBeNull();
            });
        }));

        it('should have a fix config filename', async(() => {

            expect(AppConfigurationService['_configFilename']).toEqual('.dmnmgr.config.json');
        }));

        it('should sort in a new recent file on top', async(() => {
            const mockFileService = <any>new MockFileService();

            const mostRecent1 = {name: '1', path: 'a'};
            const mostRecent2 = {name: '2', path: 'b'};
            const config = {mostRecent: [mostRecent1, mostRecent2]};
            const returnValue = {data: config, type: FsResultType.OK};
            const resultSubject = new BehaviorSubject(returnValue);

            spyOn(mockFileService, 'openOrCreateFile').and.returnValue(resultSubject);

            const cut = new AppConfigurationService(mockFileService);

            const THIRD_PATH = 'c\\x';
            cut.addMostRecentFile(THIRD_PATH);

            cut.getMostRecentFiles().subscribe(res => {
                expect(res.length).toBe(3);
                expect(res[0].path).toEqual(THIRD_PATH);
            });
        }));

        it('should sort an existing recent file to top', async(() => {
            const mockFileService = <any>new MockFileService();

            const EXISTING_PATH = 'b\\t';

            const mostRecent1 = {name: '1', path: 'a\\x'};
            const mostRecent2 = {name: '2', path: EXISTING_PATH};
            const config = {mostRecent: [mostRecent1, mostRecent2]};
            const returnValue = {data: config, type: FsResultType.OK};
            const resultSubject = new BehaviorSubject(returnValue);

            spyOn(mockFileService, 'openOrCreateFile').and.returnValue(resultSubject);

            const cut = new AppConfigurationService(mockFileService);

            cut.getMostRecentFiles().pipe( take(1) ).subscribe(res => {
                expect(res.length).toBe(2);
                expect(res[1].path).toEqual(EXISTING_PATH);
            });

            cut.addMostRecentFile(EXISTING_PATH);

            cut.getMostRecentFiles().pipe( take(1) ).subscribe(res => {
                expect(res.length).toBe(2);
                expect(res[0].path).toEqual(EXISTING_PATH);
            });
        }));

        it('should remove the eleventh item', async(() => {
            const mockFileService = <any>new MockFileService();

            const SECOND_LAST_PATH = 'a\\i';

            const mostRecent1 = {name: '1', path: 'a\\a'};
            const mostRecent2 = {name: '2', path: 'a\\b'};
            const mostRecent3 = {name: '2', path: 'a\\c'};
            const mostRecent4 = {name: '2', path: 'a\\d'};
            const mostRecent5 = {name: '2', path: 'a\\e'};
            const mostRecent6 = {name: '2', path: 'a\\f'};
            const mostRecent7 = {name: '2', path: 'a\\g'};
            const mostRecent8 = {name: '2', path: 'a\\h'};
            const mostRecent9 = {name: '2', path: SECOND_LAST_PATH};
            const mostRecent10 = {name: '2', path: 'a\\j'};

            const config = {mostRecent: [mostRecent1, mostRecent2, mostRecent3, mostRecent4,
                mostRecent5, mostRecent6, mostRecent7, mostRecent8, mostRecent9, mostRecent10]};
            const returnValue = {data: config, type: FsResultType.OK};
            const resultSubject = new BehaviorSubject(returnValue);

            spyOn(mockFileService, 'openOrCreateFile').and.returnValue(resultSubject);

            const cut = new AppConfigurationService(mockFileService);

            cut.getMostRecentFiles().pipe( take(1) ).subscribe(res => {
                expect(res.length).toBe(10);
            });

            const NEW_PATH = 'a\\k';
            cut.addMostRecentFile(NEW_PATH);

            cut.getMostRecentFiles().pipe( take(1) ).subscribe(res => {
                expect(res.length).toBe(10);
                expect(res[0].path).toEqual(NEW_PATH);
                expect(res[9].path).toEqual(SECOND_LAST_PATH);
            });
        }));

        it('should remove an equal item over the last item when having more than eleven items', async(() => {
            const mockFileService = <any>new MockFileService();

            const LAST_PATH = 'a\\j';

            const mostRecent1 = {name: '1', path: 'a\\a'};
            const mostRecent2 = {name: '2', path: 'a\\b'};
            const mostRecent3 = {name: '2', path: 'a\\c'};
            const mostRecent4 = {name: '2', path: 'a\\d'};
            const mostRecent5 = {name: '2', path: 'a\\e'};
            const mostRecent6 = {name: '2', path: 'a\\f'};
            const mostRecent7 = {name: '2', path: 'a\\g'};
            const mostRecent8 = {name: '2', path: 'a\\h'};
            const mostRecent9 = {name: '2', path: 'a\\i'};
            const mostRecent10 = {name: '2', path: LAST_PATH};

            const config = {mostRecent: [mostRecent1, mostRecent2, mostRecent3, mostRecent4,
                mostRecent5, mostRecent6, mostRecent7, mostRecent8, mostRecent9, mostRecent10]};
            const returnValue = {data: config, type: FsResultType.OK};
            const resultSubject = new BehaviorSubject(returnValue);

            spyOn(mockFileService, 'openOrCreateFile').and.returnValue(resultSubject);

            const cut = new AppConfigurationService(mockFileService);

            cut.getMostRecentFiles().pipe( take(1) ).subscribe(res => {
                expect(res.length).toBe(10);
            });

            const NEW_PATH = 'a\\e';
            cut.addMostRecentFile(NEW_PATH);

            cut.getMostRecentFiles().pipe( take(1) ).subscribe(res => {
                expect(res.length).toBe(10);
                expect(res[0].path).toEqual(NEW_PATH);
                expect(res[9].path).toEqual(LAST_PATH);
            });
        }));
    });
});
