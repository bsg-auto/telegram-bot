const outdent = require('outdent')
const Extra = require('telegraf/extra')

const {AgahCompetition} = require('../prepareDB')
const {resolveActiveCompetitions, resolveCompetition} = require('../functions')

const {BaseScene} = require('./base-scene')
const {BASHGAH_ORIGIN} = require('../values')
const {RLM} = require('../constants')
const {getOrDefineDeepPath} = require('../utils')

/**
 * Created on 1398/12/1 (2020/2/20).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'

global['agah'] = {
	bashgah: {
		competitions: {}
	}
}

class QuestionsScene extends BaseScene {
	constructor() {
		super('questions')
	}
	
	async onEnter(ctx) {
		ctx.reply('لطفاً صبر کنید ...')
		super.onEnter(ctx)
		
		const activeCompetitions = await resolveActiveCompetitions()
		console.log(activeCompetitions.length)
		
		// upsert-many (https://stackoverflow.com/a/60330161/5318303):
		const upserts = activeCompetitions.map(competition => ({
			updateOne: {
				filter: {id: competition.id},
				update: competition,
				upsert: true,
			}
		}))
		AgahCompetition.bulkWrite(upserts)
		//.then(bulkWriteOpResult => console.log('BULK update OK:', bulkWriteOpResult))
				.catch(err => console.error('BULK update error:', err))
		
		const gCompetitions = agah.bashgah.competitions
		const QUESTION_HASH_TAG = 'سؤال'
		const oneCode = '➊'.charCodeAt(0)
		const fa = new Intl.NumberFormat('fa-IR', {useGrouping: false})
		
		await Promise.all(activeCompetitions/*.filter((e, i) => i===0)*/.map(competition => (async () => {
			const url = `${BASHGAH_ORIGIN}/Question/${competition.code}`
			
			const options = competition.options.map((option, i) => ({
				num: String.fromCharCode(oneCode + i),
				num2: String.fromCharCode(oneCode + i),
				body: option.body,
			}))
			
			const qBody = competition.body.replace(/(&zwnj;)|(&nbsp;)/ig, (match, zwng, nbsp) => {
				if (zwng) return '\u200C'
				if (nbsp) return '\u00A0'
			}).replace(/<\s*?p.*?>|<\s*?\/p\s*?>/ig, '')  // remove all "<p>"s and "</p>"s
			
			const qCodeFa = `<a href="${url}">${fa.format(competition.code)}</a>` + RLM
			const hashTag = competition.score === 0 ? 'جسورانه' : fa.format(competition.score) + '_امتیازی'

			const caption = outdent`
								#${QUESTION_HASH_TAG} ${qCodeFa} (#${hashTag}):\n
								${qBody}\n
								@BashgahAuto_bot
							`
			
			const keyboardCB = markup => markup.inlineKeyboard(
					options.map(option => markup.callbackButton(
							`${option.num2} ${option.body}`, 'delete')
					), {columns: 1})
			
			let photoHandler = getOrDefineDeepPath.bind(gCompetitions)(competition.code, 'photoFileId')
			if (!photoHandler) {
				ctx.reply(`در حال دریافت پرسش شماره ${competition.code} ...`)
				console.log(url)
				const image = await resolveCompetition(competition.code)
				if (image === null) return ctx.reply(caption,
						Extra.load({disable_web_page_preview: true}).HTML().markup(keyboardCB))
				photoHandler = {source: image}
			}
			
			ctx.replyWithPhoto(photoHandler, Extra.caption(caption).HTML().markup(keyboardCB)).then(msg =>
					gCompetitions[competition.code].photoFileId = msg.photo[msg.photo.length - 1].file_id
			)
		})()))
	}
}

module.exports = {
	QuestionsScene,
}
