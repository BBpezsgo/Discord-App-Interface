const fs = require('fs')
const Path = require('path')
const mime = require('mime-types')

/**
 * @typedef {{
 *   buffer: Buffer;
 *   mimeType: string;
 *   size: number | null;
 * }} ImageAsset
 */

class ImageAssets {
    /** @private @readonly @type {Array<ImageAsset>} */
    _assets

    constructor() {
        this._assets = [ ]
    }

    /**
     * @param {number | null} [size = null]
     * @returns {ImageAsset | null}
     */
    get(size = null) {
        /** @type {ImageAsset | null} */
        let result = null
        for (const asset of this._assets) {
            if (!result) {
                result = asset
                continue
            }

            if (size === null) {
                break
            }

            if (result.size !== null && asset.size !== null) {
                const resultSizeDiff = Math.abs(result.size - size)
                const currentSizeDiff = Math.abs(result.size - size)
                if (currentSizeDiff < resultSizeDiff) {
                    result = asset
                }
            }
        }

        return result
    }

    /**
     * @param {ImageAsset} asset
     */
    push(asset) {
        this._assets.push(asset)
        this._assets.sort((a, b) => {
            if (a.size !== null && b.size !== null) { return b.size - a.size }
            if (a.size !== null) { return -1 }
            if (b.size !== null) { return 1 }
            return 0
        })
    }
}

/**
 * @param {string} path
 * @returns {Array<import('./har-def').Entry>}
 */
function getEntries(path) {
    if (!fs.existsSync(path)) { return [ ] }

    if (fs.statSync(path).isDirectory()) {
        const files = fs.readdirSync(path, { withFileTypes: true })
    
        const entries = []
    
        for (const file of files) {
            if (!file.isFile()) { continue }
            
            /** @type {import('./har-def').HAR} */
            const es = JSON.parse(fs.readFileSync(Path.join(path, file.name), 'utf8'))
            for (const entry of es.log.entries) {
                entries.push(entry)
            }
        }
        return entries
    }
    
    if (fs.statSync(path).isFile()) {
        return JSON.parse(fs.readFileSync(path, 'utf8')).log.entries
    }

    return [ ]
}

/**
 * @param {string} path
 */
function load(path) {
    const entries = getEntries(path)

    /** @type {{ [key: string]: import('../common/partial-api').Channel }} */
    const channels = { }
    /** @type {{ [key: string]: import('../common/partial-api').User }} */
    const users = { }
    /** @type {{ [key: string]: import('../common/partial-api').Guild }} */
    const guilds = { }

    /** @type {{ [userId: string]: { [hash: string]: ImageAssets } }} */
    const avatars = { }
    /** @type {{ [guildId: string]: { [hash: string]: ImageAssets } }} */
    const guildIcons = { }

    for (const entry of entries) {
        if (!entry.response.content.text) { continue }
        if (!entry.request.url.startsWith('https://cdn.discordapp.com/')) { continue }
        const url = new URL(entry.request.url)
        const cdnPath = url.pathname.replace('/', '')

        const encoding = entry.response.content.encoding ?? 'utf8'
        const buffer = Buffer.from(entry.response.content.text, encoding)

        if (cdnPath.startsWith('avatars')) {
            const userId = cdnPath.split('/')[1]
            const hash = (() => {
                const _hash = cdnPath.split('/')[2]
                const _hashParts = _hash.split('.')
                return _hash.substring(0, _hash.length - 1 - _hashParts[_hashParts.length - 1].length)
            })()

            const sizeQuery = entry.request.queryString.find(v => v.name === 'size')?.value
            const size = sizeQuery ? Number.parseInt(sizeQuery) : NaN
            avatars[userId] ??= { }
            avatars[userId][hash] ??= new ImageAssets()
            avatars[userId][hash].push({
                buffer: buffer,
                mimeType: entry.response.content.mimeType,
                size: Number.isNaN(size) ? null : size,
            })
        } else if (cdnPath.startsWith('icons')) {
            const guildId = cdnPath.split('/')[1]
            const hash = (() => {
                const _hash = cdnPath.split('/')[2]
                const _hashParts = _hash.split('.')
                return _hash.substring(0, _hash.length - 1 - _hashParts[_hashParts.length - 1].length)
            })()
            
            const sizeQuery = entry.request.queryString.find(v => v.name === 'size')?.value
            const size = sizeQuery ? Number.parseInt(sizeQuery) : NaN
            guildIcons[guildId] ??= { }
            guildIcons[guildId][hash] ??= new ImageAssets()
            guildIcons[guildId][hash].push({
                buffer: buffer,
                mimeType: entry.response.content.mimeType,
                size: Number.isNaN(size) ? null : size,
            })
        } else {
            
        }
    }

    for (const entry of entries) {
        if (!entry.response.content.text) { continue }
        if (!entry.request.url.startsWith('https://discord.com/api/v9/')) { continue }
        const url = new URL(entry.request.url)
        const apiPath = url.pathname.replace('/api/v9/', '')
        const json = (entry.response.content.mimeType === 'application/json') ? JSON.parse(entry.response.content.text) : null

        if (json && json.code && json.message) { continue }

        if (apiPath.startsWith('channels/')) {
            if (!json) { continue }
            if (!Array.isArray(json)) { continue }
            const channelId = apiPath.split('/')[1]
            const channel = channels[channelId] ?? { id: channelId }

            channel.messages ??= { }
            for (const message of json) {
                const _message = channel.messages[message.id] ?? { id: message.id + '' }

                _message.channelId ??= message.channel_id
                _message.content ??= message.content
                _message.flags ??= message.flags
                _message.pinned ??= message.pinned
                _message.tts ??= message.tts
                _message.type ??= message.type
                if (message.timestamp) _message.createdTimestamp ??= Date.parse(message.timestamp)
                if (message.edited_timestamp) _message.editedTimestamp ??= Date.parse(message.edited_timestamp)
                
                if (message.embeds.length > 0 && (!_message.embeds || _message.embeds.length === 0)) {
                    _message.embeds ??= []

                    for (const embed of message.embeds) {
                        /** @type {import('../common/partial-api').Embed} */
                        const _embed = { }

                        _embed.description ??= embed.description
                        _embed.type ??= embed.type
                        _embed.url ??= embed.url
                        _embed.title ??= embed.title
                        if (embed.thumbnail) _embed.thumbnail ??= {
                            width: embed.thumbnail.width,
                            height: embed.thumbnail.height,
                            url: embed.thumbnail.url,
                            proxyUrl: embed.thumbnail.proxy_url,
                        }
                        if (embed.provider) _embed.provider ??= {
                            name: embed.provider.name,
                        }
                        if (embed.video) _embed.video ??= {
                            width: embed.video.width,
                            height: embed.video.height,
                            url: embed.video.url,
                            proxyUrl: embed.video.proxy_url,
                        }

                        _message.embeds.push(_embed)
                    }
                }

                if (message.author) {
                    _message.authorId = message.author.id

                    const user = users[message.author.id] ?? { id: message.author.id + '' }

                    user.accentColor ??= message.author.accent_color
                    user.avatar ??= message.author.avatar
                    user.bannerColor ??= message.author.banner_color
                    user.discriminator ??= message.author.discriminator
                    user.flags ??= message.author.flags
                    user.globalName ??= message.author.global_name
                    // user.premiumType ??= message.author.premium_type
                    user.publicFlags ??= message.author.public_flags
                    user.username ??= message.author.username

                    users[message.author.id] = user
                }
                
                channel.messages[message.id] = _message
            }

            channels[channelId] = channel
        } else if (apiPath.startsWith('applications/detectable')) {
        } else if (apiPath.startsWith('auth')) {
        } else if (apiPath.startsWith('explicit-media/current-version')) {
        } else if (apiPath.startsWith('users/@me/connections')) {
        } else if (apiPath.startsWith('creator-monetization')) {
        } else if (apiPath.startsWith('quests')) {
        } else if (apiPath.startsWith('premium-marketing')) {
        } else if (apiPath.startsWith('user-profile-effects')) {
        } else if (apiPath.startsWith('users/@me')) {
            const userPath = apiPath.replace('users/@me/', '')

            if (userPath.startsWith('entitlements')) {
            } else if (userPath.startsWith('affinities/guilds')) {
            } else if (userPath.startsWith('affinities/users')) {
            } else if (userPath.startsWith('library')) {
            } else if (userPath.startsWith('burst-credits')) {
            } else if (userPath.startsWith('settings-proto/2')) {
            } else if (userPath.startsWith('survey')) {
            } else if (userPath.startsWith('billing')) {
            } else if (userPath.startsWith('referrals')) {
            } else if (userPath.startsWith('email-settings')) {
            } else {
                debugger
            }
        } else if (apiPath.startsWith('users')) {
            const userId = apiPath.split('/')[1]
            const userPath = apiPath.replace('users' + '/' + userId + '/', '')

            const user = users[userId] ?? { id: userId }

            if (userPath === 'profile') {
                if (!json) { continue }

                user.legacyUsername ??= json.legacy_username

                if (json.user) {
                    user.accentColor ??= json.user.accent_color
                    user.avatar ??= json.user.avatar
                    user.bannerColor ??= json.user.banner_color
                    user.bio ??= json.user.bio
                    user.discriminator ??= json.user.discriminator
                    user.flags ??= json.user.flags
                    user.globalName ??= json.user.global_name
                    user.publicFlags ??= json.user.public_flags
                    user.username ??= json.user.username
                }

                if (json.user_profile) {
                    user.accentColor ??= json.user_profile.accent_color
                    user.bio ??= json.user_profile.bio
                    user.pronouns ??= json.user_profile.pronouns
                }
            } else {
                debugger
            }

            users[userId] = user
        } else if (apiPath.startsWith('invites/')) {
            const inviteId = apiPath.split('/')[1]
            if (!json) { continue }

            if (json.inviter) {
                const user = users[json.inviter.id] ?? { id: json.inviter.id + '' }
            
                user.avatar ??= json.inviter.avatar
                user.discriminator ??= json.inviter.discriminator
                user.globalName ??= json.inviter.global_name
                user.publicFlags ??= json.inviter.public_flags
                user.username ??= json.inviter.username

                users[json.inviter.id] = user
            }

            if (json.guild) {
                const guild = guilds[json.guild.id] ?? { id: json.guild.id + '' }
            
                guild.icon ??= json.guild.icon
                guild.name ??= json.guild.name
                guild.nsfw ??= json.guild.nsfw
                guild.nsfwLevel ??= json.guild.nsfw_level
                guild.verificationLevel ??= json.guild.verification_level
                guild.premiumSubscriptionCount ??= json.guild.premium_subscription_count
                guild.vanityUrlCode ??= json.guild.vanity_url_code

                if (json.channel) {
                    guild.channels ??= [ ]
                    if (!guild.channels.includes(json.channel.id)) {
                        guild.channels.push(json.channel.id)
                    }
                }

                guilds[json.guild.id] = guild
            }

            if (json.channel) {
                const channel = channels[json.channel.id] ?? { id: json.channel.id + '' }
            
                channel.name ??= json.channel.name
                channel.type ??= json.channel.type
                channel.guildId ??= json.guild?.id

                channels[json.channel.id] = channel
            }
        } else if (apiPath.startsWith('guilds/')) {
            const guildId = apiPath.split('/')[1]
            const guildPath = apiPath.replace('guilds' + '/' + guildId + '/', '')
            const guild = guilds[guildId] ?? { id: guildId }

            if (guildPath === 'entitlements') {
            } else if (guildPath === 'scheduled-events') {
            } else {
                debugger
            }

            guilds[guildId] = guild
        } else {
            debugger
        }
    }

    return {
        channels,
        guilds,
        users,
        assets: {
            avatars,
            guildIcons,
        }
    }
}

/**
 * @param {string} path
 */
function parse(path) {
    /** @type {{ [url: string]: { text: string; mimeType: string; encoding?: BufferEncoding; } }} */
    const result = { }
    for (const entry of getEntries(path)) {
        if (!entry.response.content.text) { continue }
        result[entry.request.url] = {
            text: entry.response.content.text,
            mimeType: entry.response.content.mimeType,
            encoding: entry.response.content.encoding,
        }
    }
    return result
}

function writeToFile() {
    const harsParsed = Path.join(__dirname, '..', 'hars-parsed')
    const entries = parse(Path.join(__dirname, '..', 'hars'))
    for (const _url in entries) {
        const url = new URL(_url)
        const data = entries[_url]
        const filePath = Path.join(harsParsed, url.hostname, '.' + url.pathname)
        if (!filePath.startsWith(harsParsed)) { continue }
        if (!data.text) { continue }
        if (data.mimeType === 'text/css') { continue }
        if (data.mimeType === 'text/html') { continue }
        if (data.mimeType === 'application/javascript') { continue }
        if (data.mimeType === 'application/wasm') { continue }
        if (data.mimeType.startsWith('font')) { continue }

        try {
            if (!fs.existsSync(Path.dirname(filePath))) { fs.mkdirSync(Path.dirname(filePath), { recursive: true }) }
            if (data.mimeType === 'application/json') {
                fs.writeFileSync(filePath + '.json', JSON.stringify(JSON.parse(data.text), null, '  '))
                continue
            }

            const encoding = data.encoding ?? 'utf8'
            const buffer = Buffer.from(data.text, encoding)

            const extension = mime.extension(data.mimeType)
            if (extension) {
                if (filePath.endsWith('.' + extension)) {
                    fs.writeFileSync(filePath, buffer)
                } else {
                    fs.writeFileSync(filePath + '.' + extension, buffer)
                }
                continue
            }

            debugger
        } catch (error) {
            continue
        }
    }
}

// load(Path.join(__dirname, '..', 'hars'))

module.exports = { load, parse }
