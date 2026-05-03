/* ═══════════════════════════════════════════
   easterEgg.js — 时间胶囊彩蛋

   触发方式（三选一，先满足即触发）：
   1. Konami Code: ↑↑↓↓←→←→BA（键盘）
   2. 连续点击 Logo 5次（移动端友好）
   3. 在 CH6 终章区域停留 8 秒不动

   触发后效果：
   - 全屏暗色覆盖层淡入
   - 圆点母题从中心爆炸扩散（粒子化）
   - 出现"时间胶囊"卡片：显示一条隐藏的设计师寄语
   - 卡片上方有"解封时间" timestamp
   - 关闭按钮（ESC 或点击外部）
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 彩蛋内容 ─── */
  const CAPSULE = {
    date: '2025.04',
    message: '如果你发现了这里，说明你是那种会仔细看每个细节的人。\n\n我在做这个作品集的时候，想的不是"怎么让它看起来专业"，而是"怎么让第一帧就留住你"。\n\n希望我们有机会一起做点有意思的东西。',
    author: '张峻烨',
    ps: 'P.S. 圆点是贯穿始终的那个东西——你也是。',
  };

  /* ─── Konami Code 序列 ─── */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiProgress = 0;

  /* ─── Logo 连击计数 ─── */
  let logoClickCount = 0;
  let logoClickTimer = null;

  /* ─── CH6 停留计时 ─── */
  let ch6DwellTimer = null;
  let ch6Observer = null;
  let eggTriggered = false;

  /* ═══════════════════════════════════════════
     初始化
     ═══════════════════════════════════════════ */
  function init() {
    createEggDOM();
    listenKonami();
    listenLogoClick();
    listenCH6Dwell();
  }

  /* ═══════════════════════════════════════════
     创建彩蛋 DOM（初始隐藏）
     ═══════════════════════════════════════════ */
  function createEggDOM() {
    const el = document.createElement('div');
    el.id = 'easter-egg';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="egg__backdrop"></div>
      <div class="egg__particles" aria-hidden="true"></div>
      <div class="egg__card">
        <div class="egg__dot-icon" aria-hidden="true"></div>
        <div class="egg__label h-micro">— 时间胶囊 · ${CAPSULE.date} —</div>
        <p class="egg__message font-cn">${CAPSULE.message.replace(/\n/g, '<br><br>')}</p>
        <div class="egg__author font-cn">— ${CAPSULE.author}</div>
        <div class="egg__ps h-caption font-cn">${CAPSULE.ps}</div>
        <button class="egg__close font-cn" aria-label="关闭时间胶囊">关闭</button>
      </div>
    `;
    document.body.appendChild(el);

    /* 生成粒子点 */
    const particles = el.querySelector('.egg__particles');
    for (let i = 0; i < 24; i++) {
      const dot = document.createElement('div');
      dot.className = 'egg__particle';
      dot.style.cssText = `
        --angle: ${Math.random() * 360}deg;
        --dist: ${80 + Math.random() * 200}px;
        --size: ${3 + Math.random() * 6}px;
        --delay: ${Math.random() * 0.4}s;
      `;
      particles.appendChild(dot);
    }

    /* 关闭事件 */
    el.querySelector('.egg__close').addEventListener('click', closeEgg);
    el.querySelector('.egg__backdrop').addEventListener('click', closeEgg);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && el.classList.contains('egg--active')) {
        closeEgg();
      }
    });
  }

  /* ═══════════════════════════════════════════
     触发彩蛋
     ═══════════════════════════════════════════ */
  function triggerEgg() {
    if (eggTriggered) return;
    eggTriggered = true;

    const egg = document.getElementById('easter-egg');
    if (!egg) return;

    egg.setAttribute('aria-hidden', 'false');
    egg.classList.add('egg--active');

    // 圆点母题进入 LOADING 状态（脉冲感）
    if (window.__motif) {
      window.__motif.toLoading();
      setTimeout(() => {
        if (window.__motif) window.__motif.leaveWork();
      }, 1200);
    }

    console.log('[easter-egg] 时间胶囊已解封 🕰️');
  }

  /* ─── 关闭 ─── */
  function closeEgg() {
    const egg = document.getElementById('easter-egg');
    if (!egg) return;

    egg.classList.remove('egg--active');
    egg.classList.add('egg--closing');

    setTimeout(() => {
      egg.classList.remove('egg--closing');
      egg.setAttribute('aria-hidden', 'true');
      eggTriggered = false;  // 允许再次触发
    }, 600);
  }

  /* ═══════════════════════════════════════════
     触发方式 1：Konami Code
     ═══════════════════════════════════════════ */
  function listenKonami() {
    document.addEventListener('keydown', e => {
      if (e.key === KONAMI[konamiProgress]) {
        konamiProgress++;
        if (konamiProgress === KONAMI.length) {
          konamiProgress = 0;
          triggerEgg();
        }
      } else {
        konamiProgress = 0;
        // 检查是否是序列第一个键
        if (e.key === KONAMI[0]) konamiProgress = 1;
      }
    });
  }

  /* ═══════════════════════════════════════════
     触发方式 2：连续点击 Logo 5次（2秒内）
     ═══════════════════════════════════════════ */
  function listenLogoClick() {
    const logo = document.querySelector('.nav-identity');
    if (!logo) return;

    logo.addEventListener('click', e => {
      e.preventDefault();
      logoClickCount++;

      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(() => {
        logoClickCount = 0;
      }, 2000);

      if (logoClickCount >= 5) {
        logoClickCount = 0;
        triggerEgg();
      }
    });
  }

  /* ═══════════════════════════════════════════
     触发方式 3：CH6 终章停留 8 秒
     ═══════════════════════════════════════════ */
  function listenCH6Dwell() {
    const ch6 = document.getElementById('ch-6');
    if (!ch6) return;

    ch6Observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          // 进入 CH6 → 开始计时
          if (!ch6DwellTimer) {
            ch6DwellTimer = setTimeout(() => {
              triggerEgg();
            }, 8000);
          }
        } else {
          // 离开 CH6 → 清除计时
          if (ch6DwellTimer) {
            clearTimeout(ch6DwellTimer);
            ch6DwellTimer = null;
          }
        }
      });
    }, { threshold: [0.5] });

    ch6Observer.observe(ch6);
  }

  /* ─── init ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__easterEgg = { trigger: triggerEgg, close: closeEgg };
})();
