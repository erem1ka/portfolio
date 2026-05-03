/* ═══════════════════════════════════════════
   modal.js — 作品 Modal + Behind The Frame

   两层结构：
   ① 作品 Modal（点击画廊卡片触发）
      - 全屏覆盖，左侧大图/视频预览，右侧基本信息
      - 底部 "查看幕后" 按钮 → 展开 Behind The Frame

   ② Behind The Frame（作品幕后 4节点时间线）
      节点顺序：
      1. Brief     — 客户/项目简述
      2. Tools     — 工具矩阵
      3. Craft     — 截图 + 说明
      4. Learning  — 复盘总结

      时间线从左到右，节点逐一高亮，支持键盘左右切换。
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 状态 ─── */
  const state = {
    isOpen: false,
    currentWork: null,
    btfNode: 0,       // Behind The Frame 当前节点 0-3
    btfOpen: false,
  };

  const BTF_NODES = ['brief', 'tools', 'craft', 'learning'];
  const BTF_LABELS = ['项目简述', '工具矩阵', '制作细节', '复盘总结'];

  /* ═══════════════════════════════════════════
     初始化：创建 Modal DOM + 绑定全局事件
     ═══════════════════════════════════════════ */
  function init() {
    createModalDOM();
    bindGlobalEvents();
  }

  /* ═══════════════════════════════════════════
     创建 Modal DOM
     ═══════════════════════════════════════════ */
  function createModalDOM() {
    const el = document.createElement('div');
    el.id = 'work-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');

    el.innerHTML = `
      <!-- 背景遮罩 -->
      <div class="modal__backdrop"></div>

      <!-- Modal 主面板 -->
      <div class="modal__panel">

        <!-- ── 关闭按钮 ── -->
        <button class="modal__close" aria-label="关闭">
          <span class="modal__close-icon" aria-hidden="true"></span>
        </button>

        <!-- ── 左侧：媒体预览 ── -->
        <div class="modal__media-col">
          <div class="modal__media-wrap">
            <img class="modal__media-img" src="" alt="" loading="lazy">
            <div class="modal__media-overlay" aria-hidden="true"></div>
          </div>
        </div>

        <!-- ── 右侧：作品信息 + BTF 入口 ── -->
        <div class="modal__info-col">

          <!-- 作品编号 + 年份 -->
          <div class="modal__meta">
            <span class="modal__num h-micro"></span>
            <span class="modal__year h-micro"></span>
          </div>

          <!-- 标题 -->
          <h2 class="modal__title h-h2 font-cn"></h2>

          <!-- 工具标签 -->
          <div class="modal__tags"></div>

          <!-- 分割线 -->
          <div class="modal__divider" aria-hidden="true"></div>

          <!-- 简介（默认展示，BTF 展开后隐藏） -->
          <p class="modal__brief h-body font-cn"></p>

          <!-- BTF 展开按钮 -->
          <button class="modal__btf-toggle font-cn" aria-expanded="false">
            <span class="modal__btf-toggle-dot" aria-hidden="true"></span>
            查看制作幕后
          </button>

          <!-- ── Behind The Frame 区域 ── -->
          <div class="modal__btf" aria-hidden="true">

            <!-- 4 节点时间线 -->
            <nav class="btf__timeline" aria-label="Behind The Frame 导航">
              ${BTF_NODES.map((node, i) => `
                <button class="btf__node ${i === 0 ? 'btf__node--active' : ''}"
                        data-node="${i}"
                        aria-label="${BTF_LABELS[i]}">
                  <span class="btf__node-dot" aria-hidden="true"></span>
                  <span class="btf__node-label h-micro font-cn">${BTF_LABELS[i]}</span>
                </button>
              `).join('')}
              <!-- 时间线连接线（CSS 伪元素绘制） -->
            </nav>

            <!-- 节点内容区 -->
            <div class="btf__content">
              ${BTF_NODES.map((node, i) => `
                <div class="btf__panel" data-panel="${i}" ${i !== 0 ? 'hidden' : ''}>
                </div>
              `).join('')}
            </div>

            <!-- 节点切换箭头 -->
            <div class="btf__nav">
              <button class="btf__prev h-micro font-cn" aria-label="上一节点">← 上一步</button>
              <span class="btf__nav-indicator h-micro">
                <span class="btf__nav-current">1</span> / ${BTF_NODES.length}
              </span>
              <button class="btf__next h-micro font-cn" aria-label="下一节点">下一步 →</button>
            </div>

          </div>
          <!-- /BTF -->

        </div>
        <!-- /info-col -->

      </div>
      <!-- /modal__panel -->
    `;

    document.body.appendChild(el);

    /* 缓存 DOM 引用 */
    state.dom = {
      modal: el,
      backdrop: el.querySelector('.modal__backdrop'),
      panel: el.querySelector('.modal__panel'),
      close: el.querySelector('.modal__close'),
      img: el.querySelector('.modal__media-img'),
      num: el.querySelector('.modal__num'),
      year: el.querySelector('.modal__year'),
      title: el.querySelector('.modal__title'),
      tags: el.querySelector('.modal__tags'),
      brief: el.querySelector('.modal__brief'),
      btfToggle: el.querySelector('.modal__btf-toggle'),
      btf: el.querySelector('.modal__btf'),
      btfNodes: el.querySelectorAll('.btf__node'),
      btfPanels: el.querySelectorAll('.btf__panel'),
      btfPrev: el.querySelector('.btf__prev'),
      btfNext: el.querySelector('.btf__next'),
      btfNavCurrent: el.querySelector('.btf__nav-current'),
    };
  }

  /* ═══════════════════════════════════════════
     打开 Modal
     ═══════════════════════════════════════════ */
  function open(work, index) {
    if (state.isOpen) return;
    state.isOpen = true;
    state.currentWork = work;
    state.btfNode = 0;
    state.btfOpen = false;

    const d = state.dom;

    /* 填充基础信息 */
    const num = String(index + 1).padStart(2, '0');
    d.num.textContent = '● ' + num;
    d.year.textContent = work.year || '';
    d.title.textContent = work.titleCN || work.title || '';
    d.img.src = work.thumbnail || `https://picsum.photos/seed/work-${num}/900/1200`;
    d.img.alt = work.titleCN || work.title || '';

    /* 工具标签 */
    d.tags.innerHTML = (work.tools || [])
      .map(t => `<span class="modal__tag">${t}</span>`)
      .join('');

    /* 简介 */
    const btf = work.behindTheFrame || {};
    d.brief.textContent = btf.brief || '暂无简介。';

    /* BTF — 重置 */
    resetBTF(work);

    /* 激活 */
    d.modal.setAttribute('aria-hidden', 'false');
    d.modal.classList.add('modal--active');
    document.body.classList.add('modal-open');

    /* 绑定事件 */
    bindModalEvents();

    /* 光标 */
    if (window.__motif) window.__motif.leaveWork();

    /* 焦点管理 */
    d.close.focus();
  }

  /* ═══════════════════════════════════════════
     关闭 Modal
     ═══════════════════════════════════════════ */
  function close() {
    if (!state.isOpen) return;
    state.isOpen = false;

    const d = state.dom;
    d.modal.classList.remove('modal--active');
    d.modal.classList.add('modal--closing');

    setTimeout(() => {
      d.modal.classList.remove('modal--closing');
      d.modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      unbindModalEvents();
      // 清空媒体 src，释放内存
      d.img.src = '';
    }, 500);
  }

  /* ═══════════════════════════════════════════
     BTF — 初始化各面板内容
     ═══════════════════════════════════════════ */
  function resetBTF(work) {
    const btf = work.behindTheFrame || {};
    const d = state.dom;

    /* Panel 0: Brief */
    d.btfPanels[0].innerHTML = `
      <div class="btf-brief">
        <div class="btf-brief__label h-micro">项目背景</div>
        <p class="btf-brief__text font-cn h-body">${btf.brief || '暂无简述。'}</p>
      </div>
    `;

    /* Panel 1: Tools */
    const tools = btf.tools || [];
    d.btfPanels[1].innerHTML = `
      <div class="btf-tools">
        ${tools.length ? tools.map(t => `
          <div class="btf-tool">
            <div class="btf-tool__name h-micro">${t.name || ''}</div>
            <div class="btf-tool__role font-cn h-caption">${t.role || ''}</div>
          </div>
        `).join('') : '<p class="h-caption font-cn" style="color:var(--text-muted)">暂无工具信息。</p>'}
      </div>
    `;

    /* Panel 2: Craft */
    const crafts = btf.craft || [];
    d.btfPanels[2].innerHTML = `
      <div class="btf-craft">
        ${crafts.length ? crafts.map(c => `
          <div class="btf-craft__item">
            <img class="btf-craft__img" src="${c.screenshot || ''}" alt="${c.caption || ''}" loading="lazy">
            <p class="btf-craft__caption h-caption font-cn">${c.caption || ''}</p>
          </div>
        `).join('') : '<p class="h-caption font-cn" style="color:var(--text-muted)">暂无截图。</p>'}
      </div>
    `;

    /* Panel 3: Learning */
    d.btfPanels[3].innerHTML = `
      <div class="btf-learning">
        <div class="btf-learning__label h-micro">复盘</div>
        <p class="btf-learning__text font-cn h-body">${btf.learning || '暂无复盘。'}</p>
      </div>
    `;

    /* 重置到第 0 节点 */
    goToNode(0);

    /* BTF 面板初始隐藏 */
    d.btf.setAttribute('aria-hidden', 'true');
    d.btf.classList.remove('btf--active');
    d.btfToggle.setAttribute('aria-expanded', 'false');
    d.btfToggle.classList.remove('modal__btf-toggle--active');
    d.brief.style.display = '';
  }

  /* ═══════════════════════════════════════════
     BTF — 切换到指定节点
     ═══════════════════════════════════════════ */
  function goToNode(index) {
    const d = state.dom;
    state.btfNode = index;

    /* 更新节点高亮 */
    d.btfNodes.forEach((btn, i) => {
      btn.classList.toggle('btf__node--active', i === index);
      btn.classList.toggle('btf__node--done', i < index);
    });

    /* 切换面板（淡入淡出） */
    d.btfPanels.forEach((panel, i) => {
      if (i === index) {
        panel.removeAttribute('hidden');
        panel.classList.add('btf__panel--active');
      } else {
        panel.setAttribute('hidden', '');
        panel.classList.remove('btf__panel--active');
      }
    });

    /* 更新导航 */
    if (d.btfNavCurrent) d.btfNavCurrent.textContent = index + 1;
    if (d.btfPrev) d.btfPrev.disabled = index === 0;
    if (d.btfNext) d.btfNext.disabled = index === BTF_NODES.length - 1;
  }

  /* ═══════════════════════════════════════════
     BTF — 展开/收起
     ═══════════════════════════════════════════ */
  function toggleBTF() {
    state.btfOpen = !state.btfOpen;
    const d = state.dom;

    if (state.btfOpen) {
      d.btf.setAttribute('aria-hidden', 'false');
      d.btf.classList.add('btf--active');
      d.btfToggle.setAttribute('aria-expanded', 'true');
      d.btfToggle.classList.add('modal__btf-toggle--active');
      d.brief.style.display = 'none';
    } else {
      d.btf.setAttribute('aria-hidden', 'true');
      d.btf.classList.remove('btf--active');
      d.btfToggle.setAttribute('aria-expanded', 'false');
      d.btfToggle.classList.remove('modal__btf-toggle--active');
      d.brief.style.display = '';
    }
  }

  /* ═══════════════════════════════════════════
     事件绑定
     ═══════════════════════════════════════════ */
  let _keyHandler = null;

  function bindModalEvents() {
    const d = state.dom;

    /* 关闭 */
    d.close.addEventListener('click', close);
    d.backdrop.addEventListener('click', close);

    /* BTF 展开 */
    d.btfToggle.addEventListener('click', toggleBTF);

    /* BTF 节点切换（时间线点击） */
    d.btfNodes.forEach((btn, i) => {
      btn.addEventListener('click', () => goToNode(i));
    });

    /* BTF 上下翻 */
    d.btfPrev.addEventListener('click', () => {
      if (state.btfNode > 0) goToNode(state.btfNode - 1);
    });
    d.btfNext.addEventListener('click', () => {
      if (state.btfNode < BTF_NODES.length - 1) goToNode(state.btfNode + 1);
    });

    /* 键盘 */
    _keyHandler = (e) => {
      if (e.key === 'Escape') close();
      if (state.btfOpen) {
        if (e.key === 'ArrowLeft' && state.btfNode > 0) goToNode(state.btfNode - 1);
        if (e.key === 'ArrowRight' && state.btfNode < BTF_NODES.length - 1) goToNode(state.btfNode + 1);
      }
    };
    document.addEventListener('keydown', _keyHandler);
  }

  function unbindModalEvents() {
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler);
      _keyHandler = null;
    }
  }

  /* ═══════════════════════════════════════════
     全局事件：画廊卡片点击 → 打开 Modal
     gallery.js 渲染完成后，事件委托到 body
     ═══════════════════════════════════════════ */
  function bindGlobalEvents() {
    document.body.addEventListener('click', (e) => {
      const card = e.target.closest('.gallery-card');
      if (!card) return;

      const index = parseInt(card.dataset.index, 10);
      if (isNaN(index)) return;

      // 从当前渲染的数据拿 work
      fetch('data/works.json')
        .then(r => r.json())
        .then(works => {
          const work = works[index] || getFallbackWork(index);
          open(work, index);
        })
        .catch(() => {
          open(getFallbackWork(index), index);
        });
    });
  }

  function getFallbackWork(index) {
    const names = ['春节开场动效', '神经绽放', '故障脉冲', 'AIGC角色动画', '粒子爆炸特效', '水墨转场'];
    return {
      id: `work-00${index + 1}`,
      titleCN: names[index] || `作品 ${index + 1}`,
      year: 2024,
      tools: ['AE', 'AIGC', 'PS'],
      thumbnail: `https://picsum.photos/seed/work-fallback-${index + 1}/900/1200`,
      behindTheFrame: {
        brief: '这是一个实验性项目，探索 AE 与 AIGC 的协作边界。',
        tools: [
          { name: 'After Effects', role: '动态合成与关键帧动画' },
          { name: 'AIGC', role: '素材生成与概念探索' },
          { name: 'Photoshop', role: '帧级细节手工调整' },
        ],
        craft: [
          { screenshot: `https://picsum.photos/seed/craft-${index + 1}/800/450`, caption: 'AE 时间线结构与缓动曲线调整' },
        ],
        learning: '最难的不是技术，而是节奏的把控。下次会更早确认动效风格方向，减少后期返工。',
      },
    };
  }

  /* ─── init ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__modal = { open, close };
})();
