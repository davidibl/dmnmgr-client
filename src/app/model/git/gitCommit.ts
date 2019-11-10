import { GitSignature } from './gitSignature';

export class GitCommit {
    public constructor(
        public message: string,
        public committer: GitSignature
    ) {}
}
