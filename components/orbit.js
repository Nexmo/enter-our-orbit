require('dotenv').config()
const axios = require('axios')
const baseURL = 'https://app.orbit.love/api/v1'

module.exports = {
    addActivity: ({ member, activity, identity }) => {
        return new Promise(async (resolve, reject) => {
            try {
                const payload = { activity }
                if(member) payload.activity = { ...activity, member }
                if(identity) payload.identity = identity
                const { data } = await axios({
                    url: `${baseURL}/${process.env.ORBIT_WS}/activities`,
                    method: 'POST',
                    headers: { Authorization: `Bearer ${process.env.ORBIT_KEY}` },
                    data: payload
                })
                resolve(data)
            } catch(error) {
                resolve(false)
            }
        })
    },
    getActivities: (type) => {
        return new Promise (async (resolve, reject) => {
            try {
                const { data } = await axios({
                    url: `${baseURL}/${process.env.ORBIT_WS}/activities?type=${type}&items=500`,
                    method: 'GET',
                    headers: { Authorization: `Bearer ${process.env.ORBIT_KEY}` },
                })
                resolve(data)
            } catch(error) {
                reject(error)
            }
        })
    }
}
