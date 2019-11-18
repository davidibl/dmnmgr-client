import { MostRecentFile } from './mostRecentFile';
import { GitSignatureIdentity } from '../git/gitSignatureIdentity';
import { GitKeys } from './gitKeys';

export class AppConfig {
    simulatorBaseUrl: string;
    mostRecent: MostRecentFile[];
    gitSignature?: GitSignatureIdentity;
    gitKey?: GitKeys;
}
