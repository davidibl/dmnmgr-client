import { Testsuite } from '../testsuite';

export interface TestsuiteProject {

    [dmnTableId: string]: Testsuite;
}
