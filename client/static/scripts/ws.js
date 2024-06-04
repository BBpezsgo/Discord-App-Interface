/**
 * @typedef {{
 *  'client/error': { error: Error }
 *  'client/warn': { warning: string }
 *  'client/invalidated': null
 *  'client/ready': null
 *  'ws/ready': { data: any, shardId: number }
 *  'ws/resumed': { data: any, shardId: number }
 * }} EventMap
 */

/**
 * @template {keyof EventMap} [T = keyof EventMap]
 * @typedef {{
 *  type: T
 *  data: EventMap[T]
 * }} WscMessage
 */

/**
 * @typedef {keyof EventMap} EventNames
 */

class WSC extends EventTarget {
    constructor() {
        super()

        this.URL = 'ws://' + window.location.host + '/'
        this.WS = new WebSocket(this.URL)
        
        this.WS.addEventListener('open', function(e) {
            console.log('[WebSocket]: Open')
        })

        const self = this
        this.WS.addEventListener('message', function(e) {
            if (!e) { return }
            try {
                /** @type {WscMessage} */
                const data = JSON.parse(e.data)
                if (!data.type) { console.warn(`[WebSocket]: Invalid message`, data); return }
                if (typeof data.type !== 'string') { console.warn(`[WebSocket]: Invalid message`, data); return }
                // @ts-ignore
                self.dispatchEvent(new CustomEvent(data.type, { detail: data.data }))
            } catch (error) {
                console.error(error)
            }
        })
        
        this.WS.addEventListener('error', function(e) {
            console.error('[WebSocket]: Error', e)
        })
        
        this.WS.addEventListener('close', function(e) {
            if (e.wasClean) {
                console.log('[WebSocket]: Closed', e)
            } else {
                console.warn('[WebSocket]: Closed', e)
            }
        })
    }

    /**
     * @param {CustomEvent<EventMap>} event
     * @returns {boolean}
     */
    dispatchEvent(event) { return super.dispatchEvent(event) }

    /**
     * @template {EventNames} T
     * @template {CustomEvent<EventMap[T]>} E
     * @param {T} type
     * @param {(e: Event & E) => any} callback
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener(type, callback, options) { super.addEventListener(type, callback, options) }

    /**
     * @param {EventNames} type
     * @param {EventListenerOrEventListenerObject} callback
     * @param {boolean | EventListenerOptions} [options]
     */
    removeEventListener(type, callback, options) { super.removeEventListener(type, callback, options) }
}

window['WSC'] = WSC
const wsc = new WSC()

if (false) module.exports = {}
