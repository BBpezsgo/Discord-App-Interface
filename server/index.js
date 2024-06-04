const express = require('express')
const expressHandlebars = require('express-handlebars')
const path = require('path')
const ws = require('ws')
const discordjs = require('discord.js')
const fs = require('fs')
const har = require('./har')
const _archive = require('./archive-browser')

/** @type {Handlebars.HelperDeclareSpec} */
const handlebarsHelpers = {
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
}

/**
 * @typedef {{
 * discordClient?: discordjs.Client
 * harPath?: string
 * archivePath?: string
 * } | discordjs.Client} Provider
 */

/**
 * @typedef {{
 *   client: unknown
 *   guilds: Array<import('../common/partial-api').Guild>
 *   users: Array<import('../common/partial-api').User>
 *   user: unknown
 * }} ContextBase
 */

/**
 * @typedef {ContextBase & {
 *   guild: Omit<import('../common/partial-api').Guild, 'channels'> & {
 *     channels: Array<import('../common/partial-api').Channel>
 *   }
 * }} ContextGuild
 */

/**
 * @typedef {ContextBase & {
 *   guild: Omit<import('../common/partial-api').Guild, 'channels'> & {
 *     channels: Array<import('../common/partial-api').Channel>
 *   }
 *   channel: Omit<import('../common/partial-api').Channel, 'messages'> & {
 *     messages?: Array<(import('../common/partial-api').Message & {
 *       author?: import('../common/partial-api').User | null
 *     })> | null
 *   }
 * }} ContextChannel
 */

module.exports = function (/** @type {Provider} */ provider) {
    const client = (provider instanceof discordjs.Client) ? provider : provider.discordClient ?? new discordjs.Client({ intents: 0 })
    const hars = (!(provider instanceof discordjs.Client) && provider.harPath) ? har.load(provider.harPath) : null
    const archive = (!(provider instanceof discordjs.Client) && provider.archivePath && fs.existsSync(provider.archivePath) && fs.statSync(provider.archivePath).isDirectory()) ? _archive(provider.archivePath) : null
    const staticMaxAge = undefined // 1000 * 120
    const dynamicMaxAge = 1000 * 60

    const rawHars = (!(provider instanceof discordjs.Client) && provider.harPath) ? har.parse(provider.harPath) : { }

    if (hars) {
        for (const userId in hars.users) {
            const user = hars.users[userId]
            if (user.avatar) {
                const avatarData = hars.assets.avatars[userId]?.[user.avatar]?.get()
                if (avatarData) {
                    user.avatarDataURL = `data:${avatarData.mimeType};base64,` + avatarData.buffer.toString('base64')
                }
            }
    
            user.defaultAvatarURL = `https://cdn.discordapp.com/embed/avatars/${discordjs.calculateUserDefaultAvatarIndex(userId)}.png`
        }
        
        for (const guildId in hars.guilds) {
            const guild = hars.guilds[guildId]
            if (guild.icon) {
                const iconData = hars.assets.guildIcons[guildId]?.[guild.icon]?.get()
                if (iconData) {
                    guild.iconDataURL = `data:${iconData.mimeType};base64,` + iconData.buffer.toString('base64')
                }
            }
        }

        if (archive) {
            for (const userId in archive.users) {
                const user = archive.users[userId]
                if (user.avatar) {
                    const avatarData = hars.assets.avatars[userId]?.[user.avatar]?.get()
                    if (avatarData) {
                        user.avatarDataURL = `data:${avatarData.mimeType};base64,` + avatarData.buffer.toString('base64')
                    }
                }
        
                user.defaultAvatarURL = `https://cdn.discordapp.com/embed/avatars/${discordjs.calculateUserDefaultAvatarIndex(userId)}.png`
            }
            
            for (const guildId in archive.guilds) {
                const guild = archive.guilds[guildId]
                if (guild.icon) {
                    const iconData = hars.assets.guildIcons[guildId]?.[guild.icon]?.get()
                    if (iconData) {
                        guild.iconDataURL = `data:${iconData.mimeType};base64,` + iconData.buffer.toString('base64')
                    }
                } else {
                    const iconsData = hars.assets.guildIcons[guildId]
                    if (iconsData && Object.values(iconsData).length === 1) {
                        const iconData = Object.values(iconsData)[0]?.get()
                        if (iconData) {
                            guild.iconDataURL = `data:${iconData.mimeType};base64,` + iconData.buffer.toString('base64')
                        }
                    }
                }
            }
        }
    }

    /**
     * @returns {Array<import('../common/partial-api').Guild>}
     */
    function getGuilds() {
        /** @type {Array<import('../common/partial-api').Guild>} */
        const result = [ ]

        if (archive?.guilds) {
            for (const guildId in archive.guilds) {
                const guild = archive.guilds[guildId]
                
                let otherIndex = result.findIndex(v => v.id == guildId)
                if (otherIndex !== -1) {
                    let other = result[otherIndex]
                    other = {
                        ...other,
                        ...guild,
                    }
                    result[otherIndex] = other
                } else {
                    result.push(guild)
                }
            }
        }
        
        if (hars?.guilds) {
            for (const guildId in hars.guilds) {
                const guild = hars.guilds[guildId]
                
                let otherIndex = result.findIndex(v => v.id == guildId)
                if (otherIndex !== -1) {
                    let other = result[otherIndex]
                    other = {
                        ...other,
                        ...guild,
                    }
                    result[otherIndex] = other
                } else {
                    result.push(guild)
                }
            }
        }

        for (let i = 0; i < client.guilds.cache.size; i++) {
            const guild = client.guilds.cache.at(i)
            if (!guild) { continue }
            
            let otherIndex = result.findIndex(v => v.id == guild.id)
            if (otherIndex !== -1) {
                let other = result[otherIndex]
                other = {
                    ...other,
                    ...guild,
                    channels: undefined,
                }
                result[otherIndex] = other
            } else {
                result.push({
                    ...guild,
                    channels: undefined,
                })
            }
        }

        return result
    }

    /**
     * @param {string} guildId
     */
    function getGuild(guildId) {
        /** @type {ContextGuild['guild'] | null} */
        let result = null

        const _guild3 = archive?.guilds[guildId]
        if (_guild3) {
            result ??= { id: guildId, channels: [ ] }
            result = {
                ...result,
                ..._guild3,
                channels: result.channels,
            }

            if (_guild3.channels) {
                for (const channelId of _guild3.channels) {
                    if (result.channels.find(v => v.id == channelId)) { continue }
                    const channel = getChannel(channelId)
                    if (!channel) { continue }
                    result.channels.push(channel)
                }
            }
        }

        const _guild2 = hars?.guilds[guildId]
        if (_guild2) {
            result ??= { id: guildId, channels: [ ] }
            result = {
                ...result,
                ..._guild2,
                channels: result.channels,
            }
            
            if (_guild2.channels) {
                for (const channelId of _guild2.channels) {
                    if (result.channels.find(v => v.id == channelId)) { continue }
                    const channel = getChannel(channelId)
                    if (!channel) { continue }
                    result.channels.push(channel)
                }
            }
        }

        const _guild1 = client.guilds.resolve(guildId)
        if (_guild1) {
            result ??= { id: guildId, channels: [ ] }
            result = {
                ...result,
                ..._guild1,
                channels: result.channels,
            }

            for (let i = 0; i < _guild1.channels.cache.size; i++) {
                const channel = _guild1.channels.cache.at(i)
                if (!channel) { continue }
                if (result.channels.find(v => v.id == channel.id)) { continue }
                result.channels.push({
                    ...channel,
                    messages: null,
                })
            }
        }

        if (result?.channels) {
            result.channels.sort((a, b) => {
                if (a.positionRaw && b.positionRaw) { return a.positionRaw - b.positionRaw }
                if (a.position && b.position) { return a.position - b.position }

                if (a.position && !b.position) {
                    return 1
                }
                
                if (!a.position && b.position) {
                    return -1
                }

                return 0
            })
        }

        return result
    }

    /**
     * @param {string} channelId
     */
    function getChannelMessages(channelId) {
        /** @type {ContextChannel['channel'] | null} */
        let result = null

        const _channel3 = archive?.channels[channelId]
        if (_channel3) {
            result ??= { id: channelId }
            result = {
                ...result,
                ..._channel3,
                messages: result.messages
            }

            if (_channel3.messages) {
                result.messages ??= [ ]
                for (const messageId in _channel3.messages) {
                    const message = _channel3.messages[messageId]
                    result.messages.push({
                        ...message,
                        id: message.id,
                        author: message.authorId ? getUser(message.authorId) : null,
                    })
                }
            }
        }

        const _channel2 = hars?.channels[channelId]
        if (_channel2) {
            result ??= { id: channelId }
            result = {
                ...result,
                ..._channel2,
                messages: result.messages,
            }
            
            if (_channel2.messages) {
                result.messages ??= [ ]
                for (const messageId in _channel2.messages) {
                    const message = _channel2.messages[messageId]
                    result.messages.push({
                        ...message,
                        id: message.id,
                        author: message.authorId ? getUser(message.authorId) : null,
                    })
                }
            }
        }

        const _channel1 = client.channels.resolve(channelId)
        if (_channel1) {
            result ??= { id: channelId }
            result = {
                ...result,
                ..._channel1,
                messages: result.messages,
            }
            
            if ('messages' in _channel1) {
                result.messages ??= [ ]
                for (let i = 0; i < _channel1.messages.cache.size; i++) {
                    const message = _channel1.messages.cache.at(i)
                    if (!message) { continue }
                    result.messages.push({
                        ...message,
                        id: message.id,
                        flags: message.flags.bitfield,
                        author: message.author ? {
                            ...message.author,
                            flags: message.author.flags?.bitfield,
                        } : null
                    })
                }
            }
        }

        if (result && result.messages) {
            result.messages.sort((a, b) => {
                return (a.createdTimestamp ?? 0) - (b.createdTimestamp ?? 0)
            })
        }

        return result
    }

    /**
     * @param {string} channelId
     */
    function getChannel(channelId) {
        /** @type {import('../common/partial-api').Channel | null} */
        let result = null

        const _channel3 = archive?.channels[channelId]
        if (_channel3) {
            result ??= { id: channelId }
            result = {
                ...result,
                ..._channel3,
            }
        }

        const _channel2 = hars?.channels[channelId]
        if (_channel2) {
            result ??= { id: channelId }
            result = {
                ...result,
                ..._channel2,
            }
        }

        const _channel1 = client.channels.resolve(channelId)
        if (_channel1) {
            result ??= { id: channelId }
            result = {
                ...result,
                ..._channel1,
                messages: null,
            }
        }

        return result
    }

    /**
     * @returns {Array<import('../common/partial-api').User>}
     */
    function getUsers() {
        /** @type {Array<import('../common/partial-api').User>} */
        const result = [ ]

        if (archive) {
            for (const userId in archive.users) {
                const user = archive.users[userId]
                let other = result.findIndex(v => v.id === user.id)
                if (other === -1) {
                    result.push(user)
                } else {
                    result[other] = {
                        ...result[other],
                        ...user,
                    }
                }
            }
        }

        if (hars) {
            for (const userId in hars.users) {
                const user = hars.users[userId]
                let other = result.findIndex(v => v.id === user.id)
                if (other === -1) {
                    result.push(user)
                } else {
                    result[other] = {
                        ...result[other],
                        ...user,
                    }
                }
            }
        }

        for (let i = 0; i < client.users.cache.size; i++) {
            const user = client.users.cache.at(i)
            if (!user) { continue }
            let other = result.findIndex(v => v.id === user.id)
            if (other === -1) {
                result.push({
                    ...user,
                    flags: user.flags?.bitfield,
                    dmChannel: user.dmChannel?.id,
                })
            } else {
                result[other] = {
                    ...result[other],
                    ...user,
                    flags: user.flags?.bitfield,
                    dmChannel: user.dmChannel?.id,
                }
            }
        }

        return result
    }

    /**
     * @param {string} userId
     */
    function getUser(userId) {
        /** @type {import('../common/partial-api').User | null} */
        let result = null

        const _user3 = archive?.channels[userId]
        if (_user3) {
            result ??= { id: userId }
            result = {
                ...result,
                ..._user3,
            }
        }

        const _user2 = hars?.users[userId]
        if (_user2) {
            result ??= { id: userId }
            result = {
                ...result,
                ..._user2,
            }
        }

        const _user1 = client.channels.resolve(userId)
        if (_user1) {
            result ??= { id: userId }
            result = {
                ...result,
                ..._user1,
                flags: _user1.flags?.bitfield,
            }
        }

        return result
    }

    /**
     * @param {any} json
     * @param {string} path
     * @param {any} value
     */
    function setByPath(json, path, value) {
        if (!json || !path) { return }
        const props = path.split('.')
        for (let i = 0; i < props.length; i++) {
            const prop = props[i]
            if (i === props.length - 1) {
                json[prop] = value
            } else {
                json[prop] ??= { }
                json = json[prop]
            }
        }
    }

    /**
     * @param {any} json
     * @param {string} path
     */
    function getByPath(json, path) {
        if (!json || !path) { return json }
        const props = path.split('.')
        for (const prop of props) {
            json = json?.[prop]
        }
        return json
    }

    /**
     * @param {any} json
     * @param {string} path
     */
    function extractPaths(json, path) {
        if (!json || !path) { return json }
        const result = {
            
        }

        const paths = path.split(';')
        for (const _path of paths) {
            const value = getByPath(json, _path)
            setByPath(result, _path, value)
        }

        return result
    }


    /**
     * @param {import('express-serve-static-core').Request<{ channel: string; }, any, any, qs.ParsedQs, Record<string, any>>} req
     * @returns {Promise<Buffer>}
     */
    function read(req) {
        return new Promise((resolve, reject) => {
            /** @type {Array<Uint8Array>} */
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', () => {
                const buffer = Buffer.concat(chunks)
                resolve(buffer)
            })
            req.on('error', reject)
        })
    }

    const app = express()

    app.engine('hbs', expressHandlebars.engine({
        extname: '.hbs',
        defaultLayout: 'layout',
        layoutsDir: path.join(__dirname, '..', 'client', 'layouts'),
        helpers: handlebarsHelpers,
        partialsDir: path.join(__dirname, '..', 'client', 'partials'),
        runtimeOptions: {
            allowProtoPropertiesByDefault: true,
        }
    }))
    app.set('views', path.join(__dirname, '..', 'client', 'views'))
    app.set('view engine', 'hbs')
    app.use(express.static(path.join(__dirname, '..', 'client', 'static'), { maxAge: staticMaxAge }))
    app.use(express.static(path.join(__dirname, '..', 'client', 'partials'), { maxAge: staticMaxAge }))
    app.use(express.static(path.join(path.dirname(require.resolve('handlebars')), '..', 'dist'), { maxAge: staticMaxAge, }))

    app.get('/', (req, res) => {
        if (req.query.url) {
            const uri = new URL(req.query.url + '')
            
            const rawHar = rawHars[req.query.url + '']
            if (rawHar) {
                res.status(200)
                res.set('Content-Type', rawHar.mimeType)
                res.write(rawHar.text, rawHar.encoding ?? 'utf8')
                res.end()
                return
            }

            if (hars && uri.hostname === 'cdn.discordapp.com') {
                if (uri.pathname.startsWith('/icons/')) {
                    const guildId = uri.pathname.split('/')[2]
                    const iconHash = uri.pathname.split('/')[3].replace('.webp', '')
                    if (guildId && iconHash) {
                        const asset = hars.assets.guildIcons[guildId]?.[iconHash]
                        if (asset) {
                            const sizeParam = uri.searchParams.get('size')
                            const size = sizeParam ? Number.parseInt(sizeParam) : NaN
                            const data = asset.get(Number.isNaN(size) ? null : size)
                            if (data) {
                                res.status(200)
                                res.set('Content-Type', data.mimeType)
                                res.write(data.buffer)
                                res.end()
                                return
                            }
                        }
                    }
                } else if (uri.pathname.startsWith('/avatars/')) {
                    const userId = uri.pathname.split('/')[2]
                    const iconHash = uri.pathname.split('/')[3].replace('.webp', '')
                    if (userId && iconHash) {
                        const asset = hars.assets.avatars[userId]?.[iconHash]
                        if (asset) {
                            const sizeParam = uri.searchParams.get('size')
                            const size = sizeParam ? Number.parseInt(sizeParam) : NaN
                            const data = asset.get(Number.isNaN(size) ? null : size)
                            if (data) {
                                res.status(200)
                                res.set('Content-Type', data.mimeType)
                                res.write(data.buffer)
                                res.end()
                                return
                            }
                        }
                    }
                }
            }

            res.redirect(req.query.url + '')
            return
        }

        res.redirect('/channels/@me')
    })

    app.get('/settings', (req, res) => {
        const context = {
            client: client.toJSON(),
        }

        console.log(context)
        res.status(200).render('settings', context)
        return
    })

    app.get('/channels/:guild', (req, res) => {
        const guildId = req.params.guild

        if (guildId === '@me') {
            /** @type {ContextBase} */
            const context = {
                client: client.toJSON(),
                guilds: getGuilds(),
                users: getUsers(),
                user: client.user?.toJSON(),
            }

            console.log(context)
            res.status(200).render('home', context)
            return
        }

        const guild = getGuild(guildId)

        if (!guild) {
            res.redirect('/channels/@me')
            return
        }

        /** @type {ContextGuild} */
        const context = {
            client: client.toJSON(),
            guilds: getGuilds(),
            users: getUsers(),
            user: client.user?.toJSON(),
            guild: guild,
        }

        console.log(context)
        res.status(200).render('guild', context)
    })

    app.get('/channels/:guild/:channel', (req, res) => {
        const guildId = req.params.guild
        const channel = getChannelMessages(req.params.channel)
        const guild = getGuild(guildId)

        if (guildId === '@me') {
            /** @type {ContextChannel} */
            // @ts-ignore
            const context = {
                client: client.toJSON(),
                guilds: getGuilds(),
                users: getUsers(),
                user: client.user?.toJSON(),
                channel: channel,
            }

            console.log(context)
            res.status(200).render('dm', context)
            return
        }

        if (!guild) {
            res.redirect('/channels/@me')
            return
        }

        if (!channel) {
            res.redirect('/channels/@me')
            return
        }

        /** @type {ContextChannel} */
        const context = {
            client: client.toJSON(),
            guilds: getGuilds(),
            users: getUsers(),
            user: client.user?.toJSON(),
            guild: guild,
            channel: channel,
        }

        console.log(context)
        res.status(200).render('guild', context)
    })

    app.get('/channels/:guild/:channel/messages.json', (req, res) => {
        const channel = client.channels.resolve(req.params.channel)
        if (!channel) {
            res.status(404).end()
            return
        }

        if ('messages' in channel) {
            channel.messages.fetch(req.query)
                .then(result => {
                    const messages = result.toJSON().map(message => {
                        return message.toJSON()
                    })
                    console.log(messages)
                    res.status(200).set('Max-Age', dynamicMaxAge.toString()).json(messages).end()
                })
                .catch(error => res.status(500).json(error).end())
        }
    })

    app.get('/api/users/:user.json', async (req, res) => {
        /** @type {import('../common/partial-api').User | null} */
        let result = getUser(req.params.user)

        if (!result || 'force' in req.query) {
            try {
                const fetched = await client.users.fetch(req.params.user)
                result = {
                    ...fetched,
                    avatarURL: fetched.avatarURL(),
                    defaultAvatarURL: fetched.defaultAvatarURL,
                    flags: fetched.flags?.bitfield,
                }
            } catch (error) {
                res.status(500).json(error).end()
                return
            }
        }

        if (!result) {
            res.status(404).end()
        } else {
            res.status(200).set('Max-Age', dynamicMaxAge.toString()).json(result).end()
        }
    })

    app.get('/api/channels/:channel.json', async (req, res) => {
        /** @type {import('../common/partial-api').Channel | null} */
        let result = getChannel(req.params.channel)

        if (!result || req.query['force']) {
            try {
                const fetched = await client.channels.fetch(req.params.channel)
                if (fetched) {
                    result = {
                        ...fetched,
                        messages: undefined,
                    }
                }
            } catch (error) {
                res.status(500).json(error).end()
                return
            }
        }

        if (!result) {
            res.status(404).end()
        } else {
            result = { ...result }
            result.messages = undefined
            res.status(200).set('Max-Age', dynamicMaxAge.toString()).json(result).end()
        }
    })

    app.get('/api/roles/:guild/:role.json', async (req, res) => {
        /** @type {any | null} */
        let result = null

        if (!result || req.query['force']) {
            try {
                const guild = await client.guilds.fetch(req.params.guild)
                const fetched = await guild?.roles.fetch(req.params.role)
                if (fetched) {
                    result = fetched
                }
            } catch (error) {
                res.status(500).json(error).end()
                return
            }
        }

        if (!result) {
            res.status(404).end()
        } else {
            res.status(200).set('Max-Age', dynamicMaxAge.toString()).json(result).end()
        }
    })

    app.get('/api/emojis/:emoji.json', (req, res) => {
        const emoji = client.emojis.resolve(req.params.emoji)
        if (!emoji) {
            res.status(404).end()
            return
        }
        res.status(200).set('Max-Age', dynamicMaxAge.toString()).json(emoji.toJSON()).end()
    })

    app.get('/api/client.json', (req, res) => {
        let json = {
            readyAt: client.readyAt,
            readyTimestamp: client.readyTimestamp,
            uptime: client.uptime,
            rest: {
                globalRemaining: client.rest?.globalRemaining,
                globalReset: client.rest?.globalReset,
                options: client.rest?.options,
            },
            shard: {
                count: client.shard?.count,
                ids: client.shard?.ids,
                mode: client.shard?.mode,
                parentPort: client.shard?.parentPort,
            },
            ws: {
                status: client.ws?.status,
                gateway: client.ws?.gateway,
                ping: client.ws?.ping,
                shards: client.ws?.shards.toJSON().map(v => ({
                    id: v.id,
                    lastPingTimestamp: v.lastPingTimestamp,
                    ping: v.ping,
                    status: v.status,
                })),
            },
        }
        if (req.query.path) { json = extractPaths(json, req.query.path + '') }
        res.status(200).set('Max-Age', dynamicMaxAge.toString()).json(json).end()
    })

    app.get('/api/user.json', (req, res) => {
        let json = {
            id: client.user.id,
            accentColor: client.user.accentColor,
            avatar: client.user.avatar,
            banner: client.user.banner,
            bot: client.user.bot,
            avatarDecoration: client.user.avatarDecoration,
            createdAt: client.user.createdAt,
            createdTimestamp: client.user.createdTimestamp,
            defaultAvatarURL: client.user.defaultAvatarURL,
            discriminator: client.user.discriminator,
            displayName: client.user.displayName,
            flags: client.user.flags.bitfield,
            globalName: client.user.globalName,
            hexAccentColor: client.user.hexAccentColor,
            mfaEnabled: client.user.mfaEnabled,
            presence: client.user.presence.toJSON(),
            system: client.user.system,
            tag: client.user.tag,
            username: client.user.username,
            verified: client.user.verified,
            displayAvatarURL: client.user.displayAvatarURL(),
            avatarURL: client.user.avatarURL(),
            avatarDecorationURL: client.user.avatarDecorationURL(),
        }
        if (req.query.path) { json = extractPaths(json, req.query.path + '') }
        res.status(200).set('Max-Age', dynamicMaxAge.toString()).json(json).end()
    })

    app.get('/api/application.json', (req, res) => {
        let json = {
            id: client.application.id,
            approximateGuildCount: client.application.approximateGuildCount,
            botPublic: client.application.botPublic,
            botRequireCodeGrant: client.application.botRequireCodeGrant,
            cover: client.application.cover,
            coverURL: client.application.coverURL(),
            createdAt: client.application.createdAt,
            createdTimestamp: client.application.createdTimestamp,
            customInstallURL: client.application.customInstallURL,
            description: client.application.description,
            entitlements: client.application.entitlements.cache.toJSON(),
            flags: client.application.flags,
            guildId: client.application.guildId,
            icon: client.application.icon,
            iconURL: client.application.iconURL(),
            name: client.application.name,
            owner: client.application.owner,
            interactionsEndpointURL: client.application.interactionsEndpointURL,
            roleConnectionsVerificationURL: client.application.roleConnectionsVerificationURL,
            rpcOrigins: client.application.rpcOrigins,
            tags: client.application.tags,
        }
        if (req.query.path) { json = extractPaths(json, req.query.path + '') }
        res.status(200).set('Max-Age', dynamicMaxAge.toString()).json(json).end()
    })

    app.post('/api/channels/@me/:channel/create', (req, res) => {
        client.users.createDM(req.params.channel)
            .then((channel) => res.status(200).json(channel.toJSON()).end())
            .catch((error) => res.status(500).json(error).end())
    })

    app.post('/api/channels/@me/:channel/close', (req, res) => {
        client.users.deleteDM(req.params.channel)
            .then(() => res.status(200).end())
            .catch((error) => res.status(500).json(error).end())
    })

    app.post('/api/channels/@me/:channel/send', (req, res) => {
        const channel = client.channels.cache.get(req.params.channel)
        if (!channel) {
            res.status(404)
            res.end()
            return
        }

        if (!channel.isTextBased()) {
            res.status(400)
            res.end()
            return
        }

        read(req)
            .then(buffer => {
                const body = JSON.parse(buffer.toString('utf8'))
                channel.send(body)
                    .then((/** @type {discordjs.Message} */ message) => res.status(200).json(message.toJSON()).end())
                    .catch(reason => res.status(500).json(reason).end())
            })
            .catch(console.error)
    })

    app.get('/partials.json', (req, res) => {
        const partialsDir = path.join(__dirname, '..', 'client', 'partials')
        if (!fs.existsSync(partialsDir)) {
            res.status(200).set('Max-Age', staticMaxAge?.toString()).json([]).end()
            return
        }
        if (!fs.statSync(partialsDir).isDirectory()) {
            res.status(200).set('Max-Age', staticMaxAge?.toString()).json([]).end()
            return
        }
        const partials = fs.readdirSync(partialsDir)
        res
        .status(200)
        .set('Max-Age', staticMaxAge?.toString())
        .json(
            partials.filter(partial =>
                partial.endsWith('.hbs') &&
                fs.existsSync(path.join(partialsDir, partial)) &&
                fs.statSync(path.join(partialsDir, partial)).isFile()
            )
            .map(partial => partial.substring(0, partial.length - 4))
        )
        .end()
    })

    app.get('*', (req, res) => {
        res.status(404).end()
    })

    const server = app.listen(80, '0.0.0.0', () => {
        const address = server.address()

        if (!address) {
            console.log(`[Server]: Listening`)
            return
        }

        if (typeof address === 'string') {
            console.log(`[Server]: Listening on "${address}"`)
            return
        }

        console.log(`[Server]: Listening on http://${address.address}:${address.port}`)
    })

    const wss = new ws.WebSocketServer({
        server: server,
    })

    /**
     * @template {keyof import('../client/static/scripts/ws').EventMap} T
     * @param {T} type
     * @param {import('../client/static/scripts/ws').EventMap[T]} data
     */
    function wssBroadcast(type, data) {
        wss.clients.forEach(client => client.send(JSON.stringify({ type, data }), console.error))
    }

    wss.on('listening', () => {
        const wssAddress = wss.address()
        if (typeof wssAddress === 'string') {
            console.log(`[WebSocketServer]: Listening on ${wssAddress}`)
            return
        }

        console.log(`[WebSocketServer]: Listening on ws://${wssAddress.address}:${wssAddress.port}`)
    })
    wss.on('close', () => {
        console.log('[WebSocketServer]: Closed')
    })
    wss.on('error', (error) => {
        console.error('[WebSocketServer]: Error ', error)
    })
    wss.on('connection', req => {
        console.log('[WebSocketServer]: Connection: ' + req.url)
        req.on('message', (data) => {
            console.log('[WebSocketServer]: Received: ' + data.toString('utf8'))
        })
        req.on('close', (code, reason) => {
            console.log(`[WebSocketServer]: Client "${req.url}" closed (${code})`, reason.toString('utf8'))
        })
        req.on('error', (error) => {
            console.error(`[WebSocketServer]: Client "${req.url}" error`, error)
        })
    })

    /*
    client.on(discordjs.Events.ApplicationCommandPermissionsUpdate, () => wssBroadcast('client/' + discordjs.Events.ApplicationCommandPermissionsUpdate, null))
    client.on(discordjs.Events.AutoModerationActionExecution, () => wssBroadcast('client/' + discordjs.Events.AutoModerationActionExecution, null))
    client.on(discordjs.Events.AutoModerationRuleCreate, () => wssBroadcast('client/' + discordjs.Events.AutoModerationRuleCreate, null))
    client.on(discordjs.Events.AutoModerationRuleDelete, () => wssBroadcast('client/' + discordjs.Events.AutoModerationRuleDelete, null))
    client.on(discordjs.Events.AutoModerationRuleUpdate, () => wssBroadcast('client/' + discordjs.Events.AutoModerationRuleUpdate, null))
    client.on(discordjs.Events.EntitlementCreate, () => wssBroadcast('client/' + discordjs.Events.EntitlementCreate, null))
    client.on(discordjs.Events.EntitlementDelete, () => wssBroadcast('client/' + discordjs.Events.EntitlementDelete, null))
    client.on(discordjs.Events.EntitlementUpdate, () => wssBroadcast('client/' + discordjs.Events.EntitlementUpdate, null))
    client.on(discordjs.Events.GuildAuditLogEntryCreate, () => wssBroadcast('client/' + discordjs.Events.GuildAuditLogEntryCreate, null))
    client.on(discordjs.Events.GuildAvailable, () => wssBroadcast('client/' + discordjs.Events.GuildAvailable, null))
    client.on(discordjs.Events.GuildCreate, () => wssBroadcast('client/' + discordjs.Events.GuildCreate, null))
    client.on(discordjs.Events.GuildDelete, () => wssBroadcast('client/' + discordjs.Events.GuildDelete, null))
    client.on(discordjs.Events.GuildUpdate, () => wssBroadcast('client/' + discordjs.Events.GuildUpdate, null))
    client.on(discordjs.Events.GuildUnavailable, () => wssBroadcast('client/' + discordjs.Events.GuildUnavailable, null))
    client.on(discordjs.Events.GuildMemberAdd, () => wssBroadcast('client/' + discordjs.Events.GuildMemberAdd, null))
    client.on(discordjs.Events.GuildMemberRemove, () => wssBroadcast('client/' + discordjs.Events.GuildMemberRemove, null))
    client.on(discordjs.Events.GuildMemberUpdate, () => wssBroadcast('client/' + discordjs.Events.GuildMemberUpdate, null))
    client.on(discordjs.Events.GuildMemberAvailable, () => wssBroadcast('client/' + discordjs.Events.GuildMemberAvailable, null))
    client.on(discordjs.Events.GuildMembersChunk, () => wssBroadcast('client/' + discordjs.Events.GuildMembersChunk, null))
    client.on(discordjs.Events.GuildIntegrationsUpdate, () => wssBroadcast('client/' + discordjs.Events.GuildIntegrationsUpdate, null))
    client.on(discordjs.Events.GuildRoleCreate, () => wssBroadcast('client/' + discordjs.Events.GuildRoleCreate, null))
    client.on(discordjs.Events.GuildRoleDelete, () => wssBroadcast('client/' + discordjs.Events.GuildRoleDelete, null))
    client.on(discordjs.Events.InviteCreate, () => wssBroadcast('client/' + discordjs.Events.InviteCreate, null))
    client.on(discordjs.Events.InviteDelete, () => wssBroadcast('client/' + discordjs.Events.InviteDelete, null))
    client.on(discordjs.Events.GuildRoleUpdate, () => wssBroadcast('client/' + discordjs.Events.GuildRoleUpdate, null))
    client.on(discordjs.Events.GuildEmojiCreate, () => wssBroadcast('client/' + discordjs.Events.GuildEmojiCreate, null))
    client.on(discordjs.Events.GuildEmojiDelete, () => wssBroadcast('client/' + discordjs.Events.GuildEmojiDelete, null))
    client.on(discordjs.Events.GuildEmojiUpdate, () => wssBroadcast('client/' + discordjs.Events.GuildEmojiUpdate, null))
    client.on(discordjs.Events.GuildBanAdd, () => wssBroadcast('client/' + discordjs.Events.GuildBanAdd, null))
    client.on(discordjs.Events.GuildBanRemove, () => wssBroadcast('client/' + discordjs.Events.GuildBanRemove, null))
    client.on(discordjs.Events.ChannelCreate, () => wssBroadcast('client/' + discordjs.Events.ChannelCreate, null))
    client.on(discordjs.Events.ChannelDelete, () => wssBroadcast('client/' + discordjs.Events.ChannelDelete, null))
    client.on(discordjs.Events.ChannelUpdate, () => wssBroadcast('client/' + discordjs.Events.ChannelUpdate, null))
    client.on(discordjs.Events.ChannelPinsUpdate, () => wssBroadcast('client/' + discordjs.Events.ChannelPinsUpdate, null))
    client.on(discordjs.Events.MessageCreate, () => wssBroadcast('client/' + discordjs.Events.MessageCreate, null))
    client.on(discordjs.Events.MessageDelete, () => wssBroadcast('client/' + discordjs.Events.MessageDelete, null))
    client.on(discordjs.Events.MessageUpdate, () => wssBroadcast('client/' + discordjs.Events.MessageUpdate, null))
    client.on(discordjs.Events.MessageBulkDelete, () => wssBroadcast('client/' + discordjs.Events.MessageBulkDelete, null))
    client.on(discordjs.Events.MessagePollVoteAdd, () => wssBroadcast('client/' + discordjs.Events.MessagePollVoteAdd, null))
    client.on(discordjs.Events.MessagePollVoteRemove, () => wssBroadcast('client/' + discordjs.Events.MessagePollVoteRemove, null))
    client.on(discordjs.Events.MessageReactionAdd, () => wssBroadcast('client/' + discordjs.Events.MessageReactionAdd, null))
    client.on(discordjs.Events.MessageReactionRemove, () => wssBroadcast('client/' + discordjs.Events.MessageReactionRemove, null))
    client.on(discordjs.Events.MessageReactionRemoveAll, () => wssBroadcast('client/' + discordjs.Events.MessageReactionRemoveAll, null))
    client.on(discordjs.Events.MessageReactionRemoveEmoji, () => wssBroadcast('client/' + discordjs.Events.MessageReactionRemoveEmoji, null))
    client.on(discordjs.Events.ThreadCreate, () => wssBroadcast('client/' + discordjs.Events.ThreadCreate, null))
    client.on(discordjs.Events.ThreadDelete, () => wssBroadcast('client/' + discordjs.Events.ThreadDelete, null))
    client.on(discordjs.Events.ThreadUpdate, () => wssBroadcast('client/' + discordjs.Events.ThreadUpdate, null))
    client.on(discordjs.Events.ThreadListSync, () => wssBroadcast('client/' + discordjs.Events.ThreadListSync, null))
    client.on(discordjs.Events.ThreadMemberUpdate, () => wssBroadcast('client/' + discordjs.Events.ThreadMemberUpdate, null))
    client.on(discordjs.Events.ThreadMembersUpdate, () => wssBroadcast('client/' + discordjs.Events.ThreadMembersUpdate, null))
    client.on(discordjs.Events.UserUpdate, () => wssBroadcast('client/' + discordjs.Events.UserUpdate, null))
    client.on(discordjs.Events.PresenceUpdate, () => wssBroadcast('client/' + discordjs.Events.PresenceUpdate, null))
    client.on(discordjs.Events.VoiceServerUpdate, () => wssBroadcast('client/' + discordjs.Events.VoiceServerUpdate, null))
    client.on(discordjs.Events.VoiceStateUpdate, () => wssBroadcast('client/' + discordjs.Events.VoiceStateUpdate, null))
    client.on(discordjs.Events.TypingStart, () => wssBroadcast('client/' + discordjs.Events.TypingStart, null))
    client.on(discordjs.Events.WebhooksUpdate, () => wssBroadcast('client/' + discordjs.Events.WebhooksUpdate, null))
    client.on(discordjs.Events.InteractionCreate, () => wssBroadcast('client/' + discordjs.Events.InteractionCreate, null))
    client.on(discordjs.Events.Debug, () => wssBroadcast('client/' + discordjs.Events.Debug, null))
    client.on(discordjs.Events.CacheSweep, () => wssBroadcast('client/' + discordjs.Events.CacheSweep, null))
    client.on(discordjs.Events.ShardDisconnect, () => wssBroadcast('client/' + discordjs.Events.ShardDisconnect, null))
    client.on(discordjs.Events.ShardError, () => wssBroadcast('client/' + discordjs.Events.ShardError, null))
    client.on(discordjs.Events.ShardReconnecting, () => wssBroadcast('client/' + discordjs.Events.ShardReconnecting, null))
    client.on(discordjs.Events.ShardReady, () => wssBroadcast('client/' + discordjs.Events.ShardReady, null))
    client.on(discordjs.Events.ShardResume, () => wssBroadcast('client/' + discordjs.Events.ShardResume, null))
    client.on(discordjs.Events.Raw, () => wssBroadcast('client/' + discordjs.Events.Raw, null))
    client.on(discordjs.Events.StageInstanceCreate, () => wssBroadcast('client/' + discordjs.Events.StageInstanceCreate, null))
    client.on(discordjs.Events.StageInstanceUpdate, () => wssBroadcast('client/' + discordjs.Events.StageInstanceUpdate, null))
    client.on(discordjs.Events.StageInstanceDelete, () => wssBroadcast('client/' + discordjs.Events.StageInstanceDelete, null))
    client.on(discordjs.Events.GuildStickerCreate, () => wssBroadcast('client/' + discordjs.Events.GuildStickerCreate, null))
    client.on(discordjs.Events.GuildStickerDelete, () => wssBroadcast('client/' + discordjs.Events.GuildStickerDelete, null))
    client.on(discordjs.Events.GuildStickerUpdate, () => wssBroadcast('client/' + discordjs.Events.GuildStickerUpdate, null))
    client.on(discordjs.Events.GuildScheduledEventCreate, () => wssBroadcast('client/' + discordjs.Events.GuildScheduledEventCreate, null))
    client.on(discordjs.Events.GuildScheduledEventUpdate, () => wssBroadcast('client/' + discordjs.Events.GuildScheduledEventUpdate, null))
    client.on(discordjs.Events.GuildScheduledEventDelete, () => wssBroadcast('client/' + discordjs.Events.GuildScheduledEventDelete, null))
    client.on(discordjs.Events.GuildScheduledEventUserAdd, () => wssBroadcast('client/' + discordjs.Events.GuildScheduledEventUserAdd, null))
    client.on(discordjs.Events.GuildScheduledEventUserRemove, () => wssBroadcast('client/' + discordjs.Events.GuildScheduledEventUserRemove, null))
    */

    client.on(discordjs.Events.Error, (error) => wssBroadcast(`client/error`, { error }))
    client.on(discordjs.Events.Warn, (warning) => wssBroadcast('client/warn', { warning }))
    client.on(discordjs.Events.Invalidated, () => wssBroadcast('client/invalidated', null))
    client.on(discordjs.Events.ClientReady, () => wssBroadcast('client/ready', null))

    client.ws.on(discordjs.GatewayDispatchEvents.Ready, (data, shardId) => wssBroadcast('ws/ready', { data, shardId }))
    client.ws.on(discordjs.GatewayDispatchEvents.Resumed, (data, shardId) => wssBroadcast('ws/resumed', { data, shardId }))

    client.rest.on('response', (req, res) => {
        console.log(`[REST]: ${req.route}`)
    })
}
