/// <reference path="./types.d.ts" />

export function relative(importMeta, url) {
    const fileUrl = importMeta.url
    const { pathname } = new URL(fileUrl)
    const pathArr = pathname.split('/')
    const urlArr = url.split('/')

    pathArr.pop()

    if (urlArr[0].length === 0) {
        return url
    }

    const targetPath = pathArr.slice(0)

    urlArr.forEach(pathName => {
        if (pathName === '.') {
            return
        }

        if (pathName === '..') {
            return targetPath.pop()
        }

        targetPath.push(pathName)
    })

    return targetPath.join('/')
}

export function immutableAttrArray(attrs=[]) {
    const arr = []

    for (const attr of attrs) {
        arr.push(attr)
    }

    return arr
}