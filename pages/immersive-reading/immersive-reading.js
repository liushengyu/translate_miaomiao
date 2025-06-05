const app = getApp()
const serviceManager = require('../../utils/service-manager.js')

Page({
  data: {
    // 处理好的单词数组
    processedWords: [],
    originalText: '',

    // 播放状态
    isPlaying: false,
    isPlayingAll: false,
    currentPlayingIndex: -1,
    currentPlayingWord: '',
    playProgress: 0,

    // 文本选择相关
    selectedIndexes: [],
    selectedText: '',
    selectionMode: false,
    showSelectionMenu: false,
    menuPosition: { x: 0, y: 0 },

    // 触摸事件相关
    touchStartInfo: null,
    isSelecting: false,

    // 语音设置
    voiceSettings: {
      speed: 1.0,
      volume: 1.0,
      pitch: 1.0
    },

    // 服务状态
    serviceStatus: {
      isLoaded: false,
      speechAvailable: false
    },

    // 播放控制
    sequenceController: null,

    // 字体设置
    fontSize: 32,
    lineHeight: 1.8,

    // 主题设置
    theme: 'light', // light | dark | sepia

    // 连续选择相关状态
    startWordIndex: -1,
    endWordIndex: -1,
    currentSelectionRange: { start: -1, end: -1 },

    // 触摸开始事件相关
    isTouching: false,
    selectedStartIndex: -1,
    selectedEndIndex: -1,
    touchStartTime: 0,
    startTouch: null
  },

  onLoad: function (options) {
    console.log('沉浸式阅读页面加载，参数:', options)

    // 从storage获取传递的数据
    this.loadPassedData()
    this.loadUserSettings()
    this.checkServiceStatus()
  },

  onShow: function () {
    this.checkServiceStatus()
  },

  // 加载传递的数据
  loadPassedData: function() {
    try {
      const passedData = wx.getStorageSync('immersiveReadingData')
      if (passedData) {
        console.log('加载传递的数据:', passedData)
        this.setData({
          processedWords: passedData.processedWords || [],
          originalText: passedData.originalText || ''
        })

        // 清除临时数据
        wx.removeStorageSync('immersiveReadingData')
      } else {
        console.log('没有找到传递的数据，使用示例数据')
        this.loadExampleData()
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      this.loadExampleData()
    }
  },

  // 加载示例数据
  loadExampleData: function() {
    const exampleText = "Hello, welcome to our English learning app! This is an immersive reading experience."
    const words = this.parseTextToWords(exampleText)

    this.setData({
      processedWords: words,
      originalText: exampleText
    })
  },

  // 解析文本为单词数组
  parseTextToWords: function(text) {
    if (!text || typeof text !== 'string') {
      return []
    }

    const words = []
    let wordIndex = 0

    const regex = /[\u4e00-\u9fa5]|[a-zA-Z]+|[0-9]+|[.,!?;:'"()[\]{}\-]/g
    let match

    while ((match = regex.exec(text)) !== null) {
      const token = match[0].trim()

      if (!token) continue

      const isWordToken = /[\u4e00-\u9fa5a-zA-Z0-9]/.test(token)

      const wordData = {
        text: token,
        index: wordIndex,
        type: isWordToken ? 'word' : 'punctuation',
        isSelected: false,
        isPlaying: false
      }

      words.push(wordData)
      wordIndex++
    }

    return words
  },

  // 加载用户设置
  loadUserSettings: function() {
    try {
      const voiceSettings = wx.getStorageSync('voiceSettings') || {
        speed: 1.0,
        volume: 1.0,
        pitch: 1.0
      }

      const displaySettings = wx.getStorageSync('displaySettings') || {
        fontSize: 32,
        lineHeight: 1.8,
        theme: 'light'
      }

      this.setData({
        voiceSettings: voiceSettings,
        fontSize: displaySettings.fontSize,
        lineHeight: displaySettings.lineHeight,
        theme: displaySettings.theme
      })
    } catch (error) {
      console.error('加载用户设置失败:', error)
    }
  },

  // 检查服务状态
  checkServiceStatus: function() {
    const status = serviceManager.getServiceStatus()
    this.setData({
      serviceStatus: {
        isLoaded: true,
        speechAvailable: status.speech
      }
    })
  },

  // 单词点击播放
  onWordTap: function(e) {
    const index = e.currentTarget.dataset.index
    const word = this.data.processedWords[index]

    if (!word || word.type !== 'word') return

    this.playWord(word.text, index)
  },

  // 播放单词
  playWord: async function(text, index = -1) {
    if (!text) return

    console.log('播放单词:', text)

    // 更新播放状态
    this.updatePlayingState(index)

    try {
      await serviceManager.speak(text.trim(), 'en')

      console.log('单词播放完成:', text)
      wx.showToast({
        title: '播放完成',
        icon: 'success',
        duration: 800
      })
    } catch (error) {
      console.error('播放失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    } finally {
      this.clearPlayingState()
    }
  },

  // 更新播放状态
  updatePlayingState: function(index) {
    const processedWords = this.data.processedWords.map((word, i) => ({
      ...word,
      isPlaying: i === index
    }))

    this.setData({
      processedWords: processedWords,
      currentPlayingIndex: index,
      currentPlayingWord: index >= 0 ? this.data.processedWords[index].text : '',
      isPlaying: true
    })
  },

  // 清除播放状态
  clearPlayingState: function() {
    const processedWords = this.data.processedWords.map(word => ({
      ...word,
      isPlaying: false
    }))

    this.setData({
      processedWords: processedWords,
      currentPlayingIndex: -1,
      currentPlayingWord: '',
      isPlaying: false,
      isPlayingAll: false
    })
  },

  // 全文播放
  playAll: async function() {
    if (this.data.isPlayingAll) {
      wx.showToast({
        title: '正在播放中',
        icon: 'none'
      })
      return
    }

    const words = this.data.processedWords.filter(item => item.type === 'word')
    if (words.length === 0) {
      wx.showToast({
        title: '没有可播放的内容',
        icon: 'none'
      })
      return
    }

    const controller = { stop: false }
    this.setData({
      isPlayingAll: true,
      sequenceController: controller
    })

    try {
      await this.playSequence(words, 0, controller)

      if (!controller.stop) {
        wx.showToast({
          title: '播放完成',
          icon: 'success'
        })
      }
    } catch (error) {
      if (!controller.stop) {
        console.error('播放失败:', error)
        wx.showToast({
          title: '播放中断',
          icon: 'none'
        })
      }
    } finally {
      this.clearPlayingState()
    }
  },

  // 顺序播放
  playSequence: async function(words, index, controller) {
    if (controller.stop || index >= words.length) {
      return
    }

    const word = words[index]
    this.updatePlayingState(word.index)

    try {
      if (controller.stop) return

      await this.playWord(word.text)

      if (controller.stop) return

      await new Promise(resolve => {
        setTimeout(() => {
          if (!controller.stop) {
            resolve()
          }
        }, 500)
      })

      if (controller.stop) return

      await this.playSequence(words, index + 1, controller)
    } catch (error) {
      if (!controller.stop) {
        throw error
      }
    }
  },

  // 停止播放
  stopPlaying: function() {
    try {
      serviceManager.stop()
    } catch (error) {
      console.error('停止播放失败:', error)
    }

    if (this.data.sequenceController) {
      this.data.sequenceController.stop = true
    }

    this.clearPlayingState()

    wx.showToast({
      title: '已停止播放',
      icon: 'success'
    })
  },

  // 开始文本选择模式
  enterSelectionMode: function() {
    this.setData({
      selectionMode: true,
      selectedIndexes: [],
      selectedText: ''
    })

    wx.showToast({
      title: '进入选择模式，点击文字进行选择',
      icon: 'none',
      duration: 2000
    })
  },

  // 退出选择模式
  exitSelectionMode: function() {
    this.clearSelection()
    this.setData({
      selectionMode: false
    })
  },

  // 文本选择处理
  onWordSelect: function(e) {
    if (!this.data.selectionMode) return

    const index = parseInt(e.currentTarget.dataset.index)
    const word = this.data.processedWords[index]

    if (!word) return

    let selectedIndexes = [...this.data.selectedIndexes]

    if (selectedIndexes.includes(index)) {
      // 取消选择
      selectedIndexes = selectedIndexes.filter(i => i !== index)
    } else {
      // 添加选择
      selectedIndexes.push(index)
    }

    // 排序索引
    selectedIndexes.sort((a, b) => a - b)

    // 更新选中状态
    this.updateSelection(selectedIndexes)
  },

  // 更新选择状态
  updateSelection: function(selectedIndexes) {
    const processedWords = this.data.processedWords.map((word, index) => ({
      ...word,
      isSelected: selectedIndexes.includes(index)
    }))

    // 生成选中的文本
    const selectedText = selectedIndexes
      .map(index => this.data.processedWords[index].text)
      .join('')
      .trim()

    this.setData({
      processedWords: processedWords,
      selectedIndexes: selectedIndexes,
      selectedText: selectedText
    })

    // 如果有选中的文本，显示操作菜单
    if (selectedText) {
      this.showSelectionMenu()
    }
  },

  // 显示选择菜单
  showSelectionMenu: function() {
    this.setData({
      showSelectionMenu: true
    })
  },

  // 隐藏选择菜单
  hideSelectionMenu: function() {
    this.setData({
      showSelectionMenu: false
    })
  },

  // 清除选择
  clearSelection: function() {
    const processedWords = this.data.processedWords.map(word => ({
      ...word,
      isSelected: false
    }))

    this.setData({
      processedWords: processedWords,
      selectedIndexes: [],
      selectedText: '',
      showSelectionMenu: false
    })
  },

  // 播放选中文本
  playSelectedText: async function() {
    const selectedText = this.data.selectedText
    if (!selectedText) {
      wx.showToast({
        title: '请先选择文本',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '播放中...' })
      await serviceManager.speak(selectedText, 'en')
      wx.hideLoading()

      wx.showToast({
        title: '播放完成',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('播放选中文本失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    }
  },

  // 翻译选中文本
  translateSelectedText: async function() {
    const selectedText = this.data.selectedText
    if (!selectedText) {
      wx.showToast({
        title: '请先选择文本',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '翻译中...' })
      // 使用自动语言检测，保留文本格式
      const result = await serviceManager.translate(selectedText, 'auto', 'zh')
      wx.hideLoading()

      wx.showModal({
        title: '翻译结果',
        content: `原文:\n${selectedText}\n\n译文:\n${result.text}`,
        showCancel: false,
        confirmText: '确定'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('翻译失败:', error)
      wx.showToast({
        title: '翻译失败',
        icon: 'none'
      })
    }

    // 隐藏选择菜单
    this.hideSelectionMenu()
  },

  // 调整字体大小
  adjustFontSize: function(e) {
    const type = e.currentTarget.dataset.type
    let fontSize = this.data.fontSize

    if (type === 'increase' && fontSize < 48) {
      fontSize += 2
    } else if (type === 'decrease' && fontSize > 24) {
      fontSize -= 2
    }

    this.setData({ fontSize })
    this.saveDisplaySettings()
  },

  // 调整行高
  adjustLineHeight: function(e) {
    const type = e.currentTarget.dataset.type
    let lineHeight = this.data.lineHeight

    if (type === 'increase' && lineHeight < 2.5) {
      lineHeight += 0.1
    } else if (type === 'decrease' && lineHeight > 1.2) {
      lineHeight -= 0.1
    }

    this.setData({
      lineHeight: Math.round(lineHeight * 10) / 10
    })
    this.saveDisplaySettings()
  },

  // 切换主题
  switchTheme: function(e) {
    const theme = e.currentTarget.dataset.theme
    this.setData({ theme })
    this.saveDisplaySettings()
  },

  // 保存显示设置
  saveDisplaySettings: function() {
    const settings = {
      fontSize: this.data.fontSize,
      lineHeight: this.data.lineHeight,
      theme: this.data.theme
    }

    wx.setStorageSync('displaySettings', settings)
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack()
  },

  // 分享功能
  onShareAppMessage: function () {
    return {
      title: '沉浸式英语点读 - 七七喵点读机',
      path: '/pages/immersive-reading/immersive-reading',
      imageUrl: '/images/share.png'
    }
  },

  /**
   * 开始连续选择
   */
  onTouchStart(e) {
    if (!this.data.processedWords || this.data.processedWords.length === 0) return

    this.setData({
      isTouching: true,
      isSelecting: false,
      selectedStartIndex: -1,
      selectedEndIndex: -1,
      showSelectionMenu: false
    })

    // 清除之前的选择
    this.clearWordSelection()

    // 记录触摸开始时间
    this.touchStartTime = Date.now()

    // 获取触摸位置
    const touch = e.touches[0]
    this.startTouch = {
      x: touch.clientX,
      y: touch.clientY
    }

    // 查找触摸位置对应的单词
    const wordIndex = this.findWordAtPosition(touch.clientX, touch.clientY)
    if (wordIndex >= 0) {
      this.setData({
        selectedStartIndex: wordIndex,
        selectedEndIndex: wordIndex
      })
    }
  },

  /**
   * 连续选择过程中
   */
  onTouchMove(e) {
    if (!this.data.isTouching || !this.data.processedWords) return

    const touch = e.touches[0]
    const currentTime = Date.now()
    const touchDuration = currentTime - this.touchStartTime

    // 如果触摸时间超过200ms，开始选择模式
    if (touchDuration > 200 && !this.data.isSelecting) {
      this.setData({ isSelecting: true })

      // 震动反馈（如果支持）
      try {
        wx.vibrateShort()
      } catch (error) {
        // 忽略震动错误
      }
    }

    if (this.data.isSelecting) {
      // 查找当前触摸位置对应的单词
      const wordIndex = this.findWordAtPosition(touch.clientX, touch.clientY)

      if (wordIndex >= 0 && wordIndex !== this.data.selectedEndIndex) {
        const startIndex = this.data.selectedStartIndex
        const endIndex = wordIndex

        // 确保开始索引小于结束索引
        const minIndex = Math.min(startIndex, endIndex)
        const maxIndex = Math.max(startIndex, endIndex)

        this.setData({
          selectedEndIndex: wordIndex
        })

        // 更新选中的文字
        this.updateSelectedWords(minIndex, maxIndex)
      }
    }
  },

  /**
   * 结束连续选择
   */
  onTouchEnd(e) {
    if (!this.data.isTouching) return

    const touchEndTime = Date.now()
    const touchDuration = touchEndTime - this.touchStartTime

    this.setData({ isTouching: false })

    if (this.data.isSelecting) {
      // 选择模式结束
      this.setData({ isSelecting: false })

      // 如果有选中的文本，显示操作菜单
      if (this.data.selectedText && this.data.selectedText.trim()) {
        // 计算菜单显示位置
        const touch = e.changedTouches[0]
        const systemInfo = wx.getSystemInfoSync()

        this.setData({
          showSelectionMenu: true,
          menuPosition: {
            x: Math.max(10, Math.min(touch.clientX - 100, systemInfo.windowWidth - 210)),
            y: Math.max(60, touch.clientY - 120)
          }
        })
      }
    } else if (touchDuration < 200) {
      // 短按 - 播放单词
      const touch = e.changedTouches[0]
      const wordIndex = this.findWordAtPosition(touch.clientX, touch.clientY)

      if (wordIndex >= 0 && wordIndex < this.data.processedWords.length) {
        const word = this.data.processedWords[wordIndex]
        if (word && word.isWord) {
          this.playWord(word.text)
        }
      }
    }
  },

  /**
   * 根据触摸位置查找对应的单词索引（简化实现）
   */
  findWordAtPosition(x, y) {
    // 简化实现：基于文本区域的相对位置估算单词索引
    // 在实际应用中可以使用更精确的位置计算

    if (!this.data.processedWords || this.data.processedWords.length === 0) {
      return -1
    }

    // 获取屏幕信息
    const systemInfo = wx.getSystemInfoSync()
    const screenWidth = systemInfo.windowWidth

    // 估算每行的单词数量（基于屏幕宽度和字体大小）
    const wordsPerLine = Math.floor(screenWidth / 25) // 假设每个字符约25rpx宽
    const lineHeight = 40 // 假设行高为40rpx

    // 计算相对于文本容器的y位置
    const containerTopOffset = 100 // 文本容器顶部偏移量
    const relativeY = y - containerTopOffset

    if (relativeY < 0) return -1

    // 估算行号
    const lineIndex = Math.floor(relativeY / lineHeight)
    // 估算列号
    const colIndex = Math.floor((x / screenWidth) * wordsPerLine)

    // 计算单词索引
    const wordIndex = lineIndex * wordsPerLine + colIndex

    // 确保索引在有效范围内
    return Math.min(wordIndex, this.data.processedWords.length - 1)
  },

  /**
   * 更新选中的单词
   */
  updateSelectedWords(startIndex, endIndex) {
    const processedWords = this.data.processedWords.map((word, index) => ({
      ...word,
      isSelected: index >= startIndex && index <= endIndex
    }))

    // 生成选中的文本
    const selectedWords = processedWords
      .filter((word, index) => index >= startIndex && index <= endIndex)
      .map(word => word.text)

    const selectedText = selectedWords.join('').trim()

    this.setData({
      processedWords: processedWords,
      selectedIndexes: Array.from({length: endIndex - startIndex + 1}, (_, i) => startIndex + i),
      selectedText: selectedText
    })
  },

  /**
   * 清除单词选择
   */
  clearWordSelection() {
    if (!this.data.processedWords) return

    const processedWords = this.data.processedWords.map(word => ({
      ...word,
      isSelected: false
    }))

    this.setData({
      processedWords: processedWords,
      selectedIndexes: [],
      selectedText: '',
      selectedStartIndex: -1,
      selectedEndIndex: -1
    })
  },

  // 复制选中文本
  copySelectedText: function() {
    const selectedText = this.data.selectedText
    if (!selectedText) {
      wx.showToast({
        title: '没有选中文本',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: selectedText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
        this.hideSelectionMenu()
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },
})
