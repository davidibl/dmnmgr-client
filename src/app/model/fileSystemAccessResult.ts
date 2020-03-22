export type FsResultTypes = 'nothing_selected' | 'ok' | 'error' | 'notFound';
export class FsResultType {
    static NOTHING_SELECTED: FsResultTypes = 'nothing_selected';
    static OK: FsResultTypes = 'ok';
    static ERROR: FsResultTypes = 'error';
    static NOT_FOUND = 'notFound';
}

export interface FileSystemAccessResult<T> {
    type: FsResultTypes;
    message?: string;
    filepath?: string;
    data?: T;
}
