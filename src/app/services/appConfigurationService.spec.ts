import { TestBed, async } from '@angular/core/testing';
import { of, BehaviorSubject, ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AppConfigurationService } from './appConfigurationService';
import { FsResultType } from '../model/fileSystemAccessResult';
import { AppConfig } from '../model/appConfiguration/appConfig';
import { FileService } from './fileService';

const fullConfig = <AppConfig> {
    mostRecent: [{name: 'x', path: 'y'}],
    simulatorBaseUrl: 'simurl',
    autoValidation: true,
    gitKey: {privateKey: 'aaa', publicKey: 'bbb'},
    gitSignature: {email: 'a@b.de', name: 'david'},
};

describe('AppConfiguration Service', () => {

    let cut: AppConfigurationService;
    let fileService: jasmine.SpyObj<FileService>;
    let subject;

    beforeEach(async(() => {

        subject = new ReplaySubject(1);

        const fileServiceSpy = jasmine.createSpyObj('FileService',
            ['openOrCreateFile', 'saveFile', 'getUserDataPath']);

        fileServiceSpy.openOrCreateFile.and.returnValue(subject);
        fileServiceSpy.getUserDataPath.and.returnValue('c:\\user');

        TestBed.configureTestingModule({
            providers: [
                AppConfigurationService,
                { provide: FileService, useValue: fileServiceSpy },
            ]
        });

        cut = TestBed.inject(AppConfigurationService);
        fileService = <any>TestBed.inject(FileService);

        fileService.saveFile.and.returnValue(of(null));
    }));

    describe('initialize', () => {

        it('should try to create a config file on initialization', async(() => {

            const config = {mostRecent: [], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};
            const returnValue = {data: config, type: FsResultType.OK};
            subject.next(returnValue);

            expect(fileService.openOrCreateFile).toHaveBeenCalledTimes(1);
            expect(cut).not.toBeNull();
            expect(cut['_currentConfiguration']).toEqual(config);
        }));
    });

    describe('configuration handling', () => {

        it('should ignore filesystem errors and keep last configuration', async(() => {

            const config = {mostRecent: [], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};
            const returnValue = {data: config, type: FsResultType.OK};
            subject.next(returnValue);

            subject.next({type: FsResultType.ERROR, data: null});

            expect(cut['_currentConfiguration']).toEqual(config);
        }));

        it('should take every new configuration pushed by filesystem service', async(() => {

            const config = {mostRecent: [], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};
            const configSecond = <AppConfig>{mostRecent: [{name: 'x'}], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};

            const returnValue = {data: <AppConfig>config, type: FsResultType.OK};
            subject.next(returnValue);

            subject.next({type: FsResultType.OK, data: configSecond});

            expect(cut['_currentConfiguration']).toEqual(configSecond);
        }));

        it('should save a new configuration', async(() => {

            const config = {mostRecent: [], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};
            const configSecond = <AppConfig>{mostRecent: [{name: 'x'}], simulatorBaseUrl: '', autoValidation: true,
                gitSignature: { name: null, email: null },  gitKey: { privateKey: null, publicKey: null }};

            const returnValue = {data: <AppConfig>config, type: FsResultType.OK};
            subject.next(returnValue);

            cut.saveConfiguration(configSecond);

            expect(fileService.saveFile).toHaveBeenCalledTimes(1);
            expect(fileService.saveFile).toHaveBeenCalledWith(`c:\\user/${AppConfigurationService['_configFilename']}`, configSecond);
        }));
    });

    describe('Most recent files', () => {
        it('should publish most recent files', async(() => {

            const mostRecent1 = {name: '1', path: 'a'};
            const mostRecent2 = {name: '2', path: 'b'};
            const config = {mostRecent: [mostRecent1, mostRecent2], simulatorBaseUrl: ''};
            const returnValue = {data: config, type: FsResultType.OK};
            subject.next(returnValue);

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

            const mostRecent1 = {name: '1', path: 'a'};
            const mostRecent2 = {name: '2', path: 'b'};
            const config = {mostRecent: [mostRecent1, mostRecent2]};
            const returnValue = {data: config, type: FsResultType.OK};
            subject.next(returnValue);

            const THIRD_PATH = 'c\\x';
            cut.addMostRecentFile(THIRD_PATH);

            cut.getMostRecentFiles().subscribe(res => {
                expect(res.length).toBe(3);
                expect(res[0].path).toEqual(THIRD_PATH);
            });
        }));

        it('should sort an existing recent file to top', async(() => {

            const EXISTING_PATH = 'b\\t';

            const mostRecent1 = {name: '1', path: 'a\\x'};
            const mostRecent2 = {name: '2', path: EXISTING_PATH};
            const config = {mostRecent: [mostRecent1, mostRecent2]};
            const returnValue = {data: config, type: FsResultType.OK};
            subject.next(returnValue);

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
            subject.next(returnValue);

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
            subject.next(returnValue);

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

        it('should remove an item requested to get removed by path', async(() => {

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
            subject.next(returnValue);

            cut.getMostRecentFiles().pipe(take(1)).subscribe(res => {
                expect(res.length).toBe(10);
            });

            cut.removeMostRecentFile(LAST_PATH);

            cut.getMostRecentFiles().pipe(take(1)).subscribe(res => {
                expect(res.length).toBe(9);
                expect(res.find(file => file.path === LAST_PATH)).toBeUndefined();
            });
        }));
    });

    describe('Providing Values', () => {

        it('should provide simulator base url', async(() => {

            subject.next({data: fullConfig, type: FsResultType.OK});

            cut.getBaseUrlSimulator().subscribe(value => expect(value).toEqual(fullConfig.simulatorBaseUrl));
        }));

        it('should provide git credentials', async(() => {

            subject.next({data: fullConfig, type: FsResultType.OK});

            cut.getGitKeys().subscribe(value => expect(value).toEqual(fullConfig.gitKey));
        }));

        it('should provide git username and mail', async(() => {

            subject.next({data: fullConfig, type: FsResultType.OK});

            cut.getGitSignature().subscribe(value => expect(value).toEqual(fullConfig.gitSignature));
        }));

        it('should provide autovalidation', async(() => {

            subject.next({data: fullConfig, type: FsResultType.OK});

            cut.getAutoValidation().subscribe(value => expect(value).toEqual(fullConfig.autoValidation));
        }));

        it('should provide complete configuration', async(() => {

            subject.next({data: fullConfig, type: FsResultType.OK});

            cut.getConfiguration().subscribe(value => expect(value).toEqual(fullConfig));
        }));
    });
});
