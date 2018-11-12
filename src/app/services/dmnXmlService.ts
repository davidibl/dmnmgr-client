import { Injectable } from "@angular/core";
import { XmlProvider } from '../model/xmlProvider';
import { Observable, ReplaySubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Dmn } from "../model/dmn";

@Injectable()
export class DmnXmlService {

    private _dmn: Dmn;
    private _dmnSubject = new ReplaySubject<Dmn>(1);
    private modelProvider: XmlProvider[] = [];

    public constructor(private _http: HttpClient) {}

    public createNewDmn(filename: string): void {
        this._dmn = new Dmn();
        this._dmn.filename = filename;
        this._http
            .get('./assets/val.xml', { responseType: 'text' })
            .subscribe(response => {
                this._dmn.dmn = response;
                this._dmnSubject.next(this._dmn);
            });
    }

    public addTestSuite() {
        this._http
            .get('./assets/val.xml', { responseType: 'text' })
            .subscribe(response => {
                this._dmn.testdmn = response;
                this._dmnSubject.next(this._dmn);
            });
    }

    public getDmn() {
        return this._dmnSubject;
    }

    public registerModeller(provider: XmlProvider) {
        this.modelProvider.push(provider);
    }

    public getXmlModels(type: string): Observable<string> {
        return this.modelProvider.filter(provider => !type || provider.type === type)[0].saveFunc();
    }
}
