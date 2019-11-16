import { Injectable, Renderer2, ElementRef } from '@angular/core';

export class DomService {

    public constructor(private document: Document, private _renderer: Renderer2) {}

    public createStylesheet() {
        const styleElement = this._renderer.createElement('style');
        const text = this._renderer.createText('');
        this._renderer.appendChild(styleElement, text);
        this._renderer.appendChild(this.document.head, styleElement);
        return styleElement.sheet;
    }

    public appendErrorElement(domSelector: string) {
        const icon = this._renderer.createElement('i');
        this._renderer.addClass(icon, 'fa');
        this._renderer.addClass(icon, 'fa-exclamation-triangle');
        this._renderer.setStyle(icon, 'float', 'right');
        this._renderer.setStyle(icon, 'margin-top', '4px');
        this._renderer.setStyle(icon, 'color', '#f13943');
        this._renderer.setAttribute(icon, 'aria-hidden', 'true');
        const host = this.document.querySelector(domSelector);
        this._renderer.appendChild(host, icon);
        return { host: host, child: icon};
    }

    public duplicateDmnTableHeader(element: ElementRef) {
        const headElement = element.nativeElement.querySelectorAll('.tjs-table > thead')[0];
        const tableElement = element.nativeElement.querySelectorAll('.tjs-table')[0];
        const newHeadElement = this.document.importNode(headElement, true);
        this._renderer.setStyle(newHeadElement, 'position', 'absolute');
        this._renderer.setStyle(newHeadElement, 'top', '0px');
        this._renderer.setStyle(newHeadElement, 'z-index', '1');
        this._renderer.setStyle(newHeadElement, 'background-color', 'white');
        this._renderer.insertBefore(tableElement, newHeadElement, headElement);
        this.synchronizeHeaderWidth(newHeadElement, null, headElement);
        return newHeadElement;
    }

    public scrollStaticHeaderHorizontal(newHeadElement: any, newPosition: number) {
        this._renderer.setStyle(newHeadElement, 'left', newPosition + 'px');
    }

    public removeStaticHead(elementRef: ElementRef, newHeadElement: any) {
        const tableElement = elementRef.nativeElement.querySelectorAll('.tjs-table')[0];
        this._renderer.removeChild(tableElement, newHeadElement);
    }

    public synchronizeHeaderWidth(newHeadElement: any, element: ElementRef, headElement?: any) {
        if (!newHeadElement || (!element && !headElement)) {
            return;
        }
        headElement = (!!headElement) ? headElement : element.nativeElement.querySelectorAll('.tjs-table > thead')[0];
        this.synchronizeWidth(headElement, newHeadElement, (el) => {
            const headerRow = el.children[0];
            return headerRow.children[0];
        });
        this.synchronizeWidth(headElement, newHeadElement, (el) => {
            const headerRow = el.children[0];
            return headerRow.children[headerRow.children.length - 1];
        });
        for (let i = 0; i < headElement.children[1].children.length; i++) {
            this.synchronizeWidth(headElement, newHeadElement, (el) => {
                return el.children[1].children[i];
            });
        }
    }

    private synchronizeWidth(elementFrom, elementTo, getter: (element: any) => any) {
        const el1 = getter(elementFrom);
        const el2 = getter(elementTo);

        const newWidth = (el1.offsetWidth + el1.clientWidth) / 2;
        this._renderer.setStyle(el2, 'width', newWidth + 'px');
        this._renderer.setStyle(el2, 'min-width', newWidth + 'px');
    }
}
