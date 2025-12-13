/**
 * JW Mantto - Electron Main Process
 * Entry point para la aplicación de escritorio
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
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

/**
 * Inicia el servidor Express local con archivos estáticos y API
 */
async function startServer() {
    return new Promise((resolve, reject) => {
        try {
            // Crear servidor Express para Electron
            const electronApp = express();

            // Configurar CORS
            electronApp.use(cors({
                origin: '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
            }));

            // Servir archivos estáticos desde el directorio raíz
            electronApp.use(express.static(__dirname, {
                index: 'index.html',
                extensions: ['html', 'htm']
            }));

            // Montar las rutas de la API (ya tienen prefijo /api en api/index.js)
            const apiRoutes = require('./api/index.js');
            electronApp.use(apiRoutes);

            // Ruta catch-all para SPA (si no encuentra archivo, servir index.html)
            electronApp.get('*', (req, res) => {
                // Si es una ruta de API, dejar que el API maneje el 404
                if (req.path.startsWith('/api/')) {
                    return res.status(404).json({ error: 'Ruta API no encontrada', path: req.path });
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
 * Crea la ventana principal de la aplicación
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 700,
        minWidth: 400,
        minHeight: 550,
        icon: path.join(__dirname, 'icons', 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        frame: false, // Frameless para custom titlebar
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#00000000', // Transparente
            symbolColor: '#1E1E1E', // Oscuro para login
            height: 32
        },
        show: false,
        backgroundColor: '#FFFFFF',
        resizable: true,
        center: true
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

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Menú simplificado (oculto para frameless)
    mainWindow.setMenuBarVisibility(false);
}

/**
 * Redimensiona la ventana según la página actual
 */
function resizeForPage(url) {
    if (!mainWindow) return;

    if (url.includes('login.html')) {
        // Tamaño compacto para login
        mainWindow.setSize(420, 700);
        mainWindow.setMinimumSize(400, 550);
        mainWindow.center();
        // Titlebar transparente con símbolos oscuros para login
        mainWindow.setTitleBarOverlay({
            color: '#00000000',
            symbolColor: '#1E1E1E',
            height: 32
        });
    } else if (url.includes('index.html') || url.endsWith('/')) {
        // Tamaño completo para dashboard
        mainWindow.setSize(1400, 900);
        mainWindow.setMinimumSize(1024, 768);
        mainWindow.center();
        mainWindow.maximize();
        // Titlebar transparente con símbolos blancos para index
        mainWindow.setTitleBarOverlay({
            color: '#00000000',
            symbolColor: '#FFFFFF',
            height: 32
        });
    }
}

/**
 * Inicialización de la aplicación
 */
app.whenReady().then(async () => {
    try {
        console.log('🚀 Iniciando JW Mantto Desktop...');
        console.log(`📁 Directorio: ${__dirname}`);
        console.log(`🌍 Entorno: ${isDev ? 'development' : 'production'}`);

        // Verificar variables de entorno críticas
        if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
            console.error('❌ ERROR: No se encontraron variables de entorno para la base de datos.');
            console.error('   Configure DATABASE_URL o DB_HOST, DB_NAME, DB_USER, DB_PASSWORD en .env');
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

// Cerrar servidor cuando la app se cierre
app.on('before-quit', () => {
    if (server) {
        console.log('🛑 Cerrando servidor Express...');
        server.close();
    }
});

// Manejar todas las ventanas cerradas
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Reactivar en macOS
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
