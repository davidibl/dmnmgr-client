import { TestBed, async } from '@angular/core/testing';
import { DmnProjectService } from './dmnProjectService';
import { DmnXmlService } from './dmnXmlService';
import { TestSuiteService } from './testSuiteService';
import { DataModelService } from './dataModelService';
import { EventService } from './eventService';
import { DataModelProject } from '../model/project/dataModelProject';
import { PluginDescriptor } from '../model/plugin/pluginDescriptor';
import { of } from 'rxjs';
import { TestsuiteProject } from '../model/project/testsuiteproject';
import { DmnProject } from '../model/project/dmnProject';
import { EventType } from '../model/event/eventType';
import { TabIds } from '../model/tabIds';
import { take } from 'rxjs/operators';

const currentDmnXml = '<dmnxml>';
const dmnPath = '.';
const currentDataModels = <DataModelProject>{ aaa: { requestModel: {name: 'testmodel'}, responseModel: {name: 'response'}} };
const currentTestsuite = <TestsuiteProject>{ aaa: { tests: [{data: {a: 2}, expectedData: [{b: true}], name: 'test1'}]}};
const pluginA = { id: 'pluginA', activated: true };
const pluginB = { id: 'pluginB', activated: true };
const currentPlugins = <PluginDescriptor[]>[pluginA, pluginB];

const completeProject = <DmnProject>{
    definitions: currentDataModels,
    dmnPath: dmnPath,
    plugins: currentPlugins,
    testsuite: currentTestsuite,
};

describe('DmnProjectService', () => {

    let cut: DmnProjectService;
    let dmnXmlService: jasmine.SpyObj<DmnXmlService>;
    let testSuiteService: jasmine.SpyObj<TestSuiteService>;
    let dataModelService: jasmine.SpyObj<DataModelService>;
    let eventService: jasmine.SpyObj<EventService>;

    beforeEach(async(() => {

        const dmnXmlServiceSpy = jasmine.createSpyObj('DmnXmlService',
            ['getXmlModels', 'setXml', 'createNewDmn']);
        const testSuiteServiceSpy = jasmine.createSpyObj('TestSuiteService',
            ['getTestSuiteProject', 'setTestSuiteProject']);
        const dataModelServiceSpy = jasmine.createSpyObj('DataModelService',
            ['getDataModelProject', 'setDataModelProject']);
        const eventServiceSpy = jasmine.createSpyObj('EventService', ['publishEvent']);

        TestBed.configureTestingModule({
            providers: [
                DmnProjectService,
                { provide: EventService, useValue: eventServiceSpy },
                { provide: DmnXmlService, useValue: dmnXmlServiceSpy },
                { provide: TestSuiteService, useValue: testSuiteServiceSpy },
                { provide: DataModelService, useValue: dataModelServiceSpy },
            ]
        });

        cut = TestBed.inject(DmnProjectService);
        eventService = <any>TestBed.inject(EventService);
        dmnXmlService = <any>TestBed.inject(DmnXmlService);
        testSuiteService = <any>TestBed.inject(TestSuiteService);
        dataModelService = <any>TestBed.inject(DataModelService);
    }));

    describe('Project Read and Write', () => {

        it('should initialize', async(() => {

            expect(cut).not.toBeNull();
        }));

        it('should read the complete project from services and combine it with the xml when requested', async(() => {

            dmnXmlService.getXmlModels.and.returnValue(of(currentDmnXml));
            dataModelService.getDataModelProject.and.returnValue(currentDataModels);
            testSuiteService.getTestSuiteProject.and.returnValue(currentTestsuite);
            cut['pluginsConfigured'] = currentPlugins;

            cut.getProject().subscribe(result => {
                expect(result.xml).toEqual(currentDmnXml);
                expect(result.project.dmnPath).toEqual(dmnPath);
                expect(result.project.definitions).toEqual(currentDataModels);
                expect(result.project.testsuite).toEqual(currentTestsuite);
                expect(result.project.plugins).toEqual(currentPlugins);
            });
        }));

        it('should read a complete project and provide it to the datalayer services', async(() => {

            cut.readProject(currentDmnXml, completeProject);

            expect(testSuiteService.setTestSuiteProject).toHaveBeenCalledTimes(1);
            expect(testSuiteService.setTestSuiteProject).toHaveBeenCalledWith(currentTestsuite);

            expect(dataModelService.setDataModelProject).toHaveBeenCalledTimes(1);
            expect(dataModelService.setDataModelProject).toHaveBeenCalledWith(currentDataModels);

            expect(dmnXmlService.setXml).toHaveBeenCalledTimes(1);
            expect(dmnXmlService.setXml).toHaveBeenCalledWith(currentDmnXml);

            expect(cut['_pluginsConfigured']).toEqual(currentPlugins);
        }));

        it('should initialize plugins as empty array when null provided', async(() => {

            const projectWIthPluginsNull = <DmnProject>{
                definitions: currentDataModels,
                dmnPath: dmnPath,
                plugins: null,
                testsuite: currentTestsuite,
            };

            cut.readProject(currentDmnXml, projectWIthPluginsNull);

            expect(cut['_pluginsConfigured']).toEqual([]);
        }));

        it('should fire project loaded event', async(() => {
            cut.readProject(currentDmnXml, completeProject);

            expect(eventService.publishEvent).toHaveBeenCalledWith({ type: EventType.PROJECT_LOADED, data: true });
        }));

        it('should fire event to jump to editor tab', async(() => {
            cut.readProject(currentDmnXml, completeProject);

            expect(eventService.publishEvent).toHaveBeenCalledWith({ type: EventType.JUMP_TO_TAB, data: TabIds.editor });
        }));

        it('should set xml on data service when importing dmn xml', async(() => {
            const newDmnXml = '<new-dmn>';

            cut.importDmn(newDmnXml);

            expect(dmnXmlService.setXml).toHaveBeenCalledWith(newDmnXml);
        }));

        it('should create a new project', async(() => {

            cut.createNewProject();

            expect(testSuiteService.setTestSuiteProject).toHaveBeenCalledTimes(1);
            expect(testSuiteService.setTestSuiteProject).toHaveBeenCalledWith({});

            expect(dataModelService.setDataModelProject).toHaveBeenCalledTimes(1);
            expect(dataModelService.setDataModelProject).toHaveBeenCalledWith({});

            expect(dmnXmlService.createNewDmn).toHaveBeenCalledTimes(1);

            expect(cut['_pluginsConfigured']).toEqual([]);
        }));

        it('should provide plugins as observable', async(() => {

            cut.readProject(currentDmnXml, completeProject);

            cut.getPlugins().subscribe(plugins => expect(plugins).toEqual(currentPlugins));
        }));

        it('should provide a plugin by id', async(() => {

            cut.readProject(currentDmnXml, completeProject);

            cut.getPlugin(pluginA.id).subscribe(plugin => expect(plugin).toEqual(pluginA));
            cut.getPlugin(pluginA.id).subscribe(plugin => expect(plugin).not.toEqual(pluginB));
        }));

        it('should configure a plugin and provide the update', async(() => {

            cut.readProject(currentDmnXml, completeProject);

            cut.getPlugin(pluginA.id).pipe(take(1)).subscribe(plugin => expect(plugin.configuration).toBeUndefined());

            const config = { config: 'aaa'};
            cut.configurePlugin(pluginA.id, config);

            cut.getPlugin(pluginA.id).pipe(take(1)).subscribe(plugin => expect(plugin.configuration).toEqual(config));
        }));

        it('should remove plugin when toggled to inactiv', async(() => {

            cut.readProject(currentDmnXml, completeProject);

            cut.togglePluginActivation({ id: pluginA.id });

            cut.getPlugins().subscribe(plugins => {
                expect(plugins.length).toBe(1);
                expect(plugins[0].id).toEqual(pluginB.id);
            });
        }));

        it('should add new plugin when toggled to activ', async(() => {

            cut.readProject(currentDmnXml, completeProject);

            const pluginCId = 'pluginC';
            cut.togglePluginActivation({ id: pluginCId });

            cut.getPlugins().subscribe(plugins => {
                expect(plugins.length).toBe(3);
            });
        }));
    });
});
