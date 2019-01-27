import { DmnModdleTable } from './dmnModdleTable';
import { MyDmnModdle } from './dmnModdle';

export interface DmnModdleElement {
    $type: string;
    id: string;
    name: string;
    text: string;
    label: string;
    inputValues?: DmnModdleElement;
    inputExpression?: DmnModdleElement;
    input?: DmnModdleElement[];
    output?: DmnModdleElement[];
    decisionTable?: DmnModdleTable;
    $model: MyDmnModdle;
    typeRef: string;
    $parent: DmnModdleElement;
}
