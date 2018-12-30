import { DmnModellerComponent } from './dmnModeller/dmnModeller';
import { DmnManagerComponent } from './dmnManager/dmnManager';
import { TestSuiteComponent } from './testsuite/testSuite';
import { JsonEditorComponent } from './json/jsonEditor';
import { JsonModelEditorComponent } from './json/jsonModelEditor';
import { JsonTreeNodeComponent } from './json/jsonTreeNode';
import { JsonValueEditor } from './json/jsonValueEditor';
import { ImportApiDefinitionComponent } from './json/importWorkflow/importApiDefinition';
import { DataModelEditorComponent } from './dataModelEditor/dataModelEditor';
import { DmnSimulatorComponent } from './simulator/dmnSimulator';
import { FlyinComponent } from './simulator/flyin';
import { DmnResultViewComponent } from './dmnResultView/dmnResultView';

export const ALL_COMPONENTS = [
    DmnModellerComponent,
    DmnManagerComponent,
    TestSuiteComponent,
    JsonEditorComponent,
    JsonModelEditorComponent,
    JsonTreeNodeComponent,
    JsonValueEditor,
    ImportApiDefinitionComponent,
    DataModelEditorComponent,
    DmnSimulatorComponent,
    FlyinComponent,
    DmnResultViewComponent
];
