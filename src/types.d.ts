interface ElementLifecycleCallbacks {
    connectedCallback?: () => void
    disconnectedCallback?: () => void
    adoptedCallback?: () => void
    attributeChangedCallback?: (name: string, oldValue: string, newValue: string) => void
}

interface TemplateLifecycleCallbacks {
    connected?: () => void
    disconnected?: () => void
    adopted?: () => void
    attributeChanged?: (name: string, oldValue: string, newValue: string) => void
    initialized?: () => void
}

interface TemplateMeta {
    shadow?: boolean
}

interface EventListenerModifier {
    (source: EventTarget, listener: EventListener): EventListener
}

interface AccessorSetter {
    (submit: (val: any) => void, val: any): void
}

interface Accessor {

}

interface EventStream extends Array<unknown>{
    static merge(...streams: EventStream[]): EventStream
    event(type: string): this
    notEmpty(handler: () => void): void
    target(evTarget: EventTarget): this
    select(selectors: string): this
    fold<T = any, R = any>(reducer: (pre: R, current: T, index: number) => R, initVal: R): this
    sink(out: Accessor): void
}

interface DOMDriverMain {
    (evs: EventStream): void
}

interface DOMDriver {
    static defaultScheduler: DOMDriverScheduler
    send(v: any): void
    start(): void
    disable(): void
    forward(driver: DOMDriver): void
}

interface DOMDriverScheduler {
    (driver: DOMDriver, func: DOMDriverMain): {
        run(): void
        stop(): void
        running: booleam
    }
}