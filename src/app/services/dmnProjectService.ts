import { Injectable } from "@angular/core";
import { DmnXmlService } from './dmnXmlService';
import { TestSuiteService } from './testSuiteService';
import { DataModelService } from './dataModelService';
import { DmnProject } from '../model/project/dmnProject';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators/map';
import { EventService } from './eventService';
import { EventType } from '../model/eventType';
import { PluginDescriptor } from '../model/plugin/pluginDescriptor';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { PluginMetaDescriptor } from '../model/plugin/pluginMetaDescriptor';
import { mergeMap, filter } from 'rxjs/operators';

@Injectable()
export class DmnProjectService {

    private _pluginsConfigured: PluginDescriptor[] = [];
    private _pluginsConfiguredSubject = new BehaviorSubject<PluginDescriptor[]>(this._pluginsConfigured);

    private get pluginsConfigured() {
        return this._pluginsConfigured;
    }

    private set pluginsConfigured(pluginsConfigured: PluginDescriptor[]) {
        this._pluginsConfigured = pluginsConfigured;
        this._pluginsConfiguredSubject.next(this._pluginsConfigured);
    }

    public constructor(private _dmnXmlService: DmnXmlService,
        private _testSuiteService: TestSuiteService,
        private _dataModelService: DataModelService,
        private _eventService: EventService) { }

    public getProject(): Observable<{ xml: string, project: DmnProject }> {

        const testsuite = this._testSuiteService.getTestSuiteProject();
        const datamodels = this._dataModelService.getDataModelProject();
        const plugins = this._pluginsConfigured;

        return this._dmnXmlService
            .getXmlModels('editor')
            .pipe(
                map(xml => {
                    return {
                        xml: xml,
                        project: {
                            dmnPath: '.',
                            testsuite: testsuite,
                            definitions: datamodels,
                            plugins: plugins,
                        }
                    };
                })
            );
    }

    public readProject(dmnXml: string, project: DmnProject) {
        this._dataModelService.setDataModelProject(project.definitions);
        this._testSuiteService.setTestSuiteProject(project.testsuite);
        this.pluginsConfigured = (project.plugins) ? project.plugins : [];
        this._dmnXmlService.setXml(dmnXml);
        this._eventService.publishEvent({ type: EventType.PROJECT_LOADED, data: true });
    }

    public createNewProject() {
        this.pluginsConfigured = [];
        this._dataModelService.setDataModelProject({});
        this._testSuiteService.setTestSuiteProject({});
        this._dmnXmlService.createNewDmn();
    }

    public importDmn(dmnXml: string) {
        this._dmnXmlService.setXml(dmnXml);
    }

    public getPlugins() {
        return this._pluginsConfiguredSubject
            .asObservable();
    }

    public getPlugin(id: string) {
        return this._pluginsConfiguredSubject
            .pipe(
                map(plugins => plugins.find(plugin => plugin.id === id))
            );
    }

    public configurePlugin(pluginId: string, configuration: any) {
        this._pluginsConfigured.find(pl => pl.id === pluginId).configuration = configuration;
        this.pluginsConfigured = this._pluginsConfigured;
    }

    public togglePluginActivation(plugin: PluginMetaDescriptor) {
        if (this.isPluginActive(plugin.id)) {
            this.pluginsConfigured =
                this._pluginsConfigured.filter(pluginConfigured => pluginConfigured.id !== plugin.id);
            return;
        }
        this._pluginsConfigured.push({
            id: plugin.id,
            activated: true,
        });
        this.pluginsConfigured = this._pluginsConfigured;
    }

    private isPluginActive(pluginId: string) {
        return !!this.pluginsConfigured.find(pluginConfigured => pluginConfigured.id === pluginId);
    }
}
