import { AppConfig } from './appConfig';

export const DEFAULT_EMPTY_CONFIGURATION: AppConfig = {
    mostRecent: [],
    simulatorBaseUrl: null,
    autoValidation: true,
    gitSignature: {
        name: null,
        email: null
    },
    gitKey: {
        privateKey: null,
        publicKey: null
    }
};
