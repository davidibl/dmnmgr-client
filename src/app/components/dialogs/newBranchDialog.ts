import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'xn-new-branch-dialog',
    templateUrl: 'newBranchDialog.html',
})
export class NewBranchDialogComponent {

    @Input()
    public open = false;

    @Output()
    public openChange = new EventEmitter<boolean>();

    public branchname: string;

    @Output()
    public cancel = new EventEmitter<void>();

    @Output()
    public branch = new EventEmitter<string>();

    public onDialogOpenChanged(open: boolean) {
        this.open = open;
        this.openChange.emit(open);
    }

    public onCreateBranchClicked() {
        this.branch.emit(this.branchname);
    }

    public onCancelClicked() {
        this.cancel.emit();
    }
}
