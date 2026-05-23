# 张峻烨 · 作品集

> 动效设计师 × AIGC 全链路创作者 — AE / PS / AI Workflow

---

## 🚀 在线访问

| 版本 | 地址 | 说明 |
|------|------|------|
| **v2 主站** | [erem1ka.github.io/portfolio/v2/](https://erem1ka.github.io/portfolio/v2/) | 当前迭代版本（本仓库） |
| v1 归档 | [erem1ka.github.io/portfolio/](https://erem1ka.github.io/portfolio/) | 暗色电影感初版，tag `v1-stable` |

---

## 📁 文件结构

```
portfolio/
├── index.html              # 主页面 HTML 骨架（7章节）
├── HANDOFF.md              # 项目交接文档（开发备忘）
│
├── css/
│   ├── tokens.css          # 设计变量（配色 / 字号 / 间距 / 缓动 / z-index）
│   ├── typography.css      # 字体系统（Inter + JetBrains Mono）
│   ├── background.css      # 五层背景质感系统
│   ├── layout.css          # 浮动导航 + 章节容器 + 滚动进度条
│   ├── motif.css           # 圆点母题（7种形态）
│   ├── gallery.css         # 横向滚动画廊
│   ├── modal.css           # 作品 Modal + Behind The Frame 时间线
│   ├── editor.css          # 本地编辑器面板样式
│   └── mobile.css          # 移动端专属适配（< 768px）
│
├── js/
│   ├── app.js              # 主入口（Lenis 滚动 / 导航 / 进度条 / 鼠标光斑）
│   ├── motif.js            # 圆点母题状态机（lerp 光标跟随）
│   ├── loader.js           # CH0 Loading 序列（圆点脉冲 → 分裂 → 碎裂）
│   ├── transitions.js      # 章节转场系统（横线 + 标题卡）
│   ├── gallery.js          # 横向滚动画廊（GSAP ScrollTrigger pin + scrub）
│   ├── modal.js            # 作品 Modal + Behind The Frame 4 节点时间线
│   ├── velocity.js         # 滚动速度感应（speed lines 视觉反馈）
│   ├── easterEgg.js        # 时间胶囊彩蛋（Konami code）
│   └── editor.js           # 本地编辑模式（连按 E / Shift+Alt+E 唤出）
│
├── data/
│   └── works.json          # 作品数据（结构化 JSON，画廊数据来源）
│
└── assets/
    ├── images/             # 作品封面图
    └── videos/             # 作品视频文件
```

---

## 🏗 核心架构

### 五层背景质感系统

| 层 | 实现方式 | 效果 |
|---|---|---|
| Layer 1 | `body { background: #0B0B0F }` | 色温微偏基础色（非纯黑） |
| Layer 2 | `body::before` 径向渐变 | 穹顶光感（顶部稍亮 → 底部收深） |
| Layer 3 | `body::after` SVG feTurbulence | 胶片噪点纹理（opacity 0.045） |
| Layer 4 | `.bg-glow` CSS 变量 --mx/--my | 鼠标光斑跟随（rAF 节流 60fps，移动端关闭） |
| Layer 5 | `.bg-sidebar-glow` 左侧固定光源 | 侧边栏打光 |

### 圆点母题系统

统一视觉语言：4–16px 强调色圆点（`#FF3B5C`），贯穿全站 7 种形态，`mix-blend-mode: difference`。

| 形态 | 尺寸 | 用途 |
|---|---|---|
| Loading 脉冲 | 4px | CH0 动画起点 |
| 自定义光标 | 16px + 32px 描边环 | 桌面端替代系统光标 |
| Hover 播放 | 64px | 卡片悬停圆形遮罩 |
| 作品编号 | 8px | ● 01 序号标注 |
| 章节分隔线 | 100vw × 1px | 圆点拉伸为横线 |
| 滚动进度 | 6px | 1px 竖线 + 顶端游标 |
| Footer 终点 | 4px → 0 | 圆点缩回消失 |

### 章节结构

| 章节 | 代号 | 内容 |
|---|---|---|
| CH0 | Loading | 圆点脉冲 → 碎裂动画入场 |
| CH1 | 最强作品 | 全屏沉浸式作品展示 |
| CH2 | 画廊 | 横向滚动作品墙（ScrollTrigger） |
| CH3 | 幕后 | 作品 Modal + Behind The Frame 时间线 |
| CH4 | 档案 | 瀑布流作品归档 |
| CH5 | 关于我 | 个人简介 + 联系方式 |
| CH6 | 终章 | Footer + 圆点收尾 |

---

## ✏️ 编辑模式

本地内容编辑器，仅供开发调试使用，不影响访客。

**唤出方式**：连按两次 `E` 键（500ms 内）或 `Shift + Alt + E`

**功能**：
- 浏览 / 新增 / 编辑 / 删除作品卡片
- 拖拽上传封面图（base64 存 localStorage）
- 填写作品信息（标题 / 年份 / 工具 / Behind The Frame）
- 保存后实时刷新画廊
- 一键导出 `works.json`（下载后替换文件即可持久化）

---

## 🛠 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | 纯原生 HTML / CSS / JS（无任何构建工具） |
| 动画引擎 | GSAP 3 + ScrollTrigger（CDN） |
| 滚动 | Lenis smooth scroll（CDN） |
| CSS Reset | modern-normalize（CDN） |
| 字体 | Inter + JetBrains Mono（Google Fonts CDN） |
| 配色 | 自定义 token 系统，纯暗色模式 |
| 动画技法 | FLIP + CSS transitions + IntersectionObserver |
| 部署 | GitHub Pages（`/docs` 根目录） |

---

## 🎨 配色速查

| 变量 | HEX | 用途 |
|---|---|---|
| `--bg-base` | `#0B0B0F` | 全局基础背景 |
| `--bg-card` | `#131318` | 卡片、Modal |
| `--bg-deep` | `#08080B` | 渐变最深处 |
| `--text-primary` | `#F5F5F0` | 标题、导航（暖白） |
| `--text-secondary` | `#8A8A85` | 正文、辅助说明 |
| `--border` | `#2A2A2A` | hairline 分割线 |
| `--accent` | `#FF3B5C` | 圆点母题、CTA、Hover |
| `--ai-accent` | `#00D4FF` | AIGC 标签、AI 模块 |

---

## ⚡ 本地运行

无需构建，直接用任意静态服务器打开即可：

```bash
# 方式一：VS Code Live Server 插件
# 右键 index.html → Open with Live Server

# 方式二：Python
python3 -m http.server 8080

# 方式三：npx
npx serve .
```

浏览器打开 `http://localhost:8080`

---

## 📌 开发进度

| 批次 | 内容 | 状态 |
|---|---|---|
| 第一批 | 骨架 + 五层背景 + 圆点母题 7形态 + 浮动导航 + 进度条 | ✅ |
| 第二批 | CH0 Loading + CH1 最强作品 + 章节转场系统 | ✅ |
| 第三批 | CH2 横向画廊 + 速度感应 + 彩蛋 + 本地编辑器 + 移动端 | ✅ |
| 第四批 | CH3 Modal + Behind The Frame 4 节点时间线 | ✅ |
| 第五批 | CH4 档案 + CH5 关于我 + CH6 终章 | ⏳ 待开发 |
| 第六批 | 光标完善 + 微交互打磨 + 性能优化 | ⏳ 待开发 |

---

*网站即作品 — 30秒内让 HR 决定要你*
