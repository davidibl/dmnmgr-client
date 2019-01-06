import { Component } from '@angular/core';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event';

@Component({
    selector: 'xn-importer',
    templateUrl: 'importer.html',
    styleUrls: ['importer.scss'],
})
export class ImporterComponent {

    public separatedData: string;

    public constructor(private _eventService: EventService) {}

    public import() {
        const rowSeparator = (this.separatedData.indexOf('\r\n') > -1) ? '\r\n' : '\n';
        const rows = this.separatedData.split(rowSeparator);
        const cols = rows.map(row => row.split(';'));

        const event = new BaseEvent<string[][]>('import', cols);
        this._eventService.publishEvent(event);
    }
}
