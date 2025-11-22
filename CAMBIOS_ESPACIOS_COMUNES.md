# Implementación de Vista de Espacios Comunes

## Fecha: 20 de Noviembre de 2025

## Resumen

Se ha implementado una vista completa de **Espacios Comunes** con el mismo estilo, CRUD y funcionalidades que la vista de Habitaciones, incluyendo cards dinámicas, gestión de mantenimientos y alertas.

---

## 🎯 Cambios Realizados

### 1. Backend - API Routes (`api/index.js`)

#### Nuevas Rutas Implementadas:

**Espacios Comunes:**
- `GET /api/espacios-comunes` - Obtener todos los espacios comunes con información de edificios
- `GET /api/espacios-comunes/:id` - Obtener un espacio común específico
- `PUT /api/espacios-comunes/:id` - Actualizar estado del espacio común

**Mantenimientos de Espacios:**
- `GET /api/mantenimientos/espacios` - Obtener mantenimientos de espacios comunes
- `POST /api/mantenimientos/espacios` - Crear mantenimiento para espacio común

#### Características de las Rutas:

- ✅ Validación de estados: `disponible`, `ocupado`, `mantenimiento`, `fuera_servicio`
- ✅ Join con tabla de edificios para obtener nombres
- ✅ Soporte para filtrar por espacio específico
- ✅ Actualización automática de timestamps
- ✅ Manejo de errores robusto
- ✅ Logging detallado para debugging

---

### 2. Frontend - HTML (`index.html`)

#### Cambios en la Vista de Espacios Comunes:

**Estructura Actualizada:**
```html
<!-- Antes: Grid estático con datos hardcodeados -->
<div class="bitacora-espacios-grid">
    <!-- Cards estáticas -->
</div>

<!-- Después: Grid dinámico similar a habitaciones -->
<ul class="lista-cuartos brutalist-grid" id="listaEspaciosComunes">
    <!-- Cards generadas dinámicamente -->
</ul>
```

**Panel Lateral Actualizado:**
- ✅ Panel de alertas programadas de espacios
- ✅ Panel de alertas emitidas del día
- ✅ Panel de estadísticas dinámicas
- ✅ Buscador de alertas con IDs únicos
- ✅ Mensajes de estado vacío

**Filtros y Búsqueda:**
- Campo de búsqueda por nombre de espacio
- Campo de búsqueda por tipo de servicio
- Filtro por tipo de espacio
- Filtro por prioridad
- Selector de vistas móvil (Espacios | Alertas)

---

### 3. Frontend - JavaScript (`js/app.js`)

#### Nuevas Variables de Estado:

```javascript
AppState = {
    // ... estados existentes
    espaciosComunes: [],           // Array de espacios comunes
    mantenimientosEspacios: []     // Mantenimientos de espacios
}
```

#### Nuevas Funciones Implementadas:

**Funciones Principales:**

1. **`loadEspaciosComunesData()`**
   - Carga espacios comunes desde la API
   - Carga mantenimientos asociados
   - Renderiza la vista
   - Actualiza estadísticas
   - Carga alertas

2. **`renderEspaciosComunes()`**
   - Renderiza cards de espacios con estilo idéntico a habitaciones
   - Muestra estado con badge colorido
   - Lista servicios/mantenimientos
   - Botones de acción (agregar servicio, cambiar estado)

3. **`generarServiciosEspacioHTML(mantenimientos, espacioId)`**
   - Genera HTML para cada servicio/mantenimiento
   - Iconos según tipo (rutina/normal)
   - Badge de prioridad
   - Botones de editar y eliminar

4. **`getEstadoBadgeInfo(estado)`**
   - Retorna clase CSS, icono y texto según estado
   - Mapeo de estados: disponible, ocupado, mantenimiento, fuera_servicio

5. **`actualizarEstadisticasEspacios()`**
   - Cuenta espacios por estado
   - Actualiza contadores en el panel de estadísticas

6. **`cargarAlertasEspacios()`**
   - Filtra alertas pendientes y emitidas
   - Renderiza listas de alertas
   - Muestra mensajes cuando no hay alertas

**Funciones de Interacción:**

7. **`seleccionarEspacioComun(espacioId)`**
   - Placeholder para agregar servicio (en desarrollo)

8. **`editarMantenimientoEspacio(mantenimientoId)`**
   - Placeholder para editar mantenimiento (en desarrollo)

9. **`eliminarMantenimientoEspacio(mantenimientoId)`**
   - Elimina mantenimiento con confirmación
   - Llamada DELETE a la API
   - Recarga automática de la vista

10. **`cambiarEstadoEspacio(espacioId)`**
    - Prompt para seleccionar nuevo estado
    - Validación de estado
    - Actualización vía PUT a la API
    - Recarga automática

**Funciones de Filtrado:**

11. **`filterEspaciosComunes()`**
    - Filtra por nombre de espacio
    - Filtra por descripción de servicio
    - Filtra por tipo de espacio
    - Filtra por prioridad
    - Muestra/oculta mensaje de "no resultados"

**Funciones Auxiliares:**

12. **`formatearFecha(fecha)`** - Formatea fechas en formato español
13. **`escapeHtml(text)`** - Escapa HTML para prevenir XSS

#### Listeners de Eventos:

```javascript
// Agregados en setupSearchListeners()
- buscarEspacio.addEventListener('input')
- buscarServicioEspacio.addEventListener('input')
- filtroTipoEspacio.addEventListener('change')
- filtroPrioridadEspacio.addEventListener('change')
```

#### Funciones Exportadas Globalmente:

```javascript
window.seleccionarEspacioComun = seleccionarEspacioComun;
window.editarMantenimientoEspacio = editarMantenimientoEspacio;
window.eliminarMantenimientoEspacio = eliminarMantenimientoEspacio;
window.cambiarEstadoEspacio = cambiarEstadoEspacio;
```

---

## 🎨 Características de Diseño

### Cards de Espacios Comunes

Las cards tienen el **mismo estilo visual** que las habitaciones:

```
┌─────────────────────────────────────┐
│ 🏢 Lobby Principal                 │ 🟢 Disponible
│    🏢 Torre A                       │
├─────────────────────────────────────┤
│ Servicios:                          │
│ 🔧 Servicio • Media                 │
│ Limpieza profunda                   │
│ [Editar] [Eliminar]                 │
├─────────────────────────────────────┤
│ [Cambiar Estado] [+ Agregar Servicio]│
└─────────────────────────────────────┘
```

### Estados Visuales

- 🟢 **Disponible** - Verde
- 🔴 **Ocupado** - Rojo
- 🟡 **Mantenimiento** - Amarillo
- ⚫ **Fuera de Servicio** - Gris oscuro

### Prioridades de Servicios

- 🟢 **Baja** - Verde
- 🟡 **Media** - Amarillo
- 🔴 **Alta** - Rojo

---

## 📊 Estadísticas

Panel de estadísticas muestra:
- Total de espacios comunes
- Espacios disponibles
- Espacios en mantenimiento
- Espacios fuera de servicio

---

## 🔔 Sistema de Alertas

### Alertas Programadas
- Lista de alertas de tipo "rutina" no emitidas
- Muestra fecha y hora programada
- Badge de prioridad

### Alertas del Día
- Lista de alertas emitidas hoy
- Mismo formato que alertas programadas
- Filtro por búsqueda

---

## 🔍 Sistema de Filtros

### Filtros Disponibles:

1. **Búsqueda por Nombre**
   - Campo: `#buscarEspacio`
   - Busca en nombre del espacio

2. **Búsqueda por Servicio**
   - Campo: `#buscarServicioEspacio`
   - Busca en descripción de mantenimientos

3. **Filtro por Tipo**
   - Select: `#filtroTipoEspacio`
   - Opciones: comun, recreativo, eventos, servicios

4. **Filtro por Prioridad**
   - Select: `#filtroPrioridadEspacio`
   - Opciones: baja, media, alta

---

## 📱 Responsive Design

### Vista Móvil:
- Selector de vistas: **Espacios | Alertas**
- Alterna entre lista de espacios y panel de alertas
- Mismo comportamiento que habitaciones

---

## 🔧 Integración con Esquema de Base de Datos

### Tabla: `espacios_comunes`

Campos utilizados:
- `id` - Identificador único
- `nombre` - Nombre del espacio
- `edificio_id` - Relación con edificio
- `tipo` - Tipo de espacio
- `estado` - Estado actual
- `activo` - Filtro de registros activos

### Tabla: `mantenimientos`

Campos utilizados para espacios:
- `espacio_comun_id` - Relación con espacio común
- `descripcion` - Descripción del servicio
- `tipo` - normal o rutina
- `estado` - pendiente, en_proceso, completado, cancelado
- `prioridad` - baja, media, alta, urgente
- `hora` - Hora programada (para rutinas)
- `dia_alerta` - Fecha de alerta (para rutinas)
- `alerta_emitida` - Boolean

---

## ✅ Funcionalidades Completadas

- ✅ Carga dinámica de espacios comunes desde API
- ✅ Renderizado de cards con estilo idéntico a habitaciones
- ✅ Sistema de estados con badges coloridos
- ✅ Lista de servicios/mantenimientos por espacio
- ✅ Cambio de estado de espacios
- ✅ Eliminación de mantenimientos
- ✅ Panel de alertas programadas
- ✅ Panel de alertas emitidas
- ✅ Estadísticas en tiempo real
- ✅ Sistema de filtros y búsqueda
- ✅ Responsive design con selector móvil
- ✅ Mensajes de estado vacío

---

## 🚧 Funcionalidades Pendientes (Placeholders)

Las siguientes funciones están preparadas pero muestran un mensaje de "en desarrollo":

- ⏳ `seleccionarEspacioComun()` - Agregar nuevo servicio
- ⏳ `editarMantenimientoEspacio()` - Editar mantenimiento existente

Estas se pueden implementar siguiendo el mismo patrón que habitaciones.

---

## 🧪 Testing

### Para probar la implementación:

1. **Verificar que la base de datos tenga espacios comunes:**
   ```sql
   SELECT * FROM espacios_comunes WHERE activo = true;
   ```

2. **Navegar a la vista de Espacios Comunes:**
   - Click en el menú "Espacios Comunes"

3. **Probar funcionalidades:**
   - ✅ Ver cards de espacios
   - ✅ Cambiar estado de un espacio
   - ✅ Eliminar un mantenimiento
   - ✅ Buscar por nombre
   - ✅ Filtrar por tipo
   - ✅ Ver alertas
   - ✅ Vista móvil

---

## 📝 Consistencia con Habitaciones

La vista de Espacios Comunes es **funcionalmente idéntica** a Habitaciones:

| Característica | Habitaciones | Espacios Comunes |
|----------------|--------------|------------------|
| Grid de cards | ✅ | ✅ |
| Estados coloridos | ✅ | ✅ |
| Lista de servicios | ✅ | ✅ |
| Cambiar estado | ✅ | ✅ |
| Agregar servicio | ✅ | ⏳ |
| Editar servicio | ✅ | ⏳ |
| Eliminar servicio | ✅ | ✅ |
| Alertas programadas | ✅ | ✅ |
| Alertas emitidas | ✅ | ✅ |
| Estadísticas | ✅ | ✅ |
| Filtros | ✅ | ✅ |
| Búsqueda | ✅ | ✅ |
| Responsive | ✅ | ✅ |

---

## 🎓 Notas Técnicas

### Reutilización de Estilos CSS:

Los espacios comunes utilizan las mismas clases CSS que habitaciones:
- `.habitacion-card`
- `.habitacion-header`
- `.habitacion-servicios`
- `.habitacion-acciones`
- `.servicio-item`
- `.lista-cuartos` (grid)

Esto garantiza **consistencia visual** sin duplicar código CSS.

### Arquitectura:

```
API Layer (api/index.js)
    ↓
State Management (AppState)
    ↓
Render Functions (renderEspaciosComunes)
    ↓
Event Handlers (setupSearchListeners)
    ↓
UI Components (Cards, Alerts, Stats)
```

---

## 🔗 Archivos Modificados

1. **`api/index.js`** - Rutas de API para espacios comunes
2. **`js/app.js`** - Lógica de frontend para espacios comunes
3. **`index.html`** - Estructura HTML de la vista

---

## ✨ Conclusión

La vista de Espacios Comunes está **completamente funcional** y mantiene **100% de consistencia** con la vista de Habitaciones en términos de:
- Diseño visual
- Interacciones de usuario
- Estructura de código
- Patrones de desarrollo

Solo falta implementar los modales para agregar/editar servicios, que se pueden copiar directamente de la implementación de habitaciones.

---

**Desarrollado por:** Sistema de Mantenimiento JW Marriott  
**Fecha:** 20 de Noviembre de 2025

