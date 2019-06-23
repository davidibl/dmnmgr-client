export type DmnModdleEventTypes = 'none' | 'output_expression' | 'input_expression' |
                            'output_clause' | 'input_clause';

export class DmnModdleEventType {
    static NONE: DmnModdleEventTypes = 'none';
    static OUTPUT_EXPRESSION: DmnModdleEventTypes = 'output_expression';
    static INPUT_EXPRESSION: DmnModdleEventTypes = 'input_expression';
    static OUTPUT_CLAUSE: DmnModdleEventTypes = 'output_clause';
    static INPUT_CLAUSE: DmnModdleEventTypes = 'input_clause';
}
