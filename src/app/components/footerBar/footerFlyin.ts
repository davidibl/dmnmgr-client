import { Component } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { DmnValidationService } from '../../services/dmnValidationService';
import { map } from 'rxjs/operators';
import { WorkingStateService } from '../../services/workingStateService';
import { IDmnValidationResult } from '../../model/dmnValidationResult';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event/event';
import { EventType } from '../../model/event/eventType';

@Component({
    selector: 'xn-footer-flyin',
    templateUrl: 'footerFlyin.html',
    styleUrls: ['footerFlyin.scss'],
    animations: [
        trigger('flyin', [
            state('true', style({ transform: 'translateY(0px)' })),
            state('false', style({ transform: 'translateY(260px)' })),
            transition('true => false', animate(150)),
            transition('false => true', animate(150))
        ])
    ]
})
export class FooterFlyinComponent {

    public ERROR_MODE = 'error';
    public WARNING_MODE = 'warning';

    public flyin = false;
    public mode = 'true';
    public warningMode = false;

    public currentStatus$ = this._workingStateService.getWorkingState();

    public selectedHint = null;

    public errors$ = this._validationService
        .getLastValidationResult()
        .pipe(map(response => (!!response) ? response.errors : []));

    public warnings$ = this._validationService
        .getLastValidationResult()
        .pipe(map(response => (!!response) ? response.warnings : []));

    public errorCount$ = this.errors$
        .pipe(map(result => (!!result) ? result.length : 0));

    public warningCount$ = this.warnings$
        .pipe(map(result => (!!result) ? result.length : 0));

    public constructor(
        private _validationService: DmnValidationService,
        private _workingStateService: WorkingStateService,
        private _eventService: EventService,
    ) {}

    public toggleView(mode: string) {
        if (!this.flyin || this.mode === mode) {
            this.flyin = !this.flyin;
        }
        this.mode = (!!mode) ? mode : this.ERROR_MODE;
    }

    public openHint(item: IDmnValidationResult) {
        if (!item || !item.tableId) {
            return;
        }
        if (this.selectedHint === item) {
            this._eventService.publishEvent(new BaseEvent(EventType.CLEAR_HINT));
            this.selectedHint = null;
            return;
        }
        this.selectedHint = item;
        this._eventService.publishEvent(new BaseEvent(EventType.JUMP_TO_HINT, item));
    }
}
