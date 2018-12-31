import { ObjectDefinition } from './json/objectDefinition';

export class DecisionTestCaseResult {

    public constructor(public result: Object[],
                       public datamodel: ObjectDefinition,
                       public message?: string,
                       public resultRuleIds?: string[]) {}
}
