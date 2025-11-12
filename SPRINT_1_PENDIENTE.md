# 🔄 Sprint 1: Tareas Pendientes (5% Restante)

**Estado Actual:** 95% Completado  
**Fecha de Análisis:** 2 de noviembre de 2025

---

## ✅ LO QUE YA ESTÁ IMPLEMENTADO (95%)

### Backend - API REST Parcial
- ✅ GET `/api/edificios` - Listar edificios
- ✅ GET `/api/cuartos` - Listar cuartos
- ✅ GET `/api/cuartos/:id` - Obtener cuarto específico
- ✅ GET `/api/mantenimientos` - Listar mantenimientos
- ✅ POST `/api/mantenimientos` - Crear mantenimiento
- ✅ PUT `/api/mantenimientos/:id` - Actualizar mantenimiento
- ✅ DELETE `/api/mantenimientos/:id` - Eliminar mantenimiento
- ✅ PATCH `/api/mantenimientos/:id/emitir` - Marcar alerta emitida

### Frontend - Funcionalidad Parcial
- ✅ Visualización de cuartos por edificios
- ✅ Búsqueda y filtrado de cuartos
- ✅ Agregar mantenimientos (normal y rutina)
- ✅ Editar mantenimientos inline
- ✅ Eliminar mantenimientos
- ✅ PWA con Service Worker
- ✅ Diseño responsive
- ✅ Notificaciones de alertas

### Base de Datos
- ✅ Esquemas SQL completos (PostgreSQL + SQLite)
- ✅ 3 tablas normalizadas (3NF)
- ✅ Campo `estado` en tabla cuartos
- ✅ Relaciones con Foreign Keys
- ✅ Índices para optimización

---

## ❌ LO QUE FALTA POR IMPLEMENTAR (5%)

### 1. CRUD de Edificios (Backend) 🔴 ALTA PRIORIDAD

#### Endpoints Faltantes:

**a) POST `/api/edificios` - Crear Edificio**
```javascript
// server.js - Agregar después de la línea 116
app.post('/api/edificios', async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ 
                error: 'El nombre del edificio es obligatorio' 
            });
        }
        
        if (dbManager) {
            const nuevoEdificio = await dbManager.insertEdificio({ nombre, descripcion });
            res.status(201).json(nuevoEdificio);
        } else {
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
            res.status(409).json({ 
                error: 'Ya existe un edificio con ese nombre' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error al crear edificio', 
                details: error.message 
            });
        }
    }
});
```

**b) PUT `/api/edificios/:id` - Actualizar Edificio**
```javascript
app.put('/api/edificios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ 
                error: 'El nombre del edificio es obligatorio' 
            });
        }
        
        if (dbManager) {
            await dbManager.updateEdificio(parseInt(id), { nombre, descripcion });
            res.json({ 
                success: true, 
                message: 'Edificio actualizado correctamente' 
            });
        } else {
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al actualizar edificio', 
            details: error.message 
        });
    }
});
```

**c) DELETE `/api/edificios/:id` - Eliminar Edificio**
```javascript
app.delete('/api/edificios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (dbManager) {
            // Verificar si el edificio tiene cuartos asociados
            const cuartos = await dbManager.getCuartos();
            const cuartosDelEdificio = cuartos.filter(c => c.edificio_id === parseInt(id));
            
            if (cuartosDelEdificio.length > 0) {
                return res.status(409).json({ 
                    error: 'No se puede eliminar el edificio porque tiene cuartos asociados',
                    cuartos_asociados: cuartosDelEdificio.length
                });
            }
            
            await dbManager.deleteEdificio(parseInt(id));
            res.json({ 
                success: true, 
                message: 'Edificio eliminado correctamente' 
            });
        } else {
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al eliminar edificio', 
            details: error.message 
        });
    }
});
```

**Tiempo estimado:** 2 horas

---

### 2. CRUD de Cuartos (Backend) 🔴 ALTA PRIORIDAD

#### Endpoints Faltantes:

**a) POST `/api/cuartos` - Crear Cuarto**
```javascript
// server.js - Agregar después de DELETE /api/edificios
app.post('/api/cuartos', async (req, res) => {
    try {
        const { numero, edificio_id, descripcion, estado } = req.body;
        
        if (!numero || !edificio_id) {
            return res.status(400).json({ 
                error: 'El número de cuarto y edificio son obligatorios' 
            });
        }
        
        if (dbManager) {
            const nuevoCuarto = await dbManager.insertCuarto({ 
                numero, 
                edificio_id: parseInt(edificio_id), 
                descripcion,
                estado: estado || 'disponible'
            });
            res.status(201).json(nuevoCuarto);
        } else {
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
            res.status(409).json({ 
                error: 'Ya existe un cuarto con ese número en el edificio seleccionado' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error al crear cuarto', 
                details: error.message 
            });
        }
    }
});
```

**b) PUT `/api/cuartos/:id` - Actualizar Cuarto**
```javascript
app.put('/api/cuartos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { numero, edificio_id, descripcion, estado } = req.body;
        
        if (!numero || !edificio_id) {
            return res.status(400).json({ 
                error: 'El número de cuarto y edificio son obligatorios' 
            });
        }
        
        if (dbManager) {
            await dbManager.updateCuarto(parseInt(id), { 
                numero, 
                edificio_id: parseInt(edificio_id), 
                descripcion,
                estado
            });
            res.json({ 
                success: true, 
                message: 'Cuarto actualizado correctamente' 
            });
        } else {
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al actualizar cuarto', 
            details: error.message 
        });
    }
});
```

**c) PATCH `/api/cuartos/:id/estado` - Cambiar Estado de Cuarto** ⭐ IMPORTANTE
```javascript
app.patch('/api/cuartos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        // Validar estados permitidos
        const estadosValidos = ['disponible', 'ocupado', 'mantenimiento', 'fuera_servicio'];
        if (!estado || !estadosValidos.includes(estado)) {
            return res.status(400).json({ 
                error: 'Estado no válido. Debe ser: disponible, ocupado, mantenimiento o fuera_servicio' 
            });
        }
        
        if (dbManager) {
            await dbManager.updateCuartoEstado(parseInt(id), estado);
            res.json({ 
                success: true, 
                message: 'Estado del cuarto actualizado correctamente',
                estado
            });
        } else {
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al cambiar estado del cuarto', 
            details: error.message 
        });
    }
});
```

**d) DELETE `/api/cuartos/:id` - Eliminar Cuarto**
```javascript
app.delete('/api/cuartos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (dbManager) {
            // Los mantenimientos se eliminarán automáticamente por CASCADE
            await dbManager.deleteCuarto(parseInt(id));
            res.json({ 
                success: true, 
                message: 'Cuarto eliminado correctamente' 
            });
        } else {
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al eliminar cuarto', 
            details: error.message 
        });
    }
});
```

**Tiempo estimado:** 3 horas

---

### 3. Métodos en Database Managers 🔴 ALTA PRIORIDAD

Agregar métodos faltantes en `db/postgres-manager.js`:

```javascript
// PostgresManager - Métodos faltantes

/**
 * Insertar nuevo edificio
 */
async insertEdificio(edificio) {
    const { nombre, descripcion } = edificio;
    const result = await this.pool.query(
        'INSERT INTO edificios (nombre, descripcion) VALUES ($1, $2) RETURNING *',
        [nombre, descripcion]
    );
    return result.rows[0];
}

/**
 * Actualizar edificio
 */
async updateEdificio(id, edificio) {
    const { nombre, descripcion } = edificio;
    await this.pool.query(
        'UPDATE edificios SET nombre = $1, descripcion = $2 WHERE id = $3',
        [nombre, descripcion, id]
    );
}

/**
 * Eliminar edificio
 */
async deleteEdificio(id) {
    await this.pool.query('DELETE FROM edificios WHERE id = $1', [id]);
}

/**
 * Insertar nuevo cuarto
 */
async insertCuarto(cuarto) {
    const { numero, edificio_id, descripcion, estado } = cuarto;
    const result = await this.pool.query(
        'INSERT INTO cuartos (numero, edificio_id, descripcion, estado) VALUES ($1, $2, $3, $4) RETURNING *',
        [numero, edificio_id, descripcion, estado || 'disponible']
    );
    return result.rows[0];
}

/**
 * Actualizar cuarto
 */
async updateCuarto(id, cuarto) {
    const { numero, edificio_id, descripcion, estado } = cuarto;
    await this.pool.query(
        'UPDATE cuartos SET numero = $1, edificio_id = $2, descripcion = $3, estado = $4 WHERE id = $5',
        [numero, edificio_id, descripcion, estado, id]
    );
}

/**
 * Actualizar solo el estado del cuarto
 */
async updateCuartoEstado(id, estado) {
    await this.pool.query(
        'UPDATE cuartos SET estado = $1 WHERE id = $2',
        [estado, id]
    );
}

/**
 * Eliminar cuarto
 */
async deleteCuarto(id) {
    await this.pool.query('DELETE FROM cuartos WHERE id = $1', [id]);
}
```

**Replicar los mismos métodos en:**
- `db/better-sqlite-manager.js` (sintaxis SQLite)
- `electron-database.js` (sintaxis SQLite)

**Tiempo estimado:** 2 horas

---

### 4. Interfaz Frontend (UI/UX) 🟡 MEDIA PRIORIDAD

#### a) Modales para Edificios

Crear en `index.html`:
```html
<!-- Modal Agregar/Editar Edificio -->
<div id="modalEdificio" class="modal" style="display: none;">
    <div class="modal-contenido">
        <span class="cerrar" onclick="cerrarModalEdificio()">&times;</span>
        <h2 id="tituloModalEdificio">Agregar Edificio</h2>
        <form id="formEdificio">
            <input type="hidden" id="edificioId">
            
            <div class="input-flotante">
                <input type="text" id="edificioNombre" required>
                <label for="edificioNombre">Nombre del Edificio *</label>
            </div>
            
            <div class="input-flotante">
                <textarea id="edificioDescripcion" rows="3"></textarea>
                <label for="edificioDescripcion">Descripción</label>
            </div>
            
            <div class="botones-modal">
                <button type="submit" class="boton-guardar">Guardar</button>
                <button type="button" class="boton-cancelar" onclick="cerrarModalEdificio()">Cancelar</button>
            </div>
        </form>
    </div>
</div>
```

#### b) Modales para Cuartos

```html
<!-- Modal Agregar/Editar Cuarto -->
<div id="modalCuarto" class="modal" style="display: none;">
    <div class="modal-contenido">
        <span class="cerrar" onclick="cerrarModalCuarto()">&times;</span>
        <h2 id="tituloModalCuarto">Agregar Cuarto</h2>
        <form id="formCuarto">
            <input type="hidden" id="cuartoId">
            
            <div class="input-flotante">
                <input type="text" id="cuartoNumero" required>
                <label for="cuartoNumero">Número de Cuarto *</label>
            </div>
            
            <div class="input-flotante">
                <select id="cuartoEdificio" required>
                    <option value="">Seleccionar edificio...</option>
                </select>
                <label for="cuartoEdificio">Edificio *</label>
            </div>
            
            <div class="input-flotante">
                <select id="cuartoEstado" required>
                    <option value="disponible">Disponible</option>
                    <option value="ocupado">Ocupado</option>
                    <option value="mantenimiento">En Mantenimiento</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                </select>
                <label for="cuartoEstado">Estado *</label>
            </div>
            
            <div class="input-flotante">
                <textarea id="cuartoDescripcion" rows="3"></textarea>
                <label for="cuartoDescripcion">Descripción</label>
            </div>
            
            <div class="botones-modal">
                <button type="submit" class="boton-guardar">Guardar</button>
                <button type="button" class="boton-cancelar" onclick="cerrarModalCuarto()">Cancelar</button>
            </div>
        </form>
    </div>
</div>
```

#### c) Botones de Acción

Agregar en la interfaz de cuartos:
```html
<!-- Botón para cambiar estado rápido -->
<div class="selector-estado">
    <select onchange="cambiarEstadoCuarto(${cuarto.id}, this.value)">
        <option value="disponible" ${cuarto.estado === 'disponible' ? 'selected' : ''}>🟢 Disponible</option>
        <option value="ocupado" ${cuarto.estado === 'ocupado' ? 'selected' : ''}>🔴 Ocupado</option>
        <option value="mantenimiento" ${cuarto.estado === 'mantenimiento' ? 'selected' : ''}>🟠 Mantenimiento</option>
        <option value="fuera_servicio" ${cuarto.estado === 'fuera_servicio' ? 'selected' : ''}>⚫ Fuera de Servicio</option>
    </select>
</div>
```

#### d) Funciones JavaScript

Crear en `app-loader.js` o archivo separado:

```javascript
// ============= EDIFICIOS =============

async function abrirModalEdificio(edificioId = null) {
    const modal = document.getElementById('modalEdificio');
    const titulo = document.getElementById('tituloModalEdificio');
    const form = document.getElementById('formEdificio');
    
    form.reset();
    
    if (edificioId) {
        titulo.textContent = 'Editar Edificio';
        // Cargar datos del edificio
        const edificios = await fetchEdificios();
        const edificio = edificios.find(e => e.id === edificioId);
        
        document.getElementById('edificioId').value = edificio.id;
        document.getElementById('edificioNombre').value = edificio.nombre;
        document.getElementById('edificioDescripcion').value = edificio.descripcion || '';
    } else {
        titulo.textContent = 'Agregar Edificio';
    }
    
    modal.style.display = 'flex';
}

function cerrarModalEdificio() {
    document.getElementById('modalEdificio').style.display = 'none';
}

async function guardarEdificio(event) {
    event.preventDefault();
    
    const id = document.getElementById('edificioId').value;
    const nombre = document.getElementById('edificioNombre').value.trim();
    const descripcion = document.getElementById('edificioDescripcion').value.trim();
    
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/edificios/${id}` : '/api/edificios';
    
    try {
        const response = await fetch(API_BASE_URL + url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, descripcion })
        });
        
        if (response.ok) {
            mostrarMensaje(`Edificio ${id ? 'actualizado' : 'creado'} exitosamente`, 'exito');
            cerrarModalEdificio();
            await cargarEdificios();
        } else {
            const error = await response.json();
            mostrarMensaje(error.error || 'Error al guardar edificio', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión: ' + error.message, 'error');
    }
}

async function eliminarEdificio(edificioId) {
    if (!confirm('¿Está seguro de eliminar este edificio?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/edificios/${edificioId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarMensaje('Edificio eliminado exitosamente', 'exito');
            await cargarEdificios();
        } else {
            const error = await response.json();
            mostrarMensaje(error.error || 'Error al eliminar edificio', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión: ' + error.message, 'error');
    }
}

// ============= CUARTOS =============

async function cambiarEstadoCuarto(cuartoId, nuevoEstado) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cuartos/${cuartoId}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (response.ok) {
            mostrarMensaje('Estado actualizado correctamente', 'exito');
            await cargarCuartos();
        } else {
            const error = await response.json();
            mostrarMensaje(error.error || 'Error al cambiar estado', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión: ' + error.message, 'error');
    }
}

async function abrirModalCuarto(cuartoId = null) {
    const modal = document.getElementById('modalCuarto');
    const titulo = document.getElementById('tituloModalCuarto');
    const form = document.getElementById('formCuarto');
    
    form.reset();
    
    // Cargar edificios en el select
    const edificios = await fetchEdificios();
    const selectEdificio = document.getElementById('cuartoEdificio');
    selectEdificio.innerHTML = '<option value="">Seleccionar edificio...</option>';
    edificios.forEach(e => {
        selectEdificio.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
    });
    
    if (cuartoId) {
        titulo.textContent = 'Editar Cuarto';
        // Cargar datos del cuarto
        const cuartos = await fetchCuartos();
        const cuarto = cuartos.find(c => c.id === cuartoId);
        
        document.getElementById('cuartoId').value = cuarto.id;
        document.getElementById('cuartoNumero').value = cuarto.numero;
        document.getElementById('cuartoEdificio').value = cuarto.edificio_id;
        document.getElementById('cuartoEstado').value = cuarto.estado || 'disponible';
        document.getElementById('cuartoDescripcion').value = cuarto.descripcion || '';
    } else {
        titulo.textContent = 'Agregar Cuarto';
    }
    
    modal.style.display = 'flex';
}

function cerrarModalCuarto() {
    document.getElementById('modalCuarto').style.display = 'none';
}

async function guardarCuarto(event) {
    event.preventDefault();
    
    const id = document.getElementById('cuartoId').value;
    const numero = document.getElementById('cuartoNumero').value.trim();
    const edificio_id = document.getElementById('cuartoEdificio').value;
    const estado = document.getElementById('cuartoEstado').value;
    const descripcion = document.getElementById('cuartoDescripcion').value.trim();
    
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/cuartos/${id}` : '/api/cuartos';
    
    try {
        const response = await fetch(API_BASE_URL + url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero, edificio_id, estado, descripcion })
        });
        
        if (response.ok) {
            mostrarMensaje(`Cuarto ${id ? 'actualizado' : 'creado'} exitosamente`, 'exito');
            cerrarModalCuarto();
            await cargarCuartos();
        } else {
            const error = await response.json();
            mostrarMensaje(error.error || 'Error al guardar cuarto', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión: ' + error.message, 'error');
    }
}

async function eliminarCuarto(cuartoId) {
    if (!confirm('¿Está seguro de eliminar este cuarto? También se eliminarán sus mantenimientos.')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/cuartos/${cuartoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarMensaje('Cuarto eliminado exitosamente', 'exito');
            await cargarCuartos();
        } else {
            const error = await response.json();
            mostrarMensaje(error.error || 'Error al eliminar cuarto', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión: ' + error.message, 'error');
    }
}

// Vincular eventos
document.getElementById('formEdificio')?.addEventListener('submit', guardarEdificio);
document.getElementById('formCuarto')?.addEventListener('submit', guardarCuarto);
```

**Tiempo estimado:** 4-5 horas

---

## 📋 RESUMEN DE TAREAS PENDIENTES

| # | Tarea | Prioridad | Tiempo Estimado | Dificultad |
|---|-------|-----------|-----------------|------------|
| 1 | Endpoints CRUD Edificios (Backend) | 🔴 Alta | 2 horas | Fácil |
| 2 | Endpoints CRUD Cuartos (Backend) | 🔴 Alta | 3 horas | Fácil |
| 3 | Métodos en Database Managers | 🔴 Alta | 2 horas | Fácil |
| 4 | Modales Frontend (HTML) | 🟡 Media | 2 horas | Fácil |
| 5 | Funciones JavaScript (Frontend) | 🟡 Media | 3 horas | Media |
| 6 | Estilos CSS para nuevos modales | 🟢 Baja | 1 hora | Fácil |
| 7 | Pruebas funcionales | 🟡 Media | 2 horas | Media |

**Tiempo Total Estimado:** **15 horas** (aproximadamente 2 días de trabajo)

---

## 🎯 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### Día 1 (8 horas)
1. **Mañana (4 horas)**
   - ✅ Agregar métodos en Database Managers (2h)
   - ✅ Implementar endpoints CRUD Edificios (2h)

2. **Tarde (4 horas)**
   - ✅ Implementar endpoints CRUD Cuartos (3h)
   - ✅ Pruebas básicas de endpoints con Postman/curl (1h)

### Día 2 (7 horas)
1. **Mañana (4 horas)**
   - ✅ Crear modales HTML para edificios y cuartos (2h)
   - ✅ Implementar funciones JavaScript (2h)

2. **Tarde (3 horas)**
   - ✅ Agregar estilos CSS (1h)
   - ✅ Pruebas funcionales completas (1h)
   - ✅ Corrección de bugs y ajustes finales (1h)

---

## ✅ CRITERIOS DE ACEPTACIÓN

El Sprint 1 estará **100% completo** cuando:

1. ✅ Se puedan **crear, editar y eliminar edificios** desde la interfaz
2. ✅ Se puedan **crear, editar y eliminar cuartos** desde la interfaz
3. ✅ Se pueda **cambiar el estado de un cuarto** (disponible, ocupado, mantenimiento, fuera de servicio) con un solo clic
4. ✅ Todos los cambios se **persistan en la base de datos**
5. ✅ Las **validaciones funcionen** correctamente (ej: no permitir eliminar edificio con cuartos)
6. ✅ La **interfaz sea responsive** y funcione en móvil/desktop
7. ✅ Los **mensajes de error y éxito** se muestren correctamente
8. ✅ Las **pruebas funcionales** pasen sin errores

---

## 🔍 CONSIDERACIONES ADICIONALES

### Validaciones Importantes
- ✅ No permitir nombres de edificio duplicados
- ✅ No permitir números de cuarto duplicados en el mismo edificio
- ✅ No permitir eliminar edificio con cuartos asociados
- ✅ Validar que los estados de cuarto sean válidos
- ✅ Campos obligatorios: nombre de edificio, número de cuarto, edificio asociado

### UX/UI
- Botón "+ Nuevo Edificio" visible en la sección de edificios
- Botón "+ Nuevo Cuarto" visible en la sección de cuartos
- Iconos de editar ✏️ y eliminar 🗑️ en cada elemento
- Selector de estado tipo dropdown con colores visuales
- Confirmaciones antes de eliminar (modal de confirmación)
- Mensajes de éxito/error con auto-desaparición (3-5 segundos)

### Compatibilidad
- Implementar tanto para modo online (servidor Express) como offline (Electron)
- Agregar manejadores IPC en `electron-main.js` para las nuevas funciones
- Actualizar `electron-app-loader.js` con las mismas funcionalidades

---

## 📌 PRÓXIMOS PASOS DESPUÉS DEL SPRINT 1

Una vez completado el Sprint 1 al 100%, se podrá avanzar al **Sprint 2: Alertas y Estados** que incluye:
- Sistema de notificaciones push mejorado
- Dashboard de alertas pendientes
- Calendario de mantenimientos programados
- Exportación a Excel
- Sistema de reportes

---

**Fecha de Creación:** 2 de noviembre de 2025  
**Autor:** Análisis del proyecto JW Mantto  
**Versión:** 1.0

