# 🔔 Sistema de Notificaciones Automáticas - JW Mantto v1.1

## ✨ Características Implementadas

### 1. **Notificaciones Automáticas**
- El sistema verifica cada 30 segundos si hay alertas programadas que deben notificarse
- Cuando llega la fecha y hora de una alerta, se emite automáticamente una notificación
- Las notificaciones incluyen sonido personalizado y ventana emergente del navegador

### 2. **Registro de Alertas Emitidas**
- Las alertas se marcan automáticamente como "emitidas" en la base de datos
- Se registra la fecha y hora exacta de emisión
- Las alertas emitidas aparecen en el panel "Alertas Emitidas Hoy"

### 3. **Sonido de Alerta**
- Se reproduce automáticamente el archivo `sounds/alert.mp3`
- Volumen configurado al 70% para no ser invasivo
- Funciona incluso si el navegador está en segundo plano

### 4. **Notificaciones del Navegador**
- Ventana emergente con información del cuarto y descripción
- Icono personalizado de la aplicación
- Clic en la notificación lleva directamente al cuarto correspondiente
- Auto-cierre después de 10 segundos

## 🚀 Cómo Funciona

### Creación de Alertas
1. En el formulario "Registrar Mantenimiento"
2. Selecciona un cuarto
3. Cambia el switch a "Alerta" (posición activada)
4. Introduce la descripción del mantenimiento
5. Selecciona el **día** y **hora** de la alerta
6. Pulsa "Registrar"

### Proceso Automático
1. **Verificación continua**: Cada 30 segundos, el sistema verifica si hay alertas pendientes
2. **Detección de hora**: Cuando coincide la fecha y hora actual con una alerta programada
3. **Emisión**: Se reproduce el sonido y se muestra la notificación del navegador
4. **Registro**: Se marca la alerta como emitida en la base de datos
5. **Actualización**: Se actualiza la interfaz para mostrar la alerta en "Alertas Emitidas Hoy"

## 📱 Permisos del Navegador

### Primera Vez
Al cargar la aplicación, se solicitarán automáticamente los permisos de notificación:
- **Permitir**: Notificaciones completas con sonido y ventana emergente
- **Bloquear**: Solo sonido y alerta básica de JavaScript

### Para Activar Permisos (si se bloquearon)
1. Busca el ícono de candado o información en la barra de direcciones
2. Selecciona "Permitir notificaciones para este sitio"
3. Recarga la página

## 🔧 Panel de Herramientas de Prueba

### Archivo de Prueba: `test-notifications.html`
Acceso: `http://localhost:3000/test-notifications.html`

**Funciones disponibles:**
- **Probar Sonido**: Reproduce el sonido de alerta
- **Probar Notificación**: Envía una notificación de prueba
- **Probar API**: Verifica la conexión con la base de datos
- **Estado de Permisos**: Muestra el estado actual de los permisos

## ⚙️ Configuración Técnica

### Frecuencia de Verificación
- **Intervalo**: 30 segundos
- **Modificable en**: `app-loader.js` línea con `setInterval`
- **Valor sugerido**: Entre 15-60 segundos

### Archivos Modificados
1. **server.js**: Endpoint para marcar alertas como emitidas
2. **db/sqlite-manager.js**: Campos y método para alertas emitidas
3. **app-loader.js**: Sistema completo de notificaciones
4. **style.css**: Estilos para alertas emitidas

### Nuevos Campos en Base de Datos
- `alerta_emitida` (INTEGER): 0 = no emitida, 1 = emitida
- `fecha_emision` (DATETIME): Timestamp de cuando se emitió la alerta

## � Resolución de Problemas

### No se reproducen las notificaciones
1. Verifica que los permisos estén activados
2. Comprueba que el volumen del sistema no esté silenciado
3. Usa `test-notifications.html` para probar componentes

### No aparecen las alertas programadas
1. Verifica que la fecha y hora estén en formato correcto
2. Comprueba que el tipo de mantenimiento sea "Alerta" (rutina)
3. Asegúrate de que la fecha no sea pasada

### Console Debug
Abre las herramientas de desarrollador (F12) y usa:
```javascript
// Ver estado del sistema
window.notificationDebug.verificar();

// Ver alertas emitidas en memoria
window.notificationDebug.alertasEmitidas();

// Reinciar sistema
window.notificationDebug.detener();
window.notificationDebug.iniciar();
```

## 📈 Mejoras Futuras

1. **Repetición de alertas**: Alertas recurrentes (diarias, semanales)
2. **Múltiples recordatorios**: Alertas previas (15 min antes, 1 hora antes)
3. **Categorización**: Diferentes tipos de alertas (urgente, normal, info)
4. **Historial extendido**: Panel de historial de todas las alertas emitidas
5. **Integración móvil**: Push notifications para dispositivos móviles

---

**Versión**: 1.1  
**Fecha**: 20 de Julio de 2025  
**Estado**: ✅ Completamente funcional
- **Probar Sonido**: Botón verde para probar solo el audio

## 🔧 Configuración

### Archivo de Sonido
1. Colocar el archivo `alert.mp3` en la carpeta `/sounds/`
2. El archivo debe ser un MP3 válido, preferiblemente:
   - Duración: 1-3 segundos
   - Calidad: 128kbps o superior
   - Volumen normalizado

### Permisos del Navegador
El sistema requiere:
- **Notificaciones**: Permitir notificaciones del sitio
- **Audio**: Interacción del usuario para inicializar (automático)

## 🐛 Debugging

### Consola del Navegador
```javascript
// Probar notificación manualmente
forzarNotificacion()

// Verificar estado del audio
console.log('Audio habilitado:', audioEnabled)
console.log('Contexto de audio:', audioContext?.state)
console.log('Sonido cargado:', alertSound ? 'Sí' : 'No')
```

### Logs Importantes
- `"Sistema de audio inicializado correctamente"`
- `"Sonido de alerta cargado correctamente"`
- `"¡NOTIFICANDO alerta X con sonido!"`
- `"Reproduciendo sonido para X alerta(s) activa(s)"`

## ⚠️ Consideraciones

### Navegadores
- **Chrome/Brave**: Funcionalidad completa
- **Firefox**: Funcionalidad completa
- **Safari**: Puede requerir interacción adicional del usuario
- **Móviles**: Vibración disponible en dispositivos compatibles

### Políticas de Autoplay
- El audio se inicializa después de la primera interacción del usuario
- Si falla la inicialización automática, se reintenta con la primera interacción

### Rendimiento
- El archivo de audio se carga una sola vez al inicializar
- Las verificaciones de alertas son cada 60 segundos exactos
- Sistema optimizado para evitar múltiples reproducciones simultáneas

## 📝 Notas de Implementación

### Cambios Principales en `script_index.js`

1. **Líneas 14-95**: Sistema completo de audio con Web Audio API
2. **Líneas 280-350**: Verificación mejorada de alertas con precisión temporal
3. **Líneas 520-580**: Inicialización de audio en DOMContentLoaded
4. **Líneas 1450-1500**: Funciones de prueba mejoradas

### Compatibilidad con Código Existente
- Todas las funciones existentes mantienen su funcionalidad
- No se requieren cambios en la base de datos
- Compatible con el sistema actual de alertas emitidas y descartadas

## 🎯 Próximas Mejoras Sugeridas

1. **Control de volumen**: Slider para ajustar volumen del sonido
2. **Sonidos personalizados**: Diferentes sonidos por tipo de alerta
3. **Modo silencioso**: Opción para deshabilitar sonidos temporalmente
4. **Notificaciones push**: Integración con service workers para notificaciones offline 