import { GitSignatureIdentity } from './gitSignatureIdentity';

export class GitSignature extends GitSignatureIdentity {
    public constructor(
        public name: string,
        public email: string,
        public time: Date
    ) { super(name, email); }
}
