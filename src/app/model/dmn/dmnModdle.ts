import { DmnModdleElement } from './dmnModdleElement';

export interface MyDmnModdle {
    create<T extends DmnModdleElement>(type: string, properties?: any): T;
}
