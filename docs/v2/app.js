/* ================================================================
   app.js — 张峻烨作品集 v2
   Modules: Data · Cloud · Cursor · Hero · HGallery · Marquee · Archive · Modal · Edit
   ================================================================ */
'use strict';

/* ────────────────────────────────────────────────
   1. CONSTANTS & DATA
──────────────────────────────────────────────── */
const APP_KEY      = 'portfolio_v2_data';
const CLOUD_ENV_ID = 'my-web-d5gsldm9ha36297d1';
const CLOUD_CDN    = 'https://6d79-my-web-d5gsldm9ha36297d1-1424382234.tcb.qcloud.la';

const CATEGORIES = {
  all:    { label: '全部',     cls: '' },
  motion: { label: '动态特效', cls: 'motion' },
  video:  { label: '视频模板', cls: 'video' },
  aigc:   { label: 'AIGC 创意',cls: 'aigc' },
  mg:     { label: 'MG 动画',  cls: 'mg' },
  agent:  { label: '工具开发', cls: 'agent' },
};

// Default placeholder data (3 selected + archive)
let DATA = {
  works: [
    { id: 'p1', title: '短视频平台特效素材', category: 'motion', tools: ['AE','剪映'], desc: '参与短视频平台全链路特效素材设计，独立完成动态特效、画面转场制作。', media: '', cover: '', mediaType: 'webp', year: '2024' },
    { id: 'p2', title: 'Seedream × AE 骨骼动效', category: 'aigc', tools: ['AE','Seedream','AIGC'], desc: 'AI 生成原画 → 骨骼点位绑定 → 循环动态打磨 → 抖音特效模板适配。', media: '', cover: '', mediaType: 'mp4', year: '2024' },
    { id: 'p3', title: '无畏契约 LOGO · MG 动画', category: 'mg', tools: ['AE','PS'], desc: '全程 AE 矢量形状图层原创手搓，LOGO 图形拆解、形变动画、节奏卡点。', media: '', cover: '', mediaType: 'mp4', year: '2023' },
    { id: 'p4', title: 'AIGC 工作流工具集', category: 'agent', tools: ['JS','API','Agent'], desc: '自主搭建网页端设计辅助工具，整合素材生成、Prompt 管理、流程自动化。', media: '', cover: '', mediaType: 'img', year: '2024' },
  ],
  archive: [], // bulk works
  hero: [
    { title: '动态特效 × 创意设计', desc: '参与短视频平台全链路特效素材设计', media: '', cover: '', mediaType: 'mp4', tag: '业务作品' },
    { title: 'AI 全链路创作工作流', desc: 'Seedream 生图 → AE 骨骼动画 → 抖音特效模板', media: '', cover: '', mediaType: 'mp4', tag: 'AIGC' },
    { title: 'MG 动画 × 运动设计', desc: '矢量形状图层原创手搓制作', media: '', cover: '', mediaType: 'mp4', tag: 'Motion' },
  ],
  contact: { email: '', phone: '', douyin: '', bilibili: '', resumeUrl: '' },
  _version: 0,
};

/* ────────────────────────────────────────────────
   2. CLOUDBASE
──────────────────────────────────────────────── */
let tcbApp = null, db = null;

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
  } catch(e) { console.warn('Cloud init failed', e); return false; }
}

function loadLocal() {
  try {
    const s = localStorage.getItem(APP_KEY);
    if (!s) return;
    const d = JSON.parse(s);
    if (d.works)   DATA.works   = d.works;
    if (d.archive) DATA.archive = d.archive;
    if (d.hero)    DATA.hero    = d.hero;
    if (d.contact) DATA.contact = Object.assign(DATA.contact, d.contact);
    if (d._version) DATA._version = d._version;
    [DATA.works, DATA.archive, DATA.hero].forEach(arr => {
      (arr||[]).forEach(item => { item.media = fixUrl(item.media); item.cover = fixUrl(item.cover); });
    });
  } catch(e) {}
}

function saveLocal() {
  DATA._version = Date.now();
  try { localStorage.setItem(APP_KEY, JSON.stringify(DATA)); } catch(e) {}
  clearTimeout(_pubTimer);
  _pubTimer = setTimeout(() => { if (db) syncCloud(); }, 3000);
}
let _pubTimer = null;

async function syncCloud() {
  if (!db) return;
  try {
    const clean = JSON.parse(JSON.stringify(DATA));
    [clean.works, clean.archive||[], clean.hero].forEach(arr => {
      (arr||[]).forEach(w => {
        if (w.media?.startsWith('blob:')) w.media = '';
        if (w.cover?.startsWith('blob:')) w.cover = '';
      });
    });
    const col = db.collection('portfolio_v2');
    try { await col.doc('main').remove(); } catch(e) {}
    await col.add({ _id: 'main', data: clean, updatedAt: new Date() });
  } catch(e) { console.warn('Cloud sync failed', e); }
}

async function loadCloud() {
  if (!db) return;
  try {
    const r = await db.collection('portfolio_v2').doc('main').get();
    if (r.data && r.data.length > 0) {
      const d = r.data[0].data;
      if (!d || (d._version||0) <= (DATA._version||0)) return;
      if (d.works)   DATA.works   = d.works;
      if (d.archive) DATA.archive = d.archive;
      if (d.hero)    DATA.hero    = d.hero;
      if (d.contact) DATA.contact = Object.assign(DATA.contact, d.contact);
      DATA._version = d._version;
      [DATA.works, DATA.archive||[], DATA.hero].forEach(arr => {
        (arr||[]).forEach(item => { item.media = fixUrl(item.media); item.cover = fixUrl(item.cover); });
      });
      saveLocal();
      renderAll();
    }
  } catch(e) {}
}

function fixUrl(url) {
  if (!url) return url || '';
  if (url.includes('tcb.qcloud.la') && !url.includes('6d79-'))
    return url.replace('https://', 'https://6d79-');
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
    if (result.fileID) return { url: `${CLOUD_CDN}/${cloudPath}`, fileID: result.fileID };
    return null;
  } catch(e) { console.error('Upload fail', e); return null; }
}

/* ────────────────────────────────────────────────
   3. CUSTOM CURSOR
──────────────────────────────────────────────── */
const $cursor = document.getElementById('cursor');
const $cursorLbl = document.getElementById('cursor-label');
let _mx = 0, _my = 0, _cx = 0, _cy = 0;

document.addEventListener('mousemove', e => { _mx = e.clientX; _my = e.clientY; });

(function animCursor() {
  _cx += (_mx - _cx) * 0.18;
  _cy += (_my - _cy) * 0.18;
  if ($cursor) { $cursor.style.left = _cx + 'px'; $cursor.style.top = _cy + 'px'; }
  if ($cursorLbl) { $cursorLbl.style.left = _mx + 'px'; $cursorLbl.style.top = (_my + 28) + 'px'; }
  requestAnimationFrame(animCursor);
})();

document.addEventListener('mouseenter', e => {
  const t = e.target;
  if (t.closest('.gallery-card, .arc-card')) { $cursor?.classList.add('play'); $cursorLbl?.classList.add('show'); if ($cursorLbl) $cursorLbl.textContent = 'PLAY'; return; }
  if (t.closest('a,button,.resume-btn,.filter-btn,.modal-nav-btn,.modal-close,.hero-dot,.load-more-btn')) $cursor?.classList.add('hover');
}, true);
document.addEventListener('mouseleave', e => {
  const t = e.target;
  if (t.closest('.gallery-card, .arc-card')) { $cursor?.classList.remove('play'); $cursorLbl?.classList.remove('show'); return; }
  if (t.closest('a,button,.resume-btn,.filter-btn,.modal-nav-btn,.modal-close,.hero-dot,.load-more-btn')) $cursor?.classList.remove('hover');
}, true);

/* ────────────────────────────────────────────────
   4. SCROLL PROGRESS
──────────────────────────────────────────────── */
const $scrollBar = document.getElementById('scroll-bar');
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.documentElement.scrollHeight - innerHeight)) * 100;
  if ($scrollBar) $scrollBar.style.height = Math.min(100, pct) + '%';
  updateNavActive();
}, { passive: true });

function updateNavActive() {
  const ids = ['hero','gallery-section','archive','about','contact'];
  let active = ids[0];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= 120) active = id;
  });
  document.querySelectorAll('#s-nav a').forEach(a => {
    const h = a.getAttribute('href');
    a.classList.toggle('active', h === '#' + active || (h === '#works' && active === 'gallery-section'));
  });
}
document.querySelectorAll('#s-nav a').forEach(a => {
  a.addEventListener('click', e => {
    const h = a.getAttribute('href');
    if (!h.startsWith('#')) return;
    e.preventDefault();
    const el = document.querySelector(h);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ────────────────────────────────────────────────
   5. HERO CAROUSEL
──────────────────────────────────────────────── */
let _heroIdx = 0, _heroTimer = null;

function renderHero() {
  const wrap = document.getElementById('hero-slides');
  const dots = document.getElementById('hero-dots');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (dots) dots.innerHTML = '';

  DATA.hero.forEach((h, i) => {
    const slide = document.createElement('div');
    slide.className = 'hero-slide' + (i === _heroIdx ? ' active' : '');
    let mediaHtml = '';
    if (h.media && h.mediaType === 'mp4') {
      mediaHtml = `<video src="${h.media}" poster="${h.cover||''}" autoplay muted loop playsinline></video>`;
    } else if (h.media || h.cover) {
      mediaHtml = `<img src="${h.media||h.cover}" alt="${h.title||''}">`;
    } else {
      mediaHtml = `<div style="width:100%;height:100%;background:#141414;display:flex;align-items:center;justify-content:center"><span style="font-family:monospace;font-size:12px;color:#333;letter-spacing:0.1em">待上传</span></div>`;
    }
    slide.innerHTML = mediaHtml + `
      <div class="hero-overlay">
        <div class="hero-tag">${h.tag||'Motion'}</div>
        <div class="hero-title">${h.title||''}</div>
        <div class="hero-desc">${h.desc||''}</div>
      </div>`;
    if (editMode) {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center';
      ov.innerHTML = `<button class="gc-upload-btn" onclick="event.stopPropagation();triggerHeroUpload(${i})">上传 Hero ${i+1}</button>`;
      slide.appendChild(ov);
    }
    wrap.appendChild(slide);

    if (dots) {
      const dot = document.createElement('button');
      dot.className = 'hero-dot' + (i === _heroIdx ? ' active' : '');
      dot.addEventListener('click', () => goHero(i));
      dots.appendChild(dot);
    }
  });
  const counter = document.getElementById('hero-counter');
  if (counter) counter.textContent = `${String(_heroIdx+1).padStart(2,'0')} / ${String(DATA.hero.length).padStart(2,'0')}`;
}

function goHero(i) {
  _heroIdx = i;
  clearInterval(_heroTimer);
  document.querySelectorAll('.hero-slide').forEach((s,j) => s.classList.toggle('active', j===i));
  document.querySelectorAll('.hero-dot').forEach((d,j)   => d.classList.toggle('active', j===i));
  const counter = document.getElementById('hero-counter');
  if (counter) counter.textContent = `${String(i+1).padStart(2,'0')} / ${String(DATA.hero.length).padStart(2,'0')}`;
  _heroTimer = setInterval(() => goHero((_heroIdx+1) % DATA.hero.length), 5500);
}

function startHeroAuto() {
  clearInterval(_heroTimer);
  _heroTimer = setInterval(() => goHero((_heroIdx+1) % DATA.hero.length), 5500);
}

/* ────────────────────────────────────────────────
   6. HORIZONTAL GALLERY (GSAP ScrollTrigger)
──────────────────────────────────────────────── */
let activeFilter = 'all';
let _galleryTrigger = null;

function getFilteredWorks() {
  return activeFilter === 'all' ? DATA.works : DATA.works.filter(w => w.category === activeFilter);
}

function renderGallery() {
  const track = document.getElementById('gallery-track');
  if (!track) return;
  track.innerHTML = '';

  const works = getFilteredWorks();

  works.forEach((w, i) => {
    const card = makeGalleryCard(w, i);
    track.appendChild(card);
  });

  // Add card (edit mode)
  const addBtn = document.createElement('button');
  addBtn.className = 'gallery-add-card';
  addBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,59,92,.6)" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>添加作品</span>`;
  addBtn.addEventListener('click', () => addWork());
  track.appendChild(addBtn);

  // Gallery progress label
  const label = document.getElementById('gallery-counter-label');
  if (label && works.length) label.textContent = `01 / ${String(works.length).padStart(2,'0')}`;

  initHorizontalScroll();
}

function makeGalleryCard(w, idx) {
  const card = document.createElement('div');
  card.className = 'gallery-card';
  card.dataset.id = w.id;

  const catInfo = CATEGORIES[w.category] || CATEGORIES.motion;
  const isAnim = w.mediaType === 'webp' || w.mediaType === 'gif';
  const isVideo = w.mediaType === 'mp4';
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  let mediaHtml = '';
  if (!w.media && !w.cover) {
    mediaHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><span style="font-family:monospace;font-size:11px;color:#333;letter-spacing:0.1em">待上传</span></div>`;
  } else if (isAnim && w.media) {
    mediaHtml = `<img class="anim-img" src="${BLANK}" data-anim-src="${w.media}" data-frame-src="" alt="${w.title||''}">`;
  } else if (isVideo) {
    const poster = w.cover || '';
    mediaHtml = `<img src="${poster}" alt="${w.title||''}">
      <div class="play-badge"><div class="play-badge-circle"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>`;
  } else {
    mediaHtml = `<img src="${w.media||w.cover}" alt="${w.title||''}">`;
  }

  card.innerHTML = `
    <div class="gc-index">${String(idx+1).padStart(2,'0')}</div>
    <div class="gc-media">
      ${mediaHtml}
      <span class="gc-badge ${catInfo.cls}">${catInfo.label}</span>
      ${isAnim && w.media ? '<span class="gc-anim-label">悬停播放</span>' : ''}
      <div class="gc-upload-overlay">
        <button class="gc-upload-btn" onclick="event.stopPropagation();triggerWorkUpload('${w.id}')">上传媒体</button>
        <button class="gc-del-btn" onclick="event.stopPropagation();deleteWork('${w.id}')">删除</button>
      </div>
    </div>
    <div class="gc-info">
      <div class="gc-title" data-field="title">${escHtml(w.title||'作品标题')}</div>
      <div class="gc-meta">
        <div class="gc-tags">${(w.tools||[]).map(t=>`<span class="gc-tag">${t}</span>`).join('')}</div>
        <span class="gc-year">${w.year||'2024'}</span>
      </div>
    </div>`;

  // Hover-to-play anim
  if (isAnim && w.media) {
    const animImg = card.querySelector('.anim-img');
    const gcMedia = card.querySelector('.gc-media');
    extractAnimFirstFrame(w.media).then(frame => {
      if (frame && animImg) animImg.src = frame;
      if (animImg) animImg.dataset.frameSrc = frame || w.media;
    });
    gcMedia?.addEventListener('mouseenter', () => { if(animImg) animImg.src = animImg.dataset.animSrc; });
    gcMedia?.addEventListener('mouseleave', () => { if(animImg) animImg.src = animImg.dataset.frameSrc || BLANK; });
  }

  // Edit title
  const titleEl = card.querySelector('[data-field="title"]');
  if (titleEl) {
    titleEl.contentEditable = editMode ? 'true' : 'false';
    titleEl.addEventListener('blur', () => { w.title = titleEl.textContent.trim(); saveLocal(); });
  }

  // Click → modal
  card.addEventListener('click', e => {
    if (e.target.closest('.gc-upload-overlay') || editMode) return;
    openModal(w.id, 'works');
  });

  return card;
}

function initHorizontalScroll() {
  // Kill previous
  if (_galleryTrigger) { _galleryTrigger.kill(); _galleryTrigger = null; }

  // Mobile: use native scroll
  if (window.innerWidth <= 1023) return;

  const track = document.getElementById('gallery-track');
  const outer = document.getElementById('gallery-outer');
  const sticky = document.querySelector('.gallery-sticky');
  if (!track || !outer || !sticky) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const updateLayout = () => {
    const cards = track.querySelectorAll('.gallery-card');
    if (!cards.length) return;
    const cardW = 480 + 48; // card + gap
    const totalW = cards.length * cardW + 80 * 2; // + padding
    const translateX = -(totalW - window.innerWidth) - 80;

    if (_galleryTrigger) { _galleryTrigger.kill(); _galleryTrigger = null; }

    const scrollDist = Math.abs(translateX);
    outer.style.height = (scrollDist + window.innerHeight) + 'px';

    _galleryTrigger = ScrollTrigger.create({
      trigger: outer,
      start: 'top top',
      end: () => `+=${scrollDist}`,
      pin: sticky,
      scrub: 1.2,
      onUpdate: self => {
        gsap.set(track, { x: translateX * self.progress });

        // Card scale: center card gets scale 1.05
        const midX = window.innerWidth / 2;
        cards.forEach(c => {
          const rect = c.getBoundingClientRect();
          const cardMid = rect.left + rect.width / 2;
          const dist = Math.abs(cardMid - midX);
          const maxDist = window.innerWidth * 0.6;
          const scale = dist > maxDist ? 0.9 : gsap.utils.mapRange(0, maxDist, 1.05, 0.9, dist);
          const opacity = dist > maxDist ? 0.5 : gsap.utils.mapRange(0, maxDist, 1.0, 0.5, dist);
          gsap.set(c, { scale, opacity });
        });

        // Progress bar
        const progressBar = document.getElementById('gallery-progress-bar');
        if (progressBar) progressBar.style.width = (self.progress * 100) + '%';

        // Counter label
        const label = document.getElementById('gallery-counter-label');
        if (label) {
          const visible = Math.min(cards.length, Math.ceil(self.progress * cards.length) + 1);
          label.textContent = `${String(visible).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
        }

        // Easter egg onUpdate passthrough
        if (window._easterUpdate) window._easterUpdate(self);
      },
    });
  };

  updateLayout();
  window.addEventListener('resize', debounce(updateLayout, 300));
}

// Filter
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter || 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    const track = document.getElementById('gallery-track');
    if (track) { track.style.opacity = '0'; track.style.transition = 'opacity 0.2s'; }
    setTimeout(() => {
      renderGallery();
      if (track) { track.style.opacity = '1'; }
    }, 200);
  });
});

/* ────────────────────────────────────────────────
   7. INFINITE MARQUEE
──────────────────────────────────────────────── */
function initMarquee() {
  const ITEMS = ['AE', 'PS', 'AIGC', 'Motion', 'Effect', 'Seedream', 'MG 动画', '骨骼动画'];
  const rows = document.querySelectorAll('.marquee-row');
  rows.forEach((row, ri) => {
    const dir = ri % 2 === 0 ? 1 : -1;
    // build items × 4 for seamless loop
    const full = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];
    row.innerHTML = full.map(t => `<span class="marquee-item">${t} ·</span>`).join('');
    const totalW = row.scrollWidth / 2; // half because we duplicate
    let paused = false;
    row.addEventListener('mouseenter', () => { paused = true; });
    row.addEventListener('mouseleave', () => { paused = false; });

    let x = 0;
    const speed = 0.9;
    (function tick() {
      if (!paused) {
        x -= dir * speed;
        if (Math.abs(x) >= totalW) x = 0;
        row.style.transform = `translateX(${x}px)`;
      }
      requestAnimationFrame(tick);
    })();
  });
}

/* ────────────────────────────────────────────────
   8. ARCHIVE — PARALLAX MASONRY
──────────────────────────────────────────────── */
const ARCHIVE_PAGE = 12;
let _archiveLoaded = 0;

function renderArchive(reset = false) {
  if (reset) { _archiveLoaded = 0; }
  const cols = document.querySelectorAll('.masonry-col');
  if (!cols.length) return;
  if (reset) { cols.forEach(c => c.innerHTML = ''); }

  const src = DATA.archive.length ? DATA.archive : DATA.works;
  const slice = src.slice(_archiveLoaded, _archiveLoaded + ARCHIVE_PAGE);
  _archiveLoaded += slice.length;

  slice.forEach((w, i) => {
    const colIdx = i % cols.length;
    const card = makeArchiveCard(w);
    cols[colIdx].appendChild(card);
  });

  // Load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) loadMoreBtn.style.display = _archiveLoaded < src.length ? '' : 'none';

  initParallax();
}

function makeArchiveCard(w) {
  const card = document.createElement('div');
  card.className = 'arc-card';
  card.dataset.id = w.id;

  const catInfo = CATEGORIES[w.category] || CATEGORIES.motion;
  const isAnim = w.mediaType === 'webp' || w.mediaType === 'gif';
  const isVideo = w.mediaType === 'mp4';
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  let mediaHtml = '';
  if (!w.media && !w.cover) {
    mediaHtml = `<div style="aspect-ratio:1;background:#1c1c1c;display:flex;align-items:center;justify-content:center"><span style="font-family:monospace;font-size:10px;color:#333">待上传</span></div>`;
  } else if (isAnim && w.media) {
    mediaHtml = `<img class="anim-img" src="${BLANK}" data-anim-src="${w.media}" alt="${w.title||''}">`;
  } else if (isVideo) {
    mediaHtml = `<img src="${w.cover||''}" alt="${w.title||''}">`;
  } else {
    mediaHtml = `<img src="${w.media||w.cover}" alt="${w.title||''}">`;
  }

  card.innerHTML = `
    ${mediaHtml}
    <span class="arc-badge ${catInfo.cls}">${catInfo.label}</span>
    ${isAnim && w.media ? '<span class="arc-anim-label">悬停播放</span>' : ''}
    <div class="arc-overlay">
      <div class="arc-title">${escHtml(w.title||'作品')}</div>
      <div class="arc-tag">${(w.tools||[]).join(' · ')}</div>
    </div>
    <div class="arc-upload-overlay">
      <button class="gc-upload-btn" onclick="event.stopPropagation();triggerArchiveUpload('${w.id}')">上传</button>
      <button class="gc-del-btn" onclick="event.stopPropagation();deleteArchive('${w.id}')">删除</button>
    </div>`;

  // Anim hover
  if (isAnim && w.media) {
    const aImg = card.querySelector('.anim-img');
    extractAnimFirstFrame(w.media).then(f => { if(f && aImg) aImg.src = f; if(aImg) aImg.dataset.frameSrc = f||w.media; });
    card.addEventListener('mouseenter', () => { if(aImg) aImg.src = aImg.dataset.animSrc; });
    card.addEventListener('mouseleave', () => { if(aImg) aImg.src = aImg.dataset.frameSrc||BLANK; });
  }

  // Click → modal
  card.addEventListener('click', e => {
    if (e.target.closest('.arc-upload-overlay') || editMode) return;
    openModal(w.id, 'archive');
  });

  return card;
}

// Parallax on scroll
const PARALLAX_SPEEDS = [1.0, 0.85, 1.15, 0.92];
function initParallax() {
  const cols = document.querySelectorAll('.masonry-col');
  if (!cols.length) return;
  const archive = document.getElementById('archive');
  if (!archive) return;

  const onScroll = () => {
    const archiveTop = archive.getBoundingClientRect().top;
    const progress = -archiveTop / (archive.offsetHeight || 1);
    cols.forEach((col, i) => {
      const speed = PARALLAX_SPEEDS[i % PARALLAX_SPEEDS.length];
      const offset = progress * 60 * (speed - 1.0); // ±offset
      col.style.transform = `translateY(${offset}px)`;
    });
  };
  window.removeEventListener('scroll', _onScrollParallax);
  _onScrollParallax = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
}
let _onScrollParallax = null;

// Load more
document.getElementById('load-more-btn')?.addEventListener('click', () => {
  renderArchive(false);
});

/* ────────────────────────────────────────────────
   9. MODAL
──────────────────────────────────────────────── */
let _modalId = null, _modalSrc = 'works';

function openModal(id, src = 'works') {
  _modalId = id; _modalSrc = src;
  const arr = src === 'archive' ? (DATA.archive.length ? DATA.archive : DATA.works) : DATA.works;
  const w = arr.find(x => x.id === id);
  if (!w) return;

  const catInfo = CATEGORIES[w.category] || CATEGORIES.motion;
  const isVideo = w.mediaType === 'mp4';
  const isAnim  = w.mediaType === 'webp' || w.mediaType === 'gif';

  const mediaWrap = document.getElementById('modal-media');
  if (mediaWrap) {
    if (isVideo && w.media) {
      mediaWrap.innerHTML = `<video src="${w.media}" poster="${w.cover||''}" controls autoplay muted playsinline></video>`;
    } else if ((isAnim || w.mediaType === 'img') && w.media) {
      mediaWrap.innerHTML = `<img src="${w.media}" alt="${w.title||''}">`;
    } else if (w.cover) {
      mediaWrap.innerHTML = `<img src="${w.cover}" alt="${w.title||''}">`;
    } else {
      mediaWrap.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#333;font-family:monospace;font-size:12px">暂无媒体</div>`;
    }
  }

  setText('modal-cat', catInfo.label);
  setText('modal-title', w.title||'作品标题');
  setText('modal-desc', w.desc||'');
  const toolsEl = document.getElementById('modal-tools');
  if (toolsEl) toolsEl.innerHTML = (w.tools||[]).map(t=>`<span class="modal-tool">${t}</span>`).join('');

  const idx = arr.findIndex(x => x.id === id);
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');
  if (prevBtn) { prevBtn.disabled = idx <= 0; prevBtn.onclick = () => idx > 0 && openModal(arr[idx-1].id, src); }
  if (nextBtn) { nextBtn.disabled = idx >= arr.length-1; nextBtn.onclick = () => idx < arr.length-1 && openModal(arr[idx+1].id, src); }

  document.getElementById('modal-backdrop')?.classList.add('open');
  document.getElementById('modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-backdrop')?.classList.remove('open');
  document.getElementById('modal')?.classList.remove('open');
  document.body.style.overflow = '';
  const vid = document.querySelector('#modal-media video');
  if (vid) { vid.pause(); vid.src = ''; }
  _modalId = null;
}

document.getElementById('modal-close')?.addEventListener('click', closeModal);
document.getElementById('modal-backdrop')?.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ────────────────────────────────────────────────
   10. CONTACT
──────────────────────────────────────────────── */
function renderContact() {
  const c = DATA.contact;
  const emailEl = document.getElementById('contact-email');
  if (emailEl) {
    if (c.email) {
      emailEl.textContent = c.email;
      emailEl.href = `mailto:${c.email}`;
      emailEl.onclick = e => { e.preventDefault(); navigator.clipboard.writeText(c.email).then(() => showToast('邮箱已复制')); };
    }
  }
  const resumeEl = document.getElementById('resume-download');
  const resumeEl2 = document.getElementById('sidebar-resume');
  [resumeEl, resumeEl2].forEach(el => {
    if (!el) return;
    if (c.resumeUrl) { el.href = c.resumeUrl; el.style.display = ''; }
    else el.style.display = 'none';
  });
  const dEl = document.getElementById('contact-douyin');
  const bEl = document.getElementById('contact-bilibili');
  if (dEl && c.douyin) { dEl.href = c.douyin; dEl.style.display = ''; }
  if (bEl && c.bilibili) { bEl.href = c.bilibili; bEl.style.display = ''; }
}

/* ────────────────────────────────────────────────
   11. EDIT MODE
──────────────────────────────────────────────── */
let editMode = false;

function toggleEdit() {
  editMode = !editMode;
  document.getElementById('app')?.classList.toggle('editing', editMode);
  renderAll();
  showToast(editMode ? '已进入编辑模式' : '已退出编辑模式');
}

// Triple-click on copyright
document.getElementById('s-copy')?.addEventListener('click', (() => {
  let clicks = 0, t;
  return () => {
    clicks++;
    clearTimeout(t);
    t = setTimeout(() => { clicks = 0; }, 500);
    if (clicks >= 3) { clicks = 0; toggleEdit(); }
  };
})());

// Work upload (gallery)
function triggerWorkUpload(id) {
  const inp = createFileInput();
  inp.addEventListener('change', async () => {
    const file = inp.files[0]; if (!file) return;
    const w = DATA.works.find(x => x.id === id); if (!w) return;
    await handleMediaUpload(file, w, () => { saveLocal(); renderGallery(); });
  });
  inp.click();
}

// Archive upload
function triggerArchiveUpload(id) {
  const inp = createFileInput();
  inp.addEventListener('change', async () => {
    const file = inp.files[0]; if (!file) return;
    const src = DATA.archive.length ? DATA.archive : DATA.works;
    const w = src.find(x => x.id === id); if (!w) return;
    await handleMediaUpload(file, w, () => { saveLocal(); renderArchive(true); });
  });
  inp.click();
}

function triggerHeroUpload(idx) {
  const inp = createFileInput();
  inp.addEventListener('change', async () => {
    const file = inp.files[0]; if (!file) return;
    const h = DATA.hero[idx]; if (!h) return;
    const isVideo = file.type.startsWith('video/');
    h.mediaType = isVideo ? 'mp4' : 'img';
    const blob = URL.createObjectURL(file);
    h.media = blob;
    if (isVideo) h.cover = await extractFirstFrameFile(file);
    saveLocal(); renderHero();
    const result = await uploadFile(file);
    if (result) { URL.revokeObjectURL(blob); h.media = result.url; saveLocal(); renderHero(); }
  });
  inp.click();
}

function deleteWork(id) {
  DATA.works = DATA.works.filter(w => w.id !== id); saveLocal(); renderGallery();
}
function deleteArchive(id) {
  if (DATA.archive.length) DATA.archive = DATA.archive.filter(w => w.id !== id);
  else DATA.works = DATA.works.filter(w => w.id !== id);
  saveLocal(); renderArchive(true);
}

function addWork(cat = 'motion') {
  DATA.works.push({ id: uid(), title: '作品标题', category: cat, tools: [], desc: '', media: '', cover: '', mediaType: 'webp', year: '2024' });
  saveLocal(); renderGallery();
}

async function handleMediaUpload(file, item, onLocal) {
  const isVideo = file.type.startsWith('video/');
  const isWebpGif = file.type === 'image/webp' || file.type === 'image/gif';
  item.mediaType = isVideo ? 'mp4' : (isWebpGif ? 'webp' : 'img');
  const blob = URL.createObjectURL(file);
  item.media = blob;
  if (isVideo) { item.cover = await extractFirstFrameFile(file); item.ar = await getVideoAR(file); }
  else { item.ar = await getImageAR(blob); }
  onLocal();
  const result = await uploadFile(file);
  if (result) {
    URL.revokeObjectURL(blob);
    item.media = result.url;
    item.fileID = result.fileID;
    if (isVideo && item.cover?.startsWith('data:')) {
      const cb = await fetch(item.cover).then(r=>r.blob());
      const cf = new File([cb], 'cover.jpg', {type:'image/jpeg'});
      const cr = await uploadFile(cf);
      if (cr) { item.cover = cr.url; item.coverFileID = cr.fileID; }
    }
    onLocal();
    clearTimeout(_pubTimer);
    if (db) syncCloud();
  }
}

/* ────────────────────────────────────────────────
   12. HELPERS
──────────────────────────────────────────────── */
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function createFileInput() { const i = document.createElement('input'); i.type = 'file'; i.accept = 'video/mp4,video/webm,image/webp,image/gif,image/jpeg,image/png'; return i; }

function showToast(msg, dur = 2800) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), dur);
}

function extractAnimFirstFrame(src) {
  return new Promise(resolve => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img,0,0); resolve(c.toDataURL('image/jpeg',0.88)); } catch(e){ resolve(null); } };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function extractFirstFrameFile(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
    v.addEventListener('loadeddata', () => { v.currentTime = 0.01; });
    v.addEventListener('seeked', () => { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v,0,0); resolve(c.toDataURL('image/jpeg',0.82)); URL.revokeObjectURL(url); });
    v.addEventListener('error', () => { resolve(''); URL.revokeObjectURL(url); });
  });
}
function getVideoAR(file) { return new Promise(r => { const url = URL.createObjectURL(file); const v = document.createElement('video'); v.preload='metadata'; v.src=url; v.addEventListener('loadedmetadata', () => { r(v.videoWidth/v.videoHeight||1.78); URL.revokeObjectURL(url); }); v.addEventListener('error', () => { r(1.78); URL.revokeObjectURL(url); }); }); }
function getImageAR(url) { return new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth/i.naturalHeight||1); i.onerror = () => r(1); i.src = url; }); }

/* ────────────────────────────────────────────────
   13. RENDER ALL + INIT
──────────────────────────────────────────────── */
function renderAll() {
  renderHero();
  renderGallery();
  renderArchive(true);
  renderContact();
}

async function init() {
  loadLocal();
  renderAll();
  initMarquee();
  startHeroAuto();

  // Wait for GSAP to be available, then re-init gallery scroll
  if (!window.gsap || !window.ScrollTrigger) {
    const waitGSAP = setInterval(() => {
      if (window.gsap && window.ScrollTrigger) {
        clearInterval(waitGSAP);
        initHorizontalScroll();
        // Init easter egg
        const track = document.getElementById('gallery-track');
        if (window.initTimeCapsule && _galleryTrigger && track) {
          window.initTimeCapsule(_galleryTrigger, track);
        }
      }
    }, 200);
  } else {
    initHorizontalScroll();
  }

  const cloudOk = await initCloud();
  if (cloudOk) await loadCloud();
}

document.addEventListener('DOMContentLoaded', init);
