import { Component, OnInit } from '@angular/core';
import { DeploymentService } from '../../../services/deploymentService';
import { DomSanitizer } from '@angular/platform-browser';
import { take } from 'rxjs/operators/take';
import { DmnProjectService } from '../../../services/dmnProjectService';

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
        this.configurePlugin({ url: iframeUrl, deploymentUrl: this.deploymentUrl });
        this.setIframeUrl(iframeUrl);
    }

    public get deploymentUrl() {
        return this._deploymentUrl;
    }

    public set deploymentUrl(deploymentUrl: string) {
        if (this._deploymentUrl === deploymentUrl) { return; }
        this._deploymentUrl = deploymentUrl;
        this.configurePlugin({ url: this.iframeUrl, deploymentUrl: this.deploymentUrl });
    }

    public constructor(private _deploymentService: DeploymentService,
                       private _projectService: DmnProjectService,
                       private sanitizer: DomSanitizer) {}

    public ngOnInit() {
        this.getPlugin()
            .subscribe(pluginConfiguration => {
                if (!pluginConfiguration || !pluginConfiguration.configuration) { this.reset(); return; }
                this.setIframeUrl(pluginConfiguration.configuration.url);
                this._deploymentUrl = pluginConfiguration.configuration.deploymentUrl;
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

    private setIframeUrl(iframeUrl: string) {
        this._iframeUrl = iframeUrl;
        if (!iframeUrl) { this.sanitizedUrl = null; return; }
        this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeUrl);
    }

    private configurePlugin(configuration: any) {
        this.getPlugin()
            .pipe(
                take(1)
            )
            .subscribe(plugin => this._projectService.configurePlugin(plugin.id, configuration));
    }

    private getPlugin() {
        return this._projectService
            .getPlugin('example');
    }

    private reset() {
        this._deploymentUrl = null;
        this._iframeUrl = null;
        this.sanitizedUrl = null;
    }
}
