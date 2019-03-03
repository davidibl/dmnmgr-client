import { Injectable } from '@angular/core';
import { DmnModdleElement } from '../model/dmn/dmnModdleElement';
import { ExportDataTypes, ExportDataType } from '../model/event/exportDataType';
import { CsvExportService } from './csvExportService';
import { DmnModdleTable } from '../model/dmn/dmnModdleTable';
import { FileService } from './fileService';
import { FileSaveDialogOptions } from '../model/fileSaveDialogOptions';
import { FsResultType } from '../model/fileSystemAccessResult';

@Injectable()
export class ExportService {

    public constructor(private _csvExportService: CsvExportService,
                       private _fileService: FileService) {}

    public exportTable(dmnTable: DmnModdleTable, datatype: ExportDataTypes) {

        this._fileService
            .getSaveLocation(new FileSaveDialogOptions(['csv'], 'CSV Datei', 'CSV Export speichern'))
            .subscribe(result => {
                if (result.type == FsResultType.OK) {
                    this.exportData(result.filepath, dmnTable, datatype);
                }
            });
    }

    private exportData(filepath: string, dmnTable: DmnModdleTable, datatype: ExportDataTypes) {
        let data: string;
        switch (datatype) {
            case ExportDataType.CSV:
                data = this._csvExportService.exportTable(dmnTable);
                break;
            default:
                data = '';
                break;
        }
        this._fileService
            .saveTextToFile(filepath, data)
            .subscribe();
    }
}
