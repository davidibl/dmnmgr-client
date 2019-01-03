import { TestsuiteProject } from './testsuiteproject';
import { DataModelProject } from './dataModelProject';

export interface DmnProject {

    dmnPath: string;
    testsuite: TestsuiteProject,
    definitions: DataModelProject;
}
