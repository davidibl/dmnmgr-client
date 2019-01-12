import { Injectable } from "@angular/core";
import { DmnXmlService } from './dmnXmlService';
import { TestSuiteService } from './testSuiteService';
import { DataModelService } from './dataModelService';
import { DmnProject } from '../model/project/dmnProject';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators/map';
import { EventService } from './eventService';
import { EventType } from '../model/eventType';

@Injectable()
export class DmnProjectService {

    public constructor(private _dmnXmlService: DmnXmlService,
                       private _testSuiteService: TestSuiteService,
                       private _dataModelService: DataModelService,
                       private _eventService: EventService) {}

    public getProject(): Observable<{ xml: string, project: DmnProject }> {

        const testsuite = this._testSuiteService.getTestSuiteProject();
        const datamodels = this._dataModelService.getDataModelProject();

        return this._dmnXmlService
            .getXmlModels('editor')
            .pipe(
                map(xml => {
                    return {
                        xml: xml,
                        project: {
                            dmnPath: '.',
                            testsuite: testsuite,
                            definitions: datamodels
                        }
                    };
                })

            )
    }

    public readProject(dmnXml: string, project: DmnProject) {
        this._dataModelService.setDataModelProject(project.definitions);
        this._testSuiteService.setTestSuiteProject(project.testsuite);
        this._dmnXmlService.setXml(dmnXml);
        this._eventService.publishEvent({ type: EventType.PROJECT_LOADED, data: true });
    }

    public createNewProject() {
        this._dataModelService.setDataModelProject({});
        this._testSuiteService.setTestSuiteProject({});
        this._dmnXmlService.createNewDmn();
    }

    public importDmn(dmnXml: string) {
        this._dmnXmlService.setXml(dmnXml);
    }
}
