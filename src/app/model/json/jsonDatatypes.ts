export type JsonDatatypes = 'string' | 'date' | 'date-time' | 'enumeration' |
                            'number' | 'integer' | 'boolean' | 'array' | 'object';
export class JsonDatatype {
    static STRING: JsonDatatypes = 'string';
    static NUMBER: JsonDatatypes = 'number';
    static INTEGER: JsonDatatypes = 'integer';
    static BOOLEAN: JsonDatatypes = 'boolean';
    static DATE: JsonDatatypes = 'date';
    static DATETIME: JsonDatatypes = 'date-time';
    static ENUMERATION: JsonDatatypes = 'enumeration';
    static ARRAY: JsonDatatypes = 'array';
    static OBJECT: JsonDatatypes = 'object';
}
export const JsonDatatypeOptions = [JsonDatatype.STRING, JsonDatatype.NUMBER, JsonDatatype.INTEGER,
                                    JsonDatatype.DATE, JsonDatatype.DATETIME, JsonDatatype.ENUMERATION,
                                    JsonDatatype.BOOLEAN, JsonDatatype.ARRAY, JsonDatatype.OBJECT];
