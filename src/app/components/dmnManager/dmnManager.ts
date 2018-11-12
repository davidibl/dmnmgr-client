import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT } from "@angular/platform-browser";
import { TestDecisionService } from '../../services/testDecisionService';

@Component({
    selector: 'xn-dmn-manager',
    templateUrl: 'dmnManager.html',
    styleUrls: ['dmnManager.scss'],
})
export class DmnManagerComponent implements OnInit {

    private stylesheet: any = null;

    public constructor(@Inject(DOCUMENT) private document,
        private renderer: Renderer2,
        private _testDecisionService: TestDecisionService) {
    }

    public ngOnInit() {
        const styleElement = this.renderer.createElement('style');
        const text = this.renderer.createText('');
        this.renderer.appendChild(styleElement, text);
        this.renderer.appendChild(this.document.head, styleElement);
        this.stylesheet = styleElement.sheet;

        this._testDecisionService
            .getResult()
            .subscribe(result => {
                this.clearStyleRules();
                if (result && result.resultRuleIds && result.resultRuleIds.length > 0) {
                    result.resultRuleIds.forEach(rule => {
                        this.stylesheet.insertRule(`td[data-row-id="${rule}"] { background-color: #def1c3; }`);
                    });
                }
            });
    }

    private clearStyleRules() {
        for (let i = 0; i < this.stylesheet.rules.length; i++) {
            this.stylesheet.removeRule(i);
        }
    }
}
