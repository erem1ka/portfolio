/* ═══════════════════════════════════════════
   editor.js — 本地编辑模式
   
   快捷键：连按两次 E（500ms 内）唤出编辑面板
   或：Shift+Alt+E
   
   功能：
   - 浏览/新增/编辑/删除作品卡片
   - 拖拽上传封面图（base64 存 localStorage）
   - 填写作品信息（titleCN / year / tools / BTF）
   - 保存后实时刷新画廊
   - 一键导出 works.json（下载到本地后替换文件）
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  const STORAGE_KEY = 'portfolio_works';
  let works = [];
  let editingIndex = -1;   // -1 = 新增，>=0 = 编辑
  let isOpen = false;

  /* ═══════════════════════════════════════════
     快捷键监听
     连按 E 两次（500ms 内）唤出
     或 Shift+Alt+E
     ═══════════════════════════════════════════ */
  let eKeyCount = 0;
  let eKeyTimer = null;

  document.addEventListener('keydown', (ev) => {
    // Shift+Alt+E
    if (ev.shiftKey && ev.altKey && ev.key === 'E') {
      toggleEditor();
      return;
    }
    // 连按两次 E（无修饰键，焦点不在输入框）
    if (ev.key === 'e' && !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      const tag = document.activeElement.tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      eKeyCount++;
      clearTimeout(eKeyTimer);
      if (eKeyCount >= 2) {
        eKeyCount = 0;
        toggleEditor();
      } else {
        eKeyTimer = setTimeout(() => { eKeyCount = 0; }, 500);
      }
    }
  });

  /* ═══════════════════════════════════════════
     初始化
     ═══════════════════════════════════════════ */
  function init() {
    loadWorks();
    buildEditorDOM();
  }

  /* ─── 读取数据：localStorage → fetch fallback ─── */
  function loadWorks() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { works = JSON.parse(saved); return; } catch (e) {}
    }
    // 无本地数据，从 works.json 读取
    fetch('data/works.json')
      .then(r => r.json())
      .then(data => {
        works = data;
        saveWorks();
      })
      .catch(() => { works = []; });
  }

  /* ─── 持久化到 localStorage ─── */
  function saveWorks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
  }

  /* ─── 将变更应用到画廊 ─── */
  function applyToGallery() {
    // 重写 works.json fetch 缓存（通过覆盖全局 fetch 暂存数据供 gallery.js 调用）
    window.__editorWorks = works;
    // 通知 gallery.js 重新渲染（如已初始化则重渲染）
    if (typeof window.__galleryInit === 'function') {
      window.__galleryInit();
    } else {
      location.reload();
    }
  }

  /* ═══════════════════════════════════════════
     构建编辑器 DOM
     ═══════════════════════════════════════════ */
  function buildEditorDOM() {
    const el = document.createElement('div');
    el.id = 'portfolio-editor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="ed__backdrop"></div>
      <div class="ed__panel">
        <!-- 顶部栏 -->
        <header class="ed__header">
          <div class="ed__header-left">
            <span class="ed__dot" aria-hidden="true"></span>
            <span class="ed__title">编辑模式</span>
            <span class="ed__hint">连按 E 退出</span>
          </div>
          <div class="ed__header-right">
            <button class="ed__btn ed__btn--export" id="ed-export-btn">导出 works.json</button>
            <button class="ed__btn ed__btn--add" id="ed-add-btn">+ 新增作品</button>
            <button class="ed__btn ed__btn--close" id="ed-close-btn" aria-label="关闭编辑器">✕</button>
          </div>
        </header>

        <!-- 主体：左侧列表 + 右侧表单 -->
        <div class="ed__body">

          <!-- 作品列表 -->
          <aside class="ed__list-col">
            <div class="ed__list" id="ed-work-list"></div>
          </aside>

          <!-- 编辑表单 -->
          <main class="ed__form-col" id="ed-form-col">
            <div class="ed__empty-state">
              <span class="ed__empty-dot" aria-hidden="true"></span>
              <p>选择左侧作品编辑，或点击「+ 新增作品」</p>
            </div>
          </main>

        </div>
      </div>
    `;
    document.body.appendChild(el);

    // 绑定静态按钮
    el.querySelector('#ed-close-btn').addEventListener('click', closeEditor);
    el.querySelector('#ed-backdrop, .ed__backdrop').addEventListener('click', closeEditor);
    el.querySelector('#ed-add-btn').addEventListener('click', () => openForm(-1));
    el.querySelector('#ed-export-btn').addEventListener('click', exportJSON);
  }

  /* ═══════════════════════════════════════════
     打开/关闭编辑器
     ═══════════════════════════════════════════ */
  function toggleEditor() {
    isOpen ? closeEditor() : openEditor();
  }

  function openEditor() {
    isOpen = true;
    const el = document.getElementById('portfolio-editor');
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('ed--active');
    renderWorkList();
    document.body.style.overflow = 'hidden';
    // 编辑模式下恢复原生光标
    document.body.classList.add('ed-cursor-restore');
  }

  function closeEditor() {
    isOpen = false;
    const el = document.getElementById('portfolio-editor');
    el.classList.remove('ed--active');
    el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('ed-cursor-restore');
  }

  /* ═══════════════════════════════════════════
     渲染作品列表（左侧边栏）
     ═══════════════════════════════════════════ */
  function renderWorkList() {
    const list = document.getElementById('ed-work-list');
    if (!list) return;

    list.innerHTML = works.length ? works.map((w, i) => `
      <div class="ed__work-item ${editingIndex === i ? 'ed__work-item--active' : ''}"
           data-index="${i}">
        <div class="ed__work-thumb"
             style="background-image:url('${w.thumbnail || ''}')">
          ${!w.thumbnail ? '<span>无图</span>' : ''}
        </div>
        <div class="ed__work-meta">
          <div class="ed__work-name">${w.titleCN || w.title || '未命名'}</div>
          <div class="ed__work-year">${w.year || ''} · ${(w.tools || []).join(' / ')}</div>
        </div>
        <button class="ed__work-delete" data-del="${i}" aria-label="删除">✕</button>
      </div>
    `).join('') : '<div class="ed__list-empty">还没有作品，点击「+ 新增」开始</div>';

    // 点击条目
    list.querySelectorAll('.ed__work-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-del]')) return;
        openForm(parseInt(item.dataset.index, 10));
      });
    });

    // 删除按钮
    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.del, 10);
        if (confirm(`确定删除「${works[i]?.titleCN || '该作品'}」？`)) {
          works.splice(i, 1);
          saveWorks();
          editingIndex = -1;
          renderWorkList();
          document.getElementById('ed-form-col').innerHTML = `
            <div class="ed__empty-state">
              <span class="ed__empty-dot"></span>
              <p>选择左侧作品编辑，或点击「+ 新增作品」</p>
            </div>`;
        }
      });
    });
  }

  /* ═══════════════════════════════════════════
     打开编辑表单
     index === -1 → 新增
     index >= 0   → 编辑已有
     ═══════════════════════════════════════════ */
  function openForm(index) {
    editingIndex = index;
    const isNew = index === -1;
    const w = isNew ? {} : (works[index] || {});
    const btf = w.behindTheFrame || {};
    const tools = Array.isArray(w.tools) ? w.tools.join(', ') : '';
    const btfTools = Array.isArray(btf.tools)
      ? btf.tools.map(t => `${t.name}|${t.role}`).join('\n')
      : '';
    const crafts = Array.isArray(btf.craft)
      ? btf.craft.map(c => c.caption || '').join('\n')
      : '';

    renderWorkList();

    const formCol = document.getElementById('ed-form-col');
    formCol.innerHTML = `
      <form class="ed__form" id="ed-work-form" novalidate>
        <div class="ed__form-section">
          <h3 class="ed__section-title">封面图</h3>
          <!-- 拖拽/点击上传 -->
          <div class="ed__upload-zone ${w.thumbnail ? 'ed__upload-zone--has-img' : ''}"
               id="ed-upload-zone"
               tabindex="0"
               role="button"
               aria-label="上传封面图">
            ${w.thumbnail
              ? `<img src="${w.thumbnail}" class="ed__upload-preview" id="ed-thumb-preview" alt="">`
              : `<div class="ed__upload-placeholder">
                   <span class="ed__upload-icon">↑</span>
                   <span>拖拽图片到此处，或点击选择</span>
                   <span class="ed__upload-hint">建议 420×560px，支持 jpg/webp/png</span>
                 </div>`}
            <input type="file" id="ed-file-input" accept="image/*" style="display:none">
          </div>
        </div>

        <div class="ed__form-section">
          <h3 class="ed__section-title">基本信息</h3>
          <div class="ed__field">
            <label class="ed__label" for="ed-title">作品名称 *</label>
            <input class="ed__input" id="ed-title" type="text"
                   placeholder="春节开场动效" value="${w.titleCN || ''}" required>
          </div>
          <div class="ed__field-row">
            <div class="ed__field">
              <label class="ed__label" for="ed-year">年份</label>
              <input class="ed__input" id="ed-year" type="number"
                     placeholder="2024" value="${w.year || new Date().getFullYear()}" min="2000" max="2099">
            </div>
            <div class="ed__field">
              <label class="ed__label" for="ed-tools">工具标签</label>
              <input class="ed__input" id="ed-tools" type="text"
                     placeholder="AE, AIGC, PS" value="${tools}">
              <span class="ed__field-hint">用逗号分隔</span>
            </div>
          </div>
        </div>

        <div class="ed__form-section">
          <h3 class="ed__section-title">制作幕后（Behind The Frame）</h3>
          <div class="ed__field">
            <label class="ed__label" for="ed-brief">项目简述</label>
            <textarea class="ed__input ed__textarea" id="ed-brief"
                      placeholder="这个项目是为了…需要在30秒内传达…"
                      rows="3">${btf.brief || ''}</textarea>
          </div>
          <div class="ed__field">
            <label class="ed__label" for="ed-btf-tools">工具矩阵</label>
            <textarea class="ed__input ed__textarea" id="ed-btf-tools"
                      placeholder="After Effects|主合成与关键帧&#10;AIGC|素材生成"
                      rows="4">${btfTools}</textarea>
            <span class="ed__field-hint">每行一个，格式：工具名|用途说明</span>
          </div>
          <div class="ed__field">
            <label class="ed__label" for="ed-craft">截图说明</label>
            <textarea class="ed__input ed__textarea" id="ed-craft"
                      placeholder="AE 时间线结构&#10;缓动曲线调整截图"
                      rows="3">${crafts}</textarea>
            <span class="ed__field-hint">每行一条说明（截图路径请手动放入 assets/images/）</span>
          </div>
          <div class="ed__field">
            <label class="ed__label" for="ed-learning">复盘总结</label>
            <textarea class="ed__input ed__textarea" id="ed-learning"
                      placeholder="如果重来，会更早确认动效风格方向…"
                      rows="3">${btf.learning || ''}</textarea>
          </div>
        </div>

        <div class="ed__form-actions">
          <button type="button" class="ed__btn ed__btn--cancel" id="ed-cancel-btn">取消</button>
          <button type="submit" class="ed__btn ed__btn--save">${isNew ? '✓ 添加作品' : '✓ 保存修改'}</button>
        </div>
      </form>
    `;

    /* 上传区交互 */
    const zone = document.getElementById('ed-upload-zone');
    const fileInput = document.getElementById('ed-file-input');

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('keydown', e => { if (e.key === 'Enter') fileInput.click(); });

    // 拖拽
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('ed__upload-zone--drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('ed__upload-zone--drag'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('ed__upload-zone--drag');
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) handleImageFile(file);
    });

    /* 取消 */
    document.getElementById('ed-cancel-btn').addEventListener('click', () => {
      editingIndex = -1;
      renderWorkList();
      formCol.innerHTML = `<div class="ed__empty-state">
        <span class="ed__empty-dot"></span>
        <p>选择左侧作品编辑，或点击「+ 新增作品」</p>
      </div>`;
    });

    /* 提交 */
    document.getElementById('ed-work-form').addEventListener('submit', (e) => {
      e.preventDefault();
      saveForm();
    });
  }

  /* ─── 处理上传图片 → base64 ─── */
  function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const zone = document.getElementById('ed-upload-zone');
      if (!zone) return;

      zone.classList.add('ed__upload-zone--has-img');
      // 替换占位为预览
      zone.innerHTML = `
        <img src="${src}" class="ed__upload-preview" id="ed-thumb-preview" alt="">
        <input type="file" id="ed-file-input" accept="image/*" style="display:none">
        <button type="button" class="ed__upload-change">更换图片</button>
      `;
      // 重新绑定
      const newInput = zone.querySelector('#ed-file-input');
      zone.querySelector('.ed__upload-change').addEventListener('click', e => {
        e.stopPropagation();
        newInput.click();
      });
      newInput.addEventListener('change', () => {
        const f = newInput.files[0];
        if (f) handleImageFile(f);
      });

      // 临时记录 base64
      zone.dataset.src = src;
    };
    reader.readAsDataURL(file);
  }

  /* ─── 读取表单并保存 ─── */
  function saveForm() {
    const title = document.getElementById('ed-title')?.value.trim();
    if (!title) {
      alert('作品名称不能为空');
      return;
    }

    const year = parseInt(document.getElementById('ed-year')?.value, 10) || new Date().getFullYear();
    const toolsRaw = document.getElementById('ed-tools')?.value || '';
    const toolsList = toolsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean);

    // 封面图：zone 上的 dataset.src 或已有 thumbnail
    const zone = document.getElementById('ed-upload-zone');
    let thumb = zone?.dataset.src || '';
    if (!thumb && editingIndex >= 0) {
      thumb = works[editingIndex]?.thumbnail || '';
    }
    if (!thumb) {
      thumb = `https://picsum.photos/seed/work-${Date.now()}/420/560`;
    }

    // BTF
    const brief = document.getElementById('ed-brief')?.value.trim() || '';
    const btfToolsRaw = document.getElementById('ed-btf-tools')?.value || '';
    const btfTools = btfToolsRaw.split('\n').filter(Boolean).map(line => {
      const [name, ...roleParts] = line.split('|');
      return { name: name.trim(), role: roleParts.join('|').trim() };
    });
    const craftsRaw = document.getElementById('ed-craft')?.value || '';
    const craft = craftsRaw.split('\n').filter(Boolean).map((caption, i) => ({
      screenshot: `assets/images/work-craft-${i + 1}.jpg`,
      caption: caption.trim(),
    }));
    const learning = document.getElementById('ed-learning')?.value.trim() || '';

    const workData = {
      id: editingIndex >= 0 ? (works[editingIndex].id || `work-${Date.now()}`) : `work-${Date.now()}`,
      titleCN: title,
      year,
      tools: toolsList,
      thumbnail: thumb,
      behindTheFrame: { brief, tools: btfTools, craft, learning },
    };

    if (editingIndex >= 0) {
      works[editingIndex] = workData;
    } else {
      works.push(workData);
      editingIndex = works.length - 1;
    }

    saveWorks();
    renderWorkList();

    // 同步给画廊并立即重渲染（无需刷页面）
    window.__editorWorks = works;
    const section = document.getElementById('ch-2');
    if (section && typeof window.__galleryRebuild === 'function') {
      window.__galleryRebuild(section, works);
    }

    showToast('已保存，画廊已更新');
  }

  /* ═══════════════════════════════════════════
     导出 works.json
     ═══════════════════════════════════════════ */
  function exportJSON() {
    // base64 图片太大，导出时替换为占位路径提示
    const exportData = works.map((w, i) => {
      const cleaned = { ...w };
      if (cleaned.thumbnail && cleaned.thumbnail.startsWith('data:')) {
        cleaned.thumbnail = `assets/images/work-${String(i + 1).padStart(3, '0')}.jpg`;
        cleaned.__note = '请将对应图片放到 assets/images/ 目录';
      }
      return cleaned;
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'works.json';
    a.click();
    URL.revokeObjectURL(url);

    showToast('works.json 已下载，请替换 data/works.json');
  }

  /* ─── 简易 Toast ─── */
  function showToast(msg) {
    let toast = document.getElementById('ed-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ed-toast';
      toast.className = 'ed__toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('ed__toast--show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('ed__toast--show'), 2800);
  }

  /* ─── gallery.js fetch 拦截（让画廊读 localStorage 数据）─── */
  (function patchFetch() {
    const _fetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      if (typeof input === 'string' && input.includes('works.json') && window.__editorWorks) {
        return Promise.resolve(new Response(JSON.stringify(window.__editorWorks), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return _fetch(input, init);
    };
  })();

  /* ─── init ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__editor = { open: openEditor, close: closeEditor, toggle: toggleEditor };
})();
