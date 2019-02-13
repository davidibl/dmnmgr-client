import { BaseEvent } from './event';
import { EventType } from './eventType';

export class ImportDataEvent extends BaseEvent<string[][]> {
    public replaceRules = false;
    public constructor(data: string[][], replaceRules?: boolean) {
        super(EventType.IMPORT_DATA, data);
        this.replaceRules = replaceRules;
    }
}
