const fs = require('fs')
const path = require('path')
const discordjs = require('discord.js')

module.exports = function(/** @type {string} */ archivePath) {
    /**
     * @param {Array<string>} filePath
     */
    function json(...filePath) {
        const _path = path.join(archivePath, ...filePath)
        if (!fs.existsSync(_path)) { return null }
        if (!fs.statSync(_path).isFile()) { return null }
        try {
            return JSON.parse(fs.readFileSync(_path, 'utf8'))
        } catch (error) {
            return null
        }
    }
    
    /**
     * @param {Array<string>} filePath
     */
    function csv(...filePath) {
        const _path = path.join(archivePath, ...filePath)
        if (!fs.existsSync(_path)) { return null }
        if (!fs.statSync(_path).isFile()) { return null }
        try {
            /** @type {Array<Array<string>>} */
            const result = [ ]
            const text = fs.readFileSync(_path, 'utf8')
            const headerLength = text.indexOf('\n') + 1
            let currentRow = [ ]
            let currentCol = ''
            let inString = false
            for (let i = headerLength; i < text.length; i++) {
                const c = text[i]
                if (c === '"') {
                    inString = !inString
                    continue
                }
                if (inString) {
                    currentCol += c
                    continue
                }
                if (c === ',') {
                    currentRow.push(currentCol)
                    currentCol = ''
                    continue
                }
                if (c === '\n') {
                    currentRow.push(currentCol)
                    result.push(currentRow)
                    currentRow = []
                    currentCol = ''
                    continue
                }
                currentCol += c
            }

            if (currentCol.trim().length > 0) {
                currentRow.push(currentCol)
            }

            if (currentRow.length > 0) {
                result.push(currentRow)
            }

            return result
        } catch (error) {
            return null
        }
    }
    
    /**
     * @param {Array<string>} filePath
     */
    function pngUrl(...filePath) {
        const _path = path.join(archivePath, ...filePath)
        if (!fs.existsSync(_path)) { return null }
        if (!fs.statSync(_path).isFile()) { return null }
        return `data:image/png;base64,` + Buffer.from(fs.readFileSync(_path)).toString('base64')
    }
    
    /** @type {{ [key: string]: import('../common/partial-api').Guild }} */
    const guilds = { }
    /** @type {{ [key: string]: import('../common/partial-api').Channel }} */
    const channels = { }
    /** @type {{ [key: string]: import('../common/partial-api').User }} */
    const users = { }

    const guildsIndex = json('servers', 'index.json')
    for (const key in guildsIndex) {
        guilds[key] = {
            id: key,
            name: guildsIndex[key],
        }
    }

    const guildFolders = fs.readdirSync(path.join(archivePath, 'servers'))
    for (const key of guildFolders) {
        if (!fs.statSync(path.join(archivePath, 'servers', key)).isDirectory()) { continue }
        if (Number.isNaN(Number.parseInt(key))) { continue }
        const guildData = json('servers', key, 'guild.json')
        let guild = guilds[key] ?? { id: key }

        guild.name ??= guildData.name
        guild.icon ??= guildData.icon_hash
        guild.ownerId ??= guildData.owner_id
        guild.iconDataURL ??= pngUrl('servers', key, 'icon.png')

        if (guildData.owner_id && !users[guildData.owner_id]) {
            users[guildData.owner_id] = { id: guildData.owner_id }
        }

        const channelsData = json('servers', key, 'channels.json')

        if (channelsData) {
            for (const channelData of channelsData) {
                let channel = channels[channelData.id] ?? { id: channelData.id + '' }

                channel.position ??= channelData.position
                channel.positionRaw ??= channelData.position
                channel.nsfw ??= channelData.nsfw
                channel.type ??= channelData.type
                channel.topic ??= channelData.topic
                channel.parentId ??= channelData.parent_id
                channel.guildId ??= key
                channel.lastMessageId ??= channelData.last_message_id
                channel.rateLimitPerUser ??= channelData.rate_limit_per_user
                channel.name ??= channelData.name

                guild.channels ??= [ ]
                if (!guild.channels.includes(channelData.id)) { guild.channels.push(channelData.id) }

                channel[channelData.id] = channel
            }
        }

        guilds[key] = guild
    }

    const accountUserData = json('account', 'user.json')
    if (accountUserData) {
        let user = users[accountUserData.id] ?? { id: accountUserData.id + '' }

        user.avatar ??= accountUserData.avatar_hash
        user.flags ??= accountUserData.flags
        user.username ??= accountUserData.username
        user.avatarDataURL ??= pngUrl('account', 'avatar.png')

        if (accountUserData.relationships) {
            for (const relationship of accountUserData.relationships) {
                let user2 = users[relationship.user.id] ?? { id: relationship.user.id + '' }

                user2.avatar ??= relationship.user.avatar
                user2.flags ??= relationship.user.public_flags
                user2.username ??= relationship.user.username
                
                users[relationship.user.id] = user2
            }
        }

        users[accountUserData.id] = user
    }

    const messagesIndex = json('messages', 'index.json')
    for (const key in messagesIndex) {
        let channel = channels[key] ?? { id: key }

        channel.name ??= messagesIndex[key]

        channels[key] = channel
    }

    const messagesFolders = fs.readdirSync(path.join(archivePath, 'messages'))
    for (const key of messagesFolders) {
        if (!fs.statSync(path.join(archivePath, 'messages', key)).isDirectory()) { continue }
        if (Number.isNaN(Number.parseInt(key))) { continue }
        let channel = channels[key] ?? { id: key }

        const channelData = json('messages', key, 'channel.json')
        if (channelData) {
            channel.name ??= channelData.name
            channel.type ??= channelData.type

            if (channelData.guild) {
                channel.guildId ??= channelData.guild.id
            
                let guild = guilds[channelData.guild.id] ?? { id: channelData.guild.id + '' }
                
                guild.name ??= channelData.guild.name
                guild.channels ??= [ ]
                if (!guild.channels.includes(channelData.id)) { guild.channels.push(channelData.id) }

                guilds[channelData.guild.id] = guild
            }

            if (channelData.recipients) {
                for (const recipient of channelData.recipients) {
                    users[recipient] ??= { id: recipient }
                }
            }
        }

        const messagesData = csv('messages', key, 'messages.csv')

        if (messagesData) {
            channel.messages ??= { }
            for (const messageData of messagesData) {
                const messageId = messageData[0]
                const messageDate = messageData[1]
                const messageContent = messageData[2]
                const attachmentUrl = messageData[3].trim()

                let message = channel.messages[messageId] ?? { id: messageId }

                message.content ??= messageContent
                message.createdTimestamp ??= Date.parse(messageDate)
                message.authorId ??= accountUserData.id
                message.channelId ??= key

                if (attachmentUrl) {
                    
                }

                channel.messages[messageId] = message
            }
        }

        channels[key] = channel
    }
    
    for (const userId in users) {
        users[userId].defaultAvatarURL = `https://cdn.discordapp.com/embed/avatars/${discordjs.calculateUserDefaultAvatarIndex(userId)}.png`
    }

    return { users, guilds, channels }
}
