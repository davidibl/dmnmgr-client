import { JsonDatatypes } from './jsonDatatypes';

export interface ObjectDefinition {
    name?: string;
    root?: boolean;
    type?: JsonDatatypes;
    format?: string;
    nullable?: boolean;
    properties?: ObjectDefinition[];
    enum?: string[];
    items?: ObjectDefinition;
}
