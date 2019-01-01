import { ObjectDefinition } from './json/objectDefinition';

export class DecisionSimulationResult {

    public constructor(public result: Object[],
                       public datamodel: ObjectDefinition,
                       public message?: string,
                       public resultRuleIds?: string[]) {}
}
