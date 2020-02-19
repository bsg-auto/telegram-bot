const Scene = require('telegraf/scenes/base')
const Stage = require('telegraf/stage')

const {
	AesEncryption,
} = require('../utils')
const {
	verifyCredential,
} = require('../functions')
const {
	AgahUser,
	TgUser,
} = require('../prepareDB')

/**
 * Created on 1398/11/25 (2020/2/14).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'

const env = process.env

const aes = new AesEncryption(Buffer.from(env.AES_KEY, 'hex'), 7)

//*******************************************************************************/

class BaseScene extends Scene {
	constructor(name) {
		super(name)
		this.name = name
		
		this.enter(this.onEnter.bind(this))
		this.leave(this.onLeave.bind(this))
		this.on('text', (ctx, next) => this.onText.bind(this)(ctx.message.text, ctx, next))
		
		for (const onHear of this.getOnHears()) this.hears(onHear.message, onHear.callback)
	}
	
	onEnter(ctx, next) {
		console.log('Entered scene:', this.name)
	}
	
	onLeave(ctx, next) {
		console.log('Left scene:', this.name)
	}
	
	getOnHears() {
		return []
	}
	
	onText(text, ctx, next) {
	}
}

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
		
		const username = ctx.session.username
		const password = ctx.session.password = text
		
		// Exactly before 'لطفاً صبر کنید ...':
		ctx.telegram.deleteMessage(ctx.session.requestUsernameMessage.chat.id, ctx.session.requestUsernameMessage.message_id).then()
		ctx.telegram.deleteMessage(ctx.session.requestPasswordMessage.chat.id, ctx.session.requestPasswordMessage.message_id).then()
		
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
		
		const newUserData = {
			name: bashgahInfo.bashgah.user.customerTitle,
			username,
			passwordIsValid: true,
			$addToSet: {tgUsers: ctx.session.tgUserId},
			encryptedPassword: Buffer.from(aes.encrypt(password)),
			...bashgahInfo,
		}
		
		AgahUser.findOneAndUpdate({username}, newUserData, {upsert: true, new: true}).then(agahUser =>
				TgUser.updateOne({id: telegramInfo.id}, {$addToSet: {agahUsers: agahUser._id}}).then(() => {
					console.log('Upserted successfully:', username)
					ctx.reply('تبریک 🌹\n به جمع کاربران ما خوش آمدید 💐').then()
					ctx.replyWithSticker('CAACAgQAAxkBAAPDXk1_P2rpYOGDJdWPwBklruV40SMAAuMAA_NilgYrEJPrbrOoTBgE').then()
					ctx.scene.leave()
				}).catch(console.error.bind(console, 'Upsert2 Error:'))
						.catch(console.error.bind(console, 'Upsert1 Error:')))
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
