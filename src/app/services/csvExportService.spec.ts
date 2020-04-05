import { TestBed, async } from '@angular/core/testing';
import { CsvExportService } from './csvExportService';
import { DmnModdleRule } from '../model/dmn/dmnModdleRule';
import { DmnModdleElement } from '../model/dmn/dmnModdleElement';
import { DmnModdleTable } from '../model/dmn/dmnModdleTable';

describe('Csv Export Service', () => {
    beforeEach(async(() => {

        TestBed.configureTestingModule({
        }).compileComponents();
    }));

    describe('export', () => {

        it('should export one dmn rule with inputEntries', async(() => {

            const cut = new CsvExportService();
            const rules: DmnModdleRule[] = [
                createRule([
                    createEntry('test'),
                    createEntry('Hallo')
                ], [
                    createEntry('Hui')
                ])
            ];
            const csv = cut.exportRules(rules);
            expect(csv).toEqual('test;Hallo;Hui\r\n');
        }));

        it('should export an array dmn rule with inputEntries with linebreak at the end', async(() => {

            const cut = new CsvExportService();
            const rules: DmnModdleRule[] = [
                createRule([
                    createEntry('test'),
                    createEntry('Hallo')
                ], [
                    createEntry('Hui')
                ]),
                createRule([
                    createEntry('test'),
                    createEntry('Hallo')
                ], [
                    createEntry('Hui')
                ]),
                createRule([
                    createEntry('test'),
                    createEntry('Hallo')
                ], [
                    createEntry('Hui')
                ])
            ];
            const csv = cut.exportRules(rules);
            expect(csv).toEqual('test;Hallo;Hui\r\ntest;Hallo;Hui\r\ntest;Hallo;Hui\r\n');
        }));

        it('should export a whole dmn table', async(() => {

            const cut = new CsvExportService();
            const rules: DmnModdleRule[] = [
                createRule([
                    createEntry('test'),
                    createEntry('Hallo')
                ], [
                    createEntry('Hui')
                ]),
                createRule([
                    createEntry('test'),
                    createEntry('Hallo')
                ], [
                    createEntry('Hui')
                ]),
                createRule([
                    createEntry('test'),
                    createEntry('Hallo')
                ], [
                    createEntry('Hui')
                ])
            ];
            const table: DmnModdleTable = <DmnModdleTable>{
                rule: rules
            };

            const csv = cut.exportRules(rules);
            expect(csv).toEqual('test;Hallo;Hui\r\ntest;Hallo;Hui\r\ntest;Hallo;Hui\r\n');
        }));
    });
});

export function createEntry(text: string): DmnModdleElement {
    return <DmnModdleElement>{ text: text };
}

export function createRule(inputEntry: DmnModdleElement[], outputEntry?: DmnModdleElement[]) {
    return <DmnModdleRule>{ inputEntry: inputEntry, outputEntry: outputEntry };
}
