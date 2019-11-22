import { Component, ChangeDetectionStrategy, Output, EventEmitter, Input } from '@angular/core';
import { WorkflowState, WorkflowStateTypes } from '@xnoname/web-components';
import { CloneData } from '../../model/git/cloneData';
import { FileService } from '../../services/fileService';
import { filter } from 'rxjs/operators';
import { FsResultType } from '../../model/fileSystemAccessResult';

@Component({
    selector: 'xn-clone-repository-dialog',
    templateUrl: 'cloneRepositoryDialog.html',
    styleUrls: ['cloneRepositoryDialog.scss'],
})
export class CloneRepositoryDialogComponent {

    public cloneData = new CloneData();

    @Input()
    public open = false;

    @Output()
    public openChange = new EventEmitter<boolean>();

    @Output()
    public cloneDataComplete = new EventEmitter<CloneData>();

    public constructor(private _fileService: FileService) {}

    public onWorkflowStateChanged(workflowState: WorkflowState) {
        if (workflowState.state === WorkflowStateTypes.FINISHED) {
            this.cloneDataComplete.emit(this.cloneData);
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
        this.open = open;
        this.openChange.emit(open);
    }
}
