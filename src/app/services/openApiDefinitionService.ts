import { Injectable } from '@angular/core';
import { JsonObjectDefinitions } from '../model/json/jsonObjectDefinitions';
import { JsonDatatype } from '../model/json/jsonDatatypes';
import { JsonObjectDefinition } from '../model/json/jsonObjectDefinition';
import { ObjectDefinition } from '../model/json/objectDefinition';
import { getObjectProperty, RestTemplate } from '@xnoname/web-components';
import { OpenApiSchema } from '../model/json/openApiSchema';
import { Observable, of } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { AppConfigurationService } from './appConfigurationService';

@Injectable()
export class OpenApiDefinitionService {

    private readonly API_PREFIX = 'api';

    public constructor(
        private _http: HttpClient,
        private _appConfigurationService: AppConfigurationService,
    ) {}

    public loadOpenApiFromText(text: string): Observable<OpenApiSchema> {
        return of(text)
            .pipe(
                map(asynctext => JSON.parse(asynctext))
            );
    }

    public loadOpenApiDefinitionFromUrl(url: string): Observable<OpenApiSchema> {

        return this.getOpenApiDefinitionUrl(url)
            .pipe(
                switchMap(backendUrl => this._http
                    .get<{apiUrl: string, swaggerDefinition: string}>(backendUrl)),
                map(response => response.swaggerDefinition),
                map(responseString => JSON.parse(responseString))
            );
    }

    public getApiDefinition(rootObjectName: string, apiDefinition: JsonObjectDefinitions) {
        return this.transformOpenApitoInternalApiDefinition(apiDefinition[rootObjectName], apiDefinition);
    }

    public getModelNamesFromOpenApiSchema(apiDefinition: OpenApiSchema): string[] {
        return Object.getOwnPropertyNames(apiDefinition.definitions);
    }

    public getOpenApiFromInternalApi(objectDefinition: ObjectDefinition) {
        return this.transformInternalToOpenApiDefinition(objectDefinition);
    }

    private transformOpenApitoInternalApiDefinition(obj: JsonObjectDefinition,
                                                    rootObject: JsonObjectDefinitions,
                                                    name?: string) {
        const targetObject = <ObjectDefinition>{};
        if (obj.$ref) {
            Object.assign(obj, this.findReferencedObjectType(obj.$ref, rootObject));
            obj.$ref = void 0;
        }
        targetObject.type = obj.type;
        targetObject.enum = obj.enum;
        targetObject.name = name;
        targetObject.nullable = obj.nullable;
        switch (obj.format) {
            case 'date':
                targetObject.type = JsonDatatype.DATE;
                break;
            case 'date-time':
                targetObject.type = JsonDatatype.DATETIME;
                break;
        }
        if (obj.enum) {
            targetObject.type = JsonDatatype.ENUMERATION;
        }

        if (obj.properties) {
            targetObject.properties = Object
                .getOwnPropertyNames(obj.properties)
                .map(propertyName =>
                    this.transformOpenApitoInternalApiDefinition(obj.properties[propertyName], rootObject, propertyName));
        }
        if (obj.items) {
            targetObject.items = this.transformOpenApitoInternalApiDefinition(obj.items, rootObject);
        }

        return targetObject;
    }

    private transformInternalToOpenApiDefinition(datamodel: ObjectDefinition) {
        const serializedObject = <JsonObjectDefinition>{};
        serializedObject.enum = datamodel.enum;
        serializedObject.nullable = datamodel.nullable;
        serializedObject.properties = (datamodel.properties && datamodel.properties.length > 0) ? {} : null;
        if (datamodel.type === JsonDatatype.ENUMERATION) {
            serializedObject.type = JsonDatatype.STRING;
        }
        if (datamodel.type === JsonDatatype.DATE) {
            serializedObject.type = JsonDatatype.STRING;
            serializedObject.format = 'date';
        }
        if (datamodel.type === JsonDatatype.DATETIME) {
            serializedObject.type = JsonDatatype.STRING;
            serializedObject.format = 'date-time';
        }
        datamodel.properties.forEach(property => {
            const serializedProperty = this.transformInternalToOpenApiDefinition(property);
            serializedObject.properties[property.name] = serializedProperty;
        });
        if (datamodel.items) {
            serializedObject.items = this.transformInternalToOpenApiDefinition(datamodel.items);
        }
        return serializedObject;
    }

    private findReferencedObjectType(path: string, rootObject: JsonObjectDefinitions) {
        const finalPath = path.substring(path.lastIndexOf('/') + 1);
        return getObjectProperty(finalPath, rootObject);
    }

    private getOpenApiDefinitionUrl(url: string): Observable<string> {
        return this._appConfigurationService
            .getBaseUrlSimulator()
            .pipe(
                map(baseUrl => RestTemplate.create(baseUrl)
                        .withPathParameter(this.API_PREFIX)
                        .withPathParameter('open-api-definition')
                        .withQueryParameter('api-url', url)
                        .build()),
                take(1)
            );
    }
}
