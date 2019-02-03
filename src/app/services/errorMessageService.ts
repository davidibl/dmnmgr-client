import { Injectable } from '@angular/core';
import { TokenTransformationService } from '@xnoname/web-components';

@Injectable()
export class ErrorMessageService {

    private static FILE_NOT_FOUND_MESSAGE_PATTERN = 'ENOENT: no such file or directory';

    private static FILE_NOT_FOUND_MESSAGE_TPL = 'Die Datei konnte nicht gefunden werden: {path}';

    public constructor(private _tokenTransformation: TokenTransformationService) {}

    public getErrorMessage(message: string, defaultMessage?: string, tokens?: Object) {
        message = this.mapMessage(message);

        return this._tokenTransformation.replaceTokens(message, tokens);
    }

    private mapMessage(message: string, defaultMessage?: string) {
        if (message.indexOf(ErrorMessageService.FILE_NOT_FOUND_MESSAGE_PATTERN) > -1) {
            return ErrorMessageService.FILE_NOT_FOUND_MESSAGE_TPL;
        }

        return (defaultMessage) ? defaultMessage : message;
    }
}
