import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';

declare var DmnJS: {
    new (object: object, object2?: object): DMNJS;
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

    public constructor(private _http: HttpClient) {}

    public ngAfterViewInit(): void {

        var extensionModule = {
            init: [ 'interactionLogger' ],
            interactionLogger: [ 'row.add', eventBus => {
                eventBus.on('row.add', event => console.log(event));
            }]
        };

        this._http.get('../assets/val.xml', { responseType: 'text' }).subscribe(xml => {
            this._modeller = new DmnJS({
                container: this._container.nativeElement,
                decisionTable: {
                    additionalModules: [extensionModule]
                }});

            this._modeller.importXML(xml, (err) => {
                if (err) {
                    console.log('error rendering', err);
                }
                this.configureModeller();
            });
        });
    }

    private configureModeller() {
        this._modeller.on('views.changed', (event) => {
        });
    }
}
