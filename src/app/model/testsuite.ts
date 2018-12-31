import { Test } from './test';

export class Testsuite {

    public tests: Test[] = [];

    public constructor() {}

    public addTestCase(name?: string, testdata?: any, expectedResult?: any) {
        this.tests.push(new Test(name, testdata, expectedResult));
    }
}
