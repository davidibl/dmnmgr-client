import { DmnXmlService } from "./dmnXmlService";
import { TestDecisionService } from "./testDecisionService";
import { TestSuiteService } from "./testSuiteService";
import { OpenApiDefinitionService } from './openApiDefinitionService';
import { DataModelService } from './dataModelService';
import { SessionDataService } from './sessionDataService';
import { EventService } from './eventService';
import { FileService } from './fileService';
import { DmnProjectService } from './dmnProjectService';

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
];
