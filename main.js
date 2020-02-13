/* global require, process */

const http = require('http')
const Telegraf = require('telegraf')

const {
	getExternalIP,
} = require('./utils')

/**
 * Created on 1398/11/24 (2020/2/13).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'
const env = process.env

getExternalIP().then(console.log.bind(console,'Public IP:')).catch(console.error.bind(console))

const PORT = env.PORT || 6000

http.createServer((req, res) => {
	console.log(req.url)
	return res.end('Hello world!')
}).listen(PORT)
console.log(`Listening on port ${PORT} ...`)
//***********************************************************************************************************/

const bot = new Telegraf(env.TELEGRAM_API_KEY)
bot.catch((err, ctx) => console.log(`Ooops! The bot encountered an error for ${ctx.updateType}`, err))

// bot.use((ctx, next) => {
// 	next()
// 	console.log('ctx.telegram', ctx.telegram)
// 	console.log('ctx.updateType', ctx.updateType)
// 	console.log('ctx.updateSubTypes', ctx.updateSubTypes)
// 	console.log('ctx.message', ctx.message)
// 	console.log('ctx.editedMessage', ctx.editedMessage)
// 	console.log('ctx.inlineQuery', ctx.inlineQuery)
// 	console.log('ctx.chosenInlineResult', ctx.chosenInlineResult)
// 	console.log('ctx.callbackQuery', ctx.callbackQuery)
// 	console.log('ctx.shippingQuery', ctx.shippingQuery)
// 	console.log('ctx.preCheckoutQuery', ctx.preCheckoutQuery)
// 	console.log('ctx.channelPost', ctx.channelPost)
// 	console.log('ctx.editedChannelPost', ctx.editedChannelPost)
// 	console.log('ctx.poll', ctx.poll)
// 	console.log('ctx.pollAnswer', ctx.pollAnswer)
// 	console.log('ctx.chat', ctx.chat)
// 	console.log('ctx.from', ctx.from)
// 	console.log('ctx.match', ctx.match)
// 	console.log('ctx.webhookReply', ctx.webhookReply)
// })

const welcomeMessage = `سلام✋
به ربات #پاسخگویی_خودکار به پرسش‌های باشگاه کارگزاری آگاه خوش‌آمدید. 🌷
اگر هنوز کد بورسی ندارید یا دارید ولی توی #آگاه نیستید، ما با توجه به مقایسه‌ای که بین کارگزاری‌های مختلف انجام داده‌ایم، این کارگزاری رو به عنوان #کارگزاری_برتر به شما پیشنهاد می‌کنیم.
می‌تونید همین الان از طریق لینک زیر وارد بشید و ثبت‌نام اینترنتی‌تونو تکمیل کنید.
توجه داشته باشید که این لینک، یک #لینک_معرفی هست و شما با استفاده از اون، علاوه بر #دریافت_امتیاز، تا یک ماه از امتیازات سطح معرف خود که شامل #۱۷درصد_تخفیف_کارمزد_معاملات و #مزایای_دیگه-ست بهره‌مند می‌شید!`
bot.start(ctx => ctx.reply(welcomeMessage))
bot.help(ctx => ctx.reply('Send me a sticker'))
bot.on('sticker', ctx => ctx.reply('👍'))
bot.hears('hi', ctx => ctx.reply('Hey there'))

bot.use(async (ctx, next) => {
	const start = new Date()
	await next()
	const ms = new Date() - start
	console.log('Response time: %sms', ms)
})

bot.on('text', (ctx) => ctx.reply('Hello World'))

bot.launch()
