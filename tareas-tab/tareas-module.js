// =====================================================
// MÓDULO DE TAREAS - JW MARRIOTT MANTENIMIENTO
// =====================================================
// Este archivo contiene toda la funcionalidad del módulo de tareas
// Desarrollado por: Fidel Cruz Lozada - fcruz@grupodiestra.com
// Versión: 1.0.0
// =====================================================

// =====================================================
// 1. CONSTANTES Y CONFIGURACIÓN
// =====================================================

const TAREAS_POR_PAGINA = 6;
const TAREAS_STORAGE_KEY = 'jwm_tareas_data';
let tareasModuleInitialized = false;
let tareasInteractionsBound = false;

// =====================================================
// 2. ESTADO GLOBAL DE LA APLICACIÓN
// =====================================================

// Simulamos el AppState global - en tu proyecto real debes adaptarlo
const AppState = {
    tareas: [],
    tareasFiltradas: [],
    tareasFilters: {
        role: 'mi-rol',
        estado: '',
        prioridad: '',
        search: ''
    },
    tareasPagination: {
        page: 1,
        perPage: TAREAS_POR_PAGINA
    },
    currentUser: {
        role: 'admin', // Cambiar según el usuario logueado: 'admin', 'supervisor', 'tecnico'
        name: 'Fidel Cruz'
    }
};

// =====================================================
// 3. ELEMENTOS DEL MODAL DE DETALLE
// =====================================================

const tareaModalElements = {
    modal: null,
    titulo: null,
    descripcion: null,
    prioridad: null,
    estado: null,
    ubicacion: null,
    responsable: null,
    vence: null,
    tags: null,
    id: null,
    rol: null,
    nextAction: null,
    ultimoMovimiento: null,
    accion: null
};

// =====================================================
// 4. ELEMENTOS DEL MODAL DE EDICIÓN
// =====================================================

const tareaEditModalState = {
    modal: null,
    form: null,
    fields: {
        id: null,
        titulo: null,
        descripcion: null,
        prioridad: null,
        estado: null,
        fecha: null,
        responsable: null,
        tagInput: null
    },
    tagsContainer: null,
    addTagBtn: null,
    attachmentsInput: null,
    attachmentsList: null,
    historyList: null,
    currentTags: [],
    currentTaskId: null,
    editingAdjuntos: []
};

// =====================================================
// 5. TAREAS POR DEFECTO (DATOS DE EJEMPLO)
// =====================================================

const DEFAULT_TAREAS = [
    {
        id: 'task-admin-001',
        titulo: 'Emitir reporte semanal de mantenimiento',
        descripcion: 'Validar métricas clave y publicar el resumen ejecutivo para la dirección.',
        rol: 'admin',
        prioridad: 'alta',
        estado: 'pendiente',
        vence: '2025-11-23',
        icono: 'fa-chart-line',
        etiquetas: ['Reporte', 'KPIs'],
        ubicacion: 'Oficina Central',
        responsable: 'Fidel Cruz',
        adjuntos: [],
        historial: []
    },
    {
        id: 'task-admin-002',
        titulo: 'Auditar alertas críticas emitidas',
        descripcion: 'Cruzar alertas generadas vs. acciones tomadas y documentar hallazgos.',
        rol: 'admin',
        prioridad: 'media',
        estado: 'en_proceso',
        vence: '2025-11-24',
        icono: 'fa-shield-check',
        etiquetas: ['Alertas', 'Auditoría'],
        ubicacion: 'Panel Operativo',
        responsable: 'Fidel Cruz',
        adjuntos: [],
        historial: []
    },
    {
        id: 'task-supervisor-001',
        titulo: 'Supervisar inspección de terrazas',
        descripcion: 'Validar checklist de seguridad y cargar evidencia fotográfica.',
        rol: 'supervisor',
        prioridad: 'alta',
        estado: 'pendiente',
        vence: '2025-11-22',
        icono: 'fa-clipboard-check',
        etiquetas: ['Inspección', 'Seguridad'],
        ubicacion: 'Terraza Sky Bar',
        responsable: 'Juan Supervisor',
        adjuntos: [],
        historial: []
    },
    {
        id: 'task-tecnico-001',
        titulo: 'Restablecer iluminación lobby principal',
        descripcion: 'Cambiar balastros y sincronizar escena nocturna.',
        rol: 'tecnico',
        prioridad: 'alta',
        estado: 'en_proceso',
        vence: '2025-11-22',
        icono: 'fa-lightbulb',
        etiquetas: ['Electricidad'],
        ubicacion: 'Lobby Principal',
        responsable: 'Carlos Técnico',
        adjuntos: [],
        historial: []
    }
];

// =====================================================
// 6. FUNCIONES DE NORMALIZACIÓN Y DATOS
// =====================================================

function sanitizeText(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function normalizeTareaRecord(tarea) {
    const clone = { ...tarea };
    clone.etiquetas = Array.isArray(clone.etiquetas) ? [...clone.etiquetas] : [];
    clone.historial = Array.isArray(clone.historial) ? [...clone.historial] : [];
    clone.adjuntos = Array.isArray(clone.adjuntos)
        ? clone.adjuntos.map((adjunto, index) => ({
            id: adjunto?.id || `adj-${clone.id || 'tarea'}-${index}`,
            name: adjunto?.name || adjunto?.archivo || `Archivo ${index + 1}`,
            size: adjunto?.size || null,
            uploadedAt: adjunto?.uploadedAt || new Date().toISOString()
        }))
        : [];
    return clone;
}

function normalizeTareasCollection(collection) {
    return collection.map(t => normalizeTareaRecord(t));
}

function loadTareasData() {
    const defaults = normalizeTareasCollection([...DEFAULT_TAREAS]);
    try {
        const saved = localStorage.getItem(TAREAS_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                const normalizedSaved = normalizeTareasCollection(parsed);
                const existingIds = new Set(normalizedSaved.map(t => t.id));
                let updated = false;

                defaults.forEach(defaultTask => {
                    if (!existingIds.has(defaultTask.id)) {
                        normalizedSaved.push(defaultTask);
                        updated = true;
                    }
                });

                if (updated) {
                    saveTareasData(normalizedSaved);
                }

                return normalizedSaved;
            }
        }
    } catch (error) {
        console.warn('Error cargando tareas:', error);
    }
    return defaults;
}

function saveTareasData(tareas) {
    try {
        localStorage.setItem(TAREAS_STORAGE_KEY, JSON.stringify(tareas));
    } catch (error) {
        console.error('Error guardando tareas:', error);
    }
}

// =====================================================
// 7. FUNCIONES DE FORMATEO
// =====================================================

function getEstadoLabel(estado) {
    switch (estado) {
        case 'en_proceso':
            return 'En proceso';
        case 'completada':
            return 'Completada';
        default:
            return 'Pendiente';
    }
}

function getPrioridadLabel(prioridad) {
    switch (prioridad) {
        case 'alta':
            return 'Alta';
        case 'media':
            return 'Media';
        default:
            return 'Baja';
    }
}

function getRolLabel(rol) {
    switch ((rol || '').toLowerCase()) {
        case 'admin':
            return 'Administración';
        case 'supervisor':
            return 'Supervisor';
        case 'tecnico':
        case 'técnico':
            return 'Técnico';
        default:
            if (!rol) return 'Sin rol asignado';
            return rol.charAt(0).toUpperCase() + rol.slice(1);
    }
}

function formatFechaDetalle(fecha) {
    if (!fecha) return 'Sin registro';
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return 'Sin registro';
    return date.toLocaleString('es-MX', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).replace('.', '');
}

function formatTareaCodigo(tarea) {
    if (tarea.id) return tarea.id.toUpperCase();
    const prefix = tarea.rol ? tarea.rol.substring(0, 3).toUpperCase() : 'TASK';
    return `${prefix}-${Math.floor(Math.random() * 999)}`;
}

function getTareaVenceInfo(fecha) {
    const buildInfo = (texto, diasRestantes = 5) => {
        const nivel = diasRestantes < 0 || diasRestantes <= 1 ? 'alta' : diasRestantes <= 3 ? 'media' : 'baja';
        return { texto, isUrgente: nivel !== 'baja', nivel };
    };

    if (!fecha) return { texto: 'Sin fecha', isUrgente: false, nivel: 'media' };
    const fechaVence = new Date(fecha);
    if (Number.isNaN(fechaVence.getTime())) return { texto: 'Fecha inválida', isUrgente: false, nivel: 'media' };
    const hoy = new Date();
    const diasRestantes = Math.ceil((fechaVence - hoy) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return buildInfo(`Vencida hace ${Math.abs(diasRestantes)}d`, -1);
    if (diasRestantes === 0) return buildInfo('Vence hoy', 0);
    if (diasRestantes === 1) return buildInfo('Vence mañana', 1);
    if (diasRestantes <= 3) return buildInfo(`Vence en ${diasRestantes} días`, diasRestantes);
    return buildInfo(`Vence en ${diasRestantes} días`, diasRestantes);
}

function getTareaAccionConfig(tarea) {
    if (tarea.estado === 'pendiente') {
        return { label: 'Iniciar', icon: 'fa-play', className: 'accion-iniciar', nextEstado: 'en_proceso' };
    }
    if (tarea.estado === 'en_proceso') {
        return { label: 'Completar', icon: 'fa-check', className: 'accion-completar', nextEstado: 'completada' };
    }
    return { label: 'Reabrir', icon: 'fa-rotate-left', className: 'accion-reabrir', nextEstado: 'pendiente' };
}

function getPrioridadIcon(prioridad) {
    if (prioridad === 'alta') return 'fa-exclamation-triangle';
    if (prioridad === 'media') return 'fa-circle-half-stroke';
    return 'fa-circle';
}

function getResponsableInitials(nombre) {
    if (!nombre) return 'NA';
    return nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

function formatDateForInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}

function formatHistorialFecha(value) {
    if (!value) return '--';
    try {
        return new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(value));
    } catch (error) {
        return value;
    }
}

function formatAdjuntoPeso(bytes) {
    if (!bytes) return '';
    const unidades = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unidad = 0;
    while (size >= 1024 && unidad < unidades.length - 1) {
        size /= 1024;
        unidad += 1;
    }
    return `${size.toFixed(1)} ${unidades[unidad]}`;
}

// =====================================================
// 8. INICIALIZACIÓN DEL MÓDULO
// =====================================================

function ensureTareasModule() {
    console.log('🔧 Inicializando módulo de tareas...');
    if (!AppState.tareas.length) {
        AppState.tareas = loadTareasData();
        console.log('📋 Tareas cargadas:', AppState.tareas.length);
    } else {
        AppState.tareas = normalizeTareasCollection(AppState.tareas);
    }
    if (!tareasModuleInitialized) {
        setupTareasFilters();
        setupTareasInteractions();
        tareasModuleInitialized = true;
        console.log('✅ Filtros de tareas configurados');
    } else {
        setupTareasInteractions();
    }
    filterAndRenderTareas();
    console.log('🎨 Tareas renderizadas');
}

// =====================================================
// 9. CONFIGURACIÓN DE FILTROS
// =====================================================

function setupTareasFilters() {
    const searchInput = document.getElementById('buscarTarea');
    const roleSelect = document.getElementById('filtroRolTarea');
    const estadoSelect = document.getElementById('filtroEstadoTarea');
    const prioridadSelect = document.getElementById('filtroPrioridadTarea');
    const quickActionsSelect = document.getElementById('quickActionsSelect');

    if (roleSelect) {
        roleSelect.value = 'mi-rol';
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            AppState.tareasFilters.search = e.target.value;
            AppState.tareasPagination.page = 1;
            filterAndRenderTareas();
        });
    }

    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            AppState.tareasFilters.role = e.target.value;
            AppState.tareasPagination.page = 1;
            filterAndRenderTareas();
        });
    }

    if (estadoSelect) {
        estadoSelect.addEventListener('change', (e) => {
            AppState.tareasFilters.estado = e.target.value;
            AppState.tareasPagination.page = 1;
            filterAndRenderTareas();
        });
    }

    if (prioridadSelect) {
        prioridadSelect.addEventListener('change', (e) => {
            AppState.tareasFilters.prioridad = e.target.value;
            AppState.tareasPagination.page = 1;
            filterAndRenderTareas();
        });
    }

    if (quickActionsSelect) {
        quickActionsSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (!value) return;
            handleQuickActionSelection(value);
            setTimeout(() => {
                quickActionsSelect.value = '';
            }, 150);
        });
    }
}

function handleQuickActionSelection(action) {
    switch (action) {
        case 'generar-pdf':
            alert('Función PDF no implementada en este demo');
            break;
        case 'nueva-tarea':
            alert('Función Nueva Tarea no implementada en este demo');
            break;
        case 'eliminar-tarea':
            alert('Función Eliminar Tarea no implementada en este demo');
            break;
        default:
            break;
    }
}

// =====================================================
// 10. RENDERIZADO DE TAREAS
// =====================================================

function buildTareaTagsPreviewHTML(etiquetas = []) {
    if (!etiquetas.length) {
        return '<span class="tarea-tag-pill">General</span>';
    }
    const visibles = etiquetas.slice(0, 2);
    const extra = Math.max(etiquetas.length - visibles.length, 0);
    const tagsMarkup = visibles
        .map(tag => `<span class="tarea-tag-pill">${sanitizeText(tag)}</span>`)
        .join('');
    const extraMarkup = extra > 0 ? `<span class="tarea-tag-pill tarea-tag-extra">+${extra}</span>` : '';
    return tagsMarkup + extraMarkup;
}

function buildTareaCardHTML(tarea) {
    const estadoClass = tarea.estado === 'completada' ? 'estado-completada' :
        tarea.estado === 'en_proceso' ? 'estado-en-proceso' : 'estado-pendiente';
    const estadoLabel = getEstadoLabel(tarea.estado);
    const prioridadLabel = getPrioridadLabel(tarea.prioridad);
    const venceInfo = getTareaVenceInfo(tarea.vence);
    const tagsHTML = buildTareaTagsPreviewHTML(Array.isArray(tarea.etiquetas) ? tarea.etiquetas : []);
    const ubicacion = sanitizeText(tarea.ubicacion || 'Sin ubicación asignada');
    const responsable = sanitizeText(tarea.responsable || 'No asignado');
    const venceColorClass = `vence-alerta-${venceInfo.nivel || 'media'}`;

    return `
        <li class="habitacion-card tarea-card prioridad-${tarea.prioridad} ${estadoClass}" data-task-id="${tarea.id}">
            <div class="tarea-card-header">
                <div class="tarea-card-header-top">
                    <span class="tarea-estado-pill ${estadoClass}">${estadoLabel}</span>
                    <span class="nivel-alerta-badge nivel-alerta-${tarea.prioridad}">
                        <span class="semaforo-indicator"></span>
                        ${prioridadLabel}
                    </span>
                </div>
                <span class="tarea-header-line" aria-hidden="true"></span>
            </div>
            <div class="tarea-card-body">
                <h3 class="tarea-card-title">${sanitizeText(tarea.titulo)}</h3>
                <div class="tarea-card-meta">
                    <div class="tarea-meta-item">
                        <i class="fas fa-location-dot"></i>
                        <span>${ubicacion}</span>
                    </div>
                </div>
                <div class="tarea-card-vence">
                    <span class="vence-indicador ${venceColorClass}">
                        <i class="fas fa-calendar-day"></i>
                        ${venceInfo.texto}
                    </span>
                </div>
                <div class="tarea-card-tagsline">
                    <div class="tarea-tags-preview">${tagsHTML}</div>
                </div>
            </div>
            <div class="tarea-card-footer">
                <div class="tarea-responsable-block">
                    <div class="tarea-avatar">${getResponsableInitials(tarea.responsable)}</div>
                    <div class="tarea-responsable-info">
                        <span class="label">Responsable</span>
                        <strong>${responsable}</strong>
                    </div>
                </div>
                <div class="tarea-card-actions">
                    <button class="habitacion-boton boton-secundario btn-tarea-view" data-task-id="${tarea.id}" title="Ver tarea">
                        <i class="fas fa-eye"></i>
                        Ver
                    </button>
                    <button class="habitacion-boton boton-principal btn-tarea-edit" data-task-id="${tarea.id}" title="Editar tarea">
                        <i class="fas fa-pen"></i>
                        Editar
                    </button>
                </div>
            </div>
        </li>
    `;
}

function filterAndRenderTareas() {
    const filters = AppState.tareasFilters;
    const currentRole = AppState.currentUser.role;
    if (!AppState.tareasPagination) {
        AppState.tareasPagination = { page: 1, perPage: TAREAS_POR_PAGINA };
    } else if (!AppState.tareasPagination.perPage) {
        AppState.tareasPagination.perPage = TAREAS_POR_PAGINA;
    }

    let filtered = [...AppState.tareas];

    // Filtro de rol
    if (filters.role === 'mi-rol' || !filters.role || filters.role === '') {
        filtered = filtered.filter(t => t.rol === currentRole);
    } else if (filters.role === 'todos') {
        // Mostrar todas
    } else {
        filtered = filtered.filter(t => t.rol === filters.role);
    }

    // Filtro de estado
    if (filters.estado) {
        filtered = filtered.filter(t => t.estado === filters.estado);
    }

    // Filtro de prioridad
    if (filters.prioridad) {
        filtered = filtered.filter(t => t.prioridad === filters.prioridad);
    }

    // Búsqueda
    if (filters.search.trim()) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(t =>
            t.titulo.toLowerCase().includes(searchLower) ||
            t.descripcion.toLowerCase().includes(searchLower) ||
            t.ubicacion.toLowerCase().includes(searchLower) ||
            t.responsable.toLowerCase().includes(searchLower) ||
            t.etiquetas.some(tag => tag.toLowerCase().includes(searchLower))
        );
    }

    const perPage = AppState.tareasPagination.perPage;
    const totalPaginas = Math.max(1, Math.ceil(filtered.length / perPage));
    if (AppState.tareasPagination.page > totalPaginas) {
        AppState.tareasPagination.page = totalPaginas;
    }
    if (AppState.tareasPagination.page < 1) {
        AppState.tareasPagination.page = 1;
    }

    AppState.tareasFiltradas = filtered;
    renderTareasList(filtered);
    renderTareasPagination(filtered.length);
    updateTareasStats(filtered);
    updateTareasResumen(AppState.tareas);
    updateTareasTimeline(AppState.tareas);
}

function renderTareasList(tareas) {
    const container = document.getElementById('listaTareas');
    const mensajeVacio = document.getElementById('mensajeNoTareas');

    if (!container) return;

    const { page, perPage } = AppState.tareasPagination;
    const inicio = (page - 1) * perPage;
    const fin = inicio + perPage;
    const paginadas = tareas.slice(inicio, fin);

    if (paginadas.length === 0) {
        container.innerHTML = '';
        if (mensajeVacio) mensajeVacio.style.display = 'flex';
        return;
    }

    if (mensajeVacio) mensajeVacio.style.display = 'none';

    container.innerHTML = paginadas.map(tarea => buildTareaCardHTML(tarea)).join('');
}

// =====================================================
// 11. PAGINACIÓN
// =====================================================

function renderTareasPagination(total) {
    const container = document.getElementById('tareasPagination');
    if (!container) return;

    const paginationState = AppState.tareasPagination || { page: 1, perPage: TAREAS_POR_PAGINA };
    if (!AppState.tareasPagination) {
        AppState.tareasPagination = paginationState;
    }
    if (!paginationState.perPage) {
        paginationState.perPage = TAREAS_POR_PAGINA;
    }

    const perPage = paginationState.perPage;
    if (!total || total <= perPage) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(total / perPage));
    const paginaActual = Math.min(Math.max(paginationState.page, 1), totalPaginas);
    AppState.tareasPagination.page = paginaActual;

    const opciones = Array.from({ length: totalPaginas }, (_, index) => {
        const pagina = index + 1;
        const selected = pagina === paginaActual ? ' selected' : '';
        return `<option value="${pagina}"${selected}>${pagina}</option>`;
    }).join('');

    container.style.display = 'flex';
    container.innerHTML = `
        <button class="pagination-btn" data-action="prev" ${paginaActual === 1 ? 'disabled' : ''} aria-label="Ir a la página anterior de tareas">
            <i class="fas fa-chevron-left"></i>
            <span>Anterior</span>
        </button>
        <div class="pagination-info">
            <span>Página</span>
            <select class="pagination-select" id="tareasPaginationSelect" aria-label="Seleccionar página de tareas">
                ${opciones}
            </select>
            <span>de ${totalPaginas}</span>
        </div>
        <button class="pagination-btn" data-action="next" ${paginaActual === totalPaginas ? 'disabled' : ''} aria-label="Ir a la página siguiente de tareas">
            <span>Siguiente</span>
            <i class="fas fa-chevron-right"></i>
        </button>
        <span class="pagination-total">${total === 1 ? '1 tarea' : `${total} tareas`}</span>
    `;

    const prevBtn = container.querySelector('[data-action="prev"]');
    const nextBtn = container.querySelector('[data-action="next"]');
    const selectEl = container.querySelector('#tareasPaginationSelect');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (AppState.tareasPagination.page > 1) {
                AppState.tareasPagination.page -= 1;
                renderTareasList(AppState.tareasFiltradas);
                renderTareasPagination(total);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (AppState.tareasPagination.page < totalPaginas) {
                AppState.tareasPagination.page += 1;
                renderTareasList(AppState.tareasFiltradas);
                renderTareasPagination(total);
            }
        });
    }

    if (selectEl) {
        selectEl.addEventListener('change', (e) => {
            const nuevaPag = parseInt(e.target.value, 10);
            if (!Number.isNaN(nuevaPag)) {
                AppState.tareasPagination.page = nuevaPag;
                renderTareasList(AppState.tareasFiltradas);
                renderTareasPagination(total);
            }
        });
    }
}

// =====================================================
// 12. INTERACCIONES Y MODALES
// =====================================================

function setupTareasInteractions() {
    const container = document.getElementById('listaTareas');
    if (container && !tareasInteractionsBound) {
        container.addEventListener('click', handleTareasListClick);
        tareasInteractionsBound = true;
    }

    const modal = document.getElementById('modalDetalleTarea');
    if (modal) {
        tareaModalElements.modal = modal;
        tareaModalElements.titulo = document.getElementById('tareaModalTitulo');
        tareaModalElements.descripcion = document.getElementById('tareaModalDescripcion');
        tareaModalElements.prioridad = document.getElementById('tareaModalPrioridad');
        tareaModalElements.estado = document.getElementById('tareaModalEstado');
        tareaModalElements.ubicacion = document.getElementById('tareaModalUbicacion');
        tareaModalElements.responsable = document.getElementById('tareaModalResponsable');
        tareaModalElements.vence = document.getElementById('tareaModalVence');
        tareaModalElements.tags = document.getElementById('tareaModalTags');
        tareaModalElements.id = document.getElementById('tareaModalId');
        tareaModalElements.rol = document.getElementById('tareaModalRol');
        tareaModalElements.nextAction = document.getElementById('tareaModalNextStep');
        tareaModalElements.ultimoMovimiento = document.getElementById('tareaModalUltimoMovimiento');
        tareaModalElements.accion = document.getElementById('tareaModalAccion');

        modal.querySelectorAll('[data-close-modal]').forEach(trigger => {
            if (!trigger.dataset.listenerAttached) {
                trigger.addEventListener('click', cerrarModalDetalleTarea);
                trigger.dataset.listenerAttached = 'true';
            }
        });
    }

    if (tareaModalElements.accion && !tareaModalElements.accion.dataset.bound) {
        tareaModalElements.accion.addEventListener('click', handleTareaModalAction);
        tareaModalElements.accion.dataset.bound = 'true';
    }

    initializeTareaEditModal();
}

function handleTareasListClick(event) {
    const verBtn = event.target.closest('.btn-tarea-view');
    const editBtn = event.target.closest('.btn-tarea-edit');
    if (!verBtn && !editBtn) return;

    const targetBtn = verBtn || editBtn;
    const taskId = targetBtn.getAttribute('data-task-id');
    if (!taskId) return;

    const tarea = AppState.tareas.find(t => t.id === taskId);
    if (!tarea) return;

    if (verBtn) {
        abrirModalDetalleTarea(tarea);
        return;
    }

    if (editBtn) {
        abrirModalEditarTarea(tarea);
    }
}

function abrirModalDetalleTarea(tarea) {
    if (!tareaModalElements.modal) return;

    tareaModalElements.modal.style.display = 'flex';
    tareaModalElements.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    const estadoClass = tarea.estado === 'completada' ? 'estado-completada' :
        tarea.estado === 'en_proceso' ? 'estado-en-proceso' : 'estado-pendiente';
    const prioridadClass = tarea.prioridad === 'alta' ? 'alerta-prioridad-alta' :
        tarea.prioridad === 'media' ? 'alerta-prioridad-media' : 'alerta-prioridad-baja';
    const prioridadLabel = tarea.prioridad.charAt(0).toUpperCase() + tarea.prioridad.slice(1);
    const estadoLabel = getEstadoLabel(tarea.estado);
    const action = getTareaAccionConfig(tarea);
    const venceInfo = getTareaVenceInfo(tarea.vence);
    const etiquetas = Array.isArray(tarea.etiquetas) ? tarea.etiquetas : [];
    const codigo = formatTareaCodigo(tarea);
    const rolLabel = getRolLabel(tarea.rol);
    const ultimoMovimiento = tarea.finalizacion || tarea.ultimaActualizacion || tarea.inicio || tarea.creadoEl || tarea.vence;
    const ultimoMovimientoTexto = formatFechaDetalle(ultimoMovimiento);

    if (tareaModalElements.titulo) tareaModalElements.titulo.textContent = tarea.titulo;
    if (tareaModalElements.descripcion) tareaModalElements.descripcion.textContent = tarea.descripcion;
    if (tareaModalElements.prioridad) {
        tareaModalElements.prioridad.textContent = prioridadLabel;
        tareaModalElements.prioridad.className = `tarea-modal-pill ${prioridadClass}`;
    }
    if (tareaModalElements.estado) {
        tareaModalElements.estado.textContent = estadoLabel;
        tareaModalElements.estado.className = `tarea-modal-pill ${estadoClass}`;
    }
    if (tareaModalElements.ubicacion) tareaModalElements.ubicacion.textContent = tarea.ubicacion;
    if (tareaModalElements.responsable) tareaModalElements.responsable.textContent = tarea.responsable;
    if (tareaModalElements.vence) tareaModalElements.vence.textContent = venceInfo.texto;
    if (tareaModalElements.id) tareaModalElements.id.textContent = codigo;
    if (tareaModalElements.rol) tareaModalElements.rol.textContent = rolLabel;
    if (tareaModalElements.nextAction) tareaModalElements.nextAction.textContent = action.label;
    if (tareaModalElements.ultimoMovimiento) tareaModalElements.ultimoMovimiento.textContent = ultimoMovimientoTexto;

    if (tareaModalElements.tags) {
        if (!etiquetas.length) {
            tareaModalElements.tags.innerHTML = '<span class="tarea-tag-mini">General</span>';
        } else {
            tareaModalElements.tags.innerHTML = etiquetas.map(tag => `<span class="tarea-tag-mini">${sanitizeText(tag)}</span>`).join('');
        }
    }

    if (tareaModalElements.accion) {
        tareaModalElements.accion.textContent = action.label;
        tareaModalElements.accion.dataset.taskId = tarea.id;
        tareaModalElements.accion.dataset.nextEstado = action.nextEstado;
        tareaModalElements.accion.className = `btn-cuarto-action btn-tarea-modal ${action.className}`;
    }
}

function cerrarModalDetalleTarea() {
    if (!tareaModalElements.modal) return;
    tareaModalElements.modal.style.display = 'none';
    tareaModalElements.modal.setAttribute('aria-hidden', 'true');
    if (!isAnyTareaModalVisible()) {
        document.body.classList.remove('modal-open');
    }
}

function handleTareaModalAction(event) {
    const btn = event.currentTarget;
    const taskId = btn.dataset.taskId;
    const nextEstado = btn.dataset.nextEstado;
    if (!taskId || !nextEstado) return;

    const tarea = AppState.tareas.find(t => t.id === taskId);
    if (!tarea) return;

    actualizarEstadoTarea(tarea, nextEstado);
    cerrarModalDetalleTarea();
}

function actualizarEstadoTarea(tarea, nuevoEstado) {
    if (!tarea || !nuevoEstado) return;
    tarea.estado = nuevoEstado;
    if (nuevoEstado === 'en_proceso') {
        tarea.inicio = new Date().toISOString();
    }
    if (nuevoEstado === 'completada') {
        tarea.finalizacion = new Date().toISOString();
    }
    if (nuevoEstado === 'pendiente') {
        tarea.inicio = null;
        tarea.finalizacion = null;
    }

    saveTareasData(AppState.tareas);
    filterAndRenderTareas();
}

function isAnyTareaModalVisible() {
    const detalleVisible = tareaModalElements.modal && tareaModalElements.modal.getAttribute('aria-hidden') === 'false';
    const editarVisible = tareaEditModalState.modal && tareaEditModalState.modal.getAttribute('aria-hidden') === 'false';
    return Boolean(detalleVisible || editarVisible);
}

// =====================================================
// 13. MODAL DE EDICIÓN
// =====================================================

function initializeTareaEditModal() {
    if (tareaEditModalState.modal && tareaEditModalState.form) {
        return;
    }

    const modal = document.getElementById('modalEditarTarea');
    const form = document.getElementById('formEditarTarea');

    if (!modal || !form) {
        return;
    }

    tareaEditModalState.modal = modal;
    tareaEditModalState.form = form;
    tareaEditModalState.fields = {
        id: document.getElementById('tareaEditId'),
        titulo: document.getElementById('tareaEditNombre'),
        descripcion: document.getElementById('tareaEditDescripcion'),
        prioridad: document.getElementById('tareaEditPrioridad'),
        estado: document.getElementById('tareaEditEstado'),
        fecha: document.getElementById('tareaEditFecha'),
        responsable: document.getElementById('tareaEditResponsable'),
        tagInput: document.getElementById('tareaEditTagInput')
    };
    tareaEditModalState.tagsContainer = document.getElementById('tareaEditTags');
    tareaEditModalState.addTagBtn = document.getElementById('tareaEditAddTag');
    tareaEditModalState.attachmentsInput = document.getElementById('tareaEditArchivo');
    tareaEditModalState.attachmentsList = document.getElementById('tareaEditAdjuntos');
    tareaEditModalState.historyList = document.getElementById('tareaEditHistorial');

    modal.querySelectorAll('[data-close-edit-modal]').forEach((trigger) => {
        trigger.addEventListener('click', closeTareaEditModal);
    });

    form.addEventListener('submit', handleTareaEditSubmit);

    if (tareaEditModalState.addTagBtn) {
        tareaEditModalState.addTagBtn.addEventListener('click', handleTareaAddTag);
    }

    if (tareaEditModalState.fields.tagInput) {
        tareaEditModalState.fields.tagInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleTareaAddTag();
            }
        });
    }

    if (tareaEditModalState.tagsContainer) {
        tareaEditModalState.tagsContainer.addEventListener('click', (event) => {
            const removeBtn = event.target.closest('[data-remove-tag]');
            if (!removeBtn) return;
            const index = Number(removeBtn.getAttribute('data-remove-tag'));
            if (Number.isNaN(index)) return;
            tareaEditModalState.currentTags.splice(index, 1);
            renderTareaEditTags();
        });
    }

    if (tareaEditModalState.attachmentsInput) {
        tareaEditModalState.attachmentsInput.addEventListener('change', handleTareaAttachmentChange);
    }

    if (tareaEditModalState.attachmentsList) {
        tareaEditModalState.attachmentsList.addEventListener('click', (event) => {
            const removeBtn = event.target.closest('[data-remove-adjunto]');
            if (!removeBtn) return;
            const adjuntoId = removeBtn.getAttribute('data-remove-adjunto');
            tareaEditModalState.editingAdjuntos = tareaEditModalState.editingAdjuntos.filter(adj => adj.id !== adjuntoId);
            renderTareaEditAdjuntos();
        });
    }
}

function abrirModalEditarTarea(tarea) {
    if (!tareaEditModalState.modal || !tareaEditModalState.form) {
        initializeTareaEditModal();
    }

    if (!tareaEditModalState.modal) return;

    tareaEditModalState.currentTaskId = tarea.id;
    fillResponsableSelectOptions(tarea.responsable);

    const { id, titulo, descripcion, prioridad, estado, fecha } = tareaEditModalState.fields;

    if (id) id.value = tarea.id;
    if (titulo) titulo.value = tarea.titulo;
    if (descripcion) descripcion.value = tarea.descripcion;
    if (prioridad) prioridad.value = tarea.prioridad;
    if (estado) estado.value = tarea.estado;
    if (fecha) fecha.value = formatDateForInput(tarea.vence);
    if (tareaEditModalState.fields.responsable) {
        tareaEditModalState.fields.responsable.value = tarea.responsable || '';
    }

    tareaEditModalState.currentTags = Array.isArray(tarea.etiquetas) ? [...tarea.etiquetas] : [];
    tareaEditModalState.editingAdjuntos = Array.isArray(tarea.adjuntos) ? [...tarea.adjuntos] : [];

    renderTareaEditTags();
    renderTareaEditAdjuntos();
    renderTareaEditHistorial(tarea);

    const tituloModal = document.getElementById('tareaEditTitulo');
    if (tituloModal) {
        tituloModal.textContent = tarea.titulo;
    }

    tareaEditModalState.modal.style.display = 'flex';
    tareaEditModalState.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    requestAnimationFrame(() => {
        tareaEditModalState.fields.titulo?.focus();
    });
}

function closeTareaEditModal() {
    if (!tareaEditModalState.modal) {
        return;
    }
    tareaEditModalState.modal.style.display = 'none';
    tareaEditModalState.modal.setAttribute('aria-hidden', 'true');
    tareaEditModalState.currentTaskId = null;
    tareaEditModalState.currentTags = [];
    tareaEditModalState.editingAdjuntos = [];
    if (!isAnyTareaModalVisible()) {
        document.body.classList.remove('modal-open');
    }
}

function fillResponsableSelectOptions(responsableActual = '') {
    const select = tareaEditModalState.fields.responsable;
    if (!select) return;

    const responsables = Array.from(new Set(AppState.tareas.map(t => t.responsable).filter(Boolean))).sort((a, b) => a.localeCompare(b));

    select.innerHTML = '';
    responsables.forEach((nombre) => {
        const option = document.createElement('option');
        option.value = nombre;
        option.textContent = nombre;
        select.appendChild(option);
    });

    if (responsableActual && !responsables.includes(responsableActual)) {
        const option = document.createElement('option');
        option.value = responsableActual;
        option.textContent = responsableActual;
        select.appendChild(option);
    }

    if (responsableActual) {
        select.value = responsableActual;
    }
}

function renderTareaEditTags() {
    const container = tareaEditModalState.tagsContainer;
    if (!container) return;

    if (!tareaEditModalState.currentTags.length) {
        container.innerHTML = '<span class="tarea-edit-tag">Sin etiquetas</span>';
        return;
    }

    container.innerHTML = tareaEditModalState.currentTags
        .map((tag, index) => `
            <span class="tarea-edit-tag">
                ${sanitizeText(tag)}
                <button type="button" aria-label="Eliminar" data-remove-tag="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `)
        .join('');
}

function handleTareaAddTag() {
    const input = tareaEditModalState.fields.tagInput;
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    tareaEditModalState.currentTags.push(value);
    input.value = '';
    renderTareaEditTags();
}

function handleTareaAttachmentChange(event) {
    const { files } = event.target;
    if (!files || !files.length) return;

    const nuevos = Array.from(files).map((file, index) => ({
        id: `adj-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
    }));

    tareaEditModalState.editingAdjuntos = [...tareaEditModalState.editingAdjuntos, ...nuevos];
    event.target.value = '';
    renderTareaEditAdjuntos();
}

function renderTareaEditAdjuntos() {
    const list = tareaEditModalState.attachmentsList;
    if (!list) return;

    if (!tareaEditModalState.editingAdjuntos.length) {
        list.innerHTML = '<li class="adjunto-vacio">Sin archivos cargados</li>';
        return;
    }

    list.innerHTML = tareaEditModalState.editingAdjuntos
        .map((adjunto) => {
            const peso = formatAdjuntoPeso(adjunto.size);
            const pesoBadge = peso ? `<small>${peso}</small>` : '';
            return `
                <li>
                    <span>${sanitizeText(adjunto.name)}</span>
                    <div class="adjunto-meta">
                        ${pesoBadge}
                        <button type="button" aria-label="Eliminar adjunto" data-remove-adjunto="${adjunto.id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </li>
            `;
        })
        .join('');
}

function renderTareaEditHistorial(tarea) {
    const list = tareaEditModalState.historyList;
    if (!list) return;
    const historial = Array.isArray(tarea.historial) ? tarea.historial : [];

    if (!historial.length) {
        list.innerHTML = '<li>Sin movimientos registrados.</li>';
        return;
    }

    list.innerHTML = historial
        .slice(0, 6)
        .map(entry => `
            <li>
                <time>${formatHistorialFecha(entry.fecha)}</time>
                <strong>${sanitizeText(entry.descripcion || 'Actualización realizada')}</strong>
            </li>
        `)
        .join('');
}

function handleTareaEditSubmit(event) {
    event.preventDefault();
    const taskId = tareaEditModalState.currentTaskId;
    if (!taskId) return;

    const tarea = AppState.tareas.find(t => t.id === taskId);
    if (!tarea) return;

    const titulo = tareaEditModalState.fields.titulo?.value.trim() || tarea.titulo;
    const descripcion = tareaEditModalState.fields.descripcion?.value.trim() || tarea.descripcion;
    const prioridad = tareaEditModalState.fields.prioridad?.value || tarea.prioridad;
    const estado = tareaEditModalState.fields.estado?.value || tarea.estado;
    const fecha = tareaEditModalState.fields.fecha?.value || tarea.vence;
    const responsable = tareaEditModalState.fields.responsable?.value || tarea.responsable;

    const cambios = [];

    if (tarea.titulo !== titulo) {
        tarea.titulo = titulo;
        cambios.push('Título actualizado');
    }

    if (tarea.descripcion !== descripcion) {
        tarea.descripcion = descripcion;
        cambios.push('Descripción editada');
    }

    if (tarea.prioridad !== prioridad) {
        tarea.prioridad = prioridad;
        cambios.push(`Prioridad: ${getPrioridadLabel(prioridad)}`);
    }

    if (tarea.estado !== estado) {
        tarea.estado = estado;
        cambios.push(`Estado: ${getEstadoLabel(estado)}`);
    }

    if (tarea.vence !== fecha) {
        tarea.vence = fecha;
        cambios.push('Fecha límite actualizada');
    }

    if (tarea.responsable !== responsable) {
        tarea.responsable = responsable;
        cambios.push('Responsable asignado');
    }

    const etiquetasAntes = JSON.stringify(tarea.etiquetas || []);
    const etiquetasDespues = JSON.stringify(tareaEditModalState.currentTags || []);
    if (etiquetasAntes !== etiquetasDespues) {
        tarea.etiquetas = [...tareaEditModalState.currentTags];
        cambios.push('Etiquetas ajustadas');
    }

    const adjuntosAntes = JSON.stringify(tarea.adjuntos || []);
    const adjuntosDespues = JSON.stringify(tareaEditModalState.editingAdjuntos || []);
    if (adjuntosAntes !== adjuntosDespues) {
        tarea.adjuntos = [...tareaEditModalState.editingAdjuntos];
        cambios.push('Adjuntos sincronizados');
    }

    if (cambios.length) {
        tarea.historial = [
            {
                id: `hist-${Date.now()}`,
                fecha: new Date().toISOString(),
                descripcion: cambios.join(' · ')
            },
            ...(Array.isArray(tarea.historial) ? tarea.historial : [])
        ].slice(0, 12);
    }

    saveTareasData(AppState.tareas);
    filterAndRenderTareas();
    closeTareaEditModal();
    console.log('📝 Tarea actualizada', tarea.id, cambios);
}

// =====================================================
// 14. ESTADÍSTICAS Y RESUMEN
// =====================================================

function updateTareasStats(tareas) {
    const activasEl = document.getElementById('tareasStatsActivas');
    const procesoEl = document.getElementById('tareasStatsProceso');
    const doneEl = document.getElementById('tareasStatsDone');
    const progressEl = document.getElementById('tareasStatsProgress');
    const captionEl = document.getElementById('tareasStatsCaption');
    const highlightEl = document.getElementById('tareasStatsHighlight');

    const total = tareas.length;
    const completadas = tareas.filter(t => t.estado === 'completada').length;
    const enProceso = tareas.filter(t => t.estado === 'en_proceso').length;
    const pendientes = tareas.filter(t => t.estado === 'pendiente').length;
    const percent = total ? Math.round((completadas / total) * 100) : 0;

    if (activasEl) activasEl.textContent = pendientes;
    if (procesoEl) procesoEl.textContent = enProceso;
    if (doneEl) doneEl.textContent = completadas;

    if (progressEl) {
        progressEl.style.setProperty('--progress-value', `${percent}%`);
        progressEl.dataset.percent = `${percent}%`;
    }

    if (captionEl) {
        captionEl.textContent = `Total de tareas: ${total}`;
    }

    if (highlightEl) {
        highlightEl.textContent = `${completadas} completadas • ${pendientes + enProceso} pendientes`;
    }
}

function updateTareasResumen(tareas) {
    const rolActual = AppState.currentUser.role;
    const tareasRol = tareas.filter(t => t.rol === rolActual);

    const pendientes = tareasRol.filter(t => t.estado === 'pendiente').length;
    const enProceso = tareasRol.filter(t => t.estado === 'en_proceso').length;
    const completadas = tareasRol.filter(t => t.estado === 'completada').length;

    const hoy = new Date();
    const urgentes = tareasRol.filter(t => {
        if (t.estado === 'completada') return false;
        const vence = new Date(t.vence);
        const diasRestantes = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        return t.prioridad === 'alta' || diasRestantes < 0;
    }).length;

    const total = tareasRol.length;

    const pendEl = document.getElementById('tareasResumenPendientes');
    const procesoEl = document.getElementById('tareasResumenEnProceso');
    const compEl = document.getElementById('tareasResumenCompletadas');
    const urgentesEl = document.getElementById('tareasResumenUrgentes');
    const totalEl = document.getElementById('tareasResumenTotal');
    const rolEl = document.getElementById('tareasResumenRol');

    if (pendEl) pendEl.textContent = pendientes;
    if (procesoEl) procesoEl.textContent = enProceso;
    if (compEl) compEl.textContent = completadas;
    if (urgentesEl) urgentesEl.textContent = urgentes;
    if (totalEl) totalEl.textContent = total;

    if (rolEl) {
        const rolesEspanol = {
            'admin': 'Administrador',
            'supervisor': 'Supervisor',
            'tecnico': 'Técnico'
        };
        rolEl.textContent = rolesEspanol[rolActual] || rolActual.charAt(0).toUpperCase() + rolActual.slice(1);
    }
}

function updateTareasTimeline(tareas) {
    const container = document.getElementById('tareasTimeline');
    if (!container) return;

    const hoy = new Date();
    const proximas = tareas
        .filter(t => t.estado !== 'completada')
        .map(t => {
            const vence = new Date(t.vence);
            return { ...t, venceDate: vence, diasRestantes: Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24)) };
        })
        .sort((a, b) => a.venceDate - b.venceDate)
        .slice(0, 10);

    if (proximas.length === 0) {
        container.innerHTML = '<li class="mensaje-cargando">No hay tareas próximas.</li>';
        return;
    }

    container.innerHTML = proximas.map(t => {
        const diasTexto = t.diasRestantes < 0 ? `Vencida (${Math.abs(t.diasRestantes)}d)` :
            t.diasRestantes === 0 ? 'Vence hoy' :
                t.diasRestantes === 1 ? 'Vence mañana' :
                    `Vence en ${t.diasRestantes} días`;

        return `
            <li class="alerta-espacio-item">
                <div class="alerta-espacio-header">
                    <div class="alerta-espacio-badge">
                        <i class="fa-solid ${t.icono || 'fa-tasks'}"></i>
                        <span>${sanitizeText(t.titulo)}</span>
                    </div>
                </div>
                <p class="alerta-espacio-descripcion">${diasTexto}</p>
            </li>
        `;
    }).join('');
}

// =====================================================
// 15. INICIALIZACIÓN AUTOMÁTICA
// =====================================================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureTareasModule);
} else {
    ensureTareasModule();
}

// Exportar funciones para uso externo
window.TareasModule = {
    init: ensureTareasModule,
    refresh: filterAndRenderTareas,
    setUserRole: (role) => {
        AppState.currentUser.role = role;
        filterAndRenderTareas();
    },
    addTarea: (tarea) => {
        AppState.tareas.push(normalizeTareaRecord(tarea));
        saveTareasData(AppState.tareas);
        filterAndRenderTareas();
    }
};

window.ensureTareasModule = ensureTareasModule;

console.log('✅ Módulo de Tareas cargado correctamente');
