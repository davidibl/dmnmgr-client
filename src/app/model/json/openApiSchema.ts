import { JsonObjectDefinitions } from './jsonObjectDefinitions';
import { OpenApiSchemaInfo } from './openApiSchemaInfo';
import { OpenApiSchemaTag } from './openApiSchemaTag';

export interface OpenApiSchema {

    info: OpenApiSchemaInfo;
    definitions: JsonObjectDefinitions;
    host: string;
    basePath: string;
    tags: OpenApiSchemaTag[];
    paths: Object;
}
