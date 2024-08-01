export enum DequeEvent {
    ADD_FRONT = 'addFront',
    ADD_BACK = 'addBack',
    REMOVE_FRONT = 'removeFront',
    REMOVE_BACK = 'removeBack',
    PEEK_FRONT = 'peekFront',
    PEEK_BACK = 'peekBack',
}

/**
 * 双端队列
 */
export class Deque<T> {
    private count: number;
    private lowestCount: number;
    private readonly items: { [key: number]: T };
    private readonly subscribers: Array<(event: DequeEvent) => void> ;

    constructor() {
        this.count = 0;
        this.lowestCount = 0;
        this.items = {};
        this.subscribers = [];
    }

    /**
     * 从前端添加元素
     * @param element
     */
    addFront(element: T) {
        if (this.isEmpty()) {
            this.addBack(element);
        } else if (this.lowestCount > 0) {
            this.lowestCount--;
            this.items[this.lowestCount] = element;
        } else {
            for (let i = this.count; i > 0; i--) {
                this.items[i] = this.items[i - 1];
            }
            this.count++;
            this.lowestCount = 0;
            this.items[0] = element;
        }
        this.subscribers.forEach(sub => sub(DequeEvent.ADD_FRONT));
    }

    /**
     * 从后端添加元素
     * @param element
     */
    addBack(element: T) {
        this.items[this.count] = element;
        this.count++;
        this.subscribers.forEach(sub => sub(DequeEvent.ADD_BACK));
    }

    /**
     * 从前端移除元素
     */
    removeFront() {
        if (this.isEmpty()) {
            return undefined;
        }
        const result = this.items[this.lowestCount];
        delete this.items[this.lowestCount];
        this.lowestCount++;
        this.subscribers.forEach(sub => sub(DequeEvent.REMOVE_FRONT));
        return result;
    }

    /**
     * 从后端移除元素
     */
    removeBack() {
        if (this.isEmpty()) {
            return undefined;
        }
        this.count--;
        const result = this.items[this.count];
        delete this.items[this.count];
        this.subscribers.forEach(sub => sub(DequeEvent.REMOVE_BACK));
        return result;
    }

    /**
     * 查看前端元素
     */
    peekFront() {
        if (this.isEmpty()) {
            return undefined;
        }
        this.subscribers.forEach(sub => sub(DequeEvent.PEEK_FRONT));
        return this.items[this.lowestCount];
    }

    /**
     * 查看后端元素
     */
    peekBack() {
        if (this.isEmpty()) {
            return undefined;
        }
        this.subscribers.forEach(sub => sub(DequeEvent.PEEK_BACK));
        return this.items[this.count - 1];
    }

    /**
     * 判断队列是否为空
     */
    isEmpty() {
        return this.size() === 0;
    }

    /**
     * 返回队列长度
     */
    size() {
        return this.count - this.lowestCount;
    }
}
