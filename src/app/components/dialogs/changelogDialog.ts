import { Component, ChangeDetectionStrategy, Output, Input, EventEmitter } from '@angular/core';
import { ChangelogService } from '../../services/changelogService';

@Component({
    selector: 'xn-changelog-dialog',
    templateUrl: 'changelogDialog.html',
    styleUrls: ['changelogDialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogDialogComponent {

    public changes$ = this._changelogService.getChangelog();

    @Output()
    public openChange = new EventEmitter<boolean>();

    @Input()
    public open = false;

    public constructor(private _changelogService: ChangelogService) {}

    public onDialogOpenChanged(open: boolean) {
        this.open = open;
        this.openChange.emit(open);
    }
}
