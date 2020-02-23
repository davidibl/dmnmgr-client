import { ObjectDefinition } from './json/objectDefinition';

export class DecisionSimulationResult {

    public constructor(public result: Object[],
                       public message?: string,
                       public resultRuleIds?: string[],
                       public resultTableRuleIds?: { [key: string]: string[] }) {}
}
