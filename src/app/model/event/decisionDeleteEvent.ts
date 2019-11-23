import { BaseEvent } from './event';
import { EventType } from './eventType';

export class DecisionDeleteEvent extends BaseEvent<string> {
    public constructor(decisonId: string) {
        super(EventType.DECISON_DELETED, decisonId);
    }
}
