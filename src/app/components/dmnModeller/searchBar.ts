import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { take, debounceTime } from 'rxjs/operators';
import { isNull } from '@xnoname/web-components';
import { DmnColumn } from '../../model/dmn/dmnColumn';
import { SearchRequest, ReplaceRequest } from '../../model/searchRequest';

@Component({
    selector: 'xn-search-bar',
    templateUrl: 'searchBar.html',
    styleUrls: ['searchBar.scss'],
})
export class SearchBarComponent implements OnInit {

    private _debounceSubject = new ReplaySubject<() => void>(1);

    public _searchOpen = false;

    public searchValue: string;
    public searchColumn: string = null;
    public replaceWhat: string;
    public replaceWith: string;
    public replaceColumn: string = null;

    @Input()
    public currentColumns: DmnColumn[] = [];

    @Input()
    public set searchOpen(searchOpen: boolean) {
        this._searchOpen = searchOpen;
        if (!this._searchOpen) {
            this.clearSearch();
        }
    }

    public get searchOpen() {
        return this._searchOpen;
    }

    @Output()
    public searchRequested = new EventEmitter<SearchRequest>();

    @Output()
    public replaceRequested = new EventEmitter<ReplaceRequest>();

    @Output()
    public searchCleared = new EventEmitter<void>();

    public searchMinimized$ = new BehaviorSubject(false);
    public replaceOpen$ = new BehaviorSubject(false);

    public ngOnInit() {
        this._debounceSubject.pipe(debounceTime(500)).subscribe(func => func());
    }

    public onSearchValueChanged(searchValue: string) {
        this.searchValue = searchValue;
        this.emitSearchRequest();
    }

    public onSearchColumnChanged(searchColumn: string) {
        this.searchColumn = searchColumn;
        this.emitSearchRequestImmediately();
    }

    public emitSearchRequest() {
        this._debounceSubject.next(() => this.emitSearchRequestImmediately());
    }

    public emitSearchRequestImmediately() {
        this.searchRequested.emit(
            new SearchRequest(
                this.searchValue,
                this.searchColumn));
    }

    public searchAndReplace() {
        this.replaceRequested.emit(
            new ReplaceRequest(
                this.searchValue,
                this.searchColumn,
                this.replaceWhat,
                this.replaceWith,
                this.replaceColumn,
            )
        );
    }

    public minimize() {
        this.searchMinimized$.next(true);
    }

    public maximize() {
        this.searchMinimized$.next(false);
    }

    public toggleReplace(open?: boolean) {
        this.replaceOpen$
            .pipe(take(1))
            .subscribe(replaceOpen => {
                replaceOpen = isNull(open) ? !replaceOpen : open;
                this.replaceOpen$.next(replaceOpen);
                if (!replaceOpen) {
                    this.clearReplace();
                }
            });
    }

    public closeAndClearSearch() {
        this._searchOpen = false;
        this.clearSearch();
        this.clearReplace();
    }

    private clearSearch() {
        this.searchRequested.emit(new SearchRequest());
        this.searchColumn = null;
        this.searchValue = null;
    }

    private clearReplace() {
        this.replaceColumn = null;
        this.replaceWhat = null;
        this.replaceWith = null;
    }

}
