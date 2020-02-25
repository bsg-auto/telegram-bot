/**
 * Created on 1398/11/20 (2020/2/9).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */
'use strict'

const IMAGE_WIDTH = 100
const IMAGE_HEIGHT = 32
const IMAGE_SIZE = IMAGE_WIDTH * IMAGE_HEIGHT

const DIGITS_RECTS_OFFSETS = [20, 32, 44, 56, 68]
const NUM_DIGITS_PER_IMAGE = DIGITS_RECTS_OFFSETS.length  // 5
const DIGITS_RECTS_TOP = 6
const DIGIT_ACTUAL_WIDTH = 14
const DIGIT_WIDTH = 20
const DIGIT_HEIGHT = 20
const DIGIT_SIZE = DIGIT_WIDTH * DIGIT_HEIGHT


const WELCOME_MESSAGE = `سلام✋
به ربات #پاسخگویی_خودکار به پرسش‌های باشگاه کارگزاری آگاه خوش‌آمدید. 🌷
اگر هنوز بورسی نشدید یا شدید ولی توی #آگاه نیستید، ما (با توجه به مقایسه‌ای که بین کارگزاری‌های مختلف انجام داده‌ایم) این کارگزاری رو به عنوان #کارگزاری_برتر به شما پیشنهاد می‌کنیم.
می‌تونید همین الان از طریق لینک زیر وارد بشید و ثبت‌نام اینترنتی‌تونو تکمیل کنید.
توجه داشته باشید که این لینک، یک #لینک_معرفی هست و شما با استفاده از اون، علاوه بر #دریافت_امتیاز، تا یک ماه از امتیازات سطح معرف خود که شامل #۱۷درصد_تخفیف_کارمزد_معاملات و #مزایای_دیگه-ست بهره‌مند می‌شید!`

const BASHGAH_ORIGIN = 'https://bashgah.com'

module.exports = {
	WELCOME_MESSAGE,
	BASHGAH_ORIGIN,
	
	IMAGE_WIDTH,
	IMAGE_HEIGHT,
	IMAGE_SIZE,
	DIGITS_RECTS_OFFSETS,
	NUM_DIGITS_PER_IMAGE,
	DIGITS_RECTS_TOP,
	DIGIT_ACTUAL_WIDTH,
	DIGIT_WIDTH,
	DIGIT_HEIGHT,
	DIGIT_SIZE,
}
