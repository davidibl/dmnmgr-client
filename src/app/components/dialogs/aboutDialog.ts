import { Component, Output, EventEmitter, Input } from '@angular/core';
import { version, author, dependencies, name } from '../../../../package.json';

@Component({
    selector: 'xn-about-dialog',
    templateUrl: 'aboutDialog.html',
    styleUrls: ['aboutDialog.scss'],
})
export class AboutDialogComponent {

    public name = name;
    public version = version;
    public author = author;
    public webComponentsVersion = dependencies['@xnoname/web-components'];
    public versionDmnJs = '7.4.3';

    @Input()
    public open = false;

    @Output()
    public openChange = new EventEmitter<boolean>();

    @Output()
    public ok = new EventEmitter<void>();

    public onDialogOpenChanged(open: boolean) {
        this.open = open;
        this.openChange.emit(open);
    }

    public onOkClicked() {
        this.ok.emit();
    }
}
