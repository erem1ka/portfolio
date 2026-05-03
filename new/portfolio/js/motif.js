/* ═══════════════════════════════════════════
   motif.js — 圆点母题状态机
   
   整个网站围绕一个 4-16px 的强调色圆点展开，
   它在不同场景扮演不同角色，构成贯穿始终的视觉语言。
   
   状态机管理圆点的 7 种形态切换：
   1. LOADING     — 4px 脉冲圆点
   2. CURSOR      — 16px 实心圆点（mix-blend-mode: difference）
   3. HOVER_PLAY  — 64px 圆 + "PLAY" 文字
   4. HOVER_CLICK — 80px 圆 + "CLICK" 文字
   5. HOVER_LINK  — 水平箭头 →
   6. HOVER_TEXT   — 竖线 |（编辑器光标感）
   7. DIVIDER     — 圆点拉伸为横线（章节分隔）
   8. END         — 圆点缩回 4px 然后消失（Footer 闭环）
   
   所有形态通过 morph 动画切换：
   - 缩放/拉伸：transform: scale + scaleY
   - 形变：border-radius 过渡
   - 切换时长：300-500ms, cubic-bezier(0.77, 0, 0.175, 1)
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  /* ─── 形态定义 ───
     每个形态定义尺寸、边框半径、内容等属性，
     状态机切换时根据目标形态计算过渡参数 */
  const STATES = {
    LOADING: {
      name: 'loading',
      width: 4,           // var(--dot-loading)
      height: 4,
      borderRadius: '50%',
      content: '',
      duration: 500,      // morph 过渡时长 ms
    },
    CURSOR: {
      name: 'cursor',
      width: 16,          // var(--dot-cursor)
      height: 16,
      borderRadius: '50%',
      content: '',
      duration: 300,
    },
    HOVER_PLAY: {
      name: 'hover-play',
      width: 64,          // var(--dot-hover)
      height: 64,
      borderRadius: '50%',
      content: '播放',    // 内嵌文字
      duration: 400,
    },
    HOVER_CLICK: {
      name: 'hover-click',
      width: 80,
      height: 80,
      borderRadius: '50%',
      content: '点击',
      duration: 400,
    },
    HOVER_LINK: {
      name: 'hover-link',
      width: 32,
      height: 2,
      borderRadius: '1px',
      content: '',
      duration: 300,
    },
    HOVER_TEXT: {
      name: 'hover-text',
      width: 2,
      height: 32,
      borderRadius: '1px',
      content: '',
      duration: 300,
    },
    DIVIDER: {
      name: 'divider',
      width: 100,         // 100vw 的百分比表示
      height: 1,
      borderRadius: '0',
      content: '',
      duration: 500,
    },
    END: {
      name: 'end',
      width: 4,
      height: 4,
      borderRadius: '50%',
      content: '',
      duration: 1000,     // 消失动画更长，有仪式感
    },
  };

  /* ─── 状态机类 ─── */
  class MotifStateMachine {
    constructor() {
      this.currentState = STATES.CURSOR;   // 默认形态
      this.previousState = null;
      this.isTransitioning = false;
      this.listeners = [];                 // 状态变更回调

      // 圆点 DOM 元素引用
      this.cursorDot = document.querySelector('.motif-dot--cursor');
      this.cursorRing = document.querySelector('.motif-dot--cursor-ring');

      // 光标跟随参数
      this.isMobile = window.matchMedia('(max-width: 767px)').matches;
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // 光标位置与跟随延迟
      this.dotX = 0;
      this.dotY = 0;
      this.ringX = 0;
      this.ringY = 0;
      this.mouseX = 0;
      this.mouseY = 0;
      this.dotLerp = 0.15;   // 实心圆延迟 0.15s（lerp 0.15）
      this.ringLerp = 0.08;  // 描边圆延迟 0.3s（lerp 0.08）

      // 初始化光标跟随
      if (!this.isMobile) {
        this.initCursorFollow();
      }
    }

    /* ═══════════════════════════════════════════
       形态切换（核心方法）
       ═══════════════════════════════════════════
       
       切换圆点从当前形态到目标形态。
       通过更新 CSS 类名驱动视觉过渡，
       CSS transition（在 motif.css 定义）处理动画。
       
       为什么用 CSS 类名而非 JS 直接操作 style？
       1. 所有过渡参数在 CSS 中统一定义，避免散落
       2. CSS transition 的 GPU 加速比 JS style 更好
       3. 类名语义化，方便调试和阅读 */
    transitionTo(newState) {
      if (this.isTransitioning) return;
      if (newState === this.currentState) return;

      this.previousState = this.currentState;
      this.currentState = newState;
      this.isTransitioning = true;

      // 移除旧形态类名
      if (this.cursorDot && this.previousState) {
        this.cursorDot.classList.remove('motif-dot--' + this.previousState.name);
      }

      // 添加新形态类名
      if (this.cursorDot && newState) {
        this.cursorDot.classList.add('motif-dot--' + newState.name);
      }

      // 更新内容文字（如 "PLAY"、"CLICK"）
      if (this.cursorDot && newState.content) {
        this.cursorDot.textContent = newState.content;
      } else if (this.cursorDot) {
        this.cursorDot.textContent = '';
      }

      // 同步更新描边圆环尺寸
      if (this.cursorRing && newState === STATES.HOVER_PLAY) {
        this.cursorRing.style.width = '80px';
        this.cursorRing.style.height = '80px';
        this.cursorRing.style.borderWidth = '2px';
      } else if (this.cursorRing && newState === STATES.HOVER_CLICK) {
        this.cursorRing.style.width = '96px';
        this.cursorRing.style.height = '96px';
        this.cursorRing.style.borderWidth = '2px';
      } else if (this.cursorRing) {
        // 默认圆环尺寸
        this.cursorRing.style.width = '32px';
        this.cursorRing.style.height = '32px';
        this.cursorRing.style.borderWidth = '2px';
      }

      // 过渡完成后解锁
      const duration = newState.duration || 300;
      setTimeout(() => {
        this.isTransitioning = false;
        this.emit('stateChange', {
          from: this.previousState,
          to: newState,
        });
      }, duration);
    }

    /* ─── 快捷切换方法 ───
       这些方法对应不同交互场景，方便外部调用 */
    
    // 鼠标进入作品区域 → 变形为 64px PLAY 圆
    enterWork() {
      this.transitionTo(STATES.HOVER_PLAY);
    }

    // 鼠标离开作品区域 → 回到默认 16px 圆点
    leaveWork() {
      this.transitionTo(STATES.CURSOR);
    }

    // 鼠标进入按钮 → 80px CLICK 圆
    enterButton() {
      this.transitionTo(STATES.HOVER_CLICK);
    }

    leaveButton() {
      this.transitionTo(STATES.CURSOR);
    }

    // 鼠标进入链接 → 水平箭头
    enterLink() {
      this.transitionTo(STATES.HOVER_LINK);
    }

    leaveLink() {
      this.transitionTo(STATES.CURSOR);
    }

    // 鼠标进入文字段落 → 竖线 |
    enterText() {
      this.transitionTo(STATES.HOVER_TEXT);
    }

    leaveText() {
      this.transitionTo(STATES.CURSOR);
    }

    // Loading 序列 → 4px 脉冲
    toLoading() {
      this.transitionTo(STATES.LOADING);
    }

    // 章节分隔 → 横线
    toDivider() {
      this.transitionTo(STATES.DIVIDER);
    }

    // Footer 终点 → 4px 消失
    toEnd() {
      this.transitionTo(STATES.END);
    }

    /* ═══════════════════════════════════════════
       光标跟随系统
       ═══════════════════════════════════════════
       
       两个 div 元素，requestAnimationFrame + lerp 平滑跟随：
       - 实心圆：lerp 0.15（延迟约 0.15s）
       - 描边圆：lerp 0.08（延迟约 0.3s）
       
       鼠标快速移动时两者拉开形成"光带"，
       鼠标静止时两者合二为一。
       
       lerp（线性插值）公式：
       current += (target - current) * lerpFactor
       
       为什么不用 CSS transition？
       transition 的延迟是时间维度，lerp 是空间维度。
       lerp 让光标"追赶"鼠标位置，而不是"等待后移动"，
       产生更自然的弹性跟随感。 */
    initCursorFollow() {
      if (this.prefersReducedMotion) return;

      // 隐藏原生光标
      document.body.style.cursor = 'none';

      // 所有交互元素也隐藏原生光标
      const interactiveElements = 'a, button, [data-hover-work], [data-hover-link], [data-hover-text]';
      document.querySelectorAll(interactiveElements).forEach(el => {
        el.style.cursor = 'none';
      });

      // 鼠标位置追踪
      document.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      }, { passive: true });

      // rAF 驱动平滑跟随
      this.updateCursor();
    }

    updateCursor() {
      // 实心圆 lerp 追赶鼠标
      this.dotX += (this.mouseX - this.dotX) * this.dotLerp;
      this.dotY += (this.mouseY - this.dotY) * this.dotLerp;

      // 描边圆 lerp 追赶实心圆（二次延迟）
      this.ringX += (this.mouseX - this.ringX) * this.ringLerp;
      this.ringY += (this.mouseY - this.ringY) * this.ringLerp;

      // 更新 DOM 位置
      if (this.cursorDot) {
        this.cursorDot.style.left = this.dotX + 'px';
        this.cursorDot.style.top = this.dotY + 'px';
      }
      if (this.cursorRing) {
        this.cursorRing.style.left = this.ringX + 'px';
        this.cursorRing.style.top = this.ringY + 'px';
      }

      requestAnimationFrame(() => this.updateCursor());
    }

    /* ─── 事件系统 ───
       允许外部模块监听状态变更 */
    on(event, callback) {
      this.listeners.push({ event, callback });
    }

    emit(event, data) {
      this.listeners
        .filter(l => l.event === event)
        .forEach(l => l.callback(data));
    }

    /* ─── 上下文检测 ───
       自动检测鼠标所在上下文并切换形态
       这是光标"智能变形"的基础骨架 */
    initContextDetection() {
      if (this.isMobile) return;

      // 作品卡片区域
      document.querySelectorAll('[data-hover-work]').forEach(el => {
        el.addEventListener('mouseenter', () => this.enterWork());
        el.addEventListener('mouseleave', () => this.leaveWork());
      });

      // 链接
      document.querySelectorAll('a, [data-hover-link]').forEach(el => {
        el.addEventListener('mouseenter', () => this.enterLink());
        el.addEventListener('mouseleave', () => this.leaveLink());
      });

      // 按钮
      document.querySelectorAll('button, [data-hover-button]').forEach(el => {
        el.addEventListener('mouseenter', () => this.enterButton());
        el.addEventListener('mouseleave', () => this.leaveButton());
      });

      // 文字段落
      document.querySelectorAll('p, [data-hover-text]').forEach(el => {
        el.addEventListener('mouseenter', () => this.enterText());
        el.addEventListener('mouseleave', () => this.leaveText());
      });
    }
  }

  // 导出为全局变量，供 app.js 使用
  window.MotifStateMachine = MotifStateMachine;

})();