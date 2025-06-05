// 微信小程序语音功能工具类
class WechatSpeech {
  constructor() {
    this.innerAudioContext = null
    this.recorderManager = null
    this.init()
  }

  // 初始化
  init() {
    this.innerAudioContext = wx.createInnerAudioContext()
    this.recorderManager = wx.getRecorderManager()

    // 设置录音监听
    this.recorderManager.onStart(() => {
      console.log('录音开始')
    })

    this.recorderManager.onStop((res) => {
      console.log('录音结束', res)
    })
  }

  // 文字转语音（TTS）- 使用微信原生API
  async textToSpeech(text, options = {}) {
    return new Promise((resolve, reject) => {
      wx.createInnerAudioContext().src = this.generateTTSUrl(text, options)

      // 或者使用插件TTS
      if (wx.getPlugin) {
        const plugin = wx.getPlugin('WechatSI')
        plugin.textToSpeech({
          lang: options.lang || 'zh_CN',
          tts: true,
          content: text,
          success: (res) => {
            console.log('TTS成功', res)
            resolve(res)
          },
          fail: (err) => {
            console.error('TTS失败', err)
            reject(err)
          }
        })
      }
    })
  }

  // 生成TTS音频URL（需要接入第三方服务）
  generateTTSUrl(text, options = {}) {
    const params = {
      text: encodeURIComponent(text),
      lang: options.lang || 'en',
      speed: options.speed || 1,
      pitch: options.pitch || 1
    }

    // 这里可以接入百度、腾讯、科大讯飞等TTS服务
    return `your-tts-service-url?${new URLSearchParams(params).toString()}`
  }

  // 播放语音
  async playAudio(audioUrl) {
    return new Promise((resolve, reject) => {
      this.innerAudioContext.src = audioUrl
      this.innerAudioContext.onPlay(() => {
        console.log('开始播放')
      })

      this.innerAudioContext.onEnded(() => {
        console.log('播放结束')
        resolve()
      })

      this.innerAudioContext.onError((err) => {
        console.error('播放错误', err)
        reject(err)
      })

      this.innerAudioContext.play()
    })
  }

  // 语音识别（STT）
  async speechToText(duration = 10000) {
    return new Promise((resolve, reject) => {
      // 检查录音权限
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.record']) {
            wx.authorize({
              scope: 'scope.record',
              success: () => {
                this.startRecording(duration, resolve, reject)
              },
              fail: () => {
                reject(new Error('录音权限被拒绝'))
              }
            })
          } else {
            this.startRecording(duration, resolve, reject)
          }
        }
      })
    })
  }

  // 开始录音
  startRecording(duration, resolve, reject) {
    const options = {
      duration: duration,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3',
      frameSize: 50
    }

    this.recorderManager.start(options)

    this.recorderManager.onStop((res) => {
      // 这里需要将录音文件发送到语音识别服务
      this.recognizeSpeech(res.tempFilePath)
        .then(resolve)
        .catch(reject)
    })

    // 自动停止录音
    setTimeout(() => {
      this.recorderManager.stop()
    }, duration)
  }

  // 语音识别（需要接入第三方服务）
  async recognizeSpeech(audioPath) {
    try {
      // 这里可以接入百度、腾讯、科大讯飞等语音识别服务
      const response = await wx.uploadFile({
        url: 'your-speech-recognition-service-url',
        filePath: audioPath,
        name: 'audio',
        formData: {
          'format': 'mp3',
          'rate': 16000,
          'channel': 1,
          'token': 'your-access-token'
        }
      })

      const result = JSON.parse(response.data)
      if (result.err_no === 0) {
        return {
          success: true,
          text: result.result[0]
        }
      } else {
        throw new Error(result.err_msg)
      }
    } catch (error) {
      console.error('语音识别错误:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 销毁资源
  destroy() {
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  }
}

module.exports = WechatSpeech
