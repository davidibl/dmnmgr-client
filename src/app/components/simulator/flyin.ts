import { Component, Input, EventEmitter, Output } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
    selector: 'xn-flyin',
    templateUrl: 'flyin.html',
    styleUrls: ['flyin.scss'],
    animations: [
        trigger('slideInOut', [
            state('void', style({ transform: 'translateX(100%)' })),
            state('*', style({ transform: 'translateX(-100%' })),
            transition('* => void', animate(300)),
            transition('void => *', animate(300))
        ])
    ]
})
export class FlyinComponent {

    private _visible = false;

    @Input()
    public set visible(visible: boolean) {
        this._visible = visible;
    }

    @Output()
    public visibleChange = new EventEmitter<boolean>();

    public get visible() {
        return this._visible;
    }

    public closeFlyout() {
        this._visible = false;
        this.visibleChange.emit(this._visible);
    }
}
