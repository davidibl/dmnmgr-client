import { BaseEvent } from './event';

export class NewViewEvent extends BaseEvent<{ isDecisionTable: boolean, artefactId: string }> {
    public constructor(artefactId: string, isDecisionTable = true) {
        super('newViewEvent', {isDecisionTable: isDecisionTable, artefactId: artefactId});
    }
}
