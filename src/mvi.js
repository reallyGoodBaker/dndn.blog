/// <reference path="./types.d.ts" />

/**
 * @param {string} url 
 * @param {{tagName: string, opts?: ElementDefinitionOptions}} templateOpt 
 * @param {{[P: string]: any}} templateVarsMapping 
 * @returns 
 */
export async function importTemplate(url, templateVarsMapping = {}) {
    const templateString = await (await fetch(url)).text()
    const frags = []
    const args = []
    const bracketsMatcher = /\{\{(.*?)\}\}/g

    let result, lastEnd = 0
    while (result = bracketsMatcher.exec(templateString)) {
        const [_, varName] = result
        const i = result.index

        frags.push(
            templateString.slice(lastEnd, i).replaceAll('\\{', '{')
        )

        lastEnd = i + _.length
        args.push(templateVarsMapping[varName] ?? null)
    }

    frags.push(templateString.slice(lastEnd))

    return template(frags, ...args)
}

export function relative(importMeta, url) {
    const fileUrl = importMeta.url
    const { pathname } = new URL(fileUrl)
    const pathArr = pathname.split('/')
    const urlArr = url.split('/')

    pathArr.pop()

    if (urlArr[0].length === 0) {
        return url
    }

    const targetPath = pathArr.slice(0)

    urlArr.forEach(pathName => {
        if (pathName === '.') {
            return
        }

        if (pathName === '..') {
            return targetPath.pop()
        }

        targetPath.push(pathName)
    })

    return targetPath.join('/')
}

/**
 * @param {string} tagName 
 * @param {ElementDefinitionOptions} [opts] 
 */
export const template = (frags, ...args) => {
    const temp = new MviTemplate()
    const result = []

    args.forEach((arg, i) => {
        const lastFrag = frags[i]
        const preCode = frags.slice(0, i + 1).join('')
        if (!isAttribute(preCode)) {
            const uid = temp.recordReactiveContent(arg)
            result.push(lastFrag, uid)
            return
        }

        const uid = temp.recordReactiveAttr(arg)
        result.push(lastFrag, uid)
    })

    result.push(...frags.slice(-1))
    temp.setTemplateFrags(result)

    return temp
}

/**
 * @param {string} str 
 * @returns 
 */
function isAttribute(str) {
    return str.split('<').length - str.split('>').length
}

function getCls(el) {
    return Object.getPrototypeOf(el).constructor
}

export class MviElement extends HTMLElement {
    /**@private*/ _subscribers = []
    /**@private*/ _driver = driver()
    state = {}

    static observedAttributes = []

    /**
     * @param {DOMDriver} driver 
     */
    forward(driver) {
        this._driver.forward(driver)
    }

    subscribe(func) {
        this._subscribers.push(func)
    }

    submit(v) {
        this._subscribers.forEach(f => f.call(this, Object.assign(this.state, v)))
    }

    connected = Function.prototype
    disconnected = Function.prototype
    adopted = Function.prototype
    attributeChanged = Function.prototype
    initialized = Function.prototype

    connectedCallback() {
        this.connected()
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
        this.initialized()
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal) {
            this.submit(Object.assign({ [name]: newVal }))
        }

        this.attributeChanged(name, oldVal, newVal)
    }

    adoptedCallback() {
        this.adopted()
    }

    disconnectedCallback() {
        this.disconnected()
    }
}

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

class DOMDriver {

    static defaultScheduler = (driver, func) => {
        let animFrame
        let looper = () => {
            const queue = driver._evQueue
            const arr = queue.splice(0, queue.length)

            if (arr.length) {
                func.call(
                    driver,
                    EventStream.from(arr)
                )
            }

            animFrame = requestIdleCallback(looper)
        }

        return {
            get running() {
                return !!animFrame
            },
            run: () => looper(),
            stop: () => cancelIdleCallback(animFrame),
        }
    }

    /**@private*/ _evQueue = []
    /**@private @type {ReturnType<DOMDriverScheduler>}*/ _scheduler = null
    /**@private*/ _forwardTo = null

    send = val => {
        if (!this._forwardTo) {
            this._evQueue.push(val)
            return
        }

        this._forwardTo.send(val)
    }

    /**
     * @param {DOMDriverMain} main 
     * @param {(driver: DOMDriver, func: Function) => {run: Function, stop: Function}} [scheduler]
     */
    constructor(main, scheduler = DOMDriver.defaultScheduler) {
        if (main) {
            this._scheduler = scheduler(this, main)
        }
    }

    run() {
        if (
            !this._forwardTo && this._scheduler && !this._scheduler.running
        ) {
            this._scheduler.run()
        }
    }

    disable() {
        if (this._scheduler && this._scheduler.running) {
            this._scheduler.stop()
        }
    }

    /**
     * @param {DOMDriver} driver 
     */
    forward(driver) {
        if (driver) {
            this._forwardTo = driver
            return
        }

        return this._forwardTo
    }

}

/**
 * @param {DOMDriverMain} main 
 */
export function driver(main) {
    return new DOMDriver(main)
}

class MviTemplate {
    static uid = 0

    /**
     * @type {{[P: string]: EventListenerModifier}}
     */
    static eventModifiers = {
        stoppropagation(t, listener) {
            return ev => {
                listener.call(t, ev)
                ev.stopPropagation()
            }
        },

        prevent(t, listener) {
            return ev => {
                listener.call(t, ev)
                ev.preventDefault()
            }
        },

        stopimmediate(t, listener) {
            return ev => {
                ev.stopImmediatePropagation()
                listener.call(t, ev)
            }
        },

        once(t, listener) {
            let _listener = ev => {
                t.removeEventListener(ev.type, _listener)
                listener.call(t, ev)
            }

            return _listener
        },
    }

    /**@private*/ _contents = {}
    /**@private*/ _attrs = {}
    /**@private*/ _initialized = false
    /**@private*/ _tempFrags = null
    /**@private*/ _tempChildNodes = document.createDocumentFragment()

    setTemplateFrags(html) {
        if (this._initialized) throw 'Initialized template.'

        this._initialized = true
        this._tempFrags = html
    }

    recordReactiveContent(arg) {
        const uid = `{{uid-${MviTemplate.uid++}}}`
        this._contents[uid] = arg

        return uid
    }

    recordReactiveAttr(arg) {
        const uid = `{{uid-${MviTemplate.uid++}}}`
        this._attrs[uid] = arg

        return uid
    }

    /**@private @param {HTMLElement} target*/ _handleDOM(target) {
        for (const n of target.children) {
            this._tempChildNodes.appendChild(n)
        }

        target.innerHTML = this._tempFrags.join('')
        this._handleChildNodes(target, target)
        target.appendChild(this._tempChildNodes)
    }

    /**
     * @private
     * @param {HTMLElement | ShadowRoot} target 
     */
    _handleChildNodes(target, root) {
        target.childNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                return this._handleElementChild(node, root)
            }

            if (node.nodeType === Node.TEXT_NODE) {
                this._handleTextNode(node, root)
            }
        })
    }

    /**
     * @private
     * @param {HTMLElement} target 
     */
    _handleElementChild(target, root) {
        this._handleChildNodes(target, root)
    }

    /**@private*/ _bracketMatcher = /\{\{.*?\}\}/g

    /**
     * @private
     * @param {Node} node
     */
    _handleTextNode(node, ctx) {
        const nodeVal = node.nodeValue
        if (!nodeVal.trim().length) {
            return
        }

        if (!nodeVal.match(this._bracketMatcher)) {
            return
        }

        let result, lastEnd = 0
        const textContents = document.createDocumentFragment()

        while (result = this._bracketMatcher.exec(nodeVal)) {
            const [key] = result
            const i = result.index
            const val = this._contents[key]

            textContents.appendChild(document.createTextNode(nodeVal.slice(lastEnd, i)))
            lastEnd = i + key.length

            if (typeof val === 'function') {
                const node = document.createTextNode(val.value)
                textContents.appendChild(node)
                ctx.subscribe(t => {
                    const oldVal = node.nodeValue
                    const newVal = val.call(null, t)
                    if (newVal !== oldVal) {
                        node.nodeValue = newVal
                    }
                })
            }

        }

        const lastTextVal = nodeVal.slice(lastEnd)
        if (lastTextVal) {
            textContents.appendChild(document.createTextNode(lastTextVal))
        }

        node.parentNode.replaceChild(textContents, node)
    }

    /**
     * @private
     * @param {HTMLElement} target 
     */
    _handleAttrs(target, root) {
        for (const attr of target.attributes ?? []) {
            this._handleAttribute(target, attr, root)
        }

        for (const child of target.children) {
            this._handleAttrs(child, root)
        }
    }

    /**
     * @private
     * @param {HTMLElement} target 
     * @param {Attr} attr 
     */
    _handleAttribute(target, attr, root) {
        const attrName = attr.name
        const attrKey = attr.value
        const attrVal = this._attrs[attrKey]
        const rmAttribute = () => target.removeAttribute(attr.name)


        //事件流数据源点
        if (attrName.startsWith('$')) {
            const driver = root._driver
            const events = attrName.slice(1).split('|')
            for (const ev of events) {
                target.addEventListener(ev, e => driver.send(e))
            }
            return rmAttribute()
        }

        //绑定事件
        if (attrName.startsWith('@')) {
            return rmAttribute()
            const [eventName, ...modifiers] = attrName.slice(1).split('|')
            this._bindEvent(target, eventName, attrVal, modifiers)
            return rmAttribute()
        }

        //将 this="${ele}" 绑定到 ele
        if (attrName === 'this' && attrVal._isReactive) {
            attrVal.value = target
            return rmAttribute()
        }
    }

    /**
     * @private
     * @param {EventTarget} target 
     * @param {string} name 
     * @param {EventListener} listener 
     * @param {string[]} modifiers 
     */
    _bindEvent(target, name, listener, modifiers = []) {
        let _l = listener
        for (const modifier of modifiers) {
            if (modifier in MviTemplate.eventModifiers) {
                _l = MviTemplate.eventModifiers[modifier]
                    .call(null, target, _l)
            }
        }

        target.addEventListener(name, _l)
    }

    build(el) {
        this._handleDOM(el)
        this._handleAttrs(el, el)
    }

}

/**
 * @param {string} tagName 
 * @param {MviTemplate|MviElement} template 
 * @param {MviElement} cls 
 */
export function defineElement(tagName, template, cls) {
    if (cls) {
        customElements.define(tagName, class extends cls {
            connectedCallback() {
                template.build(this)
                super.connectedCallback && super.connectedCallback()
            }
        })

        cls.tagName = tagName
        return 
    }

    template.tagName = tagName
    customElements.define(tagName, template)
}