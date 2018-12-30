import { Component, ViewChild, ElementRef, AfterViewInit, Input } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from '../../services/dmnXmlService';
import { ReplaySubject } from 'rxjs';

import DmnModdle from 'dmn-moddle/lib/dmn-moddle.js';
import { DataModelService } from '../../services/dataModelService';
import { take } from 'rxjs/operators/take';

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
    _activeView: any;
}

export interface DmnModdle {
    create(type: string);
}

export interface DmnModdleElement {
    $type: string;
    id: string;
    text: string;
    inputValues?: DmnModdleElement;
    $model: DmnModdle;
}

export interface DmnModdleEvent {
    elements: DmnModdleElement[];
    element: DmnModdleElement;
}

export class DmnType {
    static LITERAL_EXPRESSION = 'dmn:LiteralExpression';
    static INPUT_CLAUSE = 'dmn:InputClause';
    static UNARY_TEST = 'dmn:UnaryTests';
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
                       private _dataModelService: DataModelService) { }

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
            const newView = { type: event.activeView.type, id: event.activeView.element.id };
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
            }
        });
        this._modeller._viewers.decisionTable.on('element.updateId', (event) => {
            console.log('change' + event);
        });
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

}
