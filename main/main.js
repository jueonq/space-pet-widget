const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { registerHandlers } = require('./ipcHandlers');

let widgetWindow = null;
let inventoryWindow = null;
let ghostWindow = null;

function createWidgetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // 저장된 위치 불러오기 (store가 준비되기 전일 수 있으므로 try-catch)
  let savedX = width - 420;
  let savedY = height - 320;
  try {
    const Store = require('electron-store');
    const store = new Store();
    const pos = store.get('windowPosition');
    if (pos) {
      savedX = pos.x;
      savedY = pos.y;
    }
  } catch (e) {}

  widgetWindow = new BrowserWindow({
    width: 400,
    height: 300,
    x: savedX,
    y: savedY,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  widgetWindow.setAlwaysOnTop(true, 'floating');
  widgetWindow.loadFile(path.join(__dirname, '../renderer/widget/index.html'));

  // 창 이동 시 위치 저장
  widgetWindow.on('moved', () => {
    const [x, y] = widgetWindow.getPosition();
    try {
      const Store = require('electron-store');
      const store = new Store();
      store.set('windowPosition', { x, y });
    } catch (e) {}
  });

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    widgetWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function createInventoryWindow() {
  inventoryWindow = new BrowserWindow({
    width: 340,
    height: 480,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  inventoryWindow.loadFile(path.join(__dirname, '../renderer/inventory/index.html'));
}

app.whenReady().then(() => {
  createWidgetWindow();
  createInventoryWindow();
  registerHandlers(widgetWindow, inventoryWindow, () => ghostWindow, (w) => { ghostWindow = w; });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWidgetWindow();
      createInventoryWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
