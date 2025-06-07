// pages/reading/reading.js
const serviceManager = require('../../utils/service-manager')

Page({
  data: {
    inputText: '',
    processedWords: [],
    isProcessing: false,
    voiceSettings: {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    },
    statistics: {
      totalWords: 0,
      studiedWords: 0,
      studyTime: 0
    },
    // 今日学习统计
    todayStats: {
      wordsRead: 0,
      sentencesRead: 0,
      timeSpent: 0
    },
    // 收藏的单词
    favoriteWords: [],
    // 服务状态
    serviceStatus: {
      isLoaded: true,
      speechAvailable: true
    },
    // 单词详情模态框
    showWordModal: false,
    selectedWordDetail: {
      word: '',
      phonetic: '',
      meaning: ''
    },
    showTranslationBubble: false,
    bubbleContent: {
      word: '',
      translation: '',
      position: { x: 0, y: 0 }
    },
    translationCache: {},
    isPlayingAll: false,
    isPlaying: false,
    currentPlayingIndex: -1,
    currentPlayingWord: '',
    playingSequence: false,

    // 选择相关状态
    isSelectingMode: false,
    selectionStartIndex: -1,
    selectionEndIndex: -1,
    showSelectionMenu: false,
    selectedText: '',
    selectionMenuPosition: { x: 0, y: 0 },
    isSelecting: false,
    selectedRange: { start: -1, end: -1 }
  },

  onLoad: function() {
    this.loadUserData()
    this.loadStatistics()
  },

  onShow: function() {
    this.loadUserData()
  },

  // 加载用户数据
  loadUserData: function() {
    try {
      const voiceSettings = wx.getStorageSync('voiceSettings')
      if (voiceSettings) {
        this.setData({
          voiceSettings: voiceSettings
        })
      }

      // 加载收藏的单词
      const favoriteWords = wx.getStorageSync('favoriteWords') || []
      this.setData({
        favoriteWords: favoriteWords
      })

      // 加载今日统计
      const today = new Date().toDateString()
      const todayStatsKey = `todayStats_${today}`
      const todayStats = wx.getStorageSync(todayStatsKey) || {
        wordsRead: 0,
        sentencesRead: 0,
        timeSpent: 0
      }
      this.setData({
        todayStats: todayStats
      })

    } catch (error) {
      console.error('加载用户数据失败:', error)
    }
  },

  // 加载学习统计
  loadStatistics: function() {
    try {
      const statistics = wx.getStorageSync('statistics')
      if (statistics) {
        this.setData({
          statistics: statistics
        })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 保存学习统计
  saveStatistics: function() {
    try {
      wx.setStorageSync('statistics', this.data.statistics)

      // 保存今日统计
      const today = new Date().toDateString()
      const todayStatsKey = `todayStats_${today}`
      wx.setStorageSync(todayStatsKey, this.data.todayStats)
    } catch (error) {
      console.error('保存统计数据失败:', error)
    }
  },

  // 输入框内容变化
  onTextInput: function(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  // 预处理文本
  preprocessText: function(text) {
    if (!text || typeof text !== 'string') {
      return ''
    }

    // 移除不可见字符和多余空格
    let cleanText = text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // 移除零宽字符
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim()

    return cleanText
  },

  // 处理文本
  processText: function() {
    const inputText = this.data.inputText.trim()

    if (!inputText) {
      wx.showToast({
        title: '请输入文本',
        icon: 'none'
      })
      return
    }

    this.setData({
      isProcessing: true
    })

    wx.showToast({
      title: '正在处理...',
      icon: 'loading',
      duration: 2000
    })

    try {
      // 预处理文本
      const cleanText = this.preprocessText(inputText)

      // 使用改进的分词逻辑
      const processedWords = this.smartTokenize(cleanText)

      // 更新数据
      this.setData({
        processedWords: processedWords,
        isProcessing: false
      })

      // 预翻译英文单词
      this.preTranslateWords(processedWords)

      // 更新统计
      const wordCount = processedWords.filter(item => item.type === 'word').length
      this.setData({
        'statistics.totalWords': this.data.statistics.totalWords + wordCount
      })
      this.saveStatistics()

      wx.showToast({
        title: '处理完成',
        icon: 'success'
      })

    } catch (error) {
      console.error('处理文本失败:', error)
      this.setData({
        isProcessing: false
      })
      wx.showToast({
        title: '处理失败',
        icon: 'none'
      })
    }
  },

  // 智能分词
  smartTokenize: function(text) {
    const tokens = []
    let currentIndex = 0

    // 正则表达式匹配单词、标点符号和空格
    const regex = /([a-zA-Z]+(?:'[a-zA-Z]+)*)|([.!?;,:])|(\s+)|([^a-zA-Z\s.!?;,:]+)/g
    let match

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0]
      const word = match[1]
      const punctuation = match[2]
      const whitespace = match[3]
      const other = match[4]

      if (word) {
        // 英文单词
        tokens.push({
          text: word,
          type: 'word',
          isWord: true,
          index: currentIndex++
        })
      } else if (punctuation) {
        // 标点符号
        tokens.push({
          text: punctuation,
          type: 'punctuation',
          isWord: false,
          index: currentIndex++
        })
      } else if (whitespace) {
        // 空格
        tokens.push({
          text: whitespace,
          type: 'space',
          isWord: false,
          index: currentIndex++
        })
      } else if (other) {
        // 其他字符（数字、中文等）
        tokens.push({
          text: other,
          type: 'other',
          isWord: false,
          index: currentIndex++
        })
      }
    }

    return tokens
  },

  // 播放单词并显示翻译气泡
  playWordWithBubble: async function(e) {
    const dataset = e.currentTarget.dataset
    const word = dataset.word
    const index = dataset.index

    if (!word || !/[a-zA-Z]/.test(word)) return

    console.log('播放单词:', word, '索引:', index)

    try {
      // 同时开始播放语音和显示翻译气泡
      const playPromise = this.playWord(word)
      const bubblePromise = this.showTranslationBubbleAt(word, e)

      // 等待两个操作都完成
      await Promise.all([playPromise, bubblePromise])

    } catch (error) {
      console.error('播放单词失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    }
  },

  // 播放单词
  playWord: function(word) {
    return new Promise(async (resolve, reject) => {
      try {
        serviceManager.speak(word, {
          language: 'en',
          onComplete: () => {
            console.log('单词播放完成:', word)
            resolve()
          },
          onError: async (error) => {
            console.error('单词播放失败:', word, error)
            reject(error)
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  },

  // 长按开始选择
  onLongPress: function(e) {
    console.log('长按事件触发:', e)

    const dataset = e.currentTarget.dataset
    const wordIndex = parseInt(dataset.index)
    const word = dataset.text

    if (wordIndex === undefined || !word) {
      console.log('无效的长按目标')
      return
    }

    console.log('长按单词:', word, '索引:', wordIndex)

    // 触发震动反馈
    wx.vibrateShort()

    // 智能选择整个句子
    const sentenceRange = this.findSentenceRange(wordIndex)

    this.setData({
      isSelectingMode: true,
      selectionStartIndex: sentenceRange.start,
      selectionEndIndex: sentenceRange.end,
      showSelectionMenu: true,
      selectedText: this.getSelectedText(sentenceRange.start, sentenceRange.end),
      selectionMenuPosition: this.calculateMenuPosition(e)
    })

    // 高亮选中的文本
    this.highlightSelection(sentenceRange.start, sentenceRange.end)

    console.log('选择范围:', sentenceRange, '选中文本:', this.data.selectedText)
  },

  // 查找句子范围
  findSentenceRange: function(wordIndex) {
    const words = this.data.processedWords
    let start = wordIndex
    let end = wordIndex

    // 向前查找句子开始
    for (let i = wordIndex - 1; i >= 0; i--) {
      const word = words[i]
      if (word.type === 'punctuation' && /[.!?]/.test(word.text)) {
        start = i + 1
        break
      }
      if (i === 0) {
        start = 0
        break
      }
    }

    // 向后查找句子结束
    for (let i = wordIndex + 1; i < words.length; i++) {
      const word = words[i]
      if (word.type === 'punctuation' && /[.!?]/.test(word.text)) {
        end = i
        break
      }
      if (i === words.length - 1) {
        end = i
        break
      }
    }

    return { start, end }
  },

  // 获取选中的文本
  getSelectedText: function(startIndex, endIndex) {
    const words = this.data.processedWords
    let selectedText = ''

    for (let i = startIndex; i <= endIndex; i++) {
      if (words[i]) {
        selectedText += words[i].text
      }
    }

    return selectedText.trim()
  },

  // 计算菜单位置
  calculateMenuPosition: function(e) {
    const systemInfo = wx.getSystemInfoSync()
    let x = systemInfo.windowWidth / 2
    let y = 300

    // 尝试从事件获取位置
    if (e && e.touches && e.touches[0]) {
      x = e.touches[0].clientX
      y = e.touches[0].clientY - 100
    } else if (e && e.changedTouches && e.changedTouches[0]) {
      x = e.changedTouches[0].clientX
      y = e.changedTouches[0].clientY - 100
    }

    // 边界检查
    const menuWidth = 200
    const margin = 20

    if (x < menuWidth / 2 + margin) {
      x = menuWidth / 2 + margin
    }
    if (x > systemInfo.windowWidth - menuWidth / 2 - margin) {
      x = systemInfo.windowWidth - menuWidth / 2 - margin
    }

    if (y < 100) {
      y = 100
    }

    return { x, y }
  },

  // 高亮选中内容
  highlightSelection: function(startIndex, endIndex) {
    const processedWords = this.data.processedWords.map((word, index) => ({
      ...word,
      isSelected: index >= startIndex && index <= endIndex
    }))

    this.setData({
      processedWords: processedWords
    })
  },

  // 播放选中文本
  playSelectedText: async function() {
    if (!this.data.selectedText) {
      wx.showToast({
        title: '没有选中文本',
        icon: 'none'
      })
      return
    }

    try {
      // 提取英文单词
      const words = this.data.selectedText.match(/[a-zA-Z]+/g) || []

      if (words.length === 0) {
        wx.showToast({
          title: '没有找到英文单词',
          icon: 'none'
        })
        return
      }

      wx.showToast({
        title: '正在播放...',
        icon: 'loading'
      })

      // 逐个播放单词
      for (const word of words) {
        await this.playWord(word)
        await this.delay(300)
      }

      wx.showToast({
        title: '播放完成',
        icon: 'success'
      })

    } catch (error) {
      console.error('播放选中文本失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    }
  },

  // 翻译选中文本
  translateSelectedText: async function() {
    if (!this.data.selectedText) {
      wx.showToast({
        title: '没有选中文本',
        icon: 'none'
      })
      return
    }

    try {
      // 提取英文单词并获取翻译
      const words = this.data.selectedText.match(/[a-zA-Z]+/g) || []
      const translations = []

      for (const word of words) {
        const translation = await this.getTranslation(word)
        translations.push(`${word}: ${translation}`)
      }

      // 显示翻译结果
      const translationText = translations.join('\n')

      wx.showModal({
        title: '翻译结果',
        content: translationText,
        showCancel: false,
        confirmText: '确定'
      })

    } catch (error) {
      console.error('翻译失败:', error)
      wx.showToast({
        title: '翻译失败',
        icon: 'none'
      })
    }
  },

  // 取消选择
  cancelSelection: function() {
    this.clearSelection()
  },

  // 清除选择状态
  clearSelection: function() {
    // 清除高亮
    const processedWords = this.data.processedWords.map(word => ({
      ...word,
      isSelected: false
    }))

    this.setData({
      processedWords: processedWords,
      isSelectingMode: false,
      selectionStartIndex: -1,
      selectionEndIndex: -1,
      showSelectionMenu: false,
      selectedText: '',
      selectionMenuPosition: { x: 0, y: 0 }
    })
  },

  // 清除播放状态
  clearPlayingState: function() {
    this.setData({
      isPlayingAll: false,
      playingSequence: false,
      currentPlayingIndex: -1,
      currentPlayingWord: ''
    })

    // 清除高亮
    const processedWords = this.data.processedWords.map(word => ({
      ...word,
      isPlaying: false
    }))

    this.setData({
      processedWords: processedWords
    })
  },

  // 更新播放状态
  updatePlayingState: function(wordIndex) {
    const processedWords = this.data.processedWords.map((word, index) => ({
      ...word,
      isPlaying: index === wordIndex
    }))

    this.setData({
      processedWords: processedWords,
      currentPlayingWord: this.data.processedWords[wordIndex]?.text || ''
    })
  },

  // 停止播放
  stopReading: function() {
    this.setData({
      isPlayingAll: false,
      isPlaying: false,
      currentPlayingIndex: -1
    })

    // 清除所有高亮
    const processedWords = this.data.processedWords.map(word => ({
      ...word,
      isPlaying: false
    }))

    this.setData({
      processedWords: processedWords
    })

    wx.showToast({
      title: '已停止播放',
      icon: 'success',
      duration: 1000
    })
  },

  // 打开沉浸式阅读页面
  openImmersiveReading: function() {
    if (this.data.processedWords.length === 0) {
      wx.showToast({
        title: '请先处理文本',
        icon: 'none'
      })
      return
    }

    const immersiveData = {
      processedWords: this.data.processedWords,
      originalText: this.data.inputText
    }

    try {
      wx.setStorageSync('immersiveReadingData', immersiveData)

      wx.navigateTo({
        url: '/pages/immersive-reading/immersive-reading'
      })
    } catch (error) {
      console.error('跳转到沉浸式阅读页面失败:', error)
      wx.showToast({
        title: '页面跳转失败',
        icon: 'none'
      })
    }
  },

  // 显示翻译气泡
  showTranslationBubbleAt: async function(word, e) {
    if (!word || !/[a-zA-Z]/.test(word)) return

    console.log('显示翻译气泡，单词:', word, '事件对象:', e)

    try {
      // 获取翻译
      const translation = await this.getTranslation(word)

      console.log('获取到翻译:', word, '->', translation)

      // 计算气泡位置 - 改进位置计算逻辑
      const systemInfo = wx.getSystemInfoSync()
      let x, y

      // 尝试从不同的事件属性获取位置信息
      if (e && e.detail && e.detail.x !== undefined) {
        // 从detail中获取位置（某些组件事件）
        x = e.detail.x
        y = e.detail.y - 100
      } else if (e && e.touches && e.touches[0]) {
        // 从touches获取位置（触摸事件）
        x = e.touches[0].clientX
        y = e.touches[0].clientY - 100
      } else if (e && e.changedTouches && e.changedTouches[0]) {
        // 从changedTouches获取位置（触摸结束事件）
        x = e.changedTouches[0].clientX
        y = e.changedTouches[0].clientY - 100
      } else if (e && e.currentTarget) {
        // 尝试从currentTarget获取位置信息
        const query = wx.createSelectorQuery()
        query.select('#' + e.currentTarget.id).boundingClientRect()
        query.exec((res) => {
          if (res[0]) {
            x = res[0].left + res[0].width / 2
            y = res[0].top - 50
          }
        })
      } else {
        // 默认位置：屏幕中央偏上
        x = systemInfo.windowWidth / 2
        y = 200
      }

      // 边界检查和调整
      const bubbleWidth = 240
      const bubbleHeight = 100
      const margin = 20

      // 水平边界检查
      if (x < bubbleWidth / 2 + margin) {
        x = bubbleWidth / 2 + margin
      }
      if (x > systemInfo.windowWidth - bubbleWidth / 2 - margin) {
        x = systemInfo.windowWidth - bubbleWidth / 2 - margin
      }

      // 垂直边界检查
      if (y < bubbleHeight + margin) {
        y = bubbleHeight + margin
      }
      if (y > systemInfo.windowHeight - bubbleHeight - margin) {
        y = systemInfo.windowHeight - bubbleHeight - margin
      }

      console.log('计算的气泡位置:', { x, y, screenWidth: systemInfo.windowWidth, screenHeight: systemInfo.windowHeight })

      // 显示翻译气泡
      this.setData({
        showTranslationBubble: true,
        bubbleContent: {
          word: word,
          translation: translation || '翻译获取中...',
          position: { x: x, y: y }
        }
      })

      console.log('设置气泡内容完成:', this.data.bubbleContent)

      // 3秒后自动隐藏
      setTimeout(() => {
        this.hideTranslationBubble()
      }, 3000)

    } catch (error) {
      console.error('获取翻译失败:', error)

      // 即使翻译失败也显示气泡，使用默认位置
      const systemInfo = wx.getSystemInfoSync()
      const x = systemInfo.windowWidth / 2
      const y = 200

      this.setData({
        showTranslationBubble: true,
        bubbleContent: {
          word: word,
          translation: '翻译获取失败，请稍后重试',
          position: { x: x, y: y }
        }
      })

      setTimeout(() => {
        this.hideTranslationBubble()
      }, 3000)
    }
  },

  // 预翻译英文单词
  preTranslateWords: function(words) {
    if (!words || !Array.isArray(words)) return

    // 提取所有英文单词
    const englishWords = words
      .filter(item => item.isWord && /^[a-zA-Z]+$/.test(item.text))
      .map(item => item.text.toLowerCase())

    // 去重
    const uniqueWords = [...new Set(englishWords)]

    console.log('开始预翻译单词:', uniqueWords)

    // 为每个单词预加载翻译
    uniqueWords.forEach(word => {
      this.getTranslation(word).then(translation => {
        console.log(`预翻译完成: ${word} -> ${translation}`)
      }).catch(error => {
        console.error(`预翻译失败: ${word}`, error)
      })
    })
  },

  // 获取单词翻译
  getWordTranslation: function(word) {
    const lowerWord = word.toLowerCase()

    // 优先使用预翻译缓存
    if (this.data.translationCache[lowerWord]) {
      return Promise.resolve(this.data.translationCache[lowerWord])
    }

    // 如果缓存中没有，使用内置词典
    return this.getTranslation(word)
  },

  // 隐藏翻译气泡
  hideTranslationBubble: function() {
    this.setData({
      showTranslationBubble: false,
      bubbleContent: {
        word: '',
        translation: '',
        position: { x: 0, y: 0 }
      }
    })
  },

  // 关闭翻译气泡
  onBubbleClose: function() {
    this.hideTranslationBubble()
  },

  // 高亮正在播放的内容
  highlightPlayingContent: function(wordIndex) {
    if (wordIndex < 0 || !this.data.processedWords) return

    const processedWords = this.data.processedWords.map((word, index) => ({
      ...word,
      isPlaying: index === wordIndex
    }))

    this.setData({
      processedWords: processedWords
    })
  },

  // 获取翻译
  getTranslation: function(word) {
    const lowerWord = word.toLowerCase()

    // 检查缓存
    if (this.data.translationCache[lowerWord]) {
      return Promise.resolve(this.data.translationCache[lowerWord])
    }

    // 扩展的内置词典
    const builtInDict = {
      // 基础词汇
      'hello': '你好', 'world': '世界', 'good': '好的', 'morning': '早上',
      'afternoon': '下午', 'evening': '晚上', 'night': '夜晚', 'thank': '谢谢',
      'you': '你', 'welcome': '欢迎', 'please': '请', 'sorry': '对不起',
      'excuse': '打扰', 'me': '我', 'yes': '是', 'no': '不', 'ok': '好的',
      'fine': '很好', 'great': '很棒', 'wonderful': '精彩', 'beautiful': '美丽',

      // 动词
      'love': '爱', 'like': '喜欢', 'want': '想要', 'need': '需要', 'have': '有',
      'get': '得到', 'go': '去', 'come': '来', 'see': '看', 'look': '看',
      'listen': '听', 'speak': '说', 'talk': '谈话', 'read': '读', 'write': '写',
      'learn': '学习', 'study': '学习', 'work': '工作', 'play': '玩', 'eat': '吃',
      'drink': '喝', 'sleep': '睡觉', 'walk': '走', 'run': '跑', 'stop': '停止',
      'start': '开始', 'end': '结束', 'open': '打开', 'close': '关闭',
      'make': '制作', 'take': '拿', 'give': '给', 'put': '放', 'find': '找到',
      'know': '知道', 'think': '思考', 'feel': '感觉', 'try': '尝试', 'help': '帮助',

      // 形容词
      'big': '大', 'small': '小', 'long': '长', 'short': '短', 'high': '高',
      'low': '低', 'fast': '快', 'slow': '慢', 'hot': '热', 'cold': '冷',
      'new': '新', 'old': '旧', 'young': '年轻', 'happy': '快乐', 'sad': '悲伤',
      'angry': '生气', 'tired': '累', 'hungry': '饿', 'thirsty': '渴', 'busy': '忙',
      'free': '自由', 'easy': '容易', 'difficult': '困难', 'hard': '困难',
      'important': '重要', 'interesting': '有趣', 'boring': '无聊', 'funny': '有趣',
      'serious': '严肃', 'quiet': '安静', 'loud': '大声', 'clean': '干净',
      'dirty': '脏', 'rich': '富有', 'poor': '贫穷', 'smart': '聪明',
      'strong': '强壮', 'weak': '虚弱', 'healthy': '健康', 'sick': '生病',
      'safe': '安全', 'dangerous': '危险',

      // 代词和连词
      'the': '这个', 'a': '一个', 'an': '一个', 'and': '和', 'or': '或者',
      'but': '但是', 'if': '如果', 'when': '当', 'where': '哪里', 'what': '什么',
      'who': '谁', 'how': '如何', 'why': '为什么', 'this': '这个', 'that': '那个',
      'these': '这些', 'those': '那些', 'here': '这里', 'there': '那里',
      'now': '现在', 'then': '然后', 'today': '今天', 'tomorrow': '明天',
      'yesterday': '昨天', 'my': '我的', 'your': '你的', 'his': '他的',
      'her': '她的', 'its': '它的', 'our': '我们的', 'their': '他们的',

      // 应用相关词汇
      'app': '应用', 'english': '英语', 'learning': '学习', 'quick': '快速',
      'brown': '棕色', 'fox': '狐狸', 'jumps': '跳跃', 'over': '越过',
      'lazy': '懒惰', 'dog': '狗', 'education': '教育', 'most': '最',
      'powerful': '强大', 'weapon': '武器', 'which': '哪个', 'can': '能够',
      'use': '使用', 'to': '到', 'change': '改变', 'life': '生活',
      'happens': '发生', 'making': '制作', 'other': '其他', 'plans': '计划',
      'only': '只有', 'way': '方式', 'do': '做', 'is': '是', 'in': '在',
      'middle': '中间', 'of': '的', 'difficulty': '困难', 'lies': '位于',
      'opportunity': '机会', 'time': '时间', 'people': '人们', 'man': '男人',
      'woman': '女人', 'child': '孩子', 'family': '家庭', 'friend': '朋友',
      'house': '房子', 'school': '学校', 'book': '书', 'car': '汽车',
      'food': '食物', 'water': '水', 'money': '钱', 'job': '工作',
      'place': '地方', 'country': '国家', 'city': '城市', 'year': '年',
      'day': '天', 'week': '周', 'month': '月', 'hour': '小时',
      'minute': '分钟', 'second': '秒', 'first': '第一', 'last': '最后',
      'next': '下一个', 'before': '之前', 'after': '之后', 'always': '总是',
      'never': '从不', 'sometimes': '有时', 'often': '经常', 'usually': '通常'
    }

    // 获取翻译，如果词典中没有则返回更友好的提示
    let translation = builtInDict[lowerWord]

    if (!translation) {
      // 对于未知单词，提供更有用的信息
      if (/^[a-zA-Z]+$/.test(word)) {
        translation = `[${word}]`  // 用方括号包围未知的英文单词
      } else {
        translation = word  // 非英文内容直接返回原文
      }
    }

    // 将翻译结果添加到缓存
    this.setData({
      [`translationCache.${lowerWord}`]: translation
    })

    return Promise.resolve(translation)
  },

  // 全文播放功能
  playAll: async function() {
    if (this.data.processedWords.length === 0) {
      wx.showToast({
        title: '请先处理文本',
        icon: 'none'
      })
      return
    }

    if (this.data.isPlayingAll) {
      wx.showToast({
        title: '正在播放中',
        icon: 'none'
      })
      return
    }

    console.log('开始全文播放')

    // 设置全文播放状态
    this.setData({
      isPlayingAll: true,
      playingSequence: true,
      currentPlayingIndex: 0
    })

    try {
      // 获取所有英文单词
      const englishWords = this.data.processedWords
        .filter(item => item.type === 'word' && /^[a-zA-Z]+$/.test(item.text))
        .map(item => item.text)

      if (englishWords.length === 0) {
        wx.showToast({
          title: '没有找到英文单词',
          icon: 'none'
        })
        this.clearPlayingState()
        return
      }

      // 逐个播放单词
      for (let i = 0; i < englishWords.length; i++) {
        // 检查是否被停止
        if (!this.data.isPlayingAll) {
          console.log('播放被停止')
          break
        }

        const word = englishWords[i]
        console.log(`播放第 ${i + 1} 个单词:`, word)

        // 更新当前播放状态
        this.setData({
          currentPlayingIndex: i,
          currentPlayingWord: word
        })

        try {
          // 播放单词（不使用缓存，直接播放）
          await this.playWordDirect(word)

          // 播放间隔
          await this.delay(500)

        } catch (error) {
          console.error(`播放第 ${i + 1} 段失败:`, error)
        }
      }

      console.log('全文播放完成')
      wx.showToast({
        title: '全文播放完成',
        icon: 'success'
      })

    } catch (error) {
      console.error('全文播放失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    } finally {
      this.clearPlayingState()
    }
  },

  // 直接播放单词（不缓存）
  playWordDirect: function(word) {
    return new Promise(async (resolve, reject) => {
      try {
        serviceManager.speak(word, {
          language: 'en',
          onComplete: () => {
            console.log('单词播放完成:', word)
            resolve()
          },
          onError: async (error) => {
            console.error('单词播放失败:', word, error)
            reject(error)
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  },

  // 延迟函数
  delay: function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  // 查看存储状态
  checkStorageStatus: function() {
    try {
      const storageInfo = wx.getStorageInfoSync()
      const usagePercent = Math.round(storageInfo.currentSize / storageInfo.limitSize * 100)

      wx.showModal({
        title: '存储状态',
        content: `存储项目：${storageInfo.keys.length} 个\n当前大小：${Math.round(storageInfo.currentSize)} KB\n存储限制：${Math.round(storageInfo.limitSize)} KB\n使用率：${usagePercent}%\n\n${usagePercent > 80 ? '⚠️ 存储空间不足，建议清理' : '✅ 存储空间充足'}`,
        showCancel: false,
        confirmText: '确定'
      })
    } catch (error) {
      console.error('获取存储状态失败:', error)
      wx.showToast({
        title: '获取状态失败',
        icon: 'none'
      })
    }
  },

  // 单词点击事件
  onWordTap: async function(e) {
    const dataset = e.currentTarget.dataset
    const word = dataset.word
    const index = dataset.index

    if (!word || !/[a-zA-Z]/.test(word)) return

    console.log('点击单词:', word, '索引:', index)

    try {
      // 播放语音并显示翻译气泡
      await this.playWordWithBubble(e)

      // 更新学习统计
      this.setData({
        'statistics.studiedWords': this.data.statistics.studiedWords + 1,
        'todayStats.wordsRead': this.data.todayStats.wordsRead + 1
      })
      this.saveStatistics()

    } catch (error) {
      console.error('播放单词失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    }
  },

  // 清空收藏
  clearFavorites: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有收藏的单词吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            favoriteWords: []
          })
          wx.setStorageSync('favoriteWords', [])
          wx.showToast({
            title: '已清空收藏',
            icon: 'success'
          })
        }
      }
    })
  },

  // 播放收藏的单词
  speakFavorite: async function(e) {
    const word = e.currentTarget.dataset.word
    if (!word) return

    try {
      await this.playWord(word)
    } catch (error) {
      console.error('播放收藏单词失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    }
  },

  // 移除收藏
  removeFavorite: function(e) {
    const word = e.currentTarget.dataset.word
    if (!word) return

    const favoriteWords = this.data.favoriteWords.filter(item => item !== word)
    this.setData({
      favoriteWords: favoriteWords
    })
    wx.setStorageSync('favoriteWords', favoriteWords)

    wx.showToast({
      title: '已移除收藏',
      icon: 'success'
    })
  },

  // 关闭单词详情模态框
  closeWordModal: function() {
    this.setData({
      showWordModal: false,
      selectedWordDetail: {
        word: '',
        phonetic: '',
        meaning: ''
      }
    })
  },

  // 播放详情单词
  speakDetailWord: async function() {
    const word = this.data.selectedWordDetail.word
    if (!word) return

    try {
      await this.playWord(word)
    } catch (error) {
      console.error('播放详情单词失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    }
  },

  // 添加到收藏
  addToFavorites: function() {
    const word = this.data.selectedWordDetail.word
    if (!word) return

    const favoriteWords = this.data.favoriteWords
    if (favoriteWords.includes(word)) {
      wx.showToast({
        title: '已在收藏中',
        icon: 'none'
      })
      return
    }

    favoriteWords.push(word)
    this.setData({
      favoriteWords: favoriteWords
    })
    wx.setStorageSync('favoriteWords', favoriteWords)

    wx.showToast({
      title: '已添加收藏',
      icon: 'success'
    })
  }
})
