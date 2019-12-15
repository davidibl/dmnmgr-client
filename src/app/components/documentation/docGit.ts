import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-git',
    templateUrl: 'docGit.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocGitComponent extends DocumentationComponent {

    public static title = 'GIT';
    public title = DocGitComponent.title;

}
