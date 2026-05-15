/* ═══════════════════════════════════════════
   gallery.js — CH2 横向滚动画廊

   用 GSAP ScrollTrigger 实现"纵向滚动→横向平移"：
   - 整个 gallery section 被 pin 住
   - 用户继续向下滚动 → 内部横向轨道水平滑动
   - 每张卡片按序进入，尾部解 pin 后恢复纵向滚动

   额外交互层（velocity.js 控制）：
   - 滚动速度快 → 卡片轻微倾斜（perspectiveTilt）
   - 作品卡片 hover → 光标变形为 PLAY 圆点
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 画廊配置 ─── */
  const GALLERY_CONFIG = {
    cardWidth: 420,      // 卡片宽度 px
    cardGap: 48,         // 卡片间距 px
    edgePadding: 120,    // 首尾留白 px
    scrubRatio: 2,       // scrub 比例（越大越慢，越有空间感）
  };

  /* ═══════════════════════════════════════════
     主初始化：读取作品数据 → 渲染卡片 → 设置 ScrollTrigger
     ═══════════════════════════════════════════ */
  function init() {
    const section = document.getElementById('ch-2');
    if (!section) return;

    // 编辑器已有数据则直接用，否则 fetch
    if (window.__editorWorks && window.__editorWorks.length) {
      rebuild(section, window.__editorWorks);
      return;
    }

    fetch('data/works.json')
      .then(r => r.json())
      .then(works => { rebuild(section, works); })
      .catch(() => { rebuild(section, getFallbackWorks()); });
  }

  /* 销毁旧 ScrollTrigger → 重新渲染 → 重建 ScrollTrigger */
  function rebuild(section, works) {
    // 销毁旧的 ScrollTrigger 实例，避免重叠
    if (typeof ScrollTrigger !== 'undefined' && window.__galleryTL) {
      window.__galleryTL.scrollTrigger && window.__galleryTL.scrollTrigger.kill();
      window.__galleryTL.kill();
      window.__galleryTL = null;
    }
    renderGallery(section, works);
    setupScrollTrigger(section);
    setupHoverStates(section);
  }

  /* ═══════════════════════════════════════════
     渲染画廊 DOM
     ═══════════════════════════════════════════ */
  function renderGallery(section, works) {
    /* 计算横向轨道总宽度 */
    const totalWidth =
      GALLERY_CONFIG.edgePadding * 2 +
      works.length * (GALLERY_CONFIG.cardWidth + GALLERY_CONFIG.cardGap) -
      GALLERY_CONFIG.cardGap;

    section.innerHTML = `
      <!-- 章节标题（pin 时固定在左上角） -->
      <div class="gallery__header">
        <div class="gallery__chapter-tag h-micro">CH 02</div>
        <h2 class="gallery__title h-h2 font-cn">作品画廊</h2>
        <p class="gallery__subtitle h-caption font-cn">
          ${works.length} 件作品 · 横向浏览
        </p>
      </div>

      <!-- 横向轨道容器 -->
      <div class="gallery__track-wrapper">
        <div class="gallery__track" style="width: ${totalWidth}px;">
          ${works.map((work, i) => renderCard(work, i)).join('')}
        </div>
      </div>

      <!-- 右下角进度指示器 -->
      <div class="gallery__progress" aria-hidden="true">
        <div class="gallery__progress-bar">
          <div class="gallery__progress-fill"></div>
        </div>
        <span class="gallery__progress-label h-micro">
          <span class="gallery__progress-current">01</span>
          <span> / </span>
          <span class="gallery__progress-total">${String(works.length).padStart(2, '0')}</span>
        </span>
      </div>
    `;
  }

  /* 单张卡片 HTML */
  function renderCard(work, index) {
    const num = String(index + 1).padStart(2, '0');
    const tools = (work.tools || []).map(t =>
      `<span class="gallery-card__tag">${t}</span>`
    ).join('');

    return `
      <article class="gallery-card" data-hover-work data-index="${index}">
        <!-- 缩略图区域 -->
        <div class="gallery-card__media">
          <img
            src="${work.thumbnail || `https://picsum.photos/seed/work-${num}/420/560`}"
            alt="${work.titleCN || work.title}"
            class="gallery-card__img"
            loading="lazy"
          >
          <!-- Hover PLAY 圆点（由 motif.js 控制，此处仅 overlay） -->
          <div class="gallery-card__overlay" aria-hidden="true"></div>
        </div>

        <!-- 卡片信息区 -->
        <div class="gallery-card__info">
          <div class="gallery-card__meta">
            <span class="gallery-card__num h-micro">● ${num}</span>
            <span class="gallery-card__year h-micro">${work.year || ''}</span>
          </div>
          <h3 class="gallery-card__title h-h3 font-cn">
            ${work.titleCN || work.title}
          </h3>
          <div class="gallery-card__tags">${tools}</div>
        </div>
      </article>
    `;
  }

  /* ═══════════════════════════════════════════
     ScrollTrigger 设置
     ─────────────────────────────────────────
     原理：
     1. pin 住 section（纵向滚动时 section 固定在视口）
     2. 用 scrub 将纵向滚动量转换为 track 的 x 偏移
     3. 滚动量 = trackWidth - viewportWidth（全部卡片都移出左侧）

     移动端（<768px）：跳过 pin，改为纵向滚动 + IntersectionObserver 淡入
     ═══════════════════════════════════════════ */
  function setupScrollTrigger(section) {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[gallery] GSAP / ScrollTrigger 未加载，跳过横向滚动');
      return;
    }

    // ─── 移动端：跳过横向 ScrollTrigger ───
    const isMobile = window.innerWidth <= 767;
    if (isMobile) {
      const cards = section.querySelectorAll('.gallery-card');
      cards.forEach((card) => {
        gsap.set(card, { opacity: 0, y: 24 });
        const io = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              gsap.to(entry.target, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12 });
        io.observe(card);
      });
      console.log('[gallery] 移动端模式：纵向布局，跳过横向 ScrollTrigger');
      return;
    }

    const track = section.querySelector('.gallery__track');
    const progressFill = section.querySelector('.gallery__progress-fill');
    const progressCurrent = section.querySelector('.gallery__progress-current');
    const cards = section.querySelectorAll('.gallery-card');

    if (!track) return;

    // 横向移动距离 = 总轨道宽度 - 视口宽度
    const getScrollDistance = () => track.scrollWidth - window.innerWidth;

    /* 主横向滚动动画 */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        pin: true,
        scrub: GALLERY_CONFIG.scrubRatio,
        start: 'top top',
        end: () => '+=' + getScrollDistance() * GALLERY_CONFIG.scrubRatio,
        invalidateOnRefresh: true,   // 窗口缩放时重新计算
        onUpdate: (self) => {
          // 更新进度条
          if (progressFill) {
            progressFill.style.width = (self.progress * 100) + '%';
          }
          // 更新当前卡片编号
          if (progressCurrent && cards.length) {
            const idx = Math.min(
              Math.floor(self.progress * cards.length),
              cards.length - 1
            );
            progressCurrent.textContent = String(idx + 1).padStart(2, '0');
          }
        },
      },
    });

    // 横向轨道平移
    tl.to(track, {
      x: () => -getScrollDistance(),
      ease: 'none',   // linear — scrub 自带缓动
    });

    /* 卡片入场动画（随横向移入触发） */
    cards.forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            containerAnimation: tl,    // 关联横向容器动画
            start: 'left 85%',
            end: 'left 40%',
            scrub: 1,
          },
        }
      );
    });

    // 存储供 velocity.js 引用
    window.__galleryTL = tl;
    window.__gallerySection = section;
  }

  /* ═══════════════════════════════════════════
     Hover 状态管理
     ─────────────────────────────────────────
     卡片 mouseenter → 光标变形为 PLAY 圆点
     卡片 mouseleave → 光标恢复默认
     ═══════════════════════════════════════════ */
  function setupHoverStates(section) {
    const motif = window.__motif;
    if (!motif) return;

    section.querySelectorAll('[data-hover-work]').forEach(card => {
      card.addEventListener('mouseenter', () => motif.enterWork());
      card.addEventListener('mouseleave', () => motif.leaveWork());
    });
  }

  /* 占位作品数据（fetch 失败时使用） */
  function getFallbackWorks() {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `work-00${i + 1}`,
      title: `Work ${i + 1}`,
      titleCN: ['春节开场动效', '神经绽放', '故障脉冲', 'AIGC角色动画', '粒子爆炸特效', '水墨转场'][i] || `作品 ${i + 1}`,
      year: 2024 - Math.floor(i / 3),
      tools: [['AE', 'AIGC', 'PS'], ['AE', 'C4D'], ['AE', 'PS'], ['AIGC', 'AE'], ['AE'], ['PS', 'AE']][i] || ['AE'],
      thumbnail: `https://picsum.photos/seed/work-fallback-${i + 1}/420/560`,
    }));
  }

  /* ─── DOMContentLoaded 后初始化 ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__galleryInit = init;
  window.__galleryRebuild = rebuild;
})();
