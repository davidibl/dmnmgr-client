import { Component } from '@angular/core';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event';

@Component({
    selector: 'xn-importer',
    templateUrl: 'importer.html',
    styleUrls: ['importer.scss'],
})
export class ImporterComponent {

    private static SEMICOLON = ';';
    private static NEWLINE_WINDWS = '\r\n';
    private static NEWLINE_UNIX = '\n';

    public separatedData: string;
    public fieldSeparator: string;
    public recordSeparator: string;
    public replaceAll = false;

    public constructor(private _eventService: EventService) {}

    public import() {
        if (!this.separatedData) { return; }

        const recordSeparator = (this.recordSeparator) ? this.recordSeparator :
            (this.separatedData.indexOf(ImporterComponent.NEWLINE_WINDWS) > -1) ?
                ImporterComponent.NEWLINE_WINDWS : ImporterComponent.NEWLINE_UNIX;
        const fieldSeparator = (this.fieldSeparator) ? this.fieldSeparator : ImporterComponent.SEMICOLON;

        const rows = this.separatedData.split(recordSeparator);
        const cols = rows.map(row => row.split(fieldSeparator));

        const event = new BaseEvent<string[][]>('import', cols);
        this._eventService.publishEvent(event);
    }
}
