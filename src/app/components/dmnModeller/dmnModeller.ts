import { Component, ViewChild, ElementRef, AfterViewInit, Input, Output, HostListener, OnInit, Inject, Renderer2 } from '@angular/core';

import { DmnXmlService } from '../../services/dmnXmlService';
import { ReplaySubject } from 'rxjs';

import DmnModdle from 'dmn-moddle/lib/dmn-moddle.js';
import { DataModelService } from '../../services/dataModelService';
import { take } from 'rxjs/operators/take';
import { filter } from 'rxjs/operators/filter';
import { map } from 'rxjs/operators/map';
import { ObjectDefinition } from '../../model/json/objectDefinition';
import { JsonDatatype, JsonDatatypes } from '../../model/json/jsonDatatypes';
import { EventService } from '../../services/eventService';
import { NewViewEvent } from '../../model/event/newViewEvent';
import { RenameArtefactEvent } from '../../model/event/renameArtefactEvent';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { DOCUMENT } from '@angular/platform-browser';
import { debounceTime } from 'rxjs/operators/debounceTime';
import { DecisionDeleteEvent } from '../../model/event/decisionDeleteEvent';
import { EventType } from '../../model/event/eventType';
import { DmnModelService } from '../../services/dmnModelService';
import { DmnModdleElement } from '../../model/dmn/dmnModdleElement';
import { DmnModdleRule } from '../../model/dmn/dmnModdleRule';
import { DmnType } from '../../model/dmn/dmnType';
import { MyDmnModdle } from '../../model/dmn/dmnModdle';

declare var DmnJS: {
    new(object: object, object2?: object): DMNJS;
}

declare interface DMNJS {
    importXML(xml: string, callback: (error: any) => void);
    saveXML(options: any, callback: (error: any, xml: string) => void);
    getViews(): any[];
    on(eventname: string, eventCallback: (event) => void);
    _updateViews(): void;
    _viewers: any;
    _activeView: DmnModelerView;
    _moddle: MyDmnModdle;
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

export interface DmnModdleEvent {
    elements: DmnModdleElement[];
    element: DmnModdleElement;
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
    index: number,
    type: string,
}

@Component({
    selector: 'xn-dmn-modeller',
    templateUrl: 'dmnModeller.html',
    styleUrls: ['dmnModeller.scss'],
})
export class DmnModellerComponent implements AfterViewInit, OnInit {

    private initialized = false;
    private drdListenerInited = false;

    @ViewChild('canvas')
    private _container: ElementRef;

    private _modeller: DMNJS;
    private _searchStylesheet: any;

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
        private _dataModelService: DataModelService) { }

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
    }

    public ngAfterViewInit(): void {

        this._internalEventService
            .pipe(distinctUntilChanged((e1, e2) => e1.identity === e2.identity && e1.type === e2.type))
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
                console.log(this._modeller);
                this._modeller.importXML(xml, (err) => {
                    if (err) {
                        console.log('error rendering', err);
                    }
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
                this._modeller.saveXML(null, (error, result) => {
                    subject.next(result);
                });
                return subject.asObservable().pipe(distinctUntilChanged());
            }
        });

        this._dataModelService
            .getDataModel()
            .subscribe(datamodel => this.updateInputColumns(datamodel));

        this._eventService
            .getEvent((event) => event.type === 'import')
            .subscribe(importEvent => this.importData(importEvent.data));
    }

    private refreshTableColumnsList() {
        if (!this._modeller._activeView.element.decisionTable) {
            this.currentColumns = [];
            return;
        }

        const columns = <DmnColumn[]>[];
        columns.splice(0, 0, ...this.createOutputColumnArray());
        columns.splice(0, 0, ...this.createInputColumnArray());
        columns.push({ label: 'Annotation', id: 'description', type: 'ANNOTATION', index: null })
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
            if (this.isInputExpressionChanged(event)) {
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
                    .pipe(
                        take(1),
                        map(type => this.getDmnByJsonType(type)),
                        filter(type => !!type)
                    )
                    .subscribe(value => literalExpression.typeRef = value);
            }
            this.updateResponseModel();
            this.refreshTableColumnsList();
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

    private initDrdListeners() {
        if (!this._modeller._viewers.drd) { return; }
        this.drdListenerInited = true;
        this._modeller._viewers.drd.on('commandStack.shape.delete.postExecuted', (event: ShapeEvent) => {
            this._eventService.publishEvent(new DecisionDeleteEvent(event.context.shape.id));
        });
    }

    private importData(data: string[][]) {

        this._dmnModelService.importData(data, this._modeller._moddle, this._modeller._activeView.element.decisionTable);

        this._modeller.saveXML(null, (error, xml) => {
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
                { name: outputClause.name, type: DmnDatatypeMapping[outputClause.typeRef] })
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

        let columnFilter = (!this.searchColumn) ?
            (_) => true : (index: number, type?: string) => index === column.index && type === column.type;

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
        const count = this._searchStylesheet.rules.length;
        for (let i = 0; i < count; i++) {
            this._searchStylesheet.deleteRule(0);
        }
    }

}
