export enum WebserviceErrorType {
    URL_NOT_DEFINED = 'URL_NOT_DEFINED',
    WEBSERVICE_ERROR = 'WEBSERVICE_ERROR'
}

export class WebserviceError {

    public constructor(
        public message: string,
        public type: WebserviceErrorType,
    ) {}
}
