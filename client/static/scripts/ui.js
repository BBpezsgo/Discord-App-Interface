const UI = {
    /**
     * @template {keyof HTMLElementTagNameMap} T
     * @param {string} id
     * @param {T | null} [tag = null]
     * @returns {HTMLElementTagNameMap[T]}
     */
    get: function(id, tag = null) {
        const res = document.getElementById(id)
        if (!res) { throw new Error(`Element #${id} not found`) }
        if (tag && res.tagName.toUpperCase() !== tag.toUpperCase()) { throw new Error(`Element #${id} isn't a ${tag}`) }
        // @ts-ignore
        return res
    },
    /**
     * @template {keyof HTMLElementTagNameMap} T
     * @param {string} id
     * @param {T | null} [tag = null]
     * @returns {HTMLElementTagNameMap[T] | null}
     */
    tryGet: function(id, tag) {
        const res = document.getElementById(id)
        if (!res) { return null }
        if (tag && res.tagName.toUpperCase() !== tag.toUpperCase()) { throw new Error(`Element #${id} isn't a ${tag}`) }
        // @ts-ignore
        return res
    },
}
