# GPT-Image-2 生图工具

个人 AI 图片生成工具，调用 OpenAI GPT-Image-2 (通过万擎代理) 生图 API。

## 快速开始

### 1. 安装依赖

```bash
cd gpt-image
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件（已由 `.gitignore` 保护，不会被提交）：

```bash
# 必填：API Key（仅在服务端使用，绝不暴露到前端）
OPENAI_API_KEY=your_api_key_here

# 可选：自定义 API 代理地址（默认使用万擎代理）
# 如果使用官方 OpenAI 端点，改为 https://api.openai.com/v1
OPENAI_BASE_URL=https://wanqing-api.corp.kuaishou.com/api/gateway/v1

# 可选：模型 ID（默认使用万擎的 GPT-Image-2 模型 ID）
# 如果使用官方端点，改为 gpt-image-2
OPENAI_MODEL=ep-iw54sk-1777556894714645965
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 功能

- 文本输入 Prompt 生成图片
- 选择图片尺寸（1024×1024 / 1024×1792 / 1792×1024）
- 选择生成数量（1-4 张）
- 生成完成后显示图片，支持下载
- 历史记录，可一键复用
- 加载状态 & 错误友好提示
- API Key 仅在服务端使用，前端代码不含任何密钥

## 安全说明

- API Key 存放在 `.env.local`，由 Next.js API Routes 在服务端读取
- 前端通过 `/api/generate-image` 代理接口调用，密钥不经过浏览器
- `.env.local` 已被 `.gitignore` 忽略，不会提交到 Git