import { Component, ChangeDetectionStrategy, EventEmitter } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-introduction',
    templateUrl: 'docIntroduction.html',
    styleUrls: ['documentationComponent.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocIntroductionComponent extends DocumentationComponent {

    public static title = 'Einleitung';
    public title = DocIntroductionComponent.title;

}
