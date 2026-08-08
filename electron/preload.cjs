const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexus', {
  models: () => ipcRenderer.invoke('ollama:models'),
  chat: (payload) => ipcRenderer.invoke('ollama:chat', payload),
});
