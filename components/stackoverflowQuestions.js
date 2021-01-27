require('dotenv').config()
const stackexchange = require('stackexchange')
const orbit = require('./orbit.js')
const cron = require('node-cron')

const so = new stackexchange({ version: 2.2 })

module.exports = {
    init: async () => {
        cron.schedule('0 1 * * *', async () => {
            const d = new Date()
            d.setHours(0, 0, 0, 0)
            await checkForNewQuestions('nexmo', d)
            await checkForNewQuestions('vonage', d)
        })
    },
    checkNewQuestionsFromDate: async date => {
        const d = new Date(date)
        await checkForNewQuestions('nexmo', d)
    }
}


const checkForNewQuestions = async (tag, date) => {
    const questions = await getNewQuestions(tag, date)
    console.log(`Identified ${questions.length} new StackOverflow questions`)
    await addNewQuestionsToOrbit(questions)
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

const getExistingQuestions = () => {
    return new Promise(async (resolve, reject) => {
        const { data: activities } = await orbit.getActivities('custom:stackoverflow:question')
        resolve(activities)
    })
}

const addNewQuestionsToOrbit = items => {
    return new Promise(async (resolve, reject) => {
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
                    name: item.owner.display_name
                }
            })
        }
        resolve()
    })
}
