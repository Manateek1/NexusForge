const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexus', {
  models: () => ipcRenderer.invoke('ollama:models'),
  chat: (payload) => ipcRenderer.invoke('ollama:chat', payload),
  setup: () => ipcRenderer.invoke('ollama:setup'),
  onSetupProgress: (listener) => {
    const callback = (_event, message) => listener(message);
    ipcRenderer.on('ollama:setup-progress', callback);
    return () => ipcRenderer.removeListener('ollama:setup-progress', callback);
  },
});
