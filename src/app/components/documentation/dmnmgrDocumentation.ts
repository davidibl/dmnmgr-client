import {
    Component,
    ChangeDetectionStrategy,
    ComponentFactoryResolver,
    ViewChild,
    ViewContainerRef,
    ComponentRef,
    AfterViewInit
} from '@angular/core';
import { DocumentationComponent } from './documentationComponent';
import { ALL_DOCUMENTATION_COMPONENTS } from './documentationComponents';

@Component({
    selector: 'xn-dmnmgr-documentation',
    templateUrl: 'dmnmgrDocumentation.html',
    styleUrls: ['dmnmgrDocumentation.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DmnmgrDocumentationComponent implements AfterViewInit {

    @ViewChild('dynamic', { read: ViewContainerRef })
    private viewContainerRef: ViewContainerRef;
    private factoryResolver: ComponentFactoryResolver;
    private currentComponentRef: ComponentRef<any>;

    public views: DocumentationComponent[] = ALL_DOCUMENTATION_COMPONENTS;

    constructor(factoryResolver: ComponentFactoryResolver) {
        this.factoryResolver = factoryResolver;
    }

    public ngAfterViewInit() {
        this.open(this.views[0].title);
    }

    public open(title: string) {
        if (this.currentComponentRef) {
            this.currentComponentRef.destroy();
        }
        const view = this.views.find(v => v.title === title);
        const factory = this.factoryResolver
            .resolveComponentFactory(view as any);
        this.currentComponentRef = factory.create(this.viewContainerRef.parentInjector);
        this.viewContainerRef.insert(this.currentComponentRef.hostView);
    }
}

