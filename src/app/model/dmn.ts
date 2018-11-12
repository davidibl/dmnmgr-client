export class Dmn {

    private static DEFAULT_EXTENSION = 'dmn';

    private _filename: string;
    private _filenameTestfile: string;
    private _dmn: string;
    private _testDmn: string;

    public set filename(filename: string) {
        this._filename = filename.replace('.dmn', '');
        this._filenameTestfile = this._filename + '-spec';
    }

    public get filename() {
        return this._filename + Dmn.DEFAULT_EXTENSION;
    }

    public get filenameTestfile() {
        return this._filenameTestfile + Dmn.DEFAULT_EXTENSION;
    }

    public set dmn(dmn: string) {
        this._dmn = dmn;
    }

    public get dmn() {
        return this._dmn;
    }

    public set testdmn(dmn: string) {
        this._testDmn = dmn;
    }

    public get testdmn() {
        return this._testDmn;
    }
}
