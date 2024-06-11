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
    afkChannelId?: string | null
    afkTimeout?: number | null
    available?: boolean | null
    createdTimestamp?: number | null
    joinedTimestamp?: number | null
    large?: boolean | null
    mfaLevel?: number | null
    nameAcronym?: string | null
}

export type Channel = {
    id: string

    name?: string | null
    guildId?: string | null
    rateLimitPerUser?: number | null
    type?: number | null
    parentId?: string | null
    topic?: string | null
    nsfw?: boolean | null
    positionRaw?: number | null
    position?: number | null
    messages?: { [key: string]: Message } | null
    members?: User[]
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
    bot?: boolean | null
    system?: boolean | null
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
    attachments?: Array<MessageAttachment> | null
    deletable?: boolean | null
    bulkDeletable?: boolean | null
    editable?: boolean | null
    pinnable?: boolean | null
    reactions?: Array<MessageReaction> | null
    system?: boolean | null
    url?: string | null
}

export type MessageAttachment = {
    
}

export type MessageReaction = {
    count?: number | null
    name?: string | null
    imageURL?: string | null
    me?: boolean | null
    users?: Array<User> | null
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
