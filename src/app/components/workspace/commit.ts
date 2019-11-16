import { Component, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import { GitCommit } from '../../model/git/gitCommit';
import { trigger, transition, style, animate, state, group } from '@angular/animations';

const SHOW_MENU = 'in';
const HIDE_MENU = 'out';

@Component({
    selector: 'xn-commit',
    templateUrl: 'commit.html',
    styleUrls: ['commit.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [trigger('slideInOut', [
        state('in', style({
            'max-height': '500px', 'opacity': '1', 'visibility': 'visible'
        })),
        state('out', style({
            'max-height': '0px', 'opacity': '0', 'visibility': 'hidden'
        })),
        transition('in => out', [group([
            animate('100ms ease-in-out', style({
                'opacity': '0'
            })),
            animate('100ms ease-in-out', style({
                'max-height': '0px'
            })),
            animate('200ms ease-in-out', style({
                'visibility': 'hidden'
            }))
        ]
        )]),
        transition('out => in', [group([
            animate('1ms ease-in-out', style({
                'visibility': 'visible'
            })),
            animate('200ms ease-in-out', style({
                'max-height': '500px'
            })),
            animate('200ms ease-in-out', style({
                'opacity': '1'
            }))
        ]
        )])
    ])],
})
export class CommitComponent {

    public showCommitMenu = HIDE_MENU;

    @Input()
    public commit: GitCommit;

    @Output()
    public commitSelect = new EventEmitter<GitCommit>();

    public selectCommit() {
        this.showCommitMenu = this.showCommitMenu === SHOW_MENU ? HIDE_MENU : SHOW_MENU;
    }

    public checkout() {
        this.commitSelect.emit(this.commit);
    }
}
