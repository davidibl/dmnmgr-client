import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'jsonToString',
    pure: false,
})
export class JsonToStringPipe implements PipeTransform {

    transform<T>(value: T): string {
        if (!value) {
            return null;
        }

        return JSON.stringify(value);
    }
}
