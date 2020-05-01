import { DmnXmlService } from './dmnXmlService';
import { TestDecisionService } from './testDecisionService';
import { TestSuiteService } from './testSuiteService';
import { OpenApiDefinitionService } from './openApiDefinitionService';
import { DataModelService } from './dataModelService';
import { SessionDataService } from './sessionDataService';
import { EventService } from './eventService';
import { FileService } from './fileService';
import { DmnProjectService } from './dmnProjectService';
import { DeploymentService } from './deploymentService';
import { DmnModelService } from './dmnModelService';
import { PluginRegistryService } from './pluginRegistryService';
import { AppConfigurationService } from './appConfigurationService';
import { ErrorMessageService } from './errorMessageService';
import { SaveStateService } from './saveStateService';
import { ExportService } from './exportService';
import { CsvExportService } from './csvExportService';
import { WorkspaceService } from './workspaceService';
import { GitService } from './gitService';
import { ElectronService } from './electronService';
import { DmnClipboardService } from './dmnClipboardService';
import { DmnValidationService } from './dmnValidationService';
import { WorkingStateService } from './workingStateService';
import { ChangelogService } from './changelogService';

export const ALL_SERVICES = [
    DmnXmlService,
    EventService,
    TestDecisionService,
    TestSuiteService,
    OpenApiDefinitionService,
    DataModelService,
    SessionDataService,
    FileService,
    DmnProjectService,
    DeploymentService,
    DmnModelService,
    PluginRegistryService,
    AppConfigurationService,
    ErrorMessageService,
    SaveStateService,
    ExportService,
    CsvExportService,
    WorkspaceService,
    GitService,
    ElectronService,
    DmnClipboardService,
    DmnValidationService,
    WorkingStateService,
    ChangelogService,
];
