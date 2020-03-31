import { FileStatus } from './fileStatus';

export class NewCommit {

    public constructor(
        public message: string,
        public commitAll: boolean,
        public filesToCommit: FileStatus[],
    ) {}
}
