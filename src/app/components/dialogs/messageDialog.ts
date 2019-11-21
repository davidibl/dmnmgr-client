import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
    selector: 'xn-message-dialog',
    templateUrl: 'messageDialog.html',
    styleUrls: ['messageDialog.scss'],
})
export class MessageDialogComponent {

    @Input()
    public message: string;

    @Input()
    public title: string;

    @Input()
    public open = false;

    @Input()
    public showLoadingIndicator = false;

    @Input()
    public isClosable = true;

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

    public reset() {
        this.open = false;
        this.showLoadingIndicator = false;
        this.message = null;
        this.title = null;
        this.isClosable = true;
    }
}
