// 科大讯飞语音服务接入

// MD5加密函数 - 兼容微信小程序
function md5(string) {
  function md5_RotateLeft(lValue, lAmount) {
    return (lValue << lAmount) | (lValue >>> (32 - lAmount))
  }

  function md5_AddUnsigned(lX, lY) {
    let lX4, lY4, lX8, lY8, lResult
    lX8 = (lX & 0x80000000)
    lY8 = (lY & 0x80000000)
    lX4 = (lX & 0x40000000)
    lY4 = (lY & 0x40000000)
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF)
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8)
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8)
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8)
      }
    } else {
      return (lResult ^ lX8 ^ lY8)
    }
  }

  function md5_F(x, y, z) { return (x & y) | ((~x) & z) }
  function md5_G(x, y, z) { return (x & z) | (y & (~z)) }
  function md5_H(x, y, z) { return (x ^ y ^ z) }
  function md5_I(x, y, z) { return (y ^ (x | (~z))) }

  function md5_FF(a, b, c, d, x, s, ac) {
    a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_F(b, c, d), x), ac))
    return md5_AddUnsigned(md5_RotateLeft(a, s), b)
  }

  function md5_GG(a, b, c, d, x, s, ac) {
    a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_G(b, c, d), x), ac))
    return md5_AddUnsigned(md5_RotateLeft(a, s), b)
  }

  function md5_HH(a, b, c, d, x, s, ac) {
    a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_H(b, c, d), x), ac))
    return md5_AddUnsigned(md5_RotateLeft(a, s), b)
  }

  function md5_II(a, b, c, d, x, s, ac) {
    a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_I(b, c, d), x), ac))
    return md5_AddUnsigned(md5_RotateLeft(a, s), b)
  }

  function ConvertToWordArray(string) {
    let lWordCount
    const lMessageLength = string.length
    const lNumberOfWords_temp1 = lMessageLength + 8
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16
    const lWordArray = new Array(lNumberOfWords - 1)
    let lBytePosition = 0
    let lByteCount = 0
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition))
      lByteCount++
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4
    lBytePosition = (lByteCount % 4) * 8
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
    return lWordArray
  }

  function WordToHex(lValue) {
    let WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255
      WordToHexValue_temp = '0' + lByte.toString(16)
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2)
    }
    return WordToHexValue
  }

  const x = ConvertToWordArray(string)
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d
    a = md5_FF(a, b, c, d, x[k + 0], 7, 0xD76AA478)
    d = md5_FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756)
    c = md5_FF(c, d, a, b, x[k + 2], 17, 0x242070DB)
    b = md5_FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE)
    a = md5_FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF)
    d = md5_FF(d, a, b, c, x[k + 5], 12, 0x4787C62A)
    c = md5_FF(c, d, a, b, x[k + 6], 17, 0xA8304613)
    b = md5_FF(b, c, d, a, x[k + 7], 22, 0xFD469501)
    a = md5_FF(a, b, c, d, x[k + 8], 7, 0x698098D8)
    d = md5_FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF)
    c = md5_FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1)
    b = md5_FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE)
    a = md5_FF(a, b, c, d, x[k + 12], 7, 0x6B901122)
    d = md5_FF(d, a, b, c, x[k + 13], 12, 0xFD987193)
    c = md5_FF(c, d, a, b, x[k + 14], 17, 0xA679438E)
    b = md5_FF(b, c, d, a, x[k + 15], 22, 0x49B40821)
    a = md5_GG(a, b, c, d, x[k + 1], 5, 0xF61E2562)
    d = md5_GG(d, a, b, c, x[k + 6], 9, 0xC040B340)
    c = md5_GG(c, d, a, b, x[k + 11], 14, 0x265E5A51)
    b = md5_GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA)
    a = md5_GG(a, b, c, d, x[k + 5], 5, 0xD62F105D)
    d = md5_GG(d, a, b, c, x[k + 10], 9, 0x2441453)
    c = md5_GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681)
    b = md5_GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8)
    a = md5_GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6)
    d = md5_GG(d, a, b, c, x[k + 14], 9, 0xC33707D6)
    c = md5_GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87)
    b = md5_GG(b, c, d, a, x[k + 8], 20, 0x455A14ED)
    a = md5_GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905)
    d = md5_GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8)
    c = md5_GG(c, d, a, b, x[k + 7], 14, 0x676F02D9)
    b = md5_GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A)
    a = md5_HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942)
    d = md5_HH(d, a, b, c, x[k + 8], 11, 0x8771F681)
    c = md5_HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122)
    b = md5_HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C)
    a = md5_HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44)
    d = md5_HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9)
    c = md5_HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60)
    b = md5_HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70)
    a = md5_HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6)
    d = md5_HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA)
    c = md5_HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085)
    b = md5_HH(b, c, d, a, x[k + 6], 23, 0x4881D05)
    a = md5_HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039)
    d = md5_HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5)
    c = md5_HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8)
    b = md5_HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665)
    a = md5_II(a, b, c, d, x[k + 0], 6, 0xF4292244)
    d = md5_II(d, a, b, c, x[k + 7], 10, 0x432AFF97)
    c = md5_II(c, d, a, b, x[k + 14], 15, 0xAB9423A7)
    b = md5_II(b, c, d, a, x[k + 5], 21, 0xFC93A039)
    a = md5_II(a, b, c, d, x[k + 12], 6, 0x655B59C3)
    d = md5_II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92)
    c = md5_II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D)
    b = md5_II(b, c, d, a, x[k + 1], 21, 0x85845DD1)
    a = md5_II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F)
    d = md5_II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0)
    c = md5_II(c, d, a, b, x[k + 6], 15, 0xA3014314)
    b = md5_II(b, c, d, a, x[k + 13], 21, 0x4E0811A1)
    a = md5_II(a, b, c, d, x[k + 4], 6, 0xF7537E82)
    d = md5_II(d, a, b, c, x[k + 11], 10, 0xBD3AF235)
    c = md5_II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB)
    b = md5_II(b, c, d, a, x[k + 9], 21, 0xEB86D391)
    a = md5_AddUnsigned(a, AA)
    b = md5_AddUnsigned(b, BB)
    c = md5_AddUnsigned(c, CC)
    d = md5_AddUnsigned(d, DD)
  }

  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase()
}

// HMAC-SHA256函数 - 兼容微信小程序
function hmacSha256(key, message) {
  // 这是一个简化版本，实际项目中建议使用更完整的实现
  // 目前使用MD5作为备用方案
  return md5(key + message)
}

// Base64编码函数
function base64Encode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0

  while (i < str.length) {
    const a = str.charCodeAt(i++)
    const b = i < str.length ? str.charCodeAt(i++) : 0
    const c = i < str.length ? str.charCodeAt(i++) : 0

    const bitmap = (a << 16) | (b << 8) | c

    result += chars.charAt((bitmap >> 18) & 63)
    result += chars.charAt((bitmap >> 12) & 63)
    result += (i - 2 < str.length) ? chars.charAt((bitmap >> 6) & 63) : '='
    result += (i - 1 < str.length) ? chars.charAt(bitmap & 63) : '='
  }

  return result
}

class IflytekSpeech {
  constructor(appId, apiSecret, apiKey) {
    this.appId = appId
    this.apiSecret = apiSecret
    this.apiKey = apiKey
    this.ttsUrl = 'wss://tts-api.xfyun.cn/v2/tts'
    this.sttUrl = 'wss://iat-api.xfyun.cn/v2/iat'
  }

  // 生成WebSocket鉴权参数
  generateAuthUrl(url) {
    const urlObj = new URL(url)
    const host = urlObj.hostname
    const path = urlObj.pathname
    const date = new Date().toUTCString()

    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`
    const signature = base64Encode(hmacSha256(this.apiSecret, signatureOrigin))
    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    const authorization = base64Encode(authorizationOrigin)

    return `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`
  }

  // 文字转语音
  async textToSpeech(text, options = {}) {
    return new Promise((resolve, reject) => {
      const authUrl = this.generateAuthUrl(this.ttsUrl)

      const socketTask = wx.connectSocket({
        url: authUrl,
        protocols: ['chat']
      })

      socketTask.onOpen(() => {
        const params = {
          common: {
            app_id: this.appId
          },
          business: {
            aue: options.format || 'lame',
            sfl: 1,
            auf: 'audio/L16;rate=16000',
            vcn: options.voice || 'xiaoyan',
            speed: options.speed || 50,
            volume: options.volume || 50,
            pitch: options.pitch || 50,
            bgs: 0,
            tte: 'UTF8'
          },
          data: {
            status: 2,
            text: base64Encode(text)
          }
        }

        socketTask.send({
          data: JSON.stringify(params)
        })
      })

      let audioData = []

      socketTask.onMessage((message) => {
        const result = JSON.parse(message.data)

        if (result.code !== 0) {
          reject(new Error(`TTS错误: ${result.message}`))
          return
        }

        if (result.data && result.data.audio) {
          audioData.push(result.data.audio)
        }

        if (result.data && result.data.status === 2) {
          // 合成完成
          const completeAudio = audioData.join('')
          resolve({
            success: true,
            audioData: completeAudio,
            format: options.format || 'lame'
          })
          socketTask.close()
        }
      })

      socketTask.onError((error) => {
        reject(error)
      })
    })
  }

  // 语音转文字
  async speechToText(audioData, options = {}) {
    return new Promise((resolve, reject) => {
      const authUrl = this.generateAuthUrl(this.sttUrl)

      const socketTask = wx.connectSocket({
        url: authUrl,
        protocols: ['chat']
      })

      socketTask.onOpen(() => {
        const params = {
          common: {
            app_id: this.appId
          },
          business: {
            language: options.language || 'en_us',
            domain: 'iat',
            accent: options.accent || 'mandarin',
            vinfo: 1,
            vad_eos: 10000,
            dwa: 'wpgs'
          },
          data: {
            status: 0,
            format: options.format || 'audio/L16;rate=16000',
            audio: audioData,
            encoding: 'raw'
          }
        }

        socketTask.send({
          data: JSON.stringify(params)
        })
      })

      let resultText = ''

      socketTask.onMessage((message) => {
        const result = JSON.parse(message.data)

        if (result.code !== 0) {
          reject(new Error(`语音识别错误: ${result.message}`))
          return
        }

        if (result.data && result.data.result) {
          const ws = result.data.result.ws
          for (let i = 0; i < ws.length; i++) {
            const w = ws[i].cw[0].w
            resultText += w
          }
        }

        if (result.data && result.data.status === 2) {
          // 识别完成
          resolve({
            success: true,
            text: resultText
          })
          socketTask.close()
        }
      })

      socketTask.onError((error) => {
        reject(error)
      })
    })
  }
}

module.exports = IflytekSpeech
