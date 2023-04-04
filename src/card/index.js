import { importTemplate, val, relative, driver } from '../mvi.js'

const subtitle = val('subtitle')
const title = val('title')

const btnDriver = driver(evs => {
    evs.select('[tag=reply]').map(() => console.log('Clicked reply'))
})

btnDriver.run()

const temp = await importTemplate(
    relative(import.meta, './index.html'),
    { tagName: 'mvi-card' },
    { subtitle, title, btnDriver }
)

console.log(temp)

temp.defineAttributes({
    subtitle: v => subtitle.value = v,
    title: v => title.value = v,
})

temp.export({
    clickStream: btnDriver
})

export default temp