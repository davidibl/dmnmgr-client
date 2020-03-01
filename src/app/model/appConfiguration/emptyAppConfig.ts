import { AppConfig } from './appConfig';

export const DEFAULT_EMPTY_CONFIGURATION: AppConfig = {
    mostRecent: [],
    simulatorBaseUrl: 'http://zeus:11401',
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
