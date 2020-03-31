import { FileStatus } from './fileStatus';

export class FileToCommit {

    public constructor(
        public name: string,
        public file: FileStatus,
    ) {}

    static fromChange(change: FileStatus) {
        if (change.path.indexOf('/') > -1) {
            return new FileToCommit(change.path.substring(change.path.lastIndexOf('/')), change);
        }
        return new FileToCommit(change.path, change);
    }
}
