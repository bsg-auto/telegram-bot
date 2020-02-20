const Axios = require('axios').default
const puppeteer = require('puppeteer')

const {
	jsonDateToUnixTimestamp,
} = require('../utils')
const {
	AgahCompetition,
} = require('../prepareDB')
const {
	resolveActiveCompetitions,
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
		console.log('0')
		super.onEnter(ctx)
		
		const activeCompetitions = await resolveActiveCompetitions()
		for (const competition of activeCompetitions) ctx.reply(competition.bodyClearText).then()
		
		// upsert-many (https://stackoverflow.com/a/60330161/5318303):
		const bulkOps = activeCompetitions.map(competition => ({
			updateOne: {
				filter: {id: competition.id},
				update: competition,
				upsert: true
			}
		}))
		
		AgahCompetition.bulkWrite(bulkOps)
				.then(bulkWriteOpResult => console.log('BULK update OK:', bulkWriteOpResult))
				.catch(err => console.error('BULK update error:', err))
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
