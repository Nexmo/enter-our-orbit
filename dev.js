require('dotenv').config()
const nodemon = require('nodemon')
const ngrok = require('ngrok')
const package = require('./package.json')
const script = 'index.js'
const port = process.env.PORT || 3000
let url = null

nodemon({ script, ext: 'js' })
nodemon.on('start', async () => {
    if(!url) {
        const opts = { port }
        if(process.env.NGROK_TOKEN) {
            opts.authtoken = process.env.NGROK_TOKEN
            opts.subdomain = package.name
        }
        url = await ngrok.connect(opts)
        console.log(`Server now available at ${url}`)
    }
}).on('quit', async () => {
    await ngrok.kill()
})
