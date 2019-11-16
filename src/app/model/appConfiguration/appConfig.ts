import { MostRecentFile } from './mostRecentFile';
import { GitSignatureIdentity } from '../git/gitSignatureIdentity';

export class AppConfig {
    simulatorBaseUrl: string;
    mostRecent: MostRecentFile[];
    gitSignature?: GitSignatureIdentity;
}
