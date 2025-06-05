# 七七喵点读机 - WeChat Mini Program

[![WeChat Mini Program](https://img.shields.io/badge/WeChat-Mini%20Program-green.svg)](https://developers.weixin.qq.com/miniprogram/dev/framework/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一款专为英语学习者设计的微信小程序，集成了翻译、语音朗读、发音练习等功能。

## 📋 项目简介

"七七喵点读机"是一款基于微信小程序平台的英语学习工具，旨在帮助用户随时随地进行英语学习。程序支持中英文互译、单词点读、语音练习等功能，为用户提供便捷的移动学习体验。

## ✨ 功能特性

### 🔤 翻译功能
- **智能翻译**：支持中英文互译，自动检测输入语言
- **语音输入**：支持语音转文字输入
- **朗读功能**：翻译结果可语音朗读
- **历史记录**：自动保存翻译历史
- **快捷翻译**：常用短语一键翻译

### 📖 点读功能
- **文本处理**：智能分词，支持点击朗读
- **语音控制**：播放、暂停、重复、调速
- **单词详情**：显示音标、释义等详细信息
- **收藏管理**：收藏生词，建立个人词汇库
- **发音练习**：跟读练习，语音评分

### 📊 学习统计
- **使用统计**：记录朗读次数、学习时长等
- **进度跟踪**：可视化学习进度
- **数据分析**：学习效果分析和建议

### 🎛️ 个性化设置
- **语音参数**：调节语速、音量、音调
- **界面主题**：多种界面风格选择
- **用户偏好**：个性化学习设置

## 🛠️ 技术栈

- **框架**：微信小程序原生框架
- **语言**：JavaScript (ES6+)
- **样式**：WXSS (类似CSS)
- **数据存储**：微信小程序本地存储
- **API服务**：
  - 百度翻译API
  - 腾讯云翻译API
  - 讯飞语音API
  - 微信语音API

## 📁 项目结构

```
trans_everything/
├── app.js                  # 小程序入口文件
├── app.json                # 小程序配置文件
├── app.wxss                # 全局样式文件
├── pages/                  # 页面目录
│   ├── index/              # 首页
│   │   ├── index.js
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.json
│   ├── translate/          # 翻译页面
│   │   ├── translate.js
│   │   ├── translate.wxml
│   │   ├── translate.wxss
│   │   └── translate.json
│   └── reading/            # 点读页面
│       ├── reading.js
│       ├── reading.wxml
│       ├── reading.wxss
│       └── reading.json
├── utils/                  # 工具库
│   ├── service-manager.js  # 服务管理器
│   ├── baidu-translate.js  # 百度翻译
│   ├── tencent-translate.js # 腾讯翻译
│   ├── speech.js          # 语音服务
│   ├── iflytek-speech.js  # 讯飞语音
│   └── storage.js         # 存储工具
├── config/                # 配置文件
│   └── api-config.js      # API配置
└── docs/                  # 文档目录
    ├── API接入指南.md      # API接入指南
    └── 使用说明.md         # 使用说明
```

## 🚀 快速开始

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 微信开发者账号
- Node.js >= 12.0.0 (可选)

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/yourusername/trans_everything.git
cd trans_everything
```

2. **导入项目**
- 打开微信开发者工具
- 选择"导入项目"
- 选择项目目录
- 填写AppID（测试号可使用测试AppID）

3. **配置API服务**
- 复制 `config/api-config.js.example` 为 `config/api-config.js`
- 填写各个API服务的密钥信息：

```javascript
// config/api-config.js
const config = {
  // 百度翻译API
  baidu: {
    appid: 'your_baidu_appid',
    key: 'your_baidu_key'
  },
  // 腾讯云翻译API
  tencent: {
    secretId: 'your_tencent_secret_id',
    secretKey: 'your_tencent_secret_key',
    region: 'ap-beijing'
  },
  // 讯飞语音API
  iflytek: {
    appId: 'your_iflytek_appid',
    apiSecret: 'your_iflytek_api_secret',
    apiKey: 'your_iflytek_api_key'
  }
};
```

4. **启动开发**
- 在微信开发者工具中点击"编译"
- 在模拟器中预览效果

### API服务申请

详细的API申请和配置步骤请参考：[API接入指南](docs/API接入指南.md)

## 📱 预览与部署

### 开发预览
1. 在微信开发者工具中点击"预览"
2. 扫描二维码在真机上调试

### 提交审核
1. 在微信开发者工具中点击"上传"
2. 填写版本信息和更新日志
3. 在微信公众平台提交审核
4. 审核通过后发布上线

## 🔧 开发指南

### 添加新功能

1. **创建新页面**
```bash
# 在pages目录下创建新页面目录
mkdir pages/new-feature
cd pages/new-feature

# 创建页面文件
touch new-feature.js new-feature.wxml new-feature.wxss new-feature.json
```

2. **注册页面路由**
在 `app.json` 中添加页面路径：
```json
{
  "pages": [
    "pages/index/index",
    "pages/translate/translate",
    "pages/reading/reading",
    "pages/new-feature/new-feature"
  ]
}
```

3. **实现页面逻辑**
参考现有页面的结构和 `utils/service-manager.js` 提供的服务。

### 服务集成

项目使用统一的服务管理器 (`utils/service-manager.js`) 来管理各种API服务：

```javascript
const serviceManager = require('../../utils/service-manager.js');

// 翻译服务
const result = await serviceManager.translate(text, sourceLang, targetLang);

// 语音服务
await serviceManager.textToSpeech(text, options);
const recognizedText = await serviceManager.speechToText(duration);
```

### 样式规范

- 使用 `rpx` 单位适配不同屏幕
- 遵循微信小程序设计规范
- 保持界面简洁美观
- 支持深色模式

## 🧪 测试

### 单元测试
```bash
# 安装测试依赖
npm install --save-dev @jest/core jest

# 运行测试
npm test
```

### 功能测试
- 在微信开发者工具中进行功能测试
- 使用真机调试验证语音功能
- 测试不同网络环境下的表现

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 🤝 贡献指南

欢迎参与项目贡献！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 贡献规范

- 遵循现有代码风格
- 添加必要的注释和文档
- 确保所有测试通过
- 更新相关文档

## 🐛 问题反馈

如果您发现了bug或有功能建议，请通过以下方式反馈：

- [GitHub Issues](https://github.com/yourusername/trans_everything/issues)
- 邮箱：244663057@qq.com

## 📞 联系我们

- **开发团队**：七七开发团队
- **项目主页**：https://github.com/liushengyu/trans_everything
- **技术支持**：244663057@qq.com
- **商务合作**：244663057@qq.com

## 🎉 致谢

感谢以下开源项目和服务提供商：

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [百度翻译API](https://fanyi-api.baidu.com/)
- [腾讯云机器翻译](https://cloud.tencent.com/product/tmt)
- [讯飞开放平台](https://www.xfyun.cn/)

---

**⭐ 如果这个项目对您有帮助，请考虑给它一个星标！**
