/**
 * easterEgg.js — 「时间胶囊」Time Capsule
 * ─────────────────────────────────────────────────────────────
 * 挂载到 Selected Works 横向画廊的 ScrollTrigger 上，
 * 根据滚动进度动态改变视频播放速度和视觉滤镜，
 * 在画廊终点触发"时间胶囊"彩蛋。
 *
 * 开关：
 *   window.__TIME_CAPSULE__ = true   // 代码控制
 *   URL 添加 ?easter=1               // 链接控制
 *
 * 挂载方式（在 app.js 的 initHorizontalScroll 后调用）：
 *   import { initTimeCapsule } from './easterEgg.js';
 *   initTimeCapsule(scrollTrigger, galleryElement);
 * 或直接：
 *   window.initTimeCapsule(scrollTrigger, galleryElement)
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── 节流工具（rAF 对齐，16ms） ──
  function rAFThrottle(fn) {
    let raf = null;
    return function (...args) {
      if (raf) return;
      raf = requestAnimationFrame(() => { fn.apply(this, args); raf = null; });
    };
  }

  // ── 视口判断 ──
  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.right > 0 && r.left < window.innerWidth;
  }

  /**
   * initTimeCapsule
   * @param {ScrollTrigger} st   — GSAP ScrollTrigger 实例
   * @param {HTMLElement}   gallery — .gallery-track 或其父容器
   */
  function initTimeCapsule(st, gallery) {
    // ── 降级：prefers-reduced-motion ──
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ── 开关检查 ──
    const enabled =
      window.__TIME_CAPSULE__ ||
      new URLSearchParams(location.search).has('easter');
    if (!enabled) return;

    const gsap = window.gsap;
    if (!gsap) return;

    const videos = gallery.querySelectorAll('video');
    let finaleTriggered = false;

    // ── 核心：ScrollTrigger onUpdate 代理 ──
    // app.js 通过 window._easterUpdate 将 onUpdate 事件传入
    const onUpdate = rAFThrottle((self) => {
      const p = self.progress;

      // 三段速度 + 滤镜映射
      let rate, filter;

      if (p < 0.33) {
        // Act I — 慢镜头开场
        rate   = gsap.utils.mapRange(0, 0.33, 0.5, 0.8, p);
        filter = 'saturate(0.9) contrast(1.05)';
      } else if (p < 0.66) {
        // Act II — 正常节奏
        rate   = gsap.utils.mapRange(0.33, 0.66, 0.8, 1.2, p);
        filter = 'none';
      } else {
        // Act III — 时间加速
        rate   = gsap.utils.mapRange(0.66, 1.0, 1.2, 2.0, p);
        filter = 'blur(1px) hue-rotate(5deg)';
      }

      // 仅对视口内视频应用（性能优化）
      videos.forEach(v => {
        if (isInViewport(v)) {
          v.playbackRate = rate;
          v.style.filter = filter;
        } else {
          // 离开视口立即重置
          v.playbackRate = 1.0;
          v.style.filter = 'none';
        }
      });

      // ── 触达终点 → 时间胶囊 ──
      if (p >= 0.98 && !finaleTriggered) {
        finaleTriggered = true;
        triggerTimeCapsule(videos, gallery, gsap);
      }

      // Re-arm：progress 回落到 <0.9 时重新允许触发
      if (p < 0.9) {
        finaleTriggered = false;
      }
    });

    // 挂到全局，让 app.js 的 onUpdate 回调调用
    window._easterUpdate = onUpdate;

    console.log('🕰️  Time Capsule armed. Scroll to the end of Selected Works.');
  }

  /**
   * triggerTimeCapsule — 彩蛋终点动画
   */
  function triggerTimeCapsule(videos, gallery, gsap) {
    // 1. 所有视频同步回到 1x + 淡出滤镜
    videos.forEach(v => {
      v.playbackRate = 1.0;
      gsap.to(v, {
        duration: 0.5,
        ease: 'power2.out',
        onUpdate() {
          // 逐步淡出滤镜（不能直接 gsap.to filter string，用 onUpdate 手写插值）
          const prog = this.progress();
          const sat = 1 + (0.9 - 1) * (1 - prog); // 0.9 → 1.0
          v.style.filter = prog >= 0.99 ? 'none' : `saturate(${sat.toFixed(2)})`;
        },
        onComplete() { v.style.filter = 'none'; },
      });
    });

    // 2. 画廊轻微震动
    gsap.fromTo(
      gallery,
      { x: 0 },
      {
        keyframes: [
          { x: -2, duration: 0.04 },
          { x: 2,  duration: 0.04 },
          { x: -1, duration: 0.04 },
          { x: 1,  duration: 0.04 },
          { x: 0,  duration: 0.04 },
        ],
        ease: 'none',
      }
    );

    // 3. 「TIME CAPSULE · SYNCED」标签
    const label = document.createElement('div');
    label.className = 'time-capsule-label';
    label.textContent = 'TIME CAPSULE · SYNCED';
    document.body.appendChild(label);

    gsap.fromTo(
      label,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
        onComplete() {
          gsap.to(label, {
            opacity: 0,
            duration: 0.6,
            delay: 2,
            ease: 'power2.in',
            onComplete() { label.remove(); },
          });
        },
      }
    );
  }

  // 挂到全局，供 app.js 调用
  window.initTimeCapsule = initTimeCapsule;

})();
