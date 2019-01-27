export interface PluginDescriptor {
    id: string;
    label?: string;
    icon?: string;
}

export const Plugins: PluginDescriptor[] = [
    {
        id: 'example',
        label: 'Beispiel Anwendung',
        icon: 'fa-internet-explorer',
    }
]
