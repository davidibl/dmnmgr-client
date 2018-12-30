import { Component, Input } from '@angular/core';
import { ObjectDefinition } from '../../model/json/objectDefinition';

@Component({
    selector: 'xn-dmn-result-view',
    templateUrl: 'dmnResultView.html',
    styleUrls: ['dmnResultView.scss'],
})
export class DmnResultViewComponent {

    @Input()
    public message: string;

    @Input()
    public result: Object[];

    @Input()
    public datamodelResult: ObjectDefinition;
}
