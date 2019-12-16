import {
    Component,
    ChangeDetectionStrategy,
    ComponentFactoryResolver,
    ViewChild,
    ViewContainerRef,
    ComponentRef,
} from '@angular/core';
import { DocumentationComponent } from './documentationComponent';
import { ALL_DOCUMENTATION_COMPONENTS } from './documentationComponents';

@Component({
    selector: 'xn-dmnmgr-documentation',
    templateUrl: 'dmnmgrDocumentation.html',
    styleUrls: ['dmnmgrDocumentation.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DmnmgrDocumentationComponent {

    @ViewChild('contentContainer', { read: ViewContainerRef })
    private viewContainerRef: ViewContainerRef;
    private factoryResolver: ComponentFactoryResolver;
    private currentComponentRef: ComponentRef<any>;

    public views: {title: string, component: typeof DocumentationComponent}[] = ALL_DOCUMENTATION_COMPONENTS
        .map(component => ({title: component.title, component: component}));
    public currentView = this.views[0].title;

    constructor(factoryResolver: ComponentFactoryResolver) {
        this.factoryResolver = factoryResolver;
    }

    public open(nextTitle: string) {
        if (this.currentComponentRef) {
            this.currentComponentRef.destroy();
        }
        const view = this.views.find(v => v.title === nextTitle).component;
        const factory = this.factoryResolver
            .resolveComponentFactory(view as any);
        this.currentComponentRef = factory.create(this.viewContainerRef.parentInjector);
        this.currentComponentRef.instance.changeView.subscribe(nextView => this.open(nextView));
        this.viewContainerRef.insert(this.currentComponentRef.hostView);
        this.currentView = nextTitle;
    }
}

