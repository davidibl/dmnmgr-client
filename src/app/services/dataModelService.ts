import { Injectable } from '@angular/core';
import { ObjectDefinition } from '../model/json/objectDefinition';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators/map';
import { filter } from 'rxjs/operators/filter';

@Injectable()
export class DataModelService {

    private _datamodels = new ReplaySubject<ObjectDefinition>(1);
    private _responseModel = new ReplaySubject<ObjectDefinition>(1);

    public newDataModel(datamodel: ObjectDefinition) {
        this._datamodels.next(datamodel);
    }

    public getDataModel(): Observable<ObjectDefinition> {
        return this._datamodels.asObservable();
    }

    public setResponseModel(responseModel: ObjectDefinition) {
        this._responseModel.next(responseModel);
    }

    public getResponseModel() {
        return this._responseModel.asObservable();
    }

    public getPropertyByPath(path: string): Observable<ObjectDefinition> {
        return this._datamodels
            .pipe(
                map(datamodel => this.getPropertyByPathSync(datamodel, path))
            );
    }

    public getEnumValuesByPath(path: string) {
        return this.getPropertyByPath(path)
            .pipe(
                filter(property => !!property),
                map(property => property.enum),
                filter(enumeration => !!enumeration)
            );
    }

    public getDatatypeByPath(path: string) {
        return this.getPropertyByPath(path)
            .pipe(
                filter(property => !!property),
                map(property => property.type)
            );
    }

    private getPropertyByPathSync(datamodel: ObjectDefinition, path: string) {
        return path
            .split('.')
            .reduce((accumulator, nextPathPart) =>
                Object.assign(accumulator,
                    datamodel.properties.find(model => model.name === nextPathPart)), {});
    }
}
