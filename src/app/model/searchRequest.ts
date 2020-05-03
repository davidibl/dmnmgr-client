export class SearchRequest {

    public constructor(
        public searchValue?: string,
        public searchColumn: string = null,
    ) {}
}

export class ReplaceRequest {

    public constructor(
        public searchValue: string,
        public searchColumn: string = null,
        public replaceWhat: string,
        public replaceWith: string,
        public replaceColumn: string = null,
    ) {}
}
