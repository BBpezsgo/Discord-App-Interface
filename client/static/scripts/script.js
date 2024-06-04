/// <reference path="./global.d.ts" />

wsc.addEventListener('client/ready', e => {
    console.log(`[Discord]: Ready`)
    document.getElementById('app-status').textContent = 'Ready'
})

wsc.addEventListener('client/error', e => {
    console.error(`[Discord]:`, e.detail.error)
})

wsc.addEventListener('client/warn', e => {
    console.warn(`[Discord]:`, e.detail.warning)
})

wsc.addEventListener('client/invalidated', e => {
    console.warn(`[Discord]: Invalidated`)
    document.getElementById('app-status').textContent = 'Invalidated'
})

wsc.addEventListener('ws/ready', e => {
    console.warn(`[Discord/WS]: Ready`, e.detail)
})

wsc.addEventListener('ws/resumed', e => {
    console.warn(`[Discord/WS]: Resumed`, e.detail)
})

function hideUserPopup() {
    const element = UI.get('user-popout')

    element.style.display = 'none'

    const eBanner = UI.get('user-popup-banner-color')
    const eAvatar = UI.get('user-popup-avatar', 'img')
    const eDisplayName = UI.get('user-popup-display-name')
    const eUsername = UI.get('user-popup-username')
    const eDiscriminator = UI.get('user-popup-discriminator')
    const eBio = UI.get('user-popout-bio')

    eBanner.style.backgroundColor = `var(--brand-500)`
    element.style.top = ``
    element.style.left = ``
    eAvatar.src = ''
    eDisplayName.textContent = ''
    eUsername.textContent = ''
    eDiscriminator.textContent = ''
    element.setAttribute('data-user-id', '')
    UI.get('user-popup-fetch-error').textContent = ''
    // @ts-ignore
    UI.get('user-popup-fetch-button').disabled = false
    eBio.textContent = ''
    eBio.parentElement.style.display = 'block'
}

/**
 * @param {MouseEvent} e
 */
function __onClick(e) {
    const element = UI.get('user-popout')
    const rect = element.getBoundingClientRect()
    if (e.clientX >= rect.left && e.clientY >= rect.top && e.clientX <= rect.right && e.clientY <= rect.bottom) {
        return
    }
    hideUserPopup()
}

/**
 * @param {string} userId
 * @param {PointerEvent | null} e
 */
async function userPopup(userId, e = null) {
    const element = UI.get('user-popout')

    if (element.getAttribute('data-user-id') === userId) {
        return
    }

    document.body.removeEventListener('click', __onClick)

    hideUserPopup()

    const eBanner = UI.get('user-popup-banner-color')
    const eAvatar = UI.get('user-popup-avatar', 'img')
    const eDisplayName = UI.get('user-popup-display-name')
    const eUsername = UI.get('user-popup-username')
    const eDiscriminator = UI.get('user-popup-discriminator')
    const eBio = UI.get('user-popout-bio')

    const user = await getUser(userId)
    if (!user) { return }

    setTimeout(() => document.body.addEventListener('click', __onClick), 0)

    if (e) {
        element.style.left = `${e.clientX + 10}px`
        element.style.top = `${e.clientY - 10}px`
    }

    element.style.display = 'flex'
    element.setAttribute('data-user-id', user.id)

    if (user.bannerColor) {
        eBanner.style.backgroundColor = `${user.bannerColor}`
    }
    
    if (user.globalName) {
        eDisplayName.textContent = user.globalName
    }
    
    if (user.username) {
        eUsername.textContent = user.username
    }
    
    if (user.avatarDataURL) {
        eAvatar.src = user.avatarDataURL
    } else if (user.avatar) {
        eAvatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=80`
    } else if (user.defaultAvatarURL) {
        eAvatar.src = user.defaultAvatarURL
    }
    
    if (user.discriminator && user.discriminator !== '0') {
        eDiscriminator.textContent = `#${user.discriminator}`
    }

    if (user.bio) {
        eBio.textContent = user.bio
    } else {
        eBio.parentElement.style.display = 'none'
    }
    
    if (e) {
        const rect = element.getBoundingClientRect()
        const bodyRect = document.body.getBoundingClientRect()

        let x = e.clientX + 10
        let y = e.clientY - rect.height - 10

        if (rect.right > bodyRect.right) {
            x = bodyRect.right - rect.width - 20
        }

        if (rect.top - rect.height < 0) {
            y = 20
        }

        element.style.left = `${x}px`
        element.style.top = `${y}px`
    }
}
