require('dotenv').config()
const stackexchange = require('stackexchange')
const orbit = require('./orbit.js')
const cron = require('node-cron')
const axios = require('axios')
const cheerio = require('cheerio')

const so = new stackexchange({ version: 2.2 })

module.exports = {
    init: async () => {
        const terms = process.env.STACK_TERMS.split(',')
        cron.schedule('55 23 * * *', async () => {
            const d = new Date()
            d.setHours(0, 0, 0, 0)
            for(let term of terms) {
                await checkForNewQuestions(term, d)
            }
        })
    },
    checkNewQuestionsFromDate: async (term, date) => {
        const d = new Date(date)
        await checkForNewQuestions(term, d)
    },
}

const checkForNewQuestions = async (tag, date) => {
    const questions = await getNewQuestions(tag, date)
    console.log(`Identified ${questions.length} new StackOverflow questions`)
    const expandedQuestions = await expandQuestions(questions)
    await addNewQuestionsToOrbit(expandedQuestions)
    console.log(`Added ${questions.length} questions to Orbit`)
}

const getNewQuestions = async (tag, date) => {
    return new Promise(async (resolve, reject) => {
        const existing = await getExistingQuestions()
        const soQuestions = await getAllSOQuestions(tag, date)
        const newQuestions = soQuestions.filter(soItem => {
            const matchingExistingItem = existing.find(orbitItem => orbitItem.attributes.key == `so-${soItem.question_id}`)
            return !matchingExistingItem
        })
        resolve(newQuestions)
    })
}

const getAllSOQuestions = (tag, date) => {
    return new Promise(async (resolve, reject) => {
        let has_more = true
        let page = 1
        let questions = []
        while(has_more) {
            const results = await getSOQuestions(tag, page, date)
            questions = [...questions, ...results.items]
            has_more = results.has_more
            if(has_more) page++
        }
        resolve(questions)
    })
}

const getSOQuestions = (tag, page, date) => {
    return new Promise((resolve, reject) => {
        const query = {
            key: process.env.STACK_KEY,
            pagesize: 50,
            tagged: tag,
            sort: 'creation',
            order: 'asc',
            page: page,
            fromdate: +date / 1000
        }

        so.questions.questions(query, (err, results) => resolve(results))
    })
}

const expandQuestions = questions => {
    return new Promise(async (resolve, reject) => {
        const expanded = []
        for(let question of questions) expanded.push(await getExtraDataFromSOQuestion(question))
        resolve(expanded)
    })
}

const getExtraDataFromSOQuestion = question => {
    return new Promise(async (resolve, reject) => {
        const { data: html } = await axios.get(`https://stackoverflow.com/users/${question.owner.user_id}`)
        const $ = cheerio.load(html)

        let github, twitter
        for(let link of $('[rel=me]')) {
            const url = $(link).attr('href')
            const username = $(link).text()
            if(url.includes('github')) github = username
            if(url.includes('twitter')) twitter = username.split('@').join('')
        }

        const q = { ...question }
        if(github) q.owner.github = github
        if(twitter) q.owner.twitter = twitter
        resolve(q)
    })
}

const getExistingQuestions = () => {
    return new Promise(async (resolve, reject) => {
        const { data: activities } = await orbit.getActivities('custom:stackoverflow:question')
        resolve(activities)
    })
}

const addNewQuestionsToOrbit = items => {
    return new Promise(async (resolve, reject) => {
        if(items.length > 120) {
            console.log('There are more than 120 items. We are just going to do the first 120 for now to respect the Orbit API Limits. Wait a minute between runs.')
            items.length = 120
        }
        for(let item of items) {
            await orbit.addActivity({
                activity: {
                    title: 'Posted a Question on StackOverflow',
                    description: `"${item.title}" with tags "${item.tags.join('", "')}"`,
                    activity_type: 'stackoverflow:question',
                    key: `so-${item.question_id}`,
                    link: item.link,
                    link_text: 'Go to question',
                    occurred_at: new Date(item.creation_date * 1000).toISOString()
                },
                identity: {
                    source: 'StackOverflow',
                    source_host: `https://stackoverflow.com`,
                    username: item.owner.user_id
                },
                member: {
                    name: item.owner.display_name,
                    twitter: item.owner.twitter,
                    github: item.owner.github
                }
            })
        }
        resolve()
    })
}
