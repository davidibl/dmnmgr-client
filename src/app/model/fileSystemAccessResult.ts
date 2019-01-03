export type FsResultTypes = 'nothing_selected' | 'ok' | 'error';
export class FsResultType {
    static NOTHING_SELECTED: FsResultTypes = 'nothing_selected';
    static OK: FsResultTypes = 'ok';
    static ERROR: FsResultTypes = 'error';
}

export interface FileSystemAccessResult<T> {
    type: FsResultTypes;
    message?: string;
    data?: T;
}
