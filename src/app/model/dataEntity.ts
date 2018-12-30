export class DataEntity {

    public value: any;

    public constructor(private _type = 'string',
        public name = '<unknown>',
        public properties?: DataEntity[],
        public arrayElement = false) {}

    public set type(type: string) {
        if (type !== 'object' && type !== 'array') {
            this.properties = null;
        }
        if (type === 'array') {
            if (!this.properties) {
                this.properties = [];
            }
            this.properties
                .filter((property, index) => index > 0)
                .forEach(property => this.removeProperty(property));
            if (this.properties.length  === 0) {
                const newArrayElement = new DataEntity();
                this.properties.push(newArrayElement);
            }
            this.properties[0].arrayElement = true;
        }
        if (type === 'object' && this.properties) {
            this.properties = this.properties
                .map(property => new DataEntity(property.type, property.name, property.properties));
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
        if (this.type === 'array') {
            if (this.properties.length > 0) {
                return;
            }
            newEntity.arrayElement = true;
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
