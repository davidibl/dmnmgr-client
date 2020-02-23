export interface IDecisionSimulationResponse {
    message: string;
    result: Object[];
    resultRuleIds: string[];
    resultTableRuleIds: {[key: string]: string[]};
}
