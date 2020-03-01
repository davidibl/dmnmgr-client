import { Injectable } from '@angular/core';
import { DmnXmlService } from './dmnXmlService';
import { take, map, switchMap } from 'rxjs/operators';
import { AppConfigurationService } from './appConfigurationService';
import { Observable, BehaviorSubject } from 'rxjs';
import { RestTemplate } from '@xnoname/web-components';
import { HttpClient } from '@angular/common/http';
import { IDmnValidationResult } from '../model/dmnValidationResult';
import { IDmnValidationResponse } from '../model/dmnValidationResponse';

@Injectable()
export class DmnValidationService {

    private _lastValidationResult = new BehaviorSubject<IDmnValidationResponse>(null);

    public constructor(
        private _http: HttpClient,
        private _dmnXmlService: DmnXmlService,
        private _appConfigurationService: AppConfigurationService
    ) {}

    public validate() {
        this._dmnXmlService
            .getXmlModels('editor')
            .pipe(
                take(1),
                map(xml => {
                    return {
                        xml: xml
                    };
                }),
                switchMap(_ => this.getUrl('decision/validate'), (outer, inner) => ({request: outer, url: inner})),
                switchMap(({url, request}) => this._http
                    .post<IDmnValidationResponse>(url, request))
            ).subscribe(result => this._lastValidationResult.next(result));
    }

    public getLastValidationResult(): Observable<IDmnValidationResponse> {
        return this._lastValidationResult.asObservable();
    }

    private getUrl(path: string): Observable<string> {
        return this._appConfigurationService
            .getBaseUrlSimulator()
            .pipe(
                map(baseUrl => RestTemplate.create(baseUrl)
                        .withPathParameter('api')
                        .withPathParameter(path)
                        .build()),
                take(1)
            );
    }
}
