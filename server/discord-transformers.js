const discordjs = require('discord.js')

/**
 * @template {string | number | symbol} TKey1
 * @template TValue1
 * @template {string | number | symbol} TKey2
 * @template TValue2
 * 
 * @param {discordjs.Collection<TKey1, TValue1>} map
 * @param {(key: TKey1) => TKey2} mapKey
 * @param {(value: TValue1) => TValue2} mapValue
 * 
 * @returns {{ [key in TKey2]: TValue2 }}
 */
function transformMap(map, mapValue, mapKey) {
    /** @ts-ignore @type {{ [key in TKey2]: TValue2 }} */
    const result = { }
    map.forEach((value, key) => { result[mapKey(key)] = mapValue(value) })
    return result
}

/**
 * @param {discordjs.Message} message
 * @returns {import('../common/partial-api').Message}
 */
function transformMessage(message) {
    return {
        id: message.id,
        authorId: message.author.id,
        channelId: message.channelId,
        content: message.content,
        createdTimestamp: message.createdTimestamp,
        editedTimestamp: message.editedTimestamp,
        embeds: message.embeds,
        flags: message.flags.bitfield,
        pinned: message.pinned,
        tts: message.tts,
        type: message.type,
        attachments: message.attachments.toJSON(),
        deletable: message.deletable,
        bulkDeletable: message.bulkDeletable,
        editable: message.editable,
        pinnable: message.pinnable,
        reactions: message.reactions.cache.toJSON().map(transformReaction),
        system: message.system,
        url: message.url,
        // @ts-ignore
        author: message.author ? {
            ...message.author,
            flags: message.author.flags?.bitfield,
        } : null,
    }
}

/**
 * @param {discordjs.MessageReaction} reaction
 * @returns {import('../common/partial-api').MessageReaction}
 */
function transformReaction(reaction) {
    return {
        count: reaction.count,
        name: reaction.emoji.name,
        me: reaction.me,
        imageURL: reaction.emoji.imageURL({ size: 16 }),
        users: reaction.users.cache.toJSON().map(transformUser),
    }
}

/**
 * @param {discordjs.Channel} channel
 * @returns {import('../common/partial-api').Channel}
 */
function transformChannel(channel) {
    /** @type {import('../common/partial-api').Channel} */
    const result = {
        id: channel.id,
        type: channel.type,
    }

    if ('name' in channel) { result.name ??= channel.name }
    if ('guildId' in channel) { result.guildId ??= channel.guildId }
    if ('parentId' in channel) { result.parentId ??= channel.parentId }
    if ('topic' in channel) { result.topic ??= channel.topic }
    if ('nsfw' in channel) { result.nsfw ??= channel.nsfw }
    if ('position' in channel) { result.position ??= channel.position }
    if ('rawPosition' in channel) { result.positionRaw ??= channel.rawPosition }
    if ('rateLimitPerUser' in channel) { result.rateLimitPerUser ??= channel.rateLimitPerUser }
    if ('messages' in channel) { result.messages ??= transformMap(channel.messages.cache, transformMessage, v => v) }

    return result
}

/**
 * @param {discordjs.User} user
 * @returns {import('../common/partial-api').User}
 */
function transformUser(user) {
    return {
        id: user.id,
        accentColor: user.accentColor,
        avatar: user.avatar,
        avatarDataURL: null,
        avatarURL: user.avatarURL(),
        bannerColor: null,
        bio: null,
        defaultAvatarURL: user.defaultAvatarURL,
        discriminator: user.discriminator,
        dmChannel: user.dmChannel?.id,
        flags: user.flags?.bitfield,
        globalName: user.globalName,
        legacyUsername: null,
        pronouns: null,
        publicFlags: null,
        username: user.username,
        bot: user.bot,
        system: user.system,
    }
}

/**
 * @param {discordjs.Guild} guild
 * @returns {import('../common/partial-api').Guild}
 */
function transformGuild(guild) {
    return {
        id: guild.id,
        channels: null,
        icon: guild.icon,
        iconDataURL: null,
        iconURL: guild.iconURL(),
        name: guild.name,
        nsfw: guild.nsfwLevel > 0,
        nsfwLevel: guild.nsfwLevel,
        ownerId: guild.ownerId,
        premiumSubscriptionCount: guild.premiumSubscriptionCount,
        vanityUrlCode: guild.vanityURLCode,
        verificationLevel: guild.verificationLevel,
        afkChannelId: guild.afkChannelId,
        afkTimeout: guild.afkTimeout,
        available: guild.available,
        createdTimestamp: guild.createdTimestamp,
        joinedTimestamp: guild.joinedTimestamp,
        large: guild.large,
        mfaLevel: guild.mfaLevel,
        nameAcronym: guild.nameAcronym,
    }
}

module.exports = {
    transformMessage,
    transformChannel,
    transformUser,
    transformGuild,
    transformReaction,
}
