/* global require, process */

const http = require('http')

const {
	getExternalIP,
} = require('./utils')

const TelegramBot = require('node-telegram-bot-api')

/**
 * Created on 1398/11/24 (2020/2/13).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'
const env = process.env

getExternalIP().then(console.log.bind(console, 'Public IP:')).catch(console.error.bind(console))

const PORT = env.PORT || 6000

http.createServer((req, res) => {
	console.log(req.url)
	return res.end('Hello world!')
}).listen(PORT)
console.log(`Listening on port ${PORT} ...`)

// replace the value below with the Telegram token you receive from @BotFather
const token = env.TELEGRAM_API_KEY

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, env.REMOTE_HOST ? {webHook: {host: env.REMOTE_HOST}} : {polling: true})

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
	// 'msg' is the received Message from Telegram
	// 'match' is the result of executing the regexp above on the text content
	// of the message
	
	const chatId = msg.chat.id
	const resp = match[1] // the captured "whatever"
	
	// send back the matched "whatever" to the chat
	bot.sendMessage(chatId, resp)
})

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', msg => {
	console.log(msg)
	const chatId = msg.chat.id
	
	// send a message to the chat acknowledging receipt of their message
	bot.sendMessage(chatId, 'Received your message' + msg)
})
