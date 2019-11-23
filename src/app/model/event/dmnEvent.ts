import { BaseEvent } from './event';

export class DmnEvent extends BaseEvent<string> {
    public constructor(data: string) {
        super('dmn', data);
    }
}
