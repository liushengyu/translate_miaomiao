# API接入指南 - 翻译与语音服务

## 📋 概述

本指南将帮助您将真实的翻译API和语音服务集成到"七七喵点读机"小程序中，替换当前的模拟功能。

## 🌐 翻译服务接入

### 1. 百度翻译API（推荐）

#### 申请步骤：
1. 访问：https://fanyi-api.baidu.com/
2. 注册百度账号并实名认证
3. 创建应用，获取 `APPID` 和 `密钥`

#### 特点：
- **免费额度**：每月200万字符
- **支持语言**：200+种语言
- **响应速度**：快
- **稳定性**：高

#### 配置方法：
```javascript
// 在 config/api-config.js 中配置
baidu: {
  translate: {
    appid: 'YOUR_BAIDU_TRANSLATE_APPID',
    key: 'YOUR_BAIDU_TRANSLATE_KEY'
  }
}
```

#### 价格：
- 免费：每月200万字符
- 标准版：49元/千万字符
- 高级版：99元/千万字符

### 2. 腾讯翻译君API

#### 申请步骤：
1. 访问：https://cloud.tencent.com/product/tmt
2. 注册腾讯云账号并完成实名认证
3. 开通翻译君服务
4. 创建API密钥，获取 `SecretId` 和 `SecretKey`

#### 特点：
- **免费额度**：每月500万字符
- **支持语言**：100+种语言
- **准确度**：高
- **专业领域**：支持多个专业领域翻译

#### 配置方法：
```javascript
// 在 config/api-config.js 中配置
tencent: {
  translate: {
    secretId: 'YOUR_TENCENT_SECRET_ID',
    secretKey: 'YOUR_TENCENT_SECRET_KEY',
    region: 'ap-beijing'
  }
}
```

#### 价格：
- 免费：每月500万字符
- 按量计费：2元/百万字符

### 3. 有道智云API

#### 申请步骤：
1. 访问：https://ai.youdao.com/
2. 注册账号并创建应用
3. 获取 `应用ID` 和 `应用密钥`

#### 特点：
- **免费额度**：每月100万字符
- **支持语言**：100+种语言
- **词典集成**：可同时使用有道词典API

#### 配置方法：
```javascript
// 在 config/api-config.js 中配置
youdao: {
  translate: {
    appKey: 'YOUR_YOUDAO_APP_KEY',
    appSecret: 'YOUR_YOUDAO_APP_SECRET'
  }
}
```

## 🔊 语音服务接入

### 1. 微信小程序原生TTS（推荐入门）

#### 申请步骤：
1. 在微信小程序管理后台申请相关权限
2. 配置 `app.json` 中的权限声明

#### 特点：
- **免费**：完全免费
- **集成简单**：无需额外API
- **限制**：功能相对简单，语音质量一般

#### 配置方法：
```json
// 在 app.json 中添加权限
"permission": {
  "scope.record": {
    "desc": "用于录音功能"
  }
}
```

### 2. 科大讯飞语音服务（推荐）

#### 申请步骤：
1. 访问：https://www.xfyun.cn/
2. 注册账号并实名认证
3. 创建应用，选择语音合成和语音识别服务
4. 获取 `APPID`、`APISecret` 和 `APIKey`

#### 特点：
- **免费额度**：每日500次调用
- **语音质量**：优秀，支持多种音色
- **识别准确率**：高
- **支持方言**：支持多种方言识别

#### 配置方法：
```javascript
// 在 config/api-config.js 中配置
iflytek: {
  speech: {
    appId: 'YOUR_IFLYTEK_APPID',
    apiSecret: 'YOUR_IFLYTEK_API_SECRET',
    apiKey: 'YOUR_IFLYTEK_API_KEY'
  }
}
```

#### 价格：
- 免费：每日500次调用
- 包年套餐：88元/年（10万次）
- 按量计费：0.0015元/次

### 3. 百度语音服务

#### 申请步骤：
1. 访问：https://ai.baidu.com/tech/speech
2. 注册百度AI开放平台账号
3. 创建语音技术应用
4. 获取 `App ID`、`API Key` 和 `Secret Key`

#### 特点：
- **免费额度**：每日5万次调用
- **语音质量**：好
- **功能丰富**：支持情感合成、个性化定制

#### 配置方法：
```javascript
// 在 config/api-config.js 中配置
baidu: {
  speech: {
    appId: 'YOUR_BAIDU_SPEECH_APPID',
    apiKey: 'YOUR_BAIDU_SPEECH_APIKEY',
    secretKey: 'YOUR_BAIDU_SPEECH_SECRETKEY'
  }
}
```

### 4. 阿里云语音服务

#### 申请步骤：
1. 访问：https://nls.console.aliyun.com/
2. 注册阿里云账号并实名认证
3. 开通智能语音交互服务
4. 创建项目并获取密钥

#### 特点：
- **语音质量**：优秀，支持多种音色
- **实时性**：低延迟
- **多样化**：支持多种语音合成效果

## 🔧 配置步骤

### 1. 复制配置示例文件

首先，复制配置示例文件并重命名：

```bash
# 复制示例配置文件
cp config/api-config.js.example config/api-config.js
```

### 2. 修改配置文件

编辑 `config/api-config.js`，填入您申请到的API密钥：

```javascript
const config = {
  // 设置为false启用真实API服务
  useMock: false,

  // 选择您的翻译服务
  baidu: {
    translate: {
      appid: 'YOUR_BAIDU_TRANSLATE_APPID',    // 替换为真实的APPID
      key: 'YOUR_BAIDU_TRANSLATE_KEY'         // 替换为真实的密钥
    }
  },

  // 选择您的语音服务
  iflytek: {
    speech: {
      appId: 'YOUR_IFLYTEK_APPID',
      apiSecret: 'YOUR_IFLYTEK_API_SECRET',
      apiKey: 'YOUR_IFLYTEK_API_KEY'
    }
  }
}
```

### 3. 设置环境变量

为了安全起见，建议使用环境变量存储敏感信息：

```javascript
// 生产环境使用环境变量
const config = {
  baidu: {
    translate: {
      appid: process.env.BAIDU_TRANSLATE_APPID,
      key: process.env.BAIDU_TRANSLATE_KEY
    }
  }
}
```

### 4. 测试服务

在小程序中测试各项功能：

1. **翻译功能**：输入英文文本，检查翻译结果
2. **语音合成**：点击朗读按钮，检查语音播放
3. **语音识别**：使用录音功能，检查识别准确率

## 💡 最佳实践

### 1. 服务降级

当API服务不可用时，自动切换到模拟服务：

```javascript
// 在 utils/service-manager.js 中已实现
async translate(text, from = 'en', to = 'zh') {
  try {
    const result = await this.translateService.translate(text, from, to)
    return result
  } catch (error) {
    console.error('翻译失败:', error)
    // 降级到模拟翻译
    return this.mockTranslate(text)
  }
}
```

### 2. 缓存机制

为常用翻译结果添加缓存：

```javascript
// 实现本地缓存
const cacheKey = `translate_${text}_${from}_${to}`
const cached = wx.getStorageSync(cacheKey)
if (cached) {
  return cached
}
```

### 3. 错误处理

完善的错误处理和用户提示：

```javascript
try {
  const result = await serviceManager.translate(text)
  // 处理成功结果
} catch (error) {
  wx.showToast({
    title: '翻译失败，请检查网络',
    icon: 'none'
  })
}
```

### 4. 用量监控

监控API使用量，避免超出限额：

```javascript
// 记录API调用次数
const today = new Date().toDateString()
let apiUsage = wx.getStorageSync('apiUsage') || {}
if (apiUsage.date !== today) {
  apiUsage = { date: today, count: 0 }
}
apiUsage.count++
wx.setStorageSync('apiUsage', apiUsage)
```

## 🚀 推荐配置方案

### 方案一：经济型（适合个人开发者）
- **翻译**：百度翻译API（200万字符/月免费）
- **语音**：微信小程序原生TTS + 科大讯飞（500次/日免费）

### 方案二：标准型（适合小型企业）
- **翻译**：腾讯翻译君（500万字符/月免费）
- **语音**：科大讯飞语音服务（包年套餐）

### 方案三：专业型（适合大型应用）
- **翻译**：百度翻译API 标准版
- **语音**：阿里云智能语音服务
- **额外**：有道词典API（词汇查询）

## 📞 技术支持

如果在接入过程中遇到问题：

1. **查看文档**：各服务商官方文档
2. **社区支持**：微信开发者社区
3. **在线客服**：各API服务商技术支持

## ⚠️ 注意事项

1. **API密钥安全**：不要在客户端代码中直接暴露API密钥
2. **配置文件安全**：
   - 确保 `config/api-config.js` 包含在 `.gitignore` 中
   - 不要将包含真实API密钥的配置文件提交到代码仓库
   - 定期更换API密钥以确保安全
   - 生产环境建议使用环境变量存储敏感信息
3. **用量限制**：注意监控API使用量，避免超出限额
4. **网络环境**：确保小程序有网络访问权限
5. **用户隐私**：语音识别功能需要用户授权
6. **服务稳定性**：建议配置多个服务商作为备选方案

## 🔒 安全配置检查清单

在部署前请确认：
- [ ] 已将 `config/api-config.js` 添加到 `.gitignore`
- [ ] 配置文件中的所有 `YOUR_*` 占位符已替换为真实密钥
- [ ] 已将 `useMock` 设置为 `false`
- [ ] 生产环境使用环境变量而非硬编码密钥
- [ ] 已测试所有配置的API服务正常工作

---

**提示**：建议先使用免费额度测试各项功能，确认满足需求后再考虑付费升级。
