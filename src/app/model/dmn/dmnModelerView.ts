import { DmnModdleElement } from './dmnModdleElement';
import { DmnModelingType } from './dmnModelingType';
import { Modeling } from './modeling';

export interface DmnModelerView {
    element: DmnModdleElement;
    get(value: DmnModelingType): Modeling;
}
