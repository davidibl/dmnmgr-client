import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { GitCommit } from '../../model/git/gitCommit';

@Component({
    selector: 'xn-commit',
    templateUrl: 'commit.html',
    styleUrls: ['commit.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommitComponent {

    @Input()
    public commit: GitCommit;
}
