/// <reference path="./global.d.ts" />

Handlebars.registerHelper({
    "equal": function (arg1, arg2, /** @type {Handlebars.HelperOptions} */ options) {
        if (arg1 === arg2) {
            return options.fn(this)
        }
        return null
    },
    "notequal": function (arg1, arg2, /** @type {Handlebars.HelperOptions} */ options) {
        if (arg1 !== arg2) {
            return options.fn(this)
        }
        return null
    },
    'switch': function (value, /** @type {Handlebars.HelperOptions} */ options) {
        this.switch_value = value
        // @ts-ignore
        this.done = false
        return options.fn(this)
    },
    'case': function (value, /** @type {Handlebars.HelperOptions} */ options) {
        // @ts-ignore
        if (this.done !== true && value === this.switch_value) {
            // @ts-ignore
            this.done = true
            return options.fn(this)
        }
    },
    'casedefault': function (/** @type {Handlebars.HelperOptions} */ options) {
        // @ts-ignore
        if (this.done !== true) {
            return options.fn(this)
        }
    },
    'json': function (/** @type {Handlebars.HelperOptions} */ context) {
        return JSON.stringify(context)
    }
})

coolFetch('/partials.json')
    .then(async res => {
        if (!res.ok) { return }
        const partials = await res.json()
        for (const partial of partials) {
            const res2 = await coolFetch(`/${partial}.hbs`)
            if (!res2.ok) { continue }
            const partialData = await res2.text()
            Handlebars.registerPartial(partial, partialData)
        }
    })
    .catch(console.error)

window['__partials'] = { }

/**
 * @param {string} url
 * @param {any} context
 */
async function template(url, context) {
    if (context instanceof Promise) { context = await context }
    if (!window['__partials']) window['__partials'] = { }
    let partial = window['__partials'][url]
    if (!partial) {
        const res = await coolFetch(url)
        if (!res.ok) { throw res.statusText }
        partial = await res.text()
        window['__partials'][url] = partial
    }
    return Handlebars.compile(partial)(context)
}

/**
 * @param {string} url
 * @param {any} context
 */
async function templateDOM(url, context) {
    if (context instanceof Promise) { context = await context }
    const html = await template(url, context)
    const doc = new DOMParser().parseFromString(html, "text/html")
    return doc.body.firstElementChild
}
