export function bindAllCGs() {
    const cgsCurrent = Array.from(document.getElementsByClassName('cg'))

    cgsCurrent.forEach(el => {
        const trackerMark = el.getAttribute('tracker')
        let tracker

        if (!trackerMark) {
            tracker = document.body
            return bindPointerEvents(el, tracker)
        }

        bindPointerEvents(el, findTracker(el, trackerMark))
    })
}

/**
 * @param {HTMLElement} el 
 * @param {HTMLElement} context 
 * @returns 
 */
function bindPointerEvents(el, context) {
    if (el.tracker) {
        return
    }

    el.tracker = context

    let isTracking = false
    let task = null

    context.addEventListener('pointerenter', () => {
        el.style.transition = 'none'
        isTracking = true
    })

    context.addEventListener('pointerleave', () => {
        el.style.transition = 'all 0.1s'
        el.style.setProperty('--dx', 0)
        el.style.setProperty('--dy', 0)
        isTracking = false
    })

    context.addEventListener('pointermove', ev => {
        if (!isTracking || task) {
            return
        }

        task = requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect()
            const cx = rect.x + rect.width / 2
                ,cy = rect.y + rect.height / 2
            let dx = cx - ev.screenX
                ,dy = cy - ev.screenY
                ,radius = Math.sqrt(dx ** 2 + dy ** 2)

            if (radius > 160) {
                const scale = 160 / radius
                dx *= scale
                dy *= scale
            }

            el.style.setProperty('--dx', dx / 8 + 'px')
            el.style.setProperty('--dy', dy / 8 + 'px')

            task = null
        })
    })
}

/**
 * @param {HTMLElement} el 
 * @param {string} mark 
 */
function findTracker(el, mark) {
    let it = el

    while ((it = it.parentElement) !== document.body) {
        const trackMark = it.getAttribute('track')
        if (trackMark === mark) {
            break
        }
    }

    return it
}