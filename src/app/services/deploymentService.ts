import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from './dmnXmlService';
import { take, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class DeploymentService {

    public constructor(private _http: HttpClient,
                       private _xmlService: DmnXmlService) {}

    public deployXml(url: string, deloymentName: string): Observable<any> {
        return this._xmlService
            .getXmlModels('editor')
            .pipe(
                take(1),
                switchMap(modelXml => this._http.post(url, { xml: modelXml, deloymentName: deloymentName }))
            );
    }
}
