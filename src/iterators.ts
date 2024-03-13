import { DOMParser } from "@xmldom/xmldom";

function* nodeIterator(node: Node | null): IterableIterator<Node> {
    if (node === null) return;

    yield node;
    yield *nodeIterator(node.firstChild);
    yield *nodeIterator(node.nextSibling);
}

const parser = new DOMParser();

const doc = parser.parseFromString(
    `<html><head><title>Test</title></head><body><p>Hello, world!</p><div>text</div><a>anchor</a><b>bold</b></body></html>`,
    "text/xml"
);


class LazyListIterator<T> implements Iterator<T> {
    private head: T | undefined;
    private tail: LazyList<T> | undefined;

    constructor(_list: LazyList<T>) {
        this.head = _list.head
        this.tail = _list.tail
    }

    next(): IteratorResult<T> {
        if (this.head === undefined) {
            return { done: true, value: undefined };
        }

        const value = this.head;

        this.head = this.tail?.head;
        this.tail = this.tail?.tail;

        return { done: false, value: value };
    }

}

interface Mappable<T> extends Iterable<T> {
    map<U>(fn: (value: T) => U): Mappable<U>;
    filter(fn: (value: T) => boolean): Mappable<T>;
}

class LazyList<T> implements Mappable<T> {
    private __tail?: LazyList<T>;

    constructor(private _head?: T, private _tail?: () => LazyList<T>) {}

    get head(): T | undefined {
        return this._head;
    }

    get tail(): LazyList<T> | undefined {
        this.__tail ??= this._tail?.();
        return this.__tail;
    }

    [Symbol.iterator](): Iterator<T> {
        return new LazyListIterator(this);
    }

    static from<T>(iterable: Iterable<T>): LazyList<T> {
        const iterator = iterable[Symbol.iterator]();
        const { done, value } = iterator.next();
        if (!done) {
            return new LazyList(value, () => this.from(iterable))
        }

        return new LazyList();
    }

    map<U>(fn: (value: T) => U): LazyList<U> {
        if (this.head === undefined) {
            return new LazyList();
        }

        if (this.tail === undefined) {
            return new LazyList(fn(this.head));
        }

        return new LazyList(fn(this.head), () => (this.tail as LazyList<T>).map(fn));
    }

    filter(fn: (value: T) => boolean): LazyList<T> {
        if (this.head === undefined) {
            return new LazyList();
        }

        if (this.tail === undefined) {
            return fn(this.head) ? new LazyList(this.head) : new LazyList();
        }

        if (fn(this.head)) {
            return new LazyList(this.head, () => (this.tail as LazyList<T>).filter(fn));
        }

        return (this.tail as LazyList<T>).filter(fn);
    }



}

const lazyList = LazyList.from(nodeIterator(doc))
    .map(node => node.nodeName)
    .filter(name => name === "p" || name === "div");

for (let node of lazyList) {
    console.log(`for: ${node}`);
}

