import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from './dmnXmlService';
import { take } from 'rxjs/operators/take';
import { switchMap } from 'rxjs/operators/switchMap';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class DeploymentService {

    public constructor(private _http: HttpClient,
                       private _xmlService: DmnXmlService) {}

    public deployXml(url: string): Observable<any> {
        return this._xmlService
            .getXmlModels('editor')
            .pipe(
                take(1),
                switchMap(modelXml => this._http.post(url, { xml: modelXml }))
            );
    }
}
