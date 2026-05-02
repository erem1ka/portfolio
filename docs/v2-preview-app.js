const APP_KEY = 'portfolio_v2_data';
const CLOUD_ENV_ID = 'my-web-d5gsldm9ha36297d1';

let editMode = false;
let darkMode = true;

// 初始化腾讯云开发
let tcbApp = null;
let db = null;

async function initCloudBase() {
  try {
    const sdk = window.cloudbaseSDK;
    if (!sdk || !sdk.default) {
      console.warn('CloudBase SDK 未加载');
      showToast('云存储 SDK 加载失败，数据仅保存在本地');
      return false;
    }
    tcbApp = sdk.default.init({ env: CLOUD_ENV_ID });
    const auth = tcbApp.auth();
    if (auth.signInAnonymously) {
      await auth.signInAnonymously();
    } else {
      await auth.anonymousAuthProvider().signIn();
    }
    db = tcbApp.database();
    console.log('✓ 云开发初始化成功');
    return true;
  } catch (e) {
    console.error('云开发初始化失败:', e);
    showToast('云存储连接失败，数据仅保存在本地');
    return false;
  }
}

let DATA = {
  practice: [],
  practice2: [],
  mg: [],
  'aigc-img': [],
  'aigc-vid': [],
  'aigc-prompt': [],
  agent: [],
  contact: {
    name: '张峻烨',
    bio: '效果创意设计 × AIGC 全链路创作者。实习期间参与短视频平台全链路特效素材设计，熟练掌握 AE 动态设计、Seedream 生图、骨骼木偶动画。持续探索 AI 工具与视觉创作的融合边界，自主搭建创意工作流工具集，具备 AI Agent 应用思维与全链路创意基建能力。',
    tags: ['After Effects','Seedream','MG 图形动效','骨骼木偶动画','AIGC 工作流','Agent 基建','剪映'],
    email: '{{EMAIL}}',
    qq: '{{QQ}}',
    phone: '{{PHONE}}',
    bilibili: '',
    douyin: '',
    wechatQr: ''
  },
  sectionTitles: {
    practice: { title:'短视频平台 · 业务作品', desc:'参与短视频平台全链路特效素材设计，独立完成动态特效、画面转场、轻量化动画素材的 AE 全流程制作与方案输出' },
    mg: { title:'无畏契约 LOGO · 原创 MG 动画', desc:'基于 IP 原生视觉体系，全程 AE 矢量形状图层原创手搓制作，独立完成 LOGO 图形拆解、形变动画、版式动态延展、节奏卡点与氛围光效设计' },
    aigc: { title:'Seedream 生图 + AE 木偶骨骼动效', desc:'AI 生成原画素材 → 透明抠图 → AE 骨骼点位绑定 → 循环动态打磨 → 抖音特效模板适配，完整「AI 素材生成→后期动态设计」全链路工作流' },
    agent: { title:'AI 智能体创意工作流工具集', desc:'基于 AIGC 开放 API 与智能体调度逻辑，自主搭建网页端设计辅助工具，整合素材生成、Prompt 管理、设计流程自动化能力' }
  },
  cols: { practice:180, mg:180, 'aigc-img':180, 'aigc-vid':180, 'aigc-prompt':180, agent:180 }
};

let _publishTimer = null;
function saveData(){
  DATA._version = Date.now();
  try{ localStorage.setItem(APP_KEY, JSON.stringify(DATA)); } catch(e){}
  // Auto-publish to cloud with 3s debounce
  clearTimeout(_publishTimer);
  _publishTimer = setTimeout(()=>{ if(db) publishDataToCloud(); }, 3000);
}
function loadData(){
  try{
    const s = localStorage.getItem(APP_KEY);
    if(s){
      const d=JSON.parse(s);
      // 深度替换：用本地缓存完全替换各数组，防止浅合并残留旧数据
      const SECTIONS = ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent'];
      SECTIONS.forEach(sec=>{ DATA[sec] = d[sec] || []; });
      if(d.contact) DATA.contact = Object.assign(DATA.contact, d.contact);
      if(d.sectionTitles) DATA.sectionTitles = d.sectionTitles;
      if(d.heroNav) DATA.heroNav = d.heroNav;
      if(d.tags) DATA.tags = d.tags;
      if(d.cols) {
        DATA.cols = d.cols;
        // Migrate old col-count values (1-8) or old default 100 to new default 180
        const SECTIONS = ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent'];
        SECTIONS.forEach(sec=>{
          if(DATA.cols[sec] !== undefined && (DATA.cols[sec] <= 8 || DATA.cols[sec] === 100)){
            DATA.cols[sec] = 180;
          }
        });
      }
      if(d.skills) DATA.skills = d.skills;
      if(d.toolCards) DATA.toolCards = d.toolCards;
      DATA._version = d._version;
      let cleaned = false;
      ['practice','mg','aigc-img','aigc-vid','aigc-prompt','agent'].forEach(sec => {
        DATA[sec].forEach(item => {
          if(item.media && (item.media.startsWith('blob:') || item.media.startsWith('data:'))) { item.media=''; cleaned=true; }
          if(item.cover && (item.cover.startsWith('blob:') || item.cover.startsWith('data:'))) { item.cover=''; cleaned=true; }
          item.media = fixCloudUrl(item.media);
          item.cover = fixCloudUrl(item.cover);
        });
      });
      DATA.contact.wechatQr = fixCloudUrl(DATA.contact.wechatQr);
      DATA.contact.resumeUrl = fixCloudUrl(DATA.contact.resumeUrl);
      // 清理了 blob URL 则重新写回 localStorage，防止脏数据影响后续发布
      if(cleaned) try{ localStorage.setItem(APP_KEY, JSON.stringify(DATA)); }catch(e){}
    }
  } catch(e){}
}

// Push DATA.json to GitHub so any visitor can load it
// Load only the version number from cloud (no data overwrite)
async function loadCloudDataVersion() {
  if (!db) return 0;
  try {
    const collection = db.collection('portfolio_v2');
    const result = await collection.doc('main').get();
    if (result.data && result.data.length > 0) {
      return result.data[0].data._version || 0;
    }
  } catch(e) {}
  return 0;
}

async function publishDataToCloud() {
  if (!db) {
    console.warn('云数据库未初始化，跳过同步');
    return;
  }
  
  try {
    // Safety check: only push if local version >= cloud version
    const cloudVer = await loadCloudDataVersion();
    const localVer = DATA._version || 0;
    if (cloudVer > localVer) {
      console.log('云端数据更新(local=' + localVer + ' cloud=' + cloudVer + ')，跳过推送，先拉取');
      await loadDataFromCloud(true);
      return;
    }
    
    const collection = db.collection('portfolio_v2');
    const dataToSave = JSON.parse(JSON.stringify(DATA));
    // 版本号：用时间戳，加载时比较，云端的更大则用云端的
    const newVersion = Date.now();
    dataToSave._version = newVersion;
    
    // 清理 blob/data URL（刷新后无效），直接置空而不是推迟发布
    // 上传进行中的文件：用 fileID 还原云端 URL；无 fileID 则清空，等用户重新上传
    ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent'].forEach(sec => {
      if(!dataToSave[sec]) return;
      dataToSave[sec].forEach(item => {
        if(item.media && (item.media.startsWith('blob:') || item.media.startsWith('data:'))) item.media = '';
        if(item.cover && (item.cover.startsWith('blob:') || item.cover.startsWith('data:'))) item.cover = '';
      });
    });
    if(dataToSave.contact){
      if(dataToSave.contact.wechatQr && (dataToSave.contact.wechatQr.startsWith('blob:') || dataToSave.contact.wechatQr.startsWith('data:'))) dataToSave.contact.wechatQr = '';
      if(dataToSave.contact.resumeUrl && (dataToSave.contact.resumeUrl.startsWith('blob:') || dataToSave.contact.resumeUrl.startsWith('data:'))) dataToSave.contact.resumeUrl = '';
    }
    
    let exists = false;
    try {
      const existing = await collection.doc('main').get();
      if (existing.data && existing.data.length > 0) exists = true;
    } catch(e) { exists = false; }
    
    if (exists) {
      // 全量覆盖：先删除旧文档再写入新文档，确保云端数据完全替换
      // set() 可能是合并而非替换，remove+add 确保万无一失
      try { await collection.doc('main').remove(); } catch(e) {}
      await collection.add({ _id: 'main', data: dataToSave, updatedAt: new Date() });
    } else {
      await collection.add({ _id: 'main', data: dataToSave, updatedAt: new Date() });
    }
    
    DATA._version = newVersion;
    console.log('✓ 数据已同步到云端');
  } catch (e) {
    console.error('同步失败:', e);
    showToast('数据同步失败，请检查网络');
  }
}

// 兼容旧代码的别名
async function publishDataToGitHub() {
  return publishDataToCloud();
}

// 从云端加载数据
async function loadDataFromCloud(forceLoad) {
  if (!db) return;
  
  try {
    const collection = db.collection('portfolio_v2');
    const result = await collection.doc('main').get();
    
    if (result.data && result.data.length > 0) {
      const cloudData = result.data[0].data;
      if (cloudData) {
        // 版本比较：如果本地数据比云端新（说明云端推送还未完成），跳过覆盖
        // 正常情况下 init() 会先 push 再 pull，版本号应该相同或云端更新
        const cloudVersion = cloudData._version || 0;
        const localVersion = DATA._version || 0;
        if (!forceLoad && localVersion > cloudVersion) {
          console.log('本地数据更新，跳过云端加载 (local=' + localVersion + ' cloud=' + cloudVersion + ')');
          return;
        }
        // 云端数据更新，用云端的
        // 深度合并：确保所有子对象也被覆盖
        // 清理 blob/data 链接 + 修复旧 URL
        ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent'].forEach(sec=>{
          if(!cloudData[sec]) cloudData[sec]=[];
          cloudData[sec].forEach(item=>{
            if(item.media && (item.media.startsWith('blob:') || item.media.startsWith('data:'))) item.media='';
            if(item.cover && (item.cover.startsWith('blob:') || item.cover.startsWith('data:'))) item.cover='';
            item.media = fixCloudUrl(item.media);
            item.cover = fixCloudUrl(item.cover);
          });
        });
        cloudData.contact && (cloudData.contact.wechatQr = fixCloudUrl(cloudData.contact.wechatQr));
        cloudData.contact && (cloudData.contact.resumeUrl = fixCloudUrl(cloudData.contact.resumeUrl));
        // Ensure heroNav/sectionTitles/tags exist even if cloud data is old
        if(!cloudData.heroNav) cloudData.heroNav = DATA.heroNav || {};
        if(!cloudData.sectionTitles) cloudData.sectionTitles = DATA.sectionTitles;
        if(!cloudData.tags) cloudData.tags = DATA.tags;
        if(!cloudData.cols) cloudData.cols = DATA.cols;
        
        // 深度替换：用云端数据完全替换本地数据，而不是浅合并
        // 确保数组字段被完全替换（不会保留本地旧数组）
        const SECTIONS = ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent'];
        SECTIONS.forEach(sec=>{
          DATA[sec] = cloudData[sec] || [];
        });
        // 替换 contact、sectionTitles、heroNav、tags、cols 等对象
        if(cloudData.contact) DATA.contact = Object.assign(DATA.contact, cloudData.contact);
        if(cloudData.sectionTitles) DATA.sectionTitles = cloudData.sectionTitles;
        if(cloudData.heroNav) DATA.heroNav = cloudData.heroNav;
        if(cloudData.tags) DATA.tags = cloudData.tags;
        if(cloudData.cols) {
          DATA.cols = cloudData.cols;
          const SECTIONS2 = ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent'];
          SECTIONS2.forEach(sec=>{
            if(DATA.cols[sec] !== undefined && (DATA.cols[sec] <= 8 || DATA.cols[sec] === 100)) DATA.cols[sec] = 180;
          });
        }
        if(cloudData.skills) DATA.skills = cloudData.skills;
        if(cloudData.toolCards) DATA.toolCards = cloudData.toolCards;
        DATA._version = cloudData._version;
        try{ localStorage.setItem(APP_KEY, JSON.stringify(DATA)); }catch(e){}
        renderAll();
        console.log('✓ 从云端加载数据成功');
      }
    }
  } catch (e) {
    console.error('从云端加载失败:', e);
  }
}

// 兼容旧代码的别名
async function loadDataFromGitHub() {
  return loadDataFromCloud();
}

function toggleTheme(){
  darkMode = !darkMode;
  const app = document.getElementById('app');
  app.classList.toggle('dark', darkMode);
  app.classList.toggle('light', !darkMode);
  // Update both sidebar and mobile theme icons
  const icons = [document.getElementById('themeIconSidebar'), document.getElementById('themeIconMobile')];
  const darkPath = '<path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/>';
  const lightPath = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  icons.forEach(icon => {
    if(!icon) return;
    icon.innerHTML = darkMode ? darkPath : lightPath;
  });
}

function toggleEdit(){
  // When exiting edit mode, purge empty cards (no media uploaded)
  if(editMode){
    const sections = ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent'];
    let cleaned = false;
    sections.forEach(sec=>{
      const before = (DATA[sec]||[]).length;
      DATA[sec] = (DATA[sec]||[]).filter(item=>item.media || item.type==='prompt');
      if(DATA[sec].length !== before) cleaned = true;
    });
    if(cleaned){ saveData(); renderAll(); }
  }
  editMode = !editMode;
  // 进入编辑模式时标记为编辑者设备（只有编辑者才能推送数据到云端）
  if(editMode) localStorage.setItem('portfolio_v2_editor_token', '1');
  const app = document.getElementById('app');
  app.classList.toggle('editing', editMode);
  const btn = document.getElementById('editMenuBtn');
  btn.textContent = editMode ? '退出编辑模式' : '进入编辑模式';
  document.querySelectorAll('[contenteditable]').forEach(el=>{
    el.contentEditable = editMode;
  });
  ['nav-practice','nav-mg','nav-aigc','nav-agent','nav-contact'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.pointerEvents = editMode ? 'none' : '';
  });
  const ph = document.getElementById('wechat-qr-placeholder');
  if(ph) ph.style.cursor = editMode ? 'pointer' : 'default';
  // show QR replace/delete actions if QR is uploaded
  const qrImg = document.getElementById('wechat-qr-img');
  const qrActions = document.getElementById('wechat-qr-actions');
  if(qrActions) qrActions.style.display = (editMode && qrImg && qrImg.src && !qrImg.src.endsWith('/')) ? 'flex' : 'none';
  // show/hide resume edit controls
  document.querySelectorAll('.resume-edit-ctrl,.nav-resume-edit').forEach(el=>el.style.display=editMode?'flex':'none');
  // re-render tags to show/hide edit controls
  rerenderAllTags();
  ['contact-bilibili','contact-douyin'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.contentEditable = editMode;
  });
  // Edit mode: show edit fields for header social links
  const headerDouyin = document.getElementById('header-douyin');
  const headerBilibili = document.getElementById('header-bilibili');
  if(editMode){
    if(headerDouyin) headerDouyin.style.display = 'flex';
    if(headerBilibili) headerBilibili.style.display = 'flex';
  }
  // Re-render galleries so overlays update with editMode
  renderGallerySection('practice');
  renderGallerySection('practice2');
  // Enable/disable drag-sort
  if(editMode) {
    enableDragSort();
  } else {
    disableDragSort();
  }
}

function openEditMenu(){ document.getElementById('editMenu').classList.add('open'); }
function closeEditMenu(){ document.getElementById('editMenu').classList.remove('open'); }

function toggleMobileNav(){
  const nav = document.getElementById('navLinks');
  nav.classList.toggle('mobile-open');
}
// Close mobile nav when clicking a link
document.addEventListener('click', e=>{
  if(e.target.closest('#navLinks a') || e.target.closest('#themeBtn')){
    const nav = document.getElementById('navLinks');
    if(nav) nav.classList.remove('mobile-open');
  }
});

function exportData(){
  const data = {
    portfolio: JSON.parse(localStorage.getItem('portfolio_v2_data')||'{}'),
    gh_config: JSON.parse(localStorage.getItem('gh_config')||'{}')
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(data.portfolio){
        localStorage.setItem('portfolio_v2_data', JSON.stringify(data.portfolio));
      }
      if(data.gh_config){
        localStorage.setItem('gh_config', JSON.stringify(data.gh_config));
      }
      alert('导入成功！页面将刷新。');
      location.reload();
    }catch(e){
      alert('导入失败：文件格式错误');
    }
  };
  reader.readAsText(file);
}

function setGridCols(gridId, n){
  // n here is row height in px
  n = Math.max(60, Math.min(300, parseInt(n)||100));
  const key = gridId.replace('-grid','');
  DATA.cols[key] = n;
  saveData();
  renderSection(key, gridId);
}

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

// Toast 提示
function showToast(msg, duration=3000){
  let t = document.getElementById('toast-msg');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast-msg';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;padding:8px 20px;border-radius:6px;font-size:.75rem;font-family:sans-serif;pointer-events:none;transition:opacity .3s;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.style.opacity='0'; }, duration);
}

// 图片压缩：PNG/JPG 压缩到 500KB 以内
function compressImage(file, maxKB=500){
  return new Promise(resolve=>{
    if(file.type==='image/webp' || file.type==='image/gif'){
      // webp/gif 不压缩，直接返回
      resolve(file);
      return;
    }
    const img = new Image();
    img.onload = ()=>{
      let w = img.naturalWidth, h = img.naturalHeight;
      // 限制最大边 1920px
      const maxDim = 1920;
      if(w > maxDim || h > maxDim){
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      let quality = 0.85;
      const tryCompress = ()=>{
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const sizeKB = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3/4 / 1024);
        if(sizeKB > maxKB && quality > 0.3){
          quality -= 0.1;
          return tryCompress();
        }
        // 转 Blob
        fetch(dataUrl).then(r=>r.blob()).then(blob=>{
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {type:'image/jpeg'}));
        });
      };
      tryCompress();
    };
    img.onerror = ()=>resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function makeMp4Card(item){
  const card = document.createElement('div');
  card.className = 'vcard bg-card border-card card-hover masonry-item';
  card.dataset.id = item.id;
  card.dataset.type = item.type || 'mp4';
  const isAnim = item.type==='webp' || item.type==='gif' || item.type==='anim' || item.mediaType==='webp' || item.mediaType==='gif';
  const coverSrc = item.cover || '';
  const mediaSrc = item.media || '';
  let mediaHtml;
  if(!mediaSrc){
    mediaHtml = `<div class="no-thumb">待上传</div>`;
  } else if(isAnim){
    // webp/gif: autoplay directly
    mediaHtml = `<img class="anim-img" src="${mediaSrc}" alt="" style="width:100%;height:100%;object-fit:cover;pointer-events:none;display:block">`;
  } else {
    // mp4: show cover with always-visible play badge
    mediaHtml = coverSrc
      ? `<img src="${coverSrc}" alt=""><div class="play-badge"><div class="play-circle"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>`
      : `<div class="no-thumb">待上传</div>`;
  }
  const uploadLabel = '上传视频 / 图片 / GIF';
  card.innerHTML = `
    <div class="card-media${!mediaSrc?' empty-card':''}">
      ${mediaHtml}
      <div class="upload-ov">
        <button class="upload-ov-btn" onclick="event.stopPropagation();triggerMediaUpload('${item.id}','mp4')">${uploadLabel}</button>
        <button class="del-ov-btn" onclick="event.stopPropagation();deleteCard('${item.id}')">&#x2715; 删除</button>
      </div>
    </div>
    <div class="p-2.5 pb-2">
      <p class="font-sans font-medium text-main text-[.82rem] leading-snug mb-0.5" data-field="title">${escHtml(item.title||'作品标题')}</p>
      <p class="text-sub font-light text-[.72rem] leading-relaxed whitespace-pre-wrap" data-field="desc">${escHtml(item.desc||'')}</p>
    </div>`;
  if(mediaSrc){
    const mediaEl = card.querySelector('.card-media');
    card.querySelector('.card-media').addEventListener('click', e=>{
      if(e.target.closest('.upload-ov') || editMode) return;
      if(isAnim){
        // webp/gif: open image zoom (shows animation looping)
        openImgZoom(mediaSrc);
      } else {
        // mp4: open inline video player
        openInlinePlayer(item.media, card);
      }
    });
  }
  setupEditableFields(card, item);
  return card;
}

function makeImgCard(item){
  const card = document.createElement('div');
  card.className = 'vcard bg-card border-card card-hover';
  card.dataset.id = item.id;
  card.dataset.type = 'img';
  card.innerHTML = `
    <div class="card-media${!item.media?' empty-card':''}">
      ${item.media ? `<img src="${item.media}" alt="" style="pointer-events:none">` : `<div class="no-thumb">待上传</div>`}
      <div class="upload-ov">
        <button class="upload-ov-btn" onclick="event.stopPropagation();triggerMediaUpload('${item.id}','img')">上传图片</button>
        <button class="del-ov-btn" onclick="event.stopPropagation();deleteCard('${item.id}')">&#x2715; 删除</button>
      </div>
    </div>
    <div class="p-2.5 pb-2">
      <p class="font-sans font-medium text-main text-[.82rem] leading-snug mb-0.5" data-field="title">${escHtml(item.title||'作品标题')}</p>
      <p class="text-sub font-light text-[.72rem] leading-relaxed whitespace-pre-wrap" data-field="desc">${escHtml(item.desc||'')}</p>
    </div>`;
  if(item.media){
    card.querySelector('.card-media').addEventListener('click', e=>{
      if(e.target.closest('.upload-ov') || editMode) return;
      openImgZoom(item.media);
    });
  }
  setupEditableFields(card, item);
  return card;
}

function makePromptCard(item){
  const card = document.createElement('div');
  card.className = 'vcard bg-card border-card';
  card.dataset.id = item.id;
  card.dataset.type = 'prompt';
  const body = item.body || '';
  const needFold = body.split('\n').length > 3 || body.length > 200;
  const hasMedia = item.media;
  let mediaHtml = '';
  if(hasMedia){
    const mt = item.mediaType || item.type;
    if(mt==='webp'){
      mediaHtml = `<img src="${item.media}" alt="" style="max-width:100%;border-radius:8px;pointer-events:none;margin-bottom:6px">`;
    } else if(mt==='mp4'){
      const coverSrc = item.cover || item.media;
      mediaHtml = `<div class="prompt-media" style="cursor:pointer;position:relative;margin-bottom:6px">
        <img src="${coverSrc}" alt="" style="max-width:100%;border-radius:8px">
        <div class="play-badge" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><div class="play-circle"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>
      </div>`;
    } else {
      mediaHtml = `<img src="${item.media}" alt="" style="max-width:100%;border-radius:8px;margin-bottom:6px">`;
    }
  }
  card.innerHTML = `
    <div class="p-3 pb-3.5 relative">
      <div class="flex items-start justify-between gap-2 mb-2">
        <p class="font-sans font-semibold text-main text-[.88rem] leading-snug flex-1" data-field="title">${escHtml(item.title||'Prompt 标题')}</p>
        <div class="upload-ov" style="position:static;background:none;border:none;display:none;flex-direction:row;gap:4px;align-items:center;padding:0">
          <button class="upload-ov-btn" onclick="event.stopPropagation();triggerMediaUpload('${item.id}','prompt')" style="font-size:.55rem;padding:3px 8px;border-radius:4px">上传媒体</button>
          <button class="del-ov-btn" onclick="deleteCard('${item.id}')">✕</button>
        </div>
      </div>
      ${hasMedia ? `<div class="mb-1 prompt-media-wrap">${mediaHtml}</div>` : ''}
      <div class="prompt-body ${needFold?'collapsed':''}" data-field="body">${escHtml(body)}</div>
      ${needFold ? `<button class="expand-btn mt-1.5" onclick="togglePrompt(this)" style="font-size:.6rem">展开全文 ▾</button>` : ''}
    </div>`;
  if(hasMedia && item.mediaType==='mp4'){
    const pm = card.querySelector('.prompt-media');
    if(pm) pm.addEventListener('click', e=>{
      if(e.target.closest('.upload-ov') || editMode) return;
      openInlinePlayer(item.media, card);
    });
  }
  card.addEventListener('mouseenter',()=>{ if(editMode) card.querySelector('.upload-ov').style.display='flex'; });
  card.addEventListener('mouseleave',()=>{ card.querySelector('.upload-ov').style.display='none'; });
  setupEditableFields(card, item);
  return card;
}

function togglePrompt(btn){
  const body = btn.previousElementSibling;
  const folded = body.classList.toggle('collapsed');
  btn.textContent = folded ? '展开全文 ▾' : '收起 ▴';
}

function escHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function setupEditableFields(card, item){
  card.querySelectorAll('[data-field]').forEach(el=>{
    el.contentEditable = editMode;
    el.addEventListener('blur',()=>{
      const f = el.dataset.field;
      item[f] = el.textContent.trim();
      saveData();
    });
  });
}

function renderSection(sectionKey, gridId, type){
  const items = DATA[sectionKey] || [];
  const container = document.getElementById(gridId);
  if(!container) return;
  container.innerHTML = '';

  const isMobile = window.innerWidth <= 900;
  const gap = 10;

  // Prompt cards: flex wrap, responsive width
  if(items.length && items[0].type==='prompt'){
    items.forEach((item,i)=>{
      const card = makePromptCard(item);
      card.style.width = isMobile ? '100%' : '280px';
      container.appendChild(card);
    });
    container.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;position:static;height:auto;width:auto;margin-left:0';
    if (editMode) initDragSort(container, sectionKey);
    return;
  }

  // Mobile: 2-column CSS grid
  if(isMobile){
    items.forEach((item,i)=>{
      let card = item.type==='img' ? makeImgCard(item) : makeMp4Card(item);
      card.style.position = 'static';
      card.style.width = '100%';
      card.style.height = 'auto';
      const mediaEl = card.querySelector('.card-media');
      if(mediaEl){
        mediaEl.style.cssText = 'position:relative;height:0;padding-top:56.25%;overflow:hidden';
        mediaEl.querySelectorAll('img,video,.no-thumb').forEach(el=>{
          el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
        });
      }
      container.appendChild(card);
    });
    container.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;position:static;height:auto;width:auto;margin-left:0';
    if (editMode) initDragSort(container, sectionKey);
    return;
  }

  // Desktop: Flex-wrap justified row layout
  // Fixed image row height, card width = rowH * aspect ratio, last row centered
  const rowH = DATA.cols[sectionKey] || 180; // stored value is row height in px

  items.forEach((item,i)=>{
    let card = item.type==='img' ? makeImgCard(item) : makeMp4Card(item);
    const ratio = item.ar || (16/9);
    const cardW = Math.round(rowH * ratio);

    card.style.position = 'static';
    card.style.width = cardW + 'px';
    card.style.height = 'auto';
    card.style.flexShrink = '0';
    card.style.flexGrow = '0';

    const mediaEl = card.querySelector('.card-media');
    if(mediaEl){
      mediaEl.style.height = rowH + 'px';
      mediaEl.style.overflow = 'hidden';
      mediaEl.querySelectorAll('img,video,.no-thumb').forEach(el=>{
        el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
      });
    }

    container.appendChild(card);
  });

  // 懒动画：只有进入视口的卡片才加 vis
  const lazyVis=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('vis');lazyVis.unobserve(e.target);}});
  },{threshold:0.05});
  container.querySelectorAll('.vcard').forEach(c=>lazyVis.observe(c));

  container.style.cssText = `display:flex;flex-wrap:wrap;gap:${gap}px;justify-content:center;align-items:flex-start;position:static;height:auto;width:auto;margin-left:0`;

  // Initialize drag-sort if in edit mode
  if (editMode) initDragSort(container, sectionKey);
}

function renderAll(){
  renderGallerySection('practice');
  renderGallerySection('practice2');
  renderSection('mg', 'mg-grid', 'auto');
  renderSection('aigc-img', 'aigc-img-grid', 'auto');
  renderSection('aigc-vid', 'aigc-vid-grid', 'auto');
  renderSection('aigc-prompt', 'aigc-prompt-grid', 'auto');
  renderSection('agent', 'agent-grid', 'auto');
  restoreCols();
  restoreSectionTitles();
  restoreContact();
  restoreHeroNav();
  renderTags('hero-tags','hero');
  renderTags('contact-tags','contact');
}

let _resizeTimer = null;
let _lastMobile = window.innerWidth <= 900;
window.addEventListener('resize', ()=>{
  clearTimeout(_resizeTimer);
  const nowMobile = window.innerWidth <= 900;
  if(nowMobile !== _lastMobile){ _lastMobile = nowMobile; _resizeTimer = setTimeout(renderAll, 200); }
  else { applyLayoutByScreen(); }
});

function restoreCols(){
  const map = {
    'practice-cols':'practice','practice2-cols':'practice2', 'mg-cols':'mg', 'aigc-img-cols':'aigc-img',
    'aigc-vid-cols':'aigc-vid', 'aigc-prompt-cols':'aigc-prompt', 'agent-cols':'agent'
  };
  Object.entries(map).forEach(([inputId, key])=>{
    const inp = document.getElementById(inputId);
    const n = DATA.cols[key] || 180; // now stores row height
    if(inp) inp.value = n;
  });
}

function restoreSectionTitles(){
  const st = DATA.sectionTitles;
  ['practice','mg','aigc','agent'].forEach(k=>{
    const t = document.getElementById(`${k}-title`);
    const d = document.getElementById(`${k}-desc`);
    if(t && st[k]) t.textContent = st[k].title;
    if(d && st[k]) d.textContent = st[k].desc;
  });
  ['practice','mg','aigc','agent'].forEach(k=>{
    const t = document.getElementById(`${k}-title`);
    const d = document.getElementById(`${k}-desc`);
    if(t) t.onblur=()=>{ DATA.sectionTitles[k].title = t.textContent; saveData(); };
    if(d) d.onblur=()=>{ DATA.sectionTitles[k].desc = d.textContent; saveData(); };
  });
}

function restoreContact(){
  const c = DATA.contact;
  const setEl = (id, val)=>{ const el=document.getElementById(id); if(el&&val) el.textContent=val; };
  setEl('contact-name', c.name);
  setEl('contact-bio', c.bio);
  // 同步 sidebar 关于我区块
  setEl('sidebar-name', c.name);
  setEl('sidebar-bio', c.bio);
  if(c.role) setEl('sidebar-role', c.role);
  setEl('contact-email', c.email);
  setEl('contact-qq', c.qq);
  setEl('contact-phone', c.phone);
  if(c.wechatQr){
    const img = document.getElementById('wechat-qr-img');
    const ph = document.getElementById('wechat-qr-placeholder');
    const hint = document.getElementById('wechat-qr-hint');
    if(img){ img.src=c.wechatQr; img.style.display='block'; }
    if(ph) ph.style.display='none';
    if(hint) hint.style.display='';
    const actions = document.getElementById('wechat-qr-actions');
    if(actions && editMode) actions.style.display='flex';
  }
  // Sync right column height with left column for justify-between distribution
  requestAnimationFrame(()=>{
    const leftCol = document.getElementById('contact-left-col');
    const rightCol = document.getElementById('contact-right-col');
    if(leftCol && rightCol){
      const h = leftCol.offsetHeight;
      if(h > 0) rightCol.style.minHeight = h + 'px';
    }
  });
  const biliEl = document.getElementById('contact-bilibili');
  const douyinEl = document.getElementById('contact-douyin');
  if(biliEl && c.bilibili && c.bilibili!=='{{BILIBILI_UID}}'){
    biliEl.href = c.bilibili;
    biliEl.textContent = c.bilibili;
  }
  if(douyinEl && c.douyin && c.douyin!=='{{DOUYIN_ID}}'){
    douyinEl.href = c.douyin;
    douyinEl.textContent = c.douyin;
  }
  // Social links: update header icons
  const headerDouyin = document.getElementById('header-douyin');
  const headerBilibili = document.getElementById('header-bilibili');
  if(headerDouyin && c.douyin && c.douyin!=='{{DOUYIN_ID}}' && c.douyin!==''){
    headerDouyin.href = c.douyin;
    headerDouyin.style.display = 'flex';
    const douyinLabel = document.getElementById('douyin-label');
    if(douyinLabel) douyinLabel.style.display = '';
  }
  if(headerBilibili && c.bilibili && c.bilibili!=='{{BILIBILI_UID}}' && c.bilibili!==''){
    headerBilibili.href = c.bilibili;
    headerBilibili.style.display = 'flex';
  }
  if(c.email && c.email!=='{{EMAIL}}'){
    const a=document.querySelector('a[href^="mailto"]');
    if(a){ a.href=`mailto:${c.email}`; a.textContent=c.email; }
  }
  ['contact-name','contact-bio','contact-email','contact-qq','contact-phone'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.onblur=()=>{
      const key=id.replace('contact-','');
      DATA.contact[key]=el.textContent.trim(); saveData();
      if(key==='name'){const s=document.getElementById('sidebar-name');if(s) s.textContent=el.textContent.trim();}
      if(key==='bio'){const s=document.getElementById('sidebar-bio');if(s) s.textContent=el.textContent.trim();}
    };
  });
  // sidebar 字段编辑同步保存到 DATA 并更新 contact 区块
  const sidebarName=document.getElementById('sidebar-name');
  const sidebarRole=document.getElementById('sidebar-role');
  const sidebarBio=document.getElementById('sidebar-bio');
  if(sidebarName) sidebarName.onblur=()=>{
    DATA.contact.name=sidebarName.textContent.trim();saveData();
    const cn=document.getElementById('contact-name');if(cn) cn.textContent=sidebarName.textContent.trim();
  };
  if(sidebarRole) sidebarRole.onblur=()=>{
    if(!DATA.contact)DATA.contact={};DATA.contact.role=sidebarRole.textContent.trim();saveData();
  };
  if(sidebarBio) sidebarBio.onblur=()=>{
    DATA.contact.bio=sidebarBio.textContent.trim();saveData();
    const cb=document.getElementById('contact-bio');if(cb) cb.textContent=sidebarBio.textContent.trim();
  };


  // ── Tool card fields ──
  const TOOL_FIELDS = ['tool1-title','tool1-desc','tool2-title','tool2-desc','tool3-title','tool3-desc'];
  if(!DATA.toolCards) DATA.toolCards = {};
  TOOL_FIELDS.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(DATA.toolCards[id]) el.textContent = DATA.toolCards[id];
    el.onblur=()=>{ DATA.toolCards[id]=el.textContent.trim(); saveData(); };
  });
  // restore resume
  if(!DATA.contact.resumeName) DATA.contact.resumeName='';
  if(!DATA.contact.resumeUrl) DATA.contact.resumeUrl='';
  updateResumeUI();
  [biliEl, douyinEl].forEach(el=>{
    if(!el) return;
    el.contentEditable = editMode;
    el.onblur=()=>{
      const url = el.textContent.trim();
      el.href = url || '#';
      if(el.id==='contact-bilibili') DATA.contact.bilibili = url;
      else DATA.contact.douyin = url;
      saveData();
    };
  });
}

function openQrZoom(src){
  if(!src) return;
  const img = document.getElementById('qrZoomImg');
  img.src = src;
  document.getElementById('qrZoom').classList.add('open');
}
function closeQrZoom(){ document.getElementById('qrZoom').classList.remove('open'); }

function openImgZoom(src){
  if(!src) return;
  const img = document.getElementById('imgZoomImg');
  img.src = src;
  document.getElementById('imgZoom').classList.add('open');
}
function closeImgZoom(){
  document.getElementById('imgZoom').classList.remove('open');
  document.getElementById('imgZoomImg').src = '';
}

function deleteQR(){
  DATA.contact.wechatQr = '';
  saveData();
  const img = document.getElementById('wechat-qr-img');
  const ph = document.getElementById('wechat-qr-placeholder');
  const hint = document.getElementById('wechat-qr-hint');
  const actions = document.getElementById('wechat-qr-actions');
  if(img){ img.src=''; img.style.display='none'; }
  if(ph) ph.style.display='flex';
  if(hint) hint.style.display='none';
  if(actions) actions.style.display='none';
}

/* ── Resume ── */
function triggerResumeUpload(){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.pdf,.doc,.docx';
  inp.addEventListener('change', async ()=>{
    const file = inp.files[0]; if(!file) return;
    const blobUrl = URL.createObjectURL(file);
    DATA.contact.resumeName = file.name;
    DATA.contact.resumeUrl = blobUrl;
    saveData();
    updateResumeUI();
    // try upload to GitHub
    const result = await uploadToGitHub(file);
    if(result){
      URL.revokeObjectURL(blobUrl);
      DATA.contact.resumeUrl = result.url;
      DATA.contact.resumeFileID = result.fileID;
      saveData();
      updateResumeUI();
    }
  });
  inp.click();
}

function deleteResume(){
  DATA.contact.resumeName = '';
  DATA.contact.resumeUrl = '';
  saveData();
  updateResumeUI();
}

async function downloadResume(e){
  e.preventDefault();
  const url = e.currentTarget.href;
  const fn = e.currentTarget.dataset.filename || '张峻烨简历';
  // Try to get the extension from the original filename
  const origName = DATA.contact.resumeName || '';
  const ext = origName.split('.').pop() || 'pdf';
  const fullFn = fn + '.' + ext;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fullFn;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch(err) {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

function updateResumeUI(){
  const name = DATA.contact.resumeName || '';
  const url = DATA.contact.resumeUrl || '';
  // contact section buttons
  const fnEl = document.getElementById('resume-filename');
  const dlEl = document.getElementById('resume-download');
  const delBtn = document.getElementById('resume-del-btn');
  if(fnEl) fnEl.textContent = name || '未上传';
  if(dlEl){
    if(url){ dlEl.href=url; dlEl.dataset.filename='张峻烨简历'; dlEl.style.display='flex'; dlEl.onclick=downloadResume; }
    else dlEl.style.display='none';
  }
  if(delBtn) delBtn.style.display = url ? '' : 'none';
  // nav bar button
  const navBtn = document.getElementById('nav-resume-btn');
  const navDel = document.getElementById('nav-resume-del');
  if(navBtn){
    if(url){ navBtn.href=url; navBtn.dataset.filename='张峻烨简历'; navBtn.style.display='flex'; navBtn.onclick=downloadResume; }
    else navBtn.style.display='none';
  }
  if(navDel) navDel.style.display = url ? '' : 'none';
  const resumeLabel = document.getElementById('resume-label');
  if(resumeLabel) resumeLabel.style.display = url ? '' : 'none';
}

/* ════════════════════════════════════════════
   TAGS SYSTEM (editable pills)
════════════════════════════════════════════ */
const DEFAULT_TAGS = ['After Effects','Seedream','MG 动效','骨骼动画','AIGC 工作流','Agent 基建'];

function renderTags(containerId, tagsKey){
  if(!DATA.tags) DATA.tags = {};
  if(!DATA.tags[tagsKey]) DATA.tags[tagsKey] = [...DEFAULT_TAGS];
  const wrap = document.getElementById(containerId);
  if(!wrap) return;
  wrap.innerHTML='';
  DATA.tags[tagsKey].forEach((text,i)=>{
    const sp = document.createElement('span');
    sp.className='tag-pill';
    sp.style.position='relative';
    const tEl = document.createElement('span');
    tEl.textContent = text;
    tEl.contentEditable = editMode ? 'true' : 'false';
    tEl.addEventListener('blur',()=>{ DATA.tags[tagsKey][i]=tEl.textContent.trim(); saveData(); });
    sp.appendChild(tEl);
    if(editMode){
      const delBtn = document.createElement('button');
      delBtn.innerHTML='✕';
      delBtn.style.cssText='position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:rgba(200,70,60,.9);border:none;color:#fff;font-size:8px;line-height:14px;text-align:center;cursor:pointer;padding:0;z-index:2';
      delBtn.onclick=()=>{ DATA.tags[tagsKey].splice(i,1); saveData(); renderTags(containerId,tagsKey); };
      sp.appendChild(delBtn);
    }
    wrap.appendChild(sp);
  });
  if(editMode){
    const addBtn = document.createElement('button');
    addBtn.className='tag-pill';
    addBtn.style.cssText='opacity:.5;cursor:pointer;border-style:dashed;background:none';
    addBtn.textContent='+ 添加';
    addBtn.onclick=()=>{ DATA.tags[tagsKey].push('新标签'); saveData(); renderTags(containerId,tagsKey); };
    wrap.appendChild(addBtn);
  }
}

function rerenderAllTags(){
  renderTags('hero-tags','hero');
  renderTags('contact-tags','contact');
}

function restoreHeroNav(){
  if(!DATA.heroNav) DATA.heroNav = {};
  const fields = {
    'hero-sub': '效果创意设计 · 短视频特效素材 · AIGC 全链路工作流 · AI 智能体工具基建',
    'header-name': '张峻烨',
    'header-role': '效果创意设计 · AIGC',
    'nav-practice': '业务作品',
    'nav-mg': 'MG',
    'nav-aigc': 'AIGC',
    'nav-agent': '工具集',
    'nav-contact': '联系',
    'aigc-img-label': 'AI 生成原画素材',
    'aigc-vid-label': 'AE 木偶骨骼绑定动效',
    'aigc-prompt-label': 'Prompt 工程',
    'practice-vid-label': '特效 / 转场 / 模板'
  };
  Object.entries(fields).forEach(([id, def])=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(DATA.heroNav[id]) el.textContent = DATA.heroNav[id];
    el.onblur=()=>{ DATA.heroNav[id]=el.textContent.trim(); saveData(); };
  });
  // hero hint editable
  const hintEl = document.querySelector('[data-field="heroHint"]');
  if(hintEl){
    if(!DATA.heroNav) DATA.heroNav={};
    if(DATA.heroNav['heroHint']) hintEl.textContent = DATA.heroNav['heroHint'];
    hintEl.onblur=()=>{ DATA.heroNav['heroHint']=hintEl.textContent.trim(); saveData(); };
  }
}

function addWorkCard(section, forceType){
  const item = { id: uid(), type: forceType, title:'', desc:'', media:'', cover:'', ar:0 };
  DATA[section].push(item);
  saveData();
  if(section==='practice'||section==='practice2') renderGallerySection(section);
  else renderSection(section, section+'-grid', forceType);
  setTimeout(()=>triggerMediaUpload(item.id, forceType), 100);
}

function addPromptCard(){
  const item = { id: uid(), type:'prompt', title:'Prompt 标题', body:'' };
  DATA['aigc-prompt'].push(item);
  saveData();
  renderSection('aigc-prompt','aigc-prompt-grid',null,'prompt');
}

async function deleteCard(id){
  // Find the item first to get its fileIDs for cloud storage cleanup
  let sec = '';
  let fileIDs = [];
  ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent'].forEach(s=>{
    const idx = DATA[s].findIndex(x=>x.id===id);
    if(idx>-1){
      sec = s;
      const item = DATA[s][idx];
      if(item.fileID) fileIDs.push(item.fileID);
      if(item.coverFileID && item.coverFileID !== item.fileID) fileIDs.push(item.coverFileID);
    }
  });
  if(sec){
    const idx = DATA[sec].findIndex(x=>x.id===id);
    DATA[sec].splice(idx,1);
    saveData();
    if(sec==='practice'||sec==='practice2') renderGallerySection(sec);
    else renderSection(sec, sec+'-grid');
    // Delete files from cloud storage using fileID
    if(tcbApp && fileIDs.length){
      tcbApp.deleteFile({ fileList: fileIDs }).then(()=>{
        console.log('✓ 云存储文件已删除:', fileIDs);
      }).catch(e=>{
        console.warn('云存储文件删除失败:', e);
      });
    }
  }
}

let _uploadTarget = null;
let _uploadType = null;
const fileInput = document.createElement('input');
fileInput.type='file';

function triggerMediaUpload(itemId, type){
  _uploadTarget = itemId;
  _uploadType = type;
  // Prompt cards also accept video + images
  if(type==='prompt') fileInput.accept='video/mp4,video/webm,video/*,image/webp,image/gif,image/jpeg,image/png';
  else if(type==='img') fileInput.accept='image/jpeg,image/png,image/webp,image/gif';
  else fileInput.accept='video/mp4,video/webm,video/*,image/webp,image/gif,image/jpeg,image/png';
  fileInput.value='';
  fileInput.click();
}

fileInput.addEventListener('change', async ()=>{
  const file = fileInput.files[0];
  if(!file || !_uploadTarget) return;
  const item = findItem(_uploadTarget);
  if(!item) return;
  const isVideo = file.type.startsWith('video/');
  const isWebpGif = file.type==='image/webp' || file.type==='image/gif';
  const isImg = file.type.startsWith('image/') && !isWebpGif;
  const isPrompt = item.type==='prompt';
  // For prompt cards, keep type='prompt' but set mediaType sub-field
  if(!isPrompt){
    if(isVideo) item.type='mp4';
    else if(isWebpGif) item.type='webp';
    else if(isImg) item.type='img';
  }
  if(isVideo) item.mediaType='mp4';
  else if(isWebpGif) item.mediaType='webp';
  else if(isImg) item.mediaType='img';
  
  // 压缩图片（webp/gif 不压缩）
  let uploadFile = file;
  if(isImg) uploadFile = await compressImage(file);
  
  const blobUrl = URL.createObjectURL(uploadFile);
  item.media = blobUrl;
  if(isVideo){
    const cover = await extractFirstFrame(file);
    item.cover = cover;
    item.ar = await getVideoAR(file);
  } else if(isWebpGif || isImg){
    item.ar = await getImageAR(blobUrl);
  }
  saveData();
  rerenderItemSection(_uploadTarget);
  
  // 上传媒体文件到云存储
  const result = await uploadToGitHub(uploadFile);
  if(result){
    URL.revokeObjectURL(blobUrl);
    item.media = result.url;
    item.fileID = result.fileID;
    // 视频封面也上传到云存储
    if(isVideo && item.cover && item.cover.startsWith('data:')){
      try{
        const coverBlob = await fetch(item.cover).then(r=>r.blob());
        const coverFile = new File([coverBlob], 'cover.jpg', {type:'image/jpeg'});
        const coverResult = await uploadToCloudStorage(coverFile);
        if(coverResult){
          item.cover = coverResult.url;
          item.coverFileID = coverResult.fileID;
        }
      }catch(e){ console.warn('封面上传失败:', e); }
    }
    saveData();
    rerenderItemSection(_uploadTarget);
    // 上传完成后立刻发布到云端（取消防抖，确保云端拿到真实URL而不是blob）
    clearTimeout(_publishTimer);
    if(db) publishDataToCloud();
  }
});

function findItem(id){
  for(const sec of ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent']){
    const it = DATA[sec].find(x=>x.id===id);
    if(it) return it;
  }
  return null;
}

function findSection(id){
  for(const sec of ['practice','practice2','mg','aigc-img','aigc-vid','aigc-prompt','agent']){
    if(DATA[sec].find(x=>x.id===id)) return sec;
  }
  return null;
}

function rerenderItemSection(id){
  const sec = findSection(id);
  if(!sec) return;
  if(sec==='practice'||sec==='practice2') renderGallerySection(sec);
  else renderSection(sec, sec+'-grid');
}

// Extract first frame of animated webp/gif from a URL via canvas
function extractAnimFirstFrame(src){
  return new Promise(resolve=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>{
      try{
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch(e){
        // CORS or other error: fall back to using src directly
        resolve(null);
      }
    };
    img.onerror = ()=>resolve(null);
    img.src = src;
  });
}

function extractFirstFrame(file){
  return new Promise(resolve=>{
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
    video.addEventListener('loadeddata',()=>{ video.currentTime = 0.01; });
    video.addEventListener('seeked',()=>{
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video,0,0);
      resolve(canvas.toDataURL('image/jpeg',.82));
      URL.revokeObjectURL(url);
    });
    video.addEventListener('error',()=>resolve(''));
  });
}

function getVideoAR(file){
  return new Promise(resolve=>{
    const url=URL.createObjectURL(file);
    const v=document.createElement('video');
    v.preload='metadata';
    v.src=url;
    v.addEventListener('loadedmetadata',()=>{ resolve(v.videoWidth/v.videoHeight||1.78); URL.revokeObjectURL(url); });
    v.addEventListener('error',()=>{ resolve(1.78); URL.revokeObjectURL(url); });
  });
}

function getImageAR(url){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve(img.naturalWidth/img.naturalHeight||1);
    img.onerror=()=>resolve(1);
    img.src=url;
  });
}

function openInlinePlayer(src, cardEl){
  const player=document.getElementById('inlinePlayer');
  const video=document.getElementById('inlineVideo');
  video.src=src;
  const vw=window.innerWidth;
  const vh=window.innerHeight;
  const w=Math.min(Math.round(vw*.82),1200);
  const loadHandler=()=>{
    const ar=video.videoWidth/video.videoHeight;
    let h=Math.round(w/ar);
    if(h>vh*.82) h=Math.round(vh*.82);
    player.style.width=w+'px';
    player.style.height=h+'px';
    player.style.left='50%';
    player.style.top='50%';
    player.style.transform=`translate(-50%,-50%)`;
    video.removeEventListener('loadedmetadata',loadHandler);
  };
  video.addEventListener('loadedmetadata',loadHandler);
  player.classList.add('open');
  document.getElementById('playerBackdrop').classList.add('open');
  video.play().catch(()=>{});
}

function closeInlinePlayer(){
  const player=document.getElementById('inlinePlayer');
  const video=document.getElementById('inlineVideo');
  video.pause();
  video.src='';
  player.classList.remove('open');
  document.getElementById('playerBackdrop').classList.remove('open');
}

document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeInlinePlayer(); closeImgZoom(); closeQrZoom(); } });

function triggerQRUpload(){
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/*'; inp.value='';
  inp.addEventListener('change',async()=>{
    const file=inp.files[0]; if(!file) return;
    const blobUrl=URL.createObjectURL(file);
    const img=document.getElementById('wechat-qr-img');
    const ph=document.getElementById('wechat-qr-placeholder');
    const hint=document.getElementById('wechat-qr-hint');
    if(img){ img.src=blobUrl; img.style.display='block'; }
    if(ph) ph.style.display='none';
    if(hint) hint.style.display='';
    const actions=document.getElementById('wechat-qr-actions');
    if(actions) actions.style.display='flex';
    DATA.contact.wechatQr=blobUrl;
    saveData();
    const result=await uploadToGitHub(file);
    if(result){
      URL.revokeObjectURL(blobUrl);
      if(img) img.src=result.url;
      DATA.contact.wechatQr=result.url;
      DATA.contact.wechatQrFileID=result.fileID;
      saveData();
    }
  });
  inp.click();
}

// 2024年后新建的 COS 桶默认域名无法在浏览器预览，改用 CloudBase CDN 域名
const CLOUD_CDN = 'https://6d79-my-web-d5gsldm9ha36297d1-1424382234.tcb.qcloud.la';

// 修复旧数据中无法访问的 URL
function fixCloudUrl(url) {
  if (!url) return url;
  // 修复旧格式的 CDN URL（缺少 6d79 前缀）
  if (url.includes('tcb.qcloud.la') && !url.includes('6d79-')) {
    return url.replace('https://', 'https://6d79-');
  }
  // 修复缺少 -1424382234 后缀的旧域名（如 6d79-my-web-d5gsldm9ha36297d1.tcb.qcloud.la）
  if (url.includes('6d79-my-web-d5gsldm9ha36297d1.tcb.qcloud.la') && !url.includes('-1424382234')) {
    const cloudPath = url.split('/portfolio/').pop();
    if (cloudPath) return `${CLOUD_CDN}/portfolio/${cloudPath}`;
  }
  // 修复 COS 默认域名（无法在浏览器预览）
  if (url.includes('cos-website') || url.includes('myqcloud.com')) {
    const cloudPath = url.split('/portfolio/').pop();
    if (cloudPath) return `${CLOUD_CDN}/portfolio/${cloudPath}`;
  }
  return url;
}

async function uploadToCloudStorage(file) {
  if (!tcbApp) {
    console.error('云开发未初始化');
    return null;
  }
  
  try {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const cloudPath = `portfolio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    
    const result = await tcbApp.uploadFile({
      cloudPath,
      filePath: file
    });
    
    if (result.fileID) {
      const url = `${CLOUD_CDN}/${cloudPath}`;
      console.log('✓ 文件上传成功:', url);
      // 返回对象包含 url 和 fileID，方便后续删除云存储文件
      return { url, fileID: result.fileID };
    }
    return null;
  } catch (e) {
    console.error('上传失败:', e);
    return null;
  }
}

// 兼容旧代码的别名
async function uploadToGitHub(file) {
  return uploadToCloudStorage(file);
}

/* ════════════════════════════════════════════
   DRAG & DROP SORT (edit mode only)
════════════════════════════════════════════ */
let _dragSrcId = null;
let _dragSrcSection = null;

function initDragSort(container, sectionKey) {
  const cards = container.querySelectorAll('.vcard');
  cards.forEach(card => {
    card.setAttribute('draggable', 'true');
    card.style.position = 'relative'; // needed for ::after pseudo

    card.addEventListener('dragstart', e => {
      _dragSrcId = card.dataset.id;
      _dragSrcSection = sectionKey;
      // slight delay so the ghost image renders before opacity change
      setTimeout(() => card.classList.add('drag-src'), 0);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.id);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('drag-src');
      _clearDragIndicators(container);
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!_dragSrcId || card.dataset.id === _dragSrcId) return;
      _clearDragIndicators(container);
      const rect = card.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      if (e.clientX < midX) {
        card.classList.add('drag-insert-before');
      } else {
        card.classList.add('drag-insert-after');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-insert-before', 'drag-insert-after');
    });

    card.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      if (!_dragSrcId || card.dataset.id === _dragSrcId) return;
      if (_dragSrcSection !== sectionKey) return; // no cross-section drag

      const arr = DATA[sectionKey];
      const fromIdx = arr.findIndex(x => x.id === _dragSrcId);
      let toIdx = arr.findIndex(x => x.id === card.dataset.id);
      if (fromIdx < 0 || toIdx < 0) return;

      // determine insert position (before or after target)
      const rect = card.getBoundingClientRect();
      const insertAfter = e.clientX >= rect.left + rect.width / 2;
      if (insertAfter) toIdx = toIdx + (fromIdx < toIdx ? 0 : 1);
      else toIdx = toIdx + (fromIdx > toIdx ? 0 : -1);
      toIdx = Math.max(0, Math.min(arr.length - 1, toIdx));

      // splice
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);

      saveData();
      renderSection(sectionKey, sectionKey + '-grid');
    });
  });

  // also make the container itself a drop zone for dropping after last card
  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });
}

function _clearDragIndicators(container) {
  container.querySelectorAll('.drag-insert-before,.drag-insert-after').forEach(el => {
    el.classList.remove('drag-insert-before', 'drag-insert-after');
  });
}

function enableDragSort() {
  const GRIDS = [
    ['practice-grid', 'practice'],
    ['mg-grid', 'mg'],
    ['aigc-img-grid', 'aigc-img'],
    ['aigc-vid-grid', 'aigc-vid'],
    ['aigc-prompt-grid', 'aigc-prompt'],
    ['agent-grid', 'agent'],
  ];
  GRIDS.forEach(([gridId, key]) => {
    const el = document.getElementById(gridId);
    if (el) initDragSort(el, key);
  });
}

function disableDragSort() {
  document.querySelectorAll('.vcard[draggable="true"]').forEach(card => {
    card.setAttribute('draggable', 'false');
  });
}

/* ── Sidebar navigation ── */
function sidebarNavClick(e, sectionKey) {
  // close mobile nav if open
  const nav = document.getElementById('navLinks');
  if(nav) nav.classList.remove('mobile-open');
  // 9. close mobile sidebar after clicking nav
  const sidebar = document.getElementById('sidebar');
  if(sidebar && window.innerWidth <= 900) sidebar.style.display = 'none';
  // highlight active item
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`.sidebar-item[data-section="${sectionKey}"]`);
  if(item) item.classList.add('active');
}

function updateSidebarActive() {
  const sections = ['about','practice','mg','aigc','agent','contact'];
  const scrollY = window.scrollY + 120;
  let active = 'about';
  sections.forEach(sec => {
    const elId = sec === 'about' ? 'hero-section' : (document.getElementById('mod-' + sec) ? 'mod-' + sec : sec);
    const el = document.getElementById(elId);
    if(el && el.offsetTop <= scrollY) active = sec;
  });
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`.sidebar-item[data-section="${active}"]`);
  if(item) item.classList.add('active');
}

// Scroll listener for sidebar active state
window.addEventListener('scroll', updateSidebarActive);

// 2. Scroll reveal - IntersectionObserver
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


// Desktop: hide mobile nav links, show sidebar
function applyLayoutByScreen() {
  const isMobile = window.innerWidth <= 900;
  const sidebar = document.getElementById('sidebar');
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburgerBtn');
  const mobileThemeBtn = document.getElementById('themeBtnMobile');

  if (isMobile) {
    if(sidebar) sidebar.style.display = 'none';
    if(navLinks) navLinks.style.display = 'none'; // hidden by default, toggled by hamburger
    if(hamburger) hamburger.style.display = 'flex';
    // Remove content-offset on mobile
    document.querySelectorAll('.content-offset').forEach(el => el.style.marginLeft = '0');
    document.querySelector('header') && (document.querySelector('header').style.marginLeft = '0');
  } else {
    if(sidebar) sidebar.style.display = 'flex';
    if(navLinks) navLinks.style.display = 'none'; // desktop: navLinks hidden, sidebar handles navigation
    if(hamburger) hamburger.style.display = 'none';
    // Apply content-offset on desktop
    document.querySelectorAll('.content-offset').forEach(el => el.style.marginLeft = '240px');
    document.querySelector('header') && (document.querySelector('header').style.marginLeft = '240px');
  }
}

// Run on load and resize
applyLayoutByScreen();
window.addEventListener('resize', applyLayoutByScreen);

async function init(){
  // 初始化云开发
  const cloudReady = await initCloudBase();
  
  // 先从本地加载数据
  loadData();
  renderAll();
  
  if (cloudReady) {
    // 优先从云端拉取最新数据，防止新设备的空数据覆盖云端
    const cloudResult = await loadCloudDataVersion();
    const cloudVersion = cloudResult || 0;
    
    if (cloudVersion > 0) {
      // 云端有数据 → 拉取云端覆盖本地（无论本地是否有数据）
      await loadDataFromCloud(true);
    } else {
      // 云端没有数据（首次部署），只有编辑者设备才推送
      const isEditor = !!localStorage.getItem('portfolio_v2_editor_token');
      const localVersion = DATA._version || 0;
      if (localVersion > 0 && isEditor) {
        publishDataToCloud();
      }
    }
  }
}

init();


// ── 画廊引擎（支持多条画廊）──
const _galInst = {}; // per-key: {raf,pos,boost,wheeling,base}
const GALLERY_ROW_H = 280;
const GALLERY_ROW_H_MAP = { 'practice2': 200 }; // per-key overrides

function renderGallerySection(key){
  const rowH = GALLERY_ROW_H_MAP[key] || GALLERY_ROW_H;
  const track=document.getElementById(key+'-gallery-track');
  if(!track) return;
  track.innerHTML='';
  const items=(DATA[key]||[]).filter(i=>i.media||i.type==='prompt');
  items.forEach(item=>{
    const card=makeGalleryCard(item, rowH, key);
    track.appendChild(card);
  });
  if(editMode){
    const empty=makeGalleryCard({media:'',title:'',desc:'',type:'auto'}, rowH, key);
    track.appendChild(empty);
  }
  initGalleryLoop(key, track, items);
}

// backwards compat alias
function renderPracticeGallery(items){ renderGallerySection('practice'); }

function makeGalleryCard(item, rowH, galKey){
  rowH = rowH || GALLERY_ROW_H;
  galKey = galKey || 'practice';
  const ar = item.ar || (9/16);
  const cardW = Math.round(rowH * ar);
  const card=document.createElement('div');
  card.className='gallery-card'+(editMode?' card-hover':'');
  card.dataset.id=item.id||'';
  card.style.width = cardW + 'px';
  const mediaDiv=document.createElement('div');
  mediaDiv.className='gc-media'+(!item.media?' empty-card':'');
  mediaDiv.style.height = rowH + 'px';
  mediaDiv.style.width = '100%';
  if(item.media){
    const isVideo=item.type==='mp4'||item.type==='video'||item.mediaType==='mp4';
    const isAnim=item.type==='webp'||item.type==='gif'||item.type==='anim'||item.mediaType==='webp'||item.mediaType==='gif';
    if(isVideo){
      // 视频：只显示封面，点击播放
      mediaDiv.innerHTML=`<img src="${item.cover||''}" alt="${item.title||''}" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><svg width="40" height="40" viewBox="0 0 24 24" fill="white" style="opacity:.85"><polygon points="5,3 19,12 5,21"/></svg></div>`;
    } else if(isAnim){
      // 动图：自动播放
      mediaDiv.innerHTML=`<img src="${item.media}" alt="${item.title||''}" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      mediaDiv.innerHTML=`<img src="${item.media}" alt="${item.title||''}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
    }
    mediaDiv.style.cursor='pointer';
    mediaDiv.onclick=function(){
      if(editMode) return;
      if(isVideo) openInlinePlayer(item.media);
      else openImgZoom(item.media);
    };
  }
  if(editMode){
    const ov=document.createElement('div');
    ov.className='upload-ov';
    const upBtn=document.createElement('button');
    upBtn.className='upload-ov-btn';
    if(item.id){
      upBtn.textContent='上传';
      upBtn.onclick=()=>triggerMediaUpload(item.id, item.type||'auto');
    } else {
      upBtn.textContent='上传';
      upBtn.onclick=()=>addWorkCard(galKey,'auto');
    }
    const delBtn=document.createElement('button');
    delBtn.className='del-ov-btn';
    if(item.id){
      delBtn.textContent='删除';
      delBtn.onclick=()=>deleteCard(item.id);
    } else {
      delBtn.style.display='none';
    }
    ov.appendChild(upBtn);
    ov.appendChild(delBtn);
    mediaDiv.appendChild(ov);
  }
  card.appendChild(mediaDiv);
  const titleDiv=document.createElement('div');
  titleDiv.className='gc-title';
  titleDiv.style.backfaceVisibility='hidden'; // force GPU layer to prevent text repaint flicker
  titleDiv.textContent=item.title||'作品标题';
  if(editMode){ titleDiv.contentEditable='true'; titleDiv.onblur=()=>{item.title=titleDiv.textContent.trim();saveData();}; }
  card.appendChild(titleDiv);
  const descDiv=document.createElement('div');
  descDiv.className='gc-sub';
  descDiv.textContent=item.desc||'';
  if(editMode){ descDiv.contentEditable='true'; descDiv.onblur=()=>{item.desc=descDiv.textContent.trim();saveData();}; }
  if(item.desc||editMode) card.appendChild(descDiv);
  return card;
}

function initGalleryLoop(key, track, realItems){
  if(_galInst[key]?.raf) cancelAnimationFrame(_galInst[key].raf);
  _galInst[key] = {raf:null,pos:0,boost:0,base:0.8,wheeling:false};
  const inst=_galInst[key];
  const rowH = GALLERY_ROW_H_MAP[key] || GALLERY_ROW_H;
  track.innerHTML='';
  inst.boost=0; inst.wheeling=false;
  const realCount = realItems.length;
  if(editMode){
    const empty=makeGalleryCard({media:'',title:'',desc:'',type:'auto'}, rowH, key);
    track.appendChild(empty);
  }

  const MIN_LOOP=3;
  if(realCount<MIN_LOOP){
    realItems.forEach(item=>track.appendChild(makeGalleryCard(item, rowH, key)));
    track.style.transform='translateX(0)';
    track.style.willChange='auto';
    updateGalleryCounter(key,1,realCount);
    const bar=document.getElementById(key+'-gallery-progress-bar');
    if(bar) bar.style.width=(realCount>0?'100':'0')+'%';
    const hint=document.getElementById(key+'-gallery-hint');
    if(hint) hint.classList.add('hide');
    return;
  }

  realItems.forEach(item=>track.appendChild(makeGalleryCard(item, rowH, key)));

  const GAP=10;
  const totalW=realItems.reduce((sum,item)=>{
    const ar=item.ar||(9/16);
    return sum+Math.round(rowH*ar)+GAP;
  },0);
  // 所有卡片放完后，在前后各复制一组实现无限滚动
  const allCards = Array.from(track.children);
  allCards.slice().reverse().forEach(c=>track.insertBefore(c.cloneNode(true),track.firstChild));
  allCards.forEach(c=>track.appendChild(c.cloneNode(true)));

  inst.pos=-totalW;
  track.style.willChange='transform';

  const galleryOuter=document.getElementById(key+'-gallery-outer');
  const onWheel=(e)=>{
    if(!galleryOuter||!galleryOuter.contains(e.target)) return;
    inst.wheeling=true;
    const delta=e.deltaY!==0?e.deltaY:e.deltaX;
    inst.boost=Math.max(-22,Math.min(22,inst.boost+delta*0.07));
    e.preventDefault();
  };
  galleryOuter?.addEventListener('wheel',onWheel,{passive:false});
  galleryOuter?.addEventListener('mouseleave',()=>{inst.wheeling=false;});

  const hint=document.getElementById(key+'-gallery-hint');
  if(hint){
    hint.classList.remove('hide');
    clearTimeout(hint._hideTimer);
    hint._hideTimer=setTimeout(()=>hint.classList.add('hide'),4000);
  }

  let lastT=null, lastUI=0;
  const loop=(t)=>{
    if(!lastT) lastT=t;
    const dt=Math.min((t-lastT)/(1000/60),3);
    lastT=t;
    const speed=editMode ? 0 : (inst.wheeling ? inst.boost : (inst.base + Math.abs(inst.boost)));
    inst.pos-=speed*dt;
    inst.boost*=0.88;
    if(Math.abs(inst.boost)<0.05) inst.boost=0;
    if(!inst.wheeling&&Math.abs(inst.boost)<0.05) inst.wheeling=false;
    if(inst.pos<=-(2*totalW)) inst.pos+=totalW;
    if(inst.pos>=0) inst.pos-=totalW;
    track.style.transform=`translate3d(${inst.pos}px,0,0)`;
    if(t-lastUI>200){
      lastUI=t;
      const progress=Math.abs((inst.pos+totalW)%totalW)/totalW;
      const bar=document.getElementById(key+'-gallery-progress-bar');
      if(bar) bar.style.width=(progress*100)+'%';
      const nth=(Math.floor(progress*realCount)%realCount)+1;
      updateGalleryCounter(key,nth,realCount);
    }
    inst.raf=requestAnimationFrame(loop);
  };
  inst.raf=requestAnimationFrame(loop);
}

function updateGalleryCounter(key,nth,total){
  const el=document.getElementById(key+'-gallery-counter');
  if(el) el.textContent=`${String(nth).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
}

// ── 性能优化：画廊离屏时暂停RAF ──
(function(){
  const galObs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      const id=e.target.id;
      const key=id.replace('-gallery-outer','');
      if(!_galInst[key]) return;
      const inst=_galInst[key];
      if(!e.isIntersecting){
        // 离屏：暂停RAF
        if(inst.raf){cancelAnimationFrame(inst.raf);inst.raf=null;inst._paused=true;}
      } else if(inst._paused){
        // 回屏：恢复RAF循环
        inst._paused=false;
        const track=document.getElementById(key+'-gallery-track');
        if(!track) return;
        const items=(DATA[key]||[]).filter(i=>i.media||i.type==='prompt');
        initGalleryLoop(key,track,items);
      }
    });
  },{rootMargin:'-50px'});
  document.querySelectorAll('[id$="-gallery-outer"]').forEach(el=>galObs.observe(el));
})();

// ── contenteditable 粘贴只保留纯文本 ──
document.addEventListener('paste', e => {
  if(e.target.isContentEditable){
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }
});

// ── 顶部滚动进度条 ──
(function(){
  const bar = document.getElementById('scroll-progress');
  if(!bar) return;
  function update(){
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? Math.min(scrollTop / docH * 100, 100) : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', update, {passive: true});
  update();
})();

