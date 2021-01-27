require('dotenv').config()
const axios = require('axios')
const { resolve } = require('path')
const qs = require('querystring')
const orbit = require('./orbit.js')
const cron = require('node-cron')

module.exports = {
    init: () => {
        cron.schedule('0 0 * * *', async () => {
            await checkForNewComments()
        })
    },
    getAllComments: async () => {
        return await getYouTubeComments()
    }
}

const checkForNewComments = async () => {
    const comments = await getNewComments()
    await addNewCommentsToOrbit(comments)
    console.log(`Added ${comments.length} comments to Orbit`)
}

const getNewComments = () => {
    return new Promise(async (resolve, reject) => {
        const existing = await getExistingComments()
        const youtube = await getYouTubeComments()
        const newComments = youtube.filter(ytItem => {
            const matchingExistingItem = existing.find(orbitItem => orbitItem.attributes.key == `yt-${ytItem.id}`)
            return !matchingExistingItem
        })
        resolve(newComments)
    })
}

const getExistingComments = () => {
    return new Promise(async (resolve, reject) => {
        const { data: activities } = await orbit.getActivities('custom:youtube:comment')
        resolve(activities)
    })
}

const getYouTubeComments = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const pl = await getUploadsPlaylist()
            const videos = await getAllVideosInPlaylist(pl)
            const comments = await getCommentsOnManyVideos(videos)
            resolve(comments)
        } catch(error) {
            console.error(error)
            reject(error)
        }
    })
}

const getUploadsPlaylist = () => {
    return new Promise((resolve, reject) => {
        const opts = {
            key: process.env.YOUTUBE_API_KEY,
            part: 'contentDetails',
            id: process.env.YOUTUBE_CHANNEL_ID
        }

        const url = `https://www.googleapis.com/youtube/v3/channels?${qs.stringify(opts)}`
        axios.get(url).then(({data}) => {
            resolve(data.items[0].contentDetails.relatedPlaylists.uploads)
        }).catch(error => {
            reject(error)
        })
    })
}

const getPageVideosInPlaylist = (playlist, token) => {
    return new Promise((resolve, reject) => {
        const opts = {
            key: process.env.YOUTUBE_API_KEY,
            part: 'snippet',
            playlistId: playlist,
            maxResults: 50
        }
        if(token) opts.pageToken = token
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?${qs.stringify(opts)}`
        axios.get(url).then(({data}) => resolve(data)).catch(error => reject(error))
    })
}

const getAllVideosInPlaylist = playlist => {
    return new Promise(async (resolve, reject) => {
        const initialResults = await getPageVideosInPlaylist(playlist)
        let pageToken = initialResults.nextPageToken
        let videos = initialResults.items

        const { totalResults, resultsPerPage } = initialResults.pageInfo
        const additionalPages = Math.floor(totalResults / resultsPerPage)

        for(let i=0; i<additionalPages; i++) {
            const results = await getPageVideosInPlaylist(playlist, pageToken)
            pageToken = results.nextPageToken
            videos = [...videos, ...results.items]
        }

        videos = videos.map(video => {
            return {
                id: video.id,
                title: video.snippet.title,
                videoId: video.snippet.resourceId.videoId
            }
        })
        resolve(videos)
    })
}

const getCommentsOnManyVideos = videos => {
    return new Promise(async (resolve, reject) => {
        let comments = []
        for(let video of videos) {
            const resp = await getCommentsOnVideo(video)
            if(resp && resp.items.length > 0) {
                const items = resp.items
                const minComments = items.map(item => {
                    return {
                        id: item.id,
                        videoId: item.snippet.videoId,
                        videoName: video.title,
                        displayName: item.snippet.topLevelComment.snippet.authorDisplayName,
                        comment: item.snippet.topLevelComment.snippet.textDisplay,
                        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
                        authorChannelId: item.snippet.topLevelComment.snippet.authorChannelId.value
                    }
                })
                comments = [...comments, ...minComments]
            }
        }
        resolve(comments)
    })
}

const getCommentsOnVideo = video => {
    return new Promise((resolve, reject) => {
        const opts = {
            key: process.env.YOUTUBE_API_KEY,
            part: 'snippet, replies',
            videoId: video.videoId,
            maxResults: 100
        }
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?${qs.stringify(opts)}`
        axios.get(url).then(({data}) => resolve(data)).catch(error => resolve(false))
    })
}

const addNewCommentsToOrbit = items => {
    return new Promise(async (resolve, reject) => {
        for(let item of items) {
            await orbit.addActivity({
                activity: {
                    title: 'Commented on YouTube Video',
                    description: `Left a comment on ${item.videoName}: "${item.comment}"`,
                    activity_type: 'youtube:comment',
                    key: `yt-${item.id}`,
                    link: `https://youtu.be/${item.videoId}`,
                    link_text: 'Go to video',
                    occurred_at: item.publishedAt
                },
                identity: {
                    source: 'YouTube',
                    source_host: `https://www.youtube.com/channel/${item.authorChannelId}`,
                    username: item.authorChannelId
                },
                member: {
                    name: item.displayName
                }
            })
        }
        resolve()
    })
}
