import { DmnModdleElement } from './dmnModdleElement';

export interface DmnModdleRule extends DmnModdleElement {
    inputEntry: DmnModdleElement[];
    outputEntry: DmnModdleElement[];
    description: string;
}
