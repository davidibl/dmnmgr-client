import { Injectable } from '@angular/core';
import { DmnXmlService } from './dmnXmlService';
import { take, map, switchMap, tap, finalize, filter } from 'rxjs/operators';
import { AppConfigurationService } from './appConfigurationService';
import { Observable, BehaviorSubject } from 'rxjs';
import { RestTemplate } from '@xnoname/web-components';
import { HttpClient } from '@angular/common/http';
import { IDmnValidationResponse } from '../model/dmnValidationResponse';
import { WorkingStateService } from './workingStateService';
import { EventService } from './eventService';
import { EventType } from '../model/event/eventType';

@Injectable()
export class DmnValidationService {

    private validationWorkingStateId = 'validating';
    private workingStateLabel = 'Validiere...';

    private _lastValidationResult = new BehaviorSubject<IDmnValidationResponse>(null);

    public constructor(
        private _http: HttpClient,
        private _dmnXmlService: DmnXmlService,
        private _appConfigurationService: AppConfigurationService,
        private _workingStateService: WorkingStateService,
        private _eventService: EventService,
    ) {
        this._eventService
            .getEvent(ev => ev.type === EventType.XML_LOADED ||
                            ev.type === EventType.PROJECT_SAVED)
            .pipe(
                switchMap(_ => this._appConfigurationService.getAutoValidation()),
                filter(autoValidation => !!autoValidation),
            ).subscribe(_ => this.validate());

        this._eventService
            .getEvent(ev => ev.type === EventType.XML_LOADED)
            .pipe(
                switchMap(_ => this._appConfigurationService.getAutoValidation()),
                filter(autoValidation => !autoValidation),
            ).subscribe(_ => this.reset());
    }

    public validate() {
        this._dmnXmlService
            .getXmlModels('editor')
            .pipe(
                take(1),
                tap(_ => this.setToValidating()),
                map(xml => {
                    return {
                        xml: xml
                    };
                }),
                switchMap(_ => this.getUrl('decision/validate'), (outer, inner) => ({request: outer, url: inner})),
                switchMap(({url, request}) => this._http
                    .post<IDmnValidationResponse>(url, request)),
                finalize(() => this.resetWorkingState())
            ).subscribe(result => this._lastValidationResult.next(result));
    }

    public getLastValidationResult(): Observable<IDmnValidationResponse> {
        return this._lastValidationResult.asObservable();
    }

    private reset() {
        this._lastValidationResult.next(<IDmnValidationResponse>{});
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

    private setToValidating() {
        this._workingStateService.setState(this.validationWorkingStateId, this.workingStateLabel);
    }

    private resetWorkingState() {
        this._workingStateService.resetState(this.validationWorkingStateId);
    }
}
