import { bindAllCGs } from './cg.js'
import { template, val } from './mvvm.js'

window.addEventListener('load', async () => {
    bindAllCGs()
})

let greeting = val('Hello World')
window.greeting = greeting

function onClick() {
    alert('You clicked h1')
}

const temp = template`
<h1 @click="${onClick}">${greeting}</h1>
`

temp.setCallbacks({
    connected() {
        console.log('???')
    },
})

console.log(temp)


temp.mount(document.querySelector('#reactive'))