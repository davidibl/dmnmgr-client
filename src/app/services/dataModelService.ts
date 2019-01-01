import { Injectable } from '@angular/core';
import { ObjectDefinition } from '../model/json/objectDefinition';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators/map';
import { filter } from 'rxjs/operators/filter';
import { DataModelProject } from '../model/project/dataModelProject';
import { EventService } from './eventService';
import { EventType } from '../model/eventType';
import { DataModelTable } from '../model/project/dataModelTable';
import { NewViewEvent } from '../model/newViewEvent';
import { RenameArtefactEvent } from '../model/renameArtefactEvent';

@Injectable()
export class DataModelService {

    private _currentViewId: string;
    private _dataModelProject = <DataModelProject>{};

    private _datamodels = new ReplaySubject<ObjectDefinition>(1);
    private _responseModel = new ReplaySubject<ObjectDefinition>(1);

    public constructor(private _eventService: EventService) {
        this._eventService
            .getEvent<NewViewEvent>((ev) => ev.type === EventType.NEW_VIEW)
            .subscribe(event => this.changeView(event.data.artefactId));
        this._eventService
            .getEvent<RenameArtefactEvent>((ev) => ev.type === EventType.RENAME_ARTEFACT)
            .subscribe(event => this.renameCurrentArtefact(event.data.newArtefactId));
    }

    public newDataModel(datamodel: ObjectDefinition) {
        const dataModelTable = this.getOrCreateCurrentTableDataModel(this._currentViewId);
        dataModelTable.requestModel = datamodel;
        this.provideRequestModel(this._currentViewId);
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

    private changeView(artefactId: string) {
        this._currentViewId = artefactId;
        this.provideRequestModel(artefactId);
        this.provideResponseModel(artefactId);
    }

    private provideRequestModel(artefactId: string) {
        if (!this._dataModelProject[artefactId]) {
            this._datamodels.next(null);
            return;
        }
        this._datamodels.next(this._dataModelProject[artefactId].requestModel);
    }

    private provideResponseModel(artefactId: string) {
        if (!this._dataModelProject[artefactId]) {
            this._responseModel.next(null);
            return;
        }
        this._responseModel.next(this._dataModelProject[artefactId].responseModel);
    }

    private getOrCreateCurrentTableDataModel(artefactId: string): DataModelTable {
        if (!this._dataModelProject[artefactId]) {
            this._dataModelProject[artefactId] = {};
        }
        return this._dataModelProject[artefactId];
    }

    private renameCurrentArtefact(newArtefactId: string) {
        if (this._dataModelProject[this._currentViewId]) {
            this._dataModelProject[newArtefactId] = this._dataModelProject[this._currentViewId];
            delete this._dataModelProject[this._currentViewId];
        }
        this._currentViewId = newArtefactId;
    }
}
