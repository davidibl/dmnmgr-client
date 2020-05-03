import { Injectable } from '@angular/core';
import { SearchRequest, ReplaceRequest } from '../model/searchRequest';
import { DmnModdleRule } from '../model/dmn/dmnModdleRule';
import { DmnColumn } from '../model/dmn/dmnColumn';
import { Modeling } from '../model/dmn/modeling';
import { DmnModdleTable } from '../model/dmn/dmnModdleTable';
import { DmnModdleElement } from '../model/dmn/dmnModdleElement';

@Injectable()
export class DmnSearchService {

    public searchTablesWithRules(
        tables: DmnModdleElement[],
        searchRequest: SearchRequest,
    ): DmnModdleElement[] {
        return tables
            .map(table => ({table: table, columns: this.getColumnsFromTable(table.input, table.output)}))
            .filter(value => this.searchRules(value.table.decisionTable.rule, value.columns, false, searchRequest).length < 1)
            .map(value => value.table);
    }

    public searchRules(
        rules: DmnModdleRule[],
        columns: DmnColumn[],
        negate: boolean,
        searchRequest: SearchRequest
    ): DmnModdleRule[] {
        const searchValue = searchRequest?.searchValue?.toLowerCase().trim();

        if (!rules) {
                return [];
        }

        if (!searchValue) {
            return (negate) ? [] : rules;
        }

        const columnFilter = this.getColumnFilter(searchRequest.searchColumn, columns);

        return rules
            .filter(rule => (negate) ?
                !this.filterRule(rule, searchValue, columnFilter) :
                this.filterRule(rule, searchValue, columnFilter));
    }

    public replaceByCurrentReplaceSettings(
        modeling: Modeling,
        rule: DmnModdleRule,
        columns: DmnColumn[],
        replaceRequest: ReplaceRequest
    ) {
        const columnFilter = this.getColumnFilter(replaceRequest.replaceColumn, columns);
        const foundElements = this
            .filterRuleGetFoundElements(rule, replaceRequest.replaceWhat, columnFilter);
        const searchMask = new RegExp(replaceRequest.replaceWhat, 'ig');
        if (foundElements.annotationFound) {
            const newVal = rule.description.replace(searchMask, replaceRequest.replaceWith);
            modeling.editAnnotation(rule, newVal);
        }
        if (foundElements.inputEntries) {
            foundElements.inputEntries.forEach(element => {
                const newValue = element.text.replace(searchMask, replaceRequest.replaceWith);
                modeling.editCell(element, newValue);
            });
        }
        if (foundElements.outputEntries) {
            foundElements.outputEntries.forEach(element => {
                const newValue = element.text.replace(searchMask, replaceRequest.replaceWith);
                modeling.editCell(element, newValue);
            });
        }
        return foundElements.inputEntries.length +
            foundElements.outputEntries.length +
            (foundElements.annotationFound ? 1 : 0);
    }

    public getColumnsFromTable(inputColumns: DmnModdleElement[], outputColumns: DmnModdleElement[]) {
        const columns = <DmnColumn[]>[];
        columns.splice(0, 0, ...this.createOutputColumnArray(outputColumns));
        columns.splice(0, 0, ...this.createInputColumnArray(inputColumns));
        columns.push({ label: 'Annotation', id: 'description', type: 'ANNOTATION', index: null });
        return columns;
    }

    private getColumnFilter(searchColumn: string, columns: DmnColumn[]) {
        const column = columns.find(col => col.id === searchColumn);
        return (!searchColumn) ?
            (_: number) => true : (index: number, type?: string) => index === column.index && type === column.type;
    }

    private filterRule(rule: DmnModdleRule, searchValue: string, columnFilter: (index, type?) => boolean) {
        if (!searchValue || !searchValue.trim()) { return false; }

        const found = this.filterRuleGetFoundElements(rule, searchValue, columnFilter);

        return (found.inputEntries.length + found.outputEntries.length) > 0 || found.annotationFound;
    }

    private filterRuleGetFoundElements(rule: DmnModdleRule, searchValue: string, columnFilter: (index, type?) => boolean) {
        const inputEntriesFound = (!!rule.inputEntry) ?
            rule.inputEntry.filter((input, index) =>
                columnFilter(index, 'INPUT') && this.contains(input.text, searchValue)) : [];
        const outputEntriesFound = (!!rule.outputEntry) ?
            rule.outputEntry.filter((output, index) =>
                columnFilter(index, 'OUTPUT') && this.contains(output.text, searchValue)) : [];
        const annotationFound = columnFilter(null, 'ANNOTATION') ? this.contains(rule.description, searchValue) : false;
        return {
            inputEntries: inputEntriesFound,
            outputEntries: outputEntriesFound,
            annotationFound: annotationFound,
        };
    }

    private contains(text: string, searchString: string) {
        if (!text && !searchString) { return true; }
        if (!text) { return false; }
        if (!searchString) { return false; }
        return text.toLowerCase().indexOf(searchString.toLowerCase()) > -1;
    }

    private createOutputColumnArray(columns: DmnModdleElement[]) {
        if (!columns) { return []; }
        return columns.map((column, index) => {
            return {
                label: (column.name) ? column.name : column.id,
                id: column.id,
                index: index,
                type: 'OUTPUT'
            };
        });
    }

    private createInputColumnArray(columns: DmnModdleElement[]) {
        if (!columns) { return []; }
        return columns.map((column, index) => {
            return {
                label: (column.label) ? column.label : column.inputExpression.text,
                id: column.id,
                index: index,
                type: 'INPUT'
            };
        });
    }
}
