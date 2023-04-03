import { bindAllCGs } from './cg.js'
import { val, importTemplate, relative } from './mvi.js'

window.addEventListener('load', async () => {
    bindAllCGs()
})

const count = val(0)

function add() {
    count.value++
}

function reduce() {
    count.value--
}

const filePath = relative(import.meta, './ttest.html')

const temp = await importTemplate(filePath, {
    count, add, reduce
})

temp.mount(
    document.querySelector('#reactive')
)