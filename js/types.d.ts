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