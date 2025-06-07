const { getConfig } = require('../../config/api-config.js')

/**
 * 百度语音服务
 */
class BaiduSpeechService {
  constructor() {
    const config = getConfig()
    this.apiKey = config.baidu.speech.apiKey
    this.secretKey = config.baidu.speech.secretKey
    this.tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token'
    this.ttsUrl = 'https://tsn.baidu.com/text2audio'
    this.accessToken = null
    this.tokenExpireTime = 0
    this.currentAudioContext = null
    this.playQueue = []
    this.isPlayingSequence = false
  }

  /**
   * 获取访问令牌
   * @returns {Promise<string>} 访问令牌
   */
  async getAccessToken() {
    const now = Date.now()

    // 如果token还没有过期，直接返回
    if (this.accessToken && now < this.tokenExpireTime) {
      return this.accessToken
    }

    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: this.tokenUrl,
          method: 'POST',
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: `grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`,
          success: resolve,
          fail: reject
        })
      })

      if (response.statusCode === 200 && response.data.access_token) {
        this.accessToken = response.data.access_token
        // 提前5分钟过期，确保安全
        this.tokenExpireTime = now + (response.data.expires_in - 300) * 1000
        return this.accessToken
      } else {
        throw new Error('获取访问令牌失败')
      }
    } catch (error) {
      console.error('获取百度语音访问令牌失败:', error)
      throw error
    }
  }

  /**
   * 智能分割长文本
   * @param {string} text - 原始文本
   * @param {number} maxLength - 最大长度，默认900字符
   * @returns {Array<string>} 分割后的文本数组
   */
  splitLongText(text, maxLength = 900) {
    if (text.length <= maxLength) {
      return [text]
    }

    const segments = []
    let currentSegment = ''

    // 按句子分割（句号、问号、感叹号、分号）
    const sentences = text.split(/([.。!！?？;；]+)/).filter(s => s.trim())

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] || ''
      const punctuation = sentences[i + 1] || ''
      const fullSentence = (sentence + punctuation).trim()

      // 如果单个句子就超过最大长度，按逗号分割
      if (fullSentence.length > maxLength) {
        const parts = fullSentence.split(/([,，]+)/).filter(s => s.trim())

        for (let j = 0; j < parts.length; j += 2) {
          const part = parts[j] || ''
          const comma = parts[j + 1] || ''
          const fullPart = (part + comma).trim()

          if (fullPart.length > maxLength) {
            // 如果逗号分割后还是太长，按空格分割
            const words = fullPart.split(' ')
            let wordSegment = ''

            for (const word of words) {
              if ((wordSegment + ' ' + word).length > maxLength) {
                if (wordSegment) {
                  segments.push(wordSegment.trim())
                  wordSegment = word
                } else {
                  // 单个词都太长，强制分割
                  segments.push(word.substring(0, maxLength))
                  wordSegment = word.substring(maxLength)
                }
              } else {
                wordSegment = wordSegment ? wordSegment + ' ' + word : word
              }
            }

            if (wordSegment.trim()) {
              if ((currentSegment + ' ' + wordSegment).length <= maxLength) {
                currentSegment = currentSegment ? currentSegment + ' ' + wordSegment : wordSegment
              } else {
                if (currentSegment) {
                  segments.push(currentSegment.trim())
                }
                currentSegment = wordSegment
              }
            }
          } else {
            if ((currentSegment + ' ' + fullPart).length <= maxLength) {
              currentSegment = currentSegment ? currentSegment + ' ' + fullPart : fullPart
            } else {
              if (currentSegment) {
                segments.push(currentSegment.trim())
              }
              currentSegment = fullPart
            }
          }
        }
      } else {
        if ((currentSegment + ' ' + fullSentence).length <= maxLength) {
          currentSegment = currentSegment ? currentSegment + ' ' + fullSentence : fullSentence
        } else {
          if (currentSegment) {
            segments.push(currentSegment.trim())
          }
          currentSegment = fullSentence
        }
      }
    }

    if (currentSegment.trim()) {
      segments.push(currentSegment.trim())
    }

    return segments.filter(s => s.trim().length > 0)
  }

  /**
   * 停止当前播放
   */
  stopCurrentPlayback() {
    if (this.currentAudioContext) {
      this.currentAudioContext.stop()
      this.currentAudioContext.destroy()
      this.currentAudioContext = null
    }
    this.isPlayingSequence = false
    this.playQueue = []
  }

  /**
   * 文本转语音
   * @param {string} text - 要转换的文本
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 语音合成结果
   */
  async textToSpeech(text, options = {}) {
    try {
      if (!text || text.trim() === '') {
        throw new Error('文本内容不能为空')
      }

      // 文本长度限制
      if (text.length > 1024) {
        throw new Error('文本长度不能超过1024个字符')
      }

      const token = await this.getAccessToken()

      const params = {
        tex: text,
        tok: token,
        cuid: 'miniprogram_' + Date.now(),
        ctp: 1,  // 客户端类型，1表示微信小程序
        lan: options.language || 'zh',  // 语言，zh中文，en英文
        spd: options.speed || 5,        // 语速，0-15，默认5
        pit: options.pitch || 5,        // 音调，0-15，默认5
        vol: options.volume || 5,       // 音量，0-15，默认5
        per: options.person || 0,       // 发音人，0女声，1男声，3情感合成-度逍遥，4情感合成-度丫丫
        aue: 6  // 音频格式，6表示mp3
      }

      // 构建查询字符串
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&')

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: this.ttsUrl,
          method: 'POST',
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: queryString,
          responseType: 'arraybuffer',
          success: resolve,
          fail: reject
        })
      })

      if (response.statusCode === 200) {
        // 检查返回的数据是否是音频文件
        const contentType = response.header['Content-Type'] || response.header['content-type']

        if (contentType && contentType.includes('audio')) {
          // 将ArrayBuffer转换为base64
          const base64Audio = wx.arrayBufferToBase64(response.data)
          return {
            audioData: base64Audio,
            format: 'mp3',
            provider: 'baidu'
          }
        } else {
          // 如果返回的是JSON错误信息
          const errorText = String.fromCharCode.apply(null, new Uint8Array(response.data))
          const errorData = JSON.parse(errorText)
          throw new Error(`百度语音合成错误: ${errorData.err_msg || errorData.err_no}`)
        }
      } else {
        throw new Error(`请求失败: ${response.statusCode}`)
      }
    } catch (error) {
      console.error('百度语音合成失败:', error)
      throw error
    }
  }

  /**
   * 播放单个文本段落
   * @param {string} text - 文本内容
   * @param {Object} options - 播放选项
   * @returns {Promise<void>}
   */
  async playSingleSegment(text, options = {}) {
    try {
      // 获取音频的base64数据
      const audioResult = await this.textToSpeech(text, options);
      const audioBase64 = audioResult.audioData;

      // 直接使用base64播放，不写入文件
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.src = `data:audio/mp3;base64,${audioBase64}`;

      return new Promise((resolve, reject) => {
        innerAudioContext.onPlay(() => {
          console.log('开始播放:', text);
        });

        innerAudioContext.onEnded(() => {
          innerAudioContext.destroy();
          resolve();
        });

        innerAudioContext.onError((error) => {
          innerAudioContext.destroy();
          reject(error);
        });

        innerAudioContext.play();
      });

    } catch (error) {
      console.error('播放失败:', error);
      throw error;
    }
  }

  /**
   * 播放长文本（支持自动分段和顺序播放）
   * @param {string} text - 要播放的文本
   * @param {Object} options - 配置选项
   * @returns {Promise<void>}
   */
  async playText(text, options = {}) {
    try {
      // 如果正在播放序列，先停止
      if (this.isPlayingSequence) {
        this.stopCurrentPlayback()
      }

      this.isPlayingSequence = true

      // 分割长文本
      const segments = this.splitLongText(text, 900)
      console.log(`文本分割为 ${segments.length} 段`)

      // 顺序播放每个片段
      for (let i = 0; i < segments.length; i++) {
        // 检查是否被中断
        if (!this.isPlayingSequence) {
          console.log('播放被中断')
          break
        }

        const segment = segments[i]
        console.log(`播放第 ${i + 1}/${segments.length} 段:`, segment.substring(0, 50) + '...')

        try {
          await this.playSingleSegment(segment, options)

          // 段落间暂停500ms，避免连读过快
          if (i < segments.length - 1 && this.isPlayingSequence) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (segmentError) {
          console.error(`播放第 ${i + 1} 段失败:`, segmentError)

          // 如果有错误回调，调用它
          if (options.onError) {
            options.onError(segmentError)
            return
          }

          // 如果某段播放失败，继续播放下一段
          if (i < segments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      this.isPlayingSequence = false
      console.log('全文播放完成')

      // 如果有完成回调，调用它
      if (options.onComplete) {
        options.onComplete()
      }

    } catch (error) {
      this.isPlayingSequence = false
      console.error('播放长文本失败:', error)

      // 如果有错误回调，调用它
      if (options.onError) {
        options.onError(error)
      } else {
        throw error
      }
    }
  }

  /**
   * 获取支持的发音人列表
   * @returns {Array} 发音人列表
   */
  getSupportedVoices() {
    return [
      { id: 0, name: '度小美（女声）', gender: 'female' },
      { id: 1, name: '度小宇（男声）', gender: 'male' },
      { id: 3, name: '度逍遥（情感男声）', gender: 'male' },
      { id: 4, name: '度丫丫（情感女声）', gender: 'female' },
      { id: 103, name: '度米朵（情感女声）', gender: 'female' },
      { id: 106, name: '度博文（情感男声）', gender: 'male' },
      { id: 110, name: '度小童（儿童女声）', gender: 'female' },
      { id: 111, name: '度小萌（儿童女声）', gender: 'female' }
    ]
  }

  /**
   * 获取语音合成配置选项
   * @returns {Object} 配置选项说明
   */
  getVoiceOptions() {
    return {
      speed: {
        min: 0,
        max: 15,
        default: 5,
        description: '语速设置'
      },
      pitch: {
        min: 0,
        max: 15,
        default: 5,
        description: '音调设置'
      },
      volume: {
        min: 0,
        max: 15,
        default: 5,
        description: '音量设置'
      },
      person: {
        options: this.getSupportedVoices(),
        default: 0,
        description: '发音人选择'
      }
    }
  }
}

module.exports = BaiduSpeechService
