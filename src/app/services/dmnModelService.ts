import { Injectable } from '@angular/core';
import { DmnModdleRule } from '../model/dmn/dmnModdleRule';
import { MyDmnModdle } from '../model/dmn/dmnModdle';
import { UUID } from '../functions/UUID';
import { DmnType } from '../model/dmn/dmnType';
import { DmnModdleTable } from '../model/dmn/dmnModdleTable';

@Injectable()
export class DmnModelService {

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
                    cell.typeRef
                    const input = newRule
                        .$model
                        .create(DmnType.UNARY_TEST);
                    const escapeChar = (cell.typeRef === 'string' && !this.hasEscapeChar(row[counter])) ? '"' : '';
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
                    const escapeChar = (cell.typeRef === 'string' && !this.hasEscapeChar(row[counter])) ? '"' : '';
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
}
