import { importTemplate, MviElement, defineElement, relative } from '../mvi.js'

const temp = await importTemplate(
    relative(import.meta, './index.html'),
    {
        subtitle: v => v.subtitle ?? 'subtitle',
        title: v => v.title ?? 'title',
        footer: v => v.footer ?? '',
    }
)

export class MyArticle extends MviElement {
    static observedAttributes = [
        'subtitle', 'title', 'footer'
    ]
}

defineElement('my-article', temp, MyArticle)