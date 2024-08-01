type Subscriber<T> = (value: T) => void;

export class ObservablesArray<T> {
    private readonly array: T[];
    private readonly subscriber: Array<Subscriber<T>> = [];

    constructor(size: number) {
        this.array = new Array(size);
    }

    subscribe(callback: (value: T) => void) {
        this.subscriber.push(callback)
    }

    set(index: number, value: T) {
        this.array[index] = value;
        this.subscriber.forEach(sub => sub(value));
    }

    get(index: number) {
        return this.array[index];
    }
}
