import { DmnModellerComponent } from './dmnModeller/dmnModeller';
import { DmnManagerComponent } from './dmnManager/dmnManager';
import { TestSuiteComponent } from './testsuite/testSuite';
import { JsonEditorComponent } from './json/jsonEditor';
import { JsonModelEditorComponent } from './json/jsonModelEditor';
import { JsonTreeNodeComponent } from './json/jsonTreeNode';
import { JsonValueEditorComponent } from './json/jsonValueEditor';
import { ImportApiDefinitionComponent } from './json/importWorkflow/importApiDefinition';
import { DataModelEditorComponent } from './dataModelEditor/dataModelEditor';
import { DmnSimulatorComponent } from './simulator/dmnSimulator';
import { FlyinComponent } from './simulator/flyin';
import { DmnResultViewComponent } from './dmnResultView/dmnResultView';
import { ImporterComponent } from './importer/importer';
import { IframeTabComponent } from './plugin/iframeTab/iframeTab';
import { WorkspaceComponent } from './workspace/workspace';
import { CommitComponent } from './workspace/commit';
import { AllTestsDialogComponent } from './testsuite/allTestsDialog';
import { CommitDialogComponent } from './commitDialog/commitDialog';
import { SettingsComponent } from './settings/settings';
import { DmnmgrDocumentationComponent } from './documentation/dmnmgrDocumentation';
import { MessageDialogComponent } from './dialogs/messageDialog';
import { AboutDialogComponent } from './dialogs/aboutDialog';
import { CloneRepositoryDialogComponent } from './dialogs/cloneRepositoryDialog';
import { MainMenuComponent } from './app/mainMenu';
import { ALL_DOCUMENTATION_COMPONENTS } from './documentation/documentationComponents';
import { NewBranchDialogComponent } from './dialogs/newBranchDialog';
import { FooterFlyinComponent } from './footerBar/footerFlyin';
import { ChangelogDialogComponent } from './dialogs/changelogDialog';

export const ALL_COMPONENTS = [
    DmnModellerComponent,
    DmnManagerComponent,
    TestSuiteComponent,
    JsonEditorComponent,
    JsonModelEditorComponent,
    JsonTreeNodeComponent,
    JsonValueEditorComponent,
    ImportApiDefinitionComponent,
    DataModelEditorComponent,
    DmnSimulatorComponent,
    FlyinComponent,
    DmnResultViewComponent,
    ImporterComponent,
    IframeTabComponent,
    WorkspaceComponent,
    CommitComponent,
    AllTestsDialogComponent,
    CommitDialogComponent,
    SettingsComponent,
    DmnmgrDocumentationComponent,
    MessageDialogComponent,
    AboutDialogComponent,
    CloneRepositoryDialogComponent,
    MainMenuComponent,
    NewBranchDialogComponent,
    FooterFlyinComponent,
    ChangelogDialogComponent,
    ...ALL_DOCUMENTATION_COMPONENTS,
];
