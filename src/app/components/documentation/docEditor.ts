import { Component, ChangeDetectionStrategy, EventEmitter } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-editor',
    templateUrl: 'docEditor.html',
    styleUrls: ['documentationComponent.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocEditorComponent extends DocumentationComponent {

    public static title = 'Der Editor';
    public title = DocEditorComponent.title;

}
