import { Injectable } from '@angular/core';
import { JsonObjectDefinitions } from '../model/json/jsonObjectDefinitions';
import { JsonDatatype } from '../model/json/jsonDatatypes';
import { JsonObjectDefinition } from '../model/json/jsonObjectDefinition';
import { ObjectDefinition } from '../model/json/objectDefinition';
import { getObjectProperty, ConfigurationService, RestTemplate } from '@xnoname/web-components';
import { OpenApiSchema } from '../model/json/openApiSchema';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { map } from 'rxjs/operators/map';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class OpenApiDefinitionService {

    public constructor(private _http: HttpClient,
                       private _configuration: ConfigurationService) {}

    public loadOpenApiFromText(text: string): Observable<OpenApiSchema> {
        return of(text)
            .pipe(
                map(text => JSON.parse(text))
            );
    }

    public loadOpenApiDefinitionFromUrl(url: string): Observable<OpenApiSchema> {

        return this._http
            .get<{apiUrl: string, swaggerDefinition: string}>(this.getOpenApiDefinitionUrl(url))
            .pipe(
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
        })
        if (datamodel.items) {
            serializedObject.items = this.transformInternalToOpenApiDefinition(datamodel.items);
        }
        return serializedObject;
    }

    private findRootDefinition(datamodel: JsonObjectDefinitions) {
        return Object.keys(datamodel)
            .map(key => datamodel[key])
            .filter(dataObject => dataObject.root)[0];
    }

    private findReferencedObjectType(path: string, rootObject: JsonObjectDefinitions) {
        const finalPath = path.substring(path.lastIndexOf('/') + 1);
        return getObjectProperty(finalPath, rootObject);
    }

    private getOpenApiDefinitionUrl(url: string) {
        const baseUrl = this._configuration.getConfigValue<string>('endpoints.dmnbackend');
        return RestTemplate.create(baseUrl)
            .withPathParameter('api')
            .withPathParameter('open-api-definition')
            .withQueryParameter('api-url', url)
            .build();
    }
}
