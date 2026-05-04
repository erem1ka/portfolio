# Portfolio — 张峻烨作品集

> 效果创意设计 × AIGC 全链路创作者

---

## 🚀 在线访问

| 版本 | 地址 | 说明 |
|------|------|------|
| **v2 主站** | [erem1ka.github.io/portfolio/v2/](https://erem1ka.github.io/portfolio/v2/) | 当前迭代版本 |
| v2 预览页 | [erem1ka.github.io/portfolio/v2-preview.html](https://erem1ka.github.io/portfolio/v2-preview.html) | 结构一致的预览镜像 |
| v1 归档 | [erem1ka.github.io/portfolio/](https://erem1ka.github.io/portfolio/) | 暗色电影感初版，tag `v1-stable` |

---

## 📁 文件结构

```
docs/
├── v2/
│   ├── index.html              # 主页面（HTML + 内联 CSS/JS）
│   ├── app.js                  # 数据渲染、编辑模式、云同步、卡片生成
│   ├── style.css               # 样式表
│   ├── cloudbase-sdk.min.js     # 腾讯云开发 SDK
│   ├── easterEgg.js             # 彩蛋交互
│   ├── favicon.svg             # 网站图标
│   ├── hero-illus.png           # Hero 区插画
│   └── README.md                # v2 详细说明
├── v2-preview.html              # 预览页
├── v2-preview-app.js            # 预览页数据逻辑
├── index.html                   # v1 主页
├── v1-app.js                   # v1 逻辑
├── v1-style.css                 # v1 样式
└── README.md                    # 本说明文档
```

---

## 🏗 核心架构

### 主题系统

- 双主题：**深色 / 浅色**，编辑模式下可切换（右上角圆形按钮，暂默认隐藏，优化后再开放）
- 暗色模式配色对齐 **GitHub Dark（Primer 风格）**，所有文字对比度达到 WCAG AA/AAA
- CSS 变量 token 驱动：颜色、边框、阴影、overlay 均通过变量统一管理

### 响应式布局

| 断点 | 布局策略 |
|------|---------|
| ≥2560px (4K) | sidebar 320px, 内容 max-width 2200px |
| ≥1920px | sidebar 300px, 内容 max-width 1800px |
| ≥1440px | sidebar 280px, clamp padding |
| 901–1280px | sidebar 220px, 紧凑布局 |
| ≤900px | sidebar 隐藏, 左上角汉堡菜单, hero 垂直堆叠 |
| ≤600px | 2 列网格, padding 收窄 |
| ≤375px | Contact 纵向堆叠, 最小字号 |

### 数据同步（CloudBase 腾讯云开发）

- **云数据库集合：** `portfolio_v2` → 文档 `main`
- **本地缓存：** `localStorage` key `portfolio_v2_data`
- **版本冲突机制：** `_version`（时间戳）做本地与云端对比
- **编辑者锁：** 只有进入编辑模式的设备持有 `portfolio_v2_editor_token` 才可 push；非编辑设备仅 pull
- **自动发布：** 修改后 3s debounce 自动推送云端

### 卡片交互

- **所有卡片** 点击统一走 `openMedia()` → FLIP zoom overlay
- **个人作品卡片**（practice2 / mg）额外 `rotateY` 翻转
- 视频在 overlay 内播放
- 空标题+空描述的卡片在非编辑模式下自动隐藏文字区域

### 信息架构

| 模块 | 数据 key | 展示方式 | 说明 |
|------|---------|---------|------|
| Business Works | `practice` / `practice2` | 横向画廊滚动 | 双画廊布局，左右交替溢出 |
| Personal Works — MG | `mg` | Masonry 网格 | 矢量 MG 动画 |
| AIGC — Generative Workflow | `aigc-img` | Work 网格 | AI 生图 + AE 动效管线 |
| AI Tools — Creative Workflow | `agent` | Masonry 网格 | 自建 AI 创意工具 |
| Contact | `contact` | 名片式 | 微信二维码 / 电话 / 邮箱 / QQ |

> ⚠️ **各模块标题、描述、卡片内容等文字均为可编辑字段，以用户在网页编辑模式下修改的内容为准，代码中的默认值仅为初始模板。**

---

## ✏️ 编辑模式

1. 连按两下 **E** 键（或点击右下角齿轮菜单 → 编辑）
2. 进入后：
   - 标题、描述直接点击编辑
   - 悬停卡片出现 **上传媒体 / 删除** 按钮
   - 底部出现 **添加卡片** 按钮
   - 行高输入框可调整 Masonry 行高（60–300px）
   - 可拖拽排序卡片
   - 主题切换按钮可见（右上角圆形按钮）
3. 首次进入标记当前设备为 **编辑者**（只有编辑者能推送云端）
4. 退出自动保存

---

## 🎨 作品上传

编辑模式 → 悬停卡片 → **上传媒体**，支持 `.mp4` `.webm` `.gif` `.webp` `.jpg` `.png`

上传流程：文件存入腾讯云存储 → 获得 `fileID` → 生成公开 URL → 图片自动压缩 → MP4 自动提取封面帧

---

## 📱 多设备访问

- **编辑者设备**：修改 → 自动推送云端 → 其他设备可见
- **非编辑者设备**：访问时自动 pull 云端最新数据
- 版本冲突始终以云端为权威来源

---

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | 纯原生 HTML/CSS/JS |
| 云服务 | 腾讯云开发 CloudBase |
| 部署 | GitHub Pages |
| 字体 | Noto Sans SC / Cormorant Garamond / DM Serif Display / Caveat / Space Mono |
| 主题 | CSS 变量 token + GitHub Primer 暗色配色 |
| 动画 | FLIP + CSS transitions + IntersectionObserver |
| 滚动 | GSAP ScrollTrigger + Lenis smooth scroll |

---

## 🔑 部署前替换

`app.js` 中搜索以下占位符替换：

| 占位符 | 替换为 |
|--------|--------|
| `{{EMAIL}}` | 邮箱 |
| `{{QQ}}` | QQ 号 |
| `{{PHONE}}` | 手机号 |

---

## ⚡ 快速部署

```bash
git clone https://github.com/erem1ka/portfolio.git
cd portfolio
# 替换占位符后推送
git push
# GitHub Pages 自动发布 → https://erem1ka.github.io/portfolio/v2/
```

---

## 📌 版本独立

v1（`docs/v1-*`）与 v2（`docs/v2/`）完全独立，互不影响。
