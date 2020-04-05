import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from './dmnXmlService';
import { map, switchMap, take } from 'rxjs/operators';
import { IDecisionSimulationResponse } from '../model/decisionSimulationResponse';
import { DecisionSimulationResult } from '../model/decisionSimulationResult';
import { ReplaySubject, Observable, BehaviorSubject } from 'rxjs';
import { Test } from '../model/test';
import { EventService } from './eventService';
import { NewViewEvent } from '../model/event/newViewEvent';
import { RenameArtefactEvent } from '../model/event/renameArtefactEvent';
import { EventType } from '../model/event/eventType';
import { RestTemplate } from '@xnoname/web-components';
import { AppConfigurationService } from './appConfigurationService';

export interface DeploymentResponse {
    decisionRequirementsId: string;
}

@Injectable()
export class TestDecisionService {

    private readonly API_PREFIX = 'api';
    private readonly API_PATH_SIMULATION = 'decision/simulation';
    private readonly API_PATH_TESTING = 'decision/test';

    private _currentArtefactId: string;

    private _resultSubject = new ReplaySubject<DecisionSimulationResult>(1);
    private _hitsOnlySubject = new BehaviorSubject<boolean>(false);

    public constructor(private _http: HttpClient,
                       private dmnXmlService: DmnXmlService,
                       private _appConfigurationService: AppConfigurationService,
                       private _eventService: EventService) {

        this._eventService
            .getEvent<NewViewEvent>((ev) => ev.type === EventType.NEW_VIEW)
            .subscribe(event => {
                this._currentArtefactId = event.data.artefactId;
            });

        this._eventService
            .getEvent<RenameArtefactEvent>((ev) => ev.type === EventType.RENAME_ARTEFACT)
            .subscribe(event => this._currentArtefactId = event.data.newArtefactId);
    }

    public simulateDecision(simulationData: Object) {
        this._resultSubject.next(null);

        this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                take(1),
                map(xml => {
                    return {
                        dmnTableId: this._currentArtefactId,
                        variables: simulationData,
                        xml: xml
                    };
                }),
                switchMap(_ => this.getUrl(this.API_PATH_SIMULATION), (outer, inner) => ({request: outer, url: inner})),
                switchMap(({url, request}) => this._http
                    .post<IDecisionSimulationResponse>(url, request)),
                map((response: IDecisionSimulationResponse) =>
                    new DecisionSimulationResult(response.result, response.message, response.resultRuleIds, response.resultTableRuleIds))
            ).subscribe(response => this._resultSubject.next(response));
    }

    public testDecision(test: Test, xml?: string, tableId?: string) {
        const request = {
            dmnTableId: (tableId) ? tableId : this._currentArtefactId,
            variables: test.data,
            xml: xml,
            expectedData: test.expectedData
        };
        return this.getUrl(this.API_PATH_TESTING)
            .pipe( switchMap(url => this._http.post<Object>(url, request)) );
    }

    public deployAndTestDecision(test: Test): Observable<Object> {
        return this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                take(1),
                switchMap(xml =>
                    this.testDecision(test, xml, this._currentArtefactId))
            );
    }

    public getResult() {
        return this._resultSubject.asObservable();
    }

    public getShowHitsOnly() {
        return this._hitsOnlySubject.asObservable();
    }

    public setShowHitsOnly(showHitsOnly: boolean) {
        this._hitsOnlySubject.next(showHitsOnly);
    }

    public resetTest() {
        this._resultSubject.next(null);
    }

    private getUrl(path: string): Observable<string> {
        return this._appConfigurationService
            .getBaseUrlSimulator()
            .pipe(
                map(baseUrl => RestTemplate.create(baseUrl)
                        .withPathParameter(this.API_PREFIX)
                        .withPathParameter(path)
                        .build()),
                take(1)
            );
    }
}
