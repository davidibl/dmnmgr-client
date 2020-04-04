import { Injectable } from '@angular/core';
import { TokenTransformationService } from '@xnoname/web-components';

@Injectable()
export class ErrorMessageService {

    private static MESSAGE_MAP = [
        { message: 'ENOENT: no such file or directory', target: 'Die Datei konnte nicht gefunden werden: {path}' }
    ];

    public constructor(private _tokenTransformation: TokenTransformationService) {}

    public getErrorMessage(message: string, defaultMessage?: string, tokens?: Object) {
        message = this.mapMessage(message, defaultMessage);

        return this._tokenTransformation.replaceTokens(message, tokens);
    }

    private mapMessage(message: string, defaultMessage?: string) {
        const translation = ErrorMessageService.MESSAGE_MAP.find(msg => msg.message.indexOf(message) > -1)?.target;
        return (!!translation) ? translation :
            (!!defaultMessage) ? defaultMessage : message;
    }
}
