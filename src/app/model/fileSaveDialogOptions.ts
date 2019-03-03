export class FileSaveDialogOptions {

    public constructor(public extension: string[],
                       public typeName: string,
                       public title = 'Datei speichern') {}
}
