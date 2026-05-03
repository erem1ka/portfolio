/* ═══════════════════════════════════════════
   transitions.js — 章节转场系统
   
   每个章节切换时触发：
   1. 顶部章节指示器更新（淡入淡出 300ms）
   2. 圆点母题在章节分隔处拉伸为横线（500ms）
   3. 横线从屏幕中心向两侧延展（0 → 100vw）
   4. 形成"章节标题卡"短暂可见后消失
   5. 同时显示章节标题（H2 64px），停留 600ms 后淡出
   
   让用户始终知道自己在哪一章，
   且每个章节切换都有"仪式感"。
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  /* ─── 章节名称映射 ─── */
  const CHAPTER_NAMES = [
    '序幕',       // 0
    '最强作品',   // 1
    '作品画廊',   // 2
    '作品幕后',   // 3
    '作品档案',   // 4
    '关于我',     // 5
    '终章',       // 6
  ];

  /* ─── 章节标题卡 DOM ───
     转场时全屏显示的标题卡
     圆点横线 + 章节标题 */
  let titleCard, titleCardLine, titleCardTitle;

  function createTitleCard() {
    titleCard = document.createElement('div');
    titleCard.id = 'chapter-title-card';
    titleCard.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 500;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      pointer-events: none;
      opacity: 0;
      background: rgba(11, 11, 15, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    `;

    // 横线 — 圆点母题形态 5（从中心向两侧延展）
    titleCardLine = document.createElement('div');
    titleCardLine.style.cssText = `
      width: 0;
      height: 1px;
      background: #FF3B5C;
      transition: none;
    `;

    // 章节标题 — H2 64px
    titleCardTitle = document.createElement('h2');
    titleCardTitle.className = 'h-h2 font-cn';
    titleCardTitle.style.cssText = `
      color: #F5F5F0;
      opacity: 0;
    `;

    titleCard.appendChild(titleCardLine);
    titleCard.appendChild(titleCardTitle);
    document.body.appendChild(titleCard);
  }

  /* ═══════════════════════════════════════════
     章节转场动画
     ═══════════════════════════════════════════
     
     每次章节切换时调用：
     1. 横线从 0 → 100vw（500ms，从中心延展）
     2. 标题淡入（300ms）
     3. 停留 600ms
     4. 标题淡出（300ms）
     5. 横线缩回（300ms）
     6. 整个标题卡消失
     
     总时长约 1700ms */
  function showChapterTransition(chapterId) {
    const name = CHAPTER_NAMES[chapterId] || '';
    if (!name || !titleCard) return;

    // 更新标题文本
    titleCardTitle.textContent = `CH ${String(chapterId).padStart(2, '0')} · ${name}`;

    const tl = gsap.timeline();

    // 标题卡出现
    tl.to(titleCard, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, 0);

    // 横线从中心延展：0 → 100vw
    tl.to(titleCardLine, {
      width: '100vw',
      duration: 0.5,
      ease: 'power3.inOut',
    }, 0);

    // 标题淡入
    tl.to(titleCardTitle, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, 0.15);

    // 停留 600ms
    tl.to(titleCardTitle, {
      duration: 0.6,
    }, 0.45);

    // 标题淡出
    tl.to(titleCardTitle, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }, 1.05);

    // 横线缩回
    tl.to(titleCardLine, {
      width: 0,
      duration: 0.3,
      ease: 'power3.inOut',
    }, 1.05);

    // 标题卡消失
    tl.to(titleCard, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        titleCard.style.opacity = '0';
      },
    }, 1.35);

    return tl;
  }

  /* ═══════════════════════════════════════════
     CH 1 进入动效
     ═══════════════════════════════════════════
     
     Loading 完成 → 圆点炸开 → 视频从中心放大铺满
     clip-path: circle 从 0 扩展到 200%
     标题字符 stagger 上浮，每字符延迟 30ms
     总时长 1200ms
     
     这是 window.triggerCh1Entrance 的实现，
     由 loader.js 的 finishLoading() 调用。 */
  function triggerCh1Entrance() {
    const ch1 = document.getElementById('ch-1');
    if (!ch1) return;

    const video = ch1.querySelector('.ch1__video');
    const titleChars = ch1.querySelectorAll('.ch1__title-char');
    const subtitle = ch1.querySelector('.ch1__subtitle');
    const scrollHint = ch1.querySelector('.ch1__scroll-hint');

    const tl = gsap.timeline();

    // ─── 视频从中心放大铺满 ───
    // clip-path: circle 从 0 扩展到 200%，模拟圆点"炸开"
    if (video) {
      tl.fromTo(video, {
        clipPath: 'circle(0% at 50% 50%)',
        opacity: 0,
      }, {
        clipPath: 'circle(200% at 50% 50%)',
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out',
      }, 0);
    }

    // ─── 标题字符 stagger 上浮 ───
    // 每字符延迟 30ms，从下方浮入
    if (titleChars.length) {
      tl.fromTo(titleChars, {
        y: 60,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.03,  // 30ms per character
        ease: 'power3.out',
      }, 0.2);
    }

    // ─── 简介淡入 ───
    if (subtitle) {
      tl.fromTo(subtitle, {
        y: 30,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out',
      }, 0.6);
    }

    // ─── 滚动提示淡入 ───
    if (scrollHint) {
      tl.fromTo(scrollHint, {
        opacity: 0,
      }, {
        opacity: 0.6,
        duration: 0.4,
        ease: 'power2.out',
      }, 0.9);
    }

    return tl;
  }

  /* ═══════════════════════════════════════════
     初始化：用 IntersectionObserver 监听章节切换
     ═══════════════════════════════════════════ */
  function init() {
    createTitleCard();

    // 暴露 CH 1 进入动效给 loader.js
    window.triggerCh1Entrance = triggerCh1Entrance;

    // 章节指示器更新已在 app.js 实现
    // 这里监听章节切换，触发标题卡转场
    let lastChapter = -1;
    const chapters = document.querySelectorAll('[data-chapter]');

    if (chapters.length && typeof ScrollTrigger !== 'undefined') {
      chapters.forEach(ch => {
        ScrollTrigger.create({
          trigger: ch,
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => {
            const id = parseInt(ch.dataset.chapter, 10);
            if (id !== lastChapter && lastChapter !== -1) {
              showChapterTransition(id);
            }
            lastChapter = id;
          },
          onEnterBack: () => {
            const id = parseInt(ch.dataset.chapter, 10);
            if (id !== lastChapter && lastChapter !== -1) {
              showChapterTransition(id);
            }
            lastChapter = id;
          },
        });
      });
    }

    console.log('[transitions] Chapter transition system initialized');
  }

  // DOM ready 后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // 等 GSAP ScrollTrigger 注册完毕后再初始化
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      init();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        gsap.registerPlugin(ScrollTrigger);
        init();
      });
    }
  }

})();