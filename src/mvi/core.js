/// <reference path="./types.d.ts" />

import { driver } from './driver.js'

/**
 * @param {string} tagName 
 * @param {MviTemplate|MviElement} template 
 * @param {MviElement} cls 
 */
export function defineElement(tagName, template, cls) {
    if (cls) {
        cls.prototype.connectedCallback = function() {
            template.build(this, true)
            this.connectedCallback()
        }

        customElements.define(tagName, cls)
        cls.tagName = tagName

        return
    }

    template.tagName = tagName
    customElements.define(tagName, template)
}

/**
 * @param {() => { [P: string]: Forwardable }} sinks 
 * @param {{ [P: string]: DriverMain }} drivers 
 */
export function run(sinks, drivers) {
    const _sinks = sinks()
    Object.entries(_sinks).forEach(([ name, sink ]) => {
        const _driver = driver(drivers[name])
        sink.forward(_driver)
        _driver.run()
    })
}