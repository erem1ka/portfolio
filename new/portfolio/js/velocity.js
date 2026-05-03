/* ═══════════════════════════════════════════
   velocity.js — 滚动速度感应

   检测滚动速度，给全局画廊卡片施加动态视觉反馈：
   1. 卡片 perspectiveTilt — 速度快时轻微倾斜（向滚动方向）
   2. 速度线 speedLines — 极速时短暂出现运动模糊线条
   3. 光标环尺寸放大 — 速度快时描边圆环轻微放大

   原理：
   - 每帧记录 window.scrollY 差值 → 得到即时速度
   - 速度值经过 lerp 平滑（避免抖动）
   - 用平滑速度值映射到各效果的强度
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  const CONFIG = {
    lerpFactor: 0.12,        // 速度平滑系数（越小越平滑）
    maxTilt: 8,              // 最大倾斜角度 deg
    maxRingScale: 1.5,       // 光标环最大放大倍率
    speedLineThreshold: 30,  // 触发速度线的最低速度 px/frame
    speedLineCount: 8,       // 速度线数量
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isMobile: window.matchMedia('(max-width: 767px)').matches,
  };

  /* ─── 状态 ─── */
  const state = {
    lastScrollY: window.scrollY,
    rawSpeed: 0,       // 原始速度（每帧 px 差值）
    smoothSpeed: 0,    // 平滑速度
    direction: 1,      // 1=向下，-1=向上
  };

  /* ─── 速度线 DOM ─── */
  let speedLinesEl = null;

  /* ═══════════════════════════════════════════
     初始化
     ═══════════════════════════════════════════ */
  function init() {
    if (CONFIG.reducedMotion) return;

    createSpeedLines();
    startRAF();
  }

  /* ─── 创建速度线容器 ─── */
  function createSpeedLines() {
    speedLinesEl = document.createElement('div');
    speedLinesEl.className = 'velocity-speed-lines';
    speedLinesEl.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < CONFIG.speedLineCount; i++) {
      const line = document.createElement('div');
      line.className = 'velocity-speed-line';
      // 随机分布位置
      line.style.cssText = `
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        width: ${40 + Math.random() * 80}px;
        transform: rotate(${Math.random() * 360}deg);
        opacity: 0;
      `;
      speedLinesEl.appendChild(line);
    }

    document.body.appendChild(speedLinesEl);
  }

  /* ═══════════════════════════════════════════
     rAF 主循环：每帧计算速度 + 应用效果
     ═══════════════════════════════════════════ */
  function startRAF() {
    function tick() {
      // 计算原始速度
      const currentY = window.scrollY;
      state.rawSpeed = currentY - state.lastScrollY;
      state.direction = state.rawSpeed >= 0 ? 1 : -1;
      state.lastScrollY = currentY;

      // 平滑速度（lerp）
      state.smoothSpeed += (Math.abs(state.rawSpeed) - state.smoothSpeed) * CONFIG.lerpFactor;

      // 应用各效果
      applyCardTilt();
      applySpeedLines();
      applyCursorRingScale();

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════════════
     效果 1：卡片倾斜
     速度越快 → 卡片向滚动方向倾斜
     ═══════════════════════════════════════════ */
  function applyCardTilt() {
    const cards = document.querySelectorAll('.gallery-card');
    if (!cards.length) return;

    // 速度映射到倾斜角度（限制在 maxTilt 内）
    const tilt = Math.min(state.smoothSpeed * 0.3, CONFIG.maxTilt) * state.direction;

    cards.forEach(card => {
      // 通过 CSS 变量传递，CSS 侧做 transform
      card.style.setProperty('--velocity-tilt', tilt + 'deg');
    });
  }

  /* ═══════════════════════════════════════════
     效果 2：速度线
     速度超过阈值时，速度线短暂显示
     ═══════════════════════════════════════════ */
  function applySpeedLines() {
    if (!speedLinesEl) return;

    const intensity = Math.max(0, (state.smoothSpeed - CONFIG.speedLineThreshold) / 40);

    if (intensity > 0) {
      speedLinesEl.style.opacity = Math.min(intensity * 0.6, 0.4);
      // 速度线跟随滚动方向旋转
      speedLinesEl.style.transform = `rotate(${state.direction > 0 ? 90 : -90}deg)`;
    } else {
      speedLinesEl.style.opacity = 0;
    }
  }

  /* ═══════════════════════════════════════════
     效果 3：光标环放大
     速度快时描边圆环轻微放大，增强"运动感"
     ═══════════════════════════════════════════ */
  function applyCursorRingScale() {
    if (CONFIG.isMobile) return;

    const ring = document.querySelector('.motif-dot--cursor-ring');
    if (!ring) return;

    const scale = 1 + Math.min(state.smoothSpeed * 0.01, CONFIG.maxRingScale - 1);
    ring.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
  }

  /* ─── init ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露速度数据供其他模块读取
  window.__velocityState = state;
})();
