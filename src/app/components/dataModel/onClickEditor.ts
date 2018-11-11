import { Component, Output, EventEmitter } from "@angular/core";

@Component({
    selector: 'xn-on-click-editor',
    templateUrl: 'onClickEditor.html',
    styleUrls: ['onClickEditor.scss'],
})
export class OnClickEditorComponent {

    public editMode = false;

    @Output()
    public save = new EventEmitter<void>();

    public startEditing() {
        this.editMode = true;
    }

    public onSaveClicked() {
        this.editMode = false;
        this.save.emit();
    }
}
