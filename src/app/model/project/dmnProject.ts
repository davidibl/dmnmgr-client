import { TestsuiteProject } from './testsuiteproject';
import { DataModelProject } from './dataModelProject';
import { PluginDescriptor } from '../plugin/pluginDescriptor';

export interface DmnProject {

    dmnPath: string;
    plugins: PluginDescriptor[];
    testsuite: TestsuiteProject;
    definitions: DataModelProject;
}
