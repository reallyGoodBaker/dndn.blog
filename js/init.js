import { bindAllCGs } from './cg.js'
import { LoadingCircle } from './LoadingCircle.js'

customElements.define('loading-circle', LoadingCircle)

window.addEventListener('load', async () => {
    bindAllCGs()
})