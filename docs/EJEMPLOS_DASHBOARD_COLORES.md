# Ejemplos: Dashboard con Colores de Estados

## 🎨 Nuevos Endpoints con Paleta de Colores

### 1. Obtener Configuración de Colores

```http
GET /api/cuartos/configuracion/estados
```

**Respuesta:**

```json
{
  "success": true,
  "version": "1.0",
  "descripcion": "Configuración de estados de cuartos con paleta de colores",
  "estados": {
    "disponible": {
      "valor": "disponible",
      "label": "Disponible",
      "descripcion": "Cuarto limpio y listo para ocupar",
      "color": "#4CAF50",
      "colorHex": "4CAF50",
      "colorRgb": "rgb(76, 175, 80)",
      "colorSecundario": "#E8F5E9",
      "icono": "🟢",
      "prioridad": 1,
      "disponibleParaReserva": true
    },
    "ocupado": {
      "valor": "ocupado",
      "label": "Ocupado",
      "descripcion": "Huésped hospedado actualmente",
      "color": "#2196F3",
      "colorHex": "2196F3",
      "colorRgb": "rgb(33, 150, 243)",
      "colorSecundario": "#E3F2FD",
      "icono": "🔵",
      "prioridad": 2,
      "disponibleParaReserva": false
    },
    "mantenimiento": {
      "valor": "mantenimiento",
      "label": "Mantenimiento",
      "descripcion": "En proceso de limpieza o reparación",
      "color": "#FF9800",
      "colorHex": "FF9800",
      "colorRgb": "rgb(255, 152, 0)",
      "colorSecundario": "#FFF3E0",
      "icono": "🟠",
      "prioridad": 3,
      "disponibleParaReserva": false
    },
    "fuera_servicio": {
      "valor": "fuera_servicio",
      "label": "Fuera de Servicio",
      "descripcion": "No disponible por remodelación o daños graves",
      "color": "#616161",
      "colorHex": "616161",
      "colorRgb": "rgb(97, 97, 97)",
      "colorSecundario": "#F5F5F5",
      "icono": "⚫",
      "prioridad": 4,
      "disponibleParaReserva": false
    }
  }
}
```

### 2. Obtener Dashboard Completo (Estadísticas + Colores)

```http
GET /api/cuartos/dashboard/estados
```

**Respuesta:**

```json
{
  "success": true,
  "timestamp": "2025-11-10T16:45:30.123Z",
  "dashboard": {
    "total": 50,
    "estados": {
      "disponible": {
        "valor": "disponible",
        "label": "Disponible",
        "descripcion": "Cuarto limpio y listo para ocupar",
        "color": "#4CAF50",
        "colorHex": "4CAF50",
        "colorRgb": "rgb(76, 175, 80)",
        "colorSecundario": "#E8F5E9",
        "icono": "🟢",
        "prioridad": 1,
        "disponibleParaReserva": true,
        "cantidad": 25,
        "porcentaje": "50.0"
      },
      "ocupado": {
        "valor": "ocupado",
        "label": "Ocupado",
        "descripcion": "Huésped hospedado actualmente",
        "color": "#2196F3",
        "colorHex": "2196F3",
        "colorRgb": "rgb(33, 150, 243)",
        "colorSecundario": "#E3F2FD",
        "icono": "🔵",
        "prioridad": 2,
        "disponibleParaReserva": false,
        "cantidad": 18,
        "porcentaje": "36.0"
      },
      "mantenimiento": {
        "valor": "mantenimiento",
        "label": "Mantenimiento",
        "descripcion": "En proceso de limpieza o reparación",
        "color": "#FF9800",
        "colorHex": "FF9800",
        "colorRgb": "rgb(255, 152, 0)",
        "colorSecundario": "#FFF3E0",
        "icono": "🟠",
        "prioridad": 3,
        "disponibleParaReserva": false,
        "cantidad": 5,
        "porcentaje": "10.0"
      },
      "fuera_servicio": {
        "valor": "fuera_servicio",
        "label": "Fuera de Servicio",
        "descripcion": "No disponible por remodelación o daños graves",
        "color": "#616161",
        "colorHex": "616161",
        "colorRgb": "rgb(97, 97, 97)",
        "colorSecundario": "#F5F5F5",
        "icono": "⚫",
        "prioridad": 4,
        "disponibleParaReserva": false,
        "cantidad": 2,
        "porcentaje": "4.0"
      }
    }
  }
}
```

---

## 📊 Ejemplo: Renderizar Dashboard HTML con Colores

### JavaScript

```javascript
/**
 * Cargar y renderizar dashboard con colores dinámicos
 */
async function renderizarDashboardConColores() {
    try {
        // Obtener dashboard completo
        const response = await fetch('http://localhost:3001/api/cuartos/dashboard/estados');
        const data = await response.json();
        
        const dashboard = data.dashboard;
        const container = document.getElementById('dashboard-estados');
        
        // Generar HTML para cada estado
        let html = '<div class="dashboard-grid">';
        
        Object.values(dashboard.estados).forEach(estado => {
            html += `
                <div class="card-estado" 
                     style="border-left: 5px solid ${estado.color}; 
                            background: ${estado.colorSecundario}">
                    <div class="estado-header">
                        <span class="icono">${estado.icono}</span>
                        <span class="label">${estado.label}</span>
                    </div>
                    <div class="estado-numero" style="color: ${estado.color}">
                        ${estado.cantidad}
                    </div>
                    <div class="estado-porcentaje">
                        ${estado.porcentaje}% del total
                    </div>
                    <div class="estado-descripcion">
                        ${estado.descripcion}
                    </div>
                    ${estado.disponibleParaReserva ? 
                        '<div class="badge-disponible">✓ Reservable</div>' : 
                        '<div class="badge-no-disponible">✗ No reservable</div>'
                    }
                </div>
            `;
        });
        
        html += '</div>';
        
        // Agregar total
        html += `
            <div class="dashboard-total">
                <strong>Total de cuartos:</strong> ${dashboard.total}
            </div>
        `;
        
        container.innerHTML = html;
        
        console.log('✅ Dashboard renderizado correctamente');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', renderizarDashboardConColores);

// Actualizar cada 30 segundos
setInterval(renderizarDashboardConColores, 30000);
```

### CSS

```css
/* Estilos para el dashboard de estados */
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

.card-estado {
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card-estado:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
}

.estado-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
}

.estado-header .icono {
    font-size: 24px;
}

.estado-header .label {
    font-weight: bold;
    font-size: 18px;
    color: #333;
}

.estado-numero {
    font-size: 48px;
    font-weight: bold;
    margin: 10px 0;
}

.estado-porcentaje {
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
}

.estado-descripcion {
    font-size: 13px;
    color: #888;
    margin-bottom: 15px;
}

.badge-disponible {
    display: inline-block;
    padding: 5px 10px;
    background: #4CAF50;
    color: white;
    border-radius: 5px;
    font-size: 12px;
}

.badge-no-disponible {
    display: inline-block;
    padding: 5px 10px;
    background: #999;
    color: white;
    border-radius: 5px;
    font-size: 12px;
}

.dashboard-total {
    margin-top: 20px;
    padding: 15px;
    background: #f5f5f5;
    border-radius: 5px;
    text-align: center;
    font-size: 18px;
}
```

### HTML

```html
<div id="dashboard-estados">
    <div class="loading">Cargando dashboard...</div>
</div>
```

---

## 🎨 Ejemplo: Aplicar Colores a Lista de Cuartos

```javascript
/**
 * Renderizar cuarto con color dinámico según su estado
 */
async function renderizarCuartoConColor(cuarto) {
    // Obtener configuración de colores
    const response = await fetch('http://localhost:3001/api/cuartos/configuracion/estados');
    const config = await response.json();
    
    const estadoConfig = config.estados[cuarto.estado];
    
    return `
        <div class="cuarto-card" 
             style="border-left: 5px solid ${estadoConfig.color};
                    background: ${estadoConfig.colorSecundario}">
            <div class="cuarto-header">
                <span class="icono">${estadoConfig.icono}</span>
                <h3>${cuarto.numero}</h3>
                <span class="badge-estado" 
                      style="background: ${estadoConfig.color}">
                    ${estadoConfig.label}
                </span>
            </div>
            <p class="cuarto-edificio">${cuarto.edificio_nombre}</p>
            <p class="cuarto-descripcion">${estadoConfig.descripcion}</p>
            
            <!-- Botones de acciones -->
            <div class="cuarto-acciones">
                ${renderizarBotonesEstado(cuarto.id, cuarto.estado, config.estados)}
            </div>
        </div>
    `;
}

/**
 * Renderizar botones de cambio de estado con colores
 */
function renderizarBotonesEstado(cuartoId, estadoActual, configuracion) {
    let html = '<div class="botones-estado">';
    
    Object.values(configuracion).forEach(estado => {
        const esActivo = estado.valor === estadoActual;
        html += `
            <button 
                class="btn-estado ${esActivo ? 'activo' : ''}"
                onclick="cambiarEstado(${cuartoId}, '${estado.valor}')"
                style="
                    background: ${esActivo ? estado.color : 'white'};
                    color: ${esActivo ? 'white' : estado.color};
                    border: 2px solid ${estado.color};
                "
                ${esActivo ? 'disabled' : ''}>
                ${estado.icono} ${estado.label}
            </button>
        `;
    });
    
    html += '</div>';
    return html;
}
```

---

## 📈 Ejemplo: Gráfica de Barras con Colores

```javascript
/**
 * Renderizar gráfica de barras horizontal con colores
 */
async function renderizarGraficaBarras() {
    const response = await fetch('http://localhost:3001/api/cuartos/dashboard/estados');
    const data = await response.json();
    
    const dashboard = data.dashboard;
    const container = document.getElementById('grafica-estados');
    
    let html = '<div class="grafica-container">';
    
    Object.values(dashboard.estados)
        .sort((a, b) => b.cantidad - a.cantidad)
        .forEach(estado => {
            html += `
                <div class="barra-item">
                    <div class="barra-label">
                        ${estado.icono} ${estado.label}
                    </div>
                    <div class="barra-wrapper">
                        <div class="barra-progreso" 
                             style="width: ${estado.porcentaje}%;
                                    background: linear-gradient(90deg, 
                                        ${estado.color} 0%, 
                                        ${estado.colorSecundario} 100%)">
                            <span class="barra-texto" 
                                  style="color: ${estado.color}">
                                ${estado.cantidad} (${estado.porcentaje}%)
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
    
    html += '</div>';
    container.innerHTML = html;
}
```

### CSS para Gráfica

```css
.grafica-container {
    padding: 20px;
}

.barra-item {
    margin-bottom: 15px;
}

.barra-label {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 14px;
}

.barra-wrapper {
    background: #f0f0f0;
    border-radius: 10px;
    height: 40px;
    overflow: hidden;
    position: relative;
}

.barra-progreso {
    height: 100%;
    display: flex;
    align-items: center;
    padding: 0 15px;
    transition: width 0.5s ease;
    border-radius: 10px;
}

.barra-texto {
    font-weight: bold;
    font-size: 14px;
    white-space: nowrap;
}
```

---

## 🔔 Ejemplo: Badge de Estado con Color

```javascript
/**
 * Crear badge de estado con color dinámico
 */
async function crearBadgeEstado(estado) {
    const response = await fetch('http://localhost:3001/api/cuartos/configuracion/estados');
    const config = await response.json();
    
    const estadoConfig = config.estados[estado];
    
    return `
        <span class="badge-estado-inline" 
              style="
                background: ${estadoConfig.color};
                color: white;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                display: inline-flex;
                align-items: center;
                gap: 5px;
              ">
            ${estadoConfig.icono}
            ${estadoConfig.label}
        </span>
    `;
}

// Uso
document.getElementById('estado-cuarto').innerHTML = 
    await crearBadgeEstado('mantenimiento');
```

---

## 🎯 Ejemplo: Filtro por Estado con Colores

```html
<!-- HTML -->
<div class="filtros-estado">
    <button class="filtro-btn" data-estado="todos" onclick="filtrarPorEstado('todos')">
        Todos
    </button>
    <!-- Los demás botones se generan dinámicamente -->
</div>

<div id="lista-cuartos"></div>
```

```javascript
/**
 * Inicializar filtros con colores
 */
async function inicializarFiltros() {
    const response = await fetch('http://localhost:3001/api/cuartos/configuracion/estados');
    const config = await response.json();
    
    const container = document.querySelector('.filtros-estado');
    
    // Botón "Todos"
    let html = `
        <button class="filtro-btn activo" 
                data-estado="todos" 
                onclick="filtrarPorEstado('todos')">
            Todos
        </button>
    `;
    
    // Botones por estado
    Object.values(config.estados).forEach(estado => {
        html += `
            <button class="filtro-btn" 
                    data-estado="${estado.valor}" 
                    onclick="filtrarPorEstado('${estado.valor}')"
                    style="
                        border-color: ${estado.color};
                        color: ${estado.color};
                    ">
                ${estado.icono} ${estado.label}
            </button>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Filtrar cuartos por estado
 */
async function filtrarPorEstado(estado) {
    // Actualizar botones activos
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('activo');
    });
    document.querySelector(`[data-estado="${estado}"]`).classList.add('activo');
    
    // Obtener cuartos
    let url = 'http://localhost:3001/api/cuartos';
    if (estado !== 'todos') {
        url = `http://localhost:3001/api/cuartos/estado/${estado}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    const cuartos = estado === 'todos' ? data : data.cuartos;
    
    // Renderizar cuartos
    renderizarListaCuartos(cuartos);
}
```

---

## 📱 Ejemplo: Notificación con Color de Estado

```javascript
/**
 * Mostrar notificación cuando cambia el estado
 */
async function notificarCambioEstado(cuartoId, nuevoEstado) {
    const response = await fetch('http://localhost:3001/api/cuartos/configuracion/estados');
    const config = await response.json();
    
    const estadoConfig = config.estados[nuevoEstado];
    
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion';
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${estadoConfig.color};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    notificacion.innerHTML = `
        <strong>${estadoConfig.icono} Estado Actualizado</strong><br>
        Cuarto #${cuartoId}: ${estadoConfig.label}
    `;
    
    document.body.appendChild(notificacion);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
```

---

## 🎨 Paleta de Colores Implementada

```javascript
const PALETA_ESTADOS = {
    disponible: {
        principal: '#4CAF50',      // Verde
        secundario: '#E8F5E9',     // Verde claro
        texto: '#FFFFFF'
    },
    ocupado: {
        principal: '#2196F3',      // Azul
        secundario: '#E3F2FD',     // Azul claro
        texto: '#FFFFFF'
    },
    mantenimiento: {
        principal: '#FF9800',      // Naranja
        secundario: '#FFF3E0',     // Naranja claro
        texto: '#FFFFFF'
    },
    fuera_servicio: {
        principal: '#616161',      // Gris oscuro
        secundario: '#F5F5F5',     // Gris claro
        texto: '#FFFFFF'
    }
};
```

---

**Fecha:** 10 de noviembre de 2025  
**Proyecto:** JW Mantto - Sistema de Mantenimiento Hotelero  
**Versión:** 1.1.0

