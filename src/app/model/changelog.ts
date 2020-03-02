import { Change } from './change';

export class Version {

    public constructor(
        public version: string,
        public feat: Change[] = [],
        public improv: Change[] = [],
        public fix: Change[] = [],
        public chore: Change[] = [],
    ) {}
}

export class Changelog {

    public constructor(
        public versions: Version[] = [],
    ) {}
}
