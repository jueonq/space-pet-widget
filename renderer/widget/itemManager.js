'use strict';

// stage 크기 (widget.js와 동일하게 맞출 것)
const STAGE_W = 400;
const STAGE_H = 270;
const ITEM_SIZE = 64;

class ItemManager {
  /**
   * @param {HTMLElement} container  - #item-layer
   * @param {HTMLElement} deleteZone - #delete-zone
   */
  constructor(container, deleteZone) {
    this.container  = container;
    this.deleteZone = deleteZone;
    // id → { el, x, y, vx, vy, angle, w, driftTimer, driftInterval, frozen }
    this.items = new Map();
  }

  /**
   * 인벤토리 드롭으로 아이템 배치
   * @param {{ id, assetKey, label?, x, y }} itemData
   */
  addItem(itemData) {
    if (this.items.has(itemData.id)) return;

    const el = document.createElement('div');
    el.className = 'placed-item';

    const img = document.createElement('img');
    img.src = `../../assets/items/${itemData.assetKey}.png`;
    img.alt = itemData.assetKey;
    img.onerror = () => {
      img.remove();
      el.classList.add('item-fallback');
      el.textContent = _emojiFor(itemData.assetKey);
    };
    el.appendChild(img);
    this.container.appendChild(el);

    const sign = () => (Math.random() < 0.5 ? 1 : -1);
    const state = {
      el,
      x: Math.max(ITEM_SIZE / 2, Math.min(itemData.x, STAGE_W - ITEM_SIZE / 2)),
      y: Math.max(ITEM_SIZE / 2, Math.min(itemData.y, STAGE_H - ITEM_SIZE / 2)),
      vx: sign() * (0.04 + Math.random() * 0.08),
      vy: sign() * (0.03 + Math.random() * 0.06),
      angle: Math.random() * 360,
      w: sign() * (0.02 + Math.random() * 0.04),
      driftTimer: 0,
      driftInterval: 2000 + Math.random() * 3000,
      frozen: false,
    };

    this.items.set(itemData.id, state);
    this._render(state);
    this._attachLongPress(el, itemData.id);
  }

  // ── 꾹 누르기 감지 ───────────────────────────────────────
  _attachLongPress(el, id) {
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      let cancelled = false;

      const cancel = () => {
        cancelled = true;
        clearTimeout(timer);
        document.removeEventListener('mousemove', onMoveCheck);
      };

      const onMoveCheck = (ev) => {
        if (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8) {
          cancel();
        }
      };

      const timer = setTimeout(() => {
        if (cancelled) return;
        document.removeEventListener('mousemove', onMoveCheck);
        document.removeEventListener('mouseup', onUpCancel);
        this._startDrag(id);
      }, 500);

      const onUpCancel = () => cancel();

      document.addEventListener('mousemove', onMoveCheck);
      document.addEventListener('mouseup', onUpCancel, { once: true });
    });
  }

  // ── 드래그 모드 진입 ─────────────────────────────────────
  _startDrag(id) {
    const state = this.items.get(id);
    if (!state) return;

    state.frozen = true;
    state.el.classList.add('dragging');
    this.deleteZone.classList.add('visible');

    const stageRect = this.container.getBoundingClientRect();
    const dz = this.deleteZone;

    const onMouseMove = (e) => {
      const x = e.clientX - stageRect.left;
      const y = e.clientY - stageRect.top;
      state.x = Math.max(ITEM_SIZE / 2, Math.min(x, STAGE_W - ITEM_SIZE / 2));
      state.y = Math.max(ITEM_SIZE / 2, Math.min(y, STAGE_H - ITEM_SIZE / 2));
      this._render(state);

      const dzRect = dz.getBoundingClientRect();
      const over = e.clientX >= dzRect.left && e.clientX <= dzRect.right &&
                   e.clientY >= dzRect.top  && e.clientY <= dzRect.bottom;
      dz.classList.toggle('hover', over);
    };

    const onMouseUp = (e) => {
      document.removeEventListener('mousemove', onMouseMove);
      state.el.classList.remove('dragging');
      dz.classList.remove('visible', 'hover');

      const dzRect = dz.getBoundingClientRect();
      const over = e.clientX >= dzRect.left && e.clientX <= dzRect.right &&
                   e.clientY >= dzRect.top  && e.clientY <= dzRect.bottom;

      if (over) {
        this.removeItem(id);
      } else {
        // 물리 재개 (새 속도 부여)
        state.frozen = false;
        const sign = () => (Math.random() < 0.5 ? 1 : -1);
        state.vx = sign() * (0.04 + Math.random() * 0.08);
        state.vy = sign() * (0.03 + Math.random() * 0.06);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
  }

  // ── 매 프레임 물리 업데이트 ──────────────────────────────
  update(dt) {
    for (const state of this.items.values()) {
      if (state.frozen) continue;

      state.x += state.vx * dt;
      state.y += state.vy * dt;
      state.angle += state.w * dt;

      const half = ITEM_SIZE / 2;
      if (state.x < half) {
        state.x = half;
        state.vx = Math.abs(state.vx);
      } else if (state.x > STAGE_W - half) {
        state.x = STAGE_W - half;
        state.vx = -Math.abs(state.vx);
      }
      if (state.y < half) {
        state.y = half;
        state.vy = Math.abs(state.vy);
      } else if (state.y > STAGE_H - half) {
        state.y = STAGE_H - half;
        state.vy = -Math.abs(state.vy);
      }

      state.driftTimer += dt;
      if (state.driftTimer >= state.driftInterval) {
        state.driftTimer = 0;
        state.driftInterval = 2000 + Math.random() * 3000;
        const sign = () => (Math.random() < 0.5 ? 1 : -1);
        state.vx += sign() * Math.random() * 0.02;
        state.vy += sign() * Math.random() * 0.02;
        const maxV = 0.15;
        const spd = Math.sqrt(state.vx ** 2 + state.vy ** 2);
        if (spd > maxV) {
          state.vx = (state.vx / spd) * maxV;
          state.vy = (state.vy / spd) * maxV;
        }
      }

      this._render(state);
    }
  }

  _render(state) {
    state.el.style.left      = `${Math.round(state.x - ITEM_SIZE / 2)}px`;
    state.el.style.top       = `${Math.round(state.y - ITEM_SIZE / 2)}px`;
    state.el.style.transform = `rotate(${state.angle.toFixed(1)}deg)`;
  }

  removeItem(id) {
    const state = this.items.get(id);
    if (!state) return;
    state.el.remove();
    this.items.delete(id);
  }
}

function _emojiFor(assetKey) {
  const map = {
    'soccer-ball': '⚽',
    'juice-pack':  '🧃',
    'socks':       '🧦',
    'apple':       '🍎',
    'pencil':      '✏️',
  };
  return map[assetKey] ?? '📦';
}
