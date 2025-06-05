const app = getApp()

Page({
  data: {
    translateCount: 0,
    readingCount: 0,
    learnedWords: 0,
    recentTranslations: [],
    dailyTip: '每天坚持学习10个新单词，一年就能掌握3650个单词！',
    tips: [
      '每天坚持学习10个新单词，一年就能掌握3650个单词！',
      '多听多读，培养英语语感，让学习更高效。',
      '使用点读功能时，可以重复点击加深印象。',
      '建议先理解句子含义，再逐个学习生词。',
      '记忆单词时，联想中文意思会更容易记住。'
    ]
  },

  onLoad: function (options) {
    this.loadUserStats()
    this.loadRecentTranslations()
    this.setRandomTip()
  },

  onShow: function () {
    // 每次显示页面时更新统计数据
    this.loadUserStats()
    this.loadRecentTranslations()
  },

  // 加载用户统计数据
  loadUserStats: function() {
    try {
      const today = new Date().toDateString()
      const stats = wx.getStorageSync('dailyStats') || {}

      if (stats.date === today) {
        this.setData({
          translateCount: stats.translateCount || 0,
          readingCount: stats.readingCount || 0,
          learnedWords: stats.learnedWords || 0
        })
      } else {
        // 新的一天，重置统计
        this.setData({
          translateCount: 0,
          readingCount: 0,
          learnedWords: 0
        })
        this.saveStats()
      }
    } catch (e) {
      console.log('加载统计数据失败:', e)
    }
  },

  // 保存统计数据
  saveStats: function() {
    const today = new Date().toDateString()
    const stats = {
      date: today,
      translateCount: this.data.translateCount,
      readingCount: this.data.readingCount,
      learnedWords: this.data.learnedWords
    }

    wx.setStorage({
      key: 'dailyStats',
      data: stats
    })
  },

  // 加载最近翻译记录
  loadRecentTranslations: function() {
    app.loadTranslationHistory()
    const recentTranslations = app.globalData.translationHistory.slice(0, 3)
    this.setData({
      recentTranslations: recentTranslations
    })
  },

  // 设置随机小贴士
  setRandomTip: function() {
    const randomIndex = Math.floor(Math.random() * this.data.tips.length)
    this.setData({
      dailyTip: this.data.tips[randomIndex]
    })
  },

  // 跳转到翻译页面
  goToTranslate: function() {
    wx.switchTab({
      url: '/pages/translate/translate'
    })
  },

  // 跳转到点读页面
  goToReading: function() {
    wx.switchTab({
      url: '/pages/reading/reading'
    })
  },

  // 查看全部历史记录
  viewAllHistory: function() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  // 分享功能
  onShareAppMessage: function () {
    return {
      title: '七七喵点读机 - 智能英语学习助手',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '七七喵点读机 - 让英语学习更简单',
      imageUrl: '/images/share.png'
    }
  }
})
