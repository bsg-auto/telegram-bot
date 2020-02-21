const tf = require('@tensorflow/tfjs-node')
const puppeteer = require('puppeteer')
const Jimp = require('jimp')
const Axios = require('axios').default
const {
	dbConnectionPromise,
	User,
} = require('./prepareDB')
const {
	parseSetCookies,
	setCookiesToCookies,
	stringifyCookies,
	combineColors,
	jsonDateToUnixTimestamp,
} = require('./utils')
const {
	BASE_URL,
	NUM_DIGITS_PER_IMAGE,
	DIGIT_WIDTH,
	DIGIT_HEIGHT,
	DIGIT_SIZE,
	IMAGE_WIDTH,
	DIGITS_RECTS_OFFSETS,
	DIGITS_RECTS_TOP,
	DIGIT_ACTUAL_WIDTH,
} = require('./values')

/**
 * Created on 1398/11/27 (2020/2/16).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'

let model = null
const modelPromise = tf.loadLayersModel('file://./trained-models/bashgah-captcha@1398-11-17@10073.json')

const verifyCredential = async (username, password) => {
	const axios = Axios.create({
		baseURL: BASE_URL,
		timeout: 15000,
		maxRedirects: 0,
		withCredentials: true,
	})
	
	let response = await axios.get(`/Account/CaptchaImage?id=${Date.now()}`, {responseType: 'stream'})
	
	console.log(response.status, response.statusText)
	//console.log(response.headers)
	// console.log(response.data.toString('hex'))
	//console.log(response.config)
	
	let cookies = parseSetCookies(response.headers['set-cookie'])
	const resDataStream = response.data
	
	// Write image to file:
	// const defPath = `downloaded-captcha-${id}.png`
	// resDataStream.pipe(fs.createWriteStream(defPath))
	
	// Convert the stream to array-buffer:
	const chunks = []
	for await (let chunk of resDataStream) chunks.push(chunk)
	
	const image = await Jimp.read(Buffer.concat(chunks))
	const rawData = image.bitmap.data
	
	const imagesDataset = getImagesDataset(rawData)
	
	const xs = tf.tensor2d(imagesDataset, [NUM_DIGITS_PER_IMAGE, DIGIT_SIZE])
	//xs.print('verbose')
	
	if (!model) model = await modelPromise
	const prediction = model.predict(xs.reshape([NUM_DIGITS_PER_IMAGE, DIGIT_HEIGHT, DIGIT_WIDTH, 1]))
	// noinspection JSCheckFunctionSignatures
	const preds = prediction.argMax([-1])
	const predsAr = preds.arraySync()
	
	const answer = predsAr.join('')
	console.log('resolved captcha:', answer, username)
	
	response = await axios.post('/Account/Authenticate', {
		UserName: username,
		Password: password,
		CaptchaCode: answer,
	}, {
		headers: {'Cookie': stringifyCookies(setCookiesToCookies(cookies))},
	})
	
	console.log(response.status, '/', response.statusText)
	//console.log(response.headers)
	
	if (response.data.success !== true)
		switch (response.data.error) {
			case 'کد امنیتی صحیح نیست':
				return 'retry'
			case undefined:
				return console.error('Unexpected error!', response.data)
			default:
				return response.data.error
		}
	
	const bashgahInfo = response.data.Entity
	
	// Corrections:
	bashgahInfo.user.aggreeToDepositMoneyDate = jsonDateToUnixTimestamp(bashgahInfo.user.aggreeToDepositMoneyDate)
	
	return {bashgahInfo}
}

const getImagesDataset = rawData => {
	const top = DIGITS_RECTS_TOP
	const bottom = top + DIGIT_HEIGHT
	let index = 0
	const imagesDataset = new Float32Array(DIGIT_SIZE * NUM_DIGITS_PER_IMAGE)
	
	for (const left of DIGITS_RECTS_OFFSETS) {
		const right = left + DIGIT_ACTUAL_WIDTH
		const extraPixels = DIGIT_WIDTH - (right - left)
		
		for (let y = top; y < bottom; y++) {
			for (let i = 0; i < extraPixels / 2; i++) imagesDataset[index++] = 0
			
			for (let x = left; x < right; x++) {
				const redIndex = (x + y * IMAGE_WIDTH) * 4
				
				const rF = rawData[redIndex] / 255  // the Red   value of Foreground
				const gF = rawData[redIndex + 1] / 255  // the Green value of Foreground
				const bF = rawData[redIndex + 2] / 255  // the Blue  value of Foreground
				const a = rawData[redIndex + 3] / 255  // the Alpha value of Foreground
				
				// Calculate the color on a white (0xFFFFFF) background
				const r = combineColors(rF, 1, a)
				const g = combineColors(gF, 1, a)
				const b = combineColors(bF, 1, a)
				
				// Because the image is almost grayscale, we only include one channel ((r+g+b)/3):
				imagesDataset[index++] = 1 - ((r + g + b) / 3)
				// if (index < 110) {
				// 	console.log(index - 1)
				// 	console.log(x)
				// 	console.log(y)
				// 	console.log(redIndex)
				// 	console.log(rawData[redIndex])
				// 	console.log(rawData[redIndex + 1])
				// 	console.log(rawData[redIndex + 2])
				// 	console.log(rawData[redIndex + 3])
				// 	console.log(Math.round((r + g + b) / 3 * 255))
				// 	console.log('----------------------')
				// }
			}
			
			for (let i = 0; i < extraPixels / 2; i++) imagesDataset[index++] = 0
		}
	}
	return imagesDataset
}

const resolveActiveCompetitions = async () => {
	const axios = Axios.create({
		baseURL: BASE_URL,
		timeout: 15000,
		maxRedirects: 0,
	})
	
	const {data} = await axios.get('/Competition/GetQuestions', {
		params: {
			type: 1,        // Active competitions
			pageNumber: 1,
		}
	})
	
	// noinspection JSUnresolvedVariable
	return data.data.list.DataList.map(({Question}) => ({
		code: parseInt(Question.SerialNumber),
		id: Question.Id,
		score: Question.Score,
		title: Question.Title,
		body: Question.QuestionBody,
		bodyClearText: Question.QuestionBodyClearText,
		deadlineTime: jsonDateToUnixTimestamp(Question.DeadLineDate),
		deadlineTimeS: `${Question.DeadLineDateString} تا ساعت ${Question.DeadLineHours}`,
		publishDate: jsonDateToUnixTimestamp(Question.PublishDate),
		publishDateS: Question.PublishDateString,
		maker: Question.Maker,
		createDate: jsonDateToUnixTimestamp(Question.CreateDate),
		answerType: Question.AnswerType,
		type: Question.Type,
		isBourse: Question.IsBourse,
		categoryId: Question.CategoryId,
		categoryS: Question.Category,
		pictureBase64: Question.PictureBase64,
		pictureThumbnailBase64: Question.PictureThumbnailBase64,
		options: Question.Options.map(option => ({
			id: option.Id,
			body: option.Body,
		})),
	}))
}

const resolveCompetition = async (questionCode) => {
	const browser = await puppeteer.launch({
		// headless: false,
		//devtools: true,
		// slowMo : 500,
		defaultViewport: {
			width: 720,
			height: 1200,
			isMobile: true,
			deviceScaleFactor: 1,
		}
	})
	
	let page = null
	
	try {
		page = await browser.newPage() //await browser.targets()[0].page()
		
		const url = `${BASE_URL}/Question/${questionCode}`
		console.log(url)
		
		page.goto(url).then().catch(error => {
			if (error.message === 'Navigation failed because browser has disconnected!') return   // not important
			console.error(error)
		})
		
		const div = await page.waitForSelector('#view-container > div.container.ng-scope')
		console.log('5')
		
		await Promise.all(
				[
					'#header3',
					'#view-container > div.container.ng-scope > div.form-body div.col-md-4:not(.ng-hide)',  // جدول تعداد شرکت‌کنندگان بر اساس سطح
					'#view-container > div.container.ng-scope > div.form-footer',                           // گزینه‌ها («ارسال پاسخ»، ...)
					'#view-container > div.container.ng-scope > div.form-header > span:nth-child(2)',       // بخش «طراح سؤال: ...»
				].map(extraPart =>
						page.$eval(extraPart, el => el.remove()).then()
								.catch(() => console.error(`Couldn't find and remove: "${extraPart}"`))
				)
		)
		
		const image = await div.screenshot()
		
		console.log('6')
		
		page.close().then(() => {
			browser.close().then(() => console.log('8'))
			return console.log('7')
		})
		
		return image
	} catch (e) {
		console.error(e.name === 'TimeoutError' ? e.name : e)
		return null
	} finally {
		try {
			if (page !== null) page.close().then().catch()
		} catch (e) {}
	}
}

module.exports = {
	verifyCredential,
	resolveActiveCompetitions,
	resolveCompetition,
}
