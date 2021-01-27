require('dotenv').config()
const express = require('express')
const twitchChat = require('./components/twitchChat.js')
const youtubeComments = require('./components/youtubeComments.js')
const stackoverflowQuestions = require('./components/stackoverflowQuestions.js')

const app = express()
const port = process.env.PORT || 3000

// twitchChat.init()
// youtubeComments.init()
stackoverflowQuestions.init()

app.listen(port, console.log('Express server started'))
