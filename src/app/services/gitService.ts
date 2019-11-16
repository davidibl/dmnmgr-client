import { Injectable } from '@angular/core';
import { Repository, Commit, Index, Signature, Oid } from 'nodegit';
import { Observable, from, BehaviorSubject, ReplaySubject, of, zip, Subject } from 'rxjs';
import { map, switchMap, filter, reduce, catchError, tap, take, mergeMap } from 'rxjs/operators';
import { FileStatus } from '../model/git/fileStatus';
import { GitCommit } from '../model/git/gitCommit';
import { GitSignature } from '../model/git/gitSignature';
import { ElectronService } from './electronService';

function toObservable<T, F, PropertyName extends string>(
    resultFieldName: PropertyName,
    promise: Promise<T>,
    args?: F,
    errorFunc?: (error) => Observable<any>): Observable<{[K in PropertyName]: T} & F> {

        type ReturnType = {
            [K in PropertyName]: T
        };
        return from(promise).pipe(
            map(result => Object.assign({[resultFieldName]: result} as ReturnType, args) as ReturnType & F),
            catchError(errorFunc)
        );
}

@Injectable()
export class GitService {

    private _nodegit: any;
    private _currentRepository = new BehaviorSubject<Repository>(null);
    private _currentChangesInTree: ReplaySubject<FileStatus[]>;
    private _currentHistory = new ReplaySubject<GitCommit[]>(1);
    private _currentCommit = new ReplaySubject<GitCommit>(1);

    public constructor(
        private _electronService: ElectronService
    ) {

        this._nodegit = this._electronService.remote.getGlobal('nodegit');

        this._currentRepository
            .pipe(
                filter(repository => !!repository),
                switchMap(repository => toObservable('branch', repository.getCurrentBranch(), {repository: repository})),
                switchMap(repositoryBranch => repositoryBranch.repository.getBranchCommit(repositoryBranch.branch)),
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
    }

    public getCurrentRepository() {
        return this._currentRepository;
    }

    public getCurrentChangesInTree() {
        return this._currentChangesInTree;
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

    public commitCurrentChanges(message: string): Observable<{}> {
        return this.getCurrentRepository()
            .pipe(
                take(1),
                switchMap(repository => toObservable('index', repository.refreshIndex(), {repository: repository})),
                switchMap(index => toObservable('addAllResult', index.index.addAll('.', 0, null), index)),
                tap(index => index.index.write()),
                switchMap(index => toObservable('oid', index.index.writeTree(), index)),
                switchMap(index => toObservable('branchCommit', index.repository.getHeadCommit(), index)),
                switchMap(data => this.createCommit(data, message)),
                switchMap(index => toObservable('addAllResultAfter', index.index.addAll('.', 1, null), index)),
                switchMap(data => toObservable('index', data.repository.refreshIndex(), data))
            );
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
        this._currentHistory.next(null);
    }

    public checkoutCommit(commit: GitCommit) {
        this._currentRepository
            .pipe(
                take(1),
                tap(repository => repository.setHeadDetached(this._nodegit.Oid.fromString(commit.id))),
                switchMap(_ => this._currentRepository),
                take(1)
            )
            .subscribe(repository => this._currentRepository.next(repository));
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
        commitWalker.on('commit', function(commit){ subject.next(commit); });
        commitWalker.on('end', function() { subject.complete(); });
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
                map(deltas => deltas.map(delta => (delta as any).newFile().path()))
            );
    }

    private createCommit(data: {['repository']: Repository, ['index']: Index, ['branchCommit']: Commit, 'oid': Oid}, message: string) {

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
        const signature = this._nodegit.Signature.create('David Ibl', 'david.ibl@xnoname.com', commitTime, 120);
        return of(signature);
    }

}
