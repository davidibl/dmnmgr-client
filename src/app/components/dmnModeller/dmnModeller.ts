import { Component, ViewChild, ElementRef, AfterViewInit, Input } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { DmnXmlService } from '../../services/dmnXmlService';
import { of, Observable, ReplaySubject } from 'rxjs';

import DmnModdle from 'dmn-moddle/lib/dmn-moddle.js';
import SimpleDmnModdle from 'dmn-moddle/lib/simple.js';

declare var DmnJS: {
    new(object: object, object2?: object): DMNJS;
}

declare interface DMNJS {
    importXML(xml: string, callback: (error: any) => void);
    saveXML(options: any, callback: (error: any, xml: string) => void);
    getViews(): any[];
    on(eventname: string, eventCallback: (event) => void);
    _updateViews(): void;
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

    public constructor(private _http: HttpClient, private _dmnXmlService: DmnXmlService) { }

    public ngAfterViewInit(): void {

        var extensionModule = {
            init: ['interactionLogger'],
            interactionLogger: ['row.add', eventBus => {
                eventBus.on('row.add', event => console.log(event));
            }]
        };

        this._http.get('../assets/val.xml', { responseType: 'text' }).subscribe(xml => {
            this._modeller = new DmnJS({
                container: this._container.nativeElement,
                decisionTable: {
                    additionalModules: [extensionModule]
                }
            });

            this._modeller.importXML(xml, (err) => {
                if (err) {
                    console.log('error rendering', err);
                }
                this.configureModeller();
            });

            console.log(SimpleDmnModdle);
            var moddle = new SimpleDmnModdle();
            moddle.fromXML(xml, 'dmn:Definitions', function (err, result) {

                console.log(result);
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
        });
    }
}
