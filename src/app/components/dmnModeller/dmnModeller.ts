import { Component, ViewChild, ElementRef, AfterViewInit, Input, Output } from '@angular/core';

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
import { NewViewEvent } from '../../model/newViewEvent';
import { RenameArtefactEvent } from '../../model/renameArtefactEvent';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { UUID } from '../../functions/UUID';

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
    _moddle: DmnModdle;
}

export interface DmnModdle {
    create(type: string): DmnModdleElement;
}

export interface DmnModelerView {
    element: DmnModdleElement;
}

export interface DmnModdleElement {
    $type: string;
    id: string;
    name: string;
    text: string;
    inputValues?: DmnModdleElement;
    inputExpression?: DmnModdleElement;
    input?: DmnModdleElement[];
    output?: DmnModdleElement[];
    decisionTable?: DmnModdleTable;
    $model: DmnModdle;
    typeRef: string;
    $parent: DmnModdleElement;
}

export interface DmnModdleTable extends DmnModdleElement {
    rule: DmnModdleRule[];
}

export interface DmnModdleRule extends DmnModdleElement {
    inputEntry: DmnModdleElement[];
    outputEntry: DmnModdleElement[];
}

export interface DmnModdleEvent {
    elements: DmnModdleElement[];
    element: DmnModdleElement;
}

export class DmnType {
    static DECISION_TABLE = 'dmn:Decision';

    static LITERAL_EXPRESSION = 'dmn:LiteralExpression';
    static INPUT_CLAUSE = 'dmn:InputClause';
    static UNARY_TEST = 'dmn:UnaryTests';
    static OUTPUT_CLAUSE = 'dmn:OutputClause';
    static RULE = 'dmn:DecisionRule';
}

export class DmnDatatypeMapping {
    static string = JsonDatatype.STRING;
    static integer = JsonDatatype.INTEGER;
    static long = JsonDatatype.INTEGER;
    static double = JsonDatatype.NUMBER;
    static boolean = JsonDatatype.BOOLEAN;
    static date = JsonDatatype.DATETIME;
}

@Component({
    selector: 'xn-dmn-modeller',
    templateUrl: 'dmnModeller.html',
    styleUrls: ['dmnModeller.scss'],
})
export class DmnModellerComponent implements AfterViewInit {

    private initialized = false;

    @ViewChild('canvas')
    private _container: ElementRef;

    private _modeller: DMNJS;

    private _internalEventService = new ReplaySubject<{ type: string, identity: any, func: () => void }>();

    @Input()
    public type: string;

    public constructor(private _dmnXmlService: DmnXmlService,
                       private _eventService: EventService,
                       private _dataModelService: DataModelService) {}

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
                    this.configureModeller();
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
                return subject.asObservable().pipe( distinctUntilChanged() );
            }
        });

        this._dataModelService
            .getDataModel()
            .subscribe(datamodel => this.updateInputColumns(datamodel));

        this._eventService
            .getEvent((event) => event.type === 'import')
            .subscribe(importEvent => this.importData(importEvent.data));
    }

    private configureModeller() {
        this._modeller.on('views.changed', (event) => {
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

        const ev = new NewViewEvent(this._modeller._activeView.element.id);
        if (this._modeller._activeView.element.$type !== DmnType.DECISION_TABLE) {
            ev.data.isDecisionTable = false;
        }
        this._internalEventService.next({
            identity: this._modeller._activeView.element.id,
            type: 'views.changed',
            func: () => {
                this._eventService.publishEvent(ev);
                this.updateResponseModel();
            }
        });
    }

    private importData(data: string[][]) {

        const columns = [];
        this._modeller._activeView.element.decisionTable.input.forEach(col => columns.push(col));
        this._modeller._activeView.element.decisionTable.output.forEach(col => columns.push(col));

        const newRules = <DmnModdleRule[]>[];
        data.forEach(row => {
            const newRule = this._modeller._moddle.create(DmnType.RULE, {
                id: this.generateId(DmnType.RULE)
            });
            newRule.inputEntry = [];
            newRule.outputEntry = [];
            let counter = 0;
            this._modeller._activeView.element.decisionTable.input.forEach(_ => {
                const input = newRule
                    .$model
                    .create(DmnType.UNARY_TEST);
                input.text = (counter < row.length) ? `${row[counter]}` : null;
                input.id = this.generateId(DmnType.UNARY_TEST);
                newRule.inputEntry.push(input);
                counter++;
            });

            this._modeller._activeView.element.decisionTable.input.forEach(_ => {
                const input = newRule
                    .$model
                    .create(DmnType.LITERAL_EXPRESSION);
                input.text = (counter < row.length) ? `${row[counter]}` : null;
                input.id = this.generateId(DmnType.LITERAL_EXPRESSION);
                newRule.outputEntry.push(input);
                counter++;
            });

            newRules.push(newRule);
        });

        const currentTable = this._modeller._activeView.element.decisionTable;
        if (!currentTable.rule) { currentTable.rule = []; }
        newRules.forEach(rule => currentTable.rule.push(rule));

        this._modeller.saveXML(null, (error, xml) => {
            if (error) { return; }
            this._modeller.importXML(xml, (err => {}));
        });
    }

    private generateId(type: string) {
        return type.substr(type.indexOf(':') + 1) + UUID.new();
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

}
