
/**
 * @typedef { 'TEXT' |
 *  'URL' |
 *  'PING' |
 *  'EMOJI' |
 *  'CHANNEL' |
 *  'USER' |
 *  'IMG' |
 *  'VIDEO' |
 *  'ROLE' |
 *  'BR' |
 *  'SPOILER' |
 *  'BOLD' |
 *  'ITALIC' |
 *  'BLOCK' |
 *  'SMALLCODE' |
 *  'URL_LABEL' |
 *  'PING_RAW'
 * } ParserElementType
 */

/**
 * @template {ParserElementType} [T = ParserElementType]
 * @typedef {{
 *  type: T
 *  data: string
 * }} ParserElement
 */

/**
 * @param {string} text
 * @returns {Array<ParserElement>}
 */
function parseMessageContent(text) {
    text = text.trim()

    /** @type {Array<ParserElement>} */
    let result = [{
        type: 'TEXT',
        data: text,
    }]

    const GetNonparsedElements = function(/** @type {(element: ParserElement) => void} */ parsed, /** @type {(element: ParserElement<'TEXT'>) => void} */ nonparsed) {
        for (const element of result) {
            if (element.type === 'TEXT') nonparsed({
                type: 'TEXT',
                data: element.data,
            })
            else parsed(element)
        }
    }

    const GetMatches = function(/** @type {string} */ text, /** @type {RegExp} */ regex) {
        if (!text) return []
        const regexResult = text.matchAll(regex)
        /** @type {Array<{value: string, index: number}>} */
        const result = []
        let endlessSafe = 0
        while (true) {
            /** @type {RegExpMatchArray | undefined} */
            const next = regexResult.next().value
            if (next === undefined) { break }
            result.push({
                value: next[0],
                index: next.index
            })

            endlessSafe += 1
            if (endlessSafe > 1000) {
                throw new Error('Endless Loop!')
            }
        }
        return result
    }

    const ParseThing = function(/** @type {RegExp} */ regex, /** @type {ParserElementType} */ type, sliceStart = 0, sliceEnd = 0) {
        /** @type {Array<ParserElement>} */
        const finalResult = []

        GetNonparsedElements(x => finalResult.push(x), element => {
            const result = GetMatches(element.data, regex)

            if (result.length > 0) {
                let j = 0
                for (let i = 0; i < result.length; i++) {
                    const resItem = result[i]
                    finalResult.push({
                        type: 'TEXT',
                        data: element.data.substring(j, resItem.index)
                    })
                    finalResult.push({
                        type: type,
                        data: resItem.value.substring(sliceStart, resItem.value.length - sliceEnd)
                    })
                    j = resItem.index + resItem.value.length
                }
                finalResult.push({
                    type: 'TEXT',
                    data: element.data.substring(j)
                })
            } else {
                finalResult.push({
                    type: 'TEXT',
                    data: element.data
                })
            }
        })

        result = finalResult
    }

    ParseThing(
        /<@![0-9]{18,19}>/g,
        'USER',
        3, 1)
    
    ParseThing(
        /<#[0-9]{18,19}>/g,
        'CHANNEL',
        2, 1)
    
    ParseThing(
        /<@&[0-9]{18,19}>/g,
        'ROLE',
        3, 1)
    
    ParseThing(
        /<:[a-zA-Z\_]*:[0-9]{18,}>/g,
        'EMOJI')
    
    ParseThing(
        /<a:[a-zA-Z\_]*:[0-9]{18,}>/g,
        'EMOJI')
    
    ParseThing(
        /@(everyone|here)/g,
        'PING')
    
    ParseThing(
        /@([a-zA-Z ]+)/g,
        'PING')
    
    ParseThing(
        /\<@([0-9]{18,19})\>/g,
        'PING_RAW',
        2, 1)
    
    ParseThing(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=\!]*)/g,
        'URL')
    
    ParseThing(
        /\n/g,
        'BR')
    
    ParseThing(
        /\*\*[^\*]+\*\*/g,
        'BOLD',
        2, 2)
    
    ParseThing(
        /\*[^\*]+\*/g,
        'ITALIC',
        1, 1)
    
    ParseThing(
        /\`[^\`]+\`/g,
        'SMALLCODE',
        1, 1)
    
    ParseThing(
        /\|\|[^\|]+\|\|/g,
        'SPOILER',
        2, 2)
    
    ParseThing(
        /^>[^\n]*/g,
        'BLOCK',
        1, 0)
    
    for (let i = 0; i < result.length; i++) {
        if (result[i].type === 'BR') continue
        if (result[i].type === 'IMG') continue
        if (result[i].type === 'VIDEO') continue
        if (result[i].type === 'CHANNEL') continue
        if (result[i].type === 'EMOJI') continue
        if (result[i].type === 'USER') continue
        if (result[i].type === 'ROLE') continue
        if (result[i].type === 'URL') continue
        if (!result[i].data) continue

        result[i].data = result[i].data.replace(/\\(?!\\)/g, '')
        result[i].data = result[i].data.replace(/\\\\/g, '\\')
    }

    return result
}
