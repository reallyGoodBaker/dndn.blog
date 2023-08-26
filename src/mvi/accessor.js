/// <reference path="./types.d.ts" />

class Accessor {
    static reachableProps = [
        '_isReactive', 'value', 'watch',
        'subscribe',
    ]

    static editableProps = [
        'value'
    ]

    static values = new Map()

    /**
     * @param {(v: any) => void} listener 
     */
    subscribe = listener => {
        let listeners = this.getSubscribes()
        if (!listeners) {
            Accessor.values.set(this, listeners = [])
        }

        listeners.push(listener)
    }

    getSubscribes = () => {
        return Accessor.values.get(this)
    }

    /**@private*/ _isReactive = {}

    constructor(
        value = null,
        getter = v => v,
        /**@type {AccessorSetter}*/
        setter = (s, v) => s(v)
    ) {
        this.value = value
        this.getter = getter
        this.setter = setter
    }

    buildProxy() {
        const _proxy = new Proxy(this, {
            get(t, p) {
                if (!Accessor.reachableProps.includes(p)) {
                    return null
                }

                return t.getter(t[p])
            },

            set(t, p, v, r) {
                if (!Accessor.editableProps.includes(p)) {
                    return false
                }

                t[p] = v
                const listeners = t.getSubscribes(r)
                if (!listeners.length) {
                    return true
                }

                for (const listener of listeners) {
                    t.setter(
                        val => listener.call(null, val),
                        v
                    )
                }

                return true
            }
        })

        this._proxy = _proxy

        return _proxy
    }
}

/**
 * @param {any} value 
 * @param {(val: any) => any} [getter] 
 * @param {AccessorSetter} [setter] 
 */
export function val(value, getter, setter) {
    return new Accessor(value, getter, setter).buildProxy()
}