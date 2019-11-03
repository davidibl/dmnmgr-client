import { Component, ViewChild, ElementRef, AfterViewInit, Input, Output, HostListener, OnInit, Inject, Renderer2 } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { take, filter, map, debounceTime } from 'rxjs/operators';

import DmnModdle from 'dmn-moddle/lib/dmn-moddle.js';

import { DataModelService } from '../../services/dataModelService';
import { DmnXmlService } from '../../services/dmnXmlService';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { JsonDatatype, JsonDatatypes } from '../../model/json/jsonDatatypes';
import { EventService } from '../../services/eventService';
import { NewViewEvent } from '../../model/event/newViewEvent';
import { RenameArtefactEvent } from '../../model/event/renameArtefactEvent';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { DOCUMENT } from '@angular/platform-browser';
import { DecisionDeleteEvent } from '../../model/event/decisionDeleteEvent';
import { EventType } from '../../model/event/eventType';
import { DmnModelService } from '../../services/dmnModelService';
import { DmnModdleElement } from '../../model/dmn/dmnModdleElement';
import { DmnModdleRule } from '../../model/dmn/dmnModdleRule';
import { DmnType } from '../../model/dmn/dmnType';
import { MyDmnModdle } from '../../model/dmn/dmnModdle';
import { DataChangedEvent } from '../../model/event/dataChangedEvent';
import { DataChangeType } from '../../model/event/dataChangedType';
import { SaveStateService } from '../../services/saveStateService';
import { ImportDataEvent } from '../../model/event/importDataEvent';
import { ExportService } from '../../services/exportService';
import { DmnExpressionLanguage } from '../../model/dmn/dmnExpressionLanguage';
import { DmnModdleEvent } from '../../model/dmn/dmnModdleEvent';
import { DmnModdleEventType } from '../../model/dmn/dmnModdleEventType';

declare var DmnJS: {
    new(object: object, object2?: object): DMNJS;
};

declare interface DMNJS {
    _viewers: any;
    _activeView: DmnModelerView;
    _moddle: MyDmnModdle;
    importXML(xml: string, callback: (error: any) => void);
    saveXML(options: any, callback: (error: any, xml: string) => void);
    getViews(): DmnModelerView[];
    on(eventname: string, eventCallback: (event) => void);
    _updateViews(): void;
    _switchView(tableId: string);
}

export interface DmnModelerView {
    element: DmnModdleElement;
}

export interface ShapeEvent {
    context: ShapeEventContext;
}

export interface ShapeEventContext {
    shape: Shape;
}

export interface Shape {
    id: string;
}

export class DmnDatatypeMapping {
    static string = JsonDatatype.STRING;
    static integer = JsonDatatype.INTEGER;
    static long = JsonDatatype.INTEGER;
    static double = JsonDatatype.NUMBER;
    static boolean = JsonDatatype.BOOLEAN;
    static date = JsonDatatype.DATETIME;
}

export interface DmnColumn {
    label: string;
    id: string;
    index: number;
    type: string;
}

@Component({
    selector: 'xn-dmn-modeller',
    templateUrl: 'dmnModeller.html',
    styleUrls: ['dmnModeller.scss'],
})
export class DmnModellerComponent implements AfterViewInit, OnInit {

    private static SAVE_OPTIONS = { format: true };

    private initialized = false;
    private drdListenerInited = false;

    @ViewChild('canvas')
    private _container: ElementRef;

    private _modeller: DMNJS;
    private _searchStylesheet: any;

    private _errorNodes: any[] = [];

    private _internalEventService = new ReplaySubject<{ type: string, identity: any, func: () => void }>();
    private _debounceSubject = new ReplaySubject<() => void>(1);

    @Input()
    public type: string;

    public searchOpen = false;
    public searchValue: string;
    public searchColumn: string = null;
    public currentColumns: DmnColumn[] = [];

    public constructor(private _dmnXmlService: DmnXmlService,
        private _eventService: EventService,
        @Inject(DOCUMENT) private document,
        private _dmnModelService: DmnModelService,
        private renderer: Renderer2,
        private _exportService: ExportService,
        private _dataModelService: DataModelService,
        private _saveStateService: SaveStateService) { }

    @HostListener('window:keyup', ['$event'])
    public handleKeyboardEvent(event: KeyboardEvent) {
        if (!this._modeller._activeView.element.decisionTable) {
            return;
        }

        if (event.ctrlKey && event.code === 'KeyF') {
            this.searchOpen = !this.searchOpen;
            if (!this.searchOpen) {
                this.clearSearch();
            }
        }
    }

    public closeAndClearSearch() {
        this.searchOpen = false;
        this.clearSearch();
    }

    public onSearchValueChanged(newSearchValue: string) {
        this.searchValue = newSearchValue;
        this._debounceSubject.next(() => this.searchRows());
    }

    public onSearchColumnChanged(newSearchColumn: string) {
        this.searchColumn = newSearchColumn;
        this.searchRows();
    }

    public ngOnInit(): void {
        const styleElement = this.renderer.createElement('style');
        const text = this.renderer.createText('');
        this.renderer.appendChild(styleElement, text);
        this.renderer.appendChild(this.document.head, styleElement);
        this._searchStylesheet = styleElement.sheet;

        this._debounceSubject.pipe( debounceTime(500) ).subscribe(func => func());

        this._eventService
            .getEvent((ev) => ev.type === EventType.OPEN_SEARCH)
            .subscribe(_ => this.searchOpen = true);

        this._eventService
            .getEvent((ev) => ev.type === EventType.EXPORT)
            .subscribe((ev) => this._exportService.exportTable(
                this._modeller._activeView.element.decisionTable, ev.data));

        this._eventService
            .getEvent((ev) => ev.type === EventType.JUMP_TO_TEST)
            .subscribe((ev) => this.selectTable(ev.data));
    }

    public ngAfterViewInit(): void {

        this._internalEventService
            .pipe(
                distinctUntilChanged((e1, e2) => e1.identity === e2.identity && e1.type === e2.type)
            )
            .subscribe(e => e.func());

        this._modeller = new DmnJS({
            container: this._container.nativeElement,
            keyboard: {
                bindTo: window
            }
        });

        this._dmnXmlService
            .getDmnXml()
            .subscribe(xml => {
                this._modeller.importXML(xml, (err) => {
                    if (err) {
                        console.log('error rendering', err);
                    }
                    this._saveStateService.resetChange(DataChangeType.DMN_MODEL);
                    this._internalEventService.next({
                        identity: 12345,
                        type: 'views.changed',
                        func: () => {}
                    });
                    if (this.initialized) {
                        return;
                    }
                    this.configureModeller();
                    this.initialized = true;
                });
            });

        this._dmnXmlService.createNewDmn();

        this._dmnXmlService.registerModeller({
            type: this.type,
            saveFunc: () => {
                const subject = new ReplaySubject<string>(1);
                this._modeller.saveXML(DmnModellerComponent.SAVE_OPTIONS, (error, result) => {
                    subject.next(result);
                });
                return subject.asObservable().pipe(distinctUntilChanged());
            }
        });

        this._dataModelService
            .getDataModel()
            .subscribe(datamodel => this.updateInputColumns(datamodel));

        this._eventService
            .getEvent((event) => event.type === EventType.IMPORT_DATA)
            .subscribe(importEvent => this.importData(importEvent as ImportDataEvent));
    }

    private refreshTableColumnsList() {
        if (!this._modeller._activeView.element.decisionTable) {
            this.currentColumns = [];
            return;
        }

        const columns = <DmnColumn[]>[];
        columns.splice(0, 0, ...this.createOutputColumnArray());
        columns.splice(0, 0, ...this.createInputColumnArray());
        columns.push({ label: 'Annotation', id: 'description', type: 'ANNOTATION', index: null });
        this.currentColumns = columns;
    }

    private configureModeller() {
        this._modeller.on('views.changed', (event) => {
            this.clearSearch();
            const ev = new NewViewEvent(event.activeView.element.id);
            if (event.activeView.type !== 'decisionTable') {
                ev.data.isDecisionTable = false;
            }
            this._internalEventService.next({
                identity: event.activeView.element.id,
                type: 'views.changed',
                func: () => {
                    this._eventService.publishEvent(ev);
                    this.updateResponseModel();
                }
            });
            if (!this.drdListenerInited) {
                this.initDrdListeners();
            }
        });
        this._modeller._viewers.decisionTable.on('elements.changed', (event: DmnModdleEvent) => {
            switch (this._dmnModelService.dmnModelChangeEventType(event)) {
                case DmnModdleEventType.INPUT_CLAUSE:
                    this.setDataModelPropertiesOnColumns(event);
                    break;
                case DmnModdleEventType.OUTPUT_EXPRESSION:
                    this.fixMissingExpressionLanguage(event);
                    break;
            }
            this.checkAllErrors();
            this.updateResponseModel();
            this.refreshTableColumnsList();
            this._eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));
        });
        this._modeller._viewers.decisionTable.on('element.updateId', (event) => {
            if (event.element && event.element.$type === DmnType.DECISION_TABLE) {
                if (event.element.id === event.newId) { return; }
                this._internalEventService.next({
                    type: 'element.updateId',
                    identity: event.newId,
                    func: () => this._eventService.publishEvent(new RenameArtefactEvent(event.element.id, event.newId))
                });
            }
        });
        this.updateResponseModel();
        this.refreshTableColumnsList();
        this.checkAllErrors();

        const ev = new NewViewEvent(this._modeller._activeView.element.id);
        if (this._modeller._activeView.element.$type !== 'decisionTable') {
            ev.data.isDecisionTable = false;
        }
        this._internalEventService.next({
            identity: new Date().getTime(),
            type: 'views.changed',
            func: () => {
                this._eventService.publishEvent(ev);
                this.updateResponseModel();
            }
        });
        this.initDrdListeners();
    }

    private checkAllErrors() {
        this.clearErrorNodes();
        this.getAllInputClauseErrors()
            .concat(...this.getAllOutputClauseErrors())
            .forEach(columnDataId => {
                const newErrorIcon = this.addErrorElement(`th[data-col-id="${columnDataId}"]`);
                this._errorNodes.push(newErrorIcon);
            });
    }

    private addErrorElement(selector: string) {
        const icon = this.renderer.createElement('i');
        this.renderer.addClass(icon, 'fa');
        this.renderer.addClass(icon, 'fa-exclamation-triangle');
        this.renderer.setStyle(icon, 'float', 'right');
        this.renderer.setStyle(icon, 'margin-top', '4px');
        this.renderer.setStyle(icon, 'color', '#f13943');
        this.renderer.setAttribute(icon, 'aria-hidden', 'true');
        const host = this._container.nativeElement.querySelector(selector);
        this.renderer.appendChild(host, icon);
        return { host: host, child: icon};
    }

    private clearErrorNodes() {
        this._errorNodes.forEach(node => this.renderer.removeChild(node.host, node.child));
        this._errorNodes = [];
    }

    private getAllOutputClauseErrors(): string[] {
        const outputColumns = this._modeller
                                ._activeView
                                .element
                                .decisionTable
                                .output || [];
        return outputColumns
            .filter(output => this.hasOutputClauseError(output))
            .map(output => output.id);
    }

    private getAllInputClauseErrors(): string[] {
        const inputColumns = this._modeller
                                ._activeView
                                .element
                                .decisionTable
                                .input || [];
        return inputColumns
            .filter(input => this.hasInputClauseError(input))
            .map(input => input.id);
    }

    private hasInputClauseError(clause: DmnModdleElement) {
        const expression = clause.inputExpression;
        if (!expression) { return false; }
        if (DmnExpressionLanguage.isJuel(expression.expressionLanguage)) {
            if (expression.text.indexOf('${') !== 0 || !expression.text.endsWith('}')) {
                return true;
            }
        }
        return false;
    }

    private hasOutputClauseError(clause: DmnModdleElement) {
        return !!clause && !clause.name;
    }

    private fixMissingExpressionLanguage(event: DmnModdleEvent) {
        if (!event.elements[0].expressionLanguage) {
            event.elements[0].expressionLanguage = DmnExpressionLanguage.JUEL;
        }
    }

    private setDataModelPropertiesOnColumns(event: DmnModdleEvent) {
        const literalExpression = this.getElementByType(event, DmnType.LITERAL_EXPRESSION);
        const inputClause = this.getElementByType(event, DmnType.INPUT_CLAUSE);
        this._dataModelService
            .getEnumValuesByPath(literalExpression.text)
            .pipe(take(1))
            .subscribe(values => {
                this.setInputValueRestriction(inputClause, values);
            });
        this._dataModelService
            .getDatatypeByPath(literalExpression.text)
            .pipe(take(1), map(type => this.getDmnByJsonType(type)), filter(type => !!type))
            .subscribe(value => literalExpression.typeRef = value);
    }

    private initDrdListeners() {
        if (!this._modeller._viewers.drd) { return; }
        this.drdListenerInited = true;
        this._modeller._viewers.drd.on('commandStack.shape.delete.postExecuted', (event: ShapeEvent) => {
            this._eventService.publishEvent(new DecisionDeleteEvent(event.context.shape.id));
        });
        this._modeller._viewers.drd.on('elements.changed', (event) => {
            this._eventService.publishEvent(new DataChangedEvent(DataChangeType.DMN_MODEL));
        });
    }

    private selectTable(tableId: string) {
        const newView = this._modeller.getViews().find(view => view.element.id === tableId);
        this._modeller._switchView(<any>newView);
    }

    private importData(event: ImportDataEvent) {
        this._dmnModelService.importData(
            event.data,
            this._modeller._moddle,
            this._modeller._activeView.element.decisionTable,
            event.replaceRules);

        this._modeller.saveXML(DmnModellerComponent.SAVE_OPTIONS, (error, xml) => {
            if (error) { return; }
            this._modeller.importXML(xml, (err => { }));
        });
    }

    private createOutputColumnArray() {
        const columns = this._modeller._activeView.element.decisionTable.output;
        if (!columns) { return []; }
        return columns.map((column, index) => {
            return {
                label: (column.name) ? column.name : column.id,
                id: column.id,
                index: index,
                type: 'OUTPUT'
            };
        });
    }

    private createInputColumnArray() {
        const columns = this._modeller._activeView.element.decisionTable.input;
        if (!columns) { return []; }
        return columns.map((column, index) => {
            return {
                label: (column.label) ? column.label : column.inputExpression.text,
                id: column.id,
                index: index,
                type: 'INPUT'
            };
        });
    }

    private updateResponseModel() {
        if (!this._modeller._activeView || this._modeller._activeView.element.$type !== DmnType.DECISION_TABLE) {
            return;
        }
        const responseModel: ObjectDefinition = {
            type: JsonDatatype.ARRAY,
            items: { type: JsonDatatype.OBJECT, properties: [] }
        };
        this._modeller._activeView.element.decisionTable.output.forEach(outputClause => {
            responseModel.items.properties.push(
                { name: outputClause.name, type: DmnDatatypeMapping[outputClause.typeRef] });
        });
        this._dataModelService.setResponseModel(responseModel);
    }

    private updateInputColumns(datamodel: ObjectDefinition) {
        if (!this.inputColumnsPresent(this._modeller)) { return; }

        this._modeller._activeView.element.decisionTable.input.forEach(column => {
            this._dataModelService
                .getEnumValuesByPath(column.inputExpression.text)
                .pipe(take(1))
                .subscribe(values => {
                    this.setInputValueRestriction(column, values);
                });
            this._dataModelService
                .getDatatypeByPath(column.inputExpression.text)
                .pipe(
                    take(1),
                    map(type => this.getDmnByJsonType(type)),
                    filter(type => !!type)
                )
                .subscribe(value => column.inputExpression.typeRef = value);
        });
        this._modeller._updateViews();
    }

    private isInputExpressionChanged(event: DmnModdleEvent) {
        return (event.elements && event.elements.length > 1 &&
            !!event.elements.find(element => element.$type === DmnType.LITERAL_EXPRESSION));
    }

    private getElementByType(event: DmnModdleEvent, type: string) {
        return event.elements.find(element => element.$type === type);
    }

    private setInputValueRestriction(inputClause: DmnModdleElement, values: string[]) {
        if (!inputClause) { return; }
        if (!inputClause.inputValues) {
            const newElem = inputClause
                .$model
                .create(DmnType.UNARY_TEST);
            inputClause.inputValues = newElem;
        }
        inputClause.inputValues.text = `"${values.join('","')}"`;
    }

    private getDmnByJsonType(jsonType: JsonDatatypes) {
        return Object.getOwnPropertyNames(DmnDatatypeMapping)
            .find(name => DmnDatatypeMapping[name] === jsonType);
    }

    private inputColumnsPresent(modeller: DMNJS) {
        return (!!this._modeller &&
            !!this._modeller._activeView &&
            !!this._modeller._activeView.element &&
            !!this._modeller._activeView.element.decisionTable &&
            !!this._modeller._activeView.element.decisionTable.input);
    }

    private searchRows(): void {
        this.clearSearchStyles();

        const searchValue = (!!this.searchValue) ? this.searchValue.toLowerCase().trim() : null;

        if (!searchValue ||
            !this._modeller._activeView.element.decisionTable ||
            !this._modeller._activeView.element.decisionTable.rule) {
                return;
        }

        const column = this.currentColumns.find(col => col.id === this.searchColumn);

        const columnFilter = (!this.searchColumn) ?
            (_: number) => true : (index: number, type?: string) => index === column.index && type === column.type;

        this._modeller
            ._activeView
            .element
            .decisionTable
            .rule
            .filter(rule => this.filterRule(rule, searchValue, columnFilter))
            .forEach(filteredRule => {
                this._searchStylesheet.insertRule(`td[data-row-id="${filteredRule.id}"] { display: none; }`);
                this._searchStylesheet.insertRule(`td[data-row-id="${filteredRule.id}"] + td { display: none; }`);
            });
    }

    private filterRule(rule: DmnModdleRule, searchValue: string, columnFilter: (index, type?) => boolean) {
        if (!this.searchValue || !this.searchValue.trim()) { return false; }

        const inputEntriesFound = (!!rule.inputEntry) ?
            rule.inputEntry.filter((input, index) =>
                columnFilter(index, 'INPUT') && this.contains(input.text, searchValue)).length : 0;
        const outputEnriesFound = (!!rule.outputEntry) ?
            rule.outputEntry.filter((output, index) =>
                columnFilter(index, 'OUTPUT') && this.contains(output.text, searchValue)).length : 0;
        const annotationFound = columnFilter(null, 'ANNOTATION') ? this.contains(rule.description, searchValue) : false;

        return (inputEntriesFound + outputEnriesFound) < 1 && !annotationFound;
    }

    private contains(text: string, searchString: string) {
        if (!text && !searchString) { return true; }
        if (!text) { return false; }
        return text.toLowerCase().indexOf(searchString) > -1;
    }

    private clearSearch() {
        this.clearSearchStyles();
        this.searchOpen = false;
        this.searchColumn = null;
        this.searchValue = null;
    }

    private clearSearchStyles() {
        this.clearStyles(this._searchStylesheet);
    }

    private clearStyles(stylesheet: any) {
        const count = stylesheet.rules.length;
        for (let i = 0; i < count; i++) {
            stylesheet.deleteRule(0);
        }
    }

}
