import { Component, ViewChild, ElementRef, AfterViewInit, Input } from '@angular/core';

import { HttpClient } from '@angular/common/http';
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
}

export interface DmnModdle {
    create(type: string);
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
    input?: DmnModdleElement[];
    output?: DmnModdleElement[];
    decisionTable?: DmnModdleElement;
    $model: DmnModdle;
    typeRef: string;
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

    @ViewChild('canvas')
    private _container: ElementRef;

    private _modeller: DMNJS;

    @Input()
    public type: string;

    public constructor(private _http: HttpClient,
                       private _dmnXmlService: DmnXmlService,
                       private _eventService: EventService,
                       private _dataModelService: DataModelService) {}

    public ngAfterViewInit(): void {

        this._http.get('../assets/val.xml', { responseType: 'text' }).subscribe(xml => {
            this._modeller = new DmnJS({
                container: this._container.nativeElement,
            });
            console.log(this._modeller);

            this._modeller.importXML(xml, (err) => {
                if (err) {
                    console.log('error rendering', err);
                }
                this.configureModeller();
            });
        });

        this._dmnXmlService.registerModeller({
            type: this.type,
            saveFunc: () => {
                const subject = new ReplaySubject<string>(1);
                this._modeller.saveXML(null, (error, result) => {
                    subject.next(result);
                });
                return subject.asObservable();
            }
        })
    }

    private configureModeller() {
        this._modeller.on('views.changed', (event) => {
            const ev = new NewViewEvent(event.activeView.element.id);
            if (event.activeView.type !== 'decisionTable') {
                ev.data.isDecisionTable = false;
            }
            this._eventService.publishEvent(ev);
            this.updateResponseModel();
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
                this._eventService.publishEvent(new RenameArtefactEvent(event.element.id, event.newId));
            }
        });
        this.updateResponseModel();
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

}
