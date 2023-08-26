/// <reference path="./types.d.ts" />

export function ev(type, detail) {
    return new CustomEvent(type, { detail })
}

/**
 * @param {HTMLElement} element 
 * @param {string} type 
 * @param {any} detail 
 */
export function trigger(element, type, detail) {
    return element.dispatchEvent(ev(type, detail))
}

export class EventStream extends Array {
    event(type) {
        return this.filter(ev => ev.type === type)
    }

    notEmpty(handler) {
        if (this.length) {
            handler.call(null)
        }
    }

    target(eventTarget) {
        return this.filter(ev => ev.target === eventTarget)
    }

    select(selectors) {
        return this.filter(ev => ev.target.matches(selectors))
    }

    fold(reducer, initVal) {
        let val = initVal
        let index = 0
        for (const element of this) {
            val = reducer.call(this, val, element, index++)
        }

        return EventStream.from([val])
    }

    sink(publisher) {
        publisher.submit(this[this.length - 1])
    }

    /**
     * @param  {...EventStream} streams 
     * @returns 
     */
    static merge(...streams) {
        return streams.reduce((p, v) => p.concat(v), new EventStream())
    }
}