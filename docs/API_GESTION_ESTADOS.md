# API de Gestión de Estados de Cuartos

## Sistema de Control Dinámico de Estados de Habitaciones

**Fecha:** Noviembre 2025  
**Proyecto:** JW Mantto - Sistema de Mantenimiento Hotelero  
**Versión API:** 1.1.0

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Estados de Cuartos](#estados-de-cuartos)
3. [Endpoints Implementados](#endpoints-implementados)
4. [Ejemplos de Uso](#ejemplos-de-uso)
5. [Integración con Frontend](#integración-con-frontend)

---

## 1. Introducción

Este módulo implementa la gestión dinámica de estados de habitaciones/cuartos del hotel, permitiendo cambios en tiempo real y estadísticas actualizadas del estado ocupacional del establecimiento.

### Propósito

Controlar y monitorear el estado de cada habitación para:

- Optimizar la asignación de cuartos
- Coordinar el personal de limpieza
- Gestionar el mantenimiento preventivo y correctivo
- Generar reportes de ocupación

---

## 2. Estados de Cuartos

### Estados Disponibles

| Estado                   | Valor en BD      | Color      | Descripción                                   | Uso                                |
| ------------------------ | ---------------- | ---------- | --------------------------------------------- | ---------------------------------- |
| 🟢 **Disponible**        | `disponible`     | Verde      | Cuarto limpio y listo para ocupar             | Check-in disponible                |
| 🔵 **Ocupado**           | `ocupado`        | Azul       | Huésped hospedado actualmente                 | No disponible para nuevas reservas |
| 🟠 **Mantenimiento**     | `mantenimiento`  | Naranja    | En proceso de limpieza o reparación           | Temporalmente fuera de servicio    |
| ⚫ **Fuera de Servicio** | `fuera_servicio` | Gris/Negro | No disponible por remodelación o daños graves | Bloqueado por tiempo prolongado    |

### Transiciones Válidas

```
disponible ←→ ocupado
disponible ←→ mantenimiento
ocupado → mantenimiento → disponible
cualquiera → fuera_servicio → mantenimiento → disponible
```

---

## 3. Endpoints Implementados

### 3.1 Actualizar Estado de Cuarto

```http
PATCH /api/cuartos/:id/estado
```

Cambia el estado de un cuarto específico.

**Parámetros de URL:**

- `id` (number): ID del cuarto

**Body (JSON):**

```json
{
  "estado": "mantenimiento"
}
```

**Estados permitidos:**

- `disponible`
- `ocupado`
- `mantenimiento`
- `fuera_servicio`

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Estado cambiado a \"mantenimiento\" correctamente",
  "cuarto": {
    "id": 5,
    "numero": "301",
    "edificio_id": 2,
    "edificio_nombre": "Edificio B",
    "estado": "mantenimiento",
    "descripcion": null,
    "created_at": "2025-11-01T10:00:00.000Z",
    "updated_at": "2025-11-10T15:30:45.123Z"
  }
}
```

**Respuesta de error (400):**

```json
{
  "error": "El campo \"estado\" es obligatorio",
  "estadosPermitidos": [
    "disponible",
    "ocupado",
    "mantenimiento",
    "fuera_servicio"
  ]
}
```

**Respuesta de error (400) - Estado inválido:**

```json
{
  "error": "Error al actualizar estado",
  "details": "Estado no válido. Debe ser uno de: disponible, ocupado, mantenimiento, fuera_servicio"
}
```

---

### 3.2 Obtener Cuartos por Estado

```http
GET /api/cuartos/estado/:estado
```

Obtiene todos los cuartos que tienen un estado específico.

**Parámetros de URL:**

- `estado` (string): Estado a filtrar

**Respuesta exitosa (200):**

```json
{
  "estado": "ocupado",
  "total": 12,
  "cuartos": [
    {
      "id": 1,
      "numero": "101",
      "edificio_id": 1,
      "edificio_nombre": "Edificio A",
      "estado": "ocupado",
      "descripcion": null,
      "created_at": "2025-11-01T10:00:00.000Z",
      "updated_at": "2025-11-10T08:00:00.000Z"
    },
    {
      "id": 3,
      "numero": "102",
      "edificio_id": 1,
      "edificio_nombre": "Edificio A",
      "estado": "ocupado",
      "descripcion": null,
      "created_at": "2025-11-01T10:00:00.000Z",
      "updated_at": "2025-11-10T09:15:00.000Z"
    }
    // ... más cuartos
  ]
}
```

---

### 3.3 Obtener Estadísticas de Estados

```http
GET /api/cuartos/estadisticas/estados
```

Obtiene un resumen con contadores de cuartos por cada estado.

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "estadisticas": {
    "disponible": 25,
    "ocupado": 18,
    "mantenimiento": 5,
    "fuera_servicio": 2,
    "total": 50
  }
}
```

---

## 4. Ejemplos de Uso

### 4.1 JavaScript (Fetch API)

#### Cambiar estado a "Ocupado"

```javascript
async function cambiarEstadoAOcupado(cuartoId) {
  try {
    const response = await fetch(
      `http://localhost:3001/api/cuartos/${cuartoId}/estado`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: 'ocupado',
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Error al cambiar estado');
    }

    const resultado = await response.json();
    console.log('✅ Estado actualizado:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Uso
cambiarEstadoAOcupado(5);
```

#### Cambiar estado a "Mantenimiento"

```javascript
async function enviarAMantenimiento(cuartoId) {
  const response = await fetch(
    `http://localhost:3001/api/cuartos/${cuartoId}/estado`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'mantenimiento' }),
    }
  );

  const resultado = await response.json();

  if (resultado.success) {
    alert(`Cuarto ${resultado.cuarto.numero} enviado a mantenimiento`);
  }
}
```

#### Liberar cuarto (Disponible)

```javascript
async function liberarCuarto(cuartoId) {
  const response = await fetch(
    `http://localhost:3001/api/cuartos/${cuartoId}/estado`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'disponible' }),
    }
  );

  return await response.json();
}
```

#### Obtener todos los cuartos disponibles

```javascript
async function obtenerCuartosDisponibles() {
  try {
    const response = await fetch(
      'http://localhost:3001/api/cuartos/estado/disponible'
    );

    if (!response.ok) {
      throw new Error('Error al obtener cuartos');
    }

    const datos = await response.json();
    console.log(`📊 Cuartos disponibles: ${datos.total}`);
    console.log('Cuartos:', datos.cuartos);

    return datos;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Uso
const disponibles = await obtenerCuartosDisponibles();
```

#### Obtener estadísticas del hotel

```javascript
async function obtenerEstadisticas() {
  try {
    const response = await fetch(
      'http://localhost:3001/api/cuartos/estadisticas/estados'
    );

    const datos = await response.json();
    const stats = datos.estadisticas;

    console.log(`
            📊 ESTADÍSTICAS DEL HOTEL
            
            Total de cuartos: ${stats.total}
            
            🟢 Disponibles: ${stats.disponible} (${((stats.disponible / stats.total) * 100).toFixed(1)}%)
            🔵 Ocupados: ${stats.ocupado} (${((stats.ocupado / stats.total) * 100).toFixed(1)}%)
            🟠 Mantenimiento: ${stats.mantenimiento} (${((stats.mantenimiento / stats.total) * 100).toFixed(1)}%)
            ⚫ Fuera de servicio: ${stats.fuera_servicio} (${((stats.fuera_servicio / stats.total) * 100).toFixed(1)}%)
        `);

    return stats;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Uso
await obtenerEstadisticas();
```

### 4.2 cURL (Terminal)

#### Cambiar estado a "Mantenimiento"

```bash
curl -X PATCH http://localhost:3001/api/cuartos/5/estado \
  -H "Content-Type: application/json" \
  -d '{"estado":"mantenimiento"}'
```

#### Obtener cuartos ocupados

```bash
curl http://localhost:3001/api/cuartos/estado/ocupado
```

#### Obtener estadísticas

```bash
curl http://localhost:3001/api/cuartos/estadisticas/estados
```

#### Liberar cuarto (cambiar a disponible)

```bash
curl -X PATCH http://localhost:3001/api/cuartos/3/estado \
  -H "Content-Type: application/json" \
  -d '{"estado":"disponible"}'
```

#### Marcar como fuera de servicio

```bash
curl -X PATCH http://localhost:3001/api/cuartos/10/estado \
  -H "Content-Type: application/json" \
  -d '{"estado":"fuera_servicio"}'
```

---

## 5. Integración con Frontend

### 5.1 Botones de Cambio de Estado

```html
<!-- Botones para cambiar estado de cuarto -->
<div class="acciones-estado">
  <button
    onclick="cambiarEstado(cuartoId, 'disponible')"
    class="btn-estado btn-disponible"
  >
    🟢 Disponible
  </button>

  <button
    onclick="cambiarEstado(cuartoId, 'ocupado')"
    class="btn-estado btn-ocupado"
  >
    🔵 Ocupado
  </button>

  <button
    onclick="cambiarEstado(cuartoId, 'mantenimiento')"
    class="btn-estado btn-mantenimiento"
  >
    🟠 Mantenimiento
  </button>

  <button
    onclick="cambiarEstado(cuartoId, 'fuera_servicio')"
    class="btn-estado btn-fuera-servicio"
  >
    ⚫ Fuera de Servicio
  </button>
</div>
```

### 5.2 Función JavaScript para Cambiar Estado

```javascript
/**
 * Cambiar el estado de un cuarto y actualizar la interfaz
 */
async function cambiarEstado(cuartoId, nuevoEstado) {
  // Confirmar acción
  const confirmacion = confirm(
    `¿Cambiar estado del cuarto a "${nuevoEstado}"?`
  );

  if (!confirmacion) return;

  try {
    // Mostrar indicador de carga
    mostrarCargando(true);

    // Hacer petición a la API
    const response = await fetch(
      `http://localhost:3001/api/cuartos/${cuartoId}/estado`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      }
    );

    if (!response.ok) {
      throw new Error('Error al cambiar estado');
    }

    const resultado = await response.json();

    // Actualizar UI
    actualizarEstadoEnUI(cuartoId, nuevoEstado);

    // Recargar estadísticas
    await actualizarEstadisticas();

    // Mostrar mensaje de éxito
    mostrarMensaje(`Estado cambiado exitosamente`, 'success');
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cambiar estado', 'error');
  } finally {
    mostrarCargando(false);
  }
}
```

### 5.3 Dashboard de Estadísticas

```javascript
/**
 * Renderizar dashboard con estadísticas de estados
 */
async function renderizarDashboard() {
  const stats = await obtenerEstadisticas();

  const dashboardHTML = `
        <div class="dashboard-estados">
            <div class="card-estado disponible">
                <div class="icono">🟢</div>
                <div class="numero">${stats.disponible}</div>
                <div class="label">Disponibles</div>
                <div class="porcentaje">
                    ${((stats.disponible / stats.total) * 100).toFixed(1)}%
                </div>
            </div>
            
            <div class="card-estado ocupado">
                <div class="icono">🔵</div>
                <div class="numero">${stats.ocupado}</div>
                <div class="label">Ocupados</div>
                <div class="porcentaje">
                    ${((stats.ocupado / stats.total) * 100).toFixed(1)}%
                </div>
            </div>
            
            <div class="card-estado mantenimiento">
                <div class="icono">🟠</div>
                <div class="numero">${stats.mantenimiento}</div>
                <div class="label">Mantenimiento</div>
                <div class="porcentaje">
                    ${((stats.mantenimiento / stats.total) * 100).toFixed(1)}%
                </div>
            </div>
            
            <div class="card-estado fuera-servicio">
                <div class="icono">⚫</div>
                <div class="numero">${stats.fuera_servicio}</div>
                <div class="label">Fuera de Servicio</div>
                <div class="porcentaje">
                    ${((stats.fuera_servicio / stats.total) * 100).toFixed(1)}%
                </div>
            </div>
        </div>
    `;

  document.getElementById('dashboard').innerHTML = dashboardHTML;
}
```

### 5.4 Filtrado por Estado en UI

```javascript
/**
 * Filtrar y mostrar solo cuartos con estado específico
 */
async function filtrarPorEstado(estado) {
  try {
    const response = await fetch(
      `http://localhost:3001/api/cuartos/estado/${estado}`
    );

    const datos = await response.json();

    // Limpiar lista actual
    const listaCuartos = document.getElementById('listaCuartos');
    listaCuartos.innerHTML = '';

    // Mostrar cuartos filtrados
    datos.cuartos.forEach((cuarto) => {
      const li = crearElementoCuarto(cuarto);
      listaCuartos.appendChild(li);
    });

    // Actualizar contador
    document.getElementById('contador').textContent =
      `Mostrando ${datos.total} cuartos con estado "${estado}"`;
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al filtrar cuartos', 'error');
  }
}
```

---

## 6. Código en el Backend

### 6.1 Database Manager (postgres-manager.js)

```javascript
/**
 * Actualizar el estado de un cuarto
 */
async updateEstadoCuarto(id, nuevoEstado) {
    // Validar estados permitidos
    const estadosPermitidos = [
        'disponible',
        'ocupado',
        'mantenimiento',
        'fuera_servicio'
    ];

    if (!estadosPermitidos.includes(nuevoEstado)) {
        throw new Error(
            `Estado no válido. Debe ser uno de: ${estadosPermitidos.join(', ')}`
        );
    }

    const query = `
        UPDATE cuartos
        SET estado = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `;

    const result = await this.pool.query(query, [nuevoEstado, id]);

    if (result.rows.length === 0) {
        throw new Error('Cuarto no encontrado');
    }

    // Obtener el cuarto completo con información del edificio
    return await this.getCuartoById(id);
}

/**
 * Obtener cuartos filtrados por estado
 */
async getCuartosPorEstado(estado) {
    const query = `
        SELECT c.*, e.nombre as edificio_nombre
        FROM cuartos c
        LEFT JOIN edificios e ON c.edificio_id = e.id
        WHERE c.estado = $1
        ORDER BY e.nombre, c.numero
    `;
    const result = await this.pool.query(query, [estado]);
    return result.rows;
}

/**
 * Obtener estadísticas de estados de cuartos
 */
async getEstadisticasEstados() {
    const query = `
        SELECT
            estado,
            COUNT(*) as cantidad,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje
        FROM cuartos
        GROUP BY estado
        ORDER BY cantidad DESC
    `;
    const result = await this.pool.query(query);

    const estadisticas = {
        disponible: 0,
        ocupado: 0,
        mantenimiento: 0,
        fuera_servicio: 0,
        total: 0
    };

    result.rows.forEach(row => {
        estadisticas[row.estado] = parseInt(row.cantidad);
        estadisticas.total += parseInt(row.cantidad);
    });

    return estadisticas;
}
```

---

## 7. Casos de Uso

### Caso 1: Check-In de Huésped

```javascript
// Cuando un huésped hace check-in
await cambiarEstado(cuartoId, 'ocupado');
```

### Caso 2: Check-Out y Solicitud de Limpieza

```javascript
// Al hacer check-out, enviar cuarto a mantenimiento
await cambiarEstado(cuartoId, 'mantenimiento');

// Crear solicitud de mantenimiento
await fetch('http://localhost:3001/api/mantenimientos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cuarto_id: cuartoId,
    tipo: 'normal',
    descripcion: 'Limpieza post check-out',
  }),
});
```

### Caso 3: Finalizar Limpieza

```javascript
// Personal de limpieza finaliza trabajo
await cambiarEstado(cuartoId, 'disponible');

// Opcional: Completar mantenimiento
await fetch(`http://localhost:3001/api/mantenimientos/${mantenimientoId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    estado: 'completado',
  }),
});
```

### Caso 4: Remodelación de Cuarto

```javascript
// Cuarto fuera por remodelación prolongada
await cambiarEstado(cuartoId, 'fuera_servicio');
```

---

## 8. Ventajas de la Implementación

### ✅ Actualización en Tiempo Real

- Los cambios de estado se reflejan inmediatamente
- No requiere recargar toda la página

### ✅ Validación Robusta

- Estados predefinidos y validados
- Mensajes de error descriptivos
- Imposible establecer estados inválidos

### ✅ Historial Automático

- Campo `updated_at` registra último cambio
- Posibilidad de agregar tabla de historial

### ✅ Estadísticas Automáticas

- Contadores actualizados dinámicamente
- Porcentajes calculados en BD

### ✅ Integración Simple

- API RESTful estándar
- Fácil de consumir desde cualquier frontend

---

## 9. Mejoras Futuras

### Posibles Extensiones

1. **Historial de Estados**

```sql
CREATE TABLE historial_estados (
    id SERIAL PRIMARY KEY,
    cuarto_id INTEGER,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    usuario_id INTEGER,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

2. **Notificaciones Automáticas**

```javascript
// Enviar notificación cuando cuarto esté listo
if (nuevoEstado === 'disponible') {
  await notificarRecepcion(cuartoId);
}
```

3. **Validaciones de Transición**

```javascript
// Evitar transiciones inválidas (ej: ocupado → fuera_servicio)
const transicionesValidas = {
  ocupado: ['mantenimiento'],
  mantenimiento: ['disponible', 'fuera_servicio'],
  // ...
};
```

4. **WebSocket para Updates en Tiempo Real**

```javascript
// Notificar a todos los clientes conectados
io.emit('estado_actualizado', {
  cuartoId,
  nuevoEstado,
  timestamp: new Date(),
});
```

---

## 📞 Información de Contacto

**Proyecto:** JW Mantto - Sistema de Mantenimiento Hotelero  
**Desarrollador:** Juan Leonardo Cruz Flores  
**Email:** leonardo.cfjl@gmail.com  
**Versión:** 1.1.0

---

**Fecha de creación:** 10 de noviembre de 2025  
**Última actualización:** 10 de noviembre de 2025
