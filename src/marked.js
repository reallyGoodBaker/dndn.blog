const { markedHighlight } = globalThis.markedHighlight
export const marked = new window.marked.Marked(
    markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext'
            return hljs.highlight(code, { language }).value
        }
    })
)

export default marked