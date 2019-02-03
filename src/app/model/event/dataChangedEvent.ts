import { BaseEvent } from './event';
import { EventType } from './eventType';
import { DataChangeTypes } from './dataChangedType';

export class DataChangedEvent extends BaseEvent<DataChangeTypes> {
    public constructor(type: DataChangeTypes) {
        super(EventType.DATA_CHANGED, type);
    }
}
