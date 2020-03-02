import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Changelog, Version } from '../model/changelog';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Change } from '../model/change';

@Injectable()
export class ChangelogService {

    public constructor(private _http: HttpClient) {}

    public getChangelog(): Observable<Changelog> {
        return this._http
            .get('assets/CHANGELOG.md', { responseType: 'text' })
            .pipe(map(text => this.toChangelog(text)));
    }

    private toChangelog(text: string): Changelog {
        const changelog = new Changelog();
        changelog.versions.push(new Version('up to come'));
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i]) {
                continue;
            }
            if (lines[i].indexOf('##') === 0) {
                continue;
            }
            const matches = lines[i].match(/\* (\d+\.\d+\.\d+).+/);
            if (!!matches && matches.length > 0) {
                changelog.versions.push(new Version(matches[1]));
                continue;
            }

            const changeMatches = lines[i].match(/\* (.+): (.+) \(.+\(.+/);

            if (!changeMatches || changeMatches.length < 3) {
                continue;
            }

            const change = new Change(changeMatches[1], changeMatches[2]);

            if (!changelog.versions[changelog.versions.length - 1][change.type.toLowerCase()]) {
                continue;
            }

            changelog.versions[changelog.versions.length - 1][change.type.toLowerCase()].push(change);
        }
        return changelog;
    }

}
