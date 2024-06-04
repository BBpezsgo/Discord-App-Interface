/** @type {{ [url: string]: { time: number; reason: any; } }} */
const failedFetches = { }

class HttpError extends Error {
    /**
     * @readonly
     * @type {number}
     */
    statusCode

    /**
     * @readonly
     * @type {string}
     */
    statusMessage

    /**
     * @param {number} statusCode
     * @param {string} statusMessage
     */
    constructor(statusCode, statusMessage) {
        super(`${statusCode} ${statusMessage}`.trim())
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.name = 'HttpError'
    }
}

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
function coolFetch(url) {
    return new Promise((resolve, reject) => {
        if (failedFetches[url]) {
            const now = Date.now()
            const lifetime = now - failedFetches[url].time
            if (lifetime < 5000) {
                reject(failedFetches[url].reason)
                return
            }
            delete failedFetches[url]
        }

        fetch(url, { cache: 'default' })
            .then(resolve)
            .catch((reason) => {
                failedFetches[url] = {
                    time: Date.now(),
                    reason: reason,
                }
                reject(reason)
            })
    })
}
