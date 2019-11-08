export class WorkspaceFileModel {
    constructor(
        public filename: string,
        public filepath: string,
        public active?: boolean
    ) {}

    public get filenameWithoutExtension() {
        return this.filename.substring(0, this.filename.indexOf('.'));
    }
}
