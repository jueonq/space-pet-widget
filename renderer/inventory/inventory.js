'use strict';

// 인벤토리 아이템 목록 (assetKey: assets/items/ 폴더의 파일명)
// 이미지가 없으면 자동으로 이모지 표시
const ITEMS = [
  { assetKey: 'soccer-ball', label: '축구공',   emoji: '⚽' },
  { assetKey: 'juice-pack',  label: '팩음료수', emoji: '🧃' },
  { assetKey: 'sock',        label: '양말',     emoji: '🧦' },
  { assetKey: 'pencil',      label: '연필',     emoji: '✏️' },
];

// ── 그리드 렌더링 ──────────────────────────────────────────
const grid = document.getElementById('item-grid');

ITEMS.forEach((item) => {
  const slot = document.createElement('div');
  slot.className = 'inv-slot';
  slot.dataset.assetKey = item.assetKey;

  const img = document.createElement('img');
  img.src = `../../assets/items/${item.assetKey}.png`;
  img.alt = item.label;
  img.onerror = () => {
    img.remove();
    const emojiEl = document.createElement('span');
    emojiEl.style.fontSize = '28px';
    emojiEl.textContent = item.emoji;
    slot.insertBefore(emojiEl, slot.firstChild);
  };

  const name = document.createElement('span');
  name.className = 'item-name';
  name.textContent = item.label;

  slot.appendChild(img);
  slot.appendChild(name);
  grid.appendChild(slot);

  // ── 드래그 시작 ──────────────────────────────────────────
  slot.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();

    slot.classList.add('dragging');

    const itemData = {
      id: `${item.assetKey}-${Date.now()}`,
      assetKey: item.assetKey,
      label: item.label,
    };

    // 메인 프로세스에 드래그 시작 알림 → 고스트 창 생성
    window.electronAPI.dragItemStart(itemData);

    const onMouseMove = (e) => {
      window.electronAPI.dragItemMove({ x: e.screenX, y: e.screenY });
    };

    const onMouseUp = (e) => {
      slot.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // 드롭 위치 전달 → 위젯 창에 아이템 배치
      window.electronAPI.dragItemEnd({
        x: e.screenX,
        y: e.screenY,
        itemData,
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
});

// ── 닫기 버튼 ────────────────────────────────────────────
document.getElementById('btn-close-inv').addEventListener('click', () => {
  window.electronAPI.closeInventory();
});
