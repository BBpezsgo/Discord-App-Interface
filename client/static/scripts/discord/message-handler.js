/// <reference path="../global.d.ts" />

/**
 * @param {any} message
 */
async function addMessage(message) {
    const existing = document.querySelector(`*[data-message="${message.id}"]`)
    if (existing) { return }
    const newElement = await templateDOM('/message.hbs', message)
    const container = document.getElementById(`guild-main`)
    for (let i = 0; i < container.children.length; i++) {
        const element = container.children.item(i)
        if (!element.hasAttribute('data-message')) { continue }
        const timestamp = Number.parseInt(element.getAttribute('data-timestamp'))
        if (Number.isNaN(timestamp)) { continue }
        if (timestamp <= message.createdTimestamp) {
            container.insertBefore(newElement, element)
            return
        }
    }
    container.appendChild(newElement)
    shouldMakeReadable = true
}

// @ts-ignore
// fetch(`/channels/${guildId}/${channelId}/messages.json?limit=1`)
//     .then(async res => {
//         if (!res.ok) { return }
//         const messages = await res.json()
//         for (const message of messages) {
//             await addMessage(message)
//         }
//     })
//     .catch(console.error)
