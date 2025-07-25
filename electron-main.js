const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const database = require('./electron-database');

// Mantener referencia global de la ventana
let mainWindow;
let serverProcess;

// Función para limpiar procesos previos
function limpiarProcesosPrevios() {
    return new Promise((resolve) => {
        console.log('🧹 Limpiando procesos previos...');
        
        // Usar el comando específico para limpiar puerto 3001
        exec('lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No hay procesos en puerto 3001"', (error, stdout, stderr) => {
            if (stdout) console.log(stdout.trim());
            
            // Matar procesos de servidor Node.js específicos
            exec('pkill -f "node.*server.js" 2>/dev/null || echo "No hay procesos de server.js"', (error, stdout, stderr) => {
                if (stdout) console.log(stdout.trim());
                
                console.log('✅ Procesos previos limpiados');
                setTimeout(resolve, 1000); // Esperar 1 segundo para asegurar limpieza
            });
        });
    });
}

function createWindow() {
    console.log('Iniciando aplicación Electron...');
    
    // Crear la ventana del navegador
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,  // Habilitar para IPC
            contextIsolation: false, // Deshabilitar para acceso directo a IPC
            enableRemoteModule: false,
            webSecurity: false // Permitir CORS para localhost
        },
        icon: path.join(__dirname, 'icons/icon-512x512.png'),
        titleBarStyle: 'default',
        show: true // Mostrar inmediatamente para evitar problemas con ejecutables
    });

    console.log('Ventana creada, cargando aplicación offline...');

    // Cargar directamente el archivo HTML sin servidor Express
    loadLocalApplication();

    // Mostrar ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
        console.log('Ventana lista para mostrar');
        mainWindow.show();
        mainWindow.focus(); // Asegurar que la ventana tenga foco
        
        // Abrir DevTools para debugging startup
        console.log('🔧 Abriendo DevTools para debugging...');
        mainWindow.webContents.openDevTools();
    });

    // Forzar mostrar ventana después de un timeout por si acaso
    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            console.log('Forzando mostrar ventana...');
            mainWindow.show();
            mainWindow.focus();
        }
    }, 3000);

    // Log de errores de carga
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Error cargando página:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Página cargada exitosamente');
    });

    // Escuchar mensajes de consola del frontend para debugging
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const logLevel = ['VERBOSE', 'INFO', 'WARNING', 'ERROR'][level] || 'UNKNOWN';
        console.log(`Frontend [${logLevel}]: ${message} (${sourceId}:${line})`);
    });

    // Emitido cuando la ventana se cierra
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (serverProcess) {
            console.log('🛑 Cerrando servidor...');
            serverProcess.kill('SIGTERM');
            
            // Si no se cierra en 3 segundos, forzar cierre
            setTimeout(() => {
                if (serverProcess && !serverProcess.killed) {
                    console.log('⚠️ Forzando cierre del servidor...');
                    serverProcess.kill('SIGKILL');
                }
            }, 3000);
        }
    });

    // Configurar menú de aplicación
    const template = [
        {
            label: 'Aplicación',
            submenu: [
                {
                    label: 'Acerca de JW Mantto',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Acerca de JW Mantto',
                            message: 'JW Mantto v1.1.0',
                            detail: 'Sistema de Mantenimiento de Cuartos\nJW Marriott'
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Recargar',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Alternar DevTools',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Salir',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                {
                    label: 'Pantalla Completa',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                {
                    label: 'Zoom +',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomFactor();
                        mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
                    }
                },
                {
                    label: 'Zoom -',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomFactor();
                        mainWindow.webContents.setZoomFactor(currentZoom - 0.1);
                    }
                },
                {
                    label: 'Zoom Reset',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.setZoomFactor(1.0);
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function startServer() {
    console.log('Intentando cargar aplicación...');
    
    // Usar puerto dinámico para evitar conflictos
    const port = process.env.ELECTRON_SERVER_PORT || 3001;
    
    // Función para cargar el archivo local como fallback
    const loadLocalFile = () => {
        console.log('Cargando archivo local index.html...');
        const indexPath = path.join(__dirname, 'index.html');
        console.log('Ruta del archivo:', indexPath);
        
        mainWindow.loadFile('index.html').then(() => {
            console.log('Archivo local cargado exitosamente');
        }).catch((error) => {
            console.error('Error cargando archivo local:', error);
            // Si incluso el archivo local falla, crear una página de error básica
            const errorHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>JW Mantto - Error de Carga</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 50px;
                            background-color: #f5f5f5;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background: white;
                            padding: 40px;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        .error { color: #d32f2f; margin: 20px 0; }
                        .info { color: #1976d2; margin-top: 20px; }
                        button {
                            background: #3498db;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                        }
                        button:hover { background: #2980b9; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🏨 JW Mantto</h1>
                        <h2>Sistema de Mantenimiento</h2>
                        <div class="error">
                            <h3>⚠️ Error de Carga</h3>
                            <p>No se pudo cargar la aplicación correctamente.</p>
                        </div>
                        <div class="info">
                            <p>Por favor, reinicia la aplicación o contacta al administrador del sistema.</p>
                            <button onclick="location.reload()">🔄 Reintentar</button>
                        </div>
                    </div>
                </body>
                </html>
            `;
            mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
        });
    };

    // Intentar cargar desde servidor HTTP primero
    const loadFromServer = () => {
        const url = `http://localhost:${port}?nocache=${Date.now()}`;
        console.log(`Cargando aplicación desde ${url}`);
        mainWindow.loadURL(url).then(() => {
            console.log('Aplicación cargada desde servidor exitosamente');
        }).catch((error) => {
            console.error('Error cargando desde servidor:', error);
            loadLocalFile();
        });
    };

    // Intentar iniciar servidor primero
    try {
        const serverPath = path.join(__dirname, 'server.js');
        console.log('Iniciando servidor desde:', serverPath);
        
        serverProcess = spawn('node', [serverPath], {
            cwd: __dirname,
            stdio: 'pipe',
            env: { ...process.env, PORT: port }
        });

        let serverReady = false;
        let hasLoaded = false;

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Server: ${output}`);
            
            // Cuando el servidor esté listo, cargar desde servidor
            if ((output.includes('Servidor ejecutándose') || output.includes('usando datos mock')) && !serverReady && !hasLoaded) {
                serverReady = true;
                hasLoaded = true;
                setTimeout(() => {
                    loadFromServer();
                }, 1500);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            console.error(`Server Error: ${errorOutput}`);
        });

        serverProcess.on('close', (code) => {
            console.log(`Server process closed with code ${code}`);
        });

        serverProcess.on('error', (error) => {
            console.error('Error iniciando servidor:', error);
            if (!hasLoaded) {
                hasLoaded = true;
                loadLocalFile();
            }
        });

        // Timeout de seguridad - si después de 8 segundos no hay servidor, usar archivo local
        setTimeout(() => {
            if (!serverReady && !hasLoaded) {
                console.log('Timeout del servidor, usando archivo local...');
                hasLoaded = true;
                loadLocalFile();
            }
        }, 8000);

    } catch (error) {
        console.error('Error al intentar iniciar servidor:', error);
        loadLocalFile();
    }
}

// Este método será llamado cuando Electron haya terminado la inicialización
app.whenReady().then(async () => {
    console.log('🚀 Iniciando aplicación Electron...');
    
    // Inicializar base de datos offline
    console.log('💾 Inicializando base de datos offline...');
    try {
        await database.init();
        console.log('✅ Base de datos offline lista');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
    }
    
    // Registrar manejadores IPC
    console.log('🎯 Manejadores IPC registrados para modo offline');
    setupIpcHandlers();
    
    await limpiarProcesosPrevios();
    createWindow();
});

/**
 * Configurar manejadores IPC para comunicación con el renderer
 */
function setupIpcHandlers() {
    // Obtener cuartos
    ipcMain.handle('get-cuartos', async () => {
        try {
            return await database.getCuartos();
        } catch (error) {
            console.error('Error IPC get-cuartos:', error);
            throw error;
        }
    });
    
    // Obtener edificios
    ipcMain.handle('get-edificios', async () => {
        try {
            return await database.getEdificios();
        } catch (error) {
            console.error('Error IPC get-edificios:', error);
            throw error;
        }
    });
    
    // Obtener mantenimientos
    ipcMain.handle('get-mantenimientos', async () => {
        try {
            return await database.getMantenimientos();
        } catch (error) {
            console.error('Error IPC get-mantenimientos:', error);
            throw error;
        }
    });
    
    // Crear mantenimiento
    ipcMain.handle('create-mantenimiento', async (event, mantenimiento) => {
        try {
            return await database.createMantenimiento(mantenimiento);
        } catch (error) {
            console.error('Error IPC create-mantenimiento:', error);
            throw error;
        }
    });
    
    // Eliminar mantenimiento
    ipcMain.handle('delete-mantenimiento', async (event, id) => {
        try {
            return await database.deleteMantenimiento(id);
        } catch (error) {
            console.error('Error IPC delete-mantenimiento:', error);
            throw error;
        }
    });
    
    // Verificar estado de la base de datos
    ipcMain.handle('database-status', async () => {
        try {
            // Verificar que la base de datos esté inicializada
            const cuartos = await database.getCuartos();
            return {
                status: 'connected',
                message: 'Base de datos offline conectada',
                cuartos_count: cuartos.length,
                initialized: true,
                isReady: true // Esta es la propiedad que verifica el frontend
            };
        } catch (error) {
            console.error('Error verificando estado de base de datos:', error);
            return {
                status: 'error',
                message: error.message,
                initialized: false,
                isReady: false
            };
        }
    });
}

/**
 * Cargar aplicación local sin servidor Express
 */
function loadLocalApplication() {
    console.log('📁 Cargando aplicación offline...');
    
    // Cargar index.html directamente - la detección de entorno hará el resto
    mainWindow.loadFile('index.html')
        .then(() => {
            console.log('✅ Aplicación principal offline cargada exitosamente');
        })
        .catch((error) => {
            console.error('❌ Error cargando aplicación offline:', error);
            
            // Último recurso: página de error inline
            const errorPage = `
                <!DOCTYPE html>
                <html>
                <head><title>Error - JW Mantto</title></head>
                <body style="font-family:Arial;text-align:center;padding:50px;">
                    <h1>🏨 JW Mantto</h1>
                    <h2>❌ Error de Carga</h2>
                    <p>No se pudo cargar la aplicación</p>
                    <pre style="background:#f0f0f0;padding:10px;">${error.message}</pre>
                </body>
                </html>
            `;
            mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorPage)}`);
        });
}

// Salir cuando todas las ventanas se cierren
app.on('window-all-closed', () => {
    // En macOS, es común que las aplicaciones y su barra de menú permanezcan activas
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // En macOS, es común recrear una ventana cuando el ícono del dock se clickea
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// En este archivo puedes incluir el resto del código específico del proceso principal
// También puedes ponerlos en archivos separados y requerirlos aquí.
