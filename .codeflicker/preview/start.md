# 张峻烨作品集网站 启动指南

## 项目概述
纯静态单页应用（SPA），无需构建工具，单个 `index.html` 文件即可运行。使用 Tailwind CSS CDN + 原生 JS 实现多级导航作品集展示。

## portfolio - 作品集网站

### 快速启动

```bash
cd /Users/erem1ka/Desktop/bit/portfolio
python3 -m http.server 8080
```

**启动后访问**：http://localhost:8080

```yaml
subProjectPath: portfolio
command: python3 -m http.server 8080
cwd: portfolio
port: 8080
previewUrl: http://localhost:8080
description: 张峻烨效果创意设计作品集，纯静态 HTML 网站，支持编辑模式上传作品、GitHub 云端存储、MP4全屏播放
```
