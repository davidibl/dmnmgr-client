export class DmnExpressionLanguage {
    static JUEL = 'juel';
    static FEEL = 'feel';

    static isJuel(language: string) {
        return this.isLanguage(language, DmnExpressionLanguage.JUEL);
    }

    static isFeel(language: string) {
        return this.isLanguage(language, DmnExpressionLanguage.FEEL);
    }

    private static isLanguage(value: string, reference: string): boolean {
        return !!value && value.toLowerCase() === reference;
    }
}
