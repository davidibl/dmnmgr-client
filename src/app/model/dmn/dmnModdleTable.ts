import { DmnModdleRule } from './dmnModdleRule';
import { DmnModdleElement } from './dmnModdleElement';

export interface DmnModdleTable extends DmnModdleElement {
    rule: DmnModdleRule[];
}
