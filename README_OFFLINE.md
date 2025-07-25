# JW Mantto - Aplicación 100% Offline

## 🎯 Resumen de Cambios

La aplicación JW Mantto ha sido **completamente modificada** para funcionar al **100% offline** sin necesidad de conexión a internet o servidor web. Ahora usa **Electron** con **SQLite** local para todas las operaciones de base de datos.

## ✅ Funcionalidades Implementadas

### 🔧 Sistema Offline
- ✅ **Base de datos SQLite local** - Almacena todos los datos en el dispositivo
- ✅ **IPC (Inter-Process Communication)** - Comunicación directa entre frontend y backend sin HTTP
- ✅ **Datos iniciales automáticos** - Crea cuartos, edificios y mantenimientos de ejemplo
- ✅ **Detección automática de entorno** - Carga el módulo correcto según el entorno

### 📊 Gestión de Datos
- ✅ **Cuartos**: CRUD completo (Crear, Leer, Actualizar, Eliminar)
- ✅ **Edificios**: Gestión de edificios del hotel
- ✅ **Mantenimientos**: Registro de averías y alertas rutinarias
- ✅ **Persistencia**: Todos los datos se guardan localmente en SQLite

### 🔔 Sistema de Notificaciones
- ✅ **Alertas automáticas** - Notificaciones basadas en hora y fecha
- ✅ **Sonido de alerta** - Audio cuando se activa una notificación
- ✅ **Notificaciones del navegador** - Alertas visuales del sistema
- ✅ **Panel de alertas** - Vista de todas las alertas programadas y emitidas

## 🚀 Cómo Usar la Aplicación

### 1. Iniciar la Aplicación Offline

```bash
# Navegar al directorio del proyecto
cd /Applications/XAMPP/xamppfiles/htdocs/jwm_mant_cuartos

# Ejecutar la aplicación Electron offline
npm run electron
```

### 2. Verificar Funcionamiento

Cuando la aplicación inicie, verás en la consola:
```
🎯 Manejadores IPC registrados para modo offline
💾 Inicializando base de datos offline...
📁 Inicializando base de datos en: [ruta de la BD]
✅ Base de datos inicializada correctamente
✅ Aplicación principal offline cargada exitosamente
```

### 3. Probar Funcionalidades

La aplicación ahora permite:

1. **Ver cuartos existentes** - Se cargan automáticamente desde la BD local
2. **Agregar nuevos mantenimientos** - Se guardan directamente en SQLite
3. **Filtrar y buscar** - Toda la funcionalidad de búsqueda funciona offline
4. **Recibir alertas** - Sistema de notificaciones automáticas

## 🏗️ Arquitectura Técnica

### Archivos Principales Modificados/Creados

1. **`electron-database.js`** (NUEVO)
   - Maneja SQLite directamente
   - CRUD completo para todas las entidades
   - Datos iniciales automáticos

2. **`electron-app-loader.js`** (NUEVO)
   - Frontend que usa IPC en lugar de HTTP
   - Reemplaza `app-loader.js` en modo Electron

3. **`electron-main.js`** (MODIFICADO)
   - Inicialización de base de datos
   - Manejadores IPC para todas las operaciones
   - Carga automática de la aplicación

4. **`index.html`** (MODIFICADO)
   - Detección automática de entorno
   - Carga del loader apropiado según contexto

### Base de Datos Local

**Ubicación**: `~/Library/Application Support/jw-mantto/finest_mant_cuartos.db`

**Tablas**:
- `edificios` - Información de edificios del hotel
- `cuartos` - Habitaciones con referencias a edificios
- `mantenimientos` - Registros de averías y alertas rutinarias

**Datos Iniciales**:
- 3 edificios (A, B, C)
- 65 cuartos (101-120, 201-230, 301-315)
- 5 mantenimientos de ejemplo

## 🔄 Migración de Datos

Si tienes datos previos, puedes:

1. **Exportar desde sistema anterior** (si lo hay)
2. **Modificar `electron-database.js`** para importar tus datos
3. **Reiniciar la aplicación** para que procese los nuevos datos

## 🎮 Comandos Disponibles

```bash
# Ejecutar aplicación offline
npm run electron

# Ejecutar con modo de desarrollo (incluye DevTools)
npm run electron

# Para desarrollo web (modo online con servidor)
npm start
```

## 🐛 Troubleshooting

### Problema: "Base de datos no disponible"
**Solución**: Verificar que la aplicación se ejecute con `npm run electron` y no desde navegador web.

### Problema: No aparecen los datos
**Solución**: 
1. Verificar en la consola que dice "Base de datos inicializada correctamente"
2. Comprobar que el archivo de BD se creó en la ruta indicada
3. Reiniciar la aplicación

### Problema: Errores de IPC
**Solución**: 
1. Verificar que `nodeIntegration: true` en electron-main.js
2. Confirmar que se usa `electron-app-loader.js` y no `app-loader.js`
3. Verificar que todos los manejadores IPC estén registrados

## 📱 Funcionalidades Offline

### ✅ Lo que funciona 100% offline:
- Gestión completa de cuartos y mantenimientos
- Sistema de alertas y notificaciones
- Búsqueda y filtrado de datos
- Persistencia de todos los cambios
- Interfaz gráfica completa

### ❌ Lo que requiere internet (opcional):
- Actualizaciones de la aplicación
- Sincronización con sistemas externos (no implementado)

## 🔒 Seguridad

La aplicación funciona completamente offline, por lo que:
- ✅ **Datos seguros**: Todo se almacena localmente
- ✅ **Sin conexiones externas**: No hay transferencia de datos
- ✅ **Control total**: El usuario tiene control completo de sus datos

## 🎯 Resultado Final

**La aplicación JW Mantto ahora es 100% offline y funciona sin necesidad de:**
- ❌ Conexión a internet
- ❌ Servidor web (Apache/XAMPP)
- ❌ Servicios en la nube
- ❌ Configuración de red

**Solo necesitas:**
- ✅ Tener Node.js instalado
- ✅ Ejecutar `npm run electron`
- ✅ ¡La aplicación funciona completamente!

## 📞 Soporte

Para cualquier problema o duda:
1. Verificar los logs en la consola de Electron
2. Comprobar que los archivos estén en su lugar
3. Reiniciar la aplicación si es necesario

¡La aplicación está lista para uso en producción sin necesidad de internet! 🎉
