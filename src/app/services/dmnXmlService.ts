import { Injectable } from "@angular/core";
import { XmlProvider } from '../model/xmlProvider';
import { Observable } from "rxjs";
import { zip } from "rxjs/operators";

@Injectable()
export class DmnXmlService {

    private modelProvider: XmlProvider[] = [];

    public registerModeller(provider: XmlProvider) {
        this.modelProvider.push(provider);
    }

    public getXmlModels(type: string): Observable<string> {
        return this.modelProvider.filter(provider => !type || provider.type === type)[0].saveFunc();
    }
}
