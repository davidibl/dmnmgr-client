import { Component, ChangeDetectionStrategy, EventEmitter } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-search',
    templateUrl: 'docSearch.html',
    styleUrls: ['documentationComponent.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocSearchComponent extends DocumentationComponent {

    public static title = 'Suche';
    public title = DocSearchComponent.title;

}
