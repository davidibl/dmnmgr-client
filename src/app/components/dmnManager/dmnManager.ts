import { Component, Inject, OnInit, Renderer2, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TestDecisionService } from '../../services/testDecisionService';
import { EventService } from '../../services/eventService';
import { EventType } from '../../model/event/eventType';
import { NewViewEvent } from '../../model/event/newViewEvent';
import { TabsComponent } from '@xnoname/web-components';
import { DmnProjectService } from '../../services/dmnProjectService';

@Component({
    selector: 'xn-dmn-manager',
    templateUrl: 'dmnManager.html',
    styleUrls: ['dmnManager.scss'],
})
export class DmnManagerComponent implements OnInit {

    @ViewChild(TabsComponent)
    private tabs: TabsComponent;

    private stylesheet: any = null;
    private _tabId: string;

    public get tabId() {
        return this._tabId;
    }

    public isDecicionTableMode$: Observable<boolean>;

    public pluginExampleActivated$: Observable<boolean>;

    public constructor(@Inject(DOCUMENT) private document,
                       private renderer: Renderer2,
                       private _testDecisionService: TestDecisionService,
                       private _projectService: DmnProjectService,
                       private _eventService: EventService) {
    }

    public ngOnInit() {
        const styleElement = this.renderer.createElement('style');
        const text = this.renderer.createText('');
        this.renderer.appendChild(styleElement, text);
        this.renderer.appendChild(this.document.head, styleElement);
        this.stylesheet = styleElement.sheet;

        this.pluginExampleActivated$ = this._projectService
            .getPlugin('example')
            .pipe( map(plugin => (plugin) ? plugin.activated : false) );

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

        this.isDecicionTableMode$ = this._eventService
            .getEvent<NewViewEvent>((event) => event.type === EventType.NEW_VIEW)
            .pipe( map(ev => ev.data.isDecisionTable) );
    }

    public onSelectedTabChanged(tabId: string) {
        this._tabId = tabId;
    }

    private clearStyleRules() {
        const count = this.stylesheet.rules.length;
        for (let i = 0; i < count; i++) {
            this.stylesheet.deleteRule(0);
        }
    }
}
