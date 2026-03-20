const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 인벤토리 창 토글
  toggleInventory: () => ipcRenderer.send('toggle-inventory'),
  closeInventory: () => ipcRenderer.send('close-inventory'),

  // 아이템 드래그 (인벤토리 → 위젯)
  dragItemStart: (itemData) => ipcRenderer.send('drag-item-start', itemData),
  dragItemMove: (pos) => ipcRenderer.send('drag-item-move', pos),
  dragItemEnd: (data) => ipcRenderer.send('drag-item-end', data),
  dragItemCancel: () => ipcRenderer.send('drag-item-cancel'),

  // 아이템 위치 저장
  saveItemPosition: (id, x, y) => ipcRenderer.send('save-item-position', { id, x, y }),

  // 아이템 배치 완료 알림 (위젯 → 메인)
  notifyItemPlaced: (itemData) => ipcRenderer.send('item-placed', itemData),

  // 아이템 제거
  removeItem: (id) => ipcRenderer.send('remove-item', id),

  // 배치된 아이템 목록 조회
  getPlacedItems: () => ipcRenderer.invoke('get-placed-items'),

  // 메인 → 위젯: 아이템 배치 이벤트 수신
  onPlaceItem: (callback) => ipcRenderer.on('place-item', (_, data) => callback(data)),
  onItemRemoved: (callback) => ipcRenderer.on('item-removed', (_, id) => callback(id)),

  // 고스트 창 아이템 데이터 수신
  onGhostItemData: (callback) => ipcRenderer.on('ghost-item-data', (_, data) => callback(data)),

  // 앱 종료
  quitApp: () => ipcRenderer.send('quit-app'),
});
