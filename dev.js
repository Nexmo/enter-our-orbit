const nodemon = require('nodemon')
const ngrok = require('ngrok')
const script = 'index.js'
const port = process.env.PORT || 3000
let url = null

nodemon({ script, ext: 'js' })
nodemon.on('start', async () => {
    if(!url) {
        url = await ngrok.connect({ port })
        console.log(`Server now available at ${url}`)
    }
}).on('quit', async () => {
    await ngrok.kill()
})
