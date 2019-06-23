import { Injectable } from '@angular/core';
import { XmlProvider } from '../model/xmlProvider';
import { ReplaySubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class DmnXmlService {

    private modelProvider: XmlProvider[] = [];
    private _dmnXmlSubject = new ReplaySubject<string>(1);

    public constructor(private _http: HttpClient) {}

    public createNewDmn(): void {
        this._http
            .get('assets/val.xml', { responseType: 'text' })
            .subscribe(response => {
                this._dmnXmlSubject.next(response);
            });
    }

    public getDmnXml() {
        return this._dmnXmlSubject.asObservable();
    }

    public setXml(xml: string) {
        this._dmnXmlSubject.next(xml);
    }

    public registerModeller(provider: XmlProvider) {
        this.modelProvider.push(provider);
    }

    public getXmlModels(type: string): Observable<string> {
        return this.modelProvider.filter(provider => !type || provider.type === type)[0].saveFunc();
    }
}
