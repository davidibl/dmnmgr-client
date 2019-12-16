import { EventEmitter } from '@angular/core';

export class DocumentationComponent {
    static title: string;
    public title: string;

    public changeView = new EventEmitter<string>();

    public dispatch(title: string) {
        this.changeView.emit(title);
    }
}
