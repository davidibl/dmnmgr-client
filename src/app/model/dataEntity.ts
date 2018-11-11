export class DataEntity {

    public value: any;

    public constructor(private _type = 'string',
        public name = '<unknown>',
        public properties?: DataEntity[]) {}

    public set type(type: string) {
        if (type !== 'object') {
            this.properties = null;
        }
        this._type = type;
    }

    public get type() {
        return this._type;
    }

    public addProperty(newEntity: DataEntity) {
        if (!this.properties) {
            this.properties = [];
        }
        this.properties.push(newEntity);
    }

    public removeProperty(entity: DataEntity) {
        if (!this.properties) {
            return;
        }
        this.properties.splice(this.properties.indexOf(entity), 1);
    }
}
