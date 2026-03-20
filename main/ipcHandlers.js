const { ipcMain, BrowserWindow, screen } = require('electron');
const path = require('path');

function registerHandlers(widgetWindow, inventoryWindow, getGhost, setGhost) {
  // 인벤토리 창 토글
  ipcMain.on('toggle-inventory', () => {
    if (!inventoryWindow) return;
    if (inventoryWindow.isVisible()) {
      inventoryWindow.hide();
    } else {
      // 위젯 창 근처에 인벤토리 표시
      const [wx, wy] = widgetWindow.getPosition();
      inventoryWindow.setPosition(wx - 350, wy);
      inventoryWindow.show();
    }
  });

  ipcMain.on('close-inventory', () => {
    if (inventoryWindow) inventoryWindow.hide();
  });

  // 아이템 드래그 시작 → 고스트 창 생성
  ipcMain.on('drag-item-start', (event, itemData) => {
    if (getGhost()) return;

    const ghostWin = new BrowserWindow({
      width: 72,
      height: 72,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    ghostWin.setIgnoreMouseEvents(true, { forward: true });
    ghostWin.loadFile(path.join(__dirname, '../renderer/ghost/index.html'));
    ghostWin.webContents.once('did-finish-load', () => {
      ghostWin.webContents.send('ghost-item-data', itemData);
    });
    setGhost(ghostWin);
  });

  // 고스트 창 이동
  ipcMain.on('drag-item-move', (event, { x, y }) => {
    const ghost = getGhost();
    if (ghost) ghost.setPosition(Math.round(x - 36), Math.round(y - 36));
  });

  // 아이템 드롭 → 위젯 창에 아이템 배치
  ipcMain.on('drag-item-end', (event, { x, y, itemData }) => {
    const ghost = getGhost();
    if (ghost) {
      ghost.close();
      setGhost(null);
    }

    // 위젯 창의 절대 좌표 기준으로 상대 좌표 계산
    const [wx, wy] = widgetWindow.getPosition();
    const relX = x - wx;
    const relY = y - wy;

    // 위젯 창 내에 드롭된 경우에만 배치
    const [ww, wh] = widgetWindow.getSize();
    if (relX >= 0 && relX <= ww && relY >= 0 && relY <= wh) {
      widgetWindow.webContents.send('place-item', { ...itemData, x: relX, y: relY });
    }
  });

  // 아이템 드래그 취소
  ipcMain.on('drag-item-cancel', () => {
    const ghost = getGhost();
    if (ghost) {
      ghost.close();
      setGhost(null);
    }
  });

  // 아이템 위치 저장
  ipcMain.on('save-item-position', (event, { id, x, y }) => {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const items = store.get('placedItems', []);
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) {
        items[idx].x = x;
        items[idx].y = y;
        store.set('placedItems', items);
      }
    } catch (e) {}
  });

  // 배치된 아이템 목록 조회
  ipcMain.handle('get-placed-items', () => {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get('placedItems', []);
    } catch (e) {
      return [];
    }
  });

  // 아이템 배치 저장 (위젯에서 drop 완료 후)
  ipcMain.on('item-placed', (event, itemData) => {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const items = store.get('placedItems', []);
      // 중복 방지
      if (!items.find(i => i.id === itemData.id)) {
        items.push(itemData);
        store.set('placedItems', items);
      }
    } catch (e) {}
  });

  // 아이템 제거
  ipcMain.on('remove-item', (event, id) => {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const items = store.get('placedItems', []).filter(i => i.id !== id);
      store.set('placedItems', items);
    } catch (e) {}
    widgetWindow.webContents.send('item-removed', id);
  });

  // 앱 종료
  ipcMain.on('quit-app', () => {
    const { app } = require('electron');
    app.quit();
  });
}

module.exports = { registerHandlers };
