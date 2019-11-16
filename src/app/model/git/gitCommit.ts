import { GitSignature } from './gitSignature';

export class GitCommit {
    public current = false;
    public constructor(
        public message: string,
        public committer: GitSignature,
        public changedFiles: string[],
        public sha: string,
        public id: string,
    ) {}
}
