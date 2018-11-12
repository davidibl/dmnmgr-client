import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { DataEntity } from "../model/dataEntity";
import { DmnXmlService } from './dmnXmlService';
import { map, switchMap } from 'rxjs/operators';
import { Observable } from "rxjs/Observable";
import { KeyValuePair } from "@xnoname/web-components";
import { IDecisionTestCaseResponse } from "../model/decisionTestCaseResponse";
import { DecisionTestCaseResult } from '../model/decisionTestCaseResult';
import { ReplaySubject } from "rxjs/ReplaySubject";

@Injectable()
export class TestDecisionService {

    private _resultSubject = new ReplaySubject<DecisionTestCaseResult>(1);

    public constructor(private _http: HttpClient, private dmnXmlService: DmnXmlService) {}

    public testDecision(data: DataEntity) {
        const result = Object.create(null);
        this.mapDataEntity(result, data);

        this.dmnXmlService
            .getXmlModels('editor')
            .pipe(
                map(xml => {
                    return {
                        variables: result,
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

    private mapDataEntity(result: Object, entity: DataEntity) {
        for (let property of entity.properties) {
            if (property.type !== 'object') {
                result[property.name] = (this.isNull(property.value)) ? null : property.value;
            } else {
                result[property.name] = Object.create(null);
                this.mapDataEntity(result[property.name], property);
            }
        }
    }

    private isNull(value: any) {
        return (value === null || value === undefined);
    }

    private mapResponseToMap(response: IDecisionTestCaseResponse) {
        if (response.result) {
            const result: KeyValuePair[] = [];
            response.result.forEach(responseItem => {
                Object.keys(responseItem).forEach(key => {
                    result.push(new KeyValuePair(key, responseItem[key]));
                });
            });
            return new DecisionTestCaseResult(result, null, response.resultRuleIds);
        }
        return new DecisionTestCaseResult(null, response.message);
    }
}
