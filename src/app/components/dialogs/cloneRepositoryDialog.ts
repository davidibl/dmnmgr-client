import { Component, Output, EventEmitter, Input, ViewChildren, ViewChild, QueryList } from '@angular/core';
import { WorkflowState, WorkflowStateTypes, AccordionComponent } from '@xnoname/web-components';
import { CloneData } from '../../model/git/cloneData';
import { FileService } from '../../services/fileService';
import { filter } from 'rxjs/operators';
import { FsResultType } from '../../model/fileSystemAccessResult';
import { NgForm } from '@angular/forms';

@Component({
    selector: 'xn-clone-repository-dialog',
    templateUrl: 'cloneRepositoryDialog.html',
    styleUrls: ['cloneRepositoryDialog.scss'],
})
export class CloneRepositoryDialogComponent {

    private _open = false;

    @ViewChildren(NgForm)
    private _forms: QueryList<NgForm>;

    @ViewChild(AccordionComponent, { static: true })
    private _accordion: AccordionComponent;

    public cloneData = new CloneData();

    @Input()
    public set open(open: boolean) {
        this._open = open;
    }

    public get open() {
        return this._open;
    }

    @Output()
    public openChange = new EventEmitter<boolean>();

    @Output()
    public cloneDataComplete = new EventEmitter<CloneData>();

    public constructor(private _fileService: FileService) {}

    public onWorkflowStateChanged(workflowState: WorkflowState) {
        if (workflowState.state === WorkflowStateTypes.FINISHED) {
            this.cloneDataComplete.emit(Object.assign({}, this.cloneData));
            this.reset();
        }
    }

    public onChooseFile() {
        this._fileService
            .chooseFolder()
            .pipe(
                filter(result => result.type === FsResultType.OK)
            )
            .subscribe(result => this.cloneData.destinationPath = result.filepath);
    }

    public onDialogOpenChanged(open: boolean) {
        this.reset();
        this._open = open;
        this.openChange.emit(open);
    }

    public reset() {
        this._forms.forEach(form => form.resetForm());
        this._accordion.openStep(1);
    }
}
