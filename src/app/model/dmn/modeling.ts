import { DmnBusinessObject } from './dmnBusinessObject';
import { DmnModdleRule } from './dmnModdleRule';
import { DmnModdleElement } from './dmnModdleElement';

export interface Modeling {
    editAllowedValues(businessObject: DmnBusinessObject, restrictionSet: string[]);
    editAnnotation(rule: DmnModdleRule, value: string);
    editCell(cell: any, value: string);
    editDecisionTableId(newId: string);
    editDecisionTableName(newName);
    editExpressionLanguage(element: DmnModdleElement, language: string);
    editHitPolicy(hitPolicy: string, aggregation: string);
    editInputExpression(inputExpression: unknown, value);
    editInputExpressionTypeRef(inputExpression: unknown, typeRef: string);
    editOutputName(output: DmnModdleElement, newName: string);
    editOutputTypeRef(output: DmnModdleElement, typeRef: string);

    addRow(ruleConfig: Object): { cells: DmnBusinessObject[] };
    removeRow(ruleConfig: Object);
}
