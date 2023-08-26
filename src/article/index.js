import { importTemplate, MviElement, defineElement, relative, ev } from '../mvi/index.js'
import marked from '../marked.js'

const temp = await importTemplate(
    relative(import.meta, './index.html'),
    {
        subtitle: attrs => attrs.subtitle ?? 'subtitle',
        title: attrs => attrs.title ?? 'title',
        footer: attrs => attrs.footer ?? '',
        reply() {
            const root = this.getContext('root')
            root.getDriver().send(ev('reply', {
                target: this,
                root,
            }))
        },
        edit() {
            const root = this.getContext('root')
            root.getDriver().send(ev('edit', {
                target: this,
                root,
            }))
        },
        delete() {
            const root = this.getContext('root')
            root.getDriver().send(ev('delete', {
                target: this,
                root,
            }))
        },
        avatar: attrs => attrs.avatar ?? './asset/porno.png',
    }
)

export class MyArticle extends MviElement {
    static observedAttributes = [
        'subtitle', 'title', 'footer'
    ]

    async initialized() {
        const container = this.getContext('container')

        for (const element of container.assignedElements()) {
            if (element.slot === 'content') {
                if (element.innerText.endsWith('.md')) {
                    return this.renderAsMarkDown(element)
                }


            }
        }
    }

    async renderAsMarkDown(element) {
        const innerHtml = marked.parse(
            await (await fetch(
                relative(import.meta, `../../asset/articles/${element.innerText}`)
            )).text()
        )

        element.innerHTML = innerHtml
    }
}


defineElement('my-article', temp, MyArticle)