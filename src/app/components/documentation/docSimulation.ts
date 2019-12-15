import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-simulation',
    templateUrl: 'docSimulation.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocSimulationComponent extends DocumentationComponent {

    public static title = 'Simulation';
    public title = DocSimulationComponent.title;

}
