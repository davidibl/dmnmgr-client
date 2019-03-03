import { BaseEvent } from './event';
import { EventType } from './eventType';
import { ExportDataTypes } from './exportDataType';

export class ExportCommandEvent extends BaseEvent<ExportDataTypes> {
    public constructor(type: ExportDataTypes) {
        super(EventType.EXPORT, type);
    }
}
