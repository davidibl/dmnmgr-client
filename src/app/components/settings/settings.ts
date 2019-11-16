import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AppConfigurationService } from '../../services/appConfigurationService';
import { AppConfig } from '../../model/appConfiguration/appConfig';
import { map, tap } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
    selector: 'xn-settings',
    templateUrl: 'settings.html',
    styleUrls: ['settings.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnDestroy, OnInit {

    private _subscription: Subscription;
    private _originalConfiguration: AppConfig;

    public configuration: AppConfig;

    public constructor(
        private _configurationService: AppConfigurationService,
        private _changeDetector: ChangeDetectorRef,
    ) {}

    public ngOnInit() {
        this._subscription = this._configurationService
            .getConfiguration()
            .pipe(
                map(configuration => JSON.parse(JSON.stringify(configuration))),
                tap(configuration => this._originalConfiguration = configuration),
                map(configuration => JSON.parse(JSON.stringify(configuration))),
                tap(configuration => this.configuration = configuration),
                tap(_ => this._changeDetector.markForCheck())
            )
            .subscribe();
    }

    public ngOnDestroy(): void {
        if (!this._subscription) { return; }
        this._subscription.unsubscribe();
    }

    public saveSettings() {
        this._configurationService.saveConfiguration(this.configuration);
    }

    public discard() {
        this._configurationService.discardChangesConfiguration();
    }

    public isChanged() {
        return JSON.stringify(this.configuration) !== JSON.stringify(this._originalConfiguration);
    }
}
