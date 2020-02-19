const tf = require('@tensorflow/tfjs-node')
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
} = require('./utils')
const {
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
		baseURL: 'https://bashgah.com',
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
		headers: {
			// 'Host': 'bashgah.com',
			// 'Connection': 'keep-alive',
			// 'Accept': 'application/json, text/plain, */*',
			// 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
			// 'Content-Type': 'application/json;charset=UTF-8',
			// 'Origin': 'https://bashgah.com',
			// 'Sec-Fetch-Site': 'same-origin',
			// 'Sec-Fetch-Mode': 'cors',
			// 'Referer': 'https://bashgah.com/',
			// 'Accept-Encoding': 'gzip, deflate, br',
			// 'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8',
			'Cookie': stringifyCookies(setCookiesToCookies(cookies)),
		},
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
	
	const bashgahInfo = {bashgah: response.data.Entity}
	const date = bashgahInfo.bashgah.user.aggreeToDepositMoneyDate
	bashgahInfo.bashgah.user.aggreeToDepositMoneyDate = date.substring(6, date.length - 2)  // convert "/Date(###)/" to "###"

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

module.exports = {
	verifyCredential,
}
