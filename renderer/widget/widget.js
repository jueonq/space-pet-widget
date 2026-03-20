'use strict';

// ─── 설정 ────────────────────────────────────────────────
const WIDGET_WIDTH  = 400;
const WIDGET_HEIGHT = 300;
const TOOLBAR_H     = 30;
const STAGE_HEIGHT  = WIDGET_HEIGHT - TOOLBAR_H; // 270

// 스프라이트시트 설정 (이미지 교체 시 여기만 수정)
const SPRITE_CONFIG = {
  // frameCount: 1 (단일 포즈 이미지)
  // frameWidth/frameHeight: 화면에 표시될 크기 (실제 이미지 해상도와 무관)
  // flipEnabled: false = 정면 이미지는 방향 무관하게 반전하지 않음
  idle: { path: '../../assets/sprites/character-idle.png', frameCount: 1, frameWidth: 128, frameHeight: 128, flipEnabled: false },
  walk: { path: '../../assets/sprites/character-walk.png', frameCount: 1, frameWidth: 128, frameHeight: 128, flipEnabled: true  },
};

// ─── 초기화 ───────────────────────────────────────────────
const characterCanvas = document.getElementById('character-canvas');
const itemLayer       = document.getElementById('item-layer');
const deleteZone      = document.getElementById('delete-zone');
const btnInventory    = document.getElementById('btn-inventory');
const btnClose        = document.getElementById('btn-close');

// 배경 이미지 슬롯 (파일 없으면 숨김)
['bg-space', 'bg-interior'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onerror = () => el.classList.add('hidden');
});

// ─── 우주선 흔들림 ────────────────────────────────────────
const bgInterior = document.getElementById('bg-interior');

function scheduleShake() {
  const delay = 15000 + Math.random() * 25000; // 15~40초 간격
  setTimeout(() => {
    if (!bgInterior || bgInterior.classList.contains('hidden')) {
      scheduleShake();
      return;
    }
    bgInterior.classList.remove('shaking');
    void bgInterior.offsetWidth; // reflow → animation 재발동
    bgInterior.classList.add('shaking');
    bgInterior.addEventListener('animationend', () => {
      bgInterior.classList.remove('shaking');
      scheduleShake();
    }, { once: true });
  }, delay);
}
scheduleShake();

// ─── 캐릭터 + 아이템 ──────────────────────────────────────
const animator    = new SpriteAnimator(characterCanvas, 120);
const bounds      = { width: WIDGET_WIDTH, height: STAGE_HEIGHT };
const character   = new Character(characterCanvas, animator, bounds);
const itemManager = new ItemManager(itemLayer, deleteZone);

Object.entries(SPRITE_CONFIG).forEach(([state, cfg]) => {
  animator.register(state, cfg.path, cfg.frameCount, cfg.frameWidth, cfg.frameHeight, cfg.flipEnabled);
});
animator.setAnimation('idle', true);

// ─── 게임 루프 ────────────────────────────────────────────
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  character.update(dt);
  itemManager.update(dt);
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

// ─── 인벤토리 패널 아이템 정의 ──────────────────────────
const INVENTORY_ITEMS = [
  { assetKey: 'soccer-ball', emoji: '⚽' },
  { assetKey: 'juice-pack',  emoji: '🧃' },
  { assetKey: 'socks',       emoji: '🧦' },
  { assetKey: 'apple',       emoji: '🍎' },
  { assetKey: 'pensil',      emoji: '✏️' },
  { assetKey: 'poop',        emoji: '💩' },
  { assetKey: 'plant',       emoji: '🌱' },
];

// 패널 아이템 슬롯 생성
const invPanel = document.getElementById('inventory-panel');
INVENTORY_ITEMS.forEach((item) => {
  const slot = document.createElement('div');
  slot.className = 'inv-slot';

  const img = document.createElement('img');
  img.src = `../../assets/items/${item.assetKey}.png`;
  img.alt = item.assetKey;
  img.onerror = () => {
    img.remove();
    slot.classList.add('inv-fallback');
    slot.textContent = item.emoji;
  };
  slot.appendChild(img);
  invPanel.appendChild(slot);

  // 인벤토리 → 스테이지 드래그
  slot.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // 고스트 엘리먼트 생성
    const ghost = document.createElement('div');
    ghost.id = 'inv-drag-ghost';
    const ghostImg = document.createElement('img');
    ghostImg.src = img.src;
    ghostImg.alt = item.assetKey;
    ghostImg.onerror = () => {
      ghostImg.remove();
      ghost.textContent = item.emoji;
      ghost.style.fontSize = '32px';
    };
    ghost.appendChild(ghostImg);
    document.body.appendChild(ghost);
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top  = `${e.clientY}px`;

    const onMouseMove = (ev) => {
      ghost.style.left = `${ev.clientX}px`;
      ghost.style.top  = `${ev.clientY}px`;
    };

    const onMouseUp = (ev) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      ghost.remove();

      // 스테이지 기준 좌표 계산 후 아이템 배치
      const stageEl = document.getElementById('stage');
      const rect = stageEl.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        itemManager.addItem({
          id: `${item.assetKey}-${Date.now()}`,
          assetKey: item.assetKey,
          x,
          y,
        });
      }
      closePanel();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
});

// ─── 인벤토리 패널 토글 ──────────────────────────────────
function openPanel() {
  invPanel.classList.add('open');
}
function closePanel() {
  invPanel.classList.remove('open');
}

btnInventory.addEventListener('click', (e) => {
  e.stopPropagation();
  if (invPanel.classList.contains('open')) {
    closePanel();
  } else {
    openPanel();
  }
});

// 패널 외부 클릭 → 닫기
document.addEventListener('mousedown', (e) => {
  if (!invPanel.classList.contains('open')) return;
  if (!invPanel.contains(e.target) && e.target !== btnInventory) {
    closePanel();
  }
});

// ─── 종료 버튼 ───────────────────────────────────────────
btnClose.addEventListener('click', () => {
  window.electronAPI.quitApp();
});
