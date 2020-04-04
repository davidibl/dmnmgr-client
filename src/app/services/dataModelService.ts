import { Injectable } from '@angular/core';
import { ObjectDefinition } from '../model/json/objectDefinition';
import { ReplaySubject, Observable } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { DataModelProject } from '../model/project/dataModelProject';
import { EventService } from './eventService';
import { EventType } from '../model/event/eventType';
import { DataModelTable } from '../model/project/dataModelTable';
import { NewViewEvent } from '../model/event/newViewEvent';
import { RenameArtefactEvent } from '../model/event/renameArtefactEvent';
import { DecisionDeleteEvent } from '../model/event/decisionDeleteEvent';
import { JsonDatatype } from '../model/json/jsonDatatypes';

@Injectable()
export class DataModelService {

    private _currentArtefactId: string;
    private _dataModelProject = <DataModelProject>{};

    private _datamodels = new ReplaySubject<ObjectDefinition>(1);
    private _responseModel = new ReplaySubject<ObjectDefinition>(1);

    public constructor(private _eventService: EventService) {
        this._eventService
            .getEvent<NewViewEvent>((ev) => ev.type === EventType.NEW_VIEW)
            .subscribe(event => this.changeView(event.data.artefactId));
        this._eventService
            .getEvent<RenameArtefactEvent>((ev) => ev.type === EventType.RENAME_ARTEFACT)
            .subscribe(event => this.renameCurrentArtefact(event.data.artefactId, event.data.newArtefactId));
        this._eventService
            .getEvent<DecisionDeleteEvent>((ev) => ev.type === EventType.DECISON_DELETED)
            .subscribe(event => this.deleteDecisonTable(event.data));
    }

    public newDataModel(datamodel: ObjectDefinition) {
        const dataModelTable = this.getOrCreateCurrentTableDataModel(this._currentArtefactId);
        dataModelTable.requestModel = datamodel;
        this.provideRequestModel(this._currentArtefactId);
    }

    public dataModelChanged(datamodel: ObjectDefinition) {
        const dataModelTable = this.getOrCreateCurrentTableDataModel(this._currentArtefactId);
        if (this.isReferenced(dataModelTable.requestModel)) {
            this._dataModelProject[dataModelTable.requestModel.name.substr(5)].requestModel = datamodel;
        } else {
            dataModelTable.requestModel = datamodel;
        }
        this.provideRequestModel(this._currentArtefactId);
    }

    public setDataModelProject(dataModelPoject: DataModelProject) {
        this._currentArtefactId = null;
        this._dataModelProject = dataModelPoject;
        this.provideRequestModel(this._currentArtefactId);
    }

    public getDataModel(): Observable<ObjectDefinition> {
        return this._datamodels
            .pipe(
                map(datamodel => {
                    if (this.isReferenced(datamodel) && !!this._dataModelProject[datamodel.name.substr(5)]) {
                        datamodel = this._dataModelProject[datamodel.name.substr(5)].requestModel;
                    }
                    return datamodel;
                })
            );
    }

    public setCurrentDataModelReference(name: string) {
        const dataModelTable = this.getOrCreateCurrentTableDataModel(this._currentArtefactId);
        if (!name) {
            if (this.isReferenced(dataModelTable.requestModel)) {
                this.newDataModel({ type: JsonDatatype.OBJECT });
            }
            return;
        }
        if (!dataModelTable.requestModel) { dataModelTable.requestModel = {}; }
        if (dataModelTable.requestModel.name === `#ref/${name}`) { return; }
        dataModelTable.requestModel =  { name: `#ref/${name}` };
        this.provideRequestModel(this._currentArtefactId);
    }

    public getCurrentDataModelReference(): Observable<string> {
        return this._datamodels
            .pipe(
                map(datamodel => this.isReferenced(datamodel) ?
                    datamodel.name.substr(5) : null)
            );
    }

    public getDataModelsExceptCurrent(): Observable<string[]> {
        return this.getDataModel()
            .pipe(
                map(_ => {
                    return Object
                        .getOwnPropertyNames(this._dataModelProject)
                        .map(name => {
                            return name;
                        })
                        .filter(result => result !== this._currentArtefactId);
                })
            );
    }

    public getDataModelProject() {
        return this._dataModelProject;
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
                take(1),
                map(datamodel => this.getPropertyByPathSync(datamodel, path))
            );
    }

    public getEnumValuesByPath(path: string) {
        return this.getPropertyByPath(path)
            .pipe(
                take(1),
                filter(property => !!property),
                map(property => property.enum),
                filter(enumeration => !!enumeration)
            );
    }

    public getDatatypeByPath(path: string) {
        return this.getPropertyByPath(path)
            .pipe(
                take(1),
                filter(property => !!property),
                map(property => property.type)
            );
    }

    private getPropertyByPathSync(datamodel: ObjectDefinition, path: string) {
        if (!datamodel || !datamodel.properties) { return null; }
        const searchObject = Object.assign({}, datamodel);
        if (path.indexOf('${') === 0) {
            path = path.replace('${', '').replace('}', '');
        }
        return path
            .split('.')
            .reduce((accumulator, nextPathPart) => {
                if (!accumulator) { return null; }
                const nextValue = accumulator.properties.find(model => model.name === nextPathPart);
                if (!nextValue) { return null; }
                return Object.assign(accumulator, nextValue);
            }, searchObject);
    }

    private changeView(artefactId: string) {
        this._currentArtefactId = artefactId;
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
        if (true) { return; }
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

    private renameCurrentArtefact(artefactId: string, newArtefactId: string) {
        if (this._currentArtefactId !== artefactId) { return; }
        if (this._dataModelProject[this._currentArtefactId]) {
            this._dataModelProject[newArtefactId] = this._dataModelProject[this._currentArtefactId];
            delete this._dataModelProject[this._currentArtefactId];
        }

        Object.getOwnPropertyNames(this._dataModelProject)
            .filter(name => this.isReferenced(this._dataModelProject[name].requestModel))
            .filter(name => this._dataModelProject[name].requestModel.name.indexOf(artefactId) > -1)
            .forEach(name => this._dataModelProject[name].requestModel.name = `#ref/${newArtefactId}`);

        this._currentArtefactId = newArtefactId;
    }

    private deleteDecisonTable(id: string) {
        if (!this._dataModelProject) { return; }
        delete this._dataModelProject[id];
    }

    private isReferenced(datamodel: ObjectDefinition) {
        return (datamodel && datamodel.name && datamodel.name.indexOf('#ref') === 0);
    }

}
