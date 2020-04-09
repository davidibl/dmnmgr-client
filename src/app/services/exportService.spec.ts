import { TestBed, async } from '@angular/core/testing';
import { ExportService } from './exportService';
import { CsvExportService } from './csvExportService';
import { DmnModdleTable } from '../model/dmn/dmnModdleTable';
import { FileService } from './fileService';
import { of } from 'rxjs';
import { FsResultType } from '../model/fileSystemAccessResult';
import { ExportDataType } from '../model/event/exportDataType';

let cut: ExportService;
let csvExportService: jasmine.SpyObj<CsvExportService>;
let fileService: jasmine.SpyObj<FileService>;

describe('ExportService', () => {
    beforeEach(async(() => {
        const csvExportServiceSpy = jasmine.createSpyObj('CsvExportService', ['exportTable']);
        const fileServiceSpy = jasmine.createSpyObj('FileService', ['getSaveLocation', 'saveTextToFile']);

        TestBed.configureTestingModule({
            providers: [
                ExportService,
                { provide: CsvExportService, useValue: csvExportServiceSpy },
                { provide: FileService, useValue: fileServiceSpy },
            ]
        });

        cut = TestBed.inject(ExportService);
        csvExportService = <any>TestBed.inject(CsvExportService);
        fileService = <any>TestBed.inject(FileService);
    }));

    describe('Export data', () => {

        it('should search a target location and export csv', async(() => {

            const valueToWriteToFile = 'test';
            const filepathToSaveTo = 'c:\\';

            fileService.getSaveLocation.and.returnValue(of({ type: FsResultType.OK, filepath: filepathToSaveTo }));
            csvExportService.exportTable.and.returnValue(valueToWriteToFile);
            fileService.saveTextToFile.and.returnValue(of(null));

            const table = <DmnModdleTable>{ decisionTable: { id: '111' }};

            cut.exportTable(table, ExportDataType.CSV);

            expect(fileService.getSaveLocation).toHaveBeenCalledTimes(1);
            expect(csvExportService.exportTable).toHaveBeenCalledTimes(1);
            expect(fileService.saveTextToFile).toHaveBeenCalledTimes(1);
            expect(fileService.saveTextToFile).toHaveBeenCalledWith(filepathToSaveTo, valueToWriteToFile);
        }));

        it('should export empty string when no datattype is passed', async(() => {

            const valueToWriteToFile = 'test';
            const filepathToSaveTo = 'c:\\';

            fileService.getSaveLocation.and.returnValue(of({ type: FsResultType.OK, filepath: filepathToSaveTo }));
            csvExportService.exportTable.and.returnValue(valueToWriteToFile);
            fileService.saveTextToFile.and.returnValue(of(null));

            const table = <DmnModdleTable>{ decisionTable: { id: '111' }};

            cut.exportTable(table, null);

            expect(fileService.getSaveLocation).toHaveBeenCalledTimes(1);
            expect(csvExportService.exportTable).toHaveBeenCalledTimes(0);
            expect(fileService.saveTextToFile).toHaveBeenCalledTimes(1);
            expect(fileService.saveTextToFile).toHaveBeenCalledWith(filepathToSaveTo, '');
        }));

        it('should export nothing when no file is chosen', async(() => {

            fileService.getSaveLocation.and.returnValue(of({ type: FsResultType.NOTHING_SELECTED }));

            const table = <DmnModdleTable>{ decisionTable: { id: '111' }};

            cut.exportTable(table, null);

            expect(fileService.getSaveLocation).toHaveBeenCalledTimes(1);
            expect(csvExportService.exportTable).toHaveBeenCalledTimes(0);
            expect(fileService.saveTextToFile).toHaveBeenCalledTimes(0);
        }));
    });
});
