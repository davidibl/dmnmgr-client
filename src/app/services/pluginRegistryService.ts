import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { PluginMetaDescriptor } from '../model/plugin/pluginMetaDescriptor';

@Injectable()
export class PluginRegistryService {

    private plugins: PluginMetaDescriptor[] = [
        {
            id: 'example',
            label: 'Beispiel Anwendung',
            icon: 'fa-internet-explorer',
        }
    ];

    private pluginSubject = new BehaviorSubject<PluginMetaDescriptor[]>(this.plugins);

    public registerPlugin(plugin: PluginMetaDescriptor) {
        this.plugins.push(plugin);
        this.pluginSubject.next(this.plugins);
    }

    public getPlugins(): Observable<PluginMetaDescriptor[]> {
        return this.pluginSubject.asObservable();
    }
}
