/// <reference path="./types.d.ts" />

/**
 * @type {(frags: string[], ...args: ant[]) => MvvmTemplate}
 */
export const template = (frags, ...args) => {
    const temp = new MvvmTemplate()
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


class MvvmElement extends HTMLElement {
    /**@private @type {MvvmTemplate}*/ _template = null

    constructor(temp) {
        super()

        this._template = temp
    }

    useShadowRoot() {
        return this.attachShadow({
            mode: 'open'
        })
    }

    connectedCallback() {
        this._template.callLifecycleCallback('connected', this)
        this._template._handleAttrs(this.shadowRoot ?? this)
    }

    disconnectedCallback() {
        this._template.callLifecycleCallback('disconnected', this)
    }

    adoptedCallback() {
        this._template.callLifecycleCallback('adopted', this)
    }

    attributeChangedCallback(...args) {
        this._template.callLifecycleCallback('attributeChanged', this, args)
    }

}

customElements.define('mvvm-element', MvvmElement)

class Accessor {
    static reachableProps = [
        '_isReactive', 'value'
    ]

    static editableProps = [
        'value'
    ]

    static values = new Map()

    static addSubmit(accessor, onChange) {
        this.values.set(accessor, onChange)
    }

    static getSubmit(accessor) {
        return this.values.get(accessor)
    }



    /**@private*/ _isReactive = {}

    constructor(
        value,
        getter = v => v,
        /**@type {AccessorSetter}*/
        setter = (s, v) => s(v)
    ) {
        this.value = value
        this.getter = getter
        this.setter = setter
    }

    buildProxy() {
        return new Proxy(this, {
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

                const onChange = Accessor.getSubmit(r)
                if (!onChange) {
                    t[p] = v
                    return true
                }

                t.setter(
                    val => onChange.call(null, val),
                    t[p] = v
                )

                return true
            }
        })
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


class MvvmTemplate {
    static uid = 0

    /**
     * @type {{[P: string]: EventListenerModifier}}
     */
    static eventModifiers = {
        stopPropagation(t, listener) {
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
        stopImmediate(t, listener) {
            return ev => {
                ev.stopImmediatePropagation()
                listener.call(t, ev)
            }
        },
    }

    /**@private @type {MvvmElement}*/ _element = new MvvmElement(this)

    /**@private*/ _contents = {}
    /**@private*/ _attrs = {}
    /**@private*/ _initialized = false
    /**@private*/ _lifecycleCallbacks = {}
    /**@private*/ _rawHtml = ''
    /**@private*/ _shadowElement = false

    setTemplateFrags(html) {
        if (this._initialized) throw 'Initialized template.'

        this._initialized = true
        this._rawHtml = html.join('')
    }

    recordReactiveContent(arg) {
        const uid = `uid-${MvvmTemplate.uid++}`
        this._contents[uid] = arg

        return uid
    }

    recordReactiveAttr(arg) {
        const uid = `uid-${MvvmTemplate.uid++}`
        this._attrs[uid] = arg

        return uid
    }

    /**
     * @param {TemplateLifecycleCallbacks} lifecycleCallbacks 
     */
    setCallbacks(lifecycleCallbacks = {}) {
        this._lifecycleCallbacks = lifecycleCallbacks
    }

    /**
     * @param {keyof TemplateLifecycleCallbacks} lifecycle 
     * @param {any[] | []} args 
     */
    callLifecycleCallback(lifecycle, target, args) {
        const tag = lifecycle
        if (typeof this._lifecycleCallbacks[tag] === 'function') {
            this._lifecycleCallbacks[tag].apply(target, args)
        }
    }

    /**@private*/ _handleContent(shadowRoot=false) {
        let target = this._element

        if (shadowRoot) {
            target = this._element.useShadowRoot()
            this._shadowElement = true
        }

        target.innerHTML = this._rawHtml

        this._handleInnerTexts(target)
    }

    /**
     * @private
     * @param {HTMLElement | ShadowRoot} target 
     */
    _handleInnerTexts(target) {
        target.childNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                return this._handleInnerTexts(node)
            }

            if (node.nodeType === Node.TEXT_NODE) {
                if (node.nodeValue in this._contents) {
                    this._handleTextNode(node, this._contents[node.nodeValue])
                }
            }
        })
    }

    /**
     * @private
     */
    _handleTextNode(node, val) {
        if (val._isReactive) {
            node.nodeValue = val.value
            Accessor.addSubmit(val, t => node.nodeValue = t)
            return
        }

        node.nodeValue = val.value.toString()
    }

    /**
     * @private
     * @param {HTMLElement} target 
     */
    _handleAttrs(target) {
        for (const attr of target.attributes) {
            this._handleAttribute(target, attr)
        }

        for (const child of target.children) {
            this._handleAttrs(child)
        }
    }

    /**
     * @private
     * @param {HTMLElement} target 
     * @param {Attr} attr 
     */
    _handleAttribute(target, attr) {
        if (attr.name.startsWith('@')) {
            const [eventName, ...modifiers] = attr.name.slice(1).split('|')
            this._bindEvent(target, eventName, this._attrs[attr.value], modifiers)
            return
        }
    }

    /**
     * @private
     * @param {EventTarget} target 
     * @param {string} name 
     * @param {EventListener} listener 
     * @param {string[]} modifiers 
     */
    _bindEvent(target, name, listener, modifiers=[]) {
        let _l = listener
        for (const modifier of modifiers) {
            if (modifier in MvvmTemplate.eventModifiers) {
                _l = MvvmTemplate.eventModifiers[modifier]
                    .call(null, target, listener)
            }
        }

        target.addEventListener(name, _l)
    }

    /**
     * @param {Node} target 
     * @param {import('./types').MountOptions} opt 
     */
    mount(target, opt={}) {
        this._handleContent(opt.shadow)
        target.appendChild(this._element)
    }
}
