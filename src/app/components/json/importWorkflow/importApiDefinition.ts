import { Component, Output, EventEmitter, QueryList, ViewChildren, ViewChild, OnInit, Pipe } from '@angular/core';
import { KeyValuePair, WorkflowState, WorkflowStateTypes, AccordionComponent } from '@xnoname/web-components';
import { OpenApiSchema } from '../../../model/json/openApiSchema';
import { OpenApiDefinitionService } from '../../../services/openApiDefinitionService';
import { ObjectDefinition } from '../../../model/json/objectDefinition';
import { NgForm } from '@angular/forms';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { debounceTime } from 'rxjs/operators/debounceTime';

export class UserInputType {
    static URL = 'url';
    static TEXT = 'text';
}

@Component({
    selector: 'xn-import-api-definition',
    templateUrl: 'importApiDefinition.html',
    styleUrls: ['importApiDefinition.scss'],
})
export class ImportApiDefinitionComponent implements OnInit {

    @ViewChildren(NgForm)
    private _forms: QueryList<NgForm>;

    @ViewChild(AccordionComponent)
    private _accordion: AccordionComponent;

    private _apiDefinition: OpenApiSchema;
    private _apiText: string;
    private _apiUrl: string;

    private _userInputDebounceSubject = new ReplaySubject<string>(1);

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

    public ngOnInit() {
        this._userInputDebounceSubject
            .pipe( debounceTime(500) )
            .subscribe(type => {
                if (type === UserInputType.URL) { this.loadDefinitionFromUrl(); }
                else if (type === UserInputType.TEXT) { this.loadDefinitionFromText() }
            });

    }

    public onApiTextChange(apiText: string) {
        this.apiDefinition = null;
        this._apiText = apiText;
        this._userInputDebounceSubject.next(UserInputType.TEXT);
    }

    public onUrlChange(url: string) {
        this.apiDefinition = null;
        this._apiUrl = url;
        this._userInputDebounceSubject.next(UserInputType.URL);
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
