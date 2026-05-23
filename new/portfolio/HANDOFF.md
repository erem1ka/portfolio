# 📦 Portfolio v2 — 项目交接文档

> 最后更新：2026-05-23
> 项目路径：`/Users/erem1ka/Desktop/bit/new/portfolio`
> Git 远程：`https://github.com/erem1ka/portfolio.git`

---

## 一、当前文件清单

```
portfolio/
├── index.html              ✅ HTML骨架（7章节 + Loading + 完整结构）
├── README.md               ✅ 项目说明（已同步实际状态）
├── HANDOFF.md              ✅ 本交接文档
│
├── css/
│   ├── tokens.css          ✅ 设计变量（配色/字号/间距/缓动/z-index）
│   ├── typography.css      ✅ 字体系统（Inter + JetBrains Mono）
│   ├── background.css      ✅ 五层背景质感系统
│   ├── layout.css          ✅ 浮动导航 + 章节容器 + 滚动进度条
│   ├── motif.css           ✅ 圆点母题样式（7种形态）
│   ├── gallery.css         ✅ 横向滚动画廊
│   ├── modal.css           ✅ 作品 Modal + Behind The Frame 时间线
│   ├── editor.css          ✅ 本地编辑器面板样式
│   └── mobile.css          ✅ 移动端专属适配（< 768px）
│
├── js/
│   ├── app.js              ✅ 主入口（Lenis / 导航 / 进度条 / 鼠标光斑）
│   ├── motif.js            ✅ 圆点状态机 + lerp 光标跟随
│   ├── loader.js           ✅ CH0 Loading 序列
│   ├── transitions.js      ✅ 章节转场系统
│   ├── gallery.js          ✅ 横向滚动画廊（GSAP ScrollTrigger）
│   ├── modal.js            ✅ 作品 Modal + Behind The Frame 4节点时间线
│   ├── velocity.js         ✅ 滚动速度感应（speed lines）
│   ├── easterEgg.js        ✅ 时间胶囊彩蛋（Konami code）
│   └── editor.js           ✅ 本地编辑模式（连按 E 唤出）
│
├── data/
│   └── works.json          ✅ 作品数据（画廊数据来源）
│
└── assets/
    ├── images/             📁 待填充真实封面图
    └── videos/             📁 待填充真实视频
```

---

## 二、设计规格

**设计文档**：`/Users/erem1ka/Desktop/bit/new/wtf.txt`（576行）

核心理念：
- **网站即作品**级求职作品集
- 目标岗位：字节跳动抖音效果与创作团队 — 效果创意设计实习生
- 作者：张峻烨，动效设计师（AE + PS + AIGC）
- 核心原则：网站本身是动效作品，但作品永远是主角，30秒内让HR决定要你
- 统一视觉母题：4-16px 强调色圆点（#FF3B5C），7种形态贯穿全站
- 五层背景质感系统：拒绝纯黑，叠加质感营造"看不见但感觉得到"的暗色氛围
- **纯暗色模式，不提供浅色切换**

---

## 三、背景质感系统

| 层级 | 实现方式 | 状态 |
|------|---------|------|
| Layer 1 色温基础色 | `body { background-color: #0B0B0F }` | ✅ |
| Layer 2 穹顶渐变 | `body::before` radial-gradient | ✅ |
| Layer 3 胶片噪点 | `body::after` SVG feTurbulence, opacity 0.045 | ✅ |
| Layer 4 鼠标光斑 | `.bg-glow` CSS变量--mx/--my，移动端关闭 | ✅ |
| Layer 5 侧边栏打光 | `.bg-sidebar-glow` 左侧固定光源 | ✅ |

**调试方式（浏览器控制台）**：
```js
document.body.className = 'debug-bg--layer1'  // 仅Layer 1
document.body.className = 'debug-bg--layer2'  // Layer 1+2
document.body.className = 'debug-bg--layer3'  // Layer 1+2+3
document.body.className = ''                   // 全部五层
```

---

## 四、圆点母题系统

| 形态 | 尺寸 | CSS 类名 |
|------|------|---------|
| Loading 脉冲 | 4px | `.motif-dot--loading` |
| 自定义光标 | 16px + 32px 描边环 | `.motif-dot--cursor` |
| Hover 播放 | 64px | `.motif-dot--hover-play` |
| 作品编号 | 8px | `.work-number__dot` |
| 章节分隔线 | 100vw×1px | `.motif-dot--divider` |
| 滚动进度游标 | 6px | `.scroll-progress__dot` |
| Footer 终点 | 4px→0 | `.motif-dot--end` |

光标拖尾：32px 描边圆环，lerp 0.08 延迟跟随
`mix-blend-mode: difference`：暗背景反白，亮内容反暗

---

## 五、编辑模式

- **唤出**：连按两次 `E`（500ms 内）或 `Shift+Alt+E`
- 功能：新增/编辑/删除作品卡片，拖拽上传封面图，填写 BTF 信息，导出 works.json
- 数据存储：`localStorage` key `portfolio_works`
- 导出后替换 `data/works.json` 即可持久化

---

## 六、技术约束

- 纯原生 HTML + CSS + JS，无构建工具、无框架
- GSAP 3 + ScrollTrigger + Lenis 通过 CDN 引入
- 字体通过 Google Fonts CDN（Inter + JetBrains Mono）
- modern-normalize 通过 CDN 引入
- `prefers-reduced-motion` 检测，自动降级动画
- 移动端（< 768px）关闭 Layer4 光斑 + 自定义光标

---

## 七、配色系统

| 变量 | HEX | 用途 |
|------|-----|------|
| `--bg-base` | `#0B0B0F` | 全局基础色 |
| `--bg-card` | `#131318` | 卡片、Modal |
| `--bg-deep` | `#08080B` | 渐变底部 |
| `--text-primary` | `#F5F5F0` | 标题、导航 |
| `--text-secondary` | `#8A8A85` | 正文、辅助 |
| `--border` | `#2A2A2A` | hairline 分割线 |
| `--accent` | `#FF3B5C` | 圆点母题、CTA |
| `--ai-accent` | `#00D4FF` | AIGC 标签 |

---

## 八、开发进度

| 批次 | 内容 | 状态 |
|------|------|------|
| 第一批 | 骨架 + 五层背景 + 圆点母题 + 浮动导航 + 进度条 | ✅ |
| 第二批 | CH0 Loading + CH1 最强作品 + 章节转场 | ✅ |
| 第三批 | CH2 横向画廊 + 速度感应 + 彩蛋 + 本地编辑器 + 移动端 | ✅ |
| 第四批 | CH3 Modal + Behind The Frame 4节点时间线 | ✅ |
| 第五批 | CH4 档案 + CH5 关于我 + CH6 终章 | ⏳ 待开发 |
| 第六批 | 光标完善 + 微交互打磨 + 性能优化 | ⏳ 待开发 |

---

## 九、待决/待开发事项

### ⏳ 待开发
1. **第五批** — CH4 瀑布流档案 + CH5 关于我 + CH6 终章收尾
2. **第六批** — 自定义光标完善 + 微交互 + 性能优化
3. **真实内容填充** — `assets/` 目录替换为真实作品素材，更新 `works.json`

---

## 十、继续开发

1. 在 VS Code 中打开 `/Users/erem1ka/Desktop/bit/new/portfolio`
2. 本地预览：`python3 -m http.server 8080` → `http://localhost:8080`
3. 设计规格：`/Users/erem1ka/Desktop/bit/new/wtf.txt`
4. 推送：`git add -A && git commit -m "..." && git push`（GitHub Pages 自动发布）
