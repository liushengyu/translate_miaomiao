// 统一服务管理器
const BaiduTranslateService = require('./services/baidu-translate.js')
const BaiduSpeechService = require('./services/baidu-speech.js')
const TencentTranslate = require('./tencent-translate.js')
const WechatSpeech = require('./speech.js')
const IflytekSpeech = require('./iflytek-speech.js')
const { getConfig } = require('../config/api-config.js')

class ServiceManager {
  constructor() {
    this.config = getConfig()
    this.translateService = null
    this.speechService = null
    this.init()
  }

  // 初始化服务
  init() {
    console.log('初始化服务管理器，配置:', this.config)

    // 初始化翻译服务 - 优先使用百度翻译
    if (!this.config.useMock) {
      if (this.config.baidu && this.config.baidu.translate && this.config.baidu.translate.appid) {
        // 百度翻译
        console.log('使用百度翻译服务')
        this.translateService = new BaiduTranslateService()
      } else if (this.config.tencent && this.config.tencent.translate && this.config.tencent.translate.secretId) {
        // 腾讯翻译
        console.log('使用腾讯翻译服务')
        this.translateService = new TencentTranslate(
          this.config.tencent.translate.secretId,
          this.config.tencent.translate.secretKey,
          this.config.tencent.translate.region
        )
      }

      // 初始化语音服务 - 优先使用百度语音
      if (this.config.baidu && this.config.baidu.speech && this.config.baidu.speech.apiKey) {
        // 百度语音
        console.log('使用百度语音服务')
        this.speechService = new BaiduSpeechService()
      } else if (this.config.iflytek && this.config.iflytek.speech && this.config.iflytek.speech.appId) {
        // 科大讯飞语音
        console.log('使用科大讯飞语音服务')
        this.speechService = new IflytekSpeech(
          this.config.iflytek.speech.appId,
          this.config.iflytek.speech.apiSecret,
          this.config.iflytek.speech.apiKey
        )
      } else {
        // 微信原生语音
        console.log('使用微信原生语音服务')
        this.speechService = new WechatSpeech()
      }
    } else {
      console.log('当前使用模拟服务')
    }
  }

  // 翻译文本 - 更新版本支持多语言和格式保留
  async translate(text, from = 'auto', to = 'zh') {
    try {
      if (this.config.useMock) {
        // 开发环境使用模拟数据
        return this.mockTranslate(text, from, to)
      }

      if (!this.translateService) {
        throw new Error('翻译服务未初始化')
      }

      console.log(`开始翻译: ${text} (${from} -> ${to})`)

      // 检查文本是否包含换行符和特殊格式
      const hasFormatting = text.includes('\n') || text.includes('\r')

      let result
      if (hasFormatting) {
        // 分段翻译以保留格式
        result = await this.translateWithFormatting(text, from, to)
      } else {
        // 直接翻译
        result = await this.translateService.translate(text, from, to)
      }

      // 保存翻译历史
      const translatedText = result.text || result.translatedText || result.dst || text
      this.saveTranslationHistory(text, translatedText)

      return {
        text: translatedText,
        detectedLanguage: result.detectedLanguage || result.from || result.sourceLanguage,
        from: from,
        to: to,
        provider: result.provider || 'unknown'
      }
    } catch (error) {
      console.error('翻译失败:', error)
      // 降级到模拟翻译
      return this.mockTranslate(text, from, to)
    }
  }

  // 分段翻译以保留格式
  async translateWithFormatting(text, from, to) {
    try {
      // 按换行符分割文本
      const lines = text.split(/\r?\n/)
      const translatedLines = []

      for (const line of lines) {
        if (line.trim() === '') {
          // 保留空行
          translatedLines.push('')
        } else {
          // 翻译非空行
          const lineResult = await this.translateService.translate(line, from, to)
          const translatedLine = lineResult.translatedText || lineResult.text || lineResult.dst || line
          translatedLines.push(translatedLine)
        }
      }

      return {
        text: translatedLines.join('\n'),
        translatedText: translatedLines.join('\n'),
        from: from,
        to: to,
        provider: 'formatted'
      }
    } catch (error) {
      console.error('格式化翻译失败:', error)
      // 降级到直接翻译
      return await this.translateService.translate(text, from, to)
    }
  }

  // 语音播放 - 简化版本
  async speak(text, options = {}) {
    try {
      if (this.config.useMock) {
        // 开发环境使用模拟播放
        return this.mockSpeak(text)
      }

      if (!this.speechService) {
        throw new Error('语音服务未初始化')
      }

      console.log(`开始语音播放: ${text}`)

      // 如果是百度语音服务，直接播放
      if (this.speechService instanceof BaiduSpeechService) {
        await this.speechService.playText(text, options)
        return { success: true, message: '播放完成' }
      } else {
        // 其他语音服务的TTS方法
        const result = await this.speechService.textToSpeech(text, options)
        return result
      }
    } catch (error) {
      console.error('语音播放失败:', error)
      // 降级到模拟播放
      return this.mockSpeak(text)
    }
  }

  // 停止语音播放
  stop() {
    try {
      if (this.config.useMock) {
        console.log('模拟停止语音播放')
        return { success: true, message: '已停止播放' }
      }

      if (!this.speechService) {
        console.warn('语音服务未初始化')
        return { success: false, message: '语音服务未初始化' }
      }

      console.log('停止语音播放')

      // 如果是百度语音服务，调用停止方法
      if (this.speechService instanceof BaiduSpeechService) {
        this.speechService.stopCurrentPlayback()
        return { success: true, message: '已停止播放' }
      } else if (this.speechService.stop) {
        // 其他语音服务的停止方法
        this.speechService.stop()
        return { success: true, message: '已停止播放' }
      } else {
        console.warn('当前语音服务不支持停止功能')
        return { success: false, message: '当前语音服务不支持停止功能' }
      }
    } catch (error) {
      console.error('停止语音播放失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 文字转语音（获取音频数据）
  async textToSpeech(text, options = {}) {
    try {
      if (this.config.useMock) {
        return { success: false, message: '模拟模式不提供音频数据' }
      }

      if (!this.speechService) {
        throw new Error('语音服务未初始化')
      }

      if (this.speechService instanceof BaiduSpeechService) {
        const result = await this.speechService.textToSpeech(text, options)
        return { success: true, ...result }
      } else {
        return await this.speechService.textToSpeech(text, options)
      }
    } catch (error) {
      console.error('语音合成失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 语音转文字
  async speechToText(audioData, options = {}) {
    try {
      if (this.config.useMock) {
        return { success: true, text: '这是模拟识别的文字' }
      }

      if (!this.speechService) {
        throw new Error('语音服务未初始化')
      }

      return await this.speechService.speechToText(audioData, options)
    } catch (error) {
      console.error('语音识别失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 语言检测 - 增强版本
  async detectLanguage(text) {
    try {
      if (this.config.useMock) {
        return this.mockDetectLanguage(text)
      }

      if (this.translateService && this.translateService.detectLanguage) {
        const result = await this.translateService.detectLanguage(text)
        return {
          language: result.language || result,
          confidence: result.confidence || 0.9
        }
      }

      // 降级到简单的语言检测
      return this.mockDetectLanguage(text)
    } catch (error) {
      console.error('语言检测失败:', error)
      return this.mockDetectLanguage(text)
    }
  }

  // 词典查询
  async queryDictionary(word) {
    try {
      if (this.config.useMock) {
        return this.mockDictionaryQuery(word)
      }

      if (this.translateService && this.translateService.queryDictionary) {
        return await this.translateService.queryDictionary(word)
      }

      // 降级到基本翻译
      const translation = await this.translate(word, 'auto', 'zh')
      return {
        word: word,
        definition: translation.text,
        provider: 'translate_fallback'
      }
    } catch (error) {
      console.error('词典查询失败:', error)
      return this.mockDictionaryQuery(word)
    }
  }

  // 模拟翻译（开发/降级使用）- 增强版本，支持格式保留
  mockTranslate(text, from = 'auto', to = 'zh') {
    const mockDict = {
      // 英文到中文
      'hello': '你好',
      'world': '世界',
      'good morning': '早上好',
      'thank you': '谢谢',
      'how are you': '你好吗',
      'nice to meet you': '很高兴见到你',
      'goodbye': '再见',
      'please': '请',
      'sorry': '对不起',
      'yes': '是',
      'no': '不',
      'welcome': '欢迎',
      'help': '帮助',
      'love': '爱',
      'friend': '朋友',
      'family': '家庭',
      'work': '工作',
      'school': '学校',
      'food': '食物',
      'water': '水',
      'money': '钱',
      'time': '时间',
      'today': '今天',
      'tomorrow': '明天',
      'yesterday': '昨天',

      // 中文到英文
      '你好': 'hello',
      '世界': 'world',
      '早上好': 'good morning',
      '谢谢': 'thank you',
      '你好吗': 'how are you',
      '很高兴见到你': 'nice to meet you',
      '再见': 'goodbye',
      '请': 'please',
      '对不起': 'sorry',
      '是': 'yes',
      '不': 'no',
      '欢迎': 'welcome',
      '帮助': 'help',
      '爱': 'love',
      '朋友': 'friend',
      '家庭': 'family',
      '工作': 'work',
      '学校': 'school',
      '食物': 'food',
      '水': 'water',
      '钱': 'money',
      '时间': 'time',
      '今天': 'today',
      '明天': 'tomorrow',
      '昨天': 'yesterday',

      // 其他语言示例
      'bonjour': '你好', // 法语
      'hola': '你好', // 西班牙语
      'guten tag': '你好', // 德语
      'こんにちは': '你好', // 日语
      '안녕하세요': '你好', // 韩语
      'привет': '你好', // 俄语
      'ciao': '你好', // 意大利语
      'olá': '你好', // 葡萄牙语
    }

    const detectedLanguage = this.mockDetectLanguage(text).language

    // 检查是否包含换行符，保留格式
    if (text.includes('\n') || text.includes('\r')) {
      const lines = text.split(/\r?\n/)
      const translatedLines = lines.map(line => {
        if (line.trim() === '') {
          return ''
        }

        const lowerLine = line.toLowerCase()
        let translatedLine = mockDict[lowerLine] || mockDict[line]

        if (!translatedLine) {
          if (to === 'zh') {
            translatedLine = `${line}的翻译结果`
          } else if (to === 'en') {
            translatedLine = `Translation of ${line}`
          } else {
            translatedLine = `[${to}] ${line}`
          }
        }

        return translatedLine
      })

      return {
        text: translatedLines.join('\n'),
        detectedLanguage: detectedLanguage,
        from: from === 'auto' ? detectedLanguage : from,
        to: to,
        provider: 'mock'
      }
    }

    // 单行翻译
    const lowerText = text.toLowerCase()
    let translatedText = mockDict[lowerText] || mockDict[text]

    if (!translatedText) {
      // 如果没有找到对应翻译，根据目标语言生成
      if (to === 'zh') {
        translatedText = `${text}的翻译结果`
      } else if (to === 'en') {
        translatedText = `Translation of ${text}`
      } else {
        translatedText = `[${to}] ${text}`
      }
    }

    return {
      text: translatedText,
      detectedLanguage: detectedLanguage,
      from: from === 'auto' ? detectedLanguage : from,
      to: to,
      provider: 'mock'
    }
  }

  // 模拟语音播放
  mockSpeak(text) {
    console.log(`模拟语音播放: ${text}`)

    // 在微信小程序环境中显示提示
    if (typeof wx !== 'undefined') {
      wx.showToast({
        title: `正在播放: ${text.slice(0, 10)}${text.length > 10 ? '...' : ''}`,
        icon: 'none',
        duration: 1500
      })
    } else {
      console.log(`🎵 语音播放: ${text}`)
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: '模拟播放完成' })
      }, 1000)
    })
  }

  // 模拟语言检测
  mockDetectLanguage(text) {
    const patterns = {
      'zh': /[\u4e00-\u9fa5]/,  // 中文
      'ja': /[\u3040-\u309f\u30a0-\u30ff]/,  // 日语
      'ko': /[\uac00-\ud7af]/,  // 韩语
      'ar': /[\u0600-\u06ff]/,  // 阿拉伯语
      'th': /[\u0e00-\u0e7f]/,  // 泰语
      'ru': /[\u0400-\u04ff]/,  // 俄语
      'fr': /\b(le|la|les|un|une|des|et|ou|mais|donc|or|ni|car|de|du|des|à|au|aux)\b/i,  // 法语
      'es': /\b(el|la|los|las|un|una|unos|unas|y|o|pero|si|no|de|del|al|con)\b/i,  // 西班牙语
      'de': /\b(der|die|das|ein|eine|und|oder|aber|wenn|nicht|von|zu|mit|auf)\b/i,  // 德语
      'it': /\b(il|la|lo|gli|le|un|una|e|o|ma|se|non|di|da|in|con|su|per)\b/i,  // 意大利语
      'pt': /\b(o|a|os|as|um|uma|e|ou|mas|se|não|de|da|do|em|com|por|para)\b/i,  // 葡萄牙语
    }

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return {
          language: lang,
          confidence: 0.8
        }
      }
    }

    // 默认检测为英语
    return {
      language: 'en',
      confidence: 0.6
    }
  }

  // 模拟词典查询
  mockDictionaryQuery(word) {
    const dictionary = {
      'hello': {
        word: 'hello',
        definition: '你好；喂（用于打招呼）\n[名词] 问候，招呼\n[例句] Hello, how are you? 你好，你好吗？',
        pronunciation: '/həˈləʊ/',
        partOfSpeech: '感叹词，名词'
      },
      'world': {
        word: 'world',
        definition: '世界；地球；领域\n[名词] 世界，地球；世人；世俗；特定领域\n[例句] Welcome to the world! 欢迎来到这个世界！',
        pronunciation: '/wɜːld/',
        partOfSpeech: '名词'
      },
      'love': {
        word: 'love',
        definition: '爱；热爱；喜欢\n[动词] 爱，热爱，喜欢\n[名词] 爱，爱情，热爱\n[例句] I love you. 我爱你。',
        pronunciation: '/lʌv/',
        partOfSpeech: '动词，名词'
      },
      '你好': {
        word: '你好',
        definition: 'hello；用于见面或通话时的问候语\n[感叹词] 表示见面时或电话中招呼用语\n[例句] 你好，请问您找谁？',
        pronunciation: 'nǐ hǎo',
        partOfSpeech: '感叹词'
      },
      '世界': {
        word: '世界',
        definition: 'world；地球上所有地方；人类社会\n[名词] 地球，世间，领域\n[例句] 世界那么大，我想去看看。',
        pronunciation: 'shì jiè',
        partOfSpeech: '名词'
      }
    }

    const entry = dictionary[word.toLowerCase()] || dictionary[word]

    if (entry) {
      return entry
    }

    // 如果没有找到，返回基本翻译
    const translation = this.mockTranslate(word, 'auto', 'zh')
    return {
      word: word,
      definition: `${word}: ${translation.text}\n[翻译] ${translation.text}`,
      pronunciation: '[暂无音标]',
      partOfSpeech: '[暂无词性]'
    }
  }

  // 保存翻译历史
  saveTranslationHistory(original, translation) {
    try {
      const history = wx.getStorageSync('translationHistory') || []
      const newRecord = {
        id: Date.now(),
        original,
        translation,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString()
      }

      history.unshift(newRecord)

      // 只保留最近100条记录
      if (history.length > 100) {
        history.splice(100)
      }

      wx.setStorageSync('translationHistory', history)
    } catch (error) {
      console.error('保存翻译历史失败:', error)
    }
  }

  // 获取翻译历史
  getTranslationHistory() {
    try {
      return wx.getStorageSync('translationHistory') || []
    } catch (error) {
      console.error('获取翻译历史失败:', error)
      return []
    }
  }

  // 清除翻译历史
  clearTranslationHistory() {
    try {
      wx.removeStorageSync('translationHistory')
      return true
    } catch (error) {
      console.error('清除翻译历史失败:', error)
      return false
    }
  }

  // 重新初始化服务（供外部调用）
  reinit() {
    this.config = getConfig()
    this.init()
  }

  // 获取服务状态
  getServiceStatus() {
    return {
      translate: !!this.translateService,
      speech: !!this.speechService,
      useMock: this.config.useMock || false
    }
  }
}

// 创建全局实例
const serviceManager = new ServiceManager()

module.exports = serviceManager
