export class BaseEvent<T> {
    public constructor(public type: string, public data: T) {}
}
