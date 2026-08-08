const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen3:14b';
const APP_ICON = path.join(__dirname, '..', 'build', 'icon.ico');
let mainWindow;

if (process.platform === 'win32') app.setAppUserModelId('com.dillonnagar.nexusforge');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#101116',
    icon: APP_ICON,
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

async function withTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function findExecutable(name, preferredPath) {
  if (preferredPath && fs.existsSync(preferredPath)) return preferredPath;
  for (const folder of (process.env.PATH || '').split(path.delimiter)) {
    const candidate = path.join(folder, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function getOllamaExecutable() {
  return findExecutable('ollama.exe', path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'));
}

function getWingetExecutable() {
  return findExecutable('winget.exe', path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'winget.exe'));
}

function sendSetupProgress(event, message) {
  event.sender.send('ollama:setup-progress', message);
}

function runProcess(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let errorOutput = '';
    child.stderr.on('data', (chunk) => { errorOutput = `${errorOutput}${chunk}`.slice(-1200); });
    child.once('error', (error) => reject(error));
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(errorOutput.trim() || `Command exited with code ${code}.`));
    });
  });
}

async function getLocalModels() {
  const response = await withTimeout(`${OLLAMA_URL}/api/tags`);
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const data = await response.json();
  return data.models || [];
}

async function startOllamaServer(ollamaExecutable) {
  try {
    await getLocalModels();
    return;
  } catch {
    const server = spawn(ollamaExecutable, ['serve'], { detached: true, stdio: 'ignore', windowsHide: true });
    server.unref();
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(1000);
    try {
      await getLocalModels();
      return;
    } catch { /* The service is still warming up. */ }
  }
  throw new Error('Ollama installed but its local server did not start. Open Ollama once, then try again.');
}

ipcMain.handle('ollama:models', async () => {
  try {
    return { connected: true, models: await getLocalModels() };
  } catch (error) {
    return { connected: false, models: [], error: error.message };
  }
});

ipcMain.handle('ollama:setup', async (event) => {
  let ollamaExecutable = getOllamaExecutable();
  if (!ollamaExecutable) {
    const wingetExecutable = getWingetExecutable();
    if (!wingetExecutable) {
      await shell.openExternal('https://ollama.com/download/windows');
      throw new Error('WinGet is unavailable, so the official Ollama download page was opened. Complete the install, then click Set up Qwen3 again.');
    }
    sendSetupProgress(event, 'Installing the local Ollama engine...');
    await runProcess(wingetExecutable, [
      'install', '--id', 'Ollama.Ollama', '--exact', '--source', 'winget', '--silent',
      '--accept-package-agreements', '--accept-source-agreements',
    ]);
    ollamaExecutable = getOllamaExecutable();
    if (!ollamaExecutable) throw new Error('Ollama finished installing but was not found. Restart Nexus Forge, then try again.');
  }

  sendSetupProgress(event, 'Starting your local model engine...');
  await startOllamaServer(ollamaExecutable);
  sendSetupProgress(event, 'Downloading Qwen3 14B (about 9.3 GB)...');
  await runProcess(ollamaExecutable, ['pull', DEFAULT_MODEL]);
  sendSetupProgress(event, 'Qwen3 is ready.');
  return { connected: true, models: await getLocalModels(), defaultModel: DEFAULT_MODEL };
});

ipcMain.handle('ollama:chat', async (_event, { model, messages }) => {
  if (!model) throw new Error('Choose a local model before sending a message.');
  const response = await withTimeout(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  }, 10 * 60 * 1000);
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const data = await response.json();
  return data.message;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
