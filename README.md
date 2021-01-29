![Vonage + Orbit](.github/logo.png)

# Enter Our Orbit

An express application which ingests the following data into [Orbit](https://orbit.love):

* Active participants in Twitch stream chat
* YouTube users who leave comments on a specified channel
* Questions asked on Stackoverflow

## Setup

Rename `.env.example` to `.env` and fill out all of the fields for the components you wish to use. The following environment variables are always required:

* ORBIT_WS - the name of your Orbit workspace
* ORBIT_KEY - an API key for your Orbit user (it is reommended that you use another user for API access)

If you don't want to use any components, just remove them from `index.js`.

## Running the Application

```
$ npm run start # spins up application
$ npm run dev # spins up app with nodemon and ngrok
```

If you have a paid ngrok account, add the `NGROK_TOKEN` environment variable to get custom domains based on the project name in `package.json`.

## Orbit

The __orbit__ component wraps the Orbit API and allows for the addition and retrieval of activities.

```
const orbit = require('./orbit.js')

await orbit.addActivity({
    activity: {},
    member: {},
    identity: {}
})

await orbit.getActivities('activity:type')
```

### Potential Improvements

* No rate-limiting measures have been implemented
* orbit.getActivities() only returns the first 500 items

## Twitch Chat

The __twitchChat__ component connects to a channel's Twitch channel and adds activities the first time a user sends a message into the chat while a stream is live, and when they are banned.

When banned, the 'Banned' tag is added to the member. Mod messages are ignored.

To set up the twitchChat component:

1. [Generate Twitch OAuth Token](https://twitchapps.com/tmi/)
2. [Register a Twitch application](https://dev.twitch.tv/console)
3. Add the following environment variables:
    * TWITCH_CHANNEL - the Twitch channel to watch chat for
    * TWITCH_USER - your twitch username for auth
    * TWITCH_USER_TOKEN - your twitch oauth token starting 'oauth:'
    * TWITCH_CLIENT_ID - twitch application client id
    * TWITCH_CLIENT_SECRET - twitch application client secret

### Potential Improvements

* An activity is added every time a message is sent, and the application swallows the Orbit error if there is a matching key (already a user message logged for this stream).
* No rate-limiting measures on the assumption 120 messages will not be sent per minute.

## YouTube Comments

The __youtubeComments__ component runs a daily cron job. On a daily schedule, all comments are retrieved from Orbit and YouTube on every video posted by a specificed channel. New comments are added as Orbit activities.

To set up the youtubeComments component:

1. [Register a YouTube Application and API Key](https://developers.google.com/youtube/registering_an_application)
2. [Locate your YouTube Channel ID](https://support.google.com/youtube/answer/3250431?hl=en-GB)
3. Add the following environment variables:
    * YOUTUBE_CHANNEL_USERNAME - channel username to get videos from
    * YOUTUBE_API_KEY - api key from step 1
    * YOUTUBE_CHANNEL_ID - your ID from step 2

### Potential Improvements

* Does not paginate the Orbit API when getting existing activities. You are limited to the first 500.
* No rate-limiting measures on the assumption 120 comments won't be ingested at the same time.

## Stack Overflow Questions

The __stackoverflowQuestions__ component runs on a daily cron job. On a daily schedule, all questions are retrieved from Orbit and on Stackoverflow from a specified list of tags. New questions are added as Orbit activities.

Note that a question requires only one of these tags to be included in the results, not all.

To set up the stackoverflowQuestions component:

1. [Register a StackExchange App and note the app key](https://stackapps.com/apps/oauth/register)
2. Add the following environment variables:
    * STACK_KEY - your app key
    * STACK_TERMS - comma-separated tag list

### Potential Improvements

* Does not paginate the Orbit API when getting existing activities. You are limited to the first 500.
* Only will ingest 120 questions per run. It is recommended you manually run the app a few times to backfill data 120 activities at a time.
* Does not include any answers.

## Code of Conduct

In the interest of fostering an open and welcoming environment, we strive to make participation in our project and our community a harassment-free experience for everyone. Please check out our [Code of Conduct](.github/CODE_OF_CONDUCT.md) in full.

## Contributing

We :heart: contributions from everyone! Check out the [Contributing Guidelines](.github/CONTRIBUTING.md) for more information.

<a href="./../../issues">
<img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat" alt="Contributions Welcome">
</a>

## License

This project is subject to the [MIT License](LICENSE)
