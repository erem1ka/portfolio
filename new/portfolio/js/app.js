/* ═══════════════════════════════════════════
   app.js — 主入口
   
   负责初始化：
   1. Lenis 平滑滚动
   2. 极简浮动导航（菜单展开/收起）
   3. 滚动进度条（1px 竖线 + 圆点游标）
   4. Layer 4 鼠标光斑跟随（rAF 节流，60fps）
   5. 章节指示器更新（IntersectionObserver）
   6. prefers-reduced-motion 检测
   
   所有模块通过 init() 函数集中初始化，
   各模块独立运行，互不依赖。
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  /* ─── 全局状态 ─── */
  const state = {
    isMobile: window.matchMedia('(max-width: 767px)').matches,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    currentChapter: 0,
    navOpen: false,
    mouseX: -9999,
    mouseY: -9999,
  };

  /* ─── DOM 引用 ─── */
  const dom = {
    root: document.documentElement,
    body: document.body,
    glow: null,       // .bg-glow 元素
    navOverlay: null,  // .nav-overlay
    menuBtn: null,     // .floating-nav__menu-btn
    closeBtn: null,    // .nav-overlay__close
    progressFill: null, // .scroll-progress__fill
    progressDot: null,  // .scroll-progress__dot
    chapterIndicator: null, // .chapter-indicator
  };

  /* ═══════════════════════════════════════════
     Layer 4：鼠标光斑跟随
     ═══════════════════════════════════════════
     
     通过 CSS 变量 --mx/--my 实时更新鼠标光斑位置。
     为什么用 CSS 变量而非直接操作 style.background？
     1. CSS 变量更新只需改 root 的属性值
     2. 所有依赖此变量的元素自动响应
     3. 浏览器对 CSS 变量驱动渐变有 GPU 加速
     
     性能关键：
     - requestAnimationFrame 确保只在浏览器渲染帧更新
     - 移动端完全不执行（state.isMobile）
     - prefers-reduced-motion 时关闭光斑 */
  function initGlow() {
    if (state.isMobile || state.prefersReducedMotion) return;

    // 鼠标位置追踪
    document.addEventListener('mousemove', (e) => {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
    }, { passive: true });

    // 鼠标离开视口时将光斑移出
    document.addEventListener('mouseleave', () => {
      state.mouseX = -9999;
      state.mouseY = -9999;
    });

    // rAF 驱动光斑位置更新
    function updateGlow() {
      dom.root.style.setProperty('--mx', state.mouseX + 'px');
      dom.root.style.setProperty('--my', state.mouseY + 'px');
      requestAnimationFrame(updateGlow);
    }
    requestAnimationFrame(updateGlow);
  }

  /* ═══════════════════════════════════════════
     滚动进度条
     ═══════════════════════════════════════════
     
     左侧 1px 竖线 + 顶端圆点游标。
     圆点母题形态 6 的运行实现。
     
     为什么不用 transition？
     因为 Lenis 平滑滚动的滚动位置每帧都在变化，
     transition 会产生"追赶"效果而非实时同步。
     直接在 rAF 中设置 height/top 即可。 */
  function initScrollProgress() {
    function updateProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;

      dom.root.style.setProperty('--scroll-progress', progress.toFixed(4));

      if (dom.progressFill) {
        dom.progressFill.style.height = (progress * 100) + '%';
      }
      if (dom.progressDot) {
        dom.progressDot.style.top = (progress * 100) + '%';
      }

      requestAnimationFrame(updateProgress);
    }
    requestAnimationFrame(updateProgress);
  }

  /* ═══════════════════════════════════════════
     极简浮动导航
     ═══════════════════════════════════════════
     
     Hover 菜单图标 → 全屏覆盖式导航展开
     背景 backdrop-filter: blur(20px) + 大字菜单
     
     为什么不用 click 而用 hover？
     因为导航极简且始终可见，hover 展开最自然。
     但也支持 click 作为降级（移动端用 tap）。 */
  function initNav() {
    // 菜单展开
    function openNav() {
      state.navOpen = true;
      dom.navOverlay.classList.add('nav-overlay--active');
    }

    // 菜单收起
    function closeNav() {
      state.navOpen = false;
      dom.navOverlay.classList.remove('nav-overlay--active');
    }

    // hover 展开（桌面端）
    if (dom.menuBtn && !state.isMobile) {
      dom.menuBtn.addEventListener('mouseenter', openNav);
      dom.navOverlay.addEventListener('mouseleave', closeNav);
    }

    // click/tap 展开（移动端降级）
    if (dom.menuBtn && state.isMobile) {
      dom.menuBtn.addEventListener('click', openNav);
    }

    // 关闭按钮
    if (dom.closeBtn) {
      dom.closeBtn.addEventListener('click', closeNav);
    }

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.navOpen) {
        closeNav();
      }
    });

    // 点击导航项 → 关闭菜单 + 滚动到章节
    const navItems = dom.navOverlay.querySelectorAll('.nav-overlay__item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        closeNav();
        const target = item.getAttribute('href');
        if (target) {
          const section = document.querySelector(target);
          if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  /* ═══════════════════════════════════════════
     章节指示器更新
     ═══════════════════════════════════════════
     
     右上角 "CH 02 · The Gallery 03/10" 实时更新。
     通过 IntersectionObserver 监测各章节可见性，
     当前最可见的章节编号更新指示器。 */
  function initChapterIndicator() {
    if (!dom.chapterIndicator) return;

    const chapters = document.querySelectorAll('[data-chapter]');
    if (!chapters.length) return;

    // 创建 IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      // 找到最可见的章节（intersectionRatio 最大）
      let maxRatio = 0;
      let currentId = 0;
      entries.forEach(entry => {
        if (entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          currentId = parseInt(entry.target.dataset.chapter, 10);
        }
      });
      if (maxRatio > 0 && currentId !== state.currentChapter) {
        state.currentChapter = currentId;
        updateChapterIndicator(currentId);
      }
    }, {
      threshold: [0.1, 0.3, 0.5, 0.7],  // 多阈值，精确捕获
    });

    chapters.forEach(ch => observer.observe(ch));
  }

  /* 章节指示器文本更新 */
  function updateChapterIndicator(chapterId) {
    const chapterNames = [
      '序幕',       // 0
      '最强作品',   // 1
      '作品画廊',   // 2
      '作品幕后',   // 3
      '作品档案',   // 4
      '关于我',     // 5
      '终章',       // 6
    ];

    if (dom.chapterIndicator) {
      const num = dom.chapterIndicator.querySelector('.chapter-indicator__number');
      const name = dom.chapterIndicator.querySelector('.chapter-indicator__name');
      if (num) num.textContent = String(chapterId).padStart(2, '0');
      if (name) name.textContent = chapterNames[chapterId] || '';
    }
  }

  /* ═══════════════════════════════════════════
     Lenis 平滑滚动初始化
     ═══════════════════════════════════════════
     
     Lenis 是轻量平滑滚动库，让纵向滚动像惯性滑行。
     与 GSAP ScrollTrigger 配合使用。
     
     为什么需要 Lenis？
     原生 scroll-behavior: smooth 只处理锚点跳转，
     不处理日常滚动的惯性。Lenis 让所有滚动都有
     自然减速效果，增强"电影感"。 */
  function initLenis() {
    if (state.prefersReducedMotion) return;  // 减弱动效时不启用

    // Lenis 通过 CDN 全局引入
    if (typeof Lenis === 'undefined') {
      console.warn('[app] Lenis not loaded, skipping smooth scroll');
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,          // 滚动惯性持续时间
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),  // 自然减速
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    // 将 Lenis 与 GSAP ScrollTrigger 同步
    // 这是 Lenis + GSAP 配合的官方推荐方式
    if (typeof gsap !== 'undefined' && gsap.ticker) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      // 无 GSAP 时独立运行
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // 存储 lenis 实例供其他模块使用
    window.__portfolioLenis = lenis;
  }

  /* ═══════════════════════════════════════════
     主入口：初始化所有模块
     ═══════════════════════════════════════════ */
  function init() {
    // 缓存 DOM 引用
    dom.glow = document.querySelector('.bg-glow');
    dom.navOverlay = document.querySelector('.nav-overlay');
    dom.menuBtn = document.querySelector('.floating-nav__menu-btn');
    dom.closeBtn = document.querySelector('.nav-overlay__close');
    dom.progressFill = document.querySelector('.scroll-progress__fill');
    dom.progressDot = document.querySelector('.scroll-progress__dot');
    dom.chapterIndicator = document.querySelector('.chapter-indicator');

    // 初始化各模块
    initLenis();           // 平滑滚动
    initGlow();            // Layer 4 鼠标光斑
    initScrollProgress();  // 滚动进度条
    initNav();             // 极简浮动导航
    initChapterIndicator(); // 章节指示器

    // 初始化圆点母题状态机
    if (typeof MotifStateMachine !== 'undefined') {
      window.__motif = new MotifStateMachine();
    }

    console.log('[app] Portfolio initialized');
  }

  // DOM ready 后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 导出全局状态供调试
  window.__portfolioState = state;
})();