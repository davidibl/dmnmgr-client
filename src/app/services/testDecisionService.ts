import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from './dmnXmlService';
import { map, switchMap } from 'rxjs/operators';
import { IDecisionTestCaseResponse } from "../model/decisionTestCaseResponse";
import { DecisionTestCaseResult } from '../model/decisionTestCaseResult';
import { ReplaySubject } from "rxjs/ReplaySubject";
import { ObjectDefinition } from '../model/json/objectDefinition';
import { JsonDatatype } from '../model/json/jsonDatatypes';

@Injectable()
export class TestDecisionService {

    private _resultSubject = new ReplaySubject<DecisionTestCaseResult>(1);

    public constructor(private _http: HttpClient, private dmnXmlService: DmnXmlService) { }

    public testDecision(testData: Object) {
        this._resultSubject.next(null);

        this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                map(xml => {
                    return {
                        variables: testData,
                        xml: xml
                    }
                }),
                switchMap(request => this._http.post<IDecisionTestCaseResponse>('http://localhost:11204/api/decision/testcase', request)),
                map(response => this.mapResponseToMap(response))
            ).subscribe(response => this._resultSubject.next(response));
    }

    public getResult() {
        return this._resultSubject.asObservable();
    }

    public resetTest() {
        this._resultSubject.next(null);
    }

    private mapResponseToMap(response: IDecisionTestCaseResponse) {
        if (response.result) {
            if (response.result.length < 1) {
                return new DecisionTestCaseResult(response.result, null, null);
            }
            const datamodel = <ObjectDefinition>{ type: JsonDatatype.ARRAY };
            datamodel.items = <ObjectDefinition>{ type: JsonDatatype.OBJECT, properties: [] };
            Object.keys(response.result[0]).forEach(key => {
                datamodel.items.properties.push({ name: key, type: JsonDatatype.STRING });
            });
            return new DecisionTestCaseResult(response.result, datamodel, null, response.resultRuleIds);
        }
        return new DecisionTestCaseResult(null, null, response.message);
    }
}
