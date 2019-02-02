import { Injectable } from '@angular/core';
import { FileService } from './fileService';
import { AppConfig } from '../model/appConfiguration/appConfig';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators/map';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { FsResultType } from '../model/fileSystemAccessResult';
import { MostRecentFile } from '../model/appConfiguration/mostRecentFile';

@Injectable()
export class AppConfigurationService {

    private static _configFilename = 'dmnmgr.config.json';
    private static _emptyDefault = { mostRecent: [] };

    private _currentConfiguration: AppConfig;
    private set currentConfiguration(appConfig: AppConfig) {
        this._currentConfiguration = appConfig;
        this._configurationCache.next(this._currentConfiguration);
    }
    private _configurationCache = new BehaviorSubject<AppConfig>(AppConfigurationService._emptyDefault);

    public constructor(private _fileService: FileService) { this.init(); }

    private init() {
        this._fileService
            .openOrCreateFile<AppConfig>(this.getFilename(), AppConfigurationService._emptyDefault)
            .subscribe(configFileResult => {
                if (configFileResult.type !== FsResultType.OK) { return; }
                this.currentConfiguration = configFileResult.data;
            });
    }

    public getMostRecentFiles(): Observable<MostRecentFile[]> {
        return this._configurationCache
            .pipe( map(config => config.mostRecent ));
    }

    public addMostRecentFile(path: string) {
        const name = path.substring(path.lastIndexOf('\\') + 1);

        this._currentConfiguration.mostRecent.splice(0, 0, { name: name, path: path });

        if (this._currentConfiguration.mostRecent.length > 10) {
            this._currentConfiguration.mostRecent.splice(9, 1);
        }

        this._configurationCache.next(this._currentConfiguration);

        this._fileService
            .saveFile(this.getFilename(), this._currentConfiguration)
            .subscribe();
    }

    private getFilename() {
        return AppConfigurationService._configFilename;
    }

}
