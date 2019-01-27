import { Component, OnInit } from '@angular/core';
import { DeploymentService } from '../../../services/deploymentService';
import { DomSanitizer } from '@angular/platform-browser';
import { SessionDataService } from '../../../services/sessionDataService';
import { take } from 'rxjs/operators/take';

@Component({
    selector: 'xn-iframe-tab',
    templateUrl: 'iframeTab.html',
    styleUrls: ['iframeTab.scss'],
})
export class IframeTabComponent implements OnInit {

    private _iframeUrl: string;
    public sanitizedUrl = null;
    public _deploymentUrl: string;

    public get iframeUrl() {
        return this._iframeUrl;
    }

    public set iframeUrl(iframeUrl: string) {
        if (this.iframeUrl === iframeUrl) { return; }
        this._iframeUrl = iframeUrl;
        this._sessionService.setPermanentValue('example', { url: this.iframeUrl, deploymentUrl: this.deploymentUrl });
        if (!iframeUrl) { this.sanitizedUrl = null; return; }
        this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeUrl);
    }

    public get deploymentUrl() {
        return this._deploymentUrl;
    }

    public set deploymentUrl(deploymentUrl: string) {
        this._deploymentUrl = deploymentUrl;
        this._sessionService.setPermanentValue('example', { url: this.iframeUrl, deploymentUrl: this.deploymentUrl });
    }

    public constructor(private _deploymentService: DeploymentService,
                       private _sessionService: SessionDataService,
                       private sanitizer: DomSanitizer) {}

    public ngOnInit() {
        this._sessionService
            .getPermanentValue('example')
            .pipe( take(1) )
            .subscribe(value => {
                if (value) {
                    this.iframeUrl = value['url'];
                    this.deploymentUrl = value['deploymentUrl'];
                }
            });
    }

    public deployDmn() {
        this._deploymentService
            .deployXml(this.deploymentUrl)
            .subscribe(_ => {
                if (this._iframeUrl) {
                    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeUrl);
                }
            });
    }
}
