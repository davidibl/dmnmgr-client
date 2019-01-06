import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from './dmnXmlService';
import { map, switchMap } from 'rxjs/operators';
import { IDecisionSimulationResponse } from "../model/decisionSimulationResponse";
import { DecisionSimulationResult } from '../model/decisionSimulationResult';
import { ReplaySubject } from "rxjs/ReplaySubject";
import { Test } from '../model/test';
import { Observable } from 'rxjs';
import { EventService } from './eventService';
import { NewViewEvent } from '../model/newViewEvent';
import { RenameArtefactEvent } from '../model/renameArtefactEvent';
import { EventType } from '../model/eventType';
import { ConfigurationService, RestTemplate } from '@xnoname/web-components';

@Injectable()
export class TestDecisionService {

    private _currentArtefactId: string;

    private _resultSubject = new ReplaySubject<DecisionSimulationResult>(1);

    public constructor(private _http: HttpClient,
                       private dmnXmlService: DmnXmlService,
                       private _configuration: ConfigurationService,
                       private _eventService: EventService) {

        this._eventService
            .getEvent<NewViewEvent>((ev) => ev.type === EventType.NEW_VIEW)
            .subscribe(event => {
                this._currentArtefactId = event.data.artefactId;
                this._resultSubject.next(null);
            });

        this._eventService
            .getEvent<RenameArtefactEvent>((ev) => ev.type === EventType.RENAME_ARTEFACT)
            .subscribe(event => this._currentArtefactId = event.data.artefactId);
    }

    public simulateDecision(simulationData: Object) {
        this._resultSubject.next(null);

        this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                map(xml => {
                    return {
                        dmnTableId: this._currentArtefactId,
                        variables: simulationData,
                        xml: xml
                    }
                }),
                switchMap(request => this._http
                    .post<IDecisionSimulationResponse>(this.getUrl('decision/simulation'), request)),
                map(response => new DecisionSimulationResult(response.result, response.message, response.resultRuleIds))
            ).subscribe(response => this._resultSubject.next(response));
    }

    public testDecision(test: Test): Observable<Object> {
        return this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                map(xml => {
                    return {
                        dmnTableId: this._currentArtefactId,
                        variables: test.data,
                        expectedData: test.expectedData,
                        xml: xml
                    }
                }),
                switchMap(request => this._http.post<Object>(this.getUrl('decision/test'), request)),
            );
    }

    public getResult() {
        return this._resultSubject.asObservable();
    }

    public resetTest() {
        this._resultSubject.next(null);
    }

    private getUrl(path: string) {
        const baseUrl = this._configuration.getConfigValue<string>('endpoints.dmnbackend');
        return RestTemplate.create(baseUrl)
            .withPathParameter('api')
            .withPathParameter(path)
            .build();
    }
}
