import { bindAllCGs } from './cg.js'
import { template, val, driver } from './mvi.js'

window.addEventListener('load', async () => {
    bindAllCGs()
})

const status = val('input')
const text = val('')

const inputDriver = driver(evs => {
    evs.map(ev => status.value = ev.type)
    evs.event('input')
        .map(ev => text.value = ev.target.value)
})

const temp = template`
<div>
    <h1>${text}</h1>
    <h2>${status}</h2>
    <input $input|change|focus="${inputDriver}" />
</div>
`

temp.mount(
    document.querySelector('#reactive')
)