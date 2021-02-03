require('dotenv').config()
const tmi = require('tmi.js')
const axios = require('axios')
const qs = require('querystring')
const orbit = require('./orbit.js')

const channel = process.env.TWITCH_CHANNEL
let client, stream, nextCheckLiveStatus = new Date()

module.exports = {
    init: async () => {
        try {
            await checkTwitchStatus()
            await initClient()
            client.on('message', onMessage)
            client.on('ban', onBan)
        } catch(error) {
            reject(error)
        }
    }
}

const checkTwitchStatus = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const opts = {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials',
                scopes: '',
            }

            const { data } = await axios.post(`https://id.twitch.tv/oauth2/token?${qs.stringify(opts)}`)
            const { data: { data: streams } } = await axios({
                method: 'GET',
                url: `https://api.twitch.tv/helix/streams?user_login=${process.env.TWITCH_CHANNEL}`,
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    Authorization: `Bearer ${data.access_token}`,
                }
            })

            const dt = new Date()
            if(streams.length > 0) {
                const { id, title } = streams[0]
                nextCheckLiveStatus = dt.setSeconds(dt.getSeconds() + 60)
                stream = { id, title }
                resolve({ id, title })
            } else {
                nextCheckLiveStatus = dt.setSeconds(dt.getSeconds() + 60)
                resolve(false)
            }
        } catch(error) {
            console.log(error)
            reject(error)
        }
    })
}

const initClient = () => {
    return new Promise((resolve, reject) => {
        client = new tmi.client({
            identity: {
                username: process.env.TWITCH_USER,
                password: process.env.TWITCH_USER_TOKEN
            },
            channels: [ channel ],
            connection: { reconnect: true }
        })

        client.connect()
        resolve()
    })
}

const onMessage = async (channel, tags, message, self) => {
    if(self || tags.mod) return
    if(tags.username.toLowerCase() == channel.toLowerCase()) return
    if(new Date() > nextCheckLiveStatus) await checkTwitchStatus()

    const resp = await orbit.addActivity({
        activity: {
            title: 'Participated in Twitch Chat',
            description: stream.title,
            activity_type: 'twitch:chat',
            key: `twitch-chat-${stream.id}-${tags.username}`
        },
        identity: {
            source: 'Twitch',
            source_host: `https://twitch.tv/${channel}`,
            username: tags.username,
            url: `https://twitch.tv/${tags.username}`
        }
    })
    if(resp) console.log(`Adding ${tags.username}'s participation in "${stream.title}" Twitch chat.`)
}

const onBan = async (channel, username, reason, userstate) => {
    if(new Date() > nextCheckLiveStatus) await checkTwitchStatus()

    await orbit.addActivity({
        activity: {
            title: 'Banned from Twitch Chat',
            description: stream.title,
            activity_type: 'twitch:banned',
            key: `${stream.id}-${username}-banned`
        },
        identity: {
            source: 'Twitch',
            source_host: `https://twitch.tv/${channel}`,
            username: username
        },
        member: {
            tags_to_add: 'Banned'
        }
    })

    console.log(`Adding ${tags.username}'s ban from ${channel} Twitch chat.`)
}
