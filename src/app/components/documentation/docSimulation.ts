import { Component, ChangeDetectionStrategy, EventEmitter } from '@angular/core';
import { DocumentationComponent } from './documentationComponent';

@Component({
    selector: 'xn-doc-simulation',
    templateUrl: 'docSimulation.html',
    styleUrls: ['documentationComponent.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocSimulationComponent extends DocumentationComponent {

    public static title = 'Simulation';
    public title = DocSimulationComponent.title;

}
