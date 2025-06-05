const app = getApp()
const serviceManager = require('../../utils/service-manager.js')

Page({
  data: {
    inputText: '',
    processedWords: [],
    currentWord: '',
    currentIndex: -1,
    isPlaying: false,
    showWordModal: false,
    selectedWordDetail: {},
    serviceStatus: {
      isLoaded: false,
      speechAvailable: false
    },
    voiceSettings: {
      speed: 1.0,
      volume: 1.0,
      pitch: 1.0
    },
    todayStats: {
      wordsRead: 0,
      sentencesRead: 0,
      timeSpent: 0
    },
    favoriteWords: [],
    exampleTexts: [
      'Hello, welcome to our English learning app!',
      'The quick brown fox jumps over the lazy dog.',
      'Education is the most powerful weapon which you can use to change the world.',
      'Life is what happens when you\'re busy making other plans.',
      'The only way to do great work is to love what you do.',
      'In the middle of difficulty lies opportunity.'
    ],
    currentPlayingIndex: -1,
    playingSequence: false,
    sequenceController: null,
    currentPlayingWord: '',
    playProgress: 0,
    // 文本选择相关变量 - 改为双击模式
    isSelectingMode: false, // 是否处于选择模式
    selectionStartIndex: -1, // 选择起始索引
    selectionEndIndex: -1,   // 选择结束索引
    selectedText: '',
    showSelectionMenu: false,
    menuPosition: { x: 0, y: 0 },
    // 移除原有的触摸相关变量
    isPlayingAll: false
  },

  onLoad: function (options) {
    this.loadUserData()
    this.loadTodayStats()
    this.checkServiceStatus()
  },

  onShow: function () {
    this.loadTodayStats()
    this.checkServiceStatus()
  },

  // 加载用户数据
  loadUserData: function() {
    try {
      const favorites = wx.getStorageSync('favoriteWords') || []
      const settings = wx.getStorageSync('voiceSettings') || {
        speed: 1.0,
        volume: 1.0,
        pitch: 1.0
      }

      this.setData({
        favoriteWords: favorites,
        voiceSettings: settings
      })
    } catch (e) {
      console.log('加载用户数据失败:', e)
    }
  },

  // 加载今日统计
  loadTodayStats: function() {
    try {
      const today = new Date().toDateString()
      const stats = wx.getStorageSync('readingStats') || {}

      if (stats.date === today) {
        this.setData({
          todayStats: {
            wordsRead: stats.wordsRead || 0,
            sentencesRead: stats.sentencesRead || 0,
            timeSpent: stats.timeSpent || 0
          }
        })
      } else {
        this.setData({
          todayStats: {
            wordsRead: 0,
            sentencesRead: 0,
            timeSpent: 0
          }
        })
      }
    } catch (e) {
      console.log('加载统计数据失败:', e)
    }
  },

  // 保存统计数据
  saveStats: function() {
    try {
      const today = new Date().toDateString()
      const stats = {
        date: today,
        ...this.data.todayStats
      }

      wx.setStorage({
        key: 'readingStats',
        data: stats
      })
    } catch (e) {
      console.log('保存统计数据失败:', e)
    }
  },

  // 文本输入变化
  onTextChange: function(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  // 文本预处理函数 - 移除无效字符，只保留字母和标点
  preprocessText: function(text) {
    console.log('预处理输入文本:', text)

    if (!text || typeof text !== 'string') {
      console.log('文本无效')
      return ''
    }

    // 移除多余空白，保留单个空格
    let cleaned = text.replace(/\s+/g, ' ').trim()
    console.log('去除多余空格后:', cleaned)

    // 只保留中文、英文、数字、常用标点符号和空格
    cleaned = cleaned.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?;:'"()[\]{}\-]/g, '')
    console.log('过滤无效字符后:', cleaned)

    // 清理连续标点符号，最多保留两个
    cleaned = cleaned.replace(/([.,!?;:])\1{2,}/g, '$1$1')
    console.log('清理连续标点后:', cleaned)

    // 去除首尾标点符号（除了引号）
    cleaned = cleaned.replace(/^[.,!?;:\-\s]+|[.,!?;:\-\s]+$/g, '')
    console.log('去除首尾标点后:', cleaned)

    // 最终检查，如果只剩下空格和标点，返回空字符串
    if (!/[\u4e00-\u9fa5a-zA-Z0-9]/.test(cleaned)) {
      console.log('没有有效的字符内容')
      return ''
    }

    console.log('预处理完成:', cleaned)
    return cleaned
  },

  // 处理文本
  processText: function() {
    const rawText = this.data.inputText.trim()
    if (!rawText) {
      wx.showToast({
        title: '请输入文本',
        icon: 'none'
      })
      return
    }

    console.log('开始处理文本:', rawText)

    // 预处理文本
    const cleanedText = this.preprocessText(rawText)
    console.log('清理后文本:', cleanedText)

    if (!cleanedText) {
      wx.showToast({
        title: '文本内容无效，请检查输入',
        icon: 'none'
      })
      return
    }

    // 将文本分解为单词和标点符号
    const processedWords = this.parseTextToWords(cleanedText)
    console.log('处理后的单词数组:', processedWords)
    console.log('单词数组长度:', processedWords.length)

    // 确保数据正确设置
    this.setData({
      processedWords: processedWords
    }, () => {
      console.log('页面数据更新完成，processedWords长度:', this.data.processedWords.length)
      console.log('页面数据:', this.data.processedWords)

      // 强制触发页面更新
      this.$forceUpdate && this.$forceUpdate()

      wx.showToast({
        title: `处理完成，共${processedWords.length}个单词`,
        icon: 'success'
      })
    })
  },

  // 测试方法：加载示例文本
  loadExampleText: function() {
    const exampleText = 'Hello, welcome to our English learning app!'
    this.setData({
      inputText: exampleText
    }, () => {
      this.processText()
    })
  },

  // 解析文本为单词数组 - 简化版
  parseTextToWords: function(text) {
    console.log('开始解析文本:', text)

    if (!text || typeof text !== 'string') {
      console.log('文本无效，返回空数组')
      return []
    }

    const words = []
    let wordIndex = 0

    // 使用简单的正则表达式进行分词
    const regex = /[\u4e00-\u9fa5]|[a-zA-Z]+|[0-9]+|[.,!?;:'"()[\]{}\-]/g
    let match

    while ((match = regex.exec(text)) !== null) {
      const token = match[0].trim()

      // 跳过空内容
      if (!token) {
        continue
      }

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

    console.log('解析结果:', words)
    console.log('解析出的单词数量:', words.length)

    return words
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

    if (status.useMock) {
      wx.showToast({
        title: '当前使用模拟语音',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 播放单词
  playWord: async function(e) {
    let wordText, wordIndex;

    if (typeof e === 'string') {
      // 直接传入文本
      wordText = e;
      wordIndex = -1;
    } else {
      // 从事件获取
      wordText = e.currentTarget.dataset.word;
      wordIndex = e.currentTarget.dataset.index;
    }

    if (!wordText) return;

    // 设置当前播放状态
    this.setData({
      currentPlayingWord: wordText,
      playProgress: 0,
      isPlaying: true
    });

    // 如果有具体的单词索引，高亮显示
    if (wordIndex >= 0) {
      const processedWords = this.data.processedWords.map((word, index) => ({
        ...word,
        isPlaying: index === wordIndex
      }));
      this.setData({
        processedWords: processedWords
      });
    }

    try {
      // 使用serviceManager进行语音播放
      await serviceManager.speak(wordText.trim(), 'en');

      console.log('单词播放完成:', wordText);
      this.updateReadingStats('word');

      wx.showToast({
        title: '播放完成',
        icon: 'success',
        duration: 800
      });
    } catch (error) {
      console.error('播放失败:', error);
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
    } finally {
      this.clearPlayingState();
    }
  },

  // 清除播放状态
  clearPlayingState: function() {
    this.setData({
      isPlaying: false,
      isPlayingAll: false,
      playingSequence: false,
      currentPlayingWord: '',
      playProgress: 0
    });

    // 清除单词高亮
    const processedWords = this.data.processedWords.map(word => ({
      ...word,
      isPlaying: false
    }));
    this.setData({
      processedWords: processedWords
    });

    // 停止播放控制器
    if (this.data.sequenceController) {
      this.data.sequenceController.stop = true;
      this.setData({
        sequenceController: null
      });
    }
  },

  // 显示单词详情
  showWordDetail: function(word) {
    // 模拟词典数据
    const wordDetail = this.getWordDetail(word)

    this.setData({
      selectedWordDetail: wordDetail,
      showWordModal: true
    })
  },

  // 获取单词详情
  getWordDetail: function(word) {
    const dictionary = {
      'hello': {
        word: 'hello',
        phonetic: '/həˈloʊ/',
        meaning: 'n. 招呼，问候；v. 打招呼，问好'
      },
      'welcome': {
        word: 'welcome',
        phonetic: '/ˈwelkəm/',
        meaning: 'v. 欢迎；adj. 受欢迎的；n. 欢迎'
      },
      'quick': {
        word: 'quick',
        phonetic: '/kwɪk/',
        meaning: 'adj. 快的，迅速的；adv. 快速地'
      },
      'brown': {
        word: 'brown',
        phonetic: '/braʊn/',
        meaning: 'adj. 棕色的；n. 棕色'
      },
      'education': {
        word: 'education',
        phonetic: '/ˌedʒuˈkeɪʃn/',
        meaning: 'n. 教育，培养'
      }
    }

    return dictionary[word.toLowerCase()] || {
      word: word,
      phonetic: '/' + word + '/',
      meaning: '暂无释义'
    }
  },

  // 关闭单词详情
  closeWordModal: function() {
    this.setData({
      showWordModal: false
    })
  },

  // 朗读详情单词
  speakDetailWord: async function() {
    const word = this.data.selectedWordDetail.word
    try {
      await serviceManager.textToSpeech(word)

      wx.showToast({
        title: '播放完成',
        icon: 'success',
        duration: 1000
      })
    } catch (error) {
      console.error('播放详情单词失败:', error)
      wx.showToast({
        title: '播放失败',
        icon: 'error'
      })
    }
  },

  // 添加到收藏
  addToFavorites: function() {
    const word = this.data.selectedWordDetail.word
    let favorites = [...this.data.favoriteWords]

    if (!favorites.includes(word)) {
      favorites.push(word)
      this.setData({
        favoriteWords: favorites
      })

      wx.setStorage({
        key: 'favoriteWords',
        data: favorites
      })

      wx.showToast({
        title: '已添加到收藏',
        icon: 'success'
      })
    } else {
      wx.showToast({
        title: '已在收藏夹中',
        icon: 'none'
      })
    }

    this.closeWordModal()
  },

  // 重复当前单词
  repeatWord: async function() {
    if (this.data.currentWord) {
      try {
        await this.playWord(this.data.currentWord)
      } catch (error) {
        console.error('重复播放失败:', error)
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
      }
    }
  },

  // 慢速播放
  slowDown: function() {
    this.setData({
      'voiceSettings.speed': 0.7
    })
    this.saveVoiceSettings()
    wx.showToast({
      title: '已切换到慢速',
      icon: 'none'
    })
  },

  // 正常速度
  normalSpeed: function() {
    this.setData({
      'voiceSettings.speed': 1.0
    })
    this.saveVoiceSettings()
    wx.showToast({
      title: '已切换到正常速度',
      icon: 'none'
    })
  },

  // 语音设置变化
  onSpeedChange: function(e) {
    this.setData({
      'voiceSettings.speed': e.detail.value
    })
    this.saveVoiceSettings()
  },

  onVolumeChange: function(e) {
    this.setData({
      'voiceSettings.volume': e.detail.value
    })
    this.saveVoiceSettings()
  },

  onPitchChange: function(e) {
    this.setData({
      'voiceSettings.pitch': e.detail.value
    })
    this.saveVoiceSettings()
  },

  // 保存语音设置
  saveVoiceSettings: function() {
    wx.setStorage({
      key: 'voiceSettings',
      data: this.data.voiceSettings
    })
  },

  // 更新朗读统计
  updateReadingStats: function(type) {
    const stats = {...this.data.todayStats}

    if (type === 'word') {
      stats.wordsRead += 1
    } else if (type === 'sentence') {
      stats.sentencesRead += 1
    }

    stats.timeSpent += 0.1 // 每次朗读增加0.1分钟

    this.setData({
      todayStats: stats
    })

    this.saveStats()
  },

  // 加载示例文本
  loadExample: function(e) {
    const text = e.currentTarget.dataset.text
    this.setData({
      inputText: text
    })
    this.processText()
  },

  // 清空文本
  clearText: function() {
    this.setData({
      inputText: '',
      processedWords: [],
      currentWord: ''
    })
  },

  // 粘贴文本
  pasteText: function() {
    wx.getClipboardData({
      success: (res) => {
        this.setData({
          inputText: res.data
        })
      },
      fail: () => {
        wx.showToast({
          title: '粘贴失败',
          icon: 'none'
        })
      }
    })
  },

  // 朗读收藏单词
  speakFavorite: function(e) {
    const word = e.currentTarget.dataset.word
    this.playWord(word)
  },

  // 删除收藏单词
  removeFavorite: function(e) {
    const word = e.currentTarget.dataset.word
    const favorites = this.data.favoriteWords.filter(item => item !== word)

    this.setData({
      favoriteWords: favorites
    })

    wx.setStorage({
      key: 'favoriteWords',
      data: favorites
    })

    wx.showToast({
      title: '已取消收藏',
      icon: 'success'
    })
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

          wx.removeStorage({
            key: 'favoriteWords'
          })

          wx.showToast({
            title: '已清空收藏',
            icon: 'success'
          })
        }
      }
    })
  },

  // 录音功能
  startRecording: function() {
    wx.showModal({
      title: '录音功能',
      content: '开始录音，说出英文单词或句子',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showToast({
              title: '录音中...',
              icon: 'loading',
              duration: 3000
            })

            // 使用语音识别服务
            const recognizedText = await serviceManager.speechToText(3000) // 录音3秒

            this.setData({
              inputText: recognizedText
            })

            wx.showToast({
              title: '识别成功',
              icon: 'success'
            })

            // 自动处理识别的文本
            this.processText()

          } catch (error) {
            console.error('语音识别失败:', error)
            wx.showToast({
              title: '识别失败，请重试',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 分享功能
  onShareAppMessage: function () {
    return {
      title: '七七牌点读机 - 智能英语点读助手',
      path: '/pages/reading/reading',
      imageUrl: '/images/share.png'
    }
  },

  // 单词点击事件 - 重新实现双击选择逻辑
  onWordTap: function(e) {
    const wordIndex = parseInt(e.currentTarget.dataset.index);
    const wordText = e.currentTarget.dataset.word;

    if (!this.data.isSelectingMode) {
      // 第一次点击：开始选择模式，设置起点
      this.setData({
        isSelectingMode: true,
        selectionStartIndex: wordIndex,
        selectionEndIndex: -1,
        selectedText: '',
        showSelectionMenu: false
      });

      // 高亮起始单词
      this.updateWordSelection(wordIndex, wordIndex);

      wx.showToast({
        title: '已选择起点，请点击终点',
        icon: 'none',
        duration: 1500
      });
    } else {
      // 第二次点击：设置终点，完成选择
      const startIndex = this.data.selectionStartIndex;
      const endIndex = wordIndex;

      // 确定选择范围
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);

      // 获取选中的文本
      const selectedWords = this.data.processedWords.slice(minIndex, maxIndex + 1);
      const selectedText = selectedWords.map(word => word.text).join(' ');

      // 更新选择状态
      this.setData({
        selectionEndIndex: endIndex,
        selectedText: selectedText,
        showSelectionMenu: true,
        menuPosition: {
          x: 100, // 固定位置，避免位置计算问题
          y: 150
        }
      });

      // 高亮选中的所有单词
      this.updateWordSelection(minIndex, maxIndex);

      wx.showToast({
        title: `已选中 ${maxIndex - minIndex + 1} 个单词`,
        icon: 'success',
        duration: 1000
      });
    }
  },

  // 退出选择模式
  exitSelectionMode: function() {
    this.setData({
      isSelectingMode: false,
      selectionStartIndex: -1,
      selectionEndIndex: -1,
      selectedText: '',
      showSelectionMenu: false
    });
    this.clearWordSelection();
  },

  // 隐藏选择菜单
  hideSelectionMenu: function() {
    this.exitSelectionMode();
  },

  // 朗读选中的文本
  speakSelectedText: function() {
    if (!this.data.selectedText) {
      wx.showToast({
        title: '请先选择文本',
        icon: 'none'
      });
      return;
    }

    try {
      // 检查语音服务状态
      if (!serviceManager) {
        wx.showToast({
          title: '语音服务未初始化',
          icon: 'none'
        });
        return;
      }

      // 开始播放前设置状态
      this.setData({
        isPlaying: true,
        currentPlayingWord: this.data.selectedText
      });

      wx.showToast({
        title: '开始朗读选中文本',
        icon: 'success',
        duration: 1000
      });

      // 调用语音服务播放选中文本
      serviceManager.speak(this.data.selectedText, {
        onComplete: () => {
          console.log('选中文本朗读完成');
          this.setData({
            isPlaying: false,
            currentPlayingWord: ''
          });
        },
        onError: (error) => {
          console.error('选中文本朗读失败:', error);
          this.setData({
            isPlaying: false,
            currentPlayingWord: ''
          });
          wx.showToast({
            title: '朗读失败',
            icon: 'none'
          });
        }
      });

    } catch (error) {
      console.error('朗读选中文本失败:', error);
      this.setData({
        isPlaying: false,
        currentPlayingWord: ''
      });
      wx.showToast({
        title: '朗读失败',
        icon: 'none'
      });
    }
  },

  // 更新单词选中状态
  updateWordSelection(startIndex, endIndex) {
    if (!this.data.processedWords) return;

    const processedWords = this.data.processedWords.map((word, index) => {
      const isSelected = index >= startIndex && index <= endIndex;
      return {
        ...word,
        isSelected: isSelected
      };
    });

    this.setData({
      processedWords: processedWords
    });
  },

  // 清除单词选中状态
  clearWordSelection() {
    if (!this.data.processedWords) return;

    const processedWords = this.data.processedWords.map(word => ({
      ...word,
      isSelected: false
    }));

    this.setData({
      processedWords: processedWords,
      selectedText: '',
      showSelectionMenu: false
    });
  },

  // 复制选中的文本到剪贴板
  copySelectedText: function() {
    if (!this.data.selectedText) {
      wx.showToast({
        title: '请先选择文本',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: this.data.selectedText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
        this.exitSelectionMode();
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  // 翻译选中的文本
  translateSelectedText: function() {
    if (!this.data.selectedText) {
      wx.showToast({
        title: '请先选择文本',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/translate/translate?text=${encodeURIComponent(this.data.selectedText)}`
    });

    this.exitSelectionMode();
  },

  // 更新播放状态
  updatePlayingState: function(wordIndex) {
    const processedWords = this.data.processedWords.map((word, index) => ({
      ...word,
      isPlaying: index === wordIndex
    }));

    this.setData({
      processedWords: processedWords,
      currentPlayingWord: this.data.processedWords[wordIndex]?.text || ''
    });
  },

  // 停止朗读功能
  stopReading: function() {
    console.log('停止朗读被调用')

    try {
      serviceManager.stop()
    } catch (error) {
      console.error('停止语音服务失败:', error)
    }

    this.clearPlayingState()

    wx.showToast({
      title: '已停止朗读',
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
  }
})
