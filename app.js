App({
  onLaunch: function () {
    console.log('七七牌点读机启动')

    // 检查微信版本
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()

      updateManager.onCheckForUpdate(function (res) {
        console.log('检查更新:', res.hasUpdate)
      })

      updateManager.onUpdateReady(function () {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: function (res) {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
    }
  },

  globalData: {
    userInfo: null,
    translationHistory: [],
    readingHistory: []
  },

  // 保存翻译历史
  saveTranslation: function(original, translated) {
    this.globalData.translationHistory.unshift({
      original: original,
      translated: translated,
      time: new Date().toLocaleString()
    })

    // 只保留最近20条记录
    if (this.globalData.translationHistory.length > 20) {
      this.globalData.translationHistory.pop()
    }

    // 保存到本地存储
    wx.setStorage({
      key: 'translationHistory',
      data: this.globalData.translationHistory
    })
  },

  // 加载翻译历史
  loadTranslationHistory: function() {
    try {
      const history = wx.getStorageSync('translationHistory')
      if (history) {
        this.globalData.translationHistory = history
      }
    } catch (e) {
      console.log('加载翻译历史失败:', e)
    }
  }
})
