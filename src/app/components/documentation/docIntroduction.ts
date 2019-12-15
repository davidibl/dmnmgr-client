import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'xn-doc-introduction',
    templateUrl: 'docIntroduction.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocIntroductionComponent {

    public static title = 'Einleitung';
    public title = DocIntroductionComponent.title;

}
