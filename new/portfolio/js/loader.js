/* ═══════════════════════════════════════════
   loader.js — CH 0 Loading 序列
   
   圆点母题的起点。4×4px 强调色圆点从脉冲呼吸开始，
   经过分裂→横线→方框→碎裂四阶段变形，
   最终"炸开"进入 CH 1 全屏沉浸。
   
   动画序列：
   - 0-30% (0-540ms)：圆点脉冲呼吸
   - 30-60% (540-1080ms)：圆点分裂为水平线
   - 60-90% (1080-1620ms)：水平线扩展为方框
   - 90-100% (1620-1800ms)：方框 3D 翻转碎裂
   
   同步：右上角计数器 00 → 100（非线性节奏）
   sessionStorage 标记：同会话只播一次
   总时长：1800ms，缓动 power3.inOut
   
   prefers-reduced-motion：跳过动画，直接显示 CH 1
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  const SESSION_KEY = 'portfolio-loaded';
  const TOTAL_DURATION = 1800;  // ms

  /* ─── DOM 引用 ─── */
  let loadingOverlay, loadingDot, loadingCounter, loadingBox;

  /* ─── 检测是否需要播放 Loading ─── */
  function shouldPlay() {
    // 同会话已播过 → 跳过
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    // prefers-reduced-motion → 跳过，直接显示内容
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  }

  /* ═══════════════════════════════════════════
     创建 Loading 遮罩层 DOM
     ═══════════════════════════════════════════
     
     Loading 需要一个全屏遮罩，覆盖所有内容，
     动画结束后遮罩消失，内容自然显示。 */
  function createLoadingDOM() {
    // 全屏遮罩层
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999;
      background: #0B0B0F;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `;

    // 圆点 — 4×4px 起点
    loadingDot = document.createElement('div');
    loadingDot.className = 'motif-dot motif-dot--loading';
    loadingDot.style.cssText = `
      display: block;
      position: absolute;
      /* 初始状态：4px 圆点居中 */
    `;

    // 方框 — 用于 60-90% 阶段的方框形态
    loadingBox = document.createElement('div');
    loadingBox.style.cssText = `
      position: absolute;
      width: 200px;
      height: 120px;
      border: 1px solid #FF3B5C;
      border-radius: 2px;
      opacity: 0;
      transform: scale(0);
      background: transparent;
    `;

    // 计数器 — 右上角 00 → 100
    loadingCounter = document.createElement('div');
    loadingCounter.className = 'h-micro';
    loadingCounter.style.cssText = `
      position: fixed;
      top: 24px;
      right: 32px;
      opacity: 0.6;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #555555;
    `;
    loadingCounter.textContent = '00';

    // 组装遮罩层
    loadingOverlay.appendChild(loadingDot);
    loadingOverlay.appendChild(loadingBox);
    loadingOverlay.appendChild(loadingCounter);
    document.body.appendChild(loadingOverlay);

    return { overlay: loadingOverlay, dot: loadingDot, box: loadingBox, counter: loadingCounter };
  }

  /* ═══════════════════════════════════════════
     Loading 动画序列 — GSAP Timeline
     ═══════════════════════════════════════════
     
     用 GSAP timeline 串联四阶段动画：
     阶段1 (0-30%)：圆点脉冲呼吸
     阶段2 (30-60%)：圆点分裂为水平线
     阶段3 (60-90%)：水平线扩展为方框
     阶段4 (90-100%)：方框翻转碎裂
     
     计数器同步非线性递增（bezier-paced） */
  function playLoadingSequence() {
    const tl = gsap.timeline({
      onComplete: () => finishLoading(),
    });

    // ─── 阶段 1：圆点脉冲呼吸 (0-540ms) ───
    // 圆点从 4px 放大到 12px 再缩回，呼吸 3 次
    tl.to(loadingDot, {
      scale: 3,
      duration: 0.18,
      ease: 'power2.in',
      repeat: 2,           // 呼吸 3 次
      yoyo: true,
    }, 0);

    // ─── 阶段 2：圆点分裂为水平线 (540-1080ms) ───
    // 圆点 scaleX 拉伸到 100 (400px 宽)，scaleY 压到 0.25 (1px)
    // border-radius 从 50% → 2px，形变从圆点到横线
    tl.to(loadingDot, {
      width: 400,
      height: 1,
      borderRadius: '2px',
      scale: 1,
      duration: 0.54,
      ease: 'power3.inOut',
    }, 0.54);

    // ─── 阶段 3：水平线扩展为方框 (1080-1620ms) ───
    // 横线淡出，方框从 scale(0) 放大到 scale(1)
    tl.to(loadingDot, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.out',
    }, 1.08);

    tl.to(loadingBox, {
      opacity: 1,
      scale: 1,
      duration: 0.54,
      ease: 'power3.inOut',
    }, 1.08);

    // ─── 阶段 4：方框 3D 翻转碎裂 (1620-1800ms) ───
    // 方框 3D 翻转 + clip-path 碎裂效果
    tl.to(loadingBox, {
      rotateY: 90,
      scale: 3,
      opacity: 0,
      duration: 0.18,
      ease: 'power3.in',
    }, 1.62);

    // ─── 遮罩层碎裂消失 ───
    // clip-path: circle 从中心扩展，遮罩被"炸开"
    tl.to(loadingOverlay, {
      clipPath: 'circle(200% at 50% 50%)',
      opacity: 0,
      duration: 0.18,
      ease: 'power3.out',
      onComplete: () => {
        loadingOverlay.remove();
      },
    }, 1.62);

    // ─── 计数器：非线性递增 00 → 100 ───
    // bezier-paced：模拟真实加载节奏（有快有慢）
    // 不是均匀 0→100，而是先慢后快再慢
    const counterObj = { val: 0 };
    tl.to(counterObj, {
      val: 100,
      duration: 1.8,
      ease: 'power3.inOut',  // 非线性节奏
      onUpdate: () => {
        const v = Math.round(counterObj.val);
        loadingCounter.textContent = String(v).padStart(2, '0');
      },
    }, 0);

    // 计数器淡出
    tl.to(loadingCounter, {
      opacity: 0,
      duration: 0.15,
    }, 1.65);

    return tl;
  }

  /* ═══════════════════════════════════════════
     Loading 完成 → 进入 CH 1
     ═══════════════════════════════════════════
     
     Loading 结束后：
     1. 标记 sessionStorage（同会话不重复播放）
     2. 触发 CH 1 进入动效
     3. 绝对不要"欢迎"页或过渡页 */
  function finishLoading() {
    // 标记同会话已播放
    sessionStorage.setItem(SESSION_KEY, 'true');

    // 触发 CH 1 进入动效
    if (typeof window.triggerCh1Entrance === 'function') {
      window.triggerCh1Entrance();
    }

    console.log('[loader] Loading sequence completed');
  }

  /* ═══════════════════════════════════════════
     跳过 Loading（同会话或 reduced-motion）
     ═══════════════════════════════════════════
     
     直接显示内容，不播放动画 */
  function skipLoading() {
    // 隐藏 CH 0 section
    const ch0 = document.getElementById('ch-0');
    if (ch0) ch0.style.display = 'none';

    // 确保 CH 1 可见
    const ch1 = document.getElementById('ch-1');
    if (ch1) ch1.style.opacity = '1';

    console.log('[loader] Loading skipped (session or reduced-motion)');
  }

  /* ═══════════════════════════════════════════
     主入口
     ═══════════════════════════════════════════ */
  function init() {
    // 隐藏 CH 0 section（Loading 遮罩层独立于章节）
    const ch0 = document.getElementById('ch-0');
    if (ch0) ch0.style.display = 'none';

    if (!shouldPlay()) {
      skipLoading();
      return;
    }

    // 创建 Loading DOM
    const els = createLoadingDOM();

    // 暂时隐藏主内容，等 Loading 完成后显示
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.opacity = '0';
    }

    // 播放动画序列
    playLoadingSequence();

    // Loading 完成后恢复主内容可见性
    gsap.to(mainContent, {
      opacity: 1,
      duration: 0.3,
      delay: 1.65,  // 在遮罩碎裂阶段同步
      ease: 'power2.out',
    });
  }

  // DOM ready 后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();