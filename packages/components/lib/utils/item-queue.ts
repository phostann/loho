export class ItemQueue<T> {
    private lastDispatchIndex: number = -1;

    private items: Record<number, T> = {};
    private keys: number[] = [];
    private readonly subscribers: Array<(items: Array<T>) => void> = [];

    public setItem(key: number, value: T) {
        this.items[key] = value;
        this.keys.push(key);
        this.dispatchItem();
    }

    public setItems(items: Record<number, T>) {
        for (const key in items) {
            this.items[key] = items[key];
            this.keys.push(Number(key));
        }
        this.dispatchItem();
    }

    public getItem(key: number) {
        return this.items[key];
    }

    public removeItem(key: number) {
        delete this.items[key];
        this.keys.splice(this.keys.indexOf(key), 1);
    }

    public size() {
        return this.keys.length;
    }

    public isEmpty() {
        return this.keys.length === 0;
    }

    public clear() {
        this.items = {};
        this.keys = [];
        this.lastDispatchIndex = -1;
    }

    public subscribe(callback: (items: Array<T>) => void) {
        this.subscribers.push(callback);
    }

    public unsubscribe() {
        this.subscribers.length = 0
    }

    private dispatchItem() {
        const copy = this.keys.slice();
        copy.sort((a, b) => a - b);

        const items: Array<T> = [];
        for (const number of copy) {
            if (number - 1 === this.lastDispatchIndex) {
                items.push(this.items[number]);
                this.lastDispatchIndex = number;
            }
        }
        if (items.length != 0) {
            this.subscribers.forEach(sub => sub(items));
        }
    }
}
