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
        electron: process.versions.electron
    },

    // Verificar si está en Electron
    isElectron: true,

    // Métodos de autenticación persistente
    auth: {
        save: (data) => ipcRenderer.invoke('auth:save', data),
        get: () => ipcRenderer.invoke('auth:get'),
        clear: () => ipcRenderer.invoke('auth:clear')
    },

    // Método para refrescar el foco de la ventana (soluciona bug de diálogos nativos)
    refreshWindowFocus: () => ipcRenderer.invoke('window:refreshFocus'),

    // Listener para evento de cierre de la app
    onBeforeQuit: (callback) => ipcRenderer.on('app:before-quit', callback)
});

// Indicar que la app se ejecuta en Electron (para detección en el frontend)
window.addEventListener('DOMContentLoaded', () => {
    console.log('🖥️ JW Mantto Desktop cargado');

    // Add electron-app class for CSS styling
    document.body.classList.add('electron-app');

    // WORKAROUND: Interceptar confirm() y alert() para refrescar el foco después
    // Esto soluciona el bug de Electron donde los inputs dejan de funcionar después de diálogos nativos
    console.log('🔵 [PRELOAD] Configurando interceptores de confirm/alert...');

    const originalConfirm = window.confirm;
    window.confirm = function (message) {
        console.log('🔵 [PRELOAD] ===== CONFIRM INTERCEPTADO =====');
        console.log('🔵 [PRELOAD] Mensaje:', message);
        const result = originalConfirm.call(window, message);
        console.log('🔵 [PRELOAD] Resultado confirm:', result);
        console.log('🔵 [PRELOAD] Llamando window:refreshFocus...');
        // Llamar al proceso principal para hacer blur/focus de la ventana
        ipcRenderer.invoke('window:refreshFocus').then(res => {
            console.log('🔵 [PRELOAD] Respuesta de refreshFocus:', res);
        }).catch(err => {
            console.warn('❌ [PRELOAD] Error refrescando foco:', err);
        });
        return result;
    };

    const originalAlert = window.alert;
    window.alert = function (message) {
        console.log('🔵 [PRELOAD] ===== ALERT INTERCEPTADO =====');
        console.log('🔵 [PRELOAD] Mensaje:', message);
        originalAlert.call(window, message);
        console.log('🔵 [PRELOAD] Llamando window:refreshFocus...');
        ipcRenderer.invoke('window:refreshFocus').then(res => {
            console.log('🔵 [PRELOAD] Respuesta de refreshFocus:', res);
        }).catch(err => {
            console.warn('❌ [PRELOAD] Error refrescando foco:', err);
        });
    };

    console.log('✅ [PRELOAD] Interceptores de confirm/alert configurados');
});
