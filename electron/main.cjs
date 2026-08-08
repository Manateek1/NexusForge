const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const OLLAMA_URL = 'http://127.0.0.1:11434';
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#101116',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#101116', symbolColor: '#e9e9ee', height: 38 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

async function withTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

ipcMain.handle('ollama:models', async () => {
  try {
    const response = await withTimeout(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const data = await response.json();
    return { connected: true, models: data.models || [] };
  } catch (error) {
    return { connected: false, models: [], error: error.message };
  }
});

ipcMain.handle('ollama:chat', async (_event, { model, messages }) => {
  if (!model) throw new Error('Choose a local model before sending a message.');
  const response = await withTimeout(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const data = await response.json();
  return data.message;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
