import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@Injectable()
export class PluginRegistryService {

    private plugins = new Set<string>();
    private pluginSubject = new BehaviorSubject<Set<string>>(this.plugins);

    public registerPlugin(plugin: string) {
        this.plugins.add(plugin);
        this.pluginSubject.next(this.plugins);
    }

    public getPlugins(): Observable<Set<string>> {
        return this.pluginSubject.asObservable();
    }
}
