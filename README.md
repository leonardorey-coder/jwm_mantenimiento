# JW Mantto - Sistema de Mantenimiento de Cuartos

Sistema moderno de registro y gestión de mantenimiento de cuartos para hoteles, construido con **Node.js + Electron + SQLite**. Funciona como aplicación de escritorio (Windows, macOS, Linux) y como Progressive Web App (PWA).

> 🎯 **Migrado completamente a Node.js** - Este proyecto fue migrado desde PHP/MySQL a Node.js/SQLite para mayor portabilidad y rendimiento.

## ✨ Características Principales

- 🏨 **Gestión de Cuartos**: Administrar cuartos por edificios
- 🔧 **Mantenimientos**: Registro de mantenimientos normales y rutinas programadas
- 🔔 **Alertas Programadas**: Sistema de notificaciones automáticas
- 💾 **100% Offline**: Funciona sin conexión a internet
- 🖥️ **Aplicación de Escritorio**: Empaquetada con Electron
- 📱 **PWA**: Instalable en dispositivos móviles
- 🗄️ **Base de datos local**: SQLite embebido, sin necesidad de servidor

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** v16 o superior
- **npm** (incluido con Node.js)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/leonardorey-coder/jwm_mantenimiento.git
cd jwm_mantenimiento

# Instalar dependencias
npm install

# Recompilar módulos nativos para Electron
npm rebuild better-sqlite3 --runtime=electron --target=21.4.4 --disturl=https://electronjs.org/headers --abi=109
```

### Ejecutar la Aplicación

#### Modo Desarrollo (Electron + Servidor)

```bash
npm run electron-dev
```

Esto iniciará:
1. Servidor Node.js en `http://localhost:3001`
2. Aplicación Electron con DevTools abiertos

#### Solo Servidor Web (PWA)

```bash
npm start
```

Accede desde el navegador en: `http://localhost:3001`

#### Solo Electron (requiere servidor corriendo)

```bash
npm run electron
```

### Compilar para Producción

#### Compilar para todas las plataformas

```bash
npm run build
```

#### Compilar solo para macOS

```bash
npm run dist -- --mac
```

Los instaladores se generarán en el directorio `/dist`:
- **macOS**: `.dmg` y `.zip` (Intel x64 y Apple Silicon arm64)
- **Windows**: `.exe` (NSIS installer) y `.exe` (portable)
- **Linux**: `.AppImage` y `.deb`

## 📁 Estructura del Proyecto

```
jwm_mant_cuartos/
├── server.js                    # Servidor Express + API REST
├── electron-main.js             # Proceso principal de Electron
├── electron-database.js         # Gestor de BD para Electron
├── electron-app-loader.js       # Cargador offline (Electron)
├── app-loader.js                # Cargador online (PWA)
├── index.html                   # Interfaz principal
├── script.js                    # Lógica del frontend
├── style.css                    # Estilos
├── sw.js                        # Service Worker (PWA)
├── manifest.json                # Manifiesto PWA
├── package.json                 # Configuración npm y Electron Builder
├── db/
│   ├── better-sqlite-manager.js # Gestor SQLite para servidor
│   ├── sqlite-manager.js        # Gestor SQLite alternativo
│   └── schema.sql               # Esquema de base de datos
├── icons/                       # Iconos para PWA/Electron
├── sounds/                      # Sonidos de notificaciones
└── dist/                        # Builds compilados (generado)
```

## 🛠️ Tecnologías

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **better-sqlite3** - Base de datos SQLite embebida
- **CORS** - Control de acceso entre orígenes

### Frontend
- **HTML5 + CSS3 + JavaScript** - Interfaz nativa
- **Service Worker** - Funcionalidad offline (PWA)
- **Notification API** - Alertas del sistema

### Desktop
- **Electron** - Framework para apps de escritorio
- **electron-builder** - Empaquetador de aplicaciones
- **IPC (Inter-Process Communication)** - Comunicación entre procesos

## 📡 API REST

El servidor expone los siguientes endpoints:

### Edificios
```
GET    /api/edificios              # Listar todos los edificios
```

### Cuartos
```
GET    /api/cuartos                # Listar todos los cuartos
GET    /api/cuartos/:id            # Obtener un cuarto específico
```

### Mantenimientos
```
GET    /api/mantenimientos         # Listar mantenimientos (opcional: ?cuarto_id=X)
POST   /api/mantenimientos         # Crear nuevo mantenimiento
PUT    /api/mantenimientos/:id     # Actualizar mantenimiento
DELETE /api/mantenimientos/:id     # Eliminar mantenimiento
PATCH  /api/mantenimientos/:id/emitir  # Marcar alerta como emitida
```

### Ejemplo de Request

```javascript
// Crear un nuevo mantenimiento
fetch('http://localhost:3001/api/mantenimientos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cuarto_id: 1,
    descripcion: 'Reparar aire acondicionado',
    tipo: 'normal'  // o 'rutina' para alertas programadas
  })
});
```

## 💾 Base de Datos

### SQLite Local

La aplicación utiliza **SQLite** como base de datos:
- **Ubicación**: `~/.jwmantto/jwmantto.db` (servidor/Electron)
- **Esquema**: Ver `db/schema.sql`
- **Sin configuración**: Se crea automáticamente al iniciar

### Estructura de Tablas

```sql
edificios (id, nombre, descripcion)
cuartos (id, numero, edificio_id, estado)
mantenimientos (id, cuarto_id, descripcion, tipo, hora, dia_alerta, emitida, fecha_emision)
```

## 🔔 Sistema de Notificaciones

### Alertas Programadas

1. Crear un mantenimiento de tipo `rutina` con:
   - `dia_alerta`: Fecha (YYYY-MM-DD)
   - `hora`: Hora (HH:MM)
   - `descripcion`: Mensaje de la alerta

2. La aplicación verificará cada minuto si hay alertas pendientes

3. Cuando llegue el momento programado:
   - Se muestra una notificación del sistema
   - Se reproduce un sonido de alerta
   - Se marca como `emitida` en la base de datos

## 🌐 Uso como PWA (Progressive Web App)

### Instalar en el navegador

1. Abre la aplicación en Chrome/Edge: `http://localhost:3001`
2. Haz clic en el icono de instalación en la barra de direcciones
3. La app se instalará como aplicación independiente

### Acceso Remoto con ngrok

Para acceder desde internet o dispositivos externos:

```bash
# Instalar ngrok (https://ngrok.com/download)

# Con el servidor corriendo, ejecuta:
ngrok http 3001

# Obtendrás una URL pública:
# https://abcd1234.ngrok.io
```

Comparte la URL de ngrok para acceso remoto.

## 📦 Scripts npm Disponibles

```json
{
  "start": "node server.js",                    // Iniciar servidor
  "electron": "electron .",                     // Ejecutar Electron
  "electron-dev": "concurrently \"npm start\" \"wait-on http://localhost:3001 && electron .\"",
  "build": "electron-builder",                  // Compilar para todas las plataformas
  "dist": "electron-builder --publish=never"    // Crear distribuciones
}
```

## 🔧 Desarrollo

### Debugging

- **DevTools**: Se abren automáticamente en modo desarrollo
- **Logs**: Revisa la consola de Node.js y Electron
- **Base de datos**: Usa SQLite Browser para inspeccionar `jwmantto.db`

### Recompilar Módulos Nativos

Si cambias la versión de Electron o Node.js:

```bash
# Para Node.js (servidor)
npm rebuild better-sqlite3

# Para Electron
npm rebuild better-sqlite3 --runtime=electron --target=21.4.4 --disturl=https://electronjs.org/headers --abi=109
```

## 📄 Documentación Adicional

- [MIGRACION_PHP_A_NODEJS.md](./MIGRACION_PHP_A_NODEJS.md) - Detalles de la migración
- [README_ELECTRON.md](./README_ELECTRON.md) - Configuración de Electron
- [README_OFFLINE.md](./README_OFFLINE.md) - Funcionalidad offline
- [README_NOTIFICACIONES.md](./README_NOTIFICACIONES.md) - Sistema de alertas

## 🐛 Solución de Problemas

### Error: Puerto 3001 en uso

```bash
# Encontrar y matar el proceso
lsof -ti:3001 | xargs kill -9
```

### Error: Module version mismatch (better-sqlite3)

```bash
# Recompilar para Node.js
npm rebuild better-sqlite3

# Recompilar para Electron
npm rebuild better-sqlite3 --runtime=electron --target=21.4.4 --disturl=https://electronjs.org/headers --abi=109
```

### La aplicación no inicia

1. Verifica que Node.js esté instalado: `node --version`
2. Reinstala dependencias: `rm -rf node_modules && npm install`
3. Revisa los logs en la consola

## 📝 Changelog

### v1.1.0 (26 de octubre de 2025)
- ✅ Migración completa de PHP/MySQL a Node.js/SQLite
- ✅ API REST completa implementada
- ✅ Eliminados todos los archivos PHP legacy
- ✅ Aplicación compilable para Windows, macOS y Linux
- ✅ Sistema de notificaciones mejorado
- ✅ Modo 100% offline funcional

### v1.0.0
- 🎉 Versión inicial con PHP/MySQL

## 👥 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📜 Licencia

Este proyecto es privado y está desarrollado para JW Marriott.

## 👨‍💻 Autor

**JW Marriott - Equipo de Mantenimiento**

---

**⚡ Powered by Node.js + Electron + SQLite**

