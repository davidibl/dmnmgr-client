import { DmnXmlService } from "./dmnXmlService";
import { TestDecisionService } from "./testDecisionService";
import { TestSuiteService } from "./testSuiteService";
import { OpenApiDefinitionService } from './openApiDefinitionService';
import { DataModelService } from './dataModelService';
import { SessionDataService } from './sessionDataService';
import { EventService } from './eventService';

export const ALL_SERVICES = [
    DmnXmlService,
    TestDecisionService,
    TestSuiteService,
    OpenApiDefinitionService,
    DataModelService,
    SessionDataService,
    EventService,
];
