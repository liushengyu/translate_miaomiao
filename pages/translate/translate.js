const app = getApp()
const serviceManager = require('../../utils/service-manager.js')

Page({
  data: {
    inputText: '',
    translatedText: '',
    fromLanguage: 'auto',
    toLanguage: 'zh',
    isTranslating: false,
    isPlaying: false,
    processedOriginalText: [],
    processedTranslatedText: [],
    currentPlayingIndex: -1,
    currentPlayingType: '', // 'original' 或 'translation'
    showModal: false,
    queryWord: '',
    wordDefinition: '',
    serviceStatus: {},
    detectedLanguage: '',

    // 自动翻译开关
    autoTranslate: true,

    // 文本选择相关
    showTextMenu: false,
    selectedText: '',
    menuPosition: { x: 0, y: 0 },
    selectionType: '', // 'original' 或 'translation'

    // 语言选择器相关数据
    languageOptions: {
      'auto': '自动检测',
      'zh': '中文',
      'en': '英语',
      'ja': '日语',
      'ko': '韩语',
      'fr': '法语',
      'de': '德语',
      'es': '西班牙语',
      'it': '意大利语',
      'ru': '俄语',
      'pt': '葡萄牙语',
      'ar': '阿拉伯语',
      'th': '泰语',
      'vi': '越南语',
      'id': '印尼语',
      'ms': '马来语',
      'hi': '印地语',
      'tr': '土耳其语',
      'pl': '波兰语',
      'nl': '荷兰语',
      'sv': '瑞典语',
      'da': '丹麦语',
      'no': '挪威语',
      'fi': '芬兰语',
      'cs': '捷克语',
      'sk': '斯洛伐克语',
      'hu': '匈牙利语',
      'ro': '罗马尼亚语',
      'bg': '保加利亚语',
      'hr': '克罗地亚语',
      'sl': '斯洛文尼亚语',
      'et': '爱沙尼亚语',
      'lv': '拉脱维亚语',
      'lt': '立陶宛语',
      'uk': '乌克兰语',
      'be': '白俄罗斯语',
      'ca': '加泰罗尼亚语',
      'eu': '巴斯克语',
      'gl': '加利西亚语',
      'cy': '威尔士语',
      'ga': '爱尔兰语',
      'mt': '马耳他语',
      'is': '冰岛语',
      'mk': '马其顿语',
      'sq': '阿尔巴尼亚语',
      'sr': '塞尔维亚语',
      'bs': '波斯尼亚语',
      'me': '黑山语'
    },

    fromLanguageIndex: 0, // 对应 'auto'
    toLanguageIndex: 0,   // 对应 'zh'
    languageNames: [],    // 源语言选择器显示的名称数组
    targetLanguageNames: [], // 目标语言选择器显示的名称数组
    languageCodes: [],    // 对应的语言代码数组
    targetLanguageCodes: [], // 目标语言代码数组

    // 连续选择相关
    isSelectingResult: false,
    resultStartIndex: -1,
    resultEndIndex: -1,
    resultSelectionRange: { start: -1, end: -1 },
    selectedResultText: '',
    resultWords: [],

    // 双击选词相关
    isSelectingMode: false,
    selectionStartIndex: -1,
    selectionEndIndex: -1,
    selectedWordCount: 0
  },

  onLoad: function (options) {
    console.log('翻译页面onLoad被调用')
    this.initLanguageSelectors()
    this.checkServiceStatus()

    // 验证方法是否存在
    console.log('onInputText方法存在:', typeof this.onInputText === 'function')
    console.log('autoTranslateIfReady方法存在:', typeof this.autoTranslateIfReady === 'function')
  },

  onShow: function () {
    this.checkServiceStatus()
  },

  // 初始化语言选择器
  initLanguageSelectors: function() {
    const languageOptions = this.data.languageOptions

    // 源语言选择器（包含自动检测）
    const languageCodes = Object.keys(languageOptions)
    const languageNames = languageCodes.map(code => languageOptions[code])

    // 目标语言选择器（不包含自动检测）
    const targetLanguageCodes = languageCodes.filter(code => code !== 'auto')
    const targetLanguageNames = targetLanguageCodes.map(code => languageOptions[code])

    // 设置默认索引
    const fromLanguageIndex = languageCodes.indexOf(this.data.fromLanguage)
    const toLanguageIndex = targetLanguageCodes.indexOf(this.data.toLanguage)

    this.setData({
      languageCodes,
      languageNames,
      targetLanguageCodes,
      targetLanguageNames,
      fromLanguageIndex: fromLanguageIndex >= 0 ? fromLanguageIndex : 0,
      toLanguageIndex: toLanguageIndex >= 0 ? toLanguageIndex : 0
    })
  },

  // 源语言变化
  onFromLanguageChange: function(e) {
    const index = parseInt(e.detail.value)
    const fromLanguage = this.data.languageCodes[index]

    this.setData({
      fromLanguage,
      fromLanguageIndex: index,
      detectedLanguage: '' // 清除之前的检测结果
    })

    // 如果有输入文本，自动检测或重新翻译
    if (this.data.inputText && fromLanguage !== 'auto') {
      this.autoTranslateIfReady()
    }
  },

  // 目标语言变化
  onToLanguageChange: function(e) {
    const index = parseInt(e.detail.value)
    const toLanguage = this.data.targetLanguageCodes[index]

    this.setData({
      toLanguage,
      toLanguageIndex: index
    })

    // 如果有输入文本，自动重新翻译
    if (this.data.inputText) {
      this.autoTranslateIfReady()
    }
  },

  // 输入文本变化
  onInputText(e) {
    const value = e.detail.value
    this.setData({
      inputText: value
    })

    // 处理原文用于选词
    if (value.trim()) {
      const processedOriginal = this.processTextForReading(value)
      this.setData({
        processedOriginalText: processedOriginal
      })
    } else {
      this.setData({
        processedOriginalText: []
      })
    }

    // 如果开启了自动翻译，触发防抖翻译
    if (this.data.autoTranslate && value.trim()) {
      this.autoTranslateIfReady()
    }
  },

  // 自动翻译防抖处理 - 增强版
  autoTranslateIfReady: function() {
    console.log('autoTranslateIfReady被调用')
    // 清除之前的定时器
    if (this.translateTimer) {
      console.log('清除之前的定时器')
      clearTimeout(this.translateTimer)
      this.translateTimer = null
    }

    // 如果正在翻译，不设置新的定时器
    if (this.data.isTranslating) {
      console.log('正在翻译中，跳过设置定时器')
      return
    }

    const inputText = this.data.inputText.trim()
    console.log('当前输入文本:', inputText, '长度:', inputText.length)

    // 只有当输入文本足够长时才启动定时器
    if (inputText && inputText.length >= 2) {
      console.log('设置2.5秒后自动翻译')
      this.translateTimer = setTimeout(() => {
        console.log('定时器执行，准备翻译')
        // 再次检查是否还在翻译状态
        if (!this.data.isTranslating && this.data.inputText.trim()) {
          console.log('开始自动翻译')
          this.translateText(true) // true 表示自动翻译，不显示成功提示
        } else {
          console.log('跳过翻译：正在翻译中或输入为空')
        }
        this.translateTimer = null
      }, 2500) // 增加到2.5秒防抖
    } else {
      console.log('输入文本不足，不设置定时器')
    }
  },

  // 自动检测语言
  async detectLanguageAuto(text) {
    try {
      const result = await serviceManager.detectLanguage(text)
      if (result && result.language) {
        this.setData({
          detectedLanguage: result.language
        })
        return result.language
      }
    } catch (error) {
      console.error('自动语言检测失败:', error)
    }
    return null
  },

  // 处理文本用于朗读（智能分词）
  processTextForReading: function(text) {
    // 增强输入验证和类型转换
    if (!text) return []

    // 确保输入是字符串类型
    if (typeof text !== 'string') {
      // 如果是对象，尝试提取text属性
      if (typeof text === 'object' && text.text) {
        text = text.text
      } else {
        // 转换为字符串
        text = String(text)
      }
    }

    // 再次验证是否为有效字符串
    if (!text || typeof text !== 'string') {
      console.warn('processTextForReading: 无效的文本输入', text)
      return []
    }

    console.log('开始处理翻译文本:', text)

    // 使用正则表达式进行智能分词
    const regex = /[\u4e00-\u9fa5]|[a-zA-Z]+|[0-9]+|[.,!?;:'"()[\]{}\-]/g
    const matches = text.match(regex) || []

    console.log('匹配到的词汇:', matches)

    // 过滤空内容并创建单词数据
    const processedWords = matches
      .filter(token => token && token.trim())
      .map((token, index) => {
        const isWord = /[\u4e00-\u9fa5a-zA-Z0-9]/.test(token)
        return {
          text: token,
          index: index,
          isWord: isWord,
          isSelected: false,
          isPlaying: false,
          type: isWord ? 'word' : 'punctuation'
        }
      })

    console.log('处理后的词汇数组:', processedWords)
    console.log('处理后的词汇数量:', processedWords.length)

    return processedWords
  },

  // 预处理文本，去除无效字符，只保留文字和标点符号
  preprocessText: function(text) {
    if (!text) return '';

    // 去除多余的空白字符，保留单个空格
    text = text.replace(/\s+/g, ' ').trim();

    // 只保留中文、英文、数字、常用标点符号和空格
    text = text.replace(/[^\u4e00-\u9fa5\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4fa-zA-Z0-9\s\.\,\;\:\!\?\-\(\)\[\]\{\}\"\'""''…、。，；：！？（）【】《》「」『』\u2014\u2013\u2026]/g, '');

    // 清理连续的标点符号，最多保留2个
    text = text.replace(/([.。!！?？,，;；:：]){3,}/g, '$1$1');

    // 去除首尾标点符号（除了引号）
    text = text.replace(/^[.。!！?？,，;；:：\-\s]+|[.。!！?？,，;；:：\-\s]+$/g, '');

    return text.trim();
  },

  // 翻译文本
  async translateText(isAutoTranslate = false) {
    if (!this.data.inputText.trim()) {
      return
    }

    this.setData({
      isTranslating: true,
      translatedText: ''
    })

    try {
      let fromLang = this.data.fromLanguage
      let detectedLang = ''

      // 如果是自动检测，先检测语言
      if (fromLang === 'auto') {
        detectedLang = await this.detectLanguageAuto(this.data.inputText)
        fromLang = detectedLang || 'en'

        this.setData({
          detectedLanguage: this.data.languageOptions[detectedLang] || ''
        })
      }

      // 执行翻译
      const result = await serviceManager.translate(
        this.data.inputText,
        fromLang,
        this.data.toLanguage
      )

      // 获取翻译的文本内容
      const translatedText = result.text || result || ''

      // 处理翻译结果用于朗读 - 修复：确保传入字符串
      const processedTranslated = this.processTextForReading(translatedText)

      this.setData({
        translatedText: translatedText,
        processedTranslatedText: processedTranslated,
        isTranslating: false
      })

    } catch (error) {
      console.error('翻译失败:', error)
      this.setData({
        isTranslating: false
      })

      if (!isAutoTranslate) {
        wx.showToast({
          title: '翻译失败，请重试',
          icon: 'none'
        })
      }
    }
  },

  // 文本长按事件
  onTextLongPress: function(e) {
    this.showTextSelectionMenu(e)
  },

  // 文本触摸开始
  onTextTouchStart: function(e) {
    this.touchStartTime = Date.now()
  },

  // 文本触摸移动
  onTextTouchMove: function(e) {
    // 处理文本选择
  },

  // 文本触摸结束
  onTextTouchEnd: function(e) {
    const touchEndTime = Date.now()
    const touchDuration = touchEndTime - this.touchStartTime

    // 如果是长按（超过500ms），显示菜单
    if (touchDuration >= 500) {
      this.showTextSelectionMenu(e)
    }
  },

  // 显示文本选择菜单
  showTextSelectionMenu: function(e) {
    const { text, type } = e.currentTarget.dataset

    // 获取用户选中的文本（这是一个简化的实现）
    // 在实际应用中，可能需要更复杂的文本选择逻辑
    const selectedText = this.getSelectedText() || text

    // 计算菜单位置 - 修复触摸坐标获取错误
    let clientX, clientY

    if (e.touches && e.touches.length > 0) {
      // 触摸开始或移动事件
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      // 触摸结束事件
      clientX = e.changedTouches[0].clientX
      clientY = e.changedTouches[0].clientY
    } else {
      // 默认位置（屏幕中央）
      clientX = 187.5
      clientY = 300
    }

    this.setData({
      showTextMenu: true,
      selectedText: selectedText,
      selectionType: type,
      menuPosition: {
        x: Math.max(10, Math.min(clientX - 50, 315)), // 确保菜单不超出屏幕边界
        y: Math.max(60, clientY - 80)  // 菜单高度 + 间距
      }
    })
  },

  // 获取选中的文本（简化实现）
  getSelectedText: function() {
    // 在实际实现中，这里可能需要调用小程序的文本选择API
    // 或者使用其他方法获取用户选中的文本
    return ''
  },

  // 隐藏文本菜单
  hideTextMenu: function() {
    this.setData({
      showTextMenu: false,
      selectedText: '',
      selectionType: ''
    })
  },

  // 朗读选中文本
  async speakSelectedText() {
    if (!this.data.selectedText) {
      return
    }

    this.setData({
      isPlaying: true
    })

    try {
      const language = this.data.selectionType === 'original'
        ? (this.data.detectedLanguage || this.data.fromLanguage)
        : this.data.toLanguage

      await serviceManager.speak(this.data.selectedText, language)

      this.exitSelectionMode()

    } catch (error) {
      console.error('朗读失败:', error)
      wx.showToast({
        title: '朗读失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        isPlaying: false
      })
    }
  },

  // 朗读原文
  speakOriginal() {
    if (!this.data.inputText) {
      return
    }

    this.setData({
      isPlaying: true
    })

    // 修复：直接使用detectedLanguage或fromLanguage，不调用不存在的getLanguageCode方法
    const language = this.data.detectedLanguage || this.data.fromLanguage

    serviceManager.speak(this.data.inputText, language).then(() => {
      console.log('朗读原文完成')
    }).catch(error => {
      console.error('朗读原文失败:', error)
      wx.showToast({
        title: '朗读失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({
        isPlaying: false
      })
    })
  },

  // 朗读译文
  speakResult() {
    if (!this.data.translatedText) {
      return
    }

    this.setData({
      isPlaying: true
    })

    serviceManager.speak(this.data.translatedText, this.data.toLanguage).then(() => {
      console.log('朗读译文完成')
    }).catch(error => {
      console.error('朗读译文失败:', error)
      wx.showToast({
        title: '朗读失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({
        isPlaying: false
      })
    })
  },

  // 停止播放
  stopPlaying() {
    try {
      serviceManager.stop()
      this.setData({
        isPlaying: false,
        currentPlayingIndex: -1,
        currentPlayingType: ''
      })
    } catch (error) {
      console.error('停止播放失败:', error)
    }
  },

  // 复制翻译结果
  copyResult: function() {
    if (!this.data.translatedText) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: this.data.translatedText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 清空输入
  clearInput: function() {
    this.setData({
      inputText: '',
      translatedText: '',
      processedOriginalText: [],
      processedTranslatedText: [],
      detectedLanguage: ''
    })

    wx.showToast({
      title: '已清空',
      icon: 'success'
    })
  },

  // 粘贴文本
  pasteText: function() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data.trim()
        if (text) {
          this.setData({
            inputText: text
          })

          // 处理文本用于朗读
          const processed = this.processTextForReading(text)
          this.setData({
            processedOriginalText: processed
          })

          // 自动检测语言并翻译
          if (this.data.fromLanguage === 'auto') {
            this.detectLanguageAuto(text)
          }
          this.autoTranslateIfReady()

          wx.showToast({
            title: '已粘贴文本',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: '剪贴板内容为空',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '粘贴失败',
          icon: 'none'
        })
      }
    })
  },

  // 播放翻译后的单词
  async playTranslatedWord(e) {
    const word = e.currentTarget.dataset.word
    const index = e.currentTarget.dataset.index

    if (!word) return

    try {
      this.setData({
        currentPlayingIndex: index,
        currentPlayingType: 'translation',
        isPlaying: true
      })

      await serviceManager.speak(word, this.data.toLanguage)

    } catch (error) {
      console.error('播放单词失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        isPlaying: false,
        currentPlayingIndex: -1,
        currentPlayingType: ''
      })
    }
  },

  // 语言检测
  async detectLanguage() {
    if (!this.data.inputText.trim()) {
      return
    }

    try {
      const detectedLang = await serviceManager.detectLanguage(this.data.inputText)
      const detectedName = this.data.languageOptions[detectedLang] || detectedLang

      this.setData({
        detectedLanguage: detectedName
      })

    } catch (error) {
      console.error('语言检测失败:', error)
      wx.showToast({
        title: '检测失败',
        icon: 'none'
      })
    }
  },

  // 词典查询
  async queryDictionary() {
    const word = this.data.queryWord.trim()
    if (!word) {
      return
    }

    try {
      const definition = await serviceManager.queryDictionary(word)
      this.setData({
        wordDefinition: definition
      })
    } catch (error) {
      console.error('词典查询失败:', error)
      wx.showToast({
        title: '查询失败',
        icon: 'none'
      })
    }
  },

  // 显示词典查询
  showDictionary() {
    this.setData({
      showModal: true,
      queryWord: '',
      wordDefinition: ''
    })
  },

  // 关闭模态框
  closeModal() {
    this.setData({
      showModal: false
    })
  },

  // 查询输入
  onQueryInput(e) {
    this.setData({
      queryWord: e.detail.value
    })
  },

  // 查询单词
  queryWord() {
    this.queryDictionary()
  },

  // 检查服务状态
  checkServiceStatus() {
    const status = serviceManager.getServiceStatus()
    this.setData({
      serviceStatus: status
    })
  },

  // 获取语言名称
  getLanguageName: function(code) {
    return this.data.languageOptions[code] || code
  },

  // 翻译结果文本触摸开始
  onTranslatedTextTouchStart: function(e) {
    const touch = e.touches[0]
    this.touchStartInfo = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }
    this.isSelecting = false
    this.selectionStartIndex = -1
    this.selectionEndIndex = -1

    // 清除之前的选择状态
    this.clearTranslatedTextSelection()
  },

  // 翻译结果文本触摸移动
  onTranslatedTextTouchMove: function(e) {
    const currentTouch = e.touches[0]
    const startInfo = this.touchStartInfo

    if (!startInfo) return

    const distance = Math.sqrt(
      Math.pow(currentTouch.clientX - startInfo.x, 2) +
      Math.pow(currentTouch.clientY - startInfo.y, 2)
    )

    // 如果移动距离超过阈值，开始选择模式
    if (distance > 20 && !this.isSelecting) {
      this.isSelecting = true
      this.startTranslatedTextSelection(startInfo.x, startInfo.y, currentTouch.clientX, currentTouch.clientY)
    } else if (this.isSelecting) {
      this.updateTranslatedTextSelection(currentTouch.clientX, currentTouch.clientY)
    }
  },

  // 翻译结果文本触摸结束
  onTranslatedTextTouchEnd: function(e) {
    const endTouch = e.changedTouches[0]
    const startInfo = this.touchStartInfo
    const touchDuration = startInfo ? Date.now() - startInfo.timestamp : 0

    if (this.isSelecting && this.selectionStartIndex >= 0 && this.selectionEndIndex >= 0) {
      // 滑动选择完成，播放选中的文本
      this.playSelectedTranslatedText()
    } else if (touchDuration >= 800) {
      // 长按选择单个词
      this.selectTranslatedWordAtPosition(endTouch.clientX, endTouch.clientY)
    }

    this.touchStartInfo = null
    this.isSelecting = false
  },

  // 开始翻译文本选择
  startTranslatedTextSelection: function(startX, startY, currentX, currentY) {
    const startIndex = this.getTranslatedWordIndexAtPosition(startX, startY)
    const currentIndex = this.getTranslatedWordIndexAtPosition(currentX, currentY)

    if (startIndex >= 0 && currentIndex >= 0) {
      const selectionStart = Math.min(startIndex, currentIndex)
      const selectionEnd = Math.max(startIndex, currentIndex)

      this.selectionStartIndex = selectionStart
      this.selectionEndIndex = selectionEnd

      this.highlightSelectedTranslatedWords(selectionStart, selectionEnd)
    }
  },

  // 更新翻译文本选择
  updateTranslatedTextSelection: function(currentX, currentY) {
    const currentIndex = this.getTranslatedWordIndexAtPosition(currentX, currentY)
    const startIndex = this.selectionStartIndex

    if (startIndex >= 0 && currentIndex >= 0) {
      const selectionStart = Math.min(startIndex, currentIndex)
      const selectionEnd = Math.max(startIndex, currentIndex)

      this.selectionEndIndex = selectionEnd
      this.highlightSelectedTranslatedWords(selectionStart, selectionEnd)
    }
  },

  // 获取翻译文本位置对应的单词索引
  getTranslatedWordIndexAtPosition: function(x, y) {
    const words = this.data.processedTranslatedText
    if (words.length === 0) return -1

    // 简单估算：根据触摸位置的相对比例来估算单词索引
    const relativePosition = Math.min(Math.max(x / 375, 0), 1) // 假设屏幕宽度375px
    const estimatedIndex = Math.floor(relativePosition * words.length)

    return Math.min(estimatedIndex, words.length - 1)
  },

  // 高亮选中的翻译文本
  highlightSelectedTranslatedWords: function(startIndex, endIndex) {
    const processedTranslatedText = this.data.processedTranslatedText.map((word, index) => ({
      ...word,
      isSelected: index >= startIndex && index <= endIndex
    }))

    this.setData({
      processedTranslatedText: processedTranslatedText
    })
  },

  // 选择指定位置的翻译文本单词
  selectTranslatedWordAtPosition: function(x, y) {
    const wordIndex = this.getTranslatedWordIndexAtPosition(x, y)

    if (wordIndex >= 0 && wordIndex < this.data.processedTranslatedText.length) {
      const word = this.data.processedTranslatedText[wordIndex]

      this.selectionStartIndex = wordIndex
      this.selectionEndIndex = wordIndex

      this.highlightSelectedTranslatedWords(wordIndex, wordIndex)

      // 延时播放选中的单词
      setTimeout(() => {
        this.playSelectedTranslatedText()
      }, 200)
    }
  },

  // 播放选中的翻译文本
  async playSelectedTranslatedText() {
    const { selectionStartIndex, selectionEndIndex } = this

    if (selectionStartIndex >= 0 && selectionEndIndex >= 0) {
      const selectedWords = this.data.processedTranslatedText.slice(selectionStartIndex, selectionEndIndex + 1)
      const selectedText = selectedWords.map(word => word.text).join('').trim()

      if (!selectedText || this.data.isPlaying) {
        return
      }

      console.log('播放选中的翻译文本:', selectedText)

      this.setData({ isPlaying: true })

      try {
        await serviceManager.speak(selectedText, this.data.toLanguage)

        wx.showToast({
          title: '播放完成',
          icon: 'success',
          duration: 800
        })
      } catch (error) {
        console.error('播放选中文本失败:', error)
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
      } finally {
        this.setData({ isPlaying: false })
        // 延时清除选择状态
        setTimeout(() => {
          this.clearTranslatedTextSelection()
        }, 1000)
      }
    }
  },

  // 清除翻译文本选择状态
  clearTranslatedTextSelection: function() {
    const processedTranslatedText = this.data.processedTranslatedText.map(word => ({
      ...word,
      isSelected: false
    }))

    this.setData({
      processedTranslatedText: processedTranslatedText
    })

    this.selectionStartIndex = -1
    this.selectionEndIndex = -1
  },

  /**
   * 翻译结果区域触摸开始
   */
  onResultTouchStart(e) {
    const wordIndex = parseInt(e.currentTarget.dataset.index);
    if (wordIndex >= 0) {
      this.setData({
        isSelectingResult: true,
        resultStartIndex: wordIndex,
        resultEndIndex: wordIndex,
        resultSelectionRange: { start: wordIndex, end: wordIndex }
      });
      this.updateResultSelection(wordIndex, wordIndex);
    }
  },

  /**
   * 翻译结果区域触摸移动
   */
  onResultTouchMove(e) {
    if (!this.data.isSelectingResult) return;

    const touch = e.touches[0];
    const query = wx.createSelectorQuery();

    query.selectAll('.result-word').boundingClientRect((rects) => {
      if (!rects || rects.length === 0) return;

      let targetIndex = -1;
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex >= 0) {
        const start = Math.min(this.data.resultStartIndex, targetIndex);
        const end = Math.max(this.data.resultStartIndex, targetIndex);

        this.setData({
          resultEndIndex: targetIndex,
          resultSelectionRange: { start, end }
        });
        this.updateResultSelection(start, end);
      }
    }).exec();
  },

  /**
   * 翻译结果区域触摸结束
   */
  onResultTouchEnd(e) {
    if (!this.data.isSelectingResult) return;

    const { start, end } = this.data.resultSelectionRange;
    if (start >= 0 && end >= 0 && start <= end) {
      const selectedText = this.data.resultWords.slice(start, end + 1).map(word => word.text).join('');

      if (selectedText.trim()) {
        const touch = e.changedTouches[0];
        const menuX = Math.min(touch.clientX, wx.getSystemInfoSync().windowWidth - 200);
        const menuY = Math.max(touch.clientY - 60, 50);

        this.setData({
          selectedText: selectedText,
          selectedResultText: selectedText,
          selectionType: 'result',
          showTextMenu: true,
          textMenuX: menuX,
          textMenuY: menuY,
          menuPosition: { x: menuX, y: menuY },
          isSelectingResult: false
        });
      } else {
        this.clearResultSelection();
      }
    } else {
      this.clearResultSelection();
    }
  },

  /**
   * 更新翻译结果选择状态
   */
  updateResultSelection(start, end) {
    const words = this.data.resultWords.map((word, index) => ({
      ...word,
      selected: index >= start && index <= end
    }));

    this.setData({ resultWords: words });
  },

  /**
   * 清除翻译结果选择
   */
  clearResultSelection() {
    const words = this.data.resultWords.map(word => ({
      ...word,
      selected: false
    }));

    this.setData({
      resultWords: words,
      selectedResultText: '',
      showTextMenu: false,
      isSelectingResult: false,
      resultStartIndex: -1,
      resultEndIndex: -1,
      resultSelectionRange: { start: -1, end: -1 }
    });
  },

  /**
   * 处理翻译结果为单词数组
   */
  processTranslationResult(text) {
    if (!text) return [];

    // 简单按字符分割（可以根据需要优化分词逻辑）
    return text.split('').map((char, index) => ({
      text: char,
      index: index,
      selected: false
    }));
  },

  /**
   * 翻译选中的文本
   */
  async translateSelectedText() {
    let selectedText = this.data.selectedText || this.data.selectedResultText;

    if (!selectedText) {
      wx.showToast({
        title: '没有选中文本',
        icon: 'none'
      })
      return
    }

    this.hideTextMenu();

    try {
      this.setData({ isTranslating: true });

      const fromLang = this.data.selectionType === 'original' ?
        (this.data.fromLanguage === 'auto' ? this.data.detectedLanguage || 'zh' : this.data.fromLanguage) :
        this.data.toLanguage;

      const toLang = this.data.selectionType === 'original' ? this.data.toLanguage : this.data.fromLanguage;

      const result = await serviceManager.translate(selectedText, fromLang, toLang);

      this.setData({ isTranslating: false });

      // 显示翻译结果弹窗
      wx.showModal({
        title: '翻译结果',
        content: `原文：${selectedText}\n\n译文：${result}`,
        showCancel: true,
        cancelText: '关闭',
        confirmText: '朗读',
        success: (res) => {
          if (res.confirm) {
            // 朗读翻译结果
            serviceManager.speak(result, toLang).catch(err => {
              console.error('朗读失败:', err);
              wx.showToast({
                title: '朗读失败',
                icon: 'none'
              });
            });
          }
        }
      });

    } catch (error) {
      console.error('翻译失败:', error);
      this.setData({ isTranslating: false });

      wx.showToast({
        title: '翻译失败',
        icon: 'none'
      });
    }
  },

  /**
   * 复制选中的文本
   */
  copySelectedText() {
    if (!this.data.selectedText) {
      return
    }

    wx.setClipboardData({
      data: this.data.selectedText,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
        this.exitSelectionMode()
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 双击选词功能
  onWordTap(e) {
    const word = e.currentTarget.dataset.word
    const index = e.currentTarget.dataset.index
    const type = e.currentTarget.dataset.type || 'translation' // 'original' 或 'translation'

    if (!word) return

    if (!this.data.isSelectingMode) {
      // 第一次点击：设置选择起点
      this.setData({
        isSelectingMode: true,
        selectionStartIndex: index,
        selectionType: type
      })

      wx.showToast({
        title: '请点击结束位置',
        icon: 'none',
        duration: 1000
      })
    } else {
      // 第二次点击：设置选择终点并显示菜单
      const startIndex = this.data.selectionStartIndex
      const endIndex = index

      // 确保范围正确
      const actualStart = Math.min(startIndex, endIndex)
      const actualEnd = Math.max(startIndex, endIndex)

      // 获取对应的文本数组
      const textArray = type === 'original'
        ? this.data.processedOriginalText
        : this.data.processedTranslatedText

      // 提取选中的文本
      const selectedWords = textArray.slice(actualStart, actualEnd + 1)
      const selectedText = selectedWords.map(item => item.text || item).join('')

      this.setData({
        selectedText: selectedText,
        selectionStartIndex: actualStart,
        selectionEndIndex: actualEnd,
        selectionType: type,
        showSelectionMenu: true,
        selectedWordCount: actualEnd - actualStart + 1
      })

      // 更新选中状态的显示
      this.updateWordSelection(actualStart, actualEnd, type)
    }
  },

  // 退出选择模式
  exitSelectionMode() {
    this.setData({
      isSelectingMode: false,
      showSelectionMenu: false,
      selectedText: '',
      selectionStartIndex: -1,
      selectionEndIndex: -1,
      selectionType: '',
      selectedWordCount: 0
    })

    // 清除所有选中状态
    this.clearWordSelection()
  },

  // 更新单词选中状态
  updateWordSelection(startIndex, endIndex, type) {
    if (type === 'original' && this.data.processedOriginalText) {
      const updatedOriginal = this.data.processedOriginalText.map((item, index) => ({
        ...item,
        isSelected: index >= startIndex && index <= endIndex
      }))
      this.setData({
        processedOriginalText: updatedOriginal
      })
    } else if (type === 'translation' && this.data.processedTranslatedText) {
      const updatedTranslation = this.data.processedTranslatedText.map((item, index) => ({
        ...item,
        isSelected: index >= startIndex && index <= endIndex
      }))
      this.setData({
        processedTranslatedText: updatedTranslation
      })
    }
  },

  // 清除单词选中状态
  clearWordSelection() {
    if (this.data.processedOriginalText) {
      const clearedOriginal = this.data.processedOriginalText.map(item => ({
        ...item,
        isSelected: false
      }))
      this.setData({
        processedOriginalText: clearedOriginal
      })
    }

    if (this.data.processedTranslatedText) {
      const clearedTranslation = this.data.processedTranslatedText.map(item => ({
        ...item,
        isSelected: false
      }))
      this.setData({
        processedTranslatedText: clearedTranslation
      })
    }
  },

  // 手动翻译
  manualTranslate() {
    if (!this.data.inputText.trim()) {
      wx.showToast({
        title: '请输入要翻译的文本',
        icon: 'none'
      })
      return
    }
    this.translateText(false) // false 表示手动翻译，显示成功提示
  },
})
