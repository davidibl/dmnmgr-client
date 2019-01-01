import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from './dmnXmlService';
import { map, switchMap } from 'rxjs/operators';
import { IDecisionSimulationResponse } from "../model/decisionSimulationResponse";
import { DecisionSimulationResult } from '../model/decisionSimulationResult';
import { ReplaySubject } from "rxjs/ReplaySubject";
import { ObjectDefinition } from '../model/json/objectDefinition';
import { JsonDatatype } from '../model/json/jsonDatatypes';
import { Test } from '../model/test';
import { Observable } from 'rxjs';

@Injectable()
export class TestDecisionService {

    private _resultSubject = new ReplaySubject<DecisionSimulationResult>(1);

    public constructor(private _http: HttpClient, private dmnXmlService: DmnXmlService) { }

    public simulateDecision(simulationData: Object) {
        this._resultSubject.next(null);

        this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                map(xml => {
                    return {
                        variables: simulationData,
                        xml: xml
                    }
                }),
                switchMap(request => this._http.post<IDecisionSimulationResponse>('http://localhost:11204/api/decision/simulation', request)),
                map(response => this.mapResponseToMap(response))
            ).subscribe(response => this._resultSubject.next(response));
    }

    public testDecision(test: Test): Observable<Object> {
        return this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                map(xml => {
                    return {
                        variables: test.data,
                        expectedData: test.expectedData,
                        xml: xml
                    }
                }),
                switchMap(request => this._http.post<Object>('http://localhost:11204/api/decision/test', request)),
            );
    }

    public getResult() {
        return this._resultSubject.asObservable();
    }

    public resetTest() {
        this._resultSubject.next(null);
    }

    private mapResponseToMap(response: IDecisionSimulationResponse) {
        if (response.result) {
            if (response.result.length < 1) {
                return new DecisionSimulationResult(response.result, null, null);
            }
            const datamodel = <ObjectDefinition>{ type: JsonDatatype.ARRAY };
            datamodel.items = <ObjectDefinition>{ type: JsonDatatype.OBJECT, properties: [] };
            Object.keys(response.result[0]).forEach(key => {
                datamodel.items.properties.push({ name: key, type: JsonDatatype.STRING });
            });
            return new DecisionSimulationResult(response.result, datamodel, null, response.resultRuleIds);
        }
        return new DecisionSimulationResult(null, null, response.message);
    }
}
