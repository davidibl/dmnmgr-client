import { BaseEvent } from './event';
import { EventType } from './eventType';

export class DataChangedEvent extends BaseEvent<void> {
    public constructor() {
        super(EventType.DATA_CHANGED);
    }
}
