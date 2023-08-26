import { bindAllCGs } from '../js/cg.js'
window.addEventListener('load', async () => {
    bindAllCGs()
})

import { driver, run } from './mvi/index.js'
import './article/index.js'

/**@type {DriverMain}*/
const contentDriver = evs => {
    const reply$ = evs.event('reply')
    const edit$ = evs.event('edit')
    const delete$ = evs.event('delete')

    console.log(evs)
    delete$.forEach(({ detail: { root } }) => root.remove())
}

const drivers = {
    content$: contentDriver
}

run(() => {
    const content$ = driver()
    document.querySelectorAll('my-article').forEach(el => el.forward(content$))

    return {
        content$,
    }
}, drivers)