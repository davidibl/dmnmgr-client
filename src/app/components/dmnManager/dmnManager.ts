import { Component, Inject, OnInit, Renderer2, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { TestDecisionService } from '../../services/testDecisionService';
import { EventService } from '../../services/eventService';
import { EventType } from '../../model/event/eventType';
import { NewViewEvent } from '../../model/event/newViewEvent';
import { TabsComponent } from '@xnoname/web-components';
import { DmnProjectService } from '../../services/dmnProjectService';
import { BaseEvent } from '../../model/event/event';
import { TabIds } from '../../model/tabIds';

@Component({
    selector: 'xn-dmn-manager',
    templateUrl: 'dmnManager.html',
    styleUrls: ['dmnManager.scss'],
})
export class DmnManagerComponent implements OnInit {

    @ViewChild(TabsComponent)
    private tabs: TabsComponent;

    private stylesheet: any = null;

    public tabIds = TabIds;

    public isDecicionTableMode$: Observable<boolean>;

    public pluginExampleActivated$: Observable<boolean>;

    public showSimulator$ = new BehaviorSubject<boolean>(false);

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

        combineLatest(
            this._testDecisionService.getResult(),
            this._testDecisionService.getShowHitsOnly()
        )
        .subscribe(([result, showHitsOnly]) => {
            this.clearStyleRules();
            if (result && result.resultRuleIds && result.resultRuleIds.length > 0) {
                result.resultRuleIds.forEach(rule => {
                    this.stylesheet.insertRule(`td[data-row-id="${rule}"] { display: table-cell; background-color: #def1c3; }`);
                });
                if (showHitsOnly) {
                    this.stylesheet.insertRule(`td[data-row-id] { display: none; }`);
                }
            }
        });

        this.isDecicionTableMode$ = this._eventService
            .getEvent<NewViewEvent>((event) => event.type === EventType.NEW_VIEW)
            .pipe( map(ev => ev.data.isDecisionTable) );

        this._eventService
            .getEvent((ev) => ev.type === EventType.JUMP_TO_TEST)
            .pipe( map(_ => 'test-editor') )
            .subscribe(newTab => this.tabs.selectTabById(newTab));

        this._eventService
            .getEvent<BaseEvent<string>>((ev) => ev.type === EventType.JUMP_TO_TAB)
            .pipe( map((ev) => ev.data))
            .subscribe(tabId => this.tabs.selectTabById(tabId));
    }

    public onSelectedTabChanged(tabId: string) {
        this.showSimulator$.next((tabId === TabIds.editor));
    }

    private clearStyleRules() {
        const count = this.stylesheet.rules.length;
        for (let i = 0; i < count; i++) {
            this.stylesheet.deleteRule(0);
        }
    }
}
