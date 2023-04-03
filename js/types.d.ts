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

interface MountOptions {
    shadow?: boolean
}

interface EventListenerModifier {
    (source: EventTarget, listener: EventListener): EventListener
}

interface AccessorSetter {
    (submit: (val: any) => void, val: any): void
}

interface EventStream extends Array<unknown>{
    event(type: string): this
    notEmpty(handler: () => void): void
}

interface DOMDriverMain {
    (evs: EventStream): void
}