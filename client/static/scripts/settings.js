document.addEventListener('DOMContentLoaded', () => {
    const buttons = {
        'account': UI.get('settings-account'),
        'client': UI.get('settings-client'),
        'application': UI.get('settings-application'),
    }
    const content = UI.get('content')

    let refreshInterval

    buttons['account'].addEventListener('click', async e => {
        if (refreshInterval) clearInterval(refreshInterval)
        template('/settings/account.hbs', getClientUser())
            .then(html => {
                content.innerHTML = html
            })
            .catch(console.error)
    })

    buttons['client'].addEventListener('click', async e => {
        if (refreshInterval) clearInterval(refreshInterval)
        template('/settings/client.hbs', getClient())
            .then(html => {
                content.innerHTML = html
                refreshInterval = setInterval(async () => {
                    const json = await getClient('ws.ping;ws.status;uptime')
                    UI.get('client-ping').textContent = json?.ws?.ping + ''
                    UI.get('client-status').textContent = json?.ws?.status + ''
                    UI.get('client-uptime').textContent = json?.uptime + ''
                }, 5000)
            })
            .catch(console.error)
    })

    buttons['application'].addEventListener('click', async e => {
        if (refreshInterval) clearInterval(refreshInterval)
        template('/settings/application.hbs', getApplication())
            .then(html => {
                content.innerHTML = html
            })
            .catch(console.error)
    })

    buttons['account'].click()
})
