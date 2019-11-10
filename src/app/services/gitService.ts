import { Injectable } from '@angular/core';
import { Repository, Commit } from 'nodegit';
import { ElectronService } from 'ngx-electron';
import { Observable, from, BehaviorSubject, ReplaySubject } from 'rxjs';
import { map, switchMap, filter, reduce } from 'rxjs/operators';
import { FileStatus } from '../model/git/fileStatus';
import { GitCommit } from '../model/git/gitCommit';
import { GitSignature } from '../model/git/gitSignature';

function toObservable<T, F>(resultFieldName: string, promise: Promise<T>, args?: F):
    Observable<{[name: string]: T} & F> {
        return from(promise).pipe(
            map(result => Object.assign({[resultFieldName]: result}, args))
        );
}

@Injectable()
export class GitService {

    private _nodegit: any;
    private _currentRepository = new BehaviorSubject<Repository>(null);
    private _currentChangesInTree: ReplaySubject<FileStatus[]>;
    private _currentHistory = new ReplaySubject<GitCommit[]>(1);

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
                map(commits => commits.map(this.toGitCommit))
            )
            .subscribe(commits => this._currentHistory.next(commits));

        this._currentChangesInTree = new ReplaySubject<FileStatus[]>(1);
        this.getCurrentRepository()
            .pipe(
                filter(repository => !!repository),
                switchMap(this.getCurrentChanges)
            )
            .subscribe(result => this._currentChangesInTree.next(result));
    }

    public getCurrentRepository() {
        return this._currentRepository;
    }

    public getCurrentChangesInTree() {
        return this._currentChangesInTree;
    }

    public getCurrentHistory() {
        return this._currentHistory.asObservable();
    }

    public openRepository(repositoryRootPath: string) {
        this._nodegit.Repository.openExt(repositoryRootPath, 0, '')
            .then(
                (repository: Repository) => this._currentRepository.next(repository),
                _ => this._currentRepository.next(null)
            );
    }

    private getCurrentChanges(repository: Repository) {
        return toObservable('status', repository.getStatusExt(), {})
            .pipe(
                map(status => status.status.map(fileStatus => new FileStatus(fileStatus.status(), fileStatus.path())))
            );
    }

    private collectAll<T>(acc: any[], value: T, index: number): T[] {
        acc.push(value);
        return acc;
    }

    private getCommitHistoryFramLatest(branchCommit): Observable<Commit[]> {
        const commitWalker = branchCommit.history();
        const observable = Observable.create(observer => {
            commitWalker.on('commit', function(commit){ observer.next(commit); });
            commitWalker.on('end', function() {observer.complete(); });
        });
        commitWalker.start();
        return observable
            .pipe(
                reduce(this.collectAll, [])
            );
    }

    private toGitCommit(commit: Commit) {
        const email = (<any>commit.committer()).email();
        const name = (<any>commit.committer()).name();
        const when = (<any>commit.committer()).when();
        return new GitCommit(
            commit.message(),
            new GitSignature(
                email,
                name,
                new Date(when.time)
            )
        );
    }

}
