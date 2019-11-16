import { AppConfig } from './appConfig';

export const DEFAULT_EMPTY_CONFIGURATION: AppConfig = {
    mostRecent: [],
    simulatorBaseUrl: 'http://zeus:11401',
    gitSignature: {
        name: null,
        email: null
    }
};
