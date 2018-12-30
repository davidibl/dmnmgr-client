import { Component, Output, EventEmitter, QueryList, ViewChildren, ViewChild } from '@angular/core';
import { KeyValuePair, WorkflowState, WorkflowStateTypes, AccordionComponent } from '@xnoname/web-components';
import { OpenApiSchema } from '../../../model/json/openApiSchema';
import { OpenApiDefinitionService } from '../../../services/openApiDefinitionService';
import { ObjectDefinition } from '../../../model/json/objectDefinition';
import { NgForm } from '@angular/forms';

@Component({
    selector: 'xn-import-api-definition',
    templateUrl: 'importApiDefinition.html',
    styleUrls: ['importApiDefinition.scss'],
})
export class ImportApiDefinitionComponent {

    @ViewChildren(NgForm)
    private _forms: QueryList<NgForm>;

    @ViewChild(AccordionComponent)
    private _accordion: AccordionComponent;

    private _apiDefinition: OpenApiSchema;
    private _apiText: string;
    private _apiUrl: string;

    public selectedObject: KeyValuePair<string, any>;

    @Output()
    public workflowCompleted = new EventEmitter<ObjectDefinition>();

    public set apiDefinition(apiDefinition: OpenApiSchema) {
        this._apiDefinition = apiDefinition;
    }

    public get apiDefinition() {
        return this._apiDefinition;
    }

    public get apiUrl() {
        return this._apiUrl;
    }

    public get apiText() {
        return this._apiText;
    }

    public constructor(private _openApiDefinitionService: OpenApiDefinitionService) {}

    public onApiTextChange(apiText: string) {
        this.apiDefinition = null;
        this._apiText = apiText;
    }

    public onUrlChange(url: string) {
        this.apiDefinition = null;
        this._apiUrl = url;
    }

    public loadDefinitionFromUrl() {
        this._openApiDefinitionService
            .loadOpenApiDefinitionFromUrl(this._apiUrl)
            .subscribe(result => this.apiDefinition = result);
    }

    public loadDefinitionFromText() {
        this._openApiDefinitionService
            .loadOpenApiFromText(this._apiText)
            .subscribe(result => this.apiDefinition = result);
    }

    public onWorkflowStateChanged(workflowState: WorkflowState) {
        if (workflowState.state === WorkflowStateTypes.FINISHED) {
            const objectDefinitionSelected = this._openApiDefinitionService
                .getApiDefinition(this.selectedObject[0].key, this._apiDefinition.definitions);
            this.workflowCompleted.emit(objectDefinitionSelected);
        }
    }

    public reset() {
        this._forms.forEach(form => form.resetForm());
        this._accordion.openStep(1);
    }
}
