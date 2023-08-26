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
    event(type: string): this
    notEmpty(handler: () => void): void
    target(evTarget: EventTarget): this
    select(selectors: string): this
    fold<T = any, R = any>(reducer: (pre: R, current: T, index: number) => R, initVal: R): this
    sink(out: Accessor): void
}

interface EventStreamConstructor {
    merge(...streams: EventStream[]): EventStream
    new(): EventStream
}

declare var EventStream: EventStreamConstructor

interface DriverMain {
    (evs: EventStream): void
}

interface Driver extends Forwardable {
    send(v: any): void
    start(): void
    disable(): void
}

interface DriverConstructor {
    defaultScheduler: DriverScheduler
    new(): Driver
}

declare var Driver: DriverConstructor

interface DriverScheduler {
    (driver: Driver, func: DriverMain): {
        run(): void
        stop(): void
        running: boolean
    }
}

interface Forwardable {
    forward(forwardable: Forwardable): void
}