import { Component } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { DmnValidationService } from '../../services/dmnValidationService';
import { map } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

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

    public currentStatus$ = new BehaviorSubject('Bereit');

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
    ) {}

    public toggleView(mode: string) {
        if (!this.flyin || this.mode === mode) {
            this.flyin = !this.flyin;
        }
        this.mode = (!!mode) ? mode : this.ERROR_MODE;
    }
}
