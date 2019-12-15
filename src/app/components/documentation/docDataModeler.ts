import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-data-modeler',
    templateUrl: 'docDataModeler.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocDataModelerComponent extends DocumentationComponent {

    static title = 'Der Data Modeler';
    public title = DocDataModelerComponent.title;
}
