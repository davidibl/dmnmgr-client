import { Component, ChangeDetectionStrategy, EventEmitter } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-validation',
    templateUrl: 'docValidation.html',
    styleUrls: ['documentationComponent.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocValidationComponent extends DocumentationComponent {

    public static title = 'Validierung';
    public title = DocValidationComponent.title;

}
