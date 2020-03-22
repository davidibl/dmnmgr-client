import { DmnModelerView } from './dmnModelerView';
import { MyDmnModdle } from './dmnModdle';

export interface DMNJS {
    _viewers: any;
    _activeView: DmnModelerView;
    _moddle: MyDmnModdle;
    importXML(xml: string, callback: (error: any) => void);
    saveXML(options: any, callback: (error: any, xml: string) => void);
    getViews(): DmnModelerView[];
    on(eventname: string, eventCallback: (event) => void);
    _updateViews(): void;
    _switchView(tableId: string);
    getActiveViewer(): DmnModelerView;
}
