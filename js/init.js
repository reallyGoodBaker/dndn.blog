import { bindAllCGs } from './cg.js'
import { template, val } from './mvvm.js'

window.addEventListener('load', async () => {
    bindAllCGs()
})

let count = val(0)

function onClick() {
    count.value++
}

const temp = template`
<h1>${count}</h1>
<div class="txt_btn" @click="${onClick}">增加</div>
`

temp.mount(document.querySelector('#reactive'))