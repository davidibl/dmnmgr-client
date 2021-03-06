import { Injectable } from '@angular/core';
import { DmnModdleTable } from '../model/dmn/dmnModdleTable';
import { DmnModdleRule } from '../model/dmn/dmnModdleRule';
import { DmnModdleElement } from '../model/dmn/dmnModdleElement';

@Injectable()
export class CsvExportService {

    public static FIELD_DELIMITER = ';';
    public static ROW_DELIMITER = '\r\n';

    public exportTable(dmnTable: DmnModdleTable): string {
        return this.exportRules(dmnTable.rule);
    }

    public exportRules(rules: DmnModdleRule[]): string {
        let data = '';
        rules.forEach(rule => {
            data += this.createRow(rule);
        });
        return data;
    }

    private createRow(rule: DmnModdleRule): string {
        let row = '';
        rule.inputEntry.forEach(entry => {
            row += this.getEntryValue(entry) + CsvExportService.FIELD_DELIMITER;
        });
        rule.outputEntry.forEach(entry => {
            row += this.getEntryValue(entry) + CsvExportService.FIELD_DELIMITER;
        });

        return row.substr(0, row.length - 1) + CsvExportService.ROW_DELIMITER;
    }

    private getEntryValue(entry: DmnModdleElement) {
        return (entry.text) ? entry.text : '';
    }
}
