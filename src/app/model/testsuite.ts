import { Test } from './test';

export class Testsuite {

    public tests: Test[] = [];

    public constructor() {}

    public addTestCase() {
        this.tests.push(new Test());
    }
}
