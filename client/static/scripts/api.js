/**
 * @template T
 * @typedef {{
 *   [url: string]: {
 *     date: number
 *     value: T
 *   } | undefined
 * }} ApiCache
 */

class ApiError extends Error {
    /**
     * @readonly
     * @type {any}
     */
    code

    /**
     * @param {any} details
     */
    constructor(details) {
        let builder = ''
        if ('error' in details) {
            builder = details.error.message + ''
        } else {
            builder = details.code + ''
        }
        super(builder.trim())
        this.code = details.code
        this.name = 'ApiError'
    }
}

/**
 * @template T
 * @param {ApiCache<T>} cache
 * @param {string} key
 * @param {number} [maxAge=30000]
 * @returns {T | null}
 */
function getCache(cache, key, maxAge = 30000) {
    const cached = cache[key]
    if (cached && Date.now() - cached.date <= maxAge) {
        return cached.value
    }
    return null
}

/** @type {ApiCache<import('../../../common/partial-api').User>} */
const cacheUsers = { }

/**
 * @param {string} userId
 * @returns {Promise<import('../../../common/partial-api').User | null>}
 */
function getUser(userId, force = false) {
    return new Promise((resolve, reject) => {
        if (!force) {
            const cached = getCache(cacheUsers, userId)
            if (cached) {
                resolve(cached)
                return
            }
        }
    
        coolFetch(`/api/users/${userId}.json${force ? '?force' : ''}`)
            .then(res => {
                if (!res.ok) {
                    try {
                        res.json()
                            .then(details => {
                                if ('error' in details) {
                                    reject(new ApiError(details))
                                    return
                                }
                                reject(new HttpError(res.status, res.statusText))
                            })
                            .catch(() => {
                                reject(new HttpError(res.status, res.statusText))
                            })
                    } catch (error) {
                    }
                    return
                }
            
                res.json()
                    .then(user => {
                        if (!user) {
                            resolve(null)
                            return
                        }
                    
                        cacheUsers[userId] = { date: Date.now(), value: user }
                        resolve(user)
                    })
                    .catch(reject)
            })
            .catch(reject)
    })
}

/** @type {ApiCache<Omit<import('../../../common/partial-api').Channel, 'messages'>>} */
const cacheChannels = { }

/**
 * @param {string} channelId
 * @returns {Promise<Omit<import('../../../common/partial-api').Channel, 'messages'> | null>}
 */
async function getChannel(channelId) {
    const cached = getCache(cacheChannels, channelId)
    if (cached) { return cached }

    const res = await coolFetch(`/api/channels/${channelId}.json`)
    if (!res.ok) { return null }

    const channel = await res.json()
    if (!channel) { return null }

    cacheChannels[channelId] = { date: Date.now(), value: channel }
    return channel
}

/** @type {ApiCache<any>} */
const cacheRoles = { }

/**
 * @param {string} guildId
 * @param {string} roleId
 * @returns {Promise<any | null>}
 */
async function getRole(guildId, roleId) {
    const cached = getCache(cacheRoles, `${guildId}/${roleId}`)
    if (cached) { return cached }

    const res = await coolFetch(`/api/roles/${guildId}/${roleId}.json`)
    if (!res.ok) { return null }

    const role = await res.json()
    if (!role) { return null }

    cacheRoles[`${guildId}/${roleId}`] = { date: Date.now(), value: role }
    return role
}

/**
 * @returns {Promise<any | null>}
 */
async function getClient(path = null) {
    const res = await coolFetch(`/api/client.json${(path ? `?path=${path}` : '')}`)
    if (!res.ok) { return null }

    const role = await res.json()
    if (!role) { return null }

    return role
}

/**
 * @returns {Promise<any | null>}
 */
async function getClientUser(path = null) {
    const res = await coolFetch(`/api/user.json${(path ? `?path=${path}` : '')}`)
    if (!res.ok) { return null }

    const role = await res.json()
    if (!role) { return null }

    return role
}

/**
 * @returns {Promise<any | null>}
 */
async function getApplication(path = null) {
    const res = await coolFetch(`/api/application.json${(path ? `?path=${path}` : '')}`)
    if (!res.ok) { return null }

    const role = await res.json()
    if (!role) { return null }

    return role
}

/**
 * @param {string | URL | Request} url
 * @param {BodyInit} body
 */
async function post(url, body = null) {
    const res = await fetch(url, {
        method: 'POST',
        body: body,
    })
    if (res.headers.get('Content-Length') === '0') { return null }
    const text = await res.text()
    if (!text) { return null }
    if (res.status >= 200 && res.status < 300) {
        return JSON.parse(text)
    }
    if (res.status >= 400 && res.status < 500) {
        throw new HttpError(res.status, res.statusText)
    }
    throw new ApiError(JSON.parse(text))
}

/**
 * @param {string} id
 */
async function closeDM(id) { return await post(`/api/channels/@me/${id}/close`) }

/**
 * @param {string} id
 */
async function createDM(id) { return await post(`/api/channels/@me/${id}/create`) }

/**
 * @param {string} guildId
 * @param {string} channelId
 * @param {string | import('../../../node_modules/discord.js/typings/index').MessagePayload | import('../../../node_modules/discord.js/typings/index').MessageCreateOptions} message
 */
async function sendMessage(guildId, channelId, message) {
    const result = await post(`/api/channels/${guildId}/${channelId}/send`, JSON.stringify(message))

    await addMessage(result)

    return result
}

/**
 * @param {string} guildId
 * @param {string} channelId
 * @param {string} messageId
 * @param {import('../../../node_modules/discord.js/typings/index').EmojiIdentifierResolvable} reaction
 */
async function addReaction(guildId, channelId, messageId, reaction) {
    await post(`/api/channels/${guildId}/${channelId}/${messageId}/react`, JSON.stringify(reaction))
}

/**
 * @param {string} guildId
 * @param {string} channelId
 * @param {string} messageId
 * @param {import('../../../common/api').RemoveReactionParams} reaction
 */
async function removeReaction(guildId, channelId, messageId, reaction) {
    await post(`/api/channels/${guildId}/${channelId}/${messageId}/removeReact`, JSON.stringify(reaction))
}
