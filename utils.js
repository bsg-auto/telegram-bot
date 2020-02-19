/* global require, process, module */

const http = require('http')
const aesjs = require('aes-js')

/**
 * Created on 1398/11/22 (2020/2/11).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'


/**
 * Parse "set-cookie"s
 * @param setCookieStrs Example: `[ 'SESSION_COOKIE=xxx; path=/; secure; HttpOnly', '...', ... ]`
 * @returns {[{}]} Example: `[ { SESSION_COOKIE: 'xxx', path: '/', secure: true, HttpOnly: true }, ... ]`
 */
const parseSetCookies = setCookieStrs =>
		setCookieStrs.map(cookieStr => {
			const entries = cookieStr.split(';')   // ['SESSION_COOKIE=xxx', ' path=/', ' secure', ' HttpOnly']
					.map(setCookiePartStr => {  // " path=/"
								const [name, value] = setCookiePartStr.split('=')  // [" path", "/"], [" secure", undefined]
								return [name.trimStart(), value === undefined ? true : value] // ["path", "/"], [" secure", true]
							}
					)
			return Object.fromEntries(entries)
		})

/**
 * 'set-cookies' obj[] to 'cookies' obj
 * @param setCookies Example: `[ { SESSION_COOKIE: 'xxx', path: '/', secure: true }, {a: 'b', c: 'd'}, ... ]`
 * @returns {{}} Example: `{ SESSION_COOKIE: 'xxx', a: 'b' }`
 */
const setCookiesToCookies = setCookies =>
		setCookies.reduce((cookies, setCookie) => {
			const entries = Object.entries(setCookie)[0]  // only first member
			cookies[entries[0]] = entries[1]
			return cookies
		}, {})

/**
 * @param cookies Example: `{ SESSION_COOKIE: 'xxx', a: 'b' }`
 * @returns {string} Example: `SESSION_COOKIE=xxx; a=b; c=d`
 */
const stringifyCookies = cookies => Object.entries(cookies).map(cookie => cookie.join('=')).join('; ')

const combineColors = (foreColor, backColor, alpha) => alpha * foreColor + (1 - alpha) * backColor

const parseCookies = cookiesStr =>
		cookiesStr.split(';').reduce((acc, current) => {
			const [name, value] = current.split('=')
			acc[name.trimLeft()] = value
			return acc
		}, {})


const basicAuthParser = (authorization, res) => {
	const unauthorized = (res, ...msg) => {
		console.log(...msg, '/ Authorization:', authorization)
		writeHeadAndEnd(res, {
			status: HTTP_STATUS.UNAUTHORIZED,
			statusMessage: msg.join(' / '),
			headers: {
				...CONTENT_TYPES.HTML,
				'WWW-Authenticate': 'Basic',
			}
		})
		return false
	}
	
	if (!authorization) return unauthorized(res, 'No Authorization')
	
	const isBasicAtFirst = authorization.startsWith('Basic ')
	if (!isBasicAtFirst) return unauthorized(res, 'Bad Authorization', 'No "Basic " at first')
	
	const credentials = Buffer.from(authorization.substr('Basic '.length), 'base64').toString()
	if (!credentials) return unauthorized(res, 'Bad credentials format', 'No base64 phrase provided')
	
	const indexOfColon = credentials.indexOf(':')
	if (indexOfColon === -1) return unauthorized(res, 'Bad credentials format', 'Not in "username:password" format. No colon found.')
	
	return {
		username: credentials.substr(0, indexOfColon),
		password: credentials.substr(indexOfColon + 1),
	}
}

class AesEncryption {
	constructor(key, counter = 0) {
		this.getAesCtr = () => new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(counter))
	}
	
	encrypt = text => this.getAesCtr().encrypt(aesjs.utils.utf8.toBytes(text))
	
	decrypt = encryptedData => aesjs.utils.utf8.fromBytes(this.getAesCtr().decrypt(encryptedData))
}

const getExternalIP = () => new Promise((resolve, reject) =>
		http.get({host: 'ipv4bot.whatismyipaddress.com', port: 80, path: '/'}, res => {
			if (res.statusCode !== 200) reject(`Not OK status code: ${res.statusCode}`)
			res.on('data', chunk => resolve(chunk.toString()))
		}).on('error', reject)
)


module.exports = {
	parseSetCookies,
	setCookiesToCookies,
	stringifyCookies,
	combineColors,
	parseCookies,
	basicAuthParser,
	AesEncryption,
	getExternalIP,
}
