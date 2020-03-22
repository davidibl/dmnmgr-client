import { JsonDatatype } from '../json/jsonDatatypes';

export class DmnDatatypeMapping {
    static string = JsonDatatype.STRING;
    static integer = JsonDatatype.INTEGER;
    static long = JsonDatatype.INTEGER;
    static double = JsonDatatype.NUMBER;
    static boolean = JsonDatatype.BOOLEAN;
    static date = JsonDatatype.DATETIME;
}
