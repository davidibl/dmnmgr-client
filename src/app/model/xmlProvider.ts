import { Observable } from 'rxjs';

export class XmlProvider {
    type: string;
    saveFunc: () => Observable<string>;
}
