import { TestBed, async } from '@angular/core/testing';
import { ErrorMessageService } from './errorMessageService';
import { TokenTransformationService } from '@xnoname/web-components';

let cut: ErrorMessageService;
let tokenService: jasmine.SpyObj<TokenTransformationService>;

describe('ErrorMessageService', () => {
    beforeEach(async(() => {
        const tokenServiceSpy = jasmine.createSpyObj('TokenTransformationService', ['replaceTokens']);

        TestBed.configureTestingModule({
            providers: [
                ErrorMessageService,
                { provide: TokenTransformationService, useValue: tokenServiceSpy }
            ]
        });

        cut = TestBed.inject(ErrorMessageService);
        tokenService = <any>TestBed.inject(TokenTransformationService);
    }));

    describe('transform message', () => {

        it('calls the token transformation service and returns its result', async(() => {

            const initialMessage = 'aMessage';
            const replacedMessage = 'bMessage';
            tokenService.replaceTokens.and.returnValue(replacedMessage);

            const result = cut.getErrorMessage(initialMessage);
            expect(result).toEqual(replacedMessage);
            expect(tokenService.replaceTokens).toHaveBeenCalledTimes(1);
        }));

        it('returns the default message result', async(() => {

            const initialMessage = 'aMessage';
            const defaultMessage = 'bMessage';
            tokenService.replaceTokens.and.callFake(function(param) {
                return param;
            });

            const result = cut.getErrorMessage(initialMessage, defaultMessage);
            expect(result).toEqual(defaultMessage);
            expect(tokenService.replaceTokens).toHaveBeenCalledTimes(1);
        }));

        it('passes tokens to token service', async(() => {

            const initialMessage = 'aMessage';
            const tokensInitial = { a: 'b' };
            tokenService.replaceTokens.and.callFake(function(message, tokens) {
                expect(message).toEqual(initialMessage);
                expect(tokens).toEqual(tokensInitial);
                return message;
            });

            const result = cut.getErrorMessage(initialMessage, null, tokensInitial);
            expect(result).toEqual(initialMessage);
            expect(tokenService.replaceTokens).toHaveBeenCalledTimes(1);
        }));

        it('translates specific defined messages', async(() => {

            const initialMessage = 'ENOENT: no such file or directory';
            const expectedMessage = 'Die Datei konnte nicht gefunden werden: {path}';
            ErrorMessageService['MESSAGE_MAP'] = [{message: initialMessage, target: expectedMessage}];
            const tokensInitial = {};
            tokenService.replaceTokens.and.callFake(function(message, tokens) {
                return message;
            });

            const result = cut.getErrorMessage(initialMessage, null, tokensInitial);
            expect(result).toEqual(expectedMessage);
        }));
    });
});
