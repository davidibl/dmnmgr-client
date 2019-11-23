import { DmnModdleTable } from './dmnModdleTable';
import { MyDmnModdle } from './dmnModdle';
import { DmnModdleRule } from './dmnModdleRule';
import { DmnBusinessObject } from './dmnBusinessObject';

export interface DmnModdleElement {
    $type: string;
    id: string;
    name: string;
    text: string;
    label: string;
    expressionLanguage?: string;
    inputValues?: DmnModdleElement;
    inputExpression?: DmnModdleElement;
    input?: DmnModdleElement[];
    output?: DmnModdleElement[];
    decisionTable?: DmnModdleTable;
    $model: MyDmnModdle;
    typeRef: string;
    $parent: DmnModdleRule;
    businessObject: DmnBusinessObject;
}
