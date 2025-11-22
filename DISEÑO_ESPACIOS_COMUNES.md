# Diseño y Estructura de la Vista de Espacios Comunes

Este documento contiene la extracción completa del diseño y estructura de la vista de Espacios Comunes para su implementación en otros módulos.

## 1. Estructura HTML

### Contenedor Principal

```html
<!-- Tab Content: Espacios Comunes -->
<div class="tab-content" id="tab-espacios" data-aos="fade-in">
    <h1 class="titulos t-principal">Bitácora de Espacios Comunes</h1>
    <h2 class="titulos t-secundario">Control de Áreas Públicas · JW Marriott</h2>
    
    <!-- Panel de búsqueda y filtros -->
    <div class="panel panel-filtros" data-aos="fade-down">
        <div class="busqueda-filtros usuarios-filtros">
            <div class="campo-busqueda premium-search">
                <i class="fas fa-search icono-busqueda"></i>
                <input type="text" id="buscarEspacio" placeholder="Buscar espacio...">
            </div>
            <div class="campo-busqueda premium-search">
                <i class="fas fa-tools icono-busqueda"></i>
                <input type="text" id="buscarServicioEspacio" placeholder="Buscar por servicio...">
            </div>
            <div class="select-container premium-select">
                <select id="filtroTipoEspacio" name="tipo_espacio">
                    <option value="">Todos los espacios</option>
                    <option value="comun">Áreas Comunes</option>
                    <option value="recreativo">Recreación</option>
                    <option value="eventos">Eventos</option>
                    <option value="servicios">Servicios</option>
                </select>
                <i class="fas fa-chevron-down icono-select"></i>
            </div>
            <div class="select-container premium-select">
                <select id="filtroPrioridadEspacio" name="prioridad_espacio">
                    <option value="">Todas las prioridades</option>
                    <option value="baja">🟢 Baja</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🔴 Alta</option>
                </select>
                <i class="fas fa-chevron-down icono-select"></i>
            </div>
            <div class="select-container premium-select">
                <select id="filtroEstadoEspacio" name="estado_espacio">
                    <option value="">Todos los estados</option>
                    <option value="disponible">Disponible</option>
                    <option value="mantenimiento">En mantenimiento</option>
                    <option value="ocupado">Ocupado</option>
                    <option value="fuera_servicio">Fuera de servicio</option>
                </select>
                <i class="fas fa-chevron-down icono-select"></i>
            </div>
        </div>
    </div>
    
    <!-- Estructura de vista duo -->
    <div class="vista-duo">
        <!-- Columna izquierda (3/4) - Lista de espacios -->
        <div class="columna columna-principal">
            <ul class="lista-cuartos brutalist-grid" id="listaEspacios" data-aos="fade-up">
                <!-- Los espacios se dibujan dinámicamente -->
            </ul>
            <div class="habitaciones-pagination" id="espaciosPagination" aria-live="polite"></div>
            <div id="mensajeNoEspacios" class="mensaje-no-cuartos" style="display: none; margin-top: 20px;">
                <i class="fas fa-search"></i>
                <p>No se encontraron espacios con los criterios seleccionados</p>
            </div>
        </div>

        <!-- Columna derecha (1/4) - Paneles informativos -->
        <div class="columna columna-lateral">
            <!-- Alertas Programadas -->
            <div class="panel panel-alertas-espacios gradient-card" data-aos="fade-left">
                <div class="panel-header-alertas">
                    <h2><i class="fas fa-bullhorn"></i> Alertas Programadas</h2>
                </div>
                <ul class="lista-alertas-espacios" id="listaAlertasProgramadasEspacios">
                    <li class="mensaje-cargando">Cargando alertas...</li>
                </ul>
            </div>

            <!-- Alertas del Día -->
            <div class="panel panel-alertas-espacios gradient-card" data-aos="fade-left" data-aos-delay="80">
                <div class="panel-header-alertas">
                    <h2><i class="fas fa-calendar-day"></i> Alertas del Día</h2>
                </div>
                <ul class="lista-alertas-espacios lista-alertas-dia-limitada" id="listaAlertasDiaEspacios">
                    <li class="mensaje-cargando">Cargando alertas...</li>
                </ul>
                <p id="mensajeNoAlertasDiaEspacios" class="mensaje-no-items" style="display: none;">
                    <i class="fas fa-check-circle"></i> No hay alertas para hoy
                </p>
            </div>

            <!-- Panel de Estadísticas -->
            <div class="card-container usuarios-stats-container espacios-stats-container" data-aos="fade-left" data-aos-delay="100">
                <div class="pixar-card usuario-stats-card espacios-stats-card" role="article" aria-labelledby="espaciosStatsTitle">
                    <div class="card-header">
                        <div class="card-avatar"></div>
                        <p class="card-username" id="espaciosStatsTitle">Panel de Espacios</p>
                    </div>

                    <div class="card-image-area">
                        <div class="card-image-placeholder">
                            <div class="pixar-progress" id="espaciosStatsProgress" data-percent="0%" style="--progress-value: 0%"></div>
                        </div>
                        <p class="card-caption">
                            <span id="espaciosStatsCaption">Total de espacios: 0</span>
                            <span class="card-caption-highlight" id="espaciosStatsHighlight">Disponibles: 0 · En mantto.: 0</span>
                        </p>
                    </div>

                    <div class="card-actions">
                        <button class="action-button like-button" type="button" aria-label="Espacios disponibles">
                            <div class="action-button-metric">
                                <span class="metric-label">Disponibles</span>
                                <strong id="espaciosStatsDisponibles">0</strong>
                            </div>
                        </button>
                        <button class="action-button" type="button" aria-label="Espacios en mantenimiento">
                            <div class="action-button-metric">
                                <span class="metric-label">Mantto.</span>
                                <strong id="espaciosStatsMantenimiento">0</strong>
                            </div>
                        </button>
                        <button class="action-button comment-button" type="button" aria-label="Espacios fuera de servicio">
                            <div class="action-button-metric">
                                <span class="metric-label">Fuera</span>
                                <strong id="espaciosStatsFuera">0</strong>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

### Estructura de Tarjeta de Espacio (generada dinámicamente)

```html
<li class="habitacion-card espacio-card" id="espacio-{id}">
    <div class="habitacion-header">
        <div class="habitacion-titulo">
            <i class="habitacion-icon fas {icono}"></i>
            <div>
                <div class="habitacion-nombre">{nombre}</div>
                <div class="habitacion-edificio">
                    <i class="fas fa-map-marker-alt"></i> {ubicacion}
                </div>
            </div>
        </div>
        <div class="habitacion-estado-badge {clase-estado}">
            <i class="fas {icono-estado}"></i> {texto-estado}
        </div>
    </div>
    <div class="habitacion-servicios" id="servicios-espacio-{id}">
        <!-- Servicios generados dinámicamente -->
    </div>
    <div class="habitacion-acciones">
        <button class="habitacion-boton boton-secundario" onclick="toggleModoEdicionEspacio({id})" id="btn-editar-espacio-{id}">
            <i class="fas fa-edit"></i> Editar
        </button>
        <button class="habitacion-boton boton-principal" onclick="seleccionarEspacio({id})">
            <i class="fas fa-plus"></i> Agregar
        </button>
    </div>
</li>
```

## 2. Estilos CSS

### Layout Principal

```css
/* Vista Duo - Layout de dos columnas */
.vista-duo {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 2rem;
  margin-top: 2rem;
}

.columna-principal {
  min-height: 400px;
}

.columna-lateral {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Grid de tarjetas */
.brutalist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  align-items: flex-start;
  align-content: flex-start;
  list-style: none;
  padding: 0;
  margin: 0;
}
```

### Panel de Filtros

```css
.panel-filtros {
  background: var(--blanco);
  border-radius: var(--radio-grande);
  padding: 1.5rem;
  box-shadow: var(--sombra-media);
  margin-bottom: 2rem;
  border: 3px solid var(--negro-carbon);
}

.busqueda-filtros {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.8rem;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}
```

### Tarjeta de Espacio

```css
.habitacion-card {
  background: var(--bg-principal);
  border: 4px solid var(--border-color);
  border-radius: var(--radio-grande);
  padding: 1.5rem;
  box-shadow: 8px 8px 0 var(--gris-oscuro);
  transition: var(--transicion-normal);
  position: relative;
  overflow: hidden;
}

.habitacion-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--verde-oliva) 0%, var(--rojo-vino) 100%);
}

.habitacion-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: 11px 11px 0 var(--gris-oscuro);
}

.habitacion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid var(--border-color);
}

.habitacion-titulo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.habitacion-icon {
  font-size: 2rem;
  color: var(--verde-oliva);
}

.habitacion-nombre {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--texto-principal);
}

.habitacion-edificio {
  font-size: 0.85rem;
  color: var(--texto-secundario);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.habitacion-estado-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radio-pequeno);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 2px solid var(--negro-carbon);
}

/* Estados */
.estado-ocupado {
  background: var(--prioridad-alta);
  color: var(--blanco);
}

.estado-vacio {
  background: var(--prioridad-baja);
  color: var(--blanco);
}

.estado-mantenimiento {
  background: var(--prioridad-media);
  color: var(--negro-carbon);
}

.estado-fuera-servicio {
  background: var(--gris-grafito);
  color: var(--blanco);
}
```

### Servicios dentro de la Tarjeta

```css
.habitacion-servicios {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.servicio-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background: var(--gris-claro);
  border-left: 4px solid var(--verde-oliva);
  border-radius: var(--radio-pequeno);
  transition: var(--transicion-rapida);
  cursor: pointer;
  flex: 1;
  margin-bottom: 0.8rem;
}

.servicio-item:hover {
  transform: translateX(3px);
  background: var(--gris-separador);
}

.servicio-item.servicio-alerta {
  border-left-color: var(--prioridad-media);
  background: rgba(255, 181, 0, 0.05);
}
```

### Paneles de Alertas

```css
.panel-alertas-espacios {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lista-alertas-espacios {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-height: 360px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.lista-alertas-dia-limitada {
  max-height: 230px;
}

.alerta-espacio-item {
  padding: 0.85rem;
  border: 2px solid var(--negro-carbon);
  border-radius: var(--radio-medio);
  background: var(--gris-claro);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.08);
}

.alerta-espacio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.alerta-espacio-badge {
  font-weight: 700;
  color: var(--negro-carbon);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  text-transform: uppercase;
}

.alerta-prioridad-pill {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  border: 2px solid var(--negro-carbon);
  letter-spacing: 0.5px;
}

.alerta-prioridad-baja {
  background: rgba(0, 153, 0, 0.15);
  color: #017501;
}

.alerta-prioridad-media {
  background: rgba(255, 204, 0, 0.2);
  color: #a66b00;
}

.alerta-prioridad-alta {
  background: rgba(204, 0, 0, 0.2);
  color: #a10000;
}
```

## 3. Funciones JavaScript Principales

### Función Principal de Renderizado

```javascript
function mostrarEspacios() {
    const listaEspacios = document.getElementById('listaEspacios');
    const mensajeNoEspacios = document.getElementById('mensajeNoEspacios');

    if (!listaEspacios) return;

    if (!espaciosFiltradosActual || espaciosFiltradosActual.length === 0) {
        if (mensajeNoEspacios) mensajeNoEspacios.style.display = 'block';
        listaEspacios.innerHTML = '';
        renderizarPaginacionEspacios(0);
        return;
    }

    if (mensajeNoEspacios) mensajeNoEspacios.style.display = 'none';

    const totalEspacios = espaciosFiltradosActual.length;
    totalPaginasEspacios = Math.max(1, Math.ceil(totalEspacios / ESPACIOS_POR_PAGINA));
    if (paginaActualEspacios > totalPaginasEspacios) paginaActualEspacios = totalPaginasEspacios;
    if (paginaActualEspacios < 1) paginaActualEspacios = 1;

    const inicio = (paginaActualEspacios - 1) * ESPACIOS_POR_PAGINA;
    const fin = Math.min(inicio + ESPACIOS_POR_PAGINA, totalEspacios);
    const espaciosPagina = espaciosFiltradosActual.slice(inicio, fin);

    listaEspacios.innerHTML = espaciosPagina.map(espacio => {
        const servicios = obtenerServiciosEspacio(espacio.id);
        const estado = normalizarEstadoEspacio(espacio.estado || 'disponible');
        const estadoConfig = obtenerConfigEstadoEspacio(estado);

        return `
            <li class="habitacion-card espacio-card" id="espacio-${espacio.id}">
                <div class="habitacion-header">
                    <div class="habitacion-titulo">
                        <i class="habitacion-icon fas ${espacio.icono || 'fa-building'}"></i>
                        <div>
                            <div class="habitacion-nombre">${escapeHtml(espacio.nombre)}</div>
                            <div class="habitacion-edificio">
                                <i class="fas fa-map-marker-alt"></i> ${escapeHtml(espacio.ubicacion || 'Área común')}
                            </div>
                        </div>
                    </div>
                    <div class="habitacion-estado-badge ${estadoConfig.clase}">
                        <i class="fas ${estadoConfig.icono}"></i> ${estadoConfig.texto}
                    </div>
                </div>
                <div class="habitacion-servicios" id="servicios-espacio-${espacio.id}">
                    ${generarServiciosHTML(servicios, espacio.id, false, 'espacio')}
                </div>
                <div class="habitacion-acciones">
                    <button class="habitacion-boton boton-secundario" onclick="toggleModoEdicionEspacio(${espacio.id})" id="btn-editar-espacio-${espacio.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="habitacion-boton boton-principal" onclick="seleccionarEspacio(${espacio.id})">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>
            </li>
        `;
    }).join('');

    renderizarPaginacionEspacios(totalEspacios);
    renderAlertasEspacios();
}
```

### Función de Filtrado

```javascript
function filtrarEspacios() {
    const terminoEspacio = (document.getElementById('buscarEspacio')?.value || '').toLowerCase();
    const terminoServicio = (document.getElementById('buscarServicioEspacio')?.value || '').toLowerCase();
    const filtroTipo = document.getElementById('filtroTipoEspacio')?.value || '';
    const filtroPrioridad = document.getElementById('filtroPrioridadEspacio')?.value || '';
    const filtroEstado = document.getElementById('filtroEstadoEspacio')?.value || '';

    const filtrados = espacios.filter(espacio => {
        const coincideNombre = espacio.nombre.toLowerCase().includes(terminoEspacio) ||
            (espacio.descripcion || '').toLowerCase().includes(terminoEspacio);

        const servicios = obtenerServiciosEspacio(espacio.id);
        const coincideServicio = !terminoServicio || servicios.some(servicio =>
            servicio.descripcion.toLowerCase().includes(terminoServicio)
        );

        const coincideTipo = !filtroTipo || (espacio.categoria || '') === filtroTipo;
        const coincideEstado = !filtroEstado || normalizarEstadoEspacio(espacio.estado) === filtroEstado;
        const coincidePrioridad = !filtroPrioridad || servicios.some(servicio => servicio.prioridad === filtroPrioridad);

        return coincideNombre && coincideServicio && coincideTipo && coincideEstado && coincidePrioridad;
    });

    espaciosFiltradosActual = filtrados;
    paginaActualEspacios = 1;
    mostrarEspacios();
}
```

### Generación de HTML de Servicios

```javascript
function generarServiciosHTML(servicios, entidadId, modoEdicion = false, contexto = 'cuarto') {
    if (!servicios || servicios.length === 0) {
        return '<div style="padding: 1rem; text-align: center; color: var(--texto-secundario); font-style: italic; min-height: 78.99px;">No hay servicios registrados</div>';
    }
    
    const esContextoEspacio = contexto === 'espacio';
    const fnDetalle = esContextoEspacio ? 'abrirModalDetalleServicioEspacio' : 'abrirModalDetalleServicio';
    const fnVerTodos = esContextoEspacio ? 'verDetallesServiciosEspacio' : 'verDetallesServicios';
    const fnActivarEdicion = esContextoEspacio ? 'activarEdicionServicioEspacio' : 'activarEdicionServicio';
    const fnEliminarInline = esContextoEspacio ? 'eliminarServicioEspacioInline' : 'eliminarServicioInline';
    
    // Mostrar máximo 2 servicios más recientes
    const serviciosMostrar = servicios.slice(0, 2);
    const hayMasServicios = servicios.length > 2;
    
    let html = serviciosMostrar.map(servicio => {
        const esAlerta = servicio.tipo === 'rutina';
        const prioridadClass = servicio.prioridad ? `prioridad-${servicio.prioridad}` : '';
        
        // Para alertas, mostrar día y hora de alerta; para averías, fecha de registro
        let fechaHoraMostrar = '';
        if (esAlerta && (servicio.dia_alerta || servicio.hora)) {
            const diaAlerta = servicio.dia_alerta ? formatearDiaAlerta(servicio.dia_alerta) : '';
            const horaAlerta = servicio.hora ? formatearHora(servicio.hora) : '';
            fechaHoraMostrar = `<span><i class="far fa-clock"></i> ${diaAlerta} ${horaAlerta}</span>`;
        } else if (servicio.fecha_registro) {
            fechaHoraMostrar = `<span><i class="far fa-clock"></i> ${formatearFechaCorta(servicio.fecha_registro)}</span>`;
        }
        
        if (modoEdicion) {
            return `
                <div class="servicio-item-wrapper modo-edicion" data-servicio-id="${servicio.id}">
                    <div class="servicio-item ${esAlerta ? 'servicio-alerta' : ''}" onclick="${fnActivarEdicion}(${servicio.id}, ${entidadId})" style="cursor: pointer;">
                        <div class="servicio-info">
                            <div class="servicio-descripcion">${escapeHtml(servicio.descripcion)}</div>
                            <div class="servicio-meta">
                                <span class="servicio-tipo-badge">
                                    <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i>
                                    ${esAlerta ? 'Alerta' : 'Avería'}
                                </span>
                                ${fechaHoraMostrar}
                            </div>
                        </div>
                        <i class="fas fa-pen" style="color: var(--texto-secundario); font-size: 1rem;"></i>
                    </div>
                    <button class="btn-eliminar-inline" onclick="${fnEliminarInline}(${servicio.id}, ${entidadId}); event.stopPropagation();" title="Eliminar servicio">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="servicio-item ${esAlerta ? 'servicio-alerta' : ''}" onclick="${fnDetalle}(${servicio.id}, false)">
                    <div class="servicio-info">
                        <div class="servicio-descripcion">${escapeHtml(servicio.descripcion)}</div>
                        <div class="servicio-meta">
                            <span class="servicio-tipo-badge">
                                <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i>
                                ${esAlerta ? 'Alerta' : 'Avería'}
                            </span>
                            ${fechaHoraMostrar}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color: var(--texto-secundario); font-size: 1.2rem;"></i>
                </div>
            `;
        }
    }).join('');
    
    // Si hay más servicios, agregar botón con ícono de ojo
    if (hayMasServicios) {
        const serviciosRestantes = servicios.length - 2;
        html += `
            <div class="ver-mas-servicios" onclick="${fnVerTodos}(${entidadId}); event.stopPropagation();">
                <i class="fas fa-eye"></i>
                <span>Ver todos los servicios (${servicios.length})</span>
            </div>
        `;
    }
    
    return html;
}
```

### Configuración de Estados

```javascript
function obtenerConfigEstadoEspacio(estado) {
    switch (estado) {
        case 'mantenimiento':
            return { clase: 'estado-mantenimiento', texto: 'En Mantto', icono: 'fa-tools' };
        case 'fuera_servicio':
        case 'fuera de servicio':
            return { clase: 'estado-fuera-servicio', texto: 'Fuera Serv.', icono: 'fa-ban' };
        case 'ocupado':
            return { clase: 'estado-ocupado', texto: 'Ocupado', icono: 'fa-user' };
        default:
            return { clase: 'estado-vacio', texto: 'Disponible', icono: 'fa-check-circle' };
    }
}

function normalizarEstadoEspacio(estado) {
    const valor = (estado || '').toLowerCase();
    if (valor === 'operativo') return 'disponible';
    if (valor === 'fuera de servicio') return 'fuera_servicio';
    return valor;
}
```

### Actualización de Estadísticas

```javascript
function actualizarEstadisticasEspacios() {
    const total = espacios.length;
    const estados = espacios.map(e => normalizarEstadoEspacio(e.estado));
    const disponibles = estados.filter(estado => estado === 'disponible').length;
    const mantenimiento = estados.filter(estado => estado === 'mantenimiento').length;
    const fueraServicio = estados.filter(estado => estado === 'fuera_servicio').length;

    const captionEl = document.getElementById('espaciosStatsCaption');
    const highlightEl = document.getElementById('espaciosStatsHighlight');
    const dispEl = document.getElementById('espaciosStatsDisponibles');
    const manttoEl = document.getElementById('espaciosStatsMantenimiento');
    const fueraEl = document.getElementById('espaciosStatsFuera');
    const progresoEl = document.getElementById('espaciosStatsProgress');

    if (captionEl) {
        captionEl.textContent = `Total de espacios: ${total}`;
    }
    if (highlightEl) {
        highlightEl.textContent = `Disponibles: ${disponibles} · En mantto.: ${mantenimiento}`;
    }
    if (dispEl) dispEl.textContent = disponibles;
    if (manttoEl) manttoEl.textContent = mantenimiento;
    if (fueraEl) fueraEl.textContent = fueraServicio;

    if (progresoEl) {
        const porcentajeDisponibles = total > 0 ? Math.round((disponibles / total) * 100) : 0;
        progresoEl.dataset.percent = `${porcentajeDisponibles}%`;
        progresoEl.style.setProperty('--progress-value', `${porcentajeDisponibles}%`);
    }
}
```

### Configuración de Eventos

```javascript
function configurarEventosEspacios() {
    const buscarEspacio = document.getElementById('buscarEspacio');
    const buscarServicioEspacio = document.getElementById('buscarServicioEspacio');
    const filtroTipoEspacio = document.getElementById('filtroTipoEspacio');
    const filtroPrioridadEspacio = document.getElementById('filtroPrioridadEspacio');
    const filtroEstadoEspacio = document.getElementById('filtroEstadoEspacio');

    if (buscarEspacio) buscarEspacio.addEventListener('input', filtrarEspacios);
    if (buscarServicioEspacio) buscarServicioEspacio.addEventListener('input', filtrarEspacios);
    if (filtroTipoEspacio) filtroTipoEspacio.addEventListener('change', filtrarEspacios);
    if (filtroPrioridadEspacio) filtroPrioridadEspacio.addEventListener('change', filtrarEspacios);
    if (filtroEstadoEspacio) filtroEstadoEspacio.addEventListener('change', filtrarEspacios);
}
```

## 4. Características del Diseño

### Layout
- **Vista Duo**: Layout de dos columnas (75% principal, 25% lateral)
- **Grid Responsive**: Grid adaptativo con mínimo de 320px por tarjeta
- **Paginación**: Sistema de paginación para grandes cantidades de elementos

### Tarjetas
- **Estilo Brutalist**: Bordes gruesos, sombras pronunciadas
- **Efecto Hover**: Transformación y sombra aumentada al pasar el mouse
- **Barra Superior**: Gradiente decorativo en la parte superior
- **Estados Visuales**: Badges de colores según el estado

### Filtros
- **Búsqueda Múltiple**: Por nombre de espacio y por servicio
- **Filtros Combinados**: Tipo, prioridad y estado
- **Búsqueda en Tiempo Real**: Filtrado instantáneo al escribir

### Paneles Laterales
- **Alertas Programadas**: Lista de alertas futuras
- **Alertas del Día**: Alertas para el día actual
- **Estadísticas**: Panel con métricas visuales y progreso

### Servicios
- **Vista Previa**: Muestra máximo 2 servicios más recientes
- **Tipos Visuales**: Diferencia entre alertas y averías
- **Modo Edición**: Permite editar y eliminar servicios inline

## 5. Variables CSS Necesarias

```css
:root {
  --bg-principal: #ffffff;
  --border-color: #1a1a1a;
  --texto-principal: #1a1a1a;
  --texto-secundario: #6a6a7b;
  --gris-claro: #f5f5f5;
  --gris-separador: #e0e0e0;
  --gris-oscuro: #333333;
  --gris-grafito: #4a4a5a;
  --negro-carbon: #1a1a1a;
  --blanco: #ffffff;
  --verde-oliva: #46744a;
  --rojo-vino: #8b2635;
  --prioridad-baja: #00cc00;
  --prioridad-media: #ffcc00;
  --prioridad-alta: #cc0000;
  --radio-grande: 12px;
  --radio-medio: 8px;
  --radio-pequeno: 4px;
  --sombra-media: 0 4px 12px rgba(0, 0, 0, 0.1);
  --sombra-fuerte: 0 8px 24px rgba(0, 0, 0, 0.15);
  --transicion-normal: all 0.3s ease;
  --transicion-rapida: all 0.2s ease;
}
```

## 6. Dependencias

- **Font Awesome**: Para iconos (`fas`, `far`)
- **AOS (Animate On Scroll)**: Para animaciones al cargar (`data-aos`)
- **Variables CSS**: Sistema de variables para colores y espaciado

## 7. Notas de Implementación

1. **Estructura de Datos**: Los espacios deben tener las propiedades: `id`, `nombre`, `ubicacion`, `estado`, `icono`, `categoria`
2. **Servicios**: Los servicios deben tener: `id`, `descripcion`, `tipo` ('rutina' o 'averia'), `prioridad`, `dia_alerta`, `hora`, `fecha_registro`
3. **Paginación**: Configurar `ESPACIOS_POR_PAGINA` según necesidades
4. **Responsive**: En móviles, el grid se convierte en una sola columna
5. **Escape HTML**: Usar función `escapeHtml()` para prevenir XSS

