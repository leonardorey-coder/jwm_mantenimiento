# JW Mantto - Sistema de Gestión de Mantenimiento

Sistema local de gestión de mantenimiento de habitaciones convertido a aplicación de escritorio usando Electron + Express + SQLite.

## 🚀 Características

- **Aplicación de escritorio**: Funciona completamente offline usando Electron
- **Base de datos local**: SQLite almacenado en el directorio del usuario
- **PWA habilitado**: También funciona como aplicación web progresiva
- **API REST local**: Servidor Express embebido para funcionalidad backend
- **Interfaz moderna**: UI responsiva con funcionalidades de búsqueda y filtrado

## 📋 Funcionalidades

### Gestión de Cuartos
- Visualización de todos los cuartos por edificio
- Búsqueda por número de cuarto
- Filtrado por edificio
- Estado visual de cuartos con alertas pendientes

### Registro de Mantenimientos
- **Mantenimiento Normal**: Registros de reparaciones y trabajos completados
- **Mantenimiento de Rutina**: Programación de alertas con fecha y hora específica
- Historial completo de mantenimientos por cuarto

### Sistema de Alertas
- Alertas programadas para mantenimientos de rutina
- Notificaciones de alertas vencidas
- Panel de alertas emitidas del día

## 🛠 Instalación y Uso

### Requisitos Previos
- Node.js 16+ instalado
- npm o yarn

### Instalación
```bash
# Instalar dependencias
npm install

# Iniciar el servidor local
npm start

# En otra terminal, ejecutar la aplicación Electron
npm run electron-only
```

### Scripts Disponibles
- `npm start` - Inicia el servidor Express + SQLite
- `npm run electron` - Ejecuta solo Electron (requiere servidor corriendo)
- `npm run electron-dev` - Inicia servidor + Electron simultáneamente
- `npm run electron-only` - Ejecuta Electron conectándose a servidor existente
- `npm run build` - Construye la aplicación para distribución

## 📁 Estructura del Proyecto

```
jwm_mant_cuartos/
├── server.js              # Servidor Express principal
├── electron-main.js       # Proceso principal de Electron
├── index.html            # Aplicación web principal
├── app-loader.js         # Carga de datos y lógica frontend
├── script.js             # Scripts de UI heredados
├── script_index.js       # Scripts específicos del index
├── style.css             # Estilos CSS
├── manifest.json         # Configuración PWA
├── package.json          # Configuración Node.js y Electron
│
├── db/
│   ├── sqlite-manager.js # Gestor de base de datos SQLite
│   └── schema.sql        # Esquema de base de datos original
│
├── icons/                # Iconos de la aplicación
└── sounds/               # Archivos de sonido para alertas
```

## 🗃 Base de Datos

La aplicación utiliza SQLite con las siguientes tablas:

- **edificios**: Información de edificios/torres del hotel
- **cuartos**: Habitaciones asociadas a edificios
- **mantenimientos**: Registros de mantenimiento normal y rutina

### Ubicación de la Base de Datos
```
macOS: /Users/{usuario}/.jwmantto/jwmantto.db
Windows: C:\Users\{usuario}\.jwmantto\jwmantto.db
Linux: /home/{usuario}/.jwmantto/jwmantto.db
```

## 🔌 API Endpoints

### Edificios
- `GET /api/edificios` - Listar todos los edificios

### Cuartos
- `GET /api/cuartos` - Listar todos los cuartos con información de edificios

### Mantenimientos
- `GET /api/mantenimientos` - Listar todos los mantenimientos
- `POST /api/mantenimientos` - Crear nuevo mantenimiento
  ```json
  {
    "cuarto_id": 1,
    "tipo": "normal|rutina",
    "descripcion": "Descripción del trabajo",
    "hora": "HH:MM", // Solo para rutina
    "dia_alerta": "YYYY-MM-DD" // Solo para rutina
  }
  ```

## 🔧 Desarrollo

### Configuración de Desarrollo
```bash
# Instalar dependencias de desarrollo
npm install --dev

# Ejecutar en modo desarrollo
NODE_ENV=development npm run electron-dev
```

### Estructura de Archivos de Desarrollo
- `server.js` - Servidor backend con rutas API
- `db/sqlite-manager.js` - Abstracción de base de datos
- `app-loader.js` - Cliente JavaScript que consume la API
- `electron-main.js` - Configuración de ventana Electron

## 📦 Distribución

Para crear ejecutables distribución:

```bash
# Construir para el sistema actual
npm run build

# Los ejecutables se generarán en la carpeta dist/
```

## 🚨 Solución de Problemas

### El servidor no inicia
- Verificar que el puerto 3000 esté libre
- Comprobar permisos de escritura en el directorio home para SQLite

### Electron no abre
- Asegurar que el servidor Express esté corriendo primero
- Verificar la consola para errores de conexión

### Los datos no se cargan
- Verificar que la API responda en `http://localhost:3000/api/cuartos`
- Revisar la consola del navegador para errores JavaScript

## 📝 Migración desde PHP/MySQL

Esta aplicación reemplaza completamente la versión original PHP/MySQL:

### Cambios Principales
- ✅ PHP → Express.js con API REST
- ✅ MySQL → SQLite local
- ✅ Apache → Servidor web embebido
- ✅ Aplicación web → Aplicación de escritorio Electron
- ✅ Dependencia de XAMPP → Aplicación independiente

### Datos Migrados
Los datos de prueba incluyen:
- 4 edificios (Torre Principal, Norte, Sur, Villas)
- 8 cuartos distribuidos en los edificios
- Estructura completa de mantenimientos

## 👥 Uso del Sistema

### Registrar Mantenimiento Normal
1. Seleccionar cuarto del dropdown
2. Mantener switch en "Normal" 
3. Escribir descripción del trabajo realizado
4. Clic en "Registrar"

### Programar Mantenimiento de Rutina
1. Seleccionar cuarto del dropdown
2. Cambiar switch a "Rutina"
3. Escribir descripción de la tarea programada
4. Seleccionar fecha y hora de alerta
5. Clic en "Registrar"

### Búsqueda y Filtros
- **Buscar cuarto**: Filtrar por número de habitación
- **Buscar avería**: Filtrar por descripción de mantenimientos
- **Filtro edificio**: Mostrar solo cuartos de un edificio específico

---

**Versión**: 1.0.0  
**Tecnologías**: Electron, Express.js, SQLite, HTML5, CSS3, JavaScript ES6+  
**Compatibilidad**: Windows 10+, macOS 10.14+, Linux Ubuntu 18+
