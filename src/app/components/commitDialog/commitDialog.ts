import { Component, Input, Output, EventEmitter, OnDestroy, ViewChild } from '@angular/core';
import { FileToCommit } from '../../model/git/fileToCommit';
import { NewCommit } from 'src/app/model/git/newCommit';
import { NgForm } from '@angular/forms';

@Component({
    selector: 'xn-commit-dialog',
    templateUrl: 'commitDialog.html',
})
export class CommitDialogComponent {

    private _files: FileToCommit[];

    public selectedFiles: FileToCommit[] = [];

    @Input()
    public open = false;

    @Input()
    public set files(files: FileToCommit[]) {
        this._files = files;
        this.selectAllFiles();
    }

    public get files() {
        return this._files;
    }

    @Output()
    public openChange = new EventEmitter<boolean>();

    public commitMessage: string;

    @Output()
    public cancel = new EventEmitter<void>();

    @Output()
    public commit = new EventEmitter<NewCommit>();

    public onDialogOpenChanged(open: boolean) {
        this.open = open;
        this.openChange.emit(open);
    }

    public onCommitClicked() {
        this.commit.emit(new NewCommit(this.commitMessage, false, this.selectedFiles.map(file => file.file)));
    }

    public onCancelClicked() {
        this.cancel.emit();
    }

    public onSelectAllChanged() {
        this.selectAllFiles();
    }

    public reset() {
        this.commitMessage = null;
        this.selectAllFiles();
    }

    private selectAllFiles() {
        this.selectedFiles = this.files.slice(0, this.files.length);
    }

}
