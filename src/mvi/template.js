/// <reference path="./types.d.ts" />

import { MviElement } from "./element.js"
import { immutableAttrArray } from "./utils.js"

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

    #contents = {}
    #attrs = {}
    #initialized = false
    #tempFrags = null
    #tempChildNodes = document.createDocumentFragment()

    setTemplateFrags(html) {
        if (this.#initialized) throw 'Initialized template.'

        this.#initialized = true
        this.#tempFrags = html
    }

    recordReactiveContent(arg) {
        const uid = `{{uid-${MviTemplate.uid++}}}`
        this.#contents[uid] = arg

        return uid
    }

    recordReactiveAttr(arg) {
        const uid = `{{uid-${MviTemplate.uid++}}}`
        this.#attrs[uid] = arg

        return uid
    }

    /**@param {HTMLElement} target*/
    #handleDOM(target, root) {
        for (const n of target.children) {
            this.#tempChildNodes.appendChild(n)
        }

        target.innerHTML = this.#tempFrags.join('')
        this.#handleChildNodes(target, root)
        target.appendChild(this.#tempChildNodes)

        this.#initContext(root)
    }

    /**
     * @param {MviElement} target 
     */
    #initContext(target) {
        target.setContext('root', target)
    }

    /**
     * @param {HTMLElement | ShadowRoot} target 
     */
    #handleChildNodes(target, root) {
        target.childNodes.forEach(node => {
            node.getContext = root.getContext

            if (node.nodeType === Node.ELEMENT_NODE) {
                return this.#handleElementChild(node, root)
            }

            if (node.nodeType === Node.TEXT_NODE) {
                return this.#handleTextNode(node, root)
            }
        })
    }

    /**
     * @param {HTMLElement} target 
     */
    #handleElementChild(target, root) {
        this.#handleChildNodes(target, root)
    }

    /**@private*/ #bracketMatcher = /\{\{.*?\}\}/g

    /**
     * @private
     * @param {Node} node
     */
    #handleTextNode(node, ctx) {
        const nodeVal = node.nodeValue
        if (!nodeVal.trim().length) {
            return
        }

        if (!nodeVal.match(this.#bracketMatcher)) {
            return
        }

        let result, lastEnd = 0
        const textContents = document.createDocumentFragment()

        while (result = this.#bracketMatcher.exec(nodeVal)) {
            const [key] = result
            const i = result.index
            const val = this.#contents[key]

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
     * @param {HTMLElement} target 
     */
    #handleAttrs(target, root) {
        const immutableAttrs = immutableAttrArray(target.attributes)
        for (const attr of immutableAttrs) {
            this.#handleAttribute(target, attr, root)
        }

        for (const child of target.children) {
            this.#handleAttrs(child, root)
        }
    }

    /**
     * @private
     * @param {MviElement} target 
     * @param {MviElement} root 
     * @param {Attr} attr 
     */
    #handleAttribute(target, attr, root) {
        const attrName = attr.name
        const attrKey = attr.value
        const attrVal = this.#getAttrVal(attrKey, root)
        const rmAttribute = () => target.removeAttribute(attr.name)

        //事件流数据源点
        if (attrName.startsWith('$')) {
            const driver = root.getDriver()
            const events = attrName.slice(1).split('|')
            for (const ev of events) {
                target.addEventListener(ev, e => driver.send(e))
            }
            return rmAttribute()
        }

        //绑定事件
        if (attrName.startsWith('@')) {
            const [eventName, ...modifiers] = attrName.slice(1).split('|')
            this.#bindEvent(target, eventName, attrVal, modifiers)
            return rmAttribute()
        }

        //将 this="${ele}" 绑定到 ele
        if (attrName === 'this' && attrVal._isReactive) {
            attrVal.value = target
            return rmAttribute()
        }

        //绑定上下文
        if (attrName.startsWith('&')) {
            root.setContext(attrName.slice(1), attrVal ?? target)
            return rmAttribute()
        }
    }

    /**
     * @param {string} attrKey 
     * @param {MviElement} el
     */
    #getAttrVal(attrKey, el) {
        let matchResult

        if ((matchResult = this.#bracketMatcher.exec(attrKey)) === null) {
            return
        }

        const [ key ] = matchResult
        const getter = this.#attrs[key]

        if (key.length === attrKey.length) {
            return getter
        }

        el.subscribe(t => {
            // const oldVal = node.nodeValue
            // const newVal = getter.call(null, t)
            // if (newVal !== oldVal) {
            //     node.nodeValue = newVal
            // }
            // console.log(t)
        })

    }

    /**
     * @private
     * @param {EventTarget} target 
     * @param {string} name 
     * @param {EventListener} listener 
     * @param {string[]} modifiers 
     */
    #bindEvent(target, name, listener, modifiers = []) {
        let _l = listener
        for (const modifier of modifiers) {
            if (modifier in MviTemplate.eventModifiers) {
                _l = MviTemplate.eventModifiers[modifier]
                    .call(null, target, _l)
            }
        }

        target.addEventListener(name, _l)
    }

    /**
     * @param {HTMLElement} el 
     */
    build(el, useShadow) {
        const root = useShadow ? el.attachShadow({ mode: 'open' }) : el

        this.#handleDOM(root, el)
        this.#handleAttrs(root, el)
    }

}