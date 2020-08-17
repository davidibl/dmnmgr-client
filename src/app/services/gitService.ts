import { Injectable } from '@angular/core';
import { Repository, Commit, Index, Signature, Oid, PushOptions } from 'nodegit';
import { Observable, from, BehaviorSubject, ReplaySubject, of, zip, Subject, throwError, merge } from 'rxjs';
import { map, switchMap, filter, reduce, catchError, tap, take, mergeMap } from 'rxjs/operators';
import { FileStatus } from '../model/git/fileStatus';
import { GitCommit } from '../model/git/gitCommit';
import { GitSignature } from '../model/git/gitSignature';
import { ElectronService } from './electronService';
import { AppConfigurationService } from './appConfigurationService';
import { EventService } from './eventService';
import { BaseEvent } from '../model/event/event';
import { EventType } from '../model/event/eventType';
import { isNull } from '@xnoname/web-components';
import { GitSignatureIdentity } from '../model/git/gitSignatureIdentity';
import { GitKeys } from '../model/appConfiguration/gitKeys';
import { CloneData } from '../model/git/cloneData';
import { NewCommit } from '../model/git/newCommit';

declare var NodeGit;

function toObservable<T, F, PropertyName extends string>(
    resultFieldName: PropertyName,
    promise: Promise<T>,
    args?: F,
    errorFunc?: (error) => Observable<any>): Observable<{ [K in PropertyName]: T } & F> {

    type ReturnType = {
        [K in PropertyName]: T
    };
    return from(promise.catch(error => {
            if (errorFunc) {
                errorFunc(error);
            }
        })).pipe(
        map(result => Object.assign({ [resultFieldName]: result } as ReturnType, args) as ReturnType & F),
        catchError(errorFunc)
    );
}

export class BranchNames {
    static DETACHED = 'detached';
}

@Injectable()
export class GitService {

    private _nodegit: any;
    private _currentRepository = new BehaviorSubject<Repository>(null);
    private _currentChangesInTree: ReplaySubject<FileStatus[]>;
    private _currentHistory = new ReplaySubject<GitCommit[]>(1);
    private _currentCommit = new ReplaySubject<GitCommit>(1);
    private _branchnameCache = new ReplaySubject<string>(1);

    public constructor(
        private _electronService: ElectronService,
        private _configurationService: AppConfigurationService,
        private _eventService: EventService,
    ) {

        this._nodegit = this._electronService.remote.getGlobal('nodegit');
        (<any>window).NodeGit = this._nodegit;

        this._currentRepository
            .pipe(
                filter(repository => !!repository),
                switchMap(repository => toObservable('branch', repository.getCurrentBranch(), { repository: repository })),
                switchMap(repositoryBranch => repositoryBranch.repository.getBranchCommit(repositoryBranch.branch.name())),
                switchMap(branchCommit => this.getCommitHistoryFramLatest(branchCommit)),
                switchMap(commits => zip(...commits.map(commit => this.toGitCommit(commit))))
            )
            .subscribe(commits => this._currentHistory.next(commits));

        this._currentChangesInTree = new ReplaySubject<FileStatus[]>(1);
        this.getCurrentRepository()
            .pipe(
                filter(repository => !!repository),
                switchMap(this.getCurrentChanges)
            )
            .subscribe(result => this._currentChangesInTree.next(result));

        this._currentRepository
            .pipe(
                catchError(_ => of(null)),
                filter(repository => !repository),
            )
            .subscribe(_ => this.resetRepository());

        this._currentRepository
            .pipe(
                filter(repository => !!repository)
            ).subscribe(_ => this.fetchCurrentCommit());

        this._currentRepository
            .pipe(
                filter(repository => !!repository),
                switchMap(repository => from(repository.getCurrentBranch())),
                map(branch => branch.shorthand())
            ).subscribe(name => this._branchnameCache.next(name));
    }

    public getCurrentRepository() {
        return this._currentRepository.asObservable();
    }

    public getCurrentBranchname() {
        return this._branchnameCache.asObservable();
    }

    public getCurrentChangesInTree() {
        return this._currentChangesInTree.asObservable();
    }

    public isRepositoryConnected() {
        return this._currentRepository.pipe(map(repository => !!repository));
    }

    public getCurrentHistory() {
        return this._currentHistory.asObservable();
    }

    public getCurrentCommit() {
        return this._currentCommit;
    }

    public isHeadDetached() {
        return this._branchnameCache
            .pipe(map(branchname => branchname === BranchNames.DETACHED));
    }

    public commitCurrentChanges(commit: NewCommit): Observable<{}> {
        return this.getCurrentRepository()
            .pipe(
                take(1),
                switchMap(repository => toObservable('index', repository.refreshIndex(), { repository: repository })),
                switchMap(index => this.addPaths(index.index, commit.commitAll, commit.filesToCommit), (index, _) => index),
                tap(index => index.index.write()),
                switchMap(index => toObservable('oid', index.index.writeTree(), index)),
                switchMap(index => toObservable('branchCommit', index.repository.getHeadCommit(), index)),
                switchMap(data => this.createCommit(data, commit.message)),
                switchMap(data => toObservable('index', data.repository.refreshIndex(), data))
            );
    }

    private addPaths(index: Index, commitAll: boolean, files: FileStatus[]): Observable<any> {
        if (commitAll) {
            return from(index.addAll('.', 0, null));
        }
        return zip(
            ...files.map(file => from(index.addByPath(file.path)))
        );
    }

    public createAndCheckoutBranch(branchname: string) {
        return this.getCurrentRepository()
            .pipe(
                take(1),
                switchMap(repository => toObservable('branchCommit', repository.getHeadCommit(), { repository: repository })),
                switchMap(data => toObservable('branchReference',
                    data.repository.createBranch(branchname, data.branchCommit, true), data)),
                switchMap(data => data.repository.checkoutBranch(data.branchReference))
            );
    }

    public pushCommits() {
        return this._currentRepository
            .pipe(
                take(1),
                switchMap(repository => toObservable('remote', repository.getRemote('origin'), { repository: repository })),
                switchMap(data => toObservable('currentBranch', data.repository.getCurrentBranch(), data)),
                switchMap(_ => this.createAuthOptions(), (data, creds) => Object.assign(data, { creds: creds })),
                switchMap(data => toObservable('pushResult', data.remote.push([data.currentBranch.name()], data.creds), data,
                    (error) => this.handleError(error)
                ))
            );
    }

    public pullFromRemote() {
        return this._currentRepository
            .pipe(
                take(1),
                switchMap(_ => this.createAuthOptions(),
                    (repository, creds) => ({ repository: repository, creds: creds })),
                switchMap(data => {
                    return from(data.repository.fetchAll(data.creds).catch(error => this.handleError(error)))
                        .pipe(map(_ => data));
                }),
                switchMap(_ => this.getCurrentBranchname().pipe(take(1)),
                    (data, branchname) => Object.assign(data, { branchname: branchname })),
                switchMap(_ => this.createSignature(), (data, signature) => Object.assign(data, {signature: signature})),
                switchMap(data => toObservable('mergeResult',
                    data.repository.mergeBranches(data.branchname, `origin/${data.branchname}`), data,
                    (error) => this.handleError(error)
                )),
                tap(_ => this.resetCurrentChanges())
            );
    }

    public resetCurrentChanges() {
        this._currentRepository
            .pipe(
                take(1),
                switchMap(repository => toObservable('branchCommit', repository.getHeadCommit(), { repository: repository })),
                switchMap(data => toObservable('newRepository',
                    this._nodegit.Reset(data.repository, data.branchCommit, 3), data)),
                tap(_ => this.triggerRefreshFile())
            ).subscribe(data => this._currentRepository.next(data.repository));
    }

    public checkoutMaster() {
        this._currentRepository
            .pipe(
                take(1),
                switchMap(repository => toObservable('newReference', repository.checkoutBranch('master'), { repository: repository }))
            ).subscribe(data => this._currentRepository.next(data.repository));
    }

    public checkoutMasterAndDeleteDetached() {
        this._currentRepository
            .pipe(
                take(1),
                switchMap(repository => toObservable('newReference', repository.checkoutBranch('master'), { repository: repository })),
                switchMap(data => toObservable('detachedBranch', data.repository.getBranch(BranchNames.DETACHED), data)),
                tap(data => this._nodegit.Branch.delete(data.detachedBranch)),
                tap(_ => this.triggerRefreshFile())
            ).subscribe(data => this._currentRepository.next(data.repository));
    }

    public openRepository(repositoryRootPath: string) {
        this._nodegit.Repository.openExt(repositoryRootPath, 0, '')
            .then(
                (repository: Repository) => this._currentRepository.next(repository),
                _ => this._currentRepository.next(null)
            );
    }

    public resetRepository() {
        this._currentChangesInTree.next([]);
        this._branchnameCache.next(null);
        this._currentHistory.next(null);
    }

    public checkoutCommit(commit: GitCommit) {
        this._currentRepository
            .pipe(
                take(1),
                switchMap(repository => toObservable('newReference',
                    repository.createBranch(BranchNames.DETACHED, this._nodegit.Oid.fromString(commit.id)), { repository: repository })),
                switchMap(data => toObservable('checkoutReference', data.repository.checkoutBranch(data.newReference), data)),
                tap(_ => this.triggerRefreshFile())
            ).subscribe(data => this._currentRepository.next(data.repository));
    }

    public cloneRepository(cloneData: CloneData) {
        return this._currentRepository
            .pipe(
                take(1),
                switchMap(_ => this.createAuthOptions(),
                    (repository, creds) => ({ repository: repository, creds: creds })),
                switchMap(data => toObservable('cloneResult',
                    this._nodegit.Clone(cloneData.repositoryUrl, cloneData.destinationPath, { fetchOpts: data.creds }),
                    data, (error) => this.handleError(error)))
            );
    }

    public isConfigured(): Observable<boolean> {
        return zip(
            this._configurationService.getGitSignature(),
            this._configurationService.getGitKeys()
        ).pipe(
            take(1),
            map(([signature, keys]) =>
                this.isSignatureConfigured(signature) && this.isKeysConfigured(keys))
        );
    }

    private triggerRefreshFile() {
        this._eventService.publishEvent(new BaseEvent(EventType.REFRESH_CURRENT_FILE));
    }

    private isSignatureConfigured(signature: GitSignatureIdentity) {
        return !isNull(signature.email) && !isNull(signature.name);
    }

    private isKeysConfigured(keys: GitKeys) {
        return !isNull(keys.privateKey) && !isNull(keys.publicKey);
    }

    private handleError<T>(error): Observable<never> {
        this._eventService.publishEvent(new BaseEvent(EventType.GITERROR, error.message));
        throw new Error(error.message);
    }

    private getCurrentChanges(repository: Repository) {
        return toObservable('status', repository.getStatusExt(), {})
            .pipe(
                map(status => status.status.map(fileStatus => new FileStatus(fileStatus.status(), fileStatus.path())))
            );
    }

    private fetchCurrentCommit() {
        this._currentRepository
            .pipe(
                filter(repository => !!repository),
                switchMap(repository => toObservable('headCommit', repository.getHeadCommit(), {})),
                switchMap(commit => this.toGitCommit(commit.headCommit))
            )
            .subscribe(commit => this._currentCommit.next(commit));
    }

    private collectAll<T>(acc: any[], value: T, index: number): T[] {
        acc.push(value);
        return acc;
    }

    private getCommitHistoryFramLatest(branchCommit): Observable<Commit[]> {
        const commitWalker = branchCommit.history();
        const subject = new Subject<Commit>();
        commitWalker.on('commit', function (commit) { subject.next(commit); });
        commitWalker.on('end', function () { subject.complete(); });
        commitWalker.start();
        return subject
            .pipe(
                reduce(this.collectAll, [])
            );
    }

    private toGitCommit(commit: Commit): Observable<GitCommit> {
        const email = commit.committer().email();
        const name = commit.committer().name();
        const when = commit.committer().when();
        return this.getDeltaFileList(commit)
            .pipe(
                map(changedFiles => {
                    return new GitCommit(
                        commit.message(),
                        new GitSignature(
                            email,
                            name,
                            new Date((when.time() * 1000))
                        ),
                        changedFiles,
                        commit.sha(),
                        commit.id().tostrS(),
                    );
                })
            );
    }

    private getDeltaFileList(commit: Commit): Observable<string[]> {
        return toObservable('diff', commit.getDiff())
            .pipe(
                mergeMap(diff => diff.diff),
                map(diff => Array(diff.numDeltas()).fill(0).map((e, i) => i).map(idx => diff.getDelta(idx))),
                map(deltas => deltas.map(delta => (delta as any).newFile().path())),
                map(deltaPaths => deltaPaths.map(path => path.substring(path.lastIndexOf('/') + 1)))
            );
    }

    private createCommit(data: { ['repository']: Repository, ['index']: Index, ['branchCommit']: Commit, 'oid': Oid }, message: string) {

        return this.createSignature()
            .pipe(
                switchMap(signature => {
                    return toObservable(
                        'newOid',
                        data.repository.createCommit(
                            'HEAD',
                            signature,
                            signature,
                            message,
                            data.oid,
                            [data.branchCommit]), data,
                        (error) => {
                            console.log(error);
                            return of(null);
                        });
                })
            );
    }

    private createSignature(): Observable<Signature> {
        const commitTime = Math.round((new Date().getTime() / 1000));
        return this._configurationService
            .getGitSignature()
            .pipe(
                take(1),
                map(signature => this._nodegit.Signature.create(signature.name, signature.email, commitTime, 120))
            );
    }

    private createAuthOptions(): Observable<PushOptions> {
        return this._configurationService
            .getGitKeys()
            .pipe(
                take(1),
                map(keys =>
                    this._electronService.remote.getGlobal('getCredentials')(keys.privateKey, keys.publicKey))
            );
    }

}
