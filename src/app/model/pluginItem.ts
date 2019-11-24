import { PluginMetaDescriptor } from './plugin/pluginMetaDescriptor';

export interface PluginItem extends PluginMetaDescriptor {
    activated: boolean;
}
