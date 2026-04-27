/* ================================================================
   app.js — 张峻烨作品集 v2
   Modules: Data · CloudBase · Cursor · Scroll · Hero · Works · Modal · Edit
   ================================================================ */

'use strict';

/* ────────────────────────────────────────────────
   1. WORKS DATA  (JSON-driven, template placeholders)
──────────────────────────────────────────────── */
const APP_KEY_V2 = 'portfolio_v2_data';
const CLOUD_ENV_ID = 'my-web-d5gsldm9ha36297d1';
const CLOUD_CDN = 'https://6d79-my-web-d5gsldm9ha36297d1-1424382234.tcb.qcloud.la';

// Category keys → display labels & badge class
const CATEGORIES = {
  all:    { label: '全部',        cls: '' },
  motion: { label: '动态特效',    cls: 'motion' },
  video:  { label: '视频模板',    cls: 'video' },
  aigc:   { label: 'AIGC 创意',   cls: 'aigc' },
  mg:     { label: 'MG 动画',     cls: 'mg' },
  agent:  { label: '工具开发',    cls: 'agent' },
};

// Default DATA structure — works loaded from cloud / localStorage
let DATA = {
  works: [
    /* Placeholder examples – will be replaced by uploaded works */
    {
      id: 'placeholder-1',
      title: '短视频平台特效素材',
      category: 'motion',
      tools: ['AE', '剪映'],
      desc: '参与短视频平台全链路特效素材设计，独立完成动态特效、画面转场、轻量化动画素材的 AE 全流程制作与方案输出。',
      media: '',   // CDN URL
      cover: '',   // poster frame
      mediaType: 'webp', // 'mp4' | 'webp' | 'gif' | 'img'
      ar: 0.75,
    },
    {
      id: 'placeholder-2',
      title: 'Seedream 生图 × AE 木偶骨骼动效',
      category: 'aigc',
      tools: ['AE', 'Seedream', 'AIGC'],
      desc: 'AI 生成原画素材 → 透明抠图 → AE 骨骼点位绑定 → 循环动态打磨 → 抖音特效模板适配，完整「AI 素材生成→后期动态设计」全链路工作流。',
      media: '',
      cover: '',
      mediaType: 'mp4',
      ar: 0.75,
    },
    {
      id: 'placeholder-3',
      title: '无畏契约 LOGO · 原创 MG 动画',
      category: 'mg',
      tools: ['AE', 'PS'],
      desc: '基于 IP 原生视觉体系，全程 AE 矢量形状图层原创手搓制作，独立完成 LOGO 图形拆解、形变动画、版式动态延展。',
      media: '',
      cover: '',
      mediaType: 'mp4',
      ar: 1.78,
    },
  ],
  contact: {
    email: '',
    phone: '',
    douyin: '',
    bilibili: '',
    wechatQr: '',
    resumeUrl: '',
    resumeName: '',
  },
  hero: [
    /* Each hero slide maps to a work ID or standalone entry */
    { title: '动态特效 × 创意设计', desc: '参与短视频平台全链路特效素材设计', media: '', cover: '', mediaType: 'mp4', tag: '业务作品' },
    { title: 'AI 全链路创作工作流', desc: 'Seedream 生图 → AE 骨骼动画 → 抖音特效模板', media: '', cover: '', mediaType: 'mp4', tag: 'AIGC' },
    { title: 'MG 动画 × 运动设计', desc: '矢量形状图层原创手搓制作', media: '', cover: '', mediaType: 'mp4', tag: 'Motion' },
  ],
  _version: 0,
};

/* ────────────────────────────────────────────────
   2. CLOUDBASE
──────────────────────────────────────────────── */
let tcbApp = null;
let db = null;

async function initCloud() {
  try {
    const sdk = window.cloudbaseSDK;
    if (!sdk || !sdk.default) return false;
    tcbApp = sdk.default.init({ env: CLOUD_ENV_ID });
    const auth = tcbApp.auth();
    if (auth.signInAnonymously) await auth.signInAnonymously();
    else await auth.anonymousAuthProvider().signIn();
    db = tcbApp.database();
    return true;
  } catch (e) {
    console.warn('CloudBase init failed:', e);
    return false;
  }
}

function loadLocalData() {
  try {
    const s = localStorage.getItem(APP_KEY_V2);
    if (!s) return;
    const d = JSON.parse(s);
    if (d.works)   DATA.works   = d.works;
    if (d.contact) DATA.contact = Object.assign(DATA.contact, d.contact);
    if (d.hero)    DATA.hero    = d.hero;
    if (d._version) DATA._version = d._version;
    // Fix cloud URLs
    DATA.works.forEach(w => {
      w.media = fixUrl(w.media);
      w.cover = fixUrl(w.cover);
    });
    DATA.hero.forEach(h => {
      h.media = fixUrl(h.media);
      h.cover = fixUrl(h.cover);
    });
    DATA.contact.wechatQr  = fixUrl(DATA.contact.wechatQr);
    DATA.contact.resumeUrl = fixUrl(DATA.contact.resumeUrl);
  } catch(e) {}
}

function saveLocal() {
  DATA._version = Date.now();
  try { localStorage.setItem(APP_KEY_V2, JSON.stringify(DATA)); } catch(e) {}
  clearTimeout(_pubTimer);
  _pubTimer = setTimeout(() => { if(db) publishCloud(); }, 3000);
}

let _pubTimer = null;
async function publishCloud() {
  if (!db) return;
  try {
    const col = db.collection('portfolio_v2');
    const clean = JSON.parse(JSON.stringify(DATA));
    // Strip blob URLs
    clean.works.forEach(w => {
      if(w.media && w.media.startsWith('blob:')) w.media = '';
      if(w.cover && w.cover.startsWith('blob:')) w.cover = '';
    });
    clean.hero.forEach(h => {
      if(h.media && h.media.startsWith('blob:')) h.media = '';
      if(h.cover && h.cover.startsWith('blob:')) h.cover = '';
    });
    let exists = false;
    try { const r = await col.doc('main').get(); exists = r.data && r.data.length > 0; } catch(e){}
    if (exists) {
      try { await col.doc('main').remove(); } catch(e){}
    }
    await col.add({ _id: 'main', data: clean, updatedAt: new Date() });
    console.log('✓ v2 data synced to cloud');
  } catch(e) { console.error('v2 cloud sync failed:', e); }
}

async function loadCloud() {
  if (!db) return;
  try {
    const r = await db.collection('portfolio_v2').doc('main').get();
    if (r.data && r.data.length > 0) {
      const d = r.data[0].data;
      if (!d) return;
      const cloudVer = d._version || 0;
      if (cloudVer <= (DATA._version || 0)) return; // local is newer
      if (d.works)   DATA.works   = d.works;
      if (d.contact) DATA.contact = Object.assign(DATA.contact, d.contact);
      if (d.hero)    DATA.hero    = d.hero;
      DATA._version = cloudVer;
      // Fix URLs
      DATA.works.forEach(w => { w.media = fixUrl(w.media); w.cover = fixUrl(w.cover); });
      DATA.hero.forEach(h => { h.media = fixUrl(h.media); h.cover = fixUrl(h.cover); });
      DATA.contact.wechatQr  = fixUrl(DATA.contact.wechatQr);
      DATA.contact.resumeUrl = fixUrl(DATA.contact.resumeUrl);
      saveLocal();
      renderAll();
    }
  } catch(e) { console.warn('v2 cloud load failed:', e); }
}

function fixUrl(url) {
  if (!url) return url || '';
  if (url.includes('tcb.qcloud.la') && !url.includes('6d79-'))
    return url.replace('https://', 'https://6d79-');
  if (url.includes('6d79-my-web-d5gsldm9ha36297d1.tcb.qcloud.la') && !url.includes('-1424382234')) {
    const p = url.split('/portfolio/').pop();
    if (p) return `${CLOUD_CDN}/portfolio/${p}`;
  }
  if (url.includes('cos-website') || url.includes('myqcloud.com')) {
    const p = url.split('/portfolio/').pop();
    if (p) return `${CLOUD_CDN}/portfolio/${p}`;
  }
  return url;
}

async function uploadFile(file) {
  if (!tcbApp) return null;
  try {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const cloudPath = `portfolio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const result = await tcbApp.uploadFile({ cloudPath, filePath: file });
    if (result.fileID) {
      return { url: `${CLOUD_CDN}/${cloudPath}`, fileID: result.fileID };
    }
    return null;
  } catch(e) { console.error('Upload failed:', e); return null; }
}

/* ────────────────────────────────────────────────
   3. CUSTOM CURSOR
──────────────────────────────────────────────── */
const cursor = document.getElementById('cursor');
const cursorLabel = document.getElementById('cursor-label');
let mx = 0, my = 0, cx = 0, cy = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
});

function animCursor() {
  cx += (mx - cx) * 0.18;
  cy += (my - cy) * 0.18;
  if (cursor) {
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
  }
  if (cursorLabel) {
    cursorLabel.style.left = mx + 'px';
    cursorLabel.style.top  = (my + 28) + 'px';
  }
  requestAnimationFrame(animCursor);
}
animCursor();

function setCursorPlay(on, label = 'PLAY') {
  if (!cursor) return;
  cursor.classList.toggle('is-play', on);
  if (cursorLabel) {
    cursorLabel.textContent = label;
    cursorLabel.classList.toggle('visible', on);
  }
}
function setCursorHover(on) {
  if (!cursor) return;
  cursor.classList.toggle('is-hover', on);
}

// Attach cursor events globally
document.addEventListener('mouseenter', e => {
  const t = e.target;
  if (t.closest('.work-card')) { setCursorPlay(true); return; }
  if (t.closest('a,button,.resume-btn,.filter-btn,.modal-nav-btn,.modal-close,.hero-dot')) {
    setCursorHover(true); return;
  }
}, true);
document.addEventListener('mouseleave', e => {
  const t = e.target;
  if (t.closest('.work-card')) { setCursorPlay(false); return; }
  if (t.closest('a,button,.resume-btn,.filter-btn,.modal-nav-btn,.modal-close,.hero-dot')) {
    setCursorHover(false); return;
  }
}, true);

/* ────────────────────────────────────────────────
   4. SCROLL PROGRESS + NAV ACTIVE
──────────────────────────────────────────────── */
const scrollBar = document.getElementById('scroll-progress');
const content = document.getElementById('content');

function onScroll() {
  const scrollable = content || document.documentElement;
  const scrollTop = content ? content.scrollTop : window.scrollY;
  const maxScroll = scrollable.scrollHeight - scrollable.clientHeight;
  const pct = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
  if (scrollBar) scrollBar.style.height = pct + '%';
  updateActiveNav(scrollTop);
  revealSections(scrollTop);
}

(content || window).addEventListener('scroll', onScroll, { passive: true });

function updateActiveNav(scrollTop) {
  const sections = ['hero', 'works', 'about', 'contact'];
  const offset = 120;
  let active = 'hero';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.offsetTop - offset;
    if ((content ? content.scrollTop : window.scrollY) >= top) active = id;
  });
  document.querySelectorAll('#sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === '#' + active);
  });
}

function revealSections(scrollTop) {
  const vp = (content || document.documentElement).clientHeight;
  document.querySelectorAll('.section').forEach(s => {
    const top = s.getBoundingClientRect().top;
    if (top < vp * 0.88) s.classList.add('visible');
  });
  // Stagger groups
  document.querySelectorAll('.stagger').forEach(g => {
    const top = g.getBoundingClientRect().top;
    if (top < vp * 0.88) g.classList.add('visible');
  });
}
// Initial reveal
setTimeout(revealSections, 100);

// Smooth nav scroll
document.querySelectorAll('#sidebar-nav a').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ────────────────────────────────────────────────
   5. HERO CAROUSEL
──────────────────────────────────────────────── */
let heroIdx = 0;
let heroTimer = null;

function renderHero() {
  const wrap = document.getElementById('hero-slides');
  const dotsWrap = document.getElementById('hero-dots');
  if (!wrap) return;

  wrap.innerHTML = '';
  if (dotsWrap) dotsWrap.innerHTML = '';

  const slides = DATA.hero.filter(h => h.media || h.cover);
  const total = slides.length || DATA.hero.length;

  DATA.hero.forEach((h, i) => {
    const slide = document.createElement('div');
    slide.className = 'hero-slide' + (i === heroIdx ? ' active' : '');

    let mediaEl = '';
    if (h.media && h.mediaType === 'mp4') {
      mediaEl = `<video src="${h.media}" poster="${h.cover||''}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"></video>`;
    } else if (h.media || h.cover) {
      const src = h.media || h.cover;
      mediaEl = `<img src="${src}" alt="${h.title||''}" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      mediaEl = `<div style="width:100%;height:100%;background:#141414;display:flex;align-items:center;justify-content:center">
        <span style="font-family:monospace;font-size:12px;color:#555;letter-spacing:0.1em">待上传</span>
      </div>`;
    }

    slide.innerHTML = mediaEl + `
      <div class="hero-overlay" style="z-index:2">
        <div class="hero-tag">${h.tag || 'Motion Design'}</div>
        <div class="hero-title">${h.title || ''}</div>
        <div class="hero-desc">${h.desc || ''}</div>
      </div>`;

    wrap.appendChild(slide);

    // Dot
    if (dotsWrap) {
      const dot = document.createElement('button');
      dot.className = 'hero-dot' + (i === heroIdx ? ' active' : '');
      dot.addEventListener('click', () => goHero(i));
      dotsWrap.appendChild(dot);
    }

    // Upload overlay in edit mode
    if (editMode) {
      const ov = document.createElement('div');
      ov.className = 'upload-hint always';
      ov.style.zIndex = '4';
      ov.innerHTML = `
        <div class="upload-hint-text">Hero Slide ${i+1}</div>
        <button class="upload-hint-btn" onclick="triggerHeroUpload(${i})">上传媒体</button>`;
      slide.appendChild(ov);
    }
  });

  const counterEl = document.getElementById('hero-counter');
  if (counterEl) {
    counterEl.textContent = `${String(heroIdx+1).padStart(2,'0')} / ${String(DATA.hero.length).padStart(2,'0')}`;
  }
}

function goHero(i) {
  heroIdx = i;
  clearInterval(heroTimer);
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  slides.forEach((s,j) => s.classList.toggle('active', j===i));
  dots.forEach((d,j)   => d.classList.toggle('active', j===i));
  const counter = document.getElementById('hero-counter');
  if (counter) counter.textContent = `${String(i+1).padStart(2,'0')} / ${String(DATA.hero.length).padStart(2,'0')}`;
  heroTimer = setInterval(() => goHero((heroIdx+1) % DATA.hero.length), 5000);
}

function startHeroAuto() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => goHero((heroIdx+1) % DATA.hero.length), 5000);
}

/* ────────────────────────────────────────────────
   6. WORKS GRID + FILTER
──────────────────────────────────────────────── */
let activeFilter = 'all';

function renderWorks() {
  const grid = document.getElementById('works-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = activeFilter === 'all'
    ? DATA.works
    : DATA.works.filter(w => w.category === activeFilter);

  if (!filtered.length) {
    grid.innerHTML = '<div class="works-empty">暂无作品</div>';
    return;
  }

  filtered.forEach((w, i) => {
    const card = makeWorkCard(w);
    grid.appendChild(card);
    // Stagger reveal
    setTimeout(() => card.classList.add('revealed'), 50 + i * 40);
  });
}

function makeWorkCard(w) {
  const card = document.createElement('div');
  card.className = 'work-card';
  card.dataset.id = w.id;
  card.dataset.category = w.category || 'motion';

  const isAnim = w.mediaType === 'webp' || w.mediaType === 'gif';
  const isVideo = w.mediaType === 'mp4';
  const catInfo = CATEGORIES[w.category] || CATEGORIES.motion;

  // Thumb HTML
  let thumbHtml = '';
  if (!w.media && !w.cover) {
    thumbHtml = `<div class="card-thumb" style="display:flex;align-items:center;justify-content:center">
      <span style="font-family:monospace;font-size:11px;color:#444;letter-spacing:0.1em">待上传</span>
    </div>`;
  } else {
    const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    let mediaHtml = '';
    if (isAnim && w.media) {
      // Show first frame static, play on hover
      mediaHtml = `<img class="anim-img" src="${BLANK}" data-anim-src="${w.media}" alt="${w.title||''}" loading="lazy">`;
    } else if (isVideo) {
      const poster = w.cover || '';
      mediaHtml = `<img src="${poster}" alt="${w.title||''}" loading="lazy" style="width:100%;height:100%;object-fit:cover">
        <div class="play-badge-v2" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
          <div style="width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,.55);border:1.5px solid rgba(255,255,255,.8);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>`;
    } else {
      mediaHtml = `<img src="${w.media||w.cover}" alt="${w.title||''}" loading="lazy">`;
    }

    thumbHtml = `<div class="card-thumb">
      ${mediaHtml}
      <span class="card-category ${catInfo.cls}">${catInfo.label}</span>
      ${isAnim && w.media ? '<span class="anim-hover-label">悬停播放</span>' : ''}
      <div class="upload-hint">
        <div class="upload-hint-text">更换媒体</div>
        <button class="upload-hint-btn" onclick="event.stopPropagation();triggerWorkUpload('${w.id}')">上传</button>
        <button class="upload-hint-del" onclick="event.stopPropagation();deleteWork('${w.id}')">删除</button>
      </div>
    </div>`;
  }

  const toolTags = (w.tools || []).map(t => `<span class="card-tag">${t}</span>`).join('');

  card.innerHTML = `${thumbHtml}
    <div class="card-info">
      <div class="card-title" data-field="title">${escHtml(w.title||'作品标题')}</div>
      <div class="card-tags">${toolTags}</div>
    </div>`;

  // Hover-to-play for anim
  if (isAnim && w.media) {
    const animImg = card.querySelector('.anim-img');
    const thumb = card.querySelector('.card-thumb');
    const label = card.querySelector('.anim-hover-label');
    const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    // Extract first frame
    extractAnimFirstFrame(w.media).then(frame => {
      if (frame && animImg) animImg.src = frame;
      if (animImg) animImg.dataset.frameSrc = frame || w.media;
    });
    if (thumb) {
      thumb.addEventListener('mouseenter', () => {
        if (animImg) animImg.src = animImg.dataset.animSrc;
      });
      thumb.addEventListener('mouseleave', () => {
        if (animImg) animImg.src = animImg.dataset.frameSrc || BLANK;
      });
    }
  }

  // Click → modal
  card.addEventListener('click', e => {
    if (e.target.closest('.upload-hint') || editMode) return;
    openModal(w.id);
  });

  // Editable title
  const titleEl = card.querySelector('[data-field="title"]');
  if (titleEl) {
    titleEl.contentEditable = editMode ? 'true' : 'false';
    titleEl.addEventListener('blur', () => {
      w.title = titleEl.textContent.trim();
      saveLocal();
    });
  }

  return card;
}

/* filter button events */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter || 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    // FLIP-based reorder: simple fade
    const grid = document.getElementById('works-grid');
    if (grid) grid.style.opacity = '0';
    setTimeout(() => {
      renderWorks();
      if (grid) grid.style.opacity = '1';
    }, 200);
  });
});

/* ────────────────────────────────────────────────
   7. MODAL
──────────────────────────────────────────────── */
let currentModalId = null;

function openModal(id) {
  const w = DATA.works.find(x => x.id === id);
  if (!w) return;
  currentModalId = id;

  const backdrop = document.getElementById('modal-backdrop');
  const modal    = document.getElementById('modal');
  const mediaWrap= document.getElementById('modal-media');
  const catEl    = document.getElementById('modal-category');
  const titleEl  = document.getElementById('modal-title');
  const descEl   = document.getElementById('modal-desc');
  const toolsEl  = document.getElementById('modal-tools');

  // Media
  if (mediaWrap) {
    const isVideo = w.mediaType === 'mp4';
    const isAnim  = w.mediaType === 'webp' || w.mediaType === 'gif';
    if (isVideo && w.media) {
      mediaWrap.innerHTML = `<video src="${w.media}" poster="${w.cover||''}" controls autoplay muted playsinline style="width:100%;height:100%;object-fit:contain;display:block"></video>`;
    } else if ((isAnim || w.mediaType === 'img') && w.media) {
      mediaWrap.innerHTML = `<img src="${w.media}" alt="${w.title||''}" style="width:100%;height:100%;object-fit:contain;display:block">`;
    } else if (w.cover) {
      mediaWrap.innerHTML = `<img src="${w.cover}" alt="${w.title||''}" style="width:100%;height:100%;object-fit:contain;display:block">`;
    } else {
      mediaWrap.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#444;font-family:monospace;font-size:12px;letter-spacing:0.1em">暂无媒体</div>`;
    }
  }

  const catInfo = CATEGORIES[w.category] || CATEGORIES.motion;
  if (catEl) catEl.textContent = catInfo.label;
  if (titleEl) titleEl.textContent = w.title || '作品标题';
  if (descEl) descEl.textContent = w.desc || '';
  if (toolsEl) {
    toolsEl.innerHTML = (w.tools||[]).map(t => `<span class="modal-tool">${t}</span>`).join('');
  }

  // Prev / Next
  const visibleWorks = activeFilter === 'all' ? DATA.works : DATA.works.filter(x => x.category === activeFilter);
  const idx = visibleWorks.findIndex(x => x.id === id);
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');
  if (prevBtn) prevBtn.disabled = idx <= 0;
  if (nextBtn) nextBtn.disabled = idx >= visibleWorks.length - 1;
  if (prevBtn) prevBtn.onclick = () => { if(idx>0) openModal(visibleWorks[idx-1].id); };
  if (nextBtn) nextBtn.onclick = () => { if(idx<visibleWorks.length-1) openModal(visibleWorks[idx+1].id); };

  backdrop.classList.add('open');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
  // Stop video
  const vid = document.querySelector('#modal-media video');
  if (vid) { vid.pause(); vid.src = ''; }
  currentModalId = null;
}

document.getElementById('modal-close')?.addEventListener('click', closeModal);
document.getElementById('modal-backdrop')?.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

/* ────────────────────────────────────────────────
   8. CONTACT
──────────────────────────────────────────────── */
function renderContact() {
  const c = DATA.contact;
  const emailEl = document.getElementById('contact-email');
  if (emailEl && c.email) {
    emailEl.textContent = c.email;
    emailEl.href = `mailto:${c.email}`;
    emailEl.onclick = (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(c.email).then(() => showToast('邮箱已复制'));
    };
  }

  // Resume btn
  const resumeBtn = document.getElementById('resume-download');
  if (resumeBtn) {
    if (c.resumeUrl) {
      resumeBtn.href = c.resumeUrl;
      resumeBtn.style.display = '';
    } else {
      resumeBtn.style.display = 'none';
    }
  }

  // Social links
  const dEl = document.getElementById('contact-douyin');
  const bEl = document.getElementById('contact-bilibili');
  if (dEl && c.douyin) { dEl.href = c.douyin; dEl.style.display = ''; }
  if (bEl && c.bilibili) { bEl.href = c.bilibili; bEl.style.display = ''; }

  // Sidebar resume btn
  const sBtn = document.getElementById('sidebar-resume');
  if (sBtn) {
    if (c.resumeUrl) { sBtn.href = c.resumeUrl; sBtn.style.display = ''; }
    else sBtn.style.display = 'none';
  }
}

/* ────────────────────────────────────────────────
   9. EDIT MODE
──────────────────────────────────────────────── */
let editMode = false;

function toggleEdit() {
  editMode = !editMode;
  document.getElementById('app').classList.toggle('editing', editMode);
  if (editMode) localStorage.setItem('portfolio_editor_token', '1');
  renderAll();
  showToast(editMode ? '已进入编辑模式' : '已退出编辑模式');
}

// Secret entry: triple-click copyright text
document.getElementById('sidebar-copyright')?.addEventListener('click', (() => {
  let clicks = 0, t;
  return () => {
    clicks++;
    clearTimeout(t);
    t = setTimeout(() => { clicks = 0; }, 500);
    if (clicks >= 3) { clicks = 0; toggleEdit(); }
  };
})());

/* Work upload */
function triggerWorkUpload(id) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'video/mp4,video/webm,image/webp,image/gif,image/jpeg,image/png';
  inp.addEventListener('change', async () => {
    const file = inp.files[0];
    if (!file) return;
    const w = DATA.works.find(x => x.id === id);
    if (!w) return;

    const isVideo = file.type.startsWith('video/');
    const isWebpGif = file.type === 'image/webp' || file.type === 'image/gif';
    w.mediaType = isVideo ? 'mp4' : (isWebpGif ? 'webp' : 'img');

    const blob = URL.createObjectURL(file);
    w.media = blob;

    if (isVideo) {
      w.cover = await extractFirstFrameFile(file);
      w.ar    = await getVideoAR(file);
    } else {
      w.ar = await getImageAR(blob);
    }

    saveLocal();
    renderWorks();

    const result = await uploadFile(file);
    if (result) {
      URL.revokeObjectURL(blob);
      w.media   = result.url;
      w.fileID  = result.fileID;
      if (isVideo && w.cover && w.cover.startsWith('data:')) {
        const coverBlob = await fetch(w.cover).then(r=>r.blob());
        const coverFile = new File([coverBlob], 'cover.jpg', {type:'image/jpeg'});
        const cr = await uploadFile(coverFile);
        if (cr) { w.cover = cr.url; w.coverFileID = cr.fileID; }
      }
      saveLocal();
      renderWorks();
      clearTimeout(_pubTimer);
      if (db) publishCloud();
    }
  });
  inp.click();
}

/* Hero upload */
function triggerHeroUpload(idx) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'video/mp4,video/webm,image/webp,image/gif,image/jpeg,image/png';
  inp.addEventListener('change', async () => {
    const file = inp.files[0];
    if (!file) return;
    const h = DATA.hero[idx];
    if (!h) return;
    const isVideo = file.type.startsWith('video/');
    h.mediaType = isVideo ? 'mp4' : 'img';
    const blob = URL.createObjectURL(file);
    h.media = blob;
    if (isVideo) h.cover = await extractFirstFrameFile(file);
    saveLocal();
    renderHero();
    const result = await uploadFile(file);
    if (result) {
      URL.revokeObjectURL(blob);
      h.media  = result.url;
      h.fileID = result.fileID;
      saveLocal();
      renderHero();
      clearTimeout(_pubTimer);
      if (db) publishCloud();
    }
  });
  inp.click();
}

function deleteWork(id) {
  DATA.works = DATA.works.filter(w => w.id !== id);
  saveLocal();
  renderWorks();
}

/* Add blank work card */
function addWork(category = 'motion') {
  DATA.works.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
    title: '作品标题',
    category,
    tools: [],
    desc: '',
    media: '', cover: '', mediaType: 'webp', ar: 1.78,
  });
  saveLocal();
  renderWorks();
}

/* ────────────────────────────────────────────────
   10. HELPERS
──────────────────────────────────────────────── */
function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,5);
}

function showToast(msg, dur = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), dur);
}

function extractAnimFirstFrame(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.88));
      } catch(e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function extractFirstFrameFile(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
    v.addEventListener('loadeddata', () => { v.currentTime = 0.01; });
    v.addEventListener('seeked', () => {
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0);
      resolve(c.toDataURL('image/jpeg', 0.82));
      URL.revokeObjectURL(url);
    });
    v.addEventListener('error', () => { resolve(''); URL.revokeObjectURL(url); });
  });
}

function getVideoAR(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata'; v.src = url;
    v.addEventListener('loadedmetadata', () => { resolve(v.videoWidth/v.videoHeight || 1.78); URL.revokeObjectURL(url); });
    v.addEventListener('error', () => { resolve(1.78); URL.revokeObjectURL(url); });
  });
}

function getImageAR(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth/img.naturalHeight || 1);
    img.onerror = () => resolve(1);
    img.src = url;
  });
}

/* ────────────────────────────────────────────────
   11. RENDER ALL + INIT
──────────────────────────────────────────────── */
function renderAll() {
  renderHero();
  renderWorks();
  renderContact();
}

async function init() {
  document.body.classList.add('loading');
  loadLocalData();
  renderAll();
  startHeroAuto();
  document.body.classList.remove('loading');

  const cloudOk = await initCloud();
  if (cloudOk) await loadCloud();

  // Restore edit mode if editor token present
  if (localStorage.getItem('portfolio_editor_token')) {
    // Don't auto-enter edit mode for visitors, only show on explicit action
  }
}

document.addEventListener('DOMContentLoaded', init);
