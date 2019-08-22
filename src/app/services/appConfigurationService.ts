import { Injectable } from '@angular/core';
import { FileService } from './fileService';
import { AppConfig } from '../model/appConfiguration/appConfig';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { FsResultType } from '../model/fileSystemAccessResult';
import { MostRecentFile } from '../model/appConfiguration/mostRecentFile';
import { concatPath } from '@xnoname/web-components';

@Injectable()
export class AppConfigurationService {

    private static _configFilename = '.dmnmgr.config.json';
    private static _emptyDefault = { mostRecent: [], simulatorBaseUrl: 'http://localhost:11401' };

    private _currentConfiguration: AppConfig;
    private set currentConfiguration(appConfig: AppConfig) {
        this._currentConfiguration = appConfig;
        this._configurationCache.next(this._currentConfiguration);
    }
    private _configurationCache = new BehaviorSubject<AppConfig>(AppConfigurationService._emptyDefault);

    public constructor(private _fileService: FileService) { this.init(); }

    private init() {
        console.log(this._fileService.getUserDataPath());
        this._fileService
            .openOrCreateFile<AppConfig>(this.getFilename(), AppConfigurationService._emptyDefault)
            .subscribe(configFileResult => {
                if (configFileResult.type !== FsResultType.OK) { return; }
                this.currentConfiguration = configFileResult.data;
            });
    }

    public getBaseUrlSimulator(): Observable<string> {
        return this._configurationCache
            .pipe( map(config => config.simulatorBaseUrl ));
    }

    public getMostRecentFiles(): Observable<MostRecentFile[]> {
        return this._configurationCache
            .pipe( map(config => config.mostRecent ));
    }

    public addMostRecentFile(path: string) {
        const name = path.substring(path.lastIndexOf('\\') + 1);

        const elementIndex = this._currentConfiguration.mostRecent.findIndex(element => element.path === path);
        if (elementIndex > -1) {
            this._currentConfiguration.mostRecent.splice(elementIndex, 1);
        }

        this._currentConfiguration.mostRecent.splice(0, 0, { name: name, path: path });

        if (this._currentConfiguration.mostRecent.length > 10) {
            this._currentConfiguration.mostRecent.splice(10, 1);
        }

        this._configurationCache.next(this._currentConfiguration);

        this._fileService
            .saveFile(this.getFilename(), this._currentConfiguration)
            .subscribe();
    }

    private getFilename() {
        return concatPath(this._fileService.getUserDataPath(), AppConfigurationService._configFilename);
    }

}
