/// <reference path="./types.d.ts" />
import { driver } from './driver.js'

function getCls(el) {
    return Object.getPrototypeOf(el).constructor
}

export class MviElement extends HTMLElement {
    /**@private*/ #subscribers = []
    /**@private*/ #driver = driver()
    state = {}

    static observedAttributes = []

    /**
     * @param {Driver} driver 
     */
    forward(driver) {
        this.#driver.forward(driver)
    }

    getDriver() {
        return this.#driver
    }

    subscribe(func) {
        this.#subscribers.push(func)
    }

    submit(v) {
        this.#subscribers.forEach(f => f.call(this, Object.assign(this.state, v)))
    }

    connectedCallback = () => {
        this.#callLifeCycle('connected')
        let state = {}
        const self = this
        getCls(this).observedAttributes.forEach(n => {
            const data = this.getAttribute(n)
            if (data) {
                state[n] = data
            }

            if (!this[n]) {
                Object.defineProperty(this, n, {
                    get() {
                        return self.getAttribute(n)
                    },

                    set(v) {
                        self.setAttribute(n, v)
                    }
                })
            }
        })

        this.submit(state)
        this.#callLifeCycle('initialized')
    }

    attributeChangedCallback = (name, oldVal, newVal) => {
        if (oldVal !== newVal) {
            this.submit(Object.assign({ [name]: newVal }))
        }

        this.#callLifeCycle('attributeChanged', name, oldVal, newVal)
    }

    adoptedCallback = () => {
        this.#callLifeCycle('adopted')
    }

    disconnectedCallback = () => {
        this.#callLifeCycle('disconnected')
    }

    #context = {}

    setContext = (k, v) => {
        this.#context[k] = v
    }

    getContext = k => {
        return this.#context[k]
    }

    #lifeCycleKeys = [
        'connected', 'disconnected', 'adopted', 'attributeChanged', 'initialized',
    ]

    #callLifeCycle(name, ...args) {
        if (this.#lifeCycleKeys.includes(name)) {
            this[name] && this[name].call(this, ...args)
        }
    }
}