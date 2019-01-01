export function equals<T>(valueToCompare: T): (value: T) => boolean {
    return (value) => value === valueToCompare;
}
