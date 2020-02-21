const Axios = require('axios').default
const puppeteer = require('puppeteer')
const outdent = require('outdent')
const Extra = require('telegraf/extra')

const {
	jsonDateToUnixTimestamp,
} = require('../utils')
const {
	AgahCompetition,
} = require('../prepareDB')
const {
	resolveActiveCompetitions,
	resolveCompetition,
} = require('../functions')

const {
	BaseScene,
} = require('./base-scene')
const {
	BASE_URL,
} = require('../values')

/**
 * Created on 1398/12/1 (2020/2/20).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'

class QuestionsScene extends BaseScene {
	PLEASE_ENTER_USERNAME = `نام کاربری خود را در <a href="https://bashgah.com/#!/login">سایت بآشگاه</a> وارد:`
	
	constructor() {
		super('questions')
	}
	
	async onEnter(ctx) {
		super.onEnter(ctx)
		
		const activeCompetitions = await resolveActiveCompetitions()
		console.log(activeCompetitions.length)
		
		// upsert-many (https://stackoverflow.com/a/60330161/5318303):
		const bulkOps = activeCompetitions.map(competition => ({
			updateOne: {
				filter: {id: competition.id},
				update: competition,
				upsert: true,
			}
		}))
		
		AgahCompetition.bulkWrite(bulkOps)
		//.then(bulkWriteOpResult => console.log('BULK update OK:', bulkWriteOpResult))
				.catch(err => console.error('BULK update error:', err))
		
		ctx.reply('لطفاً صبر کنید ...')
		
		await Promise.all(
				activeCompetitions.map(competition =>
						(async () => {
							const image = await resolveCompetition(competition.code)
							
							const options = competition.options.map(option => option.body)
							const qBody = competition.body.replace(/<\s*?p.*?>|<\s*?\/p\s*?>/ig, '')  // Remove "<p>"s and "</p>"s
							console.log(competition.body)
							console.log(qBody)
							
							const caption = outdent`
								${'سؤال ' + competition.code + ' (' +  competition.score + ' امتیازی):'}\n
								${qBody}\n
								۱- ${options[0]}\n
								۲- ${options[1]}\n
								۳- ${options[2]}\n
								۴- ${options[3]}\n
								@BashgahAuto_bot
							`
							
							if (image === null) ctx.replyWithHTML(caption)
							
							ctx.replyWithPhoto({source: image}, Extra.caption(caption).HTML()).then()
						})()
				)
		)
	}
	
	onText(text, ctx) {
		ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id).then()
		
		console.log('A', text)
		
		ctx.session.username = text
		ctx.scene.enter('password').then()
	}
}

module.exports = {
	QuestionsScene,
}
