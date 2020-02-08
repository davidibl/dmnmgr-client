import {
    Component,
    ViewChild,
    ElementRef,
    AfterViewInit,
    Input,
    HostListener,
    OnInit,
    Inject,
    Renderer2,
    ChangeDetectionStrategy,
} from '@angular/core';
import { ReplaySubject, BehaviorSubject, } from 'rxjs';
import { take, filter, map, debounceTime, } from 'rxjs/operators';

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
import { DomService } from '../../services/domService';
import { isNull } from '@xnoname/web-components';
import { DmnBusinessObject } from '../../model/dmn/dmnBusinessObject';
import { BaseEvent } from '../../model/event/event';
import { DmnClipboardService, ClipBoardDataType } from '../../services/dmnClipboardService';
import { CsvExportService } from '../../services/csvExportService';
import { isNullOrUndefined } from 'util';

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
    getActiveViewer(): DmnModelerView;
}

export interface Modeling {
    editAllowedValues(businessObject: DmnBusinessObject, restrictionSet: string[]);
    editAnnotation(rule: DmnModdleRule, value: string);
    editCell(cell: any, value: string);
    editDecisionTableId(newId: string);
    editDecisionTableName(newName);
    editExpressionLanguage(element: DmnModdleElement, language: string);
    editHitPolicy(hitPolicy: string, aggregation: string);
    editInputExpression(inputExpression: unknown, value);
    editInputExpressionTypeRef(inputExpression: unknown, typeRef: string);
    editOutputName(output: DmnModdleElement, newName: string);
    editOutputTypeRef(output: DmnModdleElement, typeRef: string);

    addRow(ruleConfig: Object): { cells: DmnBusinessObject[] };
}

export type DmnModelingType = 'modeling';

export interface DmnModelerView {
    element: DmnModdleElement;
    get(value: DmnModelingType): Modeling;
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DmnModellerComponent implements AfterViewInit, OnInit {

    private static SAVE_OPTIONS = { format: true };

    private initialized = false;
    private drdListenerInited = false;

    private _domService = new DomService(this.document, this._renderer);

    @ViewChild('canvas')
    private _container: ElementRef;

    private _modeller: DMNJS;
    private _searchStylesheet: any;
    private _newHeadElement = null;

    private _errorNodes: any[] = [];

    private _internalEventService = new ReplaySubject<{ type: string, identity: any, func: () => void }>();
    private _debounceSubject = new ReplaySubject<() => void>(1);

    @Input()
    public type: string;

    public searchOpen = new BehaviorSubject(false);
    public searchValue: string;
    public searchColumn: string = null;
    public replaceOpen$ = new BehaviorSubject(false);
    public replaceWhat: string;
    public replaceWith: string;
    public replaceColumn: string = null;
    public currentColumns: DmnColumn[] = [];

    public constructor(private _dmnXmlService: DmnXmlService,
        private _eventService: EventService,
        @Inject(DOCUMENT) private document,
        private _dmnModelService: DmnModelService,
        private _exportService: ExportService,
        private _dataModelService: DataModelService,
        private _saveStateService: SaveStateService,
        private _elementRef: ElementRef,
        private _renderer: Renderer2,
        private _clipboardService: DmnClipboardService,
        private _csvService: CsvExportService,
    ) { }

    @HostListener('window:keyup', ['$event'])
    public handleKeyboardEvent(event: KeyboardEvent) {
        if (!this._modeller._activeView.element.decisionTable) {
            return;
        }

        if (event.ctrlKey && event.code === 'KeyF') {
            this.searchOpen
                .pipe(
                    take(1),
                ).subscribe(searchOpen => {
                    searchOpen = !searchOpen;
                    this.searchOpen.next(searchOpen);
                    if (!searchOpen) {
                        this.clearSearch();
                        this.toggleReplace(false);
                    }
                });
        }
    }

    public toggleReplace(open?: boolean) {
        this.replaceOpen$
            .pipe(take(1))
            .subscribe(replaceOpen => {
                replaceOpen = isNull(open) ? !replaceOpen : open;
                this.replaceOpen$.next(replaceOpen);
                if (!replaceOpen) {
                    this.clearReplace();
                }
            });
    }

    public closeAndClearSearch() {
        this.searchOpen.next(false);
        this.toggleReplace(false);
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
        this._searchStylesheet = this._domService.createStylesheet();

        this._debounceSubject.pipe( debounceTime(500) ).subscribe(func => func());

        this._eventService
            .getEvent((ev) => ev.type === EventType.OPEN_SEARCH)
            .subscribe(_ => this.searchOpen.next(true));

        this._eventService
            .getEvent((ev) => ev.type === EventType.EXPORT)
            .subscribe((ev) => this._exportService.exportTable(
                this._modeller._activeView.element.decisionTable, ev.data));

        this._eventService
            .getEvent((ev) => ev.type === EventType.JUMP_TO_TEST)
            .subscribe((ev) => this.selectTable(ev.data));

        this._eventService
            .getEvent((ev) => ev.type === EventType.COPY_RULES)
            .subscribe(_ => this.copyRulesInSearch());

        this._eventService
            .getEvent((ev) => ev.type === EventType.PASTE_RULES)
            .subscribe(_ => this.pasteRules());
    }

    public ngAfterViewInit(): void {

        this._internalEventService
            .pipe(
                distinctUntilChanged((e1, e2) => e1.identity === e2.identity && e1.type === e2.type)
            )
            .subscribe(e => e.func());

        this._modeller = new DmnJS({
            container: this._container.nativeElement,
            common: {
                keyboard: {
                    bindTo: window
                }
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

    public searchAndReplace(): void {
        const replaceCount = this.searchRulesByCurrentFilter(false, this.searchColumn, this.searchValue)
            .reduce((count, filteredRow) => {
                count += this.replaceByCurrentReplaceSettings(filteredRow);
                return count;
            }, 0);
        this._eventService.publishEvent(new BaseEvent(EventType.TEXT_REPLACED, replaceCount));
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
            const newViewEvent = new NewViewEvent(event.activeView.element.id);
            if (event.activeView.type !== 'decisionTable') {
                newViewEvent.data.isDecisionTable = false;
            }
            this._internalEventService.next({
                identity: event.activeView.element.id,
                type: 'views.changed',
                func: () => {
                    this._eventService.publishEvent(newViewEvent);
                    this.updateResponseModel();
                }
            });
            if (!this.drdListenerInited) {
                this.initDrdListeners();
            }

            this.startScrollListener();
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
            if (!!event.elements && !!event.elements[0] && !!event.elements[0].businessObject &&
                event.elements[0].businessObject.$type === 'dmn:DecisionTable') {
                return;
            }
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

    private startScrollListener() {
        const scrollElement = this._elementRef.nativeElement.querySelectorAll('.tjs-container')[0];
        if (!scrollElement) {
            return;
        }

        this._renderer.listen(scrollElement, 'scroll', (scrollEvent) => {
            if (scrollEvent.srcElement.scrollLeft >= 0 && !!this._newHeadElement) {
                const newPosition = -1 * scrollEvent.srcElement.scrollLeft;
                this._domService.scrollStaticHeaderHorizontal(this._newHeadElement, newPosition);
            }
            if (scrollEvent.srcElement.scrollTop > 185) {
                if (!!this._newHeadElement) {
                    return;
                }
                this._newHeadElement = this._domService.duplicateDmnTableHeader(this._elementRef);
            } else if (this._newHeadElement) {
                this._domService.removeStaticHead(this._elementRef, this._newHeadElement);
                this._newHeadElement = null;
            }
        });
    }

    private checkAllErrors() {
        this.clearErrorNodes();
        this.getAllInputClauseErrors()
            .concat(...this.getAllOutputClauseErrors())
            .forEach(columnDataId => {
                const newErrorIcon = this._domService.appendErrorElement(`th[data-col-id="${columnDataId}"]`);
                this._errorNodes.push(newErrorIcon);
            });
    }

    private clearErrorNodes() {
        this._errorNodes.forEach(node => this._renderer.removeChild(node.host, node.child));
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
        if (!expression.text) { return true; }
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
                .subscribe(value => {
                    if (column.inputExpression.typeRef === value) { return; }
                    this._modeller
                        .getActiveViewer()
                        .get('modeling')
                        .editInputExpressionTypeRef(column.inputExpression, value);
                });
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
        if (!!inputClause.inputValues && inputClause.inputValues.text === `"${values.join('","')}"`) {
            return;
        }
        this._modeller
            .getActiveViewer()
            .get('modeling')
            .editAllowedValues(inputClause, values.map(value => `"${value}"`));
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

        this.searchRulesByCurrentFilter(true, this.searchColumn, this.searchValue)
            .forEach(filteredRule => {
                this._searchStylesheet.insertRule(`td[data-row-id="${filteredRule.id}"] { display: none; }`);
                this._searchStylesheet.insertRule(`td[data-row-id="${filteredRule.id}"] + td { display: none; }`);
            });
    }

    private replaceByCurrentReplaceSettings(rule: DmnModdleRule) {
        const columnFilter = this.getColumnFilter(this.replaceColumn);
        const foundElements = this.filterRuleGetFoundElements(rule, this.replaceWhat, columnFilter);
        const searchMask = new RegExp(this.replaceWhat, 'ig');
        if (foundElements.annotationFound) {
            const newVal = rule.description.replace(searchMask, this.replaceWith);
            this._modeller.getActiveViewer().get('modeling').editAnnotation(rule, newVal);
        }
        if (foundElements.inputEntries) {
            foundElements.inputEntries.forEach(element => {
                const newValue = element.text.replace(searchMask, this.replaceWith);
                this._modeller.getActiveViewer().get('modeling').editCell(element, newValue);
            });
        }
        if (foundElements.outputEntries) {
            foundElements.outputEntries.forEach(element => {
                const newValue = element.text.replace(searchMask, this.replaceWith);
                this._modeller.getActiveViewer().get('modeling').editCell(element, newValue);
            });
        }
        return foundElements.inputEntries.length +
            foundElements.outputEntries.length +
            (foundElements.annotationFound ? 1 : 0);
    }

    private searchRulesByCurrentFilter(negate: boolean, searchColumn: string, searchValue: string): DmnModdleRule[] {
        searchValue = (!!searchValue) ? searchValue.toLowerCase().trim() : null;

        if (!this._modeller._activeView.element.decisionTable ||
            !this._modeller._activeView.element.decisionTable.rule) {
                return [];
        }

        if (!searchValue) {
            return (negate) ? [] :
                this._modeller
                    ._activeView
                    .element
                    .decisionTable
                    .rule;
        }

        const columnFilter = this.getColumnFilter(searchColumn);

        return this._modeller
            ._activeView
            .element
            .decisionTable
            .rule
            .filter(rule => (negate) ?
                !this.filterRule(rule, searchValue, columnFilter) :
                this.filterRule(rule, searchValue, columnFilter));
    }

    private filterRule(rule: DmnModdleRule, searchValue: string, columnFilter: (index, type?) => boolean) {
        if (!this.searchValue || !this.searchValue.trim()) { return false; }

        const found = this.filterRuleGetFoundElements(rule, searchValue, columnFilter);

        return (found.inputEntries.length + found.outputEntries.length) > 0 || found.annotationFound;
    }

    private getColumnFilter(searchColumn: string) {
        const column = this.currentColumns.find(col => col.id === searchColumn);
        return (!searchColumn) ?
            (_: number) => true : (index: number, type?: string) => index === column.index && type === column.type;
    }

    private filterRuleGetFoundElements(rule: DmnModdleRule, searchValue: string, columnFilter: (index, type?) => boolean) {
        const inputEntriesFound = (!!rule.inputEntry) ?
            rule.inputEntry.filter((input, index) =>
                columnFilter(index, 'INPUT') && this.contains(input.text, searchValue)) : [];
        const outputEntriesFound = (!!rule.outputEntry) ?
            rule.outputEntry.filter((output, index) =>
                columnFilter(index, 'OUTPUT') && this.contains(output.text, searchValue)) : [];
        const annotationFound = columnFilter(null, 'ANNOTATION') ? this.contains(rule.description, searchValue) : false;
        return {
            inputEntries: inputEntriesFound,
            outputEntries: outputEntriesFound,
            annotationFound: annotationFound,
        };
    }

    private contains(text: string, searchString: string) {
        if (!text && !searchString) { return true; }
        if (!text) { return false; }
        return text.toLowerCase().indexOf(searchString.toLowerCase()) > -1;
    }

    private copyRulesInSearch(): void {
        const foundRules = this.searchRulesByCurrentFilter(false, this.searchColumn, this.searchValue);
        this._clipboardService.copyData(
            ClipBoardDataType.DMN_RULES,
            this._csvService.exportRules(foundRules)
        );
    }

    private pasteRules(): void {
        this._clipboardService
            .getData()
            .pipe(
                filter(data => !!data && data.type === ClipBoardDataType.DMN_RULES),
                take(1)
            )
            .subscribe(data => {
                this.addRulesByCSV(data.data);
            });
    }

    private addRulesByCSV(csvData: string) {
        const modeling = this._modeller.getActiveViewer().get('modeling');
        console.log(modeling);
        csvData.split(CsvExportService.ROW_DELIMITER)
            .filter(line => !!line && line.length > 0)
            .forEach(line => {
                const csvCells = line.split(CsvExportService.FIELD_DELIMITER);
                const rule = modeling.addRow({ type: DmnType.RULE });
                const { cells } = rule;
                cells.forEach((cell, index) => {
                    if (csvCells.length > index) {
                        modeling.editCell(cell, csvCells[index]);
                    }
                });
            });
    }

    private clearSearch() {
        this.clearSearchStyles();
        this.searchOpen.next(false);
        this.searchColumn = null;
        this.searchValue = null;
    }

    private clearReplace() {
        this.replaceColumn = null;
        this.replaceWhat = null;
        this.replaceWith = null;
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
