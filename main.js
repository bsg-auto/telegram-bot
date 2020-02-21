/* global require, process */

const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const {
	getExternalIP,
} = require('./utils')
const {
	WELCOME_MESSAGE,
} = require('./values')

const number = 123456.789;

console.log(new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(number));
// expected output: "123.456,79 €"

// the Japanese yen doesn't use a minor unit
console.log(new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(number));
// expected output: "￥123,457"

// limit to three significant digits
console.log(new Intl.NumberFormat('fa-IR').format(number));
console.log(new Intl.NumberFormat('fa-IR', { maximumSignificantDigits: 3 }).format(number));
console.log(new Intl.NumberFormat('fa-IR', { maximumSignificantDigits: 3 }).format(number).charCodeAt(0));

const {
	dbConnectionPromise,
	TgUser,
} = require('./prepareDB')

/**
 * Created on 1398/11/24 (2020/2/13).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'
const env = process.env

getExternalIP().then(console.log.bind(console, 'Public IP:')).catch(console.error.bind(console))

const PORT = env.PORT || 6000

// http.createServer((req, res) => {
// 	console.log(req.url)
// 	return res.end('Hello world!')
// }).listen(PORT)
// console.log(`Listening on port ${PORT} ...`)
//***********************************************************************************************************/

// const bot = new Telegraf(env.BOT_TOKEN)
// bot.catch((err, ctx) => console.log(`Ooops! The bot encountered an error for ${ctx.updateType}`, err))
//
// // Register session middleware
// bot.use(session())
//
// // Register logger middleware
// bot.use((ctx, next) => {
// 	const startTime = new Date()
// 	return next().then(() => {
// 		const ms = new Date() - startTime
// 		console.log('response time %sms', ms)
// 	})
// })

const keyboard = Markup.inlineKeyboard([
	Markup.urlButton('❤️', 'http://telegraf.js.org'),
	Markup.callbackButton('Delete', 'delete')
])

// Handler factoriess
const {enter, leave} = Stage

// Create scene manager
const stage = new Stage()
stage.command('cancel', leave())

// Scene registration
const {
	UsernameScene,
	PasswordScene,
} = require('./scenes/greeter')
const {QuestionsScene} = require('./scenes/questions')

stage.register(
		new UsernameScene(),
		new PasswordScene(),
		new QuestionsScene(),
)

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.use(session())
bot.use(stage.middleware())

bot.use(async (ctx, next) => { console.log('x')
	if (ctx.session.started) return next()
	
	ctx.session.started = true
	const telegramInfo = ctx.from
	
	const tgUserPromise = TgUser.findOneAndUpdate({id: telegramInfo.id}, telegramInfo, {upsert: true, new: true})
	tgUserPromise.then(tgUser => {
		//console.log('Upserted:', tgUser)
		ctx.session.tgUserId = tgUser._id
	}).catch(console.error.bind(console, 'Upsert Error:'))
	
	next().then(async () => await tgUserPromise)
	// console.log('ctx.telegram', ctx.telegram)
	// console.log('ctx.message', ctx.message)
	// console.log('ctx.chat', ctx.chat)
	// console.log('ctx.from', ctx.from)
	// console.log('ctx.updateType', ctx.updateType)
	// console.log('ctx.updateSubTypes', ctx.updateSubTypes)
	// console.log('ctx.editedMessage', ctx.editedMessage)
	// console.log('ctx.inlineQuery', ctx.inlineQuery)
	// console.log('ctx.chosenInlineResult', ctx.chosenInlineResult)
	// console.log('ctx.callbackQuery', ctx.callbackQuery)
	// console.log('ctx.shippingQuery', ctx.shippingQuery)
	// console.log('ctx.preCheckoutQuery', ctx.preCheckoutQuery)
	// console.log('ctx.channelPost', ctx.channelPost)
	// console.log('ctx.editedChannelPost', ctx.editedChannelPost)
	// console.log('ctx.poll', ctx.poll)
	// console.log('ctx.pollAnswer', ctx.pollAnswer)
	// console.log('ctx.match', ctx.match)
	// console.log('ctx.webhookReply', ctx.webhookReply)
})

bot.on('message', (ctx, next) => {
	console.log('state', ctx.scene.state)
	next()
})
bot.start(ctx => ctx.scene.enter('username'))

bot.command(['q', 'questions'], ctx => {
	ctx.scene.enter('questions')
})

dbConnectionPromise.then(async () =>
		await bot.launch(env.REMOTE_HOST && {
			webhook: {
				domain: 'https://' + env.REMOTE_HOST,
				port: PORT
			}
		})
).catch(console.error.bind(console, 'DB connection error:'))
