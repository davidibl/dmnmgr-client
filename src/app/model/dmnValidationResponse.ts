import { IDmnValidationResult } from './dmnValidationResult';

export interface IDmnValidationResponse {
    errors: IDmnValidationResult[];
    warnings: IDmnValidationResult[];
}
