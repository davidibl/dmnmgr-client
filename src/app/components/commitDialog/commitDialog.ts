import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'xn-commit-dialog',
    templateUrl: 'commitDialog.html',
})
export class CommitDialogComponent {

    @Input()
    public open = false;

    @Output()
    public openChange = new EventEmitter<boolean>();

    public commitMessage: string;

    @Output()
    public cancel = new EventEmitter<void>();

    @Output()
    public commit = new EventEmitter<string>();

    public onDialogOpenChanged(open: boolean) {
        this.open = open;
        this.openChange.emit(open);
    }

    public onCommitClicked() {
        this.commit.emit(this.commitMessage);
    }

    public onCancelClicked() {
        this.cancel.emit();
    }

}
