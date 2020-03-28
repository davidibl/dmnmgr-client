import { Component, Input } from '@angular/core';

@Component({
    selector: 'xn-application-menu',
    templateUrl: 'applicationMenu.html',
    styleUrls: ['applicationMenu.scss'],
})
export class ApplicationMenuComponent {

    @Input()
    public brandLogoSource: string;

    @Input()
    public brandName: string;
}
