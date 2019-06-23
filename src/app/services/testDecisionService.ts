import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from './dmnXmlService';
import { map, switchMap } from 'rxjs/operators';
import { IDecisionSimulationResponse } from '../model/decisionSimulationResponse';
import { DecisionSimulationResult } from '../model/decisionSimulationResult';
import { ReplaySubject, Observable } from 'rxjs';
import { Test } from '../model/test';
import { EventService } from './eventService';
import { NewViewEvent } from '../model/event/newViewEvent';
import { RenameArtefactEvent } from '../model/event/renameArtefactEvent';
import { EventType } from '../model/event/eventType';
import { ConfigurationService, RestTemplate } from '@xnoname/web-components';

export interface DeploymentResponse {
    decisionRequirementsId: string;
}

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
                    };
                }),
                switchMap(request => this._http
                    .post<IDecisionSimulationResponse>(this.getUrl('decision/simulation'), request)),
                map((response: IDecisionSimulationResponse) =>
                    new DecisionSimulationResult(response.result, response.message, response.resultRuleIds))
            ).subscribe(response => this._resultSubject.next(response));
    }

    public deployDecision(): Observable<DeploymentResponse> {
        return this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                switchMap(xml => this._http.post<DeploymentResponse>(this.getUrl('decision'), { xml: xml }))
            );
    }

    public testDecision(test: Test, requirementsId?: string, tableId?: string) {
        const request = {
            dmnTableId: (tableId) ? tableId : this._currentArtefactId,
            variables: test.data,
            expectedData: test.expectedData,
            decisionRequirementsId: requirementsId
        };
        return this._http.post<Object>(this.getUrl('decision/test'), request);
    }

    public deployAndTestDecision(test: Test): Observable<Object> {
        return this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                switchMap(xml => this._http.post<DeploymentResponse>(this.getUrl('decision'), { xml: xml })),
                switchMap((deployment: DeploymentResponse) =>
                    this.testDecision(test, deployment.decisionRequirementsId, this._currentArtefactId))
            );
    }

    public clearProcessEngine() {
        this._http.delete<void>(this.getUrl('decision')).subscribe();
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
