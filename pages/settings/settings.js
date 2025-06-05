const serviceManager = require('../../utils/service-manager.js')

Page({
  data: {
    voiceSettings: {
      speed: 5,     // 语音速度 1-9
      pitch: 5,     // 语音音调 1-9
      volume: 5,    // 语音音量 1-15
      person: 0     // 发音人 0-女声 1-男声
    },
    persons: [
      { value: 0, name: '度小美（女声）' },
      { value: 1, name: '度小宇（男声）' },
      { value: 3, name: '度逍遥（情感男声）' },
      { value: 4, name: '度丫丫（萝莉女声）' }
    ],
    languages: [
      { value: 'zh', name: '中文' },
      { value: 'en', name: '英文' }
    ],
    selectedLanguage: 'zh',
    testText: '你好，这是语音测试'
  },

  onLoad() {
    this.loadSettings()
  },

  // 加载设置
  loadSettings() {
    try {
      const voiceSettings = wx.getStorageSync('voiceSettings') || this.data.voiceSettings
      const selectedLanguage = wx.getStorageSync('selectedLanguage') || 'zh'

      this.setData({
        voiceSettings,
        selectedLanguage,
        testText: selectedLanguage === 'zh' ? '你好，这是语音测试' : 'Hello, this is a voice test'
      })
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  },

  // 语音速度改变
  onSpeedChange(e) {
    this.setData({
      'voiceSettings.speed': parseInt(e.detail.value)
    })
    this.saveVoiceSettings()
  },

  // 语音音调改变
  onPitchChange(e) {
    this.setData({
      'voiceSettings.pitch': parseInt(e.detail.value)
    })
    this.saveVoiceSettings()
  },

  // 语音音量改变
  onVolumeChange(e) {
    this.setData({
      'voiceSettings.volume': parseInt(e.detail.value)
    })
    this.saveVoiceSettings()
  },

  // 发音人改变
  onPersonChange(e) {
    this.setData({
      'voiceSettings.person': parseInt(e.detail.value)
    })
    this.saveVoiceSettings()
  },

  // 语言改变
  onLanguageChange(e) {
    const language = e.detail.value
    this.setData({
      selectedLanguage: language,
      testText: language === 'zh' ? '你好，这是语音测试' : 'Hello, this is a voice test'
    })

    wx.setStorageSync('selectedLanguage', language)
  },

  // 保存语音设置
  saveVoiceSettings() {
    try {
      wx.setStorageSync('voiceSettings', this.data.voiceSettings)
      wx.showToast({
        title: '设置已保存',
        icon: 'success',
        duration: 1000
      })
    } catch (error) {
      console.error('保存设置失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 测试语音
  async testVoice() {
    try {
      wx.showLoading({
        title: '正在播放...'
      })

      await serviceManager.playText(this.data.testText, {
        language: this.data.selectedLanguage,
        speed: this.data.voiceSettings.speed,
        pitch: this.data.voiceSettings.pitch,
        volume: this.data.voiceSettings.volume,
        person: this.data.voiceSettings.person
      })

      wx.hideLoading()
      wx.showToast({
        title: '播放完成',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('语音测试失败:', error)
      wx.showToast({
        title: '测试失败，请检查网络',
        icon: 'none'
      })
    }
  },

  // 测试文本输入
  onTestTextChange(e) {
    this.setData({
      testText: e.detail.value
    })
  },

  // 重置设置
  resetSettings() {
    wx.showModal({
      title: '确认重置',
      content: '确定要重置所有设置到默认值吗？',
      success: (res) => {
        if (res.confirm) {
          const defaultVoiceSettings = {
            speed: 5,
            pitch: 5,
            volume: 5,
            person: 0
          }

          this.setData({
            voiceSettings: defaultVoiceSettings,
            selectedLanguage: 'zh',
            testText: '你好，这是语音测试'
          })

          wx.setStorageSync('voiceSettings', defaultVoiceSettings)
          wx.setStorageSync('selectedLanguage', 'zh')

          wx.showToast({
            title: '设置已重置',
            icon: 'success'
          })
        }
      }
    })
  },

  // 检查服务状态
  async checkServiceStatus() {
    wx.showLoading({
      title: '检查服务状态...'
    })

    try {
      const status = serviceManager.getServiceStatus()
      wx.hideLoading()

      let message = '服务状态：\n'
      message += `翻译服务：${status.translate ? '可用' : '不可用'}\n`
      message += `语音服务：${status.speech ? '可用' : '不可用'}\n`
      message += `使用模式：${status.useMock ? '模拟模式' : '真实API'}`

      wx.showModal({
        title: '服务状态',
        content: message,
        showCancel: false
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '检查失败',
        icon: 'none'
      })
    }
  }
})
