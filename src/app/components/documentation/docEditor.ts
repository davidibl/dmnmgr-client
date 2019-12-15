import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-editor',
    templateUrl: 'docEditor.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocEditorComponent extends DocumentationComponent {

    public static title = 'Der Editor';
    public title = DocEditorComponent.title;

}
