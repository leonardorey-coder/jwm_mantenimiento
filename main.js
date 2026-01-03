/**
 * JW Mantto - Electron Main Process
 * Entry point para la aplicación de escritorio
 */

const fs = require('fs/promises');
const path = require('path');
const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const express = require('express');
const cors = require('cors');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

// También cargar .env.local si existe (para desarrollo)
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let server;
let serverPort;
let isQuitting = false;

/**
 * Gestión de almacenamiento persistente para Auth (Tokens)
 * Necesario porque el puerto dinámico cambia el origen y borra localStorage
 */
const authDataPath = path.join(app.getPath('userData'), 'auth-data.json');

async function saveAuthData(data) {
  try {
    await fs.writeFile(authDataPath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error guardando auth data:', error);
    return { success: false, error: error.message };
  }
}

async function getAuthData() {
  try {
    const data = await fs.readFile(authDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Si no existe el archivo, no es error, solo no hay datos
    if (error.code !== 'ENOENT') {
      console.error('Error leyendo auth data:', error);
    }
    return null;
  }
}

async function clearAuthData() {
  try {
    await fs.unlink(authDataPath);
    return { success: true };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error borrando auth data:', error);
    }
    return { success: false };
  }
}

/**
 * Inicia el servidor Express local con archivos estáticos y API
 */
async function startServer() {
  return new Promise((resolve, reject) => {
    try {
      // Crear servidor Express para Electron
      const electronApp = express();

      // Configurar CORS
      electronApp.use(
        cors({
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
          ],
        })
      );

      // Servir archivos estáticos desde el directorio raíz
      electronApp.use(
        express.static(__dirname, {
          index: 'index.html',
          extensions: ['html', 'htm'],
        })
      );

      // Montar las rutas de la API (ya tienen prefijo /api en api/index.js)
      const apiRoutes = require('./api/index.js');
      electronApp.use(apiRoutes);

      // Ruta catch-all para SPA (si no encuentra archivo, servir index.html)
      electronApp.get('*', (req, res) => {
        // Si es una ruta de API, dejar que el API maneje el 404
        if (req.path.startsWith('/api/')) {
          return res
            .status(404)
            .json({ error: 'Ruta API no encontrada', path: req.path });
        }
        // Para otras rutas, servir index.html
        res.sendFile(path.join(__dirname, 'index.html'));
      });

      // Usar puerto dinámico para evitar conflictos
      const port = process.env.ELECTRON_PORT || 0;

      server = electronApp.listen(port, 'localhost', () => {
        serverPort = server.address().port;
        console.log(`🚀 Servidor Express iniciado en puerto ${serverPort}`);
        console.log(`📂 Sirviendo archivos desde: ${__dirname}`);
        resolve(serverPort);
      });

      server.on('error', (error) => {
        console.error('❌ Error iniciando servidor:', error);
        reject(error);
      });
    } catch (error) {
      console.error('❌ Error cargando aplicación Express:', error);
      reject(error);
    }
  });
}

/**
 * Cierra todas las conexiones y recursos de forma limpia
 */
function cleanupAndQuit() {
  if (isQuitting) return;
  isQuitting = true;

  console.log('🛑 Iniciando cierre limpio de la aplicación...');

  // Cerrar ventana principal
  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
    console.log('✅ Ventana principal cerrada');
  }

  // Cerrar servidor Express
  if (server) {
    console.log('🛑 Cerrando servidor Express...');
    server.close(() => {
      console.log('✅ Servidor Express cerrado');
      app.quit();
    });

    // Fallback: si el servidor no cierra en 3 segundos, forzar quit
    setTimeout(() => {
      console.log('⚠️ Forzando cierre después de timeout...');
      app.quit();
    }, 3000);
  } else {
    app.quit();
  }
}

/**
 * Crea la ventana principal de la aplicación
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    minWidth: 400,
    minHeight: 550,
    icon: path.join(__dirname, 'icons/icon.ico'), // ICO con múltiples tamaños para Windows y macOS
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev, // Added devTools based on isDev
    },
    frame: false, // Sin bordes nativos
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000', // Transparente
      symbolColor: '#1E1E1E', // Oscuro para login
      height: 32,
    },
    show: false, // No mostrar hasta que esté lista
    backgroundColor: '#f5f5f5', // Updated background color
    resizable: true,
    center: true,
  });

  // Cargar la página de login primero
  const startUrl = `http://localhost:${serverPort}/login.html`;
  console.log(`🌐 Cargando: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  // Mostrar cuando esté listo para evitar flash blanco
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Escuchar navegación para redimensionar ventana según la página
  mainWindow.webContents.on('did-navigate-in-page', (event, url) => {
    resizeForPage(url);
  });

  mainWindow.webContents.on('did-navigate', (event, url) => {
    resizeForPage(url);
  });

  // Abrir links externos en el navegador por defecto
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('file://')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Cuando se cierra la ventana principal, limpiar y cerrar todo
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      // Notificar al renderer para que cierre IndexedDB
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app:before-quit');
      }
      // Dar tiempo para que IndexedDB cierre, luego cleanup
      setTimeout(() => {
        cleanupAndQuit();
      }, 500);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Menú simplificado (oculto para frameless)
  mainWindow.setMenuBarVisibility(false);
}

/**
 * Aplica titleBarOverlay solo en Windows
 */
function setTitleBarOverlaySafe(options) {
  if (
    process.platform === 'win32' &&
    mainWindow &&
    typeof mainWindow.setTitleBarOverlay === 'function'
  ) {
    mainWindow.setTitleBarOverlay(options);
  }
}

/**
 * Redimensiona la ventana según la página actual
 */
function resizeForPage(url) {
  if (!mainWindow) return;

  if (url.includes('login.html')) {
    // Asegurar que no esté maximizada
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }

    // Configurar título y controles primero
    setTitleBarOverlaySafe({
      color: '#00000000',
      symbolColor: '#1E1E1E',
      height: 32,
    });

    // IMPORTANTE: Primero reducir el tamaño mínimo para permitir que setSize funcione
    mainWindow.setMinimumSize(400, 550);
    mainWindow.setResizable(true);

    // Ahora sí cambiar el tamaño
    mainWindow.setSize(400, 700);
    mainWindow.center();
    mainWindow.focus(); // Asegurar que la ventana recupere el foco para UI interactiva
  } else if (url.includes('index.html') || url.endsWith('/')) {
    // Tamaño completo para dashboard
    mainWindow.setSize(1400, 900);
    mainWindow.setMinimumSize(1024, 768);
    mainWindow.center();
    mainWindow.maximize();
    // Titlebar transparente con símbolos blancos para index
    setTitleBarOverlaySafe({
      color: '#00000000',
      symbolColor: '#FFFFFF',
      height: 32,
    });
  }
}

/**
 * Fuerza el foco en la ventana principal luego de un dialog nativo
 */
function refocusMainWindow() {
  if (!mainWindow) return;

  // Hack conocido en Windows para traer al frente cuando focus() no alcanza
  mainWindow.setAlwaysOnTop(true);
  mainWindow.show();
  mainWindow.focus();
  if (mainWindow.webContents) {
    mainWindow.webContents.focus();
  }
  setTimeout(() => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(false);
    }
  }, 0);
}

/**
 * Inicialización de la aplicación
 */
app.whenReady().then(async () => {
  try {
    console.log('🚀 Iniciando JW Mantto Desktop...');
    console.log(`📁 Directorio: ${__dirname}`);
    console.log(`🌍 Entorno: ${isDev ? 'development' : 'production'}`);

    // Registrar handlers IPC para Auth
    ipcMain.handle('auth:save', async (event, data) => saveAuthData(data));
    ipcMain.handle('auth:get', async () => getAuthData());
    ipcMain.handle('auth:clear', async () => clearAuthData());

    // Handler para verificar actualizaciones desde GitHub Releases
    ipcMain.handle('updates:check', async () => {
      try {
        const https = require('https');
        const currentVersion = app.getVersion();

        return new Promise((resolve, reject) => {
          const options = {
            hostname: 'api.github.com',
            path: '/repos/leonardorey-coder/jwm_mantenimiento/releases/latest',
            method: 'GET',
            headers: {
              'User-Agent': 'JW-Mantto-App',
              Accept: 'application/vnd.github.v3+json',
            },
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                if (res.statusCode === 404) {
                  resolve({
                    hasUpdate: false,
                    currentVersion,
                    message: 'No hay releases publicados aún',
                  });
                  return;
                }

                const release = JSON.parse(data);
                const latestVersion = release.tag_name.replace('v', '');
                const hasUpdate = latestVersion !== currentVersion;

                resolve({
                  hasUpdate,
                  currentVersion,
                  latestVersion,
                  releaseNotes: release.body || 'Sin notas de la versión',
                  downloadUrl: release.html_url,
                  publishedAt: release.published_at,
                });
              } catch (parseError) {
                resolve({
                  hasUpdate: false,
                  currentVersion,
                  error: 'Error al procesar respuesta',
                });
              }
            });
          });

          req.on('error', (error) => {
            resolve({
              hasUpdate: false,
              currentVersion,
              error: 'Sin conexión a internet',
            });
          });

          req.setTimeout(10000, () => {
            req.destroy();
            resolve({
              hasUpdate: false,
              currentVersion,
              error: 'Tiempo de espera agotado',
            });
          });

          req.end();
        });
      } catch (error) {
        return {
          hasUpdate: false,
          currentVersion: app.getVersion(),
          error: error.message,
        };
      }
    });

    // Handlers para dialogos nativos en el proceso principal
    ipcMain.on('dialog:alert', (event, payload = {}) => {
      const message = String(payload.message || '');
      const options = {
        type: 'info',
        title: payload.title || 'JW Mantto',
        message,
        buttons: ['OK'],
        defaultId: 0,
      };

      if (mainWindow) {
        dialog.showMessageBoxSync(mainWindow, options);
      } else {
        dialog.showMessageBoxSync(options);
      }

      refocusMainWindow();
      event.returnValue = true;
    });

    ipcMain.on('dialog:confirm', (event, payload = {}) => {
      const message = String(payload.message || '');
      const options = {
        type: 'question',
        title: payload.title || 'JW Mantto',
        message,
        buttons: ['Cancelar', 'Aceptar'],
        defaultId: 1,
        cancelId: 0,
      };

      let responseIndex = 0;
      if (mainWindow) {
        responseIndex = dialog.showMessageBoxSync(mainWindow, options);
      } else {
        responseIndex = dialog.showMessageBoxSync(options);
      }

      refocusMainWindow();
      event.returnValue = responseIndex === 1;
    });

    // Verificar variables de entorno críticas
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      console.error(
        '❌ ERROR: No se encontraron variables de entorno para la base de datos.'
      );
      console.error(
        '   Configure DATABASE_URL o DB_HOST, DB_NAME, DB_USER, DB_PASSWORD en .env'
      );
    }

    // Iniciar servidor Express
    await startServer();

    // Crear ventana
    createWindow();
  } catch (error) {
    console.error('❌ Error fatal al iniciar la aplicación:', error);
    app.quit();
  }
});

// Manejar todas las ventanas cerradas
app.on('window-all-closed', () => {
  // No hacer nada aquí, cleanupAndQuit() se encarga de todo
});

// Reactivar en macOS
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
