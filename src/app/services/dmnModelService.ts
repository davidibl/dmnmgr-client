import { Injectable } from '@angular/core';
import { DmnModdleRule } from '../model/dmn/dmnModdleRule';
import { MyDmnModdle } from '../model/dmn/dmnModdle';
import { UUID } from '../functions/UUID';
import { DmnType } from '../model/dmn/dmnType';
import { DmnModdleTable } from '../model/dmn/dmnModdleTable';
import { DmnModdleEventType, DmnModdleEventTypes } from '../model/dmn/dmnModdleEventType';
import { DmnModdleEvent } from '../model/dmn/dmnModdleEvent';
import { DmnModdleElement } from '../model/dmn/dmnModdleElement';
import { DataModelService } from './dataModelService';
import { Modeling } from '../model/dmn/modeling';
import { take, map, filter } from 'rxjs/operators';
import { DmnDatatypeMapping } from '../model/dmn/dmnDatatypeMapping';
import { JsonDatatypes } from '../model/json/jsonDatatypes';

@Injectable()
export class DmnModelService {

    public constructor(private _dataModelService: DataModelService) {}

    public updateInputColumns(modeling: Modeling, decisionTable: DmnModdleTable) {
        if (!decisionTable?.input) { return; }

        decisionTable.input.forEach(column => {
            this.setDataModelOnInput(modeling, column, column.inputExpression);
        });
    }

    public setDataModelPropertiesOnColumns(modeling: Modeling, event: DmnModdleEvent) {
        const literalExpression = this.getElementByTypeFromEvent(event, DmnType.LITERAL_EXPRESSION);
        const inputClause = this.getElementByTypeFromEvent(event, DmnType.INPUT_CLAUSE);

        this.setDataModelOnInput(modeling, inputClause, literalExpression);
    }

    public setInputValueRestriction(modeling: Modeling, inputClause: DmnModdleElement, values: string[]) {
        if (!inputClause) { return; }
        if (!!inputClause.inputValues && inputClause.inputValues.text === `"${values.join('","')}"`) {
            return;
        }

        modeling.editAllowedValues(inputClause, values.map(value => `"${value}"`));
    }

    public importData(data: string[][], moddle: MyDmnModdle, decisionTable: DmnModdleTable, replaceRules = false) {

        if (replaceRules) {
            decisionTable.rule.splice(0, decisionTable.rule.length);
        }

        const newRules = <DmnModdleRule[]>[];
        data.forEach(row => {
            const newRule: DmnModdleRule = moddle.create(DmnType.RULE, {
                id: this.generateId(DmnType.RULE)
            });
            newRule.inputEntry = [];
            newRule.outputEntry = [];
            let counter = 0;
            if (decisionTable.input) {
                decisionTable.input.forEach(cell => {
                    const input = newRule
                        .$model
                        .create(DmnType.UNARY_TEST);
                    const escapeChar = this.getEscapeCharToAdd(cell, row[counter]);
                    input.text = (counter < row.length) ? `${escapeChar}${row[counter]}${escapeChar}` : null;
                    input.id = this.generateId(DmnType.UNARY_TEST);
                    newRule.inputEntry.push(input);
                    counter++;
                });
            }

            if (decisionTable.output) {
                decisionTable.output.forEach(cell => {
                    const input = newRule
                        .$model
                        .create(DmnType.LITERAL_EXPRESSION);
                    const escapeChar = this.getEscapeCharToAdd(cell, row[counter]);
                    input.text = (counter < row.length) ? `${escapeChar}${row[counter]}${escapeChar}` : null;
                    input.id = this.generateId(DmnType.LITERAL_EXPRESSION);
                    newRule.outputEntry.push(input);
                    counter++;
                });
            }

            newRules.push(newRule);
        });

        if (!decisionTable.rule) { decisionTable.rule = []; }
        newRules.forEach(rule => decisionTable.rule.push(rule));
    }

    public generateId(type: string) {
        return type.substr(type.indexOf(':') + 1) + UUID.new();
    }

    public hasEscapeChar(value: string) {
        return value.indexOf('"') === 0;
    }

    public dmnModelChangeEventType(event: DmnModdleEvent): DmnModdleEventTypes {
        if (!event) { return DmnModdleEventType.NONE; }
        if (this.isInputClause(event)) { return DmnModdleEventType.INPUT_CLAUSE; }
        if (this.isOutputEntry(event)) { return DmnModdleEventType.OUTPUT_EXPRESSION; }
        return DmnModdleEventType.NONE;
    }

    public isOutputEntry(event: DmnModdleEvent) {
        if (!event.elements || !event.elements[0].$parent) { return false; }
        const changedElement = event.elements[0];
        const parentRule = changedElement.$parent;
        if (!parentRule || !parentRule.outputEntry) { return false; }
        return !!parentRule.outputEntry.find(entry => entry.id === changedElement.id);
    }

    public isInputClause(event: DmnModdleEvent) {
        return (event.elements && event.elements.length > 1 &&
            !!event.elements.find(element => element.$type === DmnType.LITERAL_EXPRESSION));
    }

    private getEscapeCharToAdd(cell: DmnModdleElement, value: string): string {
        const typeRef = cell.inputExpression ? cell.inputExpression.typeRef : cell.typeRef;
        return (typeRef === 'string' &&
                !this.hasEscapeChar(value) &&
                this.hasValue(value)) ? '"' : '';
    }

    private hasValue(csvCell: string): boolean {
        return !!csvCell && csvCell.length > 0;
    }

    private getDmnByJsonType(jsonType: JsonDatatypes) {
        return Object.getOwnPropertyNames(DmnDatatypeMapping)
            .find(name => DmnDatatypeMapping[name] === jsonType);
    }

    private getElementByTypeFromEvent(event: DmnModdleEvent, type: string) {
        return event.elements.find(element => element.$type === type);
    }

    private setDataModelOnInput(modeling: Modeling, inputClause: DmnModdleElement, literalExpression: DmnModdleElement) {
        this._dataModelService
            .getEnumValuesByPath(literalExpression.text)
            .pipe(take(1))
            .subscribe(values => {
                this.setInputValueRestriction(modeling, inputClause, values);
            });
        this._dataModelService
            .getDatatypeByPath(literalExpression.text)
            .pipe(
                take(1),
                map(type => this.getDmnByJsonType(type)),
                filter(type => !!type),
                filter(type => literalExpression.typeRef !== type))
            .subscribe(value =>
                modeling
                    .editInputExpressionTypeRef(literalExpression, value));
    }
}
