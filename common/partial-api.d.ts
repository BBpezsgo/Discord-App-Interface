import * as discordjs from 'discord.js'

export type Guild = {
    id: string
    
    name?: string | null
    icon?: string | null
    ownerId?: string | null
    iconURL?: string | null
    iconDataURL?: string | null
    channels?: Array<string>
    nsfw?: boolean | null
    nsfwLevel?: number | null
    verificationLevel?: number | null
    premiumSubscriptionCount?: number | null
    vanityUrlCode?: string | null
}

export type Channel = {
    id: string

    name?: string | null
    guildId?: string | null
    lastMessageId?: string | null
    rateLimitPerUser?: number | null
    type?: number | null
    parentId?: string | null
    topic?: string | null
    nsfw?: boolean | null
    positionRaw?: number | null
    position?: number | null
    messages?: { [key: string]: Message } | null
}

export type User = {
    id: string

    avatar?: string | null
    flags?: number | null
    username?: string | null
    globalName?: string | null
    pronouns?: string | null
    avatarURL?: string | null
    avatarDataURL?: string | null
    accentColor?: unknown | null
    bannerColor?: unknown | null
    bio?: string | null
    discriminator?: string | null
    publicFlags?: number | null
    legacyUsername?: string | null
    defaultAvatarURL?: string | null
    dmChannel?: string | null
}

export type Message = {
    id: string

    channelId?: string | null
    content?: string | null
    createdTimestamp?: number | null
    editedTimestamp?: number | null
    authorId?: string | null
    flags?: number | null
    pinned?: boolean | null
    tts?: boolean | null
    type?: number | null
    embeds?: Array<Embed> | null
}

export type Embed = {
    description?: string | null
    type?: string | null
    url?: string | null
    title?: string | null
    thumbnail?: {
        width?: number | null
        height?: number | null,
        url?: string | null
        proxyUrl?: string | null
    } | null
    provider?: {
        name?: string | null
    } | null
    video?: {
        width?: number | null
        height?: number | null
        url?: string | null
        proxyUrl?: string | null
    } | null
}
