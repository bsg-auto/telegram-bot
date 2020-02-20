const mongoose = require('mongoose')
/**
 * Created on 1398/11/20 (2020/2/9).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'

mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)
mongoose.set('runValidators', true)
const Schema = mongoose.Schema

const dbConnectionPromise = mongoose.connect(process.env.DB_URI || 'mongodb://localhost/bashgah-auto')

const db = mongoose.connection

db.on('error', console.error.bind(console, 'DB ERROR:'))

const TgUserSchema = new Schema({
	name: {type: String, index: true},
	id: {type: Number, required: true, unique: true},
	is_bot: {type: Boolean, required: true},
	first_name: {type: String, required: true, default: null},
	last_name: String,
	username: {type: String, index: true},
	language_code: String,
	agahUsers: [{type: Schema.Types.ObjectId, ref: 'AgahUser'}]
	//permissions: {},
}, {timestamps: true})

const AgahUserSchema = new Schema({
	name: {type: String, index: true},
	username: {type: String, unique: true},
	encryptedPassword: Buffer, //{type: Buffer, required: true, default: null},
	subSalt: {type: String, required: true, default: null},
	passwordIsValid: {type: Boolean, required: true, default: true},
	bashgah: {
		firstLoginState: Boolean,
		isMergeWindowVisibleForNewCustomer: Boolean,
		user: {
			clubId: String,
			firstLoginState: Boolean,
			email: String,
			customerTitle: String,
			isCustomer: Boolean,
			ccmsMemberType: Number,
			reagentRegistrationState: Number,
			clubMemberCode: String,
			aggreeToDepositMoney: Boolean,
			aggreeToDepositMoneyDate: Date,
			isMarketer: Boolean,
			BlogEncData: String,
			UnreadPopupPublicMessageCount: Number,
			UnreadPopupPrivateMessageCount: Number,
			HasStateCenter: Boolean,
		},
		level: {
			title: String,
			score: Number,
			remainingRial: Number,
			totalRial: Number,
			credit: Number,
			order: Number,
		},
	},
	tgUsers: [{type: Schema.Types.ObjectId, ref: 'TgUser'}]
}, {timestamps: true});

[TgUserSchema, AgahUserSchema].forEach(Schema => {
	Schema.pre('updateOne', function (next) {
		this.options.setDefaultsOnInsert = true
		next()
	})
	Schema.pre('findOneAndUpdate', function (next) {
		this.options.setDefaultsOnInsert = true
		next()
	})
})

const AgahUser = db.model('AgahUser', AgahUserSchema)
const TgUser = db.model('TgUser', TgUserSchema)
AgahUser.on('index', err => console.warn('Disable `autoIndex` on production mode. See:', 'https://mongoosejs.com/docs/guide.html#indexes'))

module.exports = {
	dbConnectionPromise,
	AgahUser,
	TgUser,
}
