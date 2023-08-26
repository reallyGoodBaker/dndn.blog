/// <reference path="./types.d.ts" />

import { EventStream } from './event.js'

class Driver {

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
    /**@private @type {ReturnType<DriverScheduler>}*/ _scheduler = null
    /**@private*/ _forwardTo = null

    send = val => {
        if (!this._forwardTo) {
            this._evQueue.push(val)
            return
        }

        this._forwardTo.send(val)
    }

    /**
     * @param {DriverMain} main 
     * @param {(driver: Driver, func: Function) => {run: Function, stop: Function}} [scheduler]
     */
    constructor(main, scheduler = Driver.defaultScheduler) {
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
     * @param {Driver} driver 
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
 * @param {DriverMain} main 
 */
export function driver(main) {
    return new Driver(main)
}