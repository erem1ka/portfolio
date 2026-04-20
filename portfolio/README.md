# 作品集网站 — 使用说明

## 文件结构

```
portfolio/
├── index.html       # 主页面（单文件即可运行）
├── assets/
│   └── resume.pdf   # 把你的简历 PDF 放在这里
└── README.md
```

---

## 核心机制：GitHub 云端存储

上传的媒体文件会自动推到你的 GitHub 仓库，生成 **永久公开链接**：

```
https://raw.githubusercontent.com/你的用户名/portfolio/main/media/xxx.mp4
```

- 本地文件删了，作品依然在线 ✓
- 任何人用链接都能访问 ✓
- 网站部署到 GitHub Pages 后外部完全可访问 ✓

---

## 第一步：准备 GitHub 仓库

1. 注册 / 登录 [github.com](https://github.com)
2. 新建一个 **Public** 仓库，命名为 `portfolio`
3. 进入 **Settings → Developer settings → Personal access tokens → Tokens (classic)**
4. 点击 **Generate new token (classic)**，勾选 `repo` 权限，生成后复制

---

## 第二步：配置网站

1. 打开 `index.html`（双击用浏览器打开）
2. 点击导航栏左上角的 **GitHub 图标**（或直接找配置按钮）
3. 填入：GitHub 用户名、仓库名（`portfolio`）、Access Token
4. 点击「测试连接」确认成功，再点「保存配置」

> Token 只保存在你自己浏览器的 localStorage，不会上传给任何人。

---

## 第三步：上传作品（直接在页面操作）

1. 鼠标悬停到任意**「待上传」**卡片
2. 出现上传区域，点击 → 选择文件
3. 文件会**先在本地预览**，同时自动上传到 GitHub
4. 上传完成后自动切换为永久链接 ✓

支持格式：`.mp4` `.webm` `.gif` `.webp` `.jpg` `.png`

---

## 第四步：修改个人信息

打开 `index.html`，搜索以下占位符替换：

| 占位符 | 替换为 |
|---|---|
| `{{EMAIL}}` | 你的邮箱 |
| `{{BILIBILI_UID}}` | B 站 UID |
| `{{DOUYIN_ID}}` | 抖音主页 ID |
| `{{XIAOHONGSHU_ID}}` | 小红书主页 ID |
| `{{MAJOR}}` | 你的专业 |
| `{{INTERNSHIP_COMPANY}}` | 实习公司（如 `快手`）|

---

## 部署到 GitHub Pages（让外部访客能看到）

1. 把 `index.html` 和 `assets/` 上传到同一个 `portfolio` 仓库的根目录
2. 仓库 Settings → Pages → Source: `main` 分支 → Save
3. 等待 2 分钟，访问 `https://你的用户名.github.io/portfolio/`
4. 把这个链接填入简历和求职邮件

---

## 注意事项

- **GitHub 单文件大小限制：100MB**，如果视频超出，建议用 Handbrake 压缩到 50MB 以内
- 上传的文件存放在仓库的 `media/` 目录，格式为 `时间戳_原文件名`
- GitHub 免费账号仓库总容量 1GB，作品集视频完全够用
