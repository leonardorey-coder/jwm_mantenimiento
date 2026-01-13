/**
 * JW Mantto - Electron Preload Script
 * Proporciona un puente seguro entre el proceso de renderizado y el principal
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  // Información de la plataforma
  platform: process.platform,

  // Versiones
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // Verificar si está en Electron
  isElectron: true,

  // Métodos de autenticación persistente
  auth: {
    save: (data) => ipcRenderer.invoke('auth:save', data),
    get: () => ipcRenderer.invoke('auth:get'),
    clear: () => ipcRenderer.invoke('auth:clear'),
  },

  // Métodos para verificar actualizaciones
  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
  },

  // Métodos para abrir URLs externas
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Dialogos nativos del proceso principal (sincronicos)
  dialog: {
    alert: (message, options = {}) =>
      ipcRenderer.sendSync('dialog:alert', { message, ...options }),
    confirm: (message, options = {}) =>
      ipcRenderer.sendSync('dialog:confirm', { message, ...options }),
  },

  // Listener para evento de cierre de la app
  onBeforeQuit: (callback) => ipcRenderer.on('app:before-quit', callback),
});

// Reemplazar confirm/alert por dialogos nativos del main
window.confirm = function (message) {
  return ipcRenderer.sendSync('dialog:confirm', { message });
};

window.alert = function (message) {
  ipcRenderer.sendSync('dialog:alert', { message });
};

// Indicar que la app se ejecuta en Electron (para detección en el frontend)
window.addEventListener('DOMContentLoaded', () => {
  console.log('🖥️ JW Mantto Desktop cargado');

  // Add electron-app class for CSS styling
  document.body.classList.add('electron-app');
});
