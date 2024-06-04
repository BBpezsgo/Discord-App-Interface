/// <reference path="./global.d.ts" />

let shouldMakeReadable = true

async function makeReadable() {
    const elements = document.querySelectorAll('*[data-parse]')
    if (elements.length === 0) {
        shouldMakeReadable = false
        return
    }

    for (let i = 0; i < elements.length; i++) {
        const element = elements.item(i)
        const dataType = element.attributes.getNamedItem('data-parse')?.value
        let shouldExit = false

        switch (dataType) {
            case 'timestamp': {
                const dataValue = element.textContent.trim()
                const date = new Date(Number.parseInt(dataValue))
                element.textContent = `${date.getFullYear()}. ${(date.getMonth()+1).toString().padStart(2, '0')}. ${date.getDate().toString().padStart(2, '0')}. ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
                break
            }
            case 'message-content': {
                const dataValue = element.textContent.trim()
                const yeah = parseMessageContent(dataValue)
                const html = await template('/message-content.hbs', yeah)
                let scroll = false
                if (element.parentElement.scrollTop + 20 > element.parentElement.scrollHeight) {
                    scroll = true
                }
                element.innerHTML = html
                shouldMakeReadable = true
                if (scroll) {
                    element.parentElement.scrollTo(0, element.parentElement.scrollHeight)
                }
                break
            }
            case 'user-mention': {
                const dataValue = element.textContent.trim()
                const user = await getUser(dataValue)
                if (user) {
                    element.textContent = `@${user.globalName ?? user.username ?? user.legacyUsername}`
                }
                shouldExit = true
                break
            }
            case 'role-mention': {
                const dataValue = element.textContent.trim()
                // @ts-ignore
                const role = await getRole(guildId, dataValue)
                if (role) {
                    element.textContent = `@${role.name}`
                }
                shouldExit = true
                break
            }
            case 'channel-mention': {
                const dataValue = element.textContent.trim()
                const channel = await getChannel(dataValue)
                if (channel) {
                    element.textContent = `#${channel.name}`
                }
                // @ts-ignore
                element.setAttribute('href', `/channels/${guildId}/${dataValue}`)
                shouldExit = true
                break
            }
            case 'emoji':
                let emojiId = element.attributes.getNamedItem('src').value
                emojiId = emojiId.replace('<', '')
                emojiId = emojiId.replace('>', '')
                const isAnim = emojiId.startsWith('a:')
                emojiId = emojiId.split(':')[emojiId.split(':').length - 1]
                if (isAnim) {
                    element.attributes.getNamedItem('src').value = `https://cdn.discordapp.com/emojis/${emojiId}.gif?size=16`
                } else {
                    element.attributes.getNamedItem('src').value = `https://cdn.discordapp.com/emojis/${emojiId}.png?size=16`
                }
                break
            default:
                console.warn(`Invalid data type "${dataType}"`, element)
                break
        }
        
        element.attributes.removeNamedItem('data-parse')
        if (shouldExit || i > 20) { break }
    }
}

document.addEventListener('DOMContentLoaded', () => { shouldMakeReadable = true })

setInterval(async () => {
    if (shouldMakeReadable) {
        await makeReadable()
    }
}, 300)
