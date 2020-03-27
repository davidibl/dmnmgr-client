import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { DmnValidationService } from '../../services/dmnValidationService';
import { map, tap, take } from 'rxjs/operators';
import { WorkingStateService } from '../../services/workingStateService';
import { IDmnValidationResult } from '../../model/dmnValidationResult';
import { EventService } from '../../services/eventService';
import { BaseEvent } from '../../model/event/event';
import { EventType } from '../../model/event/eventType';
import { BehaviorSubject, combineLatest } from 'rxjs';

@Component({
    selector: 'xn-footer-flyin',
    templateUrl: 'footerFlyin.html',
    styleUrls: ['footerFlyin.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
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

    public flyin$ = new BehaviorSubject<boolean>(false);
    public mode$ = new BehaviorSubject<string>(null);

    public warningsSelected$ = combineLatest(this.flyin$, this.mode$).pipe(
        map(([flyin, mode]) => flyin === true && mode === this.WARNING_MODE)
    );

    public errorsSelected$ = combineLatest(this.flyin$, this.mode$).pipe(
        map(([flyin, mode]) => flyin === true && mode === this.ERROR_MODE)
    );

    public errorsMode$ = this.mode$.pipe(map(mode => mode === this.ERROR_MODE));

    public warningsMode$ = this.mode$.pipe(map(mode => mode === this.WARNING_MODE));

    public currentStatus$ = combineLatest(
        this._workingStateService.getWorkingState(),
        this._validationService.getError()
    ).pipe(map(([workingState, error]) => (!!error) ? error.message : workingState));

    public selectedHint = null;

    public errors$ = this._validationService
        .getLastValidationResult()
        .pipe(
            tap(_ => this.clearCurrentSelection()),
            map(response => (!!response) ? response.errors : []));

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
        private _changeDetector: ChangeDetectorRef,
    ) {}

    public toggleView(mode: string) {
        combineLatest(this.flyin$, this.mode$)
            .pipe(take(1))
            .subscribe(([flyin, currentMode]) => {
                if (!flyin || currentMode === mode) {
                    this.flyin$.next(!flyin);
                } else if (currentMode !== mode) {
                    this.clearCurrentSelection();
                }
                this.mode$.next((!!mode) ? mode : this.ERROR_MODE);
            });
    }

    public openHint(item: IDmnValidationResult) {
        if (!item || !item.tableId) {
            return;
        }
        if (this.selectedHint === item) {
            this.clearCurrentSelection();
            return;
        }
        this.selectedHint = item;
        this._eventService.publishEvent(new BaseEvent(EventType.JUMP_TO_HINT, item));
        this._changeDetector.detectChanges();
    }

    private clearCurrentSelection() {
        this._eventService.publishEvent(new BaseEvent(EventType.CLEAR_HINT));
        this.selectedHint = null;
        this._changeDetector.detectChanges();
    }
}
