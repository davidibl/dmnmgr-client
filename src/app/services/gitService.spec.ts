import { TestBed, async, fakeAsync, tick } from '@angular/core/testing';
import { GitService } from './gitService';
import { ElectronService } from './electronService';
import { AppConfigurationService } from './appConfigurationService';
import { EventService } from './eventService';
import {
    Repository,
    Commit,
    Diff,
    Signature,
    StatusFile,
    Index,
    Oid,
    Reference,
    Remote
} from 'nodegit';
import { HistoryEventEmitter } from 'nodegit/commit';
import { of } from 'rxjs';
import { EventType } from '../model/event/eventType';

export class Delta {
    private file: SFile;
    constructor(private path: string) { this.file = new SFile(this.path); }
    public newFile() {
        return this.file;
    }
}

export class SFile {
    constructor(private filepath: string) {}
    public path() {
        return this.filepath;
    }
}

export class GitMockBuilder {

    public constructor(
        public staticRepository: any,
        public staticSignatur: any,
    ) {}

    private branchname = 'master';
    private commits: {message: string, paths: string[]}[] = [{ message: initialHeadCommitMessage,
        paths: [defaultBasePath + defaultFirstCommitFilename] }];
    private name = 'david';
    private email = 'david@x.de';
    private changes: StatusFile[] = [];

    public commitWalkerCommit: () => void;
    public commitWalkerEnd: () => void;

    public index: jasmine.SpyObj<Index> = jasmine.createSpyObj('Index', ['addAll', 'addByPath',
            'write', 'writeTree']);
    public repositoryObj: jasmine.SpyObj<Repository> = jasmine.createSpyObj('Repository',
        ['getCurrentBranch', 'getMasterCommit', 'getStatusExt', 'getHeadCommit', 'fetchAll',
        'refreshIndex', 'createCommit', 'createBranch', 'checkoutBranch', 'getRemote',
        'getBranch', 'mergeBranches']);
    public remote: jasmine.SpyObj<Remote> = jasmine.createSpyObj('Remote', ['push']);

    public masterCommitObj = this.createCommit(this.commits[0].message, this.commits[0].paths);

    public withBranchname(branchname: string) {
        this.branchname = branchname;
        return this;
    }

    public withCommit(commitMessage: string, paths: string[]) {
        this.commits.push({message: commitMessage, paths: paths});
    }

    public withSignature(name: string, email: string) {
        this.name = name;
        this.email = email;
        this.staticSignatur.create.and.returnValue({name: name, email: email});
    }

    public withChange(status: string, filepath: string) {
        this.changes.push(<StatusFile>{
            status() {
                return [status];
            },
            path() {
                return filepath;
            }
        });
    }

    public withNewCommitMock(id: Oid) {
        this.index.addAll.and.returnValue(Promise.resolve(null));
        this.index.addByPath.and.returnValue(Promise.resolve(null));
        this.index.writeTree.and.returnValue(Promise.resolve(id));
        this.repositoryObj.createCommit.and.returnValue(Promise.resolve(id));
    }

    public build() {
        this.staticRepository.openExt.and.returnValue(Promise.resolve(this.repositoryObj));

        const commitWalker: jasmine.SpyObj<HistoryEventEmitter> = jasmine.createSpyObj('HistoryEventEmitter', ['on', 'start']);
        commitWalker.on.and.callFake((param, func: (param2?) => void) => {
            if (param === 'end') {
                this.commitWalkerEnd = func;
            }
            if (param === 'commit') {
                this.commitWalkerCommit = () => {
                    this.commits.forEach(commit => {
                        func(this.createCommit(commit.message, commit.paths));
                    });
                };
            }
        });

        const referenceObj = jasmine.createSpyObj('Reference', ['shorthand', 'name']);
        referenceObj.shorthand.and.returnValue(this.branchname);
        referenceObj.name.and.returnValue(this.branchname);

        this.masterCommitObj.history.and.returnValue(commitWalker);

        this.repositoryObj.getCurrentBranch.and.returnValue(Promise.resolve(referenceObj));
        this.repositoryObj.getMasterCommit.and.returnValue(Promise.resolve(this.masterCommitObj));
        this.repositoryObj.getStatusExt.and.returnValue(Promise.resolve(this.changes));
        this.repositoryObj.getHeadCommit.and.returnValue(Promise.resolve(this.masterCommitObj));

        this.repositoryObj.refreshIndex.and.returnValue(Promise.resolve(this.index));
    }

    private createCommit(message: string, delta: string[]) {
        const commit: jasmine.SpyObj<Commit> = jasmine.createSpyObj('Commit', [
            'history', 'committer', 'id', 'message', 'sha', 'getDiff', 'history']);
        const diff: jasmine.SpyObj<Diff> = jasmine.createSpyObj('Diff', ['numDeltas', 'getDelta']);
        diff.numDeltas.and.returnValue(delta.length);
        diff.getDelta.and.returnValue(delta.map(path => ({
            newFile() {
                return {
                    path() {
                        return path;
                    }
                };
            }
        }))[0]);
        commit.getDiff.and.returnValue(Promise.resolve([diff]));

        this.repositoryObj.getRemote.and.returnValue(Promise.resolve(this.remote));

        const signatureObj: jasmine.SpyObj<Signature> = jasmine.createSpyObj('Signature', ['email', 'name', 'when']);
        signatureObj.when.and.returnValue(jasmine.createSpyObj('Time', ['time']));
        signatureObj.email.and.returnValue(this.email);
        signatureObj.name.and.returnValue(this.name);

        commit.message.and.returnValue(message);
        commit.committer.and.returnValue(signatureObj);
        commit.id.and.returnValue(jasmine.createSpyObj('Oid', ['tostrS']));
        return commit;
    }
}

let mockBuilder: GitMockBuilder;
let cut: GitService;
let configurationService: jasmine.SpyObj<AppConfigurationService>;
let eventService: EventService;
let fakeRemote;
let repository;
let signature;
let oid;
let branch;
let fakeClone;
let fakeReset;

let fakeNodeGit;
let electronService;

const masterBranchname = 'master';
const defaultFirstCommitFilename = 'file.dmn';
const defaultBasePath = '/src/resources/';
const initialHeadCommitMessage = 'headCommit';

describe('GitService', () => {
    beforeEach(async(() => {
        fakeRemote = jasmine.createSpyObj('Remote', ['getGlobal']);
        repository = jasmine.createSpyObj('Repository', ['openExt']);
        signature = jasmine.createSpyObj('Signature', ['create']);
        oid = jasmine.createSpyObj('Oid', ['fromString']);
        fakeClone = jasmine.createSpy('Clone').and.returnValue(Promise.resolve('x'));
        fakeReset = jasmine.createSpy('Reset').and.returnValue(Promise.resolve(null));
        branch = jasmine.createSpyObj('Branch', ['delete']);

        fakeNodeGit = {
            Repository: repository,
            Signature: signature,
            Oid: oid,
            Clone: fakeClone,
            Branch: branch,
            Reset: fakeReset,
        };
        electronService = {
            remote: fakeRemote
        };

        const configurationServiceSpy = jasmine.createSpyObj('AppConfigurationService', ['getGitSignature', 'getGitKeys']);
        fakeRemote.getGlobal.and.callFake(param => {
            if (param === 'getCredentials') {
                return (privateKey, publicKey) => ({privateKey: privateKey, publicKey: publicKey});
            }
            return fakeNodeGit;
        });

        mockBuilder = new GitMockBuilder(repository, signature);

        TestBed.configureTestingModule({
            providers: [
                GitService,
                EventService,
                { provide: ElectronService, useValue: electronService },
                { provide: AppConfigurationService, useValue: configurationServiceSpy },
            ]
        });

        cut = TestBed.inject(GitService);
        configurationService = <any>TestBed.inject(AppConfigurationService);
        eventService = TestBed.inject(EventService);
    }));

    describe('Initialize', () => {

        it('should be initialized after startup', async(() => {

            expect(cut).not.toBeNull();
            expect(cut['_nodegit']).not.toBeNull();
        }));

        it('should try opening a repository and publish null as repository on error', fakeAsync(() => {

            repository.openExt.and.returnValue(Promise.reject());
            cut.openRepository('.');

            tick(1);

            expect(repository.openExt).toHaveBeenCalledTimes(1);
            cut['_currentRepository'].subscribe(result => expect(result).toBeNull());
        }));

        it('should try opening a repository and publish a repository', fakeAsync(() => {

            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            expect(repository.openExt).toHaveBeenCalledTimes(1);
            cut['_currentRepository'].subscribe(result => expect(result).not.toBeNull());
            cut.getCurrentBranchname().subscribe(result => expect(result).toEqual(masterBranchname));
        }));

        it('should detect a detached head', fakeAsync(() => {

            const branchname = 'detached';
            mockBuilder.withBranchname(branchname).build();

            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            cut.isHeadDetached().subscribe(result => expect(result).toBeTruthy());
        }));

        it('should provide the commit history', fakeAsync(() => {

            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            tick(1);

            cut.getCurrentHistory().subscribe(result => {
                expect(result[0].changedFiles[0]).toEqual(defaultFirstCommitFilename);
                expect(result.length).toBe(1);
            });
        }));

        it('should be able to say if a git key is fully configured or not', fakeAsync(() => {

            configurationService.getGitSignature.and.returnValue(of({name: 'david', email: 'david'}));

            configurationService.getGitKeys.and.returnValue(of({privateKey: 'aa', publicKey: 'xx'}));
            cut.isConfigured().subscribe(result => expect(result).toBeTruthy());

            configurationService.getGitKeys.and.returnValue(of({privateKey: null, publicKey: 'xx'}));
            cut.isConfigured().subscribe(result => expect(result).toBeFalsy());

            configurationService.getGitKeys.and.returnValue(of({privateKey: 'aa', publicKey: null}));
            cut.isConfigured().subscribe(result => expect(result).toBeFalsy());
        }));

        it('should be able to say if a git signature is fully configured or not', fakeAsync(() => {

            configurationService.getGitKeys.and.returnValue({privateKey: 'aaa', publicKey: 'xx'});

            configurationService.getGitSignature.and.returnValue({name: 'david', email: 'david@a.b'});
            cut.isConfigured().subscribe(result => expect(result).toBeTruthy());

            configurationService.getGitSignature.and.returnValue({name: null, email: 'david@a.b'});
            cut.isConfigured().subscribe(result => expect(result).toBeFalsy());

            configurationService.getGitSignature.and.returnValue({name: 'david', email: null});
            cut.isConfigured().subscribe(result => expect(result).toBeFalsy());
        }));

        it('should provide current changes in tree', fakeAsync(() => {

            const otherFilename = 'hui.dmn';
            const filepath1 = defaultBasePath + defaultFirstCommitFilename;
            const filepath2 = defaultBasePath + otherFilename;
            const filestatus1 = 'changed';
            const filestatus2 = 'added';

            mockBuilder.withBranchname(masterBranchname).build();
            mockBuilder.withChange(filestatus1, filepath1);
            mockBuilder.withChange(filestatus2, filepath2);
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            cut.getCurrentChangesInTree().subscribe(result => {
                expect(result.find(file => file.path === filepath1).status).toEqual([filestatus1]);
                expect(result.find(file => file.path === filepath2).status).toEqual([filestatus2]);
            });
        }));

        it('should provide the current head commit', fakeAsync(() => {
            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            cut.getCurrentCommit().subscribe(commit => {
                expect(commit).not.toBeNull();
                expect(commit.message).toEqual(initialHeadCommitMessage);
            });
        }));

        it('should reflect not connected state when repository is null', fakeAsync(() => {
            cut.isRepositoryConnected().subscribe(result => expect(result).toBeFalsy());
        }));
    });

    describe('Git Functionality', () => {
        it('should perform a commit', fakeAsync(() => {
            configurationService.getGitSignature.and.returnValue(of({name: 'david', email: 'david'}));
            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            mockBuilder.withNewCommitMock(jasmine.createSpyObj('Oid', ['sha']));

            const name1 = 'testfile.xml';
            const filepath1 = '/abc/' + name1;
            const name2 = 'afile.xml';
            const filepath2 = '/abc/' + name2;
            cut.commitCurrentChanges({commitAll: false, filesToCommit: [
                {path: filepath1, status: ['a']}, {path: filepath2, status: ['b']}
            ], message: 'Test message'}).subscribe(result => expect(result).not.toBeNull());

            tick(1);

            expect(mockBuilder.index.addByPath).toHaveBeenCalledTimes(2);
            expect(mockBuilder.index.addByPath.calls.argsFor(0)).toEqual([filepath1]);
            expect(mockBuilder.index.addByPath.calls.argsFor(1)).toEqual([filepath2]);
            expect(mockBuilder.repositoryObj.createCommit).toHaveBeenCalledTimes(1);
        }));

        it('should perform a commit with all files as dot-path', fakeAsync(() => {
            configurationService.getGitSignature.and.returnValue(of({name: 'david', email: 'david'}));
            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            mockBuilder.withNewCommitMock(jasmine.createSpyObj('Oid', ['sha']));

            const name1 = 'testfile.xml';
            const filepath1 = '/abc/' + name1;
            const name2 = 'afile.xml';
            const filepath2 = '/abc/' + name2;
            cut.commitCurrentChanges({commitAll: true, filesToCommit: [
                {path: filepath1, status: ['a']}, {path: filepath2, status: ['b']}
            ], message: 'Test message'}).subscribe(result => expect(result).not.toBeNull());

            tick(1);

            expect(mockBuilder.index.addAll).toHaveBeenCalledTimes(1);
            expect(mockBuilder.index.addAll).toHaveBeenCalledWith('.', 0, null);
            expect(mockBuilder.repositoryObj.createCommit).toHaveBeenCalledTimes(1);
        }));

        it('should create and checkout a new branch', fakeAsync(() => {

            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            const newBranchname = 'testbranch';

            const myReference = <Reference>{};
            mockBuilder.repositoryObj.checkoutBranch.and.returnValue(of(null));
            mockBuilder.repositoryObj.createBranch.and.returnValue(Promise.resolve(myReference));

            cut.createAndCheckoutBranch(newBranchname).subscribe();

            tick(1);

            expect(mockBuilder.repositoryObj.createBranch).toHaveBeenCalledTimes(1);
            expect(mockBuilder.repositoryObj.createBranch).toHaveBeenCalledWith(newBranchname, mockBuilder.masterCommitObj, true);
            expect(mockBuilder.repositoryObj.checkoutBranch).toHaveBeenCalledTimes(1);
            expect(mockBuilder.repositoryObj.checkoutBranch).toHaveBeenCalledWith(myReference);
        }));

        it('should fetch current branch create auth and push to origin', fakeAsync(() => {

            const gitKeys = {privateKey: 'aaa', publicKey: 'bbb'};
            configurationService.getGitKeys.and.returnValue(of(gitKeys));
            mockBuilder.remote.push.and.returnValue(Promise.resolve(true));

            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            cut.pushCommits().subscribe();

            tick(1);

            expect(mockBuilder.remote.push).toHaveBeenCalledTimes(1);
            expect(mockBuilder.remote.push).toHaveBeenCalledWith([masterBranchname], gitKeys);
        }));

        it('should checkout master when master is requested', fakeAsync(() => {

            mockBuilder.repositoryObj.checkoutBranch.and.returnValue(Promise.resolve(true));
            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            cut.checkoutMaster();

            tick(1);

            expect(mockBuilder.repositoryObj.checkoutBranch).toHaveBeenCalledTimes(1);
            expect(mockBuilder.repositoryObj.checkoutBranch).toHaveBeenCalledWith('master');
        }));

        it('should checkout checkout a concrete commit as detached head', fakeAsync(() => {

            oid.fromString.and.returnValue('test');
            const myReference = <Reference>{};
            mockBuilder.repositoryObj.checkoutBranch.and.returnValue(Promise.resolve(null));
            mockBuilder.repositoryObj.createBranch.and.returnValue(Promise.resolve(myReference));

            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            let refreshEvent;
            eventService.getEvent(ev => ev.type === EventType.REFRESH_CURRENT_FILE).subscribe(ev => refreshEvent = ev);

            const commit = {id: '1', changedFiles: null, committer: null, current: null, message: null, sha: null};
            cut.checkoutCommit(commit);

            tick(1);

            expect(mockBuilder.repositoryObj.checkoutBranch).toHaveBeenCalledTimes(1);
            expect(oid.fromString).toHaveBeenCalledWith(commit.id);
            expect(mockBuilder.repositoryObj.checkoutBranch).toHaveBeenCalledWith(myReference);
            expect(mockBuilder.repositoryObj.createBranch).toHaveBeenCalledTimes(1);
            expect(refreshEvent).not.toBeNull();
        }));

        it('should clone a repository', fakeAsync(() => {

            const gitKeys = {privateKey: 'aaa', publicKey: 'bbb'};
            configurationService.getGitKeys.and.returnValue(of(gitKeys));

            const cloneData = {destinationPath: 'c:\\', repositoryUrl: 'ssh://xx.de'};
            cut.cloneRepository(cloneData).subscribe();

            tick(1);

            expect(fakeClone).toHaveBeenCalledTimes(1);
            expect(fakeClone).toHaveBeenCalledWith(cloneData.repositoryUrl, cloneData.destinationPath, {fetchOpts: gitKeys});
        }));

        it('should switch back to master and delete detached head branch', fakeAsync(() => {

            const myReference = <Reference>{};
            mockBuilder.repositoryObj.checkoutBranch.and.returnValue(Promise.resolve(null));
            mockBuilder.repositoryObj.getBranch.and.returnValue(Promise.resolve(myReference));

            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            let refreshEvent;
            eventService.getEvent(ev => ev.type === EventType.REFRESH_CURRENT_FILE).subscribe(ev => refreshEvent = ev);

            cut.checkoutMasterAndDeleteDetached();

            tick(1);

            expect(branch.delete).toHaveBeenCalledTimes(1);
            expect(branch.delete).toHaveBeenCalledWith(myReference);
            expect(refreshEvent).not.toBeNull();
        }));

        it('should reset current changes hard', fakeAsync(() => {

            mockBuilder.withBranchname(masterBranchname).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            let refreshEvent;
            eventService.getEvent(ev => ev.type === EventType.REFRESH_CURRENT_FILE).subscribe(ev => refreshEvent = ev);

            cut.resetCurrentChanges();

            tick(1);

            expect(fakeReset).toHaveBeenCalledTimes(1);
            expect(fakeReset).toHaveBeenCalledWith(mockBuilder.repositoryObj, mockBuilder.masterCommitObj, 3);
            expect(refreshEvent).not.toBeNull();
        }));

        it('should fetch from remote and merge the files from origin', fakeAsync(() => {

            const gitKeys = {privateKey: 'aaa', publicKey: 'bbb'};
            const gitSignature = {name: 'david', email: 'david'};
            configurationService.getGitKeys.and.returnValue(of(gitKeys));
            configurationService.getGitSignature.and.returnValue(of(gitSignature));

            mockBuilder.repositoryObj.fetchAll.and.returnValue(Promise.resolve(null));
            const mergeResult = 'mergeresult';
            mockBuilder.repositoryObj.mergeBranches.and.returnValue(Promise.resolve(mergeResult));

            const anyBranchName = 'testbranch';
            mockBuilder.withBranchname(anyBranchName).build();
            cut.openRepository('.');

            tick(1);

            mockBuilder.commitWalkerCommit();
            mockBuilder.commitWalkerEnd();

            let refreshEvent;
            eventService.getEvent(ev => ev.type === EventType.REFRESH_CURRENT_FILE).subscribe(ev => refreshEvent = ev);

            cut.pullFromRemote().subscribe();

            tick(1);

            expect(mockBuilder.repositoryObj.fetchAll).toHaveBeenCalledTimes(1);
            expect(mockBuilder.repositoryObj.fetchAll).toHaveBeenCalledWith(gitKeys);
            expect(mockBuilder.repositoryObj.mergeBranches).toHaveBeenCalledTimes(1);
            expect(mockBuilder.repositoryObj.mergeBranches).toHaveBeenCalledWith(anyBranchName, `origin/${anyBranchName}`);
        }));
    });
});
