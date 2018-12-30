import { JsonObjectDefinitions } from "./jsonObjectDefinitions";
import { JsonDatatypes } from "./jsonDatatypes";

export interface JsonObjectDefinition {
    root?: boolean;
    type?: JsonDatatypes;
    format?: string;
    nullable?: boolean;
    properties?: JsonObjectDefinitions;
    enum?: string[];
    items?: JsonObjectDefinition;
    $ref?: string;
}
