/**
 * Helper para acceder al estado compartido de app-loader
 * Las variables ahora son referencias directas al estado compartido
 */
const getState = () => {
    if (!window.appLoaderState) {
        console.warn('⚠️ appLoaderState no está disponible, inicializando estado temporal');
        window.appLoaderState = {
            cuartos: [],
            mantenimientos: [],
            edificios: [],
            usuarios: [],
            cuartosFiltradosActual: [],
            paginaActualCuartos: 1,
            totalPaginasCuartos: 1,
            CUARTOS_POR_PAGINA: 10
        };
    }
    return window.appLoaderState;
};

// Template HTML para skeleton loading
const SKELETON_TEMPLATE = `
    <div class="card-placeholder skeleton-card">
        <div class="skeleton-header">
            <div class="skeleton-icon"></div>
            <div class="skeleton-text-group">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-subtitle"></div>
            </div>
            <div class="skeleton-badge"></div>
        </div>
        <div class="skeleton-content">
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
        </div>
        <div class="skeleton-actions">
            <div class="skeleton-button"></div>
            <div class="skeleton-button"></div>
        </div>
    </div>
`;

/**
 * Mostrar skeletons de carga inicial antes de cargar datos
 * Optimizado con Document Fragment para evitar múltiples reflows
 */
function mostrarSkeletonsIniciales() {
    const listaCuartos = document.getElementById('listaCuartos');
    if (!listaCuartos) return;

    // Usar requestAnimationFrame para optimizar el rendering
    requestAnimationFrame(() => {
        listaCuartos.style.display = 'grid';
        listaCuartos.innerHTML = '';

        // Document Fragment para batch DOM updates (evita reflows múltiples)
        const fragment = document.createDocumentFragment();

        // Crear solo 4 skeletons para una carga más rápida (mejor percepción de velocidad)
        for (let i = 0; i < 4; i++) {
            const li = document.createElement('li');
            li.className = 'cuarto cuarto-lazy';
            li.innerHTML = SKELETON_TEMPLATE;
            fragment.appendChild(li);
        }

        // Un solo append = un solo reflow
        listaCuartos.appendChild(fragment);
    });
}

/**
 * Mostrar cuartos en la lista principal con la misma estructura que index.php
 */
function mostrarCuartos() {
    console.log('=== MOSTRANDO CUARTOS ===');

    // Usar referencias directas al estado compartido
    const s = getState();
    const cuartos = s.cuartos;
    const cuartosFiltradosActual = s.cuartosFiltradosActual;
    const paginaActualCuartos = s.paginaActualCuartos;
    const totalPaginasCuartos = s.totalPaginasCuartos;
    const CUARTOS_POR_PAGINA = s.CUARTOS_POR_PAGINA;
    const mantenimientos = s.mantenimientos;

    const listaCuartos = document.getElementById('listaCuartos');
    const mensajeNoResultados = document.getElementById('mensajeNoResultados');

    if (!listaCuartos) {
        console.error('Elemento listaCuartos no encontrado');
        return;
    }

    if (mensajeNoResultados) {
        mensajeNoResultados.style.display = 'none';
    }

    if ((!s.cuartosFiltradosActual || s.cuartosFiltradosActual.length === 0) && cuartos.length > 0) {
        s.cuartosFiltradosActual = [...cuartos];
    }

    const totalCuartos = s.cuartosFiltradosActual.length;

    if (totalCuartos === 0) {
        console.warn('No hay cuartos para mostrar');
        listaCuartos.style.display = 'grid';
        listaCuartos.innerHTML = '<li class="mensaje-no-cuartos">No hay cuartos registrados en el sistema.</li>';
        renderizarPaginacionCuartos(0);
        return;
    }

    s.totalPaginasCuartos = Math.max(1, Math.ceil(totalCuartos / CUARTOS_POR_PAGINA));

    if (s.paginaActualCuartos > s.totalPaginasCuartos) {
        s.paginaActualCuartos = s.totalPaginasCuartos;
    }
    if (s.paginaActualCuartos < 1) {
        s.paginaActualCuartos = 1;
    }

    const inicio = (s.paginaActualCuartos - 1) * CUARTOS_POR_PAGINA;
    const fin = Math.min(inicio + CUARTOS_POR_PAGINA, totalCuartos);
    const cuartosPagina = s.cuartosFiltradosActual.slice(inicio, fin);

    console.log(`Cuartos disponibles: ${totalCuartos} | Página ${s.paginaActualCuartos}/${s.totalPaginasCuartos}`);

    listaCuartos.style.display = 'grid';
    listaCuartos.innerHTML = '';
    let procesados = 0;

    // Lazy loading: crear cards vacías y cargar contenido solo cuando entran al viewport
    cuartosPagina.forEach((cuarto, index) => {
        try {
            const li = document.createElement('li');
            li.className = 'cuarto cuarto-lazy';
            li.id = `cuarto-${cuarto.id}`;
            li.setAttribute('loading', 'lazy'); // Lazy loading nativo del navegador

            const nombreCuarto = cuarto.nombre || cuarto.numero || `Cuarto ${cuarto.id}`;
            const edificioNombre = cuarto.edificio_nombre || `Edificio ${cuarto.edificio_id}`;

            // Guardar los datos necesarios en dataset para cargar luego
            li.dataset.nombreCuarto = nombreCuarto;
            li.dataset.edificioNombre = edificioNombre;
            li.dataset.descripcion = cuarto.descripcion || '';
            li.dataset.cuartoId = cuarto.id;
            li.dataset.edificioId = cuarto.edificio_id;
            li.dataset.index = inicio + index;

            // Card placeholder mejorado con skeleton loading
            li.innerHTML = `
            <div class="card-placeholder skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-icon"></div>
                    <div class="skeleton-text-group">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-subtitle"></div>
                    </div>
                    <div class="skeleton-badge"></div>
                </div>
                <div class="skeleton-content">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                </div>
                <div class="skeleton-actions">
                    <div class="skeleton-button"></div>
                    <div class="skeleton-button"></div>
                </div>
            </div>
        `;

            listaCuartos.appendChild(li);
            procesados++;
        } catch (error) {
            console.error(`Error procesando cuarto ${index}:`, error, cuarto);
        }
    });

    // Reconstruir caché de mantenimientos por cuarto (siempre actualizado)
    window.mantenimientosPorCuarto = new Map();
    if (mantenimientos && mantenimientos.length > 0) {
        mantenimientos.forEach(m => {
            if (!window.mantenimientosPorCuarto.has(m.cuarto_id)) {
                window.mantenimientosPorCuarto.set(m.cuarto_id, []);
            }
            window.mantenimientosPorCuarto.get(m.cuarto_id).push(m);
        });
        console.log(`📦 Caché de mantenimientos reconstruida: ${window.mantenimientosPorCuarto.size} cuartos con servicios`);
    }

    // IntersectionObserver para cargar el contenido real cuando la card entra al viewport
    if (window.cuartoObserver) {
        window.cuartoObserver.disconnect();
    }
    window.cuartoObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const li = entry.target;
                if (!li.dataset.loaded) {
                    // Marcar como cargando para evitar cargas duplicadas
                    li.dataset.loading = '1';

                    // Calcular delay diagonal basado en la posición (índice)
                    const cardIndex = parseInt(li.dataset.index || '0', 10);
                    const delay = (cardIndex % CUARTOS_POR_PAGINA) * 5; // 5ms entre cada card (muy rápido)

                    // Usar requestIdleCallback si está disponible, sino setTimeout
                    const scheduleRender = window.requestIdleCallback || ((cb) => setTimeout(cb, delay));

                    // Aplicar delay antes de mostrar la card
                    scheduleRender(() => {
                        const cuartoId = parseInt(li.dataset.cuartoId, 10);
                        const nombreCuarto = li.dataset.nombreCuarto;
                        const edificioNombre = li.dataset.edificioNombre;
                        const descripcion = li.dataset.descripcion;
                        const cuartoCompleto = cuartos.find(c => c.id === cuartoId);
                        // Usar caché de mantenimientos en lugar de filtrar cada vez
                        const mantenimientosCuarto = window.mantenimientosPorCuarto.get(cuartoId) || [];

                        // Determinar estado del cuarto (ocupado, vacío, en mantenimiento, fuera de servicio)
                        const estadoCuarto = cuartoCompleto?.estado || 'vacio';
                        let estadoBadgeClass = 'estado-vacio';
                        let estadoIcon = 'fa-check-circle';
                        let estadoText = 'Vacío';

                        switch (estadoCuarto.toLowerCase()) {
                            case 'ocupado':
                                estadoBadgeClass = 'estado-ocupado';
                                estadoIcon = 'fa-user';
                                estadoText = 'Ocupado';
                                break;
                            case 'en mantenimiento':
                            case 'mantenimiento':
                                estadoBadgeClass = 'estado-mantenimiento';
                                estadoIcon = 'fa-tools';
                                estadoText = 'En Mantenimiento';
                                break;
                            case 'fuera de servicio':
                            case 'fuera_servicio':
                                estadoBadgeClass = 'estado-fuera-servicio';
                                estadoIcon = 'fa-ban';
                                estadoText = 'Fuera de Servicio';
                                break;
                            default:
                                estadoBadgeClass = 'estado-vacio';
                                estadoIcon = 'fa-check-circle';
                                estadoText = 'Disponible';
                        }

                        // Usar requestAnimationFrame para optimizar rendering
                        requestAnimationFrame(() => {
                            li.className = 'habitacion-card';
                            li.setAttribute('data-aos', 'fade-up');
                            li.innerHTML = `
                        <div class="habitacion-header">
                            <div class="habitacion-titulo">
                                <i class="habitacion-icon fas fa-door-closed"></i>
                                <div>
                                    <div class="habitacion-nombre">${escapeHtml(nombreCuarto)}</div>
                                    <div class="habitacion-edificio">
                                        <i class="fas fa-building"></i> ${escapeHtml(edificioNombre)}
                                    </div>
                                </div>
                            </div>
                            <div class="habitacion-estado-badge ${estadoBadgeClass}">
                                <i class="fas ${estadoIcon}"></i> ${estadoText}
                            </div>
                        </div>
                        <div class="habitacion-servicios" id="servicios-${cuartoId}">
                            ${generarServiciosHTML(mantenimientosCuarto, cuartoId)}
                        </div>
                                        <!-- Selector de Estado Oculto hasta click en edición-->
                        <div class="estado-selector-inline" style="display: none"  id="estado-selector-inline-id-${cuartoId}">
                            <label class="estado-label-inline">Estado de Habitación</label>
                            <div class="estado-pills-inline">
                                <button type="button" ${estadoText === "Disponible" ? 'disabled' : ''} class="estado-pill-inline ${estadoText === "Disponible" ? 'estado-pill-inline-activo' : ''} disponible" data-estado="disponible" onclick="seleccionarEstadoInline(${cuartoId}, 'disponible', this)">
                                    <span class="pill-dot-inline"></span>
                                    <span class="pill-text-inline">Disp.</span>
                                </button>
                                <button type="button" ${estadoText === "Ocupado" ? 'disabled' : ''} class="estado-pill-inline ${estadoText === "Ocupado" ? 'estado-pill-inline-activo' : ''} ocupado" data-estado="ocupado" onclick="seleccionarEstadoInline(${cuartoId}, 'ocupado', this)">
                                    <span class="pill-dot-inline"></span>
                                    <span class="pill-text-inline">Ocup.</span>
                                </button>
                                <button type="button" ${estadoText === "En Mantenimiento" ? 'disabled' : ''} class="estado-pill-inline ${estadoText === "En Mantenimiento" ? 'estado-pill-inline-activo' : ''} mantenimiento" data-estado="mantenimiento" onclick="seleccionarEstadoInline(${cuartoId}, 'mantenimiento', this)">
                                    <span class="pill-dot-inline"></span>
                                    <span class="pill-text-inline">Mant.</span>
                                </button>
                                <button type="button" ${estadoText === "Fuera de Servicio" ? 'disabled' : ''} class="estado-pill-inline ${estadoText === "Fuera de Servicio" ? 'estado-pill-inline-activo' : ''} fuera-servicio" data-estado="fuera_servicio" onclick="seleccionarEstadoInline(${cuartoId}, 'fuera_servicio', this)">
                                    <span class="pill-dot-inline"></span>
                                    <span class="pill-text-inline">Fuera</span>
                                </button>
                            </div>
                        </div>
                        <div class="habitacion-acciones">
                            <button class="habitacion-boton boton-secundario" onclick="toggleModoEdicion(${cuartoId})" id="btn-editar-${cuartoId}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="habitacion-boton boton-principal" onclick="seleccionarCuarto(${cuartoId})">
                                <i class="fas fa-plus"></i> Agregar Servicio
                            </button>
                        </div>
                    `;

                            li.dataset.loaded = '1';

                            // Agregar clase de animación diagonal
                            li.classList.add('card-appear');

                            // Remover clases después de la animación (optimizado)
                            requestAnimationFrame(() => {
                                setTimeout(() => {
                                    li.classList.remove('cuarto-lazy', 'card-appear');
                                }, 250); // Reducido a 250ms para carga más rápida
                            });

                            // Animar card con anime.js si está disponible
                            if (typeof window.animarNuevaTarjeta === 'function') {
                                window.animarNuevaTarjeta(li);
                            }
                        });
                    }, { timeout: delay });
                }
                observer.unobserve(li);
            }
        });
    }, {
        rootMargin: '50px', // Cargar 50px antes de entrar al viewport
        threshold: 0.01 // 1% visible para detectar rápido
    });

    // Observar todas las cards después de renderizarlas
    requestAnimationFrame(() => {
        const cards = listaCuartos.querySelectorAll('.cuarto-lazy');
        cards.forEach(li => window.cuartoObserver.observe(li));
    });

    console.log(`Se procesaron ${procesados} cuartos (página ${s.paginaActualCuartos}/${s.totalPaginasCuartos}) de ${totalCuartos} total (lazy)`);
    console.log('=== FIN MOSTRANDO CUARTOS ===');

    renderizarPaginacionCuartos(totalCuartos);
}

/**
 * Sincronizar estado base de cuartos filtrados y paginación
 */
function sincronizarCuartosFiltrados(mantenerPagina = false) {
    const s = getState();
    s.cuartosFiltradosActual = Array.isArray(s.cuartos) ? [...s.cuartos] : [];
    s.totalPaginasCuartos = s.cuartosFiltradosActual.length > 0
        ? Math.ceil(s.cuartosFiltradosActual.length / s.CUARTOS_POR_PAGINA)
        : 1;

    if (!mantenerPagina || s.paginaActualCuartos > s.totalPaginasCuartos) {
        s.paginaActualCuartos = s.cuartosFiltradosActual.length > 0 ? 1 : 1;
    }
}

/**
 * Renderizar controles de paginación para las habitaciones
 */
function renderizarPaginacionCuartos(totalCuartos) {
    const s = getState();
    const contenedorPaginacion = document.getElementById('habitacionesPagination');
    if (!contenedorPaginacion) {
        return;
    }

    if (!totalCuartos || totalCuartos <= s.CUARTOS_POR_PAGINA) {
        contenedorPaginacion.innerHTML = '';
        contenedorPaginacion.style.display = 'none';
        return;
    }

    const totalPaginasCalculadas = Math.max(1, Math.ceil(totalCuartos / s.CUARTOS_POR_PAGINA));
    s.totalPaginasCuartos = totalPaginasCalculadas;
    if (s.paginaActualCuartos > s.totalPaginasCuartos) {
        s.paginaActualCuartos = s.totalPaginasCuartos;
    }

    const opciones = Array.from({ length: totalPaginasCalculadas }, (_, idx) => {
        const pagina = idx + 1;
        const seleccionado = pagina === s.paginaActualCuartos ? ' selected' : '';
        return `<option value="${pagina}"${seleccionado}>${pagina}</option>`;
    }).join('');

    const totalLabel = totalCuartos === 1 ? '1 habitación' : `${totalCuartos} habitaciones`;

    contenedorPaginacion.style.display = 'flex';
    contenedorPaginacion.innerHTML = `
    <button class="pagination-btn" data-action="prev" ${s.paginaActualCuartos === 1 ? 'disabled' : ''} aria-label="Página anterior de habitaciones">
        <i class="fas fa-chevron-left"></i>
        <span>Anterior</span>
    </button>
    <div class="pagination-info">
        <span>Página</span>
        <select class="pagination-select" id="habitacionesPaginationSelect" aria-label="Seleccionar página de habitaciones">
            ${opciones}
        </select>
        <span>de ${totalPaginasCalculadas}</span>
    </div>
    <button class="pagination-btn" data-action="next" ${s.paginaActualCuartos === totalPaginasCalculadas ? 'disabled' : ''} aria-label="Página siguiente de habitaciones">
        <span>Siguiente</span>
        <i class="fas fa-chevron-right"></i>
    </button>
    <span class="pagination-total">${totalLabel}</span>
`;

    const botonAnterior = contenedorPaginacion.querySelector('[data-action="prev"]');
    const botonSiguiente = contenedorPaginacion.querySelector('[data-action="next"]');
    const selectorPaginas = contenedorPaginacion.querySelector('#habitacionesPaginationSelect');

    if (botonAnterior) {
        botonAnterior.addEventListener('click', () => {
            if (window.appLoaderState.paginaActualCuartos > 1) {
                window.appLoaderState.paginaActualCuartos -= 1;
                mostrarCuartos();
                // Esperar a que el DOM se actualice antes de hacer scroll
                setTimeout(() => desplazarListaCuartosAlInicio(), 100);
            }
        });
    }

    if (botonSiguiente) {
        botonSiguiente.addEventListener('click', () => {
            if (window.appLoaderState.paginaActualCuartos < window.appLoaderState.totalPaginasCuartos) {
                window.appLoaderState.paginaActualCuartos += 1;
                mostrarCuartos();
                // Esperar a que el DOM se actualice antes de hacer scroll
                setTimeout(() => desplazarListaCuartosAlInicio(), 100);
            }
        });
    }

    if (selectorPaginas) {
        selectorPaginas.addEventListener('change', (event) => {
            const nuevaPagina = parseInt(event.target.value, 10);
            if (!Number.isNaN(nuevaPagina) && nuevaPagina >= 1 && nuevaPagina <= totalPaginasCuartos) {
                paginaActualCuartos = nuevaPagina;
                mostrarCuartos();
                // Esperar a que el DOM se actualice antes de hacer scroll
                setTimeout(() => desplazarListaCuartosAlInicio(), 100);
            }
        });
    }
}

/**
 * Desplazar la vista de habitaciones al inicio después de cambiar de página
 */
function desplazarListaCuartosAlInicio() {
    // Intentar hacer scroll al tab de habitaciones primero
    const tabHabitaciones = document.getElementById('tab-habitaciones');
    if (tabHabitaciones) {
        const rect = tabHabitaciones.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop;

        // Ajustar para el header fijo (aproximadamente 72px en móviles, 0 en desktop)
        const headerOffset = window.innerWidth <= 768 ? 72 : 0;
        const finalY = Math.max(0, targetY - headerOffset);

        window.scrollTo({
            top: finalY,
            behavior: 'smooth'
        });
        return;
    }

    // Fallback: hacer scroll al panel de filtros
    const panelFiltros = document.querySelector('.panel-filtros');
    if (panelFiltros) {
        const rect = panelFiltros.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop;

        // Ajustar para el header fijo
        const headerOffset = window.innerWidth <= 768 ? 72 : 0;
        const finalY = Math.max(0, targetY - headerOffset);

        window.scrollTo({
            top: finalY,
            behavior: 'smooth'
        });
        return;
    }

    // Último fallback: hacer scroll a la lista de cuartos
    const listaCuartos = document.getElementById('listaCuartos');
    if (listaCuartos) {
        const rect = listaCuartos.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop;

        // Ajustar para el header fijo
        const headerOffset = window.innerWidth <= 768 ? 72 : 0;
        const finalY = Math.max(0, targetY - headerOffset);

        window.scrollTo({
            top: finalY,
            behavior: 'smooth'
        });
    }
}

/**
 * Filtrar cuartos según los criterios de búsqueda
 */
function filtrarCuartos() {
    const s = getState();
    const buscarCuarto = document.getElementById('buscarCuarto').value.toLowerCase();
    const buscarAveria = document.getElementById('buscarAveria').value.toLowerCase();
    const filtroEdificio = document.getElementById('filtroEdificio').value;
    const filtroPrioridad = document.getElementById('filtroPrioridad')?.value || '';
    const filtroEstado = document.getElementById('filtroEstado')?.value || '';

    const cuartosFiltrados = s.cuartos.filter(cuarto => {
        // Filtro por nombre de cuarto
        const coincideNombre = (cuarto.nombre || cuarto.numero || '').toString().toLowerCase().includes(buscarCuarto);

        // Filtro por avería en mantenimientos
        const coincideAveria = buscarAveria === '' ||
            (s.mantenimientos && s.mantenimientos.some(m =>
                m.cuarto_id === cuarto.id && m.descripcion.toLowerCase().includes(buscarAveria)
            ));

        // Filtro por edificio
        const coincideEdificio = filtroEdificio === '' || cuarto.edificio_id.toString() === filtroEdificio;

        // Filtro por prioridad (solo si el cuarto tiene mantenimientos con esa prioridad)
        const coincidePrioridad = filtroPrioridad === '' ||
            (s.mantenimientos && s.mantenimientos.some(m =>
                m.cuarto_id === cuarto.id && m.prioridad === filtroPrioridad
            ));

        // Filtro por estado
        const coincideEstado = filtroEstado === '' || cuarto.estado === filtroEstado;

        return coincideNombre && coincideAveria && coincideEdificio && coincidePrioridad && coincideEstado;
    });

    mostrarCuartosFiltrados(cuartosFiltrados);
}

/**
 * Mostrar cuartos filtrados
 */
function mostrarCuartosFiltrados(cuartosFiltrados) {
    const s = getState();
    const listaCuartos = document.getElementById('listaCuartos');
    const mensajeNoResultados = document.getElementById('mensajeNoResultados');

    if (!listaCuartos || !mensajeNoResultados) {
        return;
    }

    if (!cuartosFiltrados || cuartosFiltrados.length === 0) {
        listaCuartos.innerHTML = '';
        listaCuartos.style.display = 'none';
        mensajeNoResultados.style.display = 'block';
        s.cuartosFiltradosActual = [];
        s.paginaActualCuartos = 1;
        renderizarPaginacionCuartos(0);
        return;
    }

    listaCuartos.style.display = 'grid'; // Mantener grid para 2 columnas
    mensajeNoResultados.style.display = 'none';

    // Guardar cuarto seleccionado actual si existe
    const cuartoActualSeleccionado = document.querySelector('.cuarto-seleccionado');
    const idCuartoSeleccionado = cuartoActualSeleccionado ?
        cuartoActualSeleccionado.id.replace('cuarto-', '') : null;

    s.cuartosFiltradosActual = [...cuartosFiltrados];

    if (idCuartoSeleccionado) {
        const indiceSeleccionado = s.cuartosFiltradosActual.findIndex(c => c.id.toString() === idCuartoSeleccionado);
        if (indiceSeleccionado >= 0) {
            s.paginaActualCuartos = Math.floor(indiceSeleccionado / s.CUARTOS_POR_PAGINA) + 1;
        } else {
            s.paginaActualCuartos = 1;
        }
    } else {
        s.paginaActualCuartos = 1;
    }

    mostrarCuartos();

    // Restaurar selección si el cuarto filtrado sigue visible
    if (idCuartoSeleccionado &&
        cuartosFiltrados.some(c => c.id.toString() === idCuartoSeleccionado)) {
        setTimeout(() => seleccionarCuarto(parseInt(idCuartoSeleccionado)), 200);
    }
}

/**
 * Actualizar contenido de una card específica si está visible en el DOM (OPTIMIZADO)
 */
function actualizarCardCuartoEnUI(cuartoId) {
    const s = getState();
    // Actualizar caché de mantenimientos primero
    window.mantenimientosPorCuarto = window.mantenimientosPorCuarto || new Map();
    const mantenimientosCuarto = s.mantenimientos.filter(m => m.cuarto_id === cuartoId);
    // Ordenar por fecha de creación descendente (más recientes primero)
    mantenimientosCuarto.sort((a, b) => {
        const fechaA = new Date(a.fecha_creacion || a.fecha_registro || 0);
        const fechaB = new Date(b.fecha_creacion || b.fecha_registro || 0);
        return fechaB - fechaA;
    });
    window.mantenimientosPorCuarto.set(cuartoId, mantenimientosCuarto);

    const cardElement = document.getElementById(`cuarto-${cuartoId}`);

    if (!cardElement) {
        console.log(`⚠️ Card cuarto-${cuartoId} no está en el DOM`);
        return;
    }

    // ⚡ OPTIMIZACIÓN: Solo actualizar el contenedor de servicios
    const serviciosContainer = document.getElementById(`servicios-${cuartoId}`);

    if (serviciosContainer) {
        // Verificar si está en modo edición
        const btnEditar = document.getElementById(`btn-editar-${cuartoId}`);
        const enModoEdicion = btnEditar && btnEditar.classList.contains('modo-edicion-activo');

        // Actualizar inmediatamente sin animaciones
        serviciosContainer.innerHTML = generarServiciosHTML(mantenimientosCuarto, cuartoId, enModoEdicion);

        // Actualizar botón de editar si es necesario
        if (btnEditar && mantenimientosCuarto.length === 0) {
            btnEditar.style.display = 'none';
        } else if (btnEditar && mantenimientosCuarto.length > 0) {
            btnEditar.style.display = '';
        }
    }
}

/**
 * Seleccionar un cuarto único (remover selección de otros)
 */
function seleccionarCuarto(cuartoId) {
    // Verificar si ya hay un formulario inline abierto en esta card
    const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
    if (!contenedorServicios) return;

    const formExistente = contenedorServicios.querySelector('.form-servicio-inline');
    if (formExistente) {
        // Si ya existe, hacer scroll hasta él
        formExistente.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    // Remover selección de todos los cuartos
    const todosLosCuartos = document.querySelectorAll('.cuarto');
    todosLosCuartos.forEach(cuarto => {
        cuarto.classList.remove('cuarto-seleccionado');
    });

    // Seleccionar el cuarto clickeado
    const cuartoSeleccionado = document.getElementById(`cuarto-${cuartoId}`);
    if (cuartoSeleccionado) {
        cuartoSeleccionado.classList.add('cuarto-seleccionado');

        // Auto-seleccionar en el formulario lateral si existe
        const selectCuarto = document.getElementById('cuartoMantenimientoLateral');
        if (selectCuarto) {
            selectCuarto.value = cuartoId;
        }

        // Actualizar el selector de estado con el estado actual del cuarto
        actualizarSelectorEstado(cuartoId);

        // Mostrar formulario inline en la card
        mostrarFormularioInline(cuartoId);

        console.log(`Cuarto ${cuartoId} seleccionado con formulario inline`);
    }
}

/**
     * Actualizar selector de estado con el estado actual del cuarto
     */
function actualizarSelectorEstado(cuartoId) {
    const estadoSelector = document.getElementById('estadoCuartoSelector');
    if (!estadoSelector) return;

    // Buscar el cuarto en el array
    const cuarto = cuartos.find(c => c.id === cuartoId);

    // Remover clase activo de todos los pills
    const pills = document.querySelectorAll('.estado-pill');
    pills.forEach(pill => pill.classList.remove('activo'));

    if (cuarto && cuarto.estado) {
        estadoSelector.value = cuarto.estado;

        // Activar el pill correspondiente
        const pillActivo = document.querySelector(`.estado-pill[data-estado="${cuarto.estado}"]`);
        if (pillActivo) {
            pillActivo.classList.add('activo');
        }
    } else {
        estadoSelector.value = '';
    }
}

/**
 * Seleccionar cuarto desde el select (sin scroll automático)
 */
function seleccionarCuartoDesdeSelect(cuartoId) {
    // Remover selección de todos los cuartos
    const todosLosCuartos = document.querySelectorAll('.cuarto');
    todosLosCuartos.forEach(cuarto => {
        cuarto.classList.remove('cuarto-seleccionado');
    });

    // Seleccionar el cuarto sin hacer scroll
    const cuartoSeleccionado = document.getElementById(`cuarto-${cuartoId}`);
    if (cuartoSeleccionado) {
        cuartoSeleccionado.classList.add('cuarto-seleccionado');
        console.log(`Cuarto ${cuartoId} seleccionado desde select`);
    }
}

/**
 * Mostrar formulario inline en la card de habitación
 */
function mostrarFormularioInline(cuartoId) {
    const s = getState();
    const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
    if (!contenedorServicios) return;

    // Obtener cuarto para información de estado
    const cuarto = s.cuartos.find(c => c.id === cuartoId);
    const estadoCuarto = cuarto ? cuarto.estado : '';

    // Generar opciones de usuarios
    const opcionesUsuarios = s.usuarios.map(u =>
        `<option value="${u.id}">${u.nombre}${u.departamento ? ` (${u.departamento})` : ''}</option>`
    ).join('');

    // Crear el formulario inline
    const formHTML = `
    <div class="form-servicio-inline" data-cuarto-id="${cuartoId}">
        <div class="form-inline-header">
            <i class="fas fa-plus-circle"></i>
            <span>Nuevo Servicio</span>
            <button type="button" class="btn-cerrar-inline" onclick="cerrarFormularioInline(${cuartoId})">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form onsubmit="guardarServicioInline(event, ${cuartoId})">
        <div class="name-tipo-toggle-inline-container" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px;">
            <input type="text" 
                    class="input-inline" 
                    name="descripcion" 
                    placeholder="Descripción del servicio..." 
                    required 
                    autocomplete="off">
            
            <div class="tipo-toggle-inline">
                <label class="toggle-label">
                    <input type="checkbox" 
                            class="toggle-checkbox" 
                            id="tipoToggle-${cuartoId}"
                            onchange="toggleTipoServicioInline(${cuartoId})">
                    <span class="toggle-switch"></span>
                    <span class="toggle-text">
                        <span class="tipo-averia">Avería</span>
                        <span class="tipo-alerta">Alerta</span>
                    </span>
                </label>
            </div>
        </div>
            
            <!-- Selector de Estado del Mantenimiento -->
            <div class="estado-mantenimiento-selector-inline">
                <label class="estado-mant-label-inline">
                    <i class="fas fa-tasks"></i> Estado del Servicio
                </label>
                <select class="input-inline" name="estado_mantenimiento">
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                </select>
            </div>
            
            <!-- Selector de Usuario Asignado (opcional) -->
            <div class="usuario-asignado-selector-inline">
                <label class="usuario-asignado-label-inline">
                    <i class="fas fa-user-check"></i> Asignar a (Opcional)
                </label>
                <select class="input-inline" name="usuario_asignado_id">
                    <option value="">-- Sin asignar --</option>
                    ${opcionesUsuarios}
                </select>
            </div>
            
            <!-- Notas adicionales -->
            <textarea class="input-inline" 
                        name="notas" 
                        placeholder="Notas adicionales (opcional)" 
                        rows="2" 
                        style="resize: vertical; font-family: inherit;"></textarea>
            
            <!-- Selector de Prioridad (siempre visible) -->
            <div class="prioridad-selector-inline">
                <label class="prioridad-label-inline">
                    <i class="fas fa-traffic-light"></i> Prioridad
                </label>
                <div class="semaforo-edicion-inline">
                    <label class="semaforo-label-inline">
                        <input type="radio" name="prioridad-${cuartoId}" value="baja" checked>
                        <span class="semaforo-circle green"></span>
                    </label>
                    <label class="semaforo-label-inline">
                        <input type="radio" name="prioridad-${cuartoId}" value="media">
                        <span class="semaforo-circle yellow"></span>
                    </label>
                    <label class="semaforo-label-inline">
                        <input type="radio" name="prioridad-${cuartoId}" value="alta">
                        <span class="semaforo-circle red"></span>
                    </label>
                </div>
            </div>
            
            <!-- Campos adicionales de Alerta (solo hora y día) -->
            <div class="campos-alerta-inline" id="camposAlerta-${cuartoId}" style="display: none;">
                <input type="time" class="input-inline" name="hora" placeholder="Hora">
                <input type="date" class="input-inline" name="dia_alerta" placeholder="Día">
            </div>
            
            <input type="hidden" name="tipo" value="normal">
            <input type="hidden" id="estadoCuartoInline-${cuartoId}" name="estado_cuarto" value="${estadoCuarto}">
            
                    <!-- Botón de Crear Tarea (abre modal) y Selector de Tareas para asignar (opcional) -->
            <div class="tarea-asignada-selector-inline">
                <label class="tarea-asignada-label-inline">
                    <i class="fas fa-tasks"></i> Asignar Tarea (Opcional)
                </label>
                <div class="tarea-asignada-inputs-inline" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; margin-top: 10px;">
                <button style="font-size: 0.7rem; display: flex; align-items: center; gap: 5px; flex-direction: row; flex-wrap: nowrap;" type="button" class="btn-inline btn-crear-tarea" onclick="abrirModalCrearTarea(${cuartoId})">
                    <i class="fas fa-plus"></i> Crear
                </button>
                <!-- Se deberá deshabilitar si el input "tareaAsignadaInline-${cuartoId}" tiene un valor y el option pasará a estar vacío-->
                    <select id="tareaAsignadaInline-${cuartoId}" class="input-inline selector-tarea-servicio" name="tarea_asignada_id">
                        <option value="">-- Sin asignar existente --</option>
                        
                    </select>
                </div>
            </div>

            <div class="form-inline-actions">
                <button type="button" class="btn-inline btn-cancelar" onclick="cerrarFormularioInline(${cuartoId})">
                    Cancelar
                </button>
                <button id="btn-guardar-${cuartoId}" class="btn-inline btn-guardar" onclick="deshabilitarBotonGuardarInline(${cuartoId}, true)">
                    <i class="fas fa-check"></i> Guardar
                </button>
            </div>
        </form>
    </div>
`;

    // Insertar el formulario al inicio del contenedor
    contenedorServicios.insertAdjacentHTML('afterbegin', formHTML);

    // Preseleccionar el estado actual del cuarto
    if (estadoCuarto) {
        const btnEstado = contenedorServicios.querySelector(`.estado-pill-inline[data-estado="${estadoCuarto}"]`);
        if (btnEstado) {
            btnEstado.classList.add('activo');
        }
    }

    // Reorganizar servicios existentes (mostrar máximo 1 servicio después del formulario)
    reorganizarServiciosConForm(cuartoId);

    // Poblar selector de tareas con las tareas disponibles
    const selectorTareas = document.getElementById(`tareaAsignadaInline-${cuartoId}`);
    if (selectorTareas && typeof window.cargarTareasEnSelector === 'function') {
        window.cargarTareasEnSelector(`tareaAsignadaInline-${cuartoId}`);
    }

    // Focus en el input de descripción
    setTimeout(() => {
        const input = contenedorServicios.querySelector('.input-inline[name="descripcion"]');
        if (input) input.focus();
    }, 100);
}

/**
 * Reorganizar servicios cuando se muestra el formulario inline
 */
function reorganizarServiciosConForm(cuartoId) {
    const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
    if (!contenedorServicios) return;

    const servicios = contenedorServicios.querySelectorAll('.servicio-item');

    // Ocultar todos excepto el primero
    servicios.forEach((servicio, index) => {
        if (index === 0) {
            servicio.style.display = 'flex';
        } else {
            servicio.style.display = 'none';
        }
    });

    // Ocultar el botón "Ver más" si existe
    const verMas = contenedorServicios.querySelector('.ver-mas-servicios');
    if (verMas) {
        verMas.style.display = 'none';
    }
}

/**
 * Cerrar formulario inline
 */
function cerrarFormularioInline(cuartoId) {
    const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
    if (!contenedorServicios) return;

    const form = contenedorServicios.querySelector('.form-servicio-inline');
    if (form) {
        form.remove();
    }

    // Restaurar visualización de servicios
    const servicios = contenedorServicios.querySelectorAll('.servicio-item');
    servicios.forEach((servicio, index) => {
        if (index < 2) {
            servicio.style.display = 'flex';
        }
    });

    // Restaurar botón "Ver más" si existe
    const verMas = contenedorServicios.querySelector('.ver-mas-servicios');
    if (verMas) {
        verMas.style.display = 'flex';
    }
};
window.cerrarFormularioInline = cerrarFormularioInline;

/**
 * Toggle tipo de servicio en formulario inline
 */
function toggleTipoServicioInline(cuartoId) {
    const checkbox = document.getElementById(`tipoToggle-${cuartoId}`);
    const camposAlerta = document.getElementById(`camposAlerta-${cuartoId}`);
    const form = checkbox.closest('form');
    const inputTipo = form.querySelector('input[name="tipo"]');

    if (checkbox.checked) {
        // Es alerta
        camposAlerta.style.display = 'block';
        inputTipo.value = 'rutina';
    } else {
        // Es avería
        camposAlerta.style.display = 'none';
        inputTipo.value = 'normal';
    }
};
window.toggleTipoServicioInline = toggleTipoServicioInline;

/**
 * Seleccionar estado en formulario inline
 */
async function seleccionarEstadoInline(cuartoId, nuevoEstado, boton) {
    const s = getState();
    try {
        console.log(`🔄 Actualizando estado del cuarto ${cuartoId} a: ${nuevoEstado}`);

        const response = await fetch(`${window.API_BASE_URL}/api/cuartos/${cuartoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const resultado = await response.json();
        console.log('✅ Estado actualizado:', resultado);

        // Actualizar el cuarto en el array local
        const cuarto = s.cuartos.find(c => c.id === cuartoId);
        if (cuarto) {
            cuarto.estado = nuevoEstado;
        }

        // Remover clase activo de todos los botones de estado de este contenedor
        const contenedorPills = boton.closest('.estado-pills-inline');
        if (contenedorPills) {
            const todosLosBotones = contenedorPills.querySelectorAll('.estado-pill-inline');
            todosLosBotones.forEach(btn => btn.classList.remove('activo'));
        }

        // Agregar clase activo al botón seleccionado
        boton.classList.add('activo');

        // Actualizar el input hidden
        const inputEstado = document.getElementById(`estadoCuartoInline-${cuartoId}`);
        if (inputEstado) {
            inputEstado.value = nuevoEstado;
        }

        // Recargar la visualización de cuartos para reflejar el nuevo estado
        mostrarCuartos();

        // Mapeo de estados a emojis y labels
        const estadoEmojis = {
            'disponible': '🟢',
            'ocupado': '🔵',
            'mantenimiento': '🟡',
            'fuera_servicio': '🔴'
        };

        const estadoLabels = {
            'disponible': 'Disponible',
            'ocupado': 'Ocupado',
            'mantenimiento': 'En Mantenimiento',
            'fuera_servicio': 'Fuera de Servicio'
        };

        const emoji = estadoEmojis[nuevoEstado] || '⚪';
        const label = estadoLabels[nuevoEstado] || nuevoEstado;

        window.mostrarMensaje(`${emoji} Estado actualizado a: ${label}`, 'success');

    } catch (error) {
        console.error('❌ Error al actualizar estado:', error);
        window.mostrarMensaje(`Error al actualizar estado: ${error.message}`, 'error');
    }
};
window.seleccionarEstadoInline = seleccionarEstadoInline;

function formularioEdicionInlineLleno(cuartoId) {
    const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
    if (!contenedorServicios) return false;

    const form = contenedorServicios.querySelector('.form-servicio-inline');
    if (!form) return false;

    const descripcion = form.querySelector('input[name="descripcion"]').value.trim();
    const tipo = form.querySelector('input[name="tipo"]').value;

    if (!descripcion) return false;

    if (tipo === 'rutina') {
        const hora = form.querySelector('input[name="hora"]').value;
        const dia_alerta = form.querySelector('input[name="dia_alerta"]').value;
        if (!hora || !dia_alerta) return false;
    }

    return true;
}

function deshabilitarBotonGuardarInline(cuartoId, deshabilitar) {
    const botonGuardar = document.getElementById(`btn-guardar-${cuartoId}`);
    if (!botonGuardar) return;

    // Guardar HTML original para poder restaurarlo
    if (!botonGuardar.dataset.origHtml) {
        botonGuardar.dataset.origHtml = botonGuardar.innerHTML;
    }

    if (deshabilitar && formularioEdicionInlineLleno(cuartoId)) {
        botonGuardar.disabled = true;
        botonGuardar.setAttribute('aria-busy', 'true');
        botonGuardar.innerHTML = `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Guardando...`;

        // Intentar submit manual del formulario contenedor (solo una vez)
        try {
            const form = botonGuardar.closest('form');
            if (form && !botonGuardar.dataset.submitted) {
                botonGuardar.dataset.submitted = '1';
                // Dejar que el DOM actualice el botón antes de enviar
                setTimeout(() => {
                    try {
                        if (typeof form.requestSubmit === 'function') {
                            form.requestSubmit();
                        } else {
                            form.submit();
                        }
                    } catch (e) {
                        console.warn('Error enviando el formulario automáticamente:', e);
                    }
                }, 10);
            }
        } catch (e) {
            console.warn('No se pudo realizar submit automático:', e);
        }
    } else {
        botonGuardar.disabled = false;
        botonGuardar.removeAttribute('aria-busy');
        botonGuardar.innerHTML = botonGuardar.dataset.origHtml || 'Guardar';
        delete botonGuardar.dataset.submitted;
    }
};
window.deshabilitarBotonGuardarInline = deshabilitarBotonGuardarInline;

/**
 * Guardar servicio desde formulario inline
 */
async function guardarServicioInline(event, cuartoId) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Obtener prioridad del radio button
    const prioridadRadio = form.querySelector(`input[name="prioridad-${cuartoId}"]:checked`);


    const datos = {
        cuarto_id: cuartoId,
        tipo: formData.get('tipo'),
        descripcion: formData.get('descripcion'),
        hora: formData.get('hora'),
        dia_alerta: formData.get('dia_alerta'),
        prioridad: prioridadRadio ? prioridadRadio.value : 'media',
        estado_cuarto: formData.get('estado_cuarto'),
        estado: formData.get('estado_mantenimiento') || 'pendiente',
        usuario_asignado_id: formData.get('usuario_asignado_id') || null,
        tarea_id: formData.get('tarea_asignada_id') || null,  // Asignar tarea al servicio
        notas: formData.get('notas') || null
    };

    // Nota: usuario_creador_id no se envía, el backend lo obtiene del JWT

    console.log('📝 Enviando datos de servicio inline:', datos);

    // Validaciones básicas
    if (!datos.descripcion || datos.descripcion.trim() === '') {
        mostrarMensaje('Por favor ingresa una descripción', 'error');
        return;
    }

    if (datos.tipo === 'rutina') {
        if (!datos.hora) {
            mostrarMensaje('La hora es obligatoria para alertas', 'error');
            return;
        }
        if (!datos.dia_alerta) {
            mostrarMensaje('El día es obligatorio para alertas', 'error');
            return;
        }
    }

    try {
        console.log('🌐 Enviando request a:', `${window.API_BASE_URL}/api/mantenimientos`);

        // Obtener headers con autenticación (await porque es async)
        const headers = window.obtenerHeadersConAuth ? await window.obtenerHeadersConAuth() : { 'Content-Type': 'application/json' };
        console.log('🔑 Headers con auth:', headers);

        const response = await fetch(`${window.API_BASE_URL}/api/mantenimientos`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(datos)
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            deshabilitarBotonGuardarInline(cuartoId, false);
            console.error('❌ Error response:', errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const resultado = await response.json();
        console.log('✅ Servicio registrado exitosamente:', resultado);

        // Cerrar formulario
        cerrarFormularioInline(cuartoId);

        // Actualizar array de mantenimientos localmente
        const s = getState();
        if (s.mantenimientos && Array.isArray(s.mantenimientos)) {
            // Agregar el nuevo servicio al principio del array
            s.mantenimientos.unshift(resultado);
            
            // Ordenar por fecha de creación descendente (más recientes primero)
            s.mantenimientos.sort((a, b) => {
                const fechaA = new Date(a.fecha_creacion || a.fecha_registro || 0);
                const fechaB = new Date(b.fecha_creacion || b.fecha_registro || 0);
                return fechaB - fechaA;
            });
            
            // Actualizar caché de mantenimientos por cuarto
            window.mantenimientosPorCuarto = window.mantenimientosPorCuarto || new Map();
            const mantenimientosCuarto = s.mantenimientos.filter(m => m.cuarto_id === cuartoId);
            // Ordenar también la caché
            mantenimientosCuarto.sort((a, b) => {
                const fechaA = new Date(a.fecha_creacion || a.fecha_registro || 0);
                const fechaB = new Date(b.fecha_creacion || b.fecha_registro || 0);
                return fechaB - fechaA;
            });
            window.mantenimientosPorCuarto.set(cuartoId, mantenimientosCuarto);
        }

        // Actualizar solo el contenedor de servicios de esta habitación
        actualizarCardCuartoEnUI(cuartoId);

        // Marcar automáticamente las alertas pasadas (por si la nueva alerta ya pasó)
        await window.marcarAlertasPasadasComoEmitidas();

        // Actualizar selectores y alertas sin recargar todas las cards
        window.cargarCuartosEnSelect();
        window.mostrarAlertasYRecientes();

        // Actualizar paneles de alertas emitidas
        await window.mostrarAlertasEmitidas();
        await window.mostrarHistorialAlertas();

        // Forzar actualización del sistema de notificaciones si es una rutina
        if (datos.tipo === 'rutina') {
            console.log('🔄 Nueva rutina agregada, verificando sistema de notificaciones...');
            setTimeout(() => {
                window.verificarYEmitirAlertas();
            }, 1500);
        }

        // Mostrar mensaje de éxito
        window.mostrarMensaje('Servicio registrado exitosamente', 'success');

    } catch (error) {
        console.error('❌ Error al registrar servicio:', error);
        window.mostrarMensaje(`Error al registrar servicio: ${error.message}`, 'error');
    }
};
window.guardarServicioInline = guardarServicioInline;

/**
 * Toggle de mantenimientos (función esperada por los botones)
 */
function toggleMantenimientos(cuartoId, button) {
    const lista = document.getElementById(`mantenimientos-${cuartoId}`);
    if (!lista) return;

    if (lista.style.display === 'none') {
        lista.style.display = 'block';
        button.textContent = 'Ocultar Mantenimientos';
    } else {
        lista.style.display = 'none';
        button.textContent = 'Mostrar Mantenimientos';
    }
};
window.toggleMantenimientos = toggleMantenimientos;

/**
 * Eliminar mantenimiento inline
 */
async function eliminarMantenimientoInline(mantenimientoId, cuartoId) {
    console.log('🗑️ Iniciando eliminación de mantenimiento:', { mantenimientoId, cuartoId });

    if (!confirm('¿Está seguro de eliminar este mantenimiento?')) {
        console.log('❌ Eliminación cancelada por el usuario');
        return;
    }

    try {
        console.log('🌐 Enviando DELETE a:', `${window.API_BASE_URL}/api/mantenimientos/${mantenimientoId}`);

        const response = await fetch(`${window.API_BASE_URL}/api/mantenimientos/${mantenimientoId}`, {
            method: 'DELETE'
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Resultado eliminación:', result);

        // Recargar datos y actualizar vista
        console.log('🔄 Recargando datos después de eliminación...');
        await window.cargarDatos();
        mostrarCuartos();
        window.mostrarAlertasYRecientes();

        window.mostrarMensaje('Mantenimiento eliminado exitosamente', 'success');
        console.log('✅ Eliminación completada correctamente');

    } catch (error) {
        console.error('❌ Error eliminando mantenimiento:', error);
        mostrarMensaje(`Error al eliminar mantenimiento: ${error.message}`, 'error');
    }
};
window.eliminarMantenimientoInline = eliminarMantenimientoInline;

/**
 * Scroll a cuarto específico
 */
function scrollToCuarto(cuartoId) {
    const cuarto = document.getElementById(`cuarto-${cuartoId}`);
    if (cuarto) {
        // Solo hacer scroll a la card sin seleccionarla
        cuarto.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight temporal para identificar la card
        setTimeout(() => {
            cuarto.style.transition = 'background-color 0.3s ease';
            cuarto.style.backgroundColor = '#fffacd';
            setTimeout(() => {
                cuarto.style.backgroundColor = '';
                setTimeout(() => {
                    cuarto.style.transition = '';
                }, 300);
            }, 2000);
        }, 500);
    }
};
window.scrollToCuarto = scrollToCuarto;

// Exponer todas las funciones a window para acceso global
window.mostrarSkeletonsIniciales = mostrarSkeletonsIniciales;
window.mostrarCuartos = mostrarCuartos;
window.sincronizarCuartosFiltrados = sincronizarCuartosFiltrados;
window.renderizarPaginacionCuartos = renderizarPaginacionCuartos;
window.desplazarListaCuartosAlInicio = desplazarListaCuartosAlInicio;
window.filtrarCuartos = filtrarCuartos;
window.mostrarCuartosFiltrados = mostrarCuartosFiltrados;
window.actualizarCardCuartoEnUI = actualizarCardCuartoEnUI;
window.seleccionarCuarto = seleccionarCuarto;
window.seleccionarCuartoDesdeSelect = seleccionarCuartoDesdeSelect;
window.mostrarFormularioInline = mostrarFormularioInline;
window.reorganizarServiciosConForm = reorganizarServiciosConForm;
window.formularioEdicionInlineLleno = formularioEdicionInlineLleno;
window.cerrarFormularioInline = cerrarFormularioInline;
window.toggleTipoServicioInline = toggleTipoServicioInline;
window.seleccionarEstadoInline = seleccionarEstadoInline;
window.deshabilitarBotonGuardarInline = deshabilitarBotonGuardarInline;
window.guardarServicioInline = guardarServicioInline;
window.toggleMantenimientos = toggleMantenimientos;
window.eliminarMantenimientoInline = eliminarMantenimientoInline;
window.actualizarSelectorEstado = actualizarSelectorEstado;

console.log('✅ [APP-LOADER-HABITACIONES] Funciones exportadas a window');

// También exportar para compatibilidad con módulos ES6 (si se carga como módulo)
export {
    mostrarSkeletonsIniciales,
    mostrarCuartos,
    sincronizarCuartosFiltrados,
    renderizarPaginacionCuartos,
    desplazarListaCuartosAlInicio,
    filtrarCuartos,
    mostrarCuartosFiltrados,
    actualizarCardCuartoEnUI,
    seleccionarCuarto,
    seleccionarCuartoDesdeSelect,
    mostrarFormularioInline,
    reorganizarServiciosConForm,
    formularioEdicionInlineLleno,
    cerrarFormularioInline,
    toggleTipoServicioInline,
    seleccionarEstadoInline,
    deshabilitarBotonGuardarInline,
    guardarServicioInline,
    toggleMantenimientos,
    eliminarMantenimientoInline,
    scrollToCuarto,
    actualizarSelectorEstado
};