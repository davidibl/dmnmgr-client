import { BaseEvent } from './event';
import { EventType } from './eventType';

export class NewViewEvent extends BaseEvent<{ isDecisionTable: boolean, artefactId: string }> {
    public constructor(artefactId: string, isDecisionTable = true) {
        super(EventType.NEW_VIEW, {isDecisionTable: isDecisionTable, artefactId: artefactId});
    }
}
