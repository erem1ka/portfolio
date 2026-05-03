# Portfolio v2 — 张峻烨作品集

> 效果创意设计 × AIGC 全链路创作者

---

## 🚀 在线访问

**GitHub Pages（主站）：** [https://erem1ka.github.io/portfolio/docs/v2/](https://erem1ka.github.io/portfolio/docs/v2/)

**预览页（独立入口）：** [https://erem1ka.github.io/portfolio/docs/v2-preview.html](https://erem1ka.github.io/portfolio/docs/v2-preview.html)

---

## 📁 文件结构

```
docs/
├── v2/
│   ├── index.html          # 主页面（HTML + 内联 CSS/JS）
│   ├── app.js              # 数据渲染、编辑模式、云同步、卡片生成
│   ├── style.css           # 样式表
│   ├── cloudbase-sdk.min.js # 腾讯云开发 SDK
│   ├── easterEgg.js        # 彩蛋交互
│   ├── favicon.svg         # 网站图标
│   └── hero-illus.png      # Hero 区插画
├── v2-preview.html         # 预览页（与主版结构一致）
├── v2-preview-app.js       # 预览页数据逻辑
├── v1-*                    # v1 版本（独立运行，不受 v2 影响）
└── README.md               # 本说明文档
```

---

## 🏗 核心架构

### 主题系统

- 双主题：**深色 / 浅色**，一键切换（右上角圆形按钮）
- 暗色模式配色完全对齐 **GitHub Dark（Primer 风格）**：
  - 背景 `#0d1117` / 卡片 `#161b22` / 主色 `#e6edf3` / 强调蓝 `#58a6ff`
- CSS 变量 token 驱动：所有颜色、边框、阴影、overlay 均通过变量统一管理
- SVG stroke/fill / JS 动画颜色同步使用 CSS 变量，主题切换零断点

### 数据同步（CloudBase 腾讯云开发）

- **云环境 ID：** `my-web-d5gsldm9ha36297d1`
- **云数据库集合：** `portfolio_v2` → 文档 `main`
- **本地缓存：** `localStorage` key `portfolio_v2_data`
- **版本冲突机制：** `_version`（时间戳）做本地与云端对比
- **编辑者锁：** 只有进入编辑模式的设备才持有 `portfolio_v2_editor_token`，可以 push 数据到云端；非编辑设备仅 pull
- **初始化策略：**
  - 本地版本 > 云端 → 编辑者 push / 非编辑者强制 pull
  - 云端版本 > 本地 → 强制 pull 云端最新数据
- **自动发布：** 修改后 3s debounce 自动推送云端

### 卡片交互

- **所有卡片** 点击统一走 `openMedia()` → FLIP zoom overlay
- **个人作品卡片**（practice2 / mg）额外支持 `rotateY` 翻转
- 视频在 overlay 内播放，不使用内联播放器
- 首次点击动画保护：图片未加载完时等待 `load/error` 再执行 FLIP

### 信息架构

| 模块 | 数据 key | 说明 |
|------|---------|------|
| 短视频平台 · 业务作品 | `practice` / `practice2` | 画廊滚动模式 |
| 无畏契约 LOGO · 原创 MG 动画 | `mg` | Masonry 网格 |
| AIGC 作品 ＆ 联合 AE 产出 | `aigc-img` | Work 网格 |
| AI 智能体创意工作流工具集 | `agent` | Masonry 网格 |
| 联系方式 | `contact` | 名片 / 简历 / 社交链接 |

---

## ✏️ 编辑模式

1. 点击页面右下角 **「编辑」** 按钮
2. 进入编辑模式后：
   - 卡片标题、描述可直接点击编辑（`contentEditable`）
   - 悬停卡片出现 **上传媒体 / 删除** 按钮
   - 底部出现 **添加卡片** 按钮
   - 行高输入框出现（可调整 Masonry 行高 60–300px）
   - 可拖拽排序卡片
3. 首次进入编辑模式会标记当前设备为 **编辑者**（只有编辑者才能推送数据到云端）
4. 退出编辑模式自动保存

> ⚠️ 非编辑者设备无法推送数据到云端，防止旧 localStorage 覆盖云端最新数据

---

## 🎨 作品上传

1. 编辑模式下悬停卡片 → 点击 **上传媒体**
2. 支持：`.mp4` `.webm` `.gif` `.webp` `.jpg` `.png`
3. 上传流程：
   - 文件先存入腾讯云存储（CloudBase）
   - 获得 `fileID` 后生成公开 URL
   - 图片自动压缩（webp/gif 不压缩）
   - MP4 自动提取封面帧

---

## 📱 多设备访问

- **编辑者设备**：修改 → 自动推送云端 → 其他设备可见
- **非编辑者设备**：访问时自动 pull 云端最新数据 → 渲染
- **版本冲突**：始终以云端为权威来源（非编辑者强制 pull）

---

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | 纯原生 HTML/CSS/JS（无框架依赖） |
| 云服务 | 腾讯云开发 CloudBase（数据库 + 存储） |
| 部署 | GitHub Pages（`main` 分支自动发布） |
| 字体 | Noto Sans SC / Cormorant Garamond / DM Serif Display / Caveat / Space Mono |
| 主题 | CSS 变量 token + GitHub Primer 暗色配色 |
| 动画 | FLIP position animation + CSS transitions + IntersectionObserver 懒加载 |

---

## 🔑 关键配置

部署前需确认以下占位符已替换（在 `app.js` 中搜索）：

| 占位符 | 替换为 |
|--------|--------|
| `{{EMAIL}}` | 你的邮箱 |
| `{{QQ}}` | QQ 号 |
| `{{PHONE}}` | 手机号 |

CloudBase 云环境 ID 硬编码在 `app.js` 顶部：
```js
const CLOUD_ENV_ID = 'my-web-d5gsldm9ha36297d1';
```

---

## ⚡ 快速部署

```bash
# 1. 克隆仓库
git clone https://github.com/erem1ka/portfolio.git
cd portfolio

# 2. 修改占位符（邮箱、QQ、手机号）
# 3. 推送到 GitHub
git add .
git commit -m "update portfolio v2"
git push

# 4. GitHub Pages 自动发布
# 访问 https://erem1ka.github.io/portfolio/docs/v2/
```

---

## 📌 v1 / v2 独立运行

- `docs/v1-*` 文件为 v1 版本，**完全独立**，v2 的修改不影响 v1
- `docs/v2/` 为 v2 主版本
- `docs/v2-preview.html` + `docs/v2-preview-app.js` 为 v2 预览页

---

## 📜 License

个人作品集项目，仅供展示使用。