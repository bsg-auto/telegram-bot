const {
	AesEncryption,
	randomStr10,
} = require('../utils')
const {
	verifyCredential,
} = require('../functions')
const {
	AgahUser,
	TgUser,
} = require('../prepareDB')
const {
	BaseScene,
} = require('./base-scene')

/**
 * Created on 1398/11/25 (2020/2/14).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'

const env = process.env

const aes = new AesEncryption(Buffer.from(env.AES_KEY, 'hex'))

//*******************************************************************************/

class PasswordScene extends BaseScene {
	PLEASE_ENTER_PASSWORD = `رمز عبور خود را در <a href="https://bashgah.com/#!/login">سایت بآشگاه</a> وارد کنید:\n
‼️ هشدار: ‼️
<i>«رمزها» اصولاً اطلاعات محرمانه‌ای هستند! آن‌ها را در اختیار کسانی که بهشان اطمینان ندارید، قرار ندهید!</i>`
	
	constructor() {
		const name = 'password'
		super(name)
	}
	
	async onEnter(ctx) {
		super.onEnter(ctx)
		ctx.session.requestPasswordMessage =
				await ctx.replyWithHTML(this.PLEASE_ENTER_PASSWORD, {disable_web_page_preview: true})
	}
	
	async onText(text, ctx) {
		ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id).then()
		
		const session = ctx.session
		
		const username = session.username
		const password = session.password = text
		
		// Exactly before 'لطفاً صبر کنید ...':
		// console.log(session.requestUsernameMessage)  // temporary removed until solving this issue: https://github.com/telegraf/telegraf/issues/917#issuecomment-590959722
		console.log(session.requestPasswordMessage)
		ctx.telegram.deleteMessage(session.requestUsernameMessage.chat.id, session.requestUsernameMessage.message_id).then()
		ctx.telegram.deleteMessage(session.requestPasswordMessage.chat.id, session.requestPasswordMessage.message_id).then()
		
		let result
		try {
			do {
				ctx.reply('لطفاً صبر کنید ...').then()
				result = await verifyCredential(username, password)
			} while (result === 'retry')
		} catch (err) {
			return console.error(err)
		}
		const {bashgahInfo} = result
		
		if (bashgahInfo === undefined) {
			ctx.reply(result)
			ctx.scene.enter('username').then()
			return
		}
		
		console.log('New correct credential:', username)
		
		const telegramInfo = ctx.from
		const subSalt = randomStr10()
		const salt = subSalt + username
		const encryptedPassword = Buffer.from(aes.encrypt(salt + password))
		
		bashgahInfo.autoAnswer = false
		const newUserData = {
			name: bashgahInfo.user.customerTitle,
			username,
			encryptedPassword,
			subSalt,
			passwordIsValid: true,
			isActive: true,
			$addToSet: {tgUsers: session.tgUserId},
			bashgah: bashgahInfo,
		}
		
		AgahUser.findOneAndUpdate({username}, newUserData, {upsert: true, new: true}).then(agahUser =>
				TgUser.updateOne({id: telegramInfo.id}, {$addToSet: {agahUsers: agahUser._id}}).then(() => {
					console.log('Upserted successfully:', username)
					ctx.reply('تبریک 🌹\n به جمع کاربران ما خوش آمدید 💐').then()
					ctx.replyWithSticker('CAACAgQAAxkBAAPDXk1_P2rpYOGDJdWPwBklruV40SMAAuMAA_NilgYrEJPrbrOoTBgE').then()
					ctx.scene.leave()
				}))
				.catch(console.error.bind(console, 'Upsert Error:'))
	}
}

class UsernameScene extends BaseScene {
	PLEASE_ENTER_USERNAME = `نام کاربری خود را در <a href="https://bashgah.com/#!/login">سایت بآشگاه</a> وارد کنید:`
	
	constructor() {
		super('username')
	}
	
	async onEnter(ctx) {
		super.onEnter(ctx)
		
		ctx.session.requestUsernameMessage =
				await ctx.replyWithHTML(this.PLEASE_ENTER_USERNAME, {disable_web_page_preview: true})
	}
	
	onText(text, ctx) {
		ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id).then()
		
		console.log('A', text)
		
		ctx.session.username = text
		ctx.scene.enter('password').then()
	}
}

module.exports = {
	UsernameScene,
	PasswordScene,
}
