// ========================================
// CHECKLIST-TAB.JS - Módulo de Checklist JW Marriott
// ========================================

// Extender AppState existente con propiedades de checklist (si no existen)
(function extendAppState() {
    if (typeof AppState === 'undefined') {
        console.error('❌ [CHECKLIST-TAB] AppState no está definido. Este módulo requiere app.js');
        return;
    }
    
    // Solo agregar propiedades que no existan
    const checklistDefaults = {
        checklistItems: [],
        checklistCategorias: [],
        checklistFilters: {
            categoria: '',
            busqueda: '',
            habitacion: '',
            edificio: '',
            estado: ''
        },
        checklistPagination: {
            page: 1,
            perPage: 4,
            totalPages: 1
        },
        checklistFiltradas: [],
        inspeccionesRecientes: [],
        tareas: [],
        tareasFiltradas: [],
        tareasFilters: {
            search: '',
            role: 'mi-rol',
            estado: '',
            prioridad: ''
        },
        tareasPagination: {
            page: 1,
            perPage: 6
        }
    };
    
    for (const [key, value] of Object.entries(checklistDefaults)) {
        if (!(key in AppState)) {
            AppState[key] = value;
            console.log(`📋 [CHECKLIST-TAB] AppState.${key} inicializado`);
        }
    }
    
    console.log('✅ [CHECKLIST-TAB] AppState extendido correctamente');
})();

// Exportar función para que app.js pueda usarla
window.loadChecklistDataFromAPI = async function() {
    console.log('📋 [CHECKLIST-TAB] loadChecklistDataFromAPI() llamado desde window');
    return loadChecklistData();
};

const USUARIOS_POR_PAGINA = 4;
const TAREAS_POR_PAGINA = 6;
let tareasInteractionsBound = false;

AppState.tareasPagination.perPage = TAREAS_POR_PAGINA;

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

// Usar constantes existentes de app.js o definir si no existen
if (typeof CHECKLIST_ESTADOS === 'undefined') {
    var CHECKLIST_ESTADOS = ['bueno', 'regular', 'malo'];
}
if (typeof CHECKLIST_ESTADO_LABELS === 'undefined') {
    var CHECKLIST_ESTADO_LABELS = {
        bueno: 'Bueno',
        regular: 'Regular',
        malo: 'Malo'
    };
}

// Usar sanitizeText existente o definir si no existe
if (typeof sanitizeText === 'undefined') {
    var sanitizeText = function(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).replace(/[&<>"']/g, (char) => {
            switch (char) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return char;
            }
        });
    };
}

const UsuarioModalState = {
    initialized: false,
    modal: null,
    form: null,
    feedback: null,
    fields: {},
    title: null,
    keydownHandler: null
};

const DEFAULT_USUARIOS = [
    {
        id: 'usr-admin-1',
        nombre: 'Fidel Cruz Lozada',
        rol: 'admin',
        avatarIcon: 'fa-user-shield',
        email: 'fcruz@grupodiestra.com',
        telefono: '+52 624 237 1065',
        departamento: '# Administración General',
        numeroEmpleado: 'ADM-001',
        ultimoAcceso: 'Sin registro',
        ultimaSesion: '13 nov 2025, 6:56 p.m.',
        sesiones: { total: 9, activas: 2 },
        activo: true
    },
    {
        id: 'usr-supervisor-1',
        nombre: 'Juan Supervisor',
        rol: 'supervisor',
        avatarIcon: 'fa-user-tie',
        email: 'supervisor@siwmantto.com',
        telefono: 'Sin registro',
        departamento: '# Supervisión General',
        numeroEmpleado: 'SUP-001',
        ultimoAcceso: 'Sin registro',
        ultimaSesion: 'Sin registro',
        sesiones: { total: 0, activas: 0 },
        activo: true
    },
    {
        id: 'usr-tecnico-1',
        nombre: 'Carlos Técnico',
        rol: 'tecnico',
        avatarIcon: 'fa-user-cog',
        email: 'ctecnico@sjwmantto.com',
        telefono: 'Sin registro',
        departamento: '# Equipo Técnico',
        numeroEmpleado: 'TEC-441',
        ultimoAcceso: 'Sin registro',
        ultimaSesion: 'Sin registro',
        sesiones: { total: 0, activas: 0 },
        activo: true
    }
];

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
        responsable: 'Fidel Cruz'
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
        responsable: 'Fidel Cruz'
    },
    {
        id: 'task-admin-003',
        titulo: 'Actualizar plan de guardias decembrinas',
        descripcion: 'Confirmar coberturas y enviar calendarización final a RRHH.',
        rol: 'admin',
        prioridad: 'media',
        estado: 'pendiente',
        vence: '2025-11-28',
        icono: 'fa-calendar-check',
        etiquetas: ['Planeación', 'RRHH'],
        ubicacion: 'Sala de juntas',
        responsable: 'Fidel Cruz'
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
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-supervisor-002',
        titulo: 'Revisión nocturna de equipos HVAC',
        descripcion: 'Registrar lecturas y priorizar servicios especiales para suites premium.',
        rol: 'supervisor',
        prioridad: 'media',
        estado: 'en_proceso',
        vence: '2025-11-24',
        icono: 'fa-temperature-high',
        etiquetas: ['HVAC', 'Turno noche'],
        ubicacion: 'Torre VIP',
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-supervisor-003',
        titulo: 'Capacitación express a técnicos nuevos',
        descripcion: 'Refrescar protocolo de registro en la PWA y uso de formularios inline.',
        rol: 'supervisor',
        prioridad: 'baja',
        estado: 'pendiente',
        vence: '2025-11-27',
        icono: 'fa-chalkboard-teacher',
        etiquetas: ['Capacitación'],
        ubicacion: 'Sala Alfa',
        responsable: 'Juan Supervisor'
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
        responsable: 'Carlos Técnico'
    },
    {
        id: 'task-tecnico-002',
        titulo: 'Purgar líneas de agua en Sky Bar',
        descripcion: 'Coordinación con alimentos y bebidas antes de apertura.',
        rol: 'tecnico',
        prioridad: 'media',
        estado: 'pendiente',
        vence: '2025-11-23',
        icono: 'fa-droplet',
        etiquetas: ['Plomería'],
        ubicacion: 'Terraza Sky Bar',
        responsable: 'Carlos Técnico'
    },
    {
        id: 'task-tecnico-003',
        titulo: 'Actualizar firmware de cerraduras inteligentes',
        descripcion: 'Aplicar parche 4.21 en habitaciones VIP y documentar reinicios.',
        rol: 'tecnico',
        prioridad: 'baja',
        estado: 'completada',
        vence: '2025-11-18',
        icono: 'fa-lock',
        etiquetas: ['Seguridad', 'IoT'],
        ubicacion: 'Torre Principal',
        responsable: 'Ana García'
    },
    {
        id: 'task-admin-004',
        titulo: 'Revisar presupuesto de mantenimiento Q4',
        descripcion: 'Analizar gastos del trimestre y proyectar necesidades para el próximo periodo.',
        rol: 'admin',
        prioridad: 'alta',
        estado: 'pendiente',
        vence: '2025-11-25',
        icono: 'fa-dollar-sign',
        etiquetas: ['Finanzas', 'Presupuesto'],
        ubicacion: 'Oficina Admin',
        responsable: 'Fidel Cruz'
    },
    {
        id: 'task-admin-005',
        titulo: 'Coordinar reunión con proveedores',
        descripcion: 'Agendar y preparar temas para la junta mensual con proveedores estratégicos.',
        rol: 'admin',
        prioridad: 'media',
        estado: 'pendiente',
        vence: '2025-11-26',
        icono: 'fa-handshake',
        etiquetas: ['Proveedores', 'Reuniones'],
        ubicacion: 'Sala de juntas',
        responsable: 'Fidel Cruz'
    },
    {
        id: 'task-supervisor-004',
        titulo: 'Inspección de sistemas contra incendios',
        descripcion: 'Verificar funcionamiento de extintores, alarmas y rociadores en todas las áreas.',
        rol: 'supervisor',
        prioridad: 'alta',
        estado: 'pendiente',
        vence: '2025-11-23',
        icono: 'fa-fire-extinguisher',
        etiquetas: ['Seguridad', 'Inspección'],
        ubicacion: 'Todas las áreas',
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-supervisor-005',
        titulo: 'Validar inventario de herramientas',
        descripcion: 'Revisar stock de herramientas y solicitar reposición de faltantes.',
        rol: 'supervisor',
        prioridad: 'media',
        estado: 'en_proceso',
        vence: '2025-11-25',
        icono: 'fa-toolbox',
        etiquetas: ['Inventario', 'Herramientas'],
        ubicacion: 'Almacén técnico',
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-supervisor-006',
        titulo: 'Programar mantenimiento preventivo ascensores',
        descripcion: 'Coordinar con el proveedor las fechas para el servicio trimestral.',
        rol: 'supervisor',
        prioridad: 'baja',
        estado: 'pendiente',
        vence: '2025-11-29',
        icono: 'fa-elevator',
        etiquetas: ['Mantenimiento', 'Ascensores'],
        ubicacion: 'Torres A y B',
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-tecnico-004',
        titulo: 'Reparar bomba de alberca principal',
        descripcion: 'Diagnosticar y reparar bomba que presenta baja presión.',
        rol: 'tecnico',
        prioridad: 'alta',
        estado: 'en_proceso',
        vence: '2025-11-23',
        icono: 'fa-swimming-pool',
        etiquetas: ['Alberca', 'Mecánica'],
        ubicacion: 'Área de albercas',
        responsable: 'Carlos Técnico'
    },
    {
        id: 'task-tecnico-005',
        titulo: 'Cambiar filtros de aires acondicionados VIP',
        descripcion: 'Realizar mantenimiento programado en suites ejecutivas.',
        rol: 'tecnico',
        prioridad: 'media',
        estado: 'pendiente',
        vence: '2025-11-24',
        icono: 'fa-wind',
        etiquetas: ['HVAC', 'Filtros'],
        ubicacion: 'Suites VIP',
        responsable: 'Carlos Técnico'
    },
    {
        id: 'task-tecnico-006',
        titulo: 'Instalar nuevos sensores de movimiento',
        descripcion: 'Colocar sensores de iluminación automática en pasillos del piso 3.',
        rol: 'tecnico',
        prioridad: 'baja',
        estado: 'pendiente',
        vence: '2025-11-27',
        icono: 'fa-sensor',
        etiquetas: ['Electricidad', 'Sensores'],
        ubicacion: 'Piso 3',
        responsable: 'Ana García'
    },
    {
        id: 'task-tecnico-007',
        titulo: 'Revisión de sistema de sonido Salón Imperial',
        descripcion: 'Prueba completa de audio antes del evento del sábado.',
        rol: 'tecnico',
        prioridad: 'alta',
        estado: 'pendiente',
        vence: '2025-11-22',
        icono: 'fa-volume-up',
        etiquetas: ['Audio', 'Eventos'],
        ubicacion: 'Salón Imperial',
        responsable: 'Carlos Técnico'
    },
    {
        id: 'task-admin-006',
        titulo: 'Auditoría express de accesos PWA',
        descripcion: 'Validar bitácoras y revocar credenciales con riesgo.',
        rol: 'admin',
        prioridad: 'alta',
        estado: 'en_proceso',
        vence: '2025-11-26',
        icono: 'fa-user-lock',
        etiquetas: ['Seguridad', 'Accesos'],
        ubicacion: 'Oficina TI',
        responsable: 'Fidel Cruz'
    },
    {
        id: 'task-supervisor-007',
        titulo: 'Simulacro de contingencia eléctrica',
        descripcion: 'Coordinar protocolo de respaldo y documentar hallazgos.',
        rol: 'supervisor',
        prioridad: 'media',
        estado: 'pendiente',
        vence: '2025-11-28',
        icono: 'fa-bolt',
        etiquetas: ['Contingencia', 'Energía'],
        ubicacion: 'Planta eléctrica',
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-tecnico-008',
        titulo: 'Optimizar calibración de sensores IAQ',
        descripcion: 'Actualizar firmware y unificar lecturas de calidad de aire.',
        rol: 'tecnico',
        prioridad: 'media',
        estado: 'en_proceso',
        vence: '2025-11-24',
        icono: 'fa-gauge-high',
        etiquetas: ['IoT', 'Calidad aire'],
        ubicacion: 'Centro de monitoreo',
        responsable: 'Ana García'
    },
    {
        id: 'task-tecnico-009',
        titulo: 'Pulido final de barandales Sky Lounge',
        descripcion: 'Aplicar sellador antisalitre y levantar evidencia fotográfica.',
        rol: 'tecnico',
        prioridad: 'baja',
        estado: 'pendiente',
        vence: '2025-11-29',
        icono: 'fa-brush',
        etiquetas: ['Detalle', 'Sky Lounge'],
        ubicacion: 'Sky Lounge',
        responsable: 'Carlos Técnico'
    },
    {
        id: 'task-admin-007',
        titulo: 'Validar tablero de KPIs energéticos',
        descripcion: 'Cruzar lecturas con proveedores y liberar reporte mensual.',
        rol: 'admin',
        prioridad: 'media',
        estado: 'pendiente',
        vence: '2025-11-30',
        icono: 'fa-chart-area',
        etiquetas: ['KPIs', 'Energía'],
        ubicacion: 'Centro de control',
        responsable: 'Fidel Cruz'
    },
    {
        id: 'task-admin-008',
        titulo: 'Documentar cierres de incidencias VIP',
        descripcion: 'Registrar bitácora con fotos antes/después para auditoría.',
        rol: 'admin',
        prioridad: 'alta',
        estado: 'en_proceso',
        vence: '2025-11-27',
        icono: 'fa-file-signature',
        etiquetas: ['Auditoría', 'VIP'],
        ubicacion: 'Suite Presidencial',
        responsable: 'Fidel Cruz'
    },
    {
        id: 'task-admin-009',
        titulo: 'Ajustar matrices RACI de guardias',
        descripcion: 'Actualizar responsables y notificar cambios al comité.',
        rol: 'admin',
        prioridad: 'baja',
        estado: 'pendiente',
        vence: '2025-12-02',
        icono: 'fa-diagram-project',
        etiquetas: ['Planeación', 'Guardias'],
        ubicacion: 'Oficina Central',
        responsable: 'Fidel Cruz'
    },
    {
        id: 'task-supervisor-008',
        titulo: 'Supervisar sanitización de terrazas',
        descripcion: 'Verificar químicos y registrar lectura de cloro residual.',
        rol: 'supervisor',
        prioridad: 'alta',
        estado: 'pendiente',
        vence: '2025-11-25',
        icono: 'fa-biohazard',
        etiquetas: ['Sanitización', 'Terrazas'],
        ubicacion: 'Terrazas principales',
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-supervisor-009',
        titulo: 'Ensayo de evacuación nocturna',
        descripcion: 'Coordinar con seguridad y generar reporte con métricas.',
        rol: 'supervisor',
        prioridad: 'media',
        estado: 'pendiente',
        vence: '2025-11-30',
        icono: 'fa-person-running',
        etiquetas: ['Evacuación', 'Seguridad'],
        ubicacion: 'Torre B',
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-supervisor-010',
        titulo: 'Revisión cruzada de bitácoras HVAC',
        descripcion: 'Comparar registros manuales con sensores IoT.',
        rol: 'supervisor',
        prioridad: 'media',
        estado: 'en_proceso',
        vence: '2025-11-26',
        icono: 'fa-fan',
        etiquetas: ['HVAC', 'Bitácoras'],
        ubicacion: 'Sala de máquinas',
        responsable: 'Juan Supervisor'
    },
    {
        id: 'task-tecnico-010',
        titulo: 'Actualizar firmware de tablets operativas',
        descripcion: 'Instalar versión 5.3 y validar conectividad con PWA.',
        rol: 'tecnico',
        prioridad: 'media',
        estado: 'en_proceso',
        vence: '2025-11-28',
        icono: 'fa-tablet-screen-button',
        etiquetas: ['Firmware', 'Tablets'],
        ubicacion: 'Cuarto de redes',
        responsable: 'Ana García'
    },
    {
        id: 'task-tecnico-011',
        titulo: 'Lubricar rieles de puertas automáticas',
        descripcion: 'Aplicar compuesto recomendado y medir ruido residual.',
        rol: 'tecnico',
        prioridad: 'media',
        estado: 'pendiente',
        vence: '2025-11-27',
        icono: 'fa-door-closed',
        etiquetas: ['Mecánica', 'Puertas'],
        ubicacion: 'Lobby Norte',
        responsable: 'Carlos Técnico'
    },
    {
        id: 'task-tecnico-012',
        titulo: 'Refuerzo de sellos en domos',
        descripcion: 'Inspeccionar filtraciones y aplicar nuevo sellador UV.',
        rol: 'tecnico',
        prioridad: 'alta',
        estado: 'pendiente',
        vence: '2025-11-24',
        icono: 'fa-helmet-safety',
        etiquetas: ['Impermeabilización'],
        ubicacion: 'Domos centrales',
        responsable: 'Ana García'
    },
    {
        id: 'task-tecnico-013',
        titulo: 'Diagnóstico rápido de UPS',
        descripcion: 'Medir carga y reemplazar baterías cercanas al fin de vida.',
        rol: 'tecnico',
        prioridad: 'alta',
        estado: 'en_proceso',
        vence: '2025-11-25',
        icono: 'fa-plug-circle-bolt',
        etiquetas: ['Eléctrico', 'UPS'],
        ubicacion: 'Centro de datos',
        responsable: 'Carlos Técnico'
    }
];

// Usar la constante de app.js si ya existe
if (typeof DEFAULT_INSPECCIONES_RECIENTES === 'undefined') {
    var DEFAULT_INSPECCIONES_RECIENTES = [
        {
            id: 'insp-101',
            habitacion: '101',
            titulo: 'Revisión Aire Acondicionado',
            tecnico: 'Juan Pérez',
            fecha: 'Hoy · 10:30 AM',
            estado: 'aprobada'
        },
    {
        id: 'insp-102',
        habitacion: '102',
        titulo: 'Reparación Plomería',
        tecnico: 'María López',
        fecha: 'Hoy · 09:15 AM',
        estado: 'pendiente'
    },
    {
        id: 'insp-201',
        habitacion: '201',
        titulo: 'Cambio de Filtros',
        tecnico: 'Carlos Ruiz',
        fecha: 'Ayer · 04:45 PM',
        estado: 'aprobada'
    },
    {
        id: 'insp-203',
        habitacion: '203',
        titulo: 'Revisión TV',
        tecnico: 'Ana García',
        fecha: 'Ayer · 02:20 PM',
        estado: 'aprobada'
    }
];
} // Cierre del if (typeof DEFAULT_INSPECCIONES_RECIENTES === 'undefined')

const TAREAS_STORAGE_KEY = 'jwmt_tasks_v1';
let tareasModuleInitialized = false;

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando JW Marriott Sistema de Mantenimiento...');

    // Verificar autenticación
    checkAuthentication();

    // Inicializar tema
    initializeTheme();

    // Configurar event listeners
    setupEventListeners();

    // Inicializar navegación
    initializeNavigation();

    // Cargar datos iniciales
    loadInitialData();
});

// ========================================
// AUTENTICACIÓN
// ========================================

function checkAuthentication() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser || !currentUser.token) {
        // Redirigir al login si no hay sesión
        window.location.href = 'login.html';
        return false;
    }

    // Verificar si el token sigue vigente (opcional - implementar expiración)
    AppState.currentUser = currentUser;

    // Actualizar UI con info del usuario
    updateUserInfo();

    // Aplicar permisos según el rol
    applyRolePermissions(currentUser.role);

    console.log('✅ Usuario autenticado:', currentUser.name, '-', currentUser.role);
    return true;
}

function updateUserInfo() {
    const { name, role } = AppState.currentUser;

    document.getElementById('userName').textContent = name;
    document.getElementById('userRole').textContent = role.toUpperCase();
}

function applyRolePermissions(role) {
    // Agregar clase al body según el rol
    document.body.classList.add(role);

    if (role === 'admin') {
        // Mostrar elementos exclusivos de admin (solo botones y links de navegación, no tabs)
        document.querySelectorAll('.admin-only').forEach(el => {
            // Solo aplicar display inline a elementos de navegación, no a tabs
            if (!el.classList.contains('tab-content')) {
                // Determinar el display apropiado según el tipo de elemento
                if (el.tagName === 'A' || el.tagName === 'BUTTON') {
                    el.style.display = 'flex';
                } else {
                    el.style.display = 'block';
                }
            }
            // Los tabs se controlan solo por CSS con body.admin
        });
    } else {
        // Ocultar elementos de admin (solo elementos de navegación, no tabs)
        document.querySelectorAll('.admin-only').forEach(el => {
            if (!el.classList.contains('tab-content')) {
                el.style.display = 'none';
            }
            // Los tabs se controlan solo por CSS
        });
    }

    console.log('👤 Permisos aplicados para rol:', role);
}

const CHECKLIST_MODAL_SELECTORS = [
    '.modal-detalles',
    '#modalHistorialSabana',
    '#modalCrearSabana',
    '#checklist-details-modal',
    '.evidencia-viewer-modal'
];

function isAnyChecklistModalVisible() {
    return CHECKLIST_MODAL_SELECTORS.some(selector =>
        Array.from(document.querySelectorAll(selector))
            .some(el => window.getComputedStyle(el).display !== 'none')
    );
}

function lockBodyScrollChecklist() {
    document.body.classList.add('modal-open');
}

function unlockBodyScrollChecklist() {
    if (!isAnyChecklistModalVisible()) {
        document.body.classList.remove('modal-open');
    }
}

function logout() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// ========================================
// TEMA (CLARO/OSCURO)
// ========================================

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    AppState.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    console.log('🎨 Tema inicializado:', savedTheme);
}
function toggleTheme() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    AppState.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    console.log('🎨 Tema cambiado a:', newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }
}

function setupEventListeners() {
    // Botón de cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Switch de tema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Navegación entre tabs - Desktop y móvil
    document.querySelectorAll('.premium-nav .link, .premium-nav-mobile .link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Buscadores
    setupSearchListeners();

    // Modal de edición de usuarios
    initializeUsuarioEditModal();

    // Formulario de registro de usuarios
    initializeUsuarioForm();

    const formCrearSabana = document.getElementById('formCrearSabana');
    if (formCrearSabana) {
        formCrearSabana.addEventListener('submit', handleCrearSabanaSubmit);
    }

    console.log('✅ Event listeners configurados');
}

function setupSearchListeners() {
    // Buscador de Sábana
    const buscarSabana = document.getElementById('buscarSabana');
    if (buscarSabana) {
        buscarSabana.addEventListener('input', (e) => {
            filterSabana(e.target.value);
        });
    }

    const sabanaTipoSelect = document.getElementById('sabanaTipoSelect');
    if (sabanaTipoSelect) {
        sabanaTipoSelect.addEventListener('change', (e) => {
            const sabanaId = e.target.value;
            if (sabanaId) {
                setSabanaSeleccionada(sabanaId);
            }
        });
    }

    const sabanaEstadoSelect = document.getElementById('sabanaEstadoSelect');
    if (sabanaEstadoSelect) {
        sabanaEstadoSelect.addEventListener('change', (e) => {
            filterSabanaByEstado(e.target.value);
        });
    }

    // Buscador de Habitación en Checklist
    const buscarHabitacionChecklist = document.getElementById('buscarHabitacionChecklist');
    if (buscarHabitacionChecklist) {
        buscarHabitacionChecklist.addEventListener('input', (e) => {
            AppState.checklistFilters.habitacion = e.target.value;
            AppState.checklistPagination.page = 1;
            applyChecklistFilters();
        });
    }

    // Buscador de Ítems en Checklist
    const buscarChecklist = document.getElementById('buscarChecklist');
    if (buscarChecklist) {
        buscarChecklist.addEventListener('input', (e) => {
            filterChecklist(e.target.value);
        });
    }

    // Filtro de edificios en checklist
    const filtroEdificioChecklist = document.getElementById('filtroEdificioChecklist');
    if (filtroEdificioChecklist) {
        // Poblar el select con los edificios reales desde AppState
        poblarFiltroEdificiosChecklist();
        
        filtroEdificioChecklist.addEventListener('change', (e) => {
            AppState.checklistFilters.edificio = e.target.value;
            AppState.checklistPagination.page = 1; // Reset a página 1
            applyChecklistFilters();
        });
    }

    const filtroEstadoChecklist = document.getElementById('filtroEstadoChecklist');
    if (filtroEstadoChecklist) {
        filtroEstadoChecklist.addEventListener('change', (e) => {
            AppState.checklistFilters.estado = e.target.value;
            AppState.checklistPagination.page = 1;
            applyChecklistFilters();
        });
    }

    const buscarInspeccionReciente = document.getElementById('buscarInspeccionReciente');
    if (buscarInspeccionReciente) {
        buscarInspeccionReciente.addEventListener('input', (e) => {
            filterInspeccionesRecientes(e.target.value);
        });
    }

    const buscarUsuario = document.getElementById('buscarUsuario');
    if (buscarUsuario) {
        buscarUsuario.addEventListener('input', (e) => {
            AppState.usuariosFilters.query = e.target.value.toLowerCase();
            resetUsuariosPagina();
            filterAndRenderUsuarios();
        });
    }

    const filtroRolUsuario = document.getElementById('filtroRolUsuario');
    if (filtroRolUsuario) {
        filtroRolUsuario.addEventListener('change', (e) => {
            AppState.usuariosFilters.role = e.target.value;
            resetUsuariosPagina();
            filterAndRenderUsuarios();
        });
    }

    const filtroEstadoUsuario = document.getElementById('filtroEstadoUsuario');
    if (filtroEstadoUsuario) {
        filtroEstadoUsuario.addEventListener('change', (e) => {
            AppState.usuariosFilters.estado = e.target.value;
            resetUsuariosPagina();
            filterAndRenderUsuarios();
        });
    }

    const formNuevaSeccionChecklist = document.getElementById('formNuevaSeccionChecklist');
    if (formNuevaSeccionChecklist) {
        formNuevaSeccionChecklist.addEventListener('submit', handleNuevaSeccionSubmit);
    }
}

// ========================================
// NAVEGACIÓN ENTRE TABS
// ========================================

function initializeNavigation() {
    // Verificar si hay un parámetro de URL
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');

    if (view) {
        switchTab(view === 'admin' ? 'usuarios' : 'habitaciones');
    } else {
        switchTab('habitaciones');
    }
}

function switchTab(tabId) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Desactivar todos los enlaces de navegación - Desktop y móvil
    document.querySelectorAll('.premium-nav .link, .premium-nav-mobile .link').forEach(link => {
        link.classList.remove('active');
    });

    // Mostrar el tab seleccionado
    const selectedTab = document.getElementById(`tab-${tabId}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Activar el botón correspondiente - Desktop y móvil
    const selectedButtons = document.querySelectorAll(`[data-tab="${tabId}"]`);
    selectedButtons.forEach(button => {
        button.classList.add('active');
    });

    AppState.currentTab = tabId;

    // Cargar datos específicos del tab
    loadTabData(tabId);

    console.log('📄 Tab activo:', tabId);
}

function loadTabData(tabId) {
    console.log('🔄 Cargando datos para tab:', tabId);
    switch (tabId) {
        case 'sabana':
            loadSabanaData();
            break;
        case 'checklist':
            loadChecklistData().catch(error => console.error('❌ Error al cargar checklist:', error));
            break;
        case 'usuarios':
            if (AppState.currentUser.role === 'admin') {
                loadUsuariosData();
            }
            break;
        case 'tareas':
            console.log('🎯 Iniciando módulo de tareas...');
            ensureTareasModule();
            break;
    }
}

// ========================================
// CARGAR DATOS INICIALES
// ========================================

async function loadInitialData() {
    try {
        console.log('📥 Cargando datos iniciales...');

        // Aquí normalmente cargarías desde la API
        // Por ahora usamos datos de ejemplo

        AppState.edificios = [
            { id: 1, nombre: 'Edificio A' },
            { id: 2, nombre: 'Edificio B' },
            { id: 3, nombre: 'Edificio C' }
        ];

        AppState.cuartos = generateMockCuartos();

        console.log('✅ Datos iniciales cargados');
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
    }
}

function generateMockCuartos() {
    const cuartos = [];
    const edificios = ['A', 'B', 'C'];
    let id = 1;

    edificios.forEach((edificio, edifIndex) => {
        for (let piso = 1; piso <= 5; piso++) {
            for (let num = 1; num <= 8; num++) {
                cuartos.push({
                    id: id++,
                    numero: `${edificio}${piso}0${num}`,
                    edificio_id: edifIndex + 1,
                    edificio_nombre: `Edificio ${edificio}`,
                    estado: 'disponible'
                });
            }
        }
    });

    return cuartos;
}

// ========================================
// SÁBANA - REGISTRO DE CAMBIOS
// ========================================

const SABANA_STORAGE_KEY = 'sabanaCollectionsV1';

const SABANA_TIPOS = [
    { value: 'cambio_filtros', label: 'Cambio de Filtros de Aire' },
    { value: 'cambio_chapas', label: 'Cambio de Chapas' },
    { value: 'cambio_marmol', label: 'Cambio de Mármol' },
    { value: 'cambio_textiles', label: 'Cambio de Textiles' },
    { value: 'inspeccion_general', label: 'Inspección General' }
];

function getSabanaTipoLabel(tipo) {
    return SABANA_TIPOS.find(t => t.value === tipo)?.label || 'Sábana personalizada';
}

function crearListaSabana(texto) {
    return texto
        .trim()
        .split('\n')
        .map(linea => {
            const [habitacion = '', fechaProgramada = '', fechaRealizada = '', observaciones = ''] = linea.split('|').map(parte => parte.trim());
            return {
                habitacion,
                fechaProgramada,
                fechaRealizada,
                observaciones
            };
        })
        .filter(item => item.habitacion);
}

const SABANA_RESPONSABLES = {
    'Alfa': 'Equipo Alfa',
    'Bravo': 'Equipo Bravo',
    'Charly': 'Equipo Charly',
    'Eco': 'Equipo Eco',
    'Fox': 'Equipo Fox',
    'Casa Maat': 'Equipo Casa Maat'
};

const SABANA_SOURCE = {
    'Alfa': crearListaSabana(`
A101
A102
A103|17/07/2024
A104
A105
A106
S-A201
A202
A203
A204
A205
A206
A207
S-A208
A301
A302
A303
A304
A305
A306
S-A307
S-A401
A402
A403
A404
A405
A406
S-A407
S-A501
A502
A503
A504
A505
A506
S-A507
    `),
    'Bravo': crearListaSabana(`
B101
B102
B103
B104
B105|10/09/2024
B106
B107
B108
B109
B110
B111
B112
B113
B114
B115
B201
B202
B203|27/10/2024
B204
B205
B206
B207
B208
B209
B210
B211
B212
B213
B214
B215
B301
B302
B303
B304
B305
B306
B307
B308
B309
B310
B311
B312
B313
B314
B315
B401
B402
B403
B404
B405
B406
B407
B408
B409
B410
B411
B412
B413
B414
B415
    `),
    'Charly': crearListaSabana(`
C101
C102
C103
C104
C105
C106
C107
C108
C109
C110
C111
C112|11/12/2024
C113
C201
C202
C203
C204
C205
C206
C207
C208
C209
C210
C211
C212
C213
C214
C301
C302
C303
C304
C305
C306
C307
C308
C309
C310
C311
C312
C313
C314
C401
C402
C403
C404
C405
C406
C407
C408
C409
C410
C411
C412
C413
C414
    `),
    'Eco': crearListaSabana(`
E101
E102
E103
E104
E105
E106
E107
E108
E109
E110|22/07/2024
E111
E112
E201
E202
E203
E204
E205
E206
E207
E208
E209
E210
E211
E212
E301
E302
E303
E304
E305
E306
E307|25/07/2024
E308
E309
E310
E311
E312
E401
E402
E403
E404
E405
E406
E407
E408
E409
E410
E411
E412
    `),
    'Fox': crearListaSabana(`
F101
F102|12/11/2024
F103|16/12/2024
F104
F105
F106|19/12/2024
F107|05/10/2024
F108
F109
F110
F111
F112
F113|29/10/2024
S-F114
F201
F202
F203
F204
F205
F206
F207
F208
F209
F210
F211|23/11/2024
F212
F213
S-F214
F301
F302
F303
F304
F305
F306
F307
F308
F309
F310
F311
F312
F313
F314
F401
F402
F403
F404
F405
F406
F407
F408
    `),
    'Casa Maat': crearListaSabana(`
G101|12/06/2024
G102|20/07/2024
G103|13/06/2024
G104|13/06/2024
G105|05/07/2024
G106|05/07/2024
G107|25/07/2024
G108|24/07/2024
G109|24/07/2024
G110|17/06/2024
S-G111|27/08/2024
G201|10/10/2024
G202|14/08/2024
G203|16/08/2024
G204|16/08/2024
G205|08/11/2024
G206|12/09/2024
G207|08/11/2024
G208|08/11/2024
G209
G210|16/01/2025
G211|23/01/2025
G212
S-G213|02/08/2024
G301|03/02/2025
G302|22/02/2025
G303|04/09/2024
G304|03/09/2024
G305|04/09/2024
G306|03/09/2024
G307|09/09/2024
G308|09/09/2024
G309|09/09/2024
G310|09/09/2024
G311|09/09/2024
G312|09/09/2024
G313|09/09/2024
G314|09/09/2024
G401|18/08/2024
G402|18/08/2024
G403|04/09/2024
G404|15/08/2024
G405|08/08/2024
G406|16/08/2024
G407|15/08/2024
G408|01/11/2024
G409|01/11/2024
G410|01/11/2024
G411|01/11/2024
G412|01/11/2024
G501
G502
G503
G504
G505|03/12/2024
G506
    `)
};

const SABANA_EXPECTED_TOTAL = Object.values(SABANA_SOURCE).reduce((total, lista) => total + lista.length, 0);

function buildSabanaDataset(tipo = 'cambio_filtros') {
    const dataset = [];
    Object.entries(SABANA_SOURCE).forEach(([edificio, lista]) => {
        const responsableBase = SABANA_RESPONSABLES[edificio] || 'Equipo de Mantenimiento';
        lista.forEach(item => {
            const registroId = `${tipo}-${edificio}-${item.habitacion.replace(/\s+/g, '_')}`;
            dataset.push({
                id: registroId,
                edificio,
                habitacion: item.habitacion,
                fechaProgramada: item.fechaProgramada || '',
                fechaRealizada: item.fechaRealizada || item.fechaProgramada || '',
                responsable: item.responsable || responsableBase,
                observaciones: item.observaciones || (item.fechaProgramada ? `Último MP registrado el ${item.fechaProgramada}` : `Pendiente de ${getSabanaTipoLabel(tipo).toLowerCase()}`),
                realizado: false
            });
        });
    });
    return dataset;
}

function crearSabanaBase({ id, titulo, tipo, descripcion = '' }) {
    return {
        id,
        titulo,
        tipo,
        descripcion: descripcion || getSabanaTipoLabel(tipo),
        totalHabitaciones: SABANA_EXPECTED_TOTAL,
        registros: buildSabanaDataset(tipo),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estado: 'activa'
    };
}

function getStoredSabanas() {
    const stored = localStorage.getItem(SABANA_STORAGE_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('❌ Error leyendo colección de sábana:', error);
        return [];
    }
}

function saveSabanas(data) {
    localStorage.setItem(SABANA_STORAGE_KEY, JSON.stringify(data));
}

function ensureSabanasCollection() {
    let coleccion = getStoredSabanas();
    if (!coleccion.length) {
        coleccion = [crearSabanaBase({ id: 'sabana-filtros', titulo: 'Cambio de Filtros de Aire', tipo: 'cambio_filtros' })];
        saveSabanas(coleccion);
    }
    AppState.sabanaCollections = coleccion;
    if (!AppState.sabanaSeleccionadaId) {
        AppState.sabanaSeleccionadaId = coleccion[0].id;
    }
    AppState.sabanaData = getSelectedSabana()?.registros || [];
    return coleccion;
}

function getSelectedSabana() {
    return AppState.sabanaCollections.find(s => s.id === AppState.sabanaSeleccionadaId);
}

function setSabanaSeleccionada(id) {
    AppState.sabanaSeleccionadaId = id;
    const select = document.getElementById('sabanaTipoSelect');
    if (select && select.value !== id) {
        select.value = id;
    }
    AppState.sabanaFilters.edificio = '';
    renderSabanaChips();
    applySabanaFilters(true);
}

function actualizarRegistroSabana(registroId, cambios) {
    const coleccion = ensureSabanasCollection();
    const sabana = getSelectedSabana();
    if (!sabana) return;
    const registro = sabana.registros.find(r => r.id === registroId);
    if (!registro) return;
    Object.assign(registro, cambios);
    sabana.updatedAt = new Date().toISOString();
    saveSabanas(coleccion);
    AppState.sabanaData = sabana.registros;
}

function applySabanaFilters(shouldRender = true) {
    const sabana = getSelectedSabana();
    if (!sabana) {
        renderSabanaTable([]);
        return [];
    }
    AppState.sabanaData = sabana.registros;
    const searchTerm = (AppState.sabanaFilters.search || '').toLowerCase();
    const edificioFiltro = AppState.sabanaFilters.edificio;
    const estadoFiltro = AppState.sabanaFilters.estado;
    const filtered = sabana.registros.filter(row => {
        const matchesBuilding = !edificioFiltro || row.edificio === edificioFiltro;
        const matchesEstado = !estadoFiltro || (estadoFiltro === 'realizados' ? row.realizado : !row.realizado);
        const matchesSearch = !searchTerm ||
            row.habitacion.toLowerCase().includes(searchTerm) ||
            row.edificio.toLowerCase().includes(searchTerm) ||
            row.responsable.toLowerCase().includes(searchTerm) ||
            row.observaciones.toLowerCase().includes(searchTerm);
        return matchesBuilding && matchesEstado && matchesSearch;
    });
    if (shouldRender) {
        renderSabanaTable(filtered);
    }
    return filtered;
}

function renderSabanaChips() {
    const container = document.getElementById('sabanaChips');
    if (!container) return;
    const edificios = ['', ...Object.keys(SABANA_SOURCE)];
    container.innerHTML = edificios.map((nombre, index) => {
        const id = `sabana-chip-${nombre ? nombre.toLowerCase().replace(/\s+/g, '-') : 'todos'}`;
        const label = nombre || 'Todos';
        const checked = AppState.sabanaFilters.edificio === nombre ? 'checked' : '';
        return `
            <input type="radio" class="sabana-chip-input" name="sabanaEdificioChip" id="${id}" value="${nombre}" ${index === 0 && !AppState.sabanaFilters.edificio ? 'checked' : checked}>
            <label class="sabana-chip-label" for="${id}"><span>${label}</span></label>
        `;
    }).join('');
    container.querySelectorAll('input[name="sabanaEdificioChip"]').forEach(input => {
        input.addEventListener('change', (e) => {
            filterSabanaByBuilding(e.target.value);
        });
    });
}

function renderSabanaTipoSelect() {
    const select = document.getElementById('sabanaTipoSelect');
    if (!select) return;
    ensureSabanasCollection();
    select.innerHTML = AppState.sabanaCollections.map(sabana => `
        <option value="${sabana.id}">${sabana.titulo}</option>
    `).join('');
    select.value = AppState.sabanaSeleccionadaId;
}

function loadSabanaData() {
    console.log('📋 Cargando datos de sábana...');
    const tbody = document.getElementById('sabanaTableBody');
    if (!tbody) return;

    ensureSabanasCollection();
    const buscarInput = document.getElementById('buscarSabana');
    if (buscarInput && buscarInput.value !== AppState.sabanaFilters.search) {
        buscarInput.value = AppState.sabanaFilters.search;
    }
    renderSabanaTipoSelect();
    const estadoSelect = document.getElementById('sabanaEstadoSelect');
    if (estadoSelect && estadoSelect.value !== AppState.sabanaFilters.estado) {
        estadoSelect.value = AppState.sabanaFilters.estado || '';
    }
    renderSabanaChips();
    applySabanaFilters(true);
}

function renderSabanaTable(data) {
    const tbody = document.getElementById('sabanaTableBody');
    if (!tbody) return;

    if (!data.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="mensaje-cargando">Sin registros para los filtros actuales.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Edificio">
                <span class="sabana-edificio-pill"><i class="fas fa-hotel"></i>${row.edificio}</span>
            </td>
            <td data-label="Habitación">${row.habitacion}</td>
            <td data-label="Fecha Programada">${row.fechaProgramada || 'Pendiente'}</td>
            <td data-label="Fecha Realizada">${row.fechaRealizada || '—'}</td>
            <td data-label="Responsable">${row.responsable}</td>
            <td data-label="Observaciones">${row.observaciones}</td>
            <td data-label="Realizado">
                <input 
                    type="checkbox" 
                    class="checkbox-sabana" 
                    ${row.realizado ? 'checked' : ''}
                    onchange="toggleCambioRealizado('${row.id}')"
                >
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleCambioRealizado(registroId) {
    const sabana = getSelectedSabana();
    if (!sabana) return;
    const registro = sabana.registros.find(item => item.id === registroId);
    if (!registro) return;
    actualizarRegistroSabana(registroId, { realizado: !registro.realizado });
    applySabanaFilters(true);
    console.log(`✅ ${registro.realizado ? 'Marcado' : 'Desmarcado'} el cambio de ${registro.habitacion}`);
}

function filterSabana(searchTerm = '') {
    AppState.sabanaFilters.search = searchTerm.trim();
    applySabanaFilters(true);
}

function filterSabanaByBuilding(edificioNombre = '') {
    AppState.sabanaFilters.edificio = edificioNombre;
    applySabanaFilters(true);
}

function filterSabanaByEstado(estadoValor = '') {
    AppState.sabanaFilters.estado = estadoValor;
    applySabanaFilters(true);
}

function exportarSabanaExcel() {
    if (AppState.currentUser.role !== 'admin') {
        alert('Solo los administradores pueden exportar datos');
        return;
    }

    // Mostrar spinner
    document.getElementById('downloadSpinner').style.display = 'flex';

    setTimeout(() => {
        const sabana = getSelectedSabana();
        if (!sabana) {
            alert('No hay sábana seleccionada');
            document.getElementById('downloadSpinner').style.display = 'none';
            return;
        }

        const registros = sabana.registros;
        let csv = 'Edificio,Habitación,Fecha Programada,Fecha Realizada,Responsable,Observaciones,Realizado\n';
        registros.forEach(row => {
            csv += `${row.edificio},${row.habitacion},${row.fechaProgramada || 'Pendiente'},${row.fechaRealizada || '—'},${row.responsable},${row.observaciones},${row.realizado ? 'Sí' : 'No'}\n`;
        });

        // Descargar archivo
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sabana_filtros_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        document.getElementById('downloadSpinner').style.display = 'none';
        alert('Sábana exportada exitosamente');
    }, 1500);
}

function calcularProgresoSabana(sabana) {
    const total = sabana?.registros?.length || 0;
    const realizados = sabana ? sabana.registros.filter(r => r.realizado).length : 0;
    const porcentaje = total ? Math.round((realizados / total) * 100) : 0;
    return { total, realizados, porcentaje };
}

function openHistorialSabanaModal() {
    ensureSabanasCollection();
    renderHistorialSabanaModal();
    const modal = document.getElementById('modalHistorialSabana');
    if (modal) {
        modal.style.display = 'flex';
        lockBodyScrollChecklist();
    }
}

function closeHistorialSabanaModal() {
    const modal = document.getElementById('modalHistorialSabana');
    if (modal) {
        modal.style.display = 'none';
        unlockBodyScrollChecklist();
    }
}

function renderHistorialSabanaModal() {
    const list = document.getElementById('historialSabanaList');
    if (!list) return;
    const coleccion = ensureSabanasCollection();
    if (!coleccion.length) {
        list.innerHTML = '<p style="text-align:center; padding:1rem;">No hay sábanas registradas.</p>';
        return;
    }

    list.innerHTML = '';
    coleccion.forEach(sabana => {
        const progreso = calcularProgresoSabana(sabana);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'historial-sabana-item';
        button.innerHTML = `
            <div class="historial-sabana-header">
                <span>${sabana.titulo}</span>
                <small>${getSabanaTipoLabel(sabana.tipo)}</small>
            </div>
            <div class="historial-sabana-progress">
                <span>${progreso.realizados}/${progreso.total}</span>
                <span>${progreso.porcentaje}%</span>
            </div>
            <small>
                Creado: ${new Date(sabana.createdAt).toLocaleString('es-MX')}<br>
                ${sabana.estado === 'archivada' ? `Archivado: ${new Date(sabana.archivadoAt).toLocaleString('es-MX')}` : ''}
            </small>
        `;
        button.addEventListener('click', () => seleccionarSabanaDesdeHistorial(sabana.id));
        list.appendChild(button);
    });
}

function seleccionarSabanaDesdeHistorial(id) {
    setSabanaSeleccionada(id);
    closeHistorialSabanaModal();
}

function openCrearSabanaModal() {
    ensureSabanasCollection();
    const modal = document.getElementById('modalCrearSabana');
    const select = document.getElementById('sabanaTipoNuevo');
    if (select) {
        select.innerHTML = '<option value="">Selecciona un tipo</option>' +
            SABANA_TIPOS.map(tipo => `<option value="${tipo.value}">${tipo.label}</option>`).join('');
    }
    const form = document.getElementById('formCrearSabana');
    if (form) {
        form.reset();
    }
    if (modal) {
        modal.style.display = 'flex';
        lockBodyScrollChecklist();
    }
}

function closeCrearSabanaModal() {
    const modal = document.getElementById('modalCrearSabana');
    if (modal) {
        modal.style.display = 'none';
        unlockBodyScrollChecklist();
    }
}

function handleCrearSabanaSubmit(event) {
    event.preventDefault();
    const titulo = document.getElementById('sabanaNombreInput')?.value.trim();
    const tipo = document.getElementById('sabanaTipoNuevo')?.value;
    const descripcion = document.getElementById('sabanaDescripcionInput')?.value.trim();
    if (!titulo || !tipo) {
        alert('Completa el nombre y el tipo de la sábana');
        return;
    }

    const nuevaSabana = crearSabanaBase({
        id: `sabana-${Date.now()}`,
        titulo,
        tipo,
        descripcion
    });

    AppState.sabanaCollections.push(nuevaSabana);
    saveSabanas(AppState.sabanaCollections);
    AppState.sabanaSeleccionadaId = nuevaSabana.id;
    renderSabanaTipoSelect();
    closeCrearSabanaModal();
    applySabanaFilters(true);
    alert('Nueva sábana creada');
}

// ========================================
// CHECKLIST - INSPECCIONES
// ========================================

// NOTA: Las siguientes funciones legacy se mantienen comentadas para referencia.
// La funcionalidad de checklist ahora usa la API de PostgreSQL (ChecklistAPI)
// Ver: js/checklist-api.js y api/index.js (rutas /api/checklist/*)

async function loadChecklistData() {
    console.log('📋 ========================================');
    console.log('📋 INICIANDO CARGA DE CHECKLIST DESDE API');
    console.log('📋 ========================================');
    console.log('📋 Timestamp:', new Date().toISOString());
    console.log('📋 ChecklistAPI disponible:', typeof ChecklistAPI !== 'undefined');

    const grid = document.getElementById('checklistGrid');
    if (!grid) {
        console.warn('⚠️ checklistGrid no encontrado en el DOM');
        return;
    }

    // Mostrar indicador de carga
    grid.innerHTML = '<div class="mensaje-cargando"><i class="fas fa-spinner fa-spin"></i> Cargando checklist desde BD...</div>';

    try {
        // Cargar categorías desde la API
        console.log('📋 [PASO 1] Cargando categorías...');
        await loadChecklistCategoriasFromAPI();
        console.log('📋 [PASO 1] Categorías cargadas:', AppState.checklistCategorias);
        
        // Cargar datos de checklist desde la API
        console.log('📋 [PASO 2] Llamando ChecklistAPI.getAllChecklistData()...');
        const checklistData = await ChecklistAPI.getAllChecklistData();
        
        console.log('📋 [PASO 2] Respuesta recibida:');
        console.log('   - Tipo:', typeof checklistData);
        console.log('   - Es array:', Array.isArray(checklistData));
        console.log('   - Cantidad de cuartos:', checklistData?.length || 0);
        
        if (checklistData.length > 0) {
            console.log('📋 [PASO 2] Primer cuarto de ejemplo:', JSON.stringify(checklistData[0], null, 2));
        }
        
        // Actualizar AppState
        AppState.checklistFiltradas = Array.isArray(checklistData) ? checklistData : [];
        console.log('📋 [PASO 3] AppState.checklistFiltradas actualizado:', AppState.checklistFiltradas.length, 'cuartos');
        
        // También guardar en localStorage como cache para modo offline
        localStorage.setItem('checklistData', JSON.stringify(AppState.checklistFiltradas));
        
        // Poblar filtro de edificios con datos reales
        poblarFiltroEdificiosChecklist();
        
        renderChecklistCategorias();
        loadInspeccionesRecientes();
        renderChecklistGrid(AppState.checklistFiltradas);
        
    } catch (error) {
        console.error('❌ Error cargando checklist desde API:', error);
        
        // Fallback: intentar cargar desde localStorage
        console.log('🔄 Intentando cargar desde cache local...');
        const storedData = localStorage.getItem('checklistData');
        
        if (storedData) {
            try {
                const checklistData = JSON.parse(storedData);
                AppState.checklistFiltradas = Array.isArray(checklistData) ? checklistData : [];
                renderChecklistCategorias();
                loadInspeccionesRecientes();
                renderChecklistGrid(AppState.checklistFiltradas);
                showNotification('⚠️ Usando datos en cache (sin conexión)', 'warning');
            } catch (parseError) {
                console.error('❌ Error parseando cache local:', parseError);
                grid.innerHTML = '<div class="mensaje-cargando">❌ Error al cargar datos de checklist</div>';
            }
        } else {
            grid.innerHTML = '<div class="mensaje-cargando">❌ No hay datos disponibles</div>';
        }
    }
}

/**
 * Cargar categorías desde la API
 */
async function loadChecklistCategoriasFromAPI() {
    console.log('   🏷️ [loadChecklistCategoriasFromAPI] Iniciando...');
    try {
        console.log('   🏷️ Llamando ChecklistAPI.getCategorias()...');
        const categorias = await ChecklistAPI.getCategorias();
        
        console.log('   🏷️ Respuesta de categorías:');
        console.log('      - Tipo:', typeof categorias);
        console.log('      - Es array:', Array.isArray(categorias));
        console.log('      - Cantidad:', categorias?.length || 0);
        console.log('      - Datos:', JSON.stringify(categorias, null, 2));
        
        // Actualizar AppState con las categorías de la BD
        AppState.checklistCategorias = categorias.map(cat => ({
            id: cat.slug || cat.id.toString(),
            db_id: cat.id,
            nombre: cat.nombre,
            icono: cat.icono || 'fa-layer-group',
            orden: cat.orden
        }));
        
        console.log('   🏷️ ✅ Categorías mapeadas a AppState:', AppState.checklistCategorias.length);
        console.log('   🏷️ Categorías en AppState:', AppState.checklistCategorias);
        
    } catch (error) {
        console.error('   🏷️ ❌ Error cargando categorías desde API:', error);
        console.error('   🏷️ Stack:', error.stack);
        // Mantener categorías por defecto si falla la API
    }
}

/**
 * Cargar ítems del catálogo desde la API
 */
async function loadChecklistItemsFromAPI() {
    try {
        const items = await ChecklistAPI.getCatalogItems();
        
        // Actualizar AppState con los ítems de la BD
        AppState.checklistItems = items.map(item => ({
            id: item.id,
            nombre: item.nombre,
            categoria: item.categoria_slug,
            categoria_id: item.categoria_id,
            orden: item.orden
        }));
        
        console.log(`✅ Ítems del catálogo cargados: ${AppState.checklistItems.length}`);
        
    } catch (error) {
        console.warn('⚠️ Error cargando ítems desde API, usando valores por defecto:', error);
    }
}


function renderChecklistGrid(data) {
    const grid = document.getElementById('checklistGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!data || data.length === 0) {
        grid.innerHTML = '<div class="mensaje-cargando">No hay habitaciones para mostrar</div>';
        return;
    }

    // Aplicar paginación
    const { page, perPage } = AppState.checklistPagination;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedData = data.slice(start, end);

    paginatedData.forEach(habitacion => {
        const card = document.createElement('div');
        card.className = 'checklist-card';
        card.setAttribute('data-habitacion', habitacion.numero);
        card.setAttribute('data-cuarto-id', habitacion.cuarto_id);

        const counts = CHECKLIST_ESTADOS.reduce((acc, estado) => {
            acc[estado] = 0;
            return acc;
        }, {});

        habitacion.items.forEach(item => {
            if (counts[item.estado] !== undefined) {
                counts[item.estado] += 1;
            }
        });

        const numero = sanitizeText(habitacion.numero);
        const edificioNombre = sanitizeText(habitacion.edificio || habitacion.edificio_nombre || '');
        const edificioLabel = edificioNombre || 'Sin edificio';
        const totalItems = habitacion.items.length;

        // Obtener estado de la habitación (disponible por defecto si no existe)
        const estadoHabitacion = habitacion.estado_cuarto || habitacion.estado || 'disponible';
        const estadoConfig = {
            'disponible': { label: 'Disponible', icon: 'fa-circle-check', class: 'estado-disponible' },
            'ocupado': { label: 'Ocupada', icon: 'fa-user', class: 'estado-ocupado' },
            'mantenimiento': { label: 'Mantenimiento', icon: 'fa-wrench', class: 'estado-mantenimiento' },
            'fuera-servicio': { label: 'Fuera de Servicio', icon: 'fa-ban', class: 'estado-fuera-servicio' }
        };
        const estadoInfo = estadoConfig[estadoHabitacion] || estadoConfig['disponible'];

        const itemsHTML = habitacion.items.map((item, itemIndex) => buildChecklistItemHTML(habitacion, item, itemIndex)).join('');
        const statsHTML = CHECKLIST_ESTADOS.map(estado => `
            <div class="checklist-card-stat ${estado}" data-estado="${estado}">
                <div class="checklist-card-stat-label">
                    <span class="semaforo-dot" aria-hidden="true"></span>
                    <span>${CHECKLIST_ESTADO_LABELS[estado]}</span>
                </div>
                <span class="checklist-card-stat-value">${counts[estado]}</span>
            </div>
        `).join('');

        // Obtener información del último editor
        const ultimoEditor = habitacion.ultimo_editor || null;

        card.innerHTML = `
            <div class="checklist-card-header">
                <div class="checklist-header-top">
                    <div class="checklist-room-title">
                        <span class="checklist-room-number">${numero}</span>
                        <span class="checklist-estado-badge ${estadoInfo.class}">
                            <i class="fas ${estadoInfo.icon}"></i>
                            <span>${estadoInfo.label}</span>
                        </span>
                    </div>
                    <div class="checklist-header-actions">
                        <button class="checklist-action-btn" title="Ver detalles y exportar">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
                <div class="checklist-header-bottom">
                    <div class="checklist-meta-group">
                        <span class="checklist-meta-item">
                            <i class="fas fa-building"></i>
                            <span>${edificioLabel}</span>
                        </span>
                        <span class="checklist-meta-divider"></span>
                        <span class="checklist-meta-item">
                            <i class="fas fa-clipboard-list"></i>
                            <span>${totalItems} ítems</span>
                        </span>
                        ${ultimoEditor ? `
                        <span class="checklist-meta-divider"></span>
                        <span class="checklist-meta-item checklist-editor-tag">
                            <i class="fas fa-user-edit"></i>
                            <span>${ultimoEditor}</span>
                        </span>` : ''}
                    </div>
                </div>
            </div>
            <div class="checklist-card-search">
                <i class="fas fa-search"></i>
                <input 
                    type="text" 
                    class="checklist-search-input" 
                    placeholder="Buscar en esta habitación..." 
                    data-card-id="${habitacion.cuarto_id}"
                >
                <button class="checklist-search-clear" style="display: none;" title="Limpiar búsqueda">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="checklist-card-stats">
                ${statsHTML}
            </div>
            <div class="checklist-items" role="list">
                ${itemsHTML}
            </div>
        `;

        grid.appendChild(card);

        // Configurar búsqueda dentro de la card
        const searchInput = card.querySelector('.checklist-search-input');
        const clearBtn = card.querySelector('.checklist-search-clear');
        const itemsContainer = card.querySelector('.checklist-items');

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const items = itemsContainer.querySelectorAll('.checklist-item');

            clearBtn.style.display = searchTerm ? 'flex' : 'none';

            items.forEach(item => {
                const itemName = item.getAttribute('data-item') || '';
                if (itemName.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            const items = itemsContainer.querySelectorAll('.checklist-item');
            items.forEach(item => item.style.display = '');
            searchInput.focus();
        });

        // Configurar botón de acción (tres puntos)
        const actionBtn = card.querySelector('.checklist-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                openChecklistDetailsModal(habitacion.cuarto_id);
            });
        }
    });
}

function buildChecklistItemHTML(habitacion, item, itemIndex) {
    const rawNombre = item.nombre || '';
    const safeNombre = sanitizeText(rawNombre);
    const dataNombre = sanitizeText(rawNombre.toLowerCase());
    // Usar el ID del ítem de la BD para identificación única
    const itemId = item.id || itemIndex;
    const groupName = `estado_${habitacion.cuarto_id}_${itemId}`;
    const optionsHTML = CHECKLIST_ESTADOS.map(estado => `
        <label class="checklist-semaforo-option ${estado}">
            <input 
                type="radio" 
                name="${groupName}"
                class="estado-radio"
                value="${estado}"
                ${item.estado === estado ? 'checked' : ''}
                onchange="updateChecklistEstado(${habitacion.cuarto_id}, ${itemId}, '${estado}')"
            >
            <span class="semaforo-visual">
                <span class="semaforo-dot" aria-hidden="true"></span>
                <span class="semaforo-text">${CHECKLIST_ESTADO_LABELS[estado]}</span>
            </span>
        </label>
    `).join('');

    return `
        <div class="checklist-item" data-item="${dataNombre}" data-item-id="${itemId}">
            <div class="checklist-item-left">
                <span class="checklist-item-name">${safeNombre}</span>
            </div>
            <div class="checklist-item-right">
                <div class="checklist-semaforo-group" role="radiogroup" aria-label="Estado para ${safeNombre}">
                    ${optionsHTML}
                </div>
            </div>
        </div>
    `;
}

function loadInspeccionesRecientes() {
    const lista = document.getElementById('listaInspeccionesRecientes');
    if (!lista) return;

    if (!Array.isArray(AppState.inspeccionesRecientes) || AppState.inspeccionesRecientes.length === 0) {
        const stored = localStorage.getItem('inspeccionesRecientes');
        if (stored) {
            try {
                AppState.inspeccionesRecientes = JSON.parse(stored);
            } catch (error) {
                console.warn('⚠️ No se pudieron parsear las inspecciones almacenadas.', error);
                AppState.inspeccionesRecientes = DEFAULT_INSPECCIONES_RECIENTES;
            }
        } else {
            AppState.inspeccionesRecientes = DEFAULT_INSPECCIONES_RECIENTES;
        }
    }

    renderInspeccionesRecientes(AppState.inspeccionesRecientes);
}

function renderInspeccionesRecientes(data) {
    const lista = document.getElementById('listaInspeccionesRecientes');
    if (!lista) return;
    const emptyMessage = document.getElementById('sinResultadosInspecciones');

    lista.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
        if (emptyMessage) {
            emptyMessage.style.display = 'flex';
            const emptyText = emptyMessage.querySelector('p');
            const baseTieneDatos = (AppState.inspeccionesRecientes || []).length > 0;
            if (emptyText) {
                emptyText.textContent = baseTieneDatos ? 'Sin coincidencias para la búsqueda.' : 'No hay inspecciones registradas.';
            }
        }
        return;
    }

    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }

    data.forEach((inspeccion) => {
        const li = document.createElement('li');
        li.className = 'alerta-espacio-item resumen-tarea-item-mejorado inspeccion-item';
        li.dataset.inspeccionItem = '';
        li.dataset.estado = inspeccion.estado;
        li.dataset.search = `${inspeccion.habitacion} ${inspeccion.titulo} ${inspeccion.tecnico} ${inspeccion.estado}`.toLowerCase();

        const safeHabitacion = sanitizeText(inspeccion.habitacion);
        const safeTitulo = sanitizeText(inspeccion.titulo);
        const safeTecnico = sanitizeText(inspeccion.tecnico);
        const safeFecha = sanitizeText(inspeccion.fecha);

        li.innerHTML = `
            <div class="inspeccion-habitacion">
                <i class="fas fa-bed"></i>
                <span class="inspeccion-numero">${safeHabitacion}</span>
            </div>
            <div class="inspeccion-titulo">${safeTitulo}</div>
            <div class="inspeccion-footer">
                <span class="inspeccion-tecnico"><i class="fas fa-user"></i> ${safeTecnico}</span>
                <span class="inspeccion-fecha"><i class="fas fa-calendar"></i> ${safeFecha}</span>
            </div>
            <div class="inspeccion-estado estado-${inspeccion.estado}">${getInspeccionEstadoLabel(inspeccion.estado)}</div>
        `;

        lista.appendChild(li);
    });
}

function filterInspeccionesRecientes(query) {
    const term = (query || '').trim().toLowerCase();
    const base = AppState.inspeccionesRecientes || [];

    if (!term) {
        renderInspeccionesRecientes(base);
        return;
    }

    const filtradas = base.filter((inspeccion) => {
        const texto = `${inspeccion.habitacion} ${inspeccion.titulo} ${inspeccion.tecnico} ${inspeccion.estado}`.toLowerCase();
        return texto.includes(term);
    });

    renderInspeccionesRecientes(filtradas);
}

function getInspeccionEstadoLabel(estado) {
    // Retornamos vacío para solo mostrar el semáforo de color
    return '';
}

async function updateChecklistEstado(cuartoId, itemId, nuevoEstado) {
    console.log(`📝 Actualizando estado: cuarto=${cuartoId}, item=${itemId}, estado=${nuevoEstado}`);
    
    // Obtener el nombre del usuario actual
    const usuarioNombre = AppState.currentUser?.nombre || AppState.currentUser?.name || 'Usuario';
    
    try {
        // Llamar a la API para actualizar
        const resultado = await ChecklistAPI.updateItemEstado(cuartoId, itemId, nuevoEstado);
        console.log('✅ Estado actualizado en BD:', resultado);
        
        // Actualizar el cache local (AppState.checklistFiltradas)
        const habitacion = AppState.checklistFiltradas.find(h => h.cuarto_id === cuartoId);
        
        if (habitacion) {
            // Buscar el ítem por ID y actualizar su estado
            const item = habitacion.items.find(i => i.id === itemId);
            if (item) {
                const estadoAnterior = item.estado;
                item.estado = nuevoEstado;
                console.log(`📋 Ítem actualizado: ${item.nombre} (${estadoAnterior} -> ${nuevoEstado})`);
            }

            // Actualizar información del usuario que editó
            habitacion.ultimo_editor = usuarioNombre;
            habitacion.fecha_ultima_edicion = new Date().toISOString();

            // Actualizar también en localStorage
            const checklistData = JSON.parse(localStorage.getItem('checklistData') || '[]');
            const habStorage = checklistData.find(h => h.cuarto_id === cuartoId);
            if (habStorage) {
                const itemStorage = habStorage.items.find(i => i.id === itemId);
                if (itemStorage) {
                    itemStorage.estado = nuevoEstado;
                }
                habStorage.ultimo_editor = usuarioNombre;
                habStorage.fecha_ultima_edicion = new Date().toISOString();
                localStorage.setItem('checklistData', JSON.stringify(checklistData));
            }

            // Actualizar SOLO la card específica (no recargar todas)
            updateChecklistCardSummary(habitacion);
            updateChecklistEditorInfo(habitacion);
        }
        
        showNotification(`✅ Estado actualizado por ${usuarioNombre}`, 'success');
        
    } catch (error) {
        console.error('❌ Error actualizando estado:', error);
        showNotification('❌ Error al guardar cambio', 'error');
        
        // Revertir el cambio visual
        const radio = document.querySelector(`input[name="estado_${cuartoId}_${itemId}"][value="${nuevoEstado}"]`);
        if (radio) {
            radio.checked = false;
        }
    }
}

function updateChecklistCardSummary(habitacion) {
    const card = document.querySelector(`.checklist-card[data-cuarto-id="${habitacion.cuarto_id}"]`);
    if (!card) {
        console.warn(`⚠️ No se encontró card para cuarto_id: ${habitacion.cuarto_id}`);
        return;
    }

    // Recalcular contadores desde los datos actuales
    const counts = { bueno: 0, regular: 0, malo: 0 };

    habitacion.items.forEach(item => {
        const estado = item.estado || 'bueno';
        if (counts.hasOwnProperty(estado)) {
            counts[estado] += 1;
        }
    });

    console.log(`📊 Actualizando contadores para hab ${habitacion.numero}:`, counts);

    // Actualizar cada contador en la UI
    CHECKLIST_ESTADOS.forEach(estado => {
        const statEl = card.querySelector(`.checklist-card-stat[data-estado="${estado}"]`);
        if (statEl) {
            const valueEl = statEl.querySelector('.checklist-card-stat-value');
            if (valueEl) {
                const nuevoValor = counts[estado] || 0;
                valueEl.textContent = nuevoValor;
                
                // Agregar animación de actualización
                valueEl.classList.add('stat-updated');
                setTimeout(() => valueEl.classList.remove('stat-updated'), 300);
            }
        }
    });
}

function updateChecklistEditorInfo(habitacion) {
    const card = document.querySelector(`.checklist-card[data-cuarto-id="${habitacion.cuarto_id}"]`);
    if (!card) return;

    const metaGroup = card.querySelector('.checklist-meta-group');
    if (!metaGroup) return;

    // Buscar si ya existe el editor tag
    let editorTag = metaGroup.querySelector('.checklist-editor-tag');
    let divider = editorTag?.previousElementSibling;

    const nombreEditor = habitacion.ultimo_editor || AppState.currentUser?.nombre || AppState.currentUser?.name;

    if (nombreEditor) {
        if (!editorTag) {
            // Crear el separador
            divider = document.createElement('span');
            divider.className = 'checklist-meta-divider';

            // Crear el tag del editor
            editorTag = document.createElement('span');
            editorTag.className = 'checklist-meta-item checklist-editor-tag';

            metaGroup.appendChild(divider);
            metaGroup.appendChild(editorTag);
        }

        // Actualizar el contenido con animación
        editorTag.innerHTML = `<i class="fas fa-user-edit"></i><span>${nombreEditor}</span>`;
        editorTag.classList.add('editor-updated');
        setTimeout(() => editorTag.classList.remove('editor-updated'), 500);
    }
}

// ========================================
// MODAL DE DETALLES Y EXPORTACIÓN
// ========================================

function openChecklistDetailsModal(cuartoId) {
    const checklistData = JSON.parse(localStorage.getItem('checklistData'));
    const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);

    if (!habitacion) {
        console.error('Habitación no encontrada');
        return;
    }

    // Crear modal si no existe
    let modal = document.getElementById('checklist-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'checklist-details-modal';
        modal.className = 'checklist-modal';
        document.body.appendChild(modal);
    }

    // Obtener historial de ediciones (agrupadas por item)
    const historialHTML = buildHistorialHTML(habitacion);

    // Obtener estadísticas
    const counts = CHECKLIST_ESTADOS.reduce((acc, estado) => {
        acc[estado] = habitacion.items.filter(item => item.estado === estado).length;
        return acc;
    }, {});

    const estadoHabitacion = habitacion.estado_cuarto || habitacion.estado || 'disponible';
    const estadoConfig = {
        'disponible': { label: 'Disponible', icon: 'fa-circle-check', class: 'estado-disponible' },
        'ocupado': { label: 'Ocupada', icon: 'fa-user', class: 'estado-ocupado' },
        'mantenimiento': { label: 'Mantenimiento', icon: 'fa-wrench', class: 'estado-mantenimiento' },
        'fuera-servicio': { label: 'Fuera de Servicio', icon: 'fa-ban', class: 'estado-fuera-servicio' }
    };
    const estadoInfo = estadoConfig[estadoHabitacion] || estadoConfig['disponible'];

    // Detectar si es móvil
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    // Helper para acordeón
    function accordionBlock(title, content, blockId, open = false) {
        return `
        <div class="accordion-block" id="${blockId}">
            <button class="accordion-toggle" aria-expanded="${open}" onclick="
                var c = document.querySelector('#${blockId} .accordion-content');
                var t = document.querySelector('#${blockId} .accordion-toggle');
                if (c.style.display === 'block') { c.style.display = 'none'; t.setAttribute('aria-expanded','false'); } else { c.style.display = 'block'; t.setAttribute('aria-expanded','true'); }">
                <span>${title}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="accordion-content" style="display:${open ? 'block' : 'none'};">${content}</div>
        </div>
        `;
    }
    // Bloques de contenido
    const infoBlock = `<div class="checklist-modal-info">${[
        `<div class="checklist-info-item"><i class="fas fa-building"></i><div class="info-content"><strong>Edificio</strong><span>${habitacion.edificio || habitacion.edificio_nombre || 'Sin edificio'}</span></div></div>`,
        `<div class="checklist-info-item"><i class="fas fa-clipboard-list"></i><div class="info-content"><strong>Total de ítems</strong><span>${habitacion.items.length} elementos registrados</span></div></div>`,
        `<div class="checklist-info-item"><i class="fas fa-user-edit"></i><div class="info-content"><strong>Último editor</strong><span>${habitacion.ultimo_editor || 'Sin ediciones'}</span></div></div>`,
        `<div class="checklist-info-item"><i class="fas fa-clock"></i><div class="info-content"><strong>Última actualización</strong><span>${habitacion.fecha_ultima_edicion ? formatDate(habitacion.fecha_ultima_edicion) : 'Sin fecha'}</span></div></div>`,
        `<div class="checklist-info-item"><i class="fas fa-calendar-plus"></i><div class="info-content"><strong>Fecha de creación</strong><span>${habitacion.fecha_creacion ? new Date(habitacion.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No registrada'}</span></div></div>`,
        `<div class="checklist-info-item"><i class="fas fa-hashtag"></i><div class="info-content"><strong>ID de habitación</strong><span>${habitacion.cuarto_id}</span></div></div>`
    ].join('')
        }</div>`;
    const statsBlock = `<div class="checklist-modal-stats"><h3>Resumen de Estados</h3><div class="checklist-stats-grid">${CHECKLIST_ESTADOS.map(estado => `
        <div class="checklist-stat-item ${estado}"><span class="semaforo-dot"></span><span class="stat-label">${CHECKLIST_ESTADO_LABELS[estado]}</span><span class="stat-value">${counts[estado]}</span></div>
    `).join('')}</div></div>`;
    const evidenciasBlock = `<div class="checklist-modal-evidencias"><h3>Evidencias Fotográficas</h3><div class="evidencias-upload-zone" onclick="document.getElementById('upload-evidencia-${cuartoId}').click()"><i class="fas fa-camera"></i><p><strong>Subir evidencia</strong><br>Click para seleccionar imágenes</p><input type="file" id="upload-evidencia-${cuartoId}" accept="image/*" multiple onchange="handleEvidenciaUpload(event, '${cuartoId}')"></div><div class="evidencias-grid" id="evidencias-grid-${cuartoId}">${buildEvidenciasHTML(habitacion)}</div></div>`;
    const historyBlock = `<div class="checklist-modal-history"><h3>Historial de Ediciones</h3><div class="checklist-history-list">${historialHTML}</div></div>`;
    // Botones exportar con estilo del sistema
    const exportBtns = `
        <button class="filtros-action-button excel btn-export btn-excel" data-cuarto-id="${cuartoId}">
            <i class="fas fa-file-excel"></i>
            <div><div style="font-weight:700;">Exportar Excel</div><div style="font-size:0.8rem;opacity:0.8;">Descargar checklist</div></div>
        </button>
        <button class="filtros-action-button pdf btn-export btn-pdf" data-cuarto-id="${cuartoId}">
            <i class="fas fa-file-pdf"></i>
            <div><div style="font-weight:700;">Exportar PDF</div><div style="font-size:0.8rem;opacity:0.8;">Descargar checklist</div></div>
        </button>
    `;
    modal.innerHTML = `
        <div class="modal-detalles-overlay"></div>
        <div class="modal-detalles-contenido checklist-details-content">
            <div class="modal-detalles-header">
                <div class="checklist-header-flex" style="width:100%;display:flex;flex-direction:column;">
                    <div class="checklist-room-title" style="width:100%;display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:0.75rem;margin-bottom:0.2rem;">
                        <span class="checklist-room-number" style="font-size:1.15rem;font-weight:900;">${habitacion.numero}</span>
                    </div>
                    <div class="checklist-header-bottom" style="width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:0.3rem;margin-top:0.1rem;">
                        <span class="checklist-meta-item" style="display:flex;align-items:center;gap:0.3rem;font-size:0.95rem;font-weight:600;color:var(--negro-carbon);background:none;border:none;padding:0;">
                            <i class="fas fa-building"></i> <span>${habitacion.edificio || habitacion.edificio_nombre || 'Sin edificio'}</span>
                        </span>
                        <span class="checklist-meta-item" style="display:flex;align-items:center;gap:0.3rem;font-size:0.95rem;font-weight:600;color:var(--negro-carbon);background:none;border:none;padding:0;">
                            <i class="fas fa-clipboard-list"></i> <span>${habitacion.items.length} ítems</span>
                        </span>
                        ${habitacion.ultimo_editor ? `<span class="checklist-meta-item checklist-editor-tag" style="display:flex;align-items:center;gap:0.3rem;font-size:0.95rem;font-weight:600;color:var(--verde-oliva);background:none;border:none;padding:0;"><i class=\"fas fa-user-edit\"></i> <span>${habitacion.ultimo_editor}</span></span>` : ''}
                    </div>
                </div>
                <button class="modal-detalles-cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-detalles-body checklist-details-body">
                ${isMobile
            ? [
                accordionBlock('Información', infoBlock, 'accordion-info', true),
                accordionBlock('Resumen de Estados', statsBlock, 'accordion-stats'),
                accordionBlock('Evidencias Fotográficas', evidenciasBlock, 'accordion-evidencias'),
                accordionBlock('Historial de Ediciones', historyBlock, 'accordion-history')
            ].join('')
            : [infoBlock, statsBlock, evidenciasBlock, historyBlock].join('')
        }
            </div>
            <div class="checklist-modal-footer" style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:flex-end;align-items:center;">
                ${exportBtns}
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.style.zIndex = '2000';
    lockBodyScrollChecklist();

    console.log('Modal abierto:', modal);

    // Agregar event listeners después de crear el HTML
    setTimeout(() => {
        const overlay = modal.querySelector('.modal-detalles-overlay');
        const closeBtn = modal.querySelector('.modal-detalles-cerrar');
        const excelBtn = modal.querySelector('.btn-excel');
        const pdfBtn = modal.querySelector('.btn-pdf');
        const footer = modal.querySelector('.checklist-modal-footer');

        console.log('Elementos encontrados:', { overlay, closeBtn, excelBtn, pdfBtn, footer });

        if (overlay) {
            overlay.addEventListener('click', closeChecklistDetailsModal);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeChecklistDetailsModal);
        }

        if (excelBtn) {
            excelBtn.addEventListener('click', () => {
                console.log('Exportando a Excel:', cuartoId);
                exportChecklistToExcel(cuartoId);
            });
        }

        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => {
                console.log('Exportando a PDF:', cuartoId);
                exportChecklistToPDF(cuartoId);
            });
        }
    }, 0);
}

function closeChecklistDetailsModal() {
    const modal = document.getElementById('checklist-details-modal');
    if (modal) {
        modal.style.display = 'none';
        unlockBodyScrollChecklist();
    }
}

function showNotification(message, type = 'info') {
    // Buscar contenedor de notificaciones o usar alert como fallback
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion(message, type);
    } else if (typeof toast === 'function') {
        toast(message);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Crear notificación simple
        const notif = document.createElement('div');
        notif.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--verde-oliva); color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideInRight 0.3s ease;';
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }
}

function buildHistorialHTML(habitacion) {
    if (!habitacion.items || habitacion.items.length === 0) {
        return '<p class="no-history">No hay elementos registrados</p>';
    }

    const itemsConEstado = habitacion.items.map((item, index) => ({
        ...item,
        index,
        editado: item.estado !== 'bueno' // Considerar editado si no está en estado bueno
    }));

    // Agrupar por estado
    const itemsPorEstado = {
        malo: itemsConEstado.filter(item => item.estado === 'malo'),
        regular: itemsConEstado.filter(item => item.estado === 'regular'),
        bueno: itemsConEstado.filter(item => item.estado === 'bueno')
    };

    let html = '';

    if (itemsPorEstado.malo.length > 0) {
        html += '<div class="history-group">';
        html += '<h4><span class="semaforo-dot malo"></span> En Mal Estado</h4>';
        html += '<ul>';
        itemsPorEstado.malo.forEach(item => {
            html += `<li class="history-item">
                <span class="item-name">${item.nombre}</span>
                ${habitacion.ultimo_editor ? `<span class="item-editor"><i class="fas fa-user"></i> ${habitacion.ultimo_editor}</span>` : ''}
            </li>`;
        });
        html += '</ul></div>';
    }

    if (itemsPorEstado.regular.length > 0) {
        html += '<div class="history-group">';
        html += '<h4><span class="semaforo-dot regular"></span> Estado Regular</h4>';
        html += '<ul>';
        itemsPorEstado.regular.forEach(item => {
            html += `<li class="history-item">
                <span class="item-name">${item.nombre}</span>
                ${habitacion.ultimo_editor ? `<span class="item-editor"><i class="fas fa-user"></i> ${habitacion.ultimo_editor}</span>` : ''}
            </li>`;
        });
        html += '</ul></div>';
    }

    if (itemsPorEstado.bueno.length > 0) {
        html += '<div class="history-group">';
        html += '<h4><span class="semaforo-dot bueno"></span> En Buen Estado</h4>';
        html += '<ul>';
        itemsPorEstado.bueno.forEach(item => {
            html += `<li class="history-item">
                <span class="item-name">${item.nombre}</span>
                ${habitacion.ultimo_editor ? `<span class="item-editor"><i class="fas fa-user"></i> ${habitacion.ultimo_editor}</span>` : ''}
            </li>`;
        });
        html += '</ul></div>';
    }

    return html || '<p class="no-history">No hay ediciones registradas</p>';
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Justo ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildEvidenciasHTML(habitacion) {
    const evidencias = habitacion.evidencias || [];

    if (evidencias.length === 0) {
        return '<div class="no-history" style="grid-column: 1 / -1;">No hay evidencias fotográficas</div>';
    }

    return evidencias.map((evidencia, index) => `
        <div class="evidencia-item" onclick="viewEvidencia('${habitacion.cuarto_id}', ${index})">
            ${evidencia.type === 'image' ?
            `<img src="${evidencia.url}" alt="Evidencia ${index + 1}">` :
            `<div class="evidencia-item-placeholder">
                    <i class="fas fa-file"></i>
                    <span>${evidencia.name}</span>
                </div>`
        }
            <div class="evidencia-overlay">
                <button class="btn-ver-evidencia" onclick="event.stopPropagation(); viewEvidencia('${habitacion.cuarto_id}', ${index})">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </div>
            ${evidencia.fecha ? `<div class="evidencia-fecha">${new Date(evidencia.fecha).toLocaleDateString('es-MX')}</div>` : ''}
        </div>
    `).join('');
}

function handleEvidenciaUpload(event, cuartoId) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const checklistData = JSON.parse(localStorage.getItem('checklistData'));
    const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);

    if (!habitacion) return;

    if (!habitacion.evidencias) {
        habitacion.evidencias = [];
    }

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            habitacion.evidencias.push({
                name: file.name,
                type: file.type.startsWith('image/') ? 'image' : 'file',
                url: e.target.result,
                fecha: new Date().toISOString(),
                uploadedBy: AppState.currentUser?.name || 'Usuario'
            });

            localStorage.setItem('checklistData', JSON.stringify(checklistData));

            // Actualizar grid de evidencias
            const grid = document.getElementById(`evidencias-grid-${cuartoId}`);
            if (grid) {
                grid.innerHTML = buildEvidenciasHTML(habitacion);
            }

            showNotification('✅ Evidencia agregada correctamente', 'success');
        };
        reader.readAsDataURL(file);
    });
}

function viewEvidencia(cuartoId, index) {
    const checklistData = JSON.parse(localStorage.getItem('checklistData'));
    const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);

    if (!habitacion || !habitacion.evidencias || !habitacion.evidencias[index]) return;

    const evidencia = habitacion.evidencias[index];

    // Crear modal de visualización
    let viewer = document.getElementById('evidencia-viewer-modal');
    if (!viewer) {
        viewer = document.createElement('div');
        viewer.id = 'evidencia-viewer-modal';
        viewer.className = 'evidencia-viewer-modal';
        document.body.appendChild(viewer);
    }

    viewer.innerHTML = `
        <div class="evidencia-viewer-content">
            <button class="evidencia-viewer-close" onclick="closeEvidenciaViewer()">
                <i class="fas fa-times"></i>
            </button>
            ${evidencia.type === 'image' ?
            `<img src="${evidencia.url}" alt="${evidencia.name}">` :
            `<div style="color: white; padding: 2rem;">Archivo no visualizable: ${evidencia.name}</div>`
        }
            <div class="evidencia-info">
                <p><strong>${evidencia.name}</strong></p>
                <p>Subido por ${evidencia.uploadedBy} • ${new Date(evidencia.fecha).toLocaleString('es-MX')}</p>
            </div>
        </div>
    `;

    viewer.style.display = 'flex';
    lockBodyScrollChecklist();

    // Cerrar al hacer click en el fondo
    viewer.onclick = (e) => {
        if (e.target === viewer) {
            closeEvidenciaViewer();
        }
    };
}

function closeEvidenciaViewer() {
    const viewer = document.getElementById('evidencia-viewer-modal');
    if (viewer) {
        viewer.style.display = 'none';
        unlockBodyScrollChecklist();
    }
}

function exportChecklistToExcel(cuartoId) {
    const checklistData = JSON.parse(localStorage.getItem('checklistData'));
    const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);

    if (!habitacion) return;

    // Crear CSV (compatible con Excel)
    let csv = 'Habitación,Edificio,Estado Habitación,Elemento,Estado,Último Editor,Fecha Edición\n';

    habitacion.items.forEach(item => {
        const row = [
            habitacion.numero,
            habitacion.edificio || habitacion.edificio_nombre || 'Sin edificio',
            habitacion.estado_cuarto || habitacion.estado || 'disponible',
            item.nombre,
            item.estado,
            habitacion.ultimo_editor || 'Sin editor',
            habitacion.fecha_ultima_edicion ? new Date(habitacion.fecha_ultima_edicion).toLocaleString('es-MX') : 'Sin fecha'
        ];
        csv += row.map(field => `"${field}"`).join(',') + '\n';
    });

    // Crear y descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `checklist_${habitacion.numero}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showNotification(`✅ Excel exportado: ${habitacion.numero}`, 'success');
}

function exportChecklistToPDF(cuartoId) {
    const checklistData = JSON.parse(localStorage.getItem('checklistData'));
    const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);

    if (!habitacion) return;

    // Crear contenido HTML para impresión
    const printWindow = window.open('', '', 'width=800,height=600');

    const estadoHabitacion = habitacion.estado_cuarto || habitacion.estado || 'disponible';
    const counts = CHECKLIST_ESTADOS.reduce((acc, estado) => {
        acc[estado] = habitacion.items.filter(item => item.estado === estado).length;
        return acc;
    }, {});

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Checklist ${habitacion.numero}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
                .header { border-bottom: 3px solid #5d7f5f; padding-bottom: 20px; margin-bottom: 30px; }
                h1 { font-size: 28px; color: #5d7f5f; margin-bottom: 10px; }
                .info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { padding: 10px; background: #f5f5f5; border-left: 3px solid #5d7f5f; }
                .info-item strong { display: block; color: #5d7f5f; margin-bottom: 5px; }
                .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 30px 0; }
                .stat-box { padding: 15px; text-align: center; border: 2px solid #e5e5e5; }
                .stat-box.bueno { border-color: #10b981; background: #f0fdf4; }
                .stat-box.regular { border-color: #f59e0b; background: #fffbeb; }
                .stat-box.malo { border-color: #ef4444; background: #fef2f2; }
                .stat-value { font-size: 32px; font-weight: bold; display: block; }
                .stat-label { font-size: 14px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
                th { background: #5d7f5f; color: white; font-weight: bold; }
                tr:nth-child(even) { background: #f9f9f9; }
                .estado-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                .estado-badge.bueno { background: #d1fae5; color: #065f46; }
                .estado-badge.regular { background: #fef3c7; color: #92400e; }
                .estado-badge.malo { background: #fee2e2; color: #991b1b; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e5e5; text-align: center; color: #666; font-size: 12px; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Checklist de Mantenimiento</h1>
                <h2>${habitacion.numero}</h2>
            </div>
            
            <div class="info">
                <div class="info-item">
                    <strong>Edificio</strong>
                    ${habitacion.edificio || habitacion.edificio_nombre || 'Sin edificio'}
                </div>
                <div class="info-item">
                    <strong>Estado de Habitación</strong>
                    ${estadoHabitacion}
                </div>
                <div class="info-item">
                    <strong>Último Editor</strong>
                    ${habitacion.ultimo_editor || 'Sin ediciones'}
                </div>
                <div class="info-item">
                    <strong>Fecha de Edición</strong>
                    ${habitacion.fecha_ultima_edicion ? new Date(habitacion.fecha_ultima_edicion).toLocaleString('es-MX') : 'Sin fecha'}
                </div>
            </div>
            
            <h3>Resumen de Estados</h3>
            <div class="stats">
                <div class="stat-box bueno">
                    <span class="stat-value">${counts.bueno || 0}</span>
                    <span class="stat-label">Buen Estado</span>
                </div>
                <div class="stat-box regular">
                    <span class="stat-value">${counts.regular || 0}</span>
                    <span class="stat-label">Estado Regular</span>
                </div>
                <div class="stat-box malo">
                    <span class="stat-value">${counts.malo || 0}</span>
                    <span class="stat-label">Mal Estado</span>
                </div>
            </div>
            
            <h3>Detalle de Elementos</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Elemento</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${habitacion.items.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.nombre}</td>
                            <td><span class="estado-badge ${item.estado}">${CHECKLIST_ESTADO_LABELS[item.estado]}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                Generado el ${new Date().toLocaleString('es-MX')} por ${AppState.currentUser?.name || 'Sistema'}<br>
                Sistema de Mantenimiento JWM
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();

    // Esperar a que cargue y abrir diálogo de impresión
    setTimeout(() => {
        printWindow.print();
        showNotification(`📄 PDF listo para imprimir: ${habitacion.numero}`, 'success');
    }, 250);
}

function filterChecklist(searchTerm) {
    AppState.checklistFilters.busqueda = searchTerm;
    AppState.checklistPagination.page = 1; // Reset a página 1
    applyChecklistFilters();
}

/**
 * Poblar el select de filtro de edificios con datos reales
 */
function poblarFiltroEdificiosChecklist() {
    const select = document.getElementById('filtroEdificioChecklist');
    if (!select) return;
    
    // Limpiar opciones existentes (excepto la primera "Todos")
    select.innerHTML = '<option value="">Todos los edificios</option>';
    
    // Obtener edificios desde AppState o extraer de los datos de checklist
    let edificios = [];
    
    if (AppState.edificios && AppState.edificios.length > 0) {
        edificios = AppState.edificios.map(e => e.nombre);
    } else {
        // Extraer edificios únicos de los datos de checklist
        const checklistData = JSON.parse(localStorage.getItem('checklistData') || '[]');
        const edificiosSet = new Set();
        checklistData.forEach(hab => {
            if (hab.edificio) edificiosSet.add(hab.edificio);
            if (hab.edificio_nombre) edificiosSet.add(hab.edificio_nombre);
        });
        edificios = Array.from(edificiosSet);
    }
    
    // Agregar opciones
    edificios.sort().forEach(edificio => {
        const option = document.createElement('option');
        option.value = edificio;
        option.textContent = edificio;
        select.appendChild(option);
    });
    
    console.log('📋 Filtro de edificios poblado:', edificios);
}

function applyChecklistFilters() {
    // Usar datos de AppState.checklistFiltradas como fuente principal, o localStorage como fallback
    let allData = [];
    
    // Primero intentar usar los datos cargados desde la API
    const checklistDataRaw = localStorage.getItem('checklistData');
    if (checklistDataRaw) {
        try {
            allData = JSON.parse(checklistDataRaw);
        } catch (e) {
            console.warn('Error parseando checklistData:', e);
        }
    }
    
    if (allData.length === 0) {
        console.warn('No hay datos de checklist disponibles');
        AppState.checklistFiltradas = [];
        renderChecklistGrid([]);
        return;
    }

    const searchLower = (AppState.checklistFilters.busqueda || '').toLowerCase();
    const habitacionBusqueda = (AppState.checklistFilters.habitacion || '').toLowerCase();
    const categoriaActiva = AppState.checklistFilters.categoria;
    const edificioActivo = AppState.checklistFilters.edificio;
    const estadoActivo = AppState.checklistFilters.estado;

    // Filtrar habitaciones por número de habitación
    let habitacionesFiltradas = allData;
    
    if (habitacionBusqueda) {
        habitacionesFiltradas = habitacionesFiltradas.filter(hab => {
            const numero = (hab.numero || '').toLowerCase();
            return numero.includes(habitacionBusqueda);
        });
    }
    
    // Filtrar por edificio
    if (edificioActivo) {
        habitacionesFiltradas = habitacionesFiltradas.filter(hab => 
            hab.edificio === edificioActivo || hab.edificio_nombre === edificioActivo
        );
    }

    // Filtrar ítems si hay criterios por categoría, búsqueda o estado
    const requiereFiltradoItems = Boolean(categoriaActiva || searchLower || estadoActivo);
    if (requiereFiltradoItems) {
        habitacionesFiltradas = habitacionesFiltradas.map(habitacion => {
            const baseItems = Array.isArray(habitacion.items) ? habitacion.items : [];
            const itemsFiltrados = baseItems.filter(item => {
                const cumpleCategoria = !categoriaActiva || item.categoria === categoriaActiva;
                const nombreItem = (item.nombre || '').toLowerCase();
                const cumpleBusqueda = !searchLower || nombreItem.includes(searchLower);
                const estadoItem = item.estado || '';
                const cumpleEstado = !estadoActivo || estadoItem === estadoActivo;
                return cumpleCategoria && cumpleBusqueda && cumpleEstado;
            });

            if (itemsFiltrados.length > 0) {
                return {
                    ...habitacion,
                    items: itemsFiltrados
                };
            }
            return null;
        }).filter(Boolean);
    }

    AppState.checklistFiltradas = habitacionesFiltradas;

    // Calcular paginación
    AppState.checklistPagination.totalPages = Math.ceil(habitacionesFiltradas.length / AppState.checklistPagination.perPage);
    if (AppState.checklistPagination.page > AppState.checklistPagination.totalPages) {
        AppState.checklistPagination.page = 1;
    }

    renderChecklistGrid(habitacionesFiltradas);
    renderChecklistPagination();
}

function renderChecklistCategorias() {
    const container = document.getElementById('checklistCategoriasFiltro');
    if (!container) return;

    // Eliminar categorías generadas previamente para evitar duplicados
    container.querySelectorAll('.categoria-btn[data-categoria]:not([data-categoria=""])').forEach(btn => btn.remove());

    // Generar botones de categorías usando el ID de la BD
    AppState.checklistCategorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'categoria-btn';
        // Usar el slug como identificador para el filtro
        const categoriaId = cat.id || cat.slug || cat.db_id;
        btn.setAttribute('data-categoria', categoriaId);
        btn.setAttribute('data-categoria-db-id', cat.db_id || cat.id);
        btn.setAttribute('aria-pressed', 'false');
        btn.type = 'button';
        btn.onclick = () => filtrarChecklistPorCategoria(categoriaId);
        btn.innerHTML = `
            <div class="categoria-btn-icon" aria-hidden="true">
                <i class="fas ${cat.icono || 'fa-layer-group'}"></i>
            </div>
            <div class="categoria-btn-text">
                <span class="categoria-btn-label">${cat.nombre}</span>
                <small>Ver ítems</small>
            </div>
        `;
        container.appendChild(btn);
    });
}

function toggleChecklistCategorias(button) {
    const wrapper = document.getElementById('checklistCategoriasWrapper');
    if (!wrapper) {
        return;
    }
    const isOpen = wrapper.getAttribute('data-mobile-open') === 'true';
    const nextState = !isOpen;
    wrapper.setAttribute('data-mobile-open', nextState ? 'true' : 'false');
    if (button) {
        button.setAttribute('aria-expanded', nextState ? 'true' : 'false');
        button.classList.toggle('is-open', nextState);
    }
}

async function handleNuevaSeccionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const nombreInput = form.querySelector('#seccionNombre');
    const iconoSelect = form.querySelector('#seccionIcono');
    const itemsInput = form.querySelector('#seccionItems');
    const feedback = document.getElementById('checklistAddFeedback');

    const nombre = (nombreInput?.value || '').trim();
    if (!nombre) {
        if (feedback) {
            feedback.textContent = 'Escribe un nombre para la sección.';
        }
        nombreInput?.focus();
        return;
    }

    const icono = iconoSelect?.value || 'fa-layer-group';
    
    try {
        // Crear la categoría en la BD
        const nuevaCategoria = await ChecklistAPI.addCategoria({ nombre, icono });
        console.log('✅ Categoría creada en BD:', nuevaCategoria);
        
        // Agregar al estado local
        AppState.checklistCategorias.push({
            id: nuevaCategoria.slug,
            db_id: nuevaCategoria.id,
            nombre: nuevaCategoria.nombre,
            icono: nuevaCategoria.icono,
            orden: nuevaCategoria.orden
        });

        // Procesar ítems si se proporcionaron
        const itemsRaw = (itemsInput?.value || '').trim();
        if (itemsRaw) {
            const itemsArray = itemsRaw.split(/[,\n]+/).map(item => item.trim()).filter(Boolean);
            
            for (const itemNombre of itemsArray) {
                try {
                    const nuevoItem = await ChecklistAPI.addCatalogItem({
                        nombre: itemNombre,
                        categoria_id: nuevaCategoria.id
                    });
                    console.log('✅ Ítem creado en BD:', nuevoItem);
                } catch (itemError) {
                    console.error('❌ Error creando ítem:', itemError);
                }
            }
        }

        // Recargar datos del checklist
        await loadChecklistData();
        
        form.reset();

        if (feedback) {
            feedback.textContent = `Sección "${nombre}" agregada.`;
            setTimeout(() => {
                feedback.textContent = '';
            }, 2500);
        }
        
        showNotification(`✅ Sección "${nombre}" creada`, 'success');
        
    } catch (error) {
        console.error('❌ Error creando sección:', error);
        if (feedback) {
            feedback.textContent = `Error: ${error.message}`;
        }
        showNotification('❌ Error al crear sección', 'error');
    }
}

function createChecklistSlug(texto) {
    return texto
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 40) || `seccion-${Date.now()}`;
}

function filtrarChecklistPorCategoria(categoriaId) {
    AppState.checklistFilters.categoria = categoriaId;
    AppState.checklistPagination.page = 1; // Reset a página 1

    // Actualizar botones activos
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    const btnActivo = document.querySelector(`[data-categoria="${categoriaId}"]`);
    if (btnActivo) {
        btnActivo.classList.add('active');
        btnActivo.setAttribute('aria-pressed', 'true');
    }

    if (window.matchMedia('(max-width: 960px)').matches) {
        const wrapper = document.getElementById('checklistCategoriasWrapper');
        const toggleButton = document.querySelector('.checklist-categorias-toggle');
        if (wrapper) {
            wrapper.setAttribute('data-mobile-open', 'false');
        }
        if (toggleButton) {
            toggleButton.classList.remove('is-open');
            toggleButton.setAttribute('aria-expanded', 'false');
        }
    }

    applyChecklistFilters();
}

function renderChecklistPagination() {
    const paginationContainer = document.getElementById('checklistPaginacion');
    if (!paginationContainer) return;

    const totalItems = AppState.checklistFiltradas?.length || 0;
    const perPage = AppState.checklistPagination?.perPage || 4;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    AppState.checklistPagination.totalPages = totalPages;

    if (totalItems <= perPage) {
        paginationContainer.innerHTML = '';
        paginationContainer.style.display = 'none';
        return;
    }

    const currentPage = Math.min(Math.max(AppState.checklistPagination.page || 1, 1), totalPages);
    AppState.checklistPagination.page = currentPage;

    const optionsMarkup = Array.from({ length: totalPages }, (_, idx) => {
        const pageNumber = idx + 1;
        const selected = pageNumber === currentPage ? ' selected' : '';
        return `<option value="${pageNumber}"${selected}>${pageNumber}</option>`;
    }).join('');

    const totalLabel = totalItems === 1 ? '1 habitación' : `${totalItems} habitaciones`;

    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = `
        <button class="pagination-btn" data-action="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Página anterior de checklist">
            <i class="fas fa-chevron-left"></i>
            <span>Anterior</span>
        </button>
        <div class="pagination-info">
            <span>Página</span>
            <select class="pagination-select" id="checklistPaginationSelect" aria-label="Seleccionar página de checklist">
                ${optionsMarkup}
            </select>
            <span>de ${totalPages}</span>
        </div>
        <button class="pagination-btn" data-action="next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Página siguiente de checklist">
            <span>Siguiente</span>
            <i class="fas fa-chevron-right"></i>
        </button>
        <span class="pagination-total">${totalLabel}</span>
    `;

    const prevBtn = paginationContainer.querySelector('[data-action="prev"]');
    const nextBtn = paginationContainer.querySelector('[data-action="next"]');
    const selectEl = paginationContainer.querySelector('#checklistPaginationSelect');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (AppState.checklistPagination.page > 1) {
                changeChecklistPage(AppState.checklistPagination.page - 1);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (AppState.checklistPagination.page < totalPages) {
                changeChecklistPage(AppState.checklistPagination.page + 1);
            }
        });
    }

    if (selectEl) {
        selectEl.addEventListener('change', (event) => {
            const nextPage = parseInt(event.target.value, 10);
            if (!Number.isNaN(nextPage)) {
                changeChecklistPage(nextPage);
            }
        });
    }
}

function changeChecklistPage(newPage) {
    const { totalPages } = AppState.checklistPagination;
    if (newPage < 1 || newPage > totalPages) return;

    AppState.checklistPagination.page = newPage;
    applyChecklistFilters();
    
    // Scroll smooth hacia arriba para ver las nuevas cards
    const grid = document.getElementById('checklistGrid');
    if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function exportarChecklistExcel() {
    if (AppState.currentUser.role !== 'admin') {
        alert('Solo los administradores pueden exportar datos');
        return;
    }

    document.getElementById('downloadSpinner').style.display = 'flex';

    setTimeout(() => {
        const checklistData = JSON.parse(localStorage.getItem('checklistData'));

        let csv = 'Habitación,Edificio,Item,Estado\n';
        checklistData.forEach(habitacion => {
            habitacion.items.forEach(item => {
                csv += `${habitacion.numero},${habitacion.edificio},${item.nombre},${item.estado}\n`;
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `checklist_inspecciones_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        document.getElementById('downloadSpinner').style.display = 'none';
        alert('Checklist exportado exitosamente');
    }, 1500);
}

// ========================================
// GESTIÓN DE USUARIOS (Solo Admin)
// ========================================

function loadUsuariosData() {
    console.log('👥 Cargando datos de usuarios...');

    const grid = document.getElementById('usuariosGrid');
    if (!grid) return;

    showUsuariosSkeletons(grid);

    setTimeout(() => {
        if (!AppState.usuarios.length) {
            AppState.usuarios = getUsuariosData();
        }
        filterAndRenderUsuarios();
    }, 650);
}

function getUsuariosData() {
    const saved = JSON.parse(localStorage.getItem('usuariosData'));
    if (saved && Array.isArray(saved) && saved.length) {
        return saved;
    }
    localStorage.setItem('usuariosData', JSON.stringify(DEFAULT_USUARIOS));
    return DEFAULT_USUARIOS;
}

function saveUsuariosData() {
    localStorage.setItem('usuariosData', JSON.stringify(AppState.usuarios));
}

function initializeUsuarioForm() {
    const form = document.getElementById('formUsuario');
    if (!form) {
        return;
    }

    form.addEventListener('submit', handleUsuarioFormSubmit);
}

function handleUsuarioFormSubmit(event) {
    event.preventDefault();
    const form = event.target;

    if (!AppState.usuarios.length) {
        AppState.usuarios = getUsuariosData();
    }

    const { usuario, error, focusTarget } = extractUsuarioFormValues(form);
    if (error) {
        alert(error);
        if (focusTarget) {
            focusTarget.focus();
        }
        return;
    }

    AppState.usuarios = [usuario, ...AppState.usuarios];
    saveUsuariosData();
    resetUsuariosPagina();
    filterAndRenderUsuarios();

    form.reset();

    alert(`Usuario "${usuario.nombre}" registrado correctamente.`);
}

function extractUsuarioFormValues(form) {
    const nombreInput = document.getElementById('nombreUsuario');
    const correoInput = document.getElementById('correoUsuario');
    const departamentoInput = document.getElementById('departamentoUsuario');
    const telefonoInput = document.getElementById('telefonoUsuario');
    const numeroEmpleadoInput = document.getElementById('numeroEmpleadoUsuario');
    const rolInput = document.getElementById('rolUsuario');
    const passwordInput = document.getElementById('passwordUsuario');
    const notasInput = document.getElementById('notasUsuario');

    const nombre = nombreInput?.value.trim();
    if (!nombre) {
        return { error: 'El nombre del usuario es obligatorio.', focusTarget: nombreInput };
    }

    const correo = correoInput?.value.trim();
    if (!correo) {
        return { error: 'El correo corporativo es obligatorio.', focusTarget: correoInput };
    }

    const departamento = departamentoInput?.value.trim();
    if (!departamento) {
        return { error: 'El departamento es obligatorio.', focusTarget: departamentoInput };
    }

    const rol = rolInput?.value;
    if (!rol) {
        return { error: 'Selecciona un rol para el usuario.', focusTarget: rolInput };
    }

    const telefono = telefonoInput?.value.trim();
    const numeroEmpleado = numeroEmpleadoInput?.value.trim();
    const passwordTemporal = passwordInput?.value.trim();
    const notas = notasInput?.value.trim();

    const usuario = {
        id: `usr-${Date.now()}`,
        nombre,
        rol,
        avatarIcon: getAvatarIconByRol(rol),
        email: correo,
        telefono: telefono || 'Sin registro',
        departamento,
        numeroEmpleado: numeroEmpleado || 'Sin registro',
        ultimoAcceso: 'Sin registro',
        ultimaSesion: 'Sin registro',
        sesiones: { total: 0, activas: 0 },
        activo: true,
        solicitarCambioPassword: false,
        notas: notas || ''
    };

    if (passwordTemporal) {
        if (passwordTemporal.length < 6) {
            return { error: 'La contraseña temporal debe tener al menos 6 caracteres.', focusTarget: passwordInput };
        }
        usuario.passwordTemporal = passwordTemporal;
    }

    usuario.creadoEl = new Date().toISOString();
    return { usuario };
}

function getAvatarIconByRol(rol) {
    switch (rol) {
        case 'admin':
            return 'fa-user-shield';
        case 'supervisor':
            return 'fa-user-tie';
        default:
            return 'fa-user-cog';
    }
}

function initializeUsuarioEditModal() {
    if (UsuarioModalState.initialized) {
        return;
    }

    const modal = document.getElementById('modalEditarUsuario');
    const form = document.getElementById('formEditarUsuario');
    const feedback = document.getElementById('usuarioEditFeedback');

    if (!modal || !form) {
        console.warn('⚠️ No se encontró el modal de edición de usuarios en el DOM.');
        return;
    }

    UsuarioModalState.modal = modal;
    UsuarioModalState.form = form;
    UsuarioModalState.feedback = feedback;
    UsuarioModalState.title = document.getElementById('modalEditarUsuarioTitulo');
    UsuarioModalState.fields = {
        id: form.querySelector('input[name="usuarioId"]'),
        nombre: document.getElementById('usuarioEditNombre'),
        correo: document.getElementById('usuarioEditCorreo'),
        departamento: document.getElementById('usuarioEditDepartamento'),
        telefono: document.getElementById('usuarioEditTelefono'),
        numero: document.getElementById('usuarioEditNumero'),
        rol: document.getElementById('usuarioEditRol'),
        password: document.getElementById('usuarioEditPassword')
    };

    modal.querySelectorAll('[data-close-modal]').forEach(trigger => {
        trigger.addEventListener('click', closeUsuarioEditModal);
    });

    form.addEventListener('submit', handleUsuarioEditSubmit);

    UsuarioModalState.initialized = true;
}

function openUsuarioEditModal(usuario) {
    if (!UsuarioModalState.modal) {
        return;
    }

    fillUsuarioEditForm(usuario);
    UsuarioModalState.modal.style.display = 'flex';
    UsuarioModalState.modal.setAttribute('aria-hidden', 'false');
    lockBodyScrollChecklist();

    if (!UsuarioModalState.keydownHandler) {
        UsuarioModalState.keydownHandler = (event) => {
            if (event.key === 'Escape') {
                closeUsuarioEditModal();
            }
        };
        document.addEventListener('keydown', UsuarioModalState.keydownHandler);
    }

    requestAnimationFrame(() => {
        UsuarioModalState.fields.nombre?.focus();
    });
}

function closeUsuarioEditModal() {
    if (!UsuarioModalState.modal) {
        return;
    }

    UsuarioModalState.modal.style.display = 'none';
    UsuarioModalState.modal.setAttribute('aria-hidden', 'true');
    unlockBodyScrollChecklist();

    if (UsuarioModalState.keydownHandler) {
        document.removeEventListener('keydown', UsuarioModalState.keydownHandler);
        UsuarioModalState.keydownHandler = null;
    }

    resetUsuarioEditForm();
}

function fillUsuarioEditForm(usuario) {
    const { fields, title } = UsuarioModalState;
    if (!fields.id) {
        return;
    }

    fields.id.value = usuario.id;
    if (fields.nombre) fields.nombre.value = usuario.nombre || '';
    if (fields.correo) fields.correo.value = usuario.email || '';
    if (fields.departamento) fields.departamento.value = usuario.departamento || '';
    if (fields.telefono) fields.telefono.value = usuario.telefono && usuario.telefono !== 'Sin registro' ? usuario.telefono : '';
    if (fields.numero) fields.numero.value = usuario.numeroEmpleado || '';
    if (fields.rol) fields.rol.value = usuario.rol || '';
    if (fields.password) fields.password.value = '';
    if (title) {
        title.textContent = usuario.nombre ? `Editar: ${usuario.nombre}` : 'Editar usuario';
    }
    setUsuarioEditFeedback('');
}

function resetUsuarioEditForm() {
    if (UsuarioModalState.form) {
        UsuarioModalState.form.reset();
    }
    if (UsuarioModalState.fields.id) {
        UsuarioModalState.fields.id.value = '';
    }
    setUsuarioEditFeedback('');
}

function setUsuarioEditFeedback(message, type) {
    if (!UsuarioModalState.feedback) {
        return;
    }
    UsuarioModalState.feedback.textContent = message || '';
    UsuarioModalState.feedback.classList.remove('is-error', 'is-success');
    if (type === 'error') {
        UsuarioModalState.feedback.classList.add('is-error');
    } else if (type === 'success') {
        UsuarioModalState.feedback.classList.add('is-success');
    }
}

function handleUsuarioEditSubmit(event) {
    event.preventDefault();

    const { fields } = UsuarioModalState;
    if (!fields.id) {
        setUsuarioEditFeedback('No se encontró el formulario de edición.', 'error');
        return;
    }

    const userId = fields.id.value;
    if (!userId) {
        setUsuarioEditFeedback('No se pudo identificar al usuario a editar.', 'error');
        return;
    }
    const payload = {
        nombre: fields.nombre?.value.trim() || '',
        email: fields.correo?.value.trim() || '',
        departamento: fields.departamento?.value.trim() || '',
        telefono: fields.telefono?.value.trim() || '',
        numeroEmpleado: fields.numero?.value.trim() || '',
        rol: fields.rol?.value || '',
        passwordTemporal: fields.password?.value.trim() || ''
    };

    const validationError = validateUsuarioEditPayload(payload);
    if (validationError) {
        setUsuarioEditFeedback(validationError, 'error');
        return;
    }

    let usuarioActualizado = null;
    AppState.usuarios = AppState.usuarios.map(usuario => {
        if (usuario.id !== userId) {
            return usuario;
        }
        usuarioActualizado = {
            ...usuario,
            nombre: payload.nombre,
            email: payload.email,
            departamento: payload.departamento,
            telefono: payload.telefono || 'Sin registro',
            numeroEmpleado: payload.numeroEmpleado || 'Sin registro',
            rol: payload.rol
        };

        if (payload.passwordTemporal) {
            usuarioActualizado.passwordTemporal = payload.passwordTemporal;
        }

        return usuarioActualizado;
    });

    if (!usuarioActualizado) {
        setUsuarioEditFeedback('No se encontró el usuario seleccionado.', 'error');
        return;
    }

    saveUsuariosData();
    filterAndRenderUsuarios();
    setUsuarioEditFeedback('Cambios guardados correctamente.', 'success');

    setTimeout(() => {
        closeUsuarioEditModal();
    }, 800);
}

function validateUsuarioEditPayload(payload) {
    if (!payload.nombre) {
        return 'El nombre es obligatorio.';
    }
    if (!payload.email) {
        return 'El correo es obligatorio.';
    }
    if (!payload.departamento) {
        return 'El departamento es obligatorio.';
    }
    if (!payload.rol) {
        return 'Selecciona un rol válido.';
    }
    if (payload.passwordTemporal && payload.passwordTemporal.length < 6) {
        return 'La contraseña temporal debe tener al menos 6 caracteres.';
    }
    return '';
}

function showUsuariosSkeletons(grid) {
    grid.innerHTML = '';
    const skeletonCount = 3;

    for (let i = 0; i < skeletonCount; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'usuario-card skeleton-card usuario-card-skeleton';
        skeleton.innerHTML = `
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
                <div class="skeleton-line"></div>
            </div>
            <div class="skeleton-actions">
                <div class="skeleton-button"></div>
                <div class="skeleton-button"></div>
            </div>
        `;
        grid.appendChild(skeleton);
    }
}

function resetUsuariosPagina() {
    if (!AppState.usuariosPagination) {
        AppState.usuariosPagination = { page: 1 };
        return;
    }
    AppState.usuariosPagination.page = 1;
}

function filterAndRenderUsuarios() {
    if (!AppState.usuarios.length) return;

    const { query, role, estado } = AppState.usuariosFilters;
    const normalizedQuery = (query || '').trim();

    const filtered = AppState.usuarios.filter(usuario => {
        const matchesQuery = normalizedQuery
            ? `${usuario.nombre} ${usuario.email} ${usuario.departamento}`
                .toLowerCase()
                .includes(normalizedQuery)
            : true;
        const matchesRole = role ? usuario.rol === role : true;
        const matchesEstado = estado ? (estado === 'activo' ? usuario.activo : !usuario.activo) : true;
        return matchesQuery && matchesRole && matchesEstado;
    });

    AppState.usuariosFiltrados = filtered;

    if (!AppState.usuariosPagination) {
        AppState.usuariosPagination = { page: 1 };
    }

    const totalPaginas = Math.max(1, Math.ceil(filtered.length / USUARIOS_POR_PAGINA));
    if (AppState.usuariosPagination.page > totalPaginas) {
        AppState.usuariosPagination.page = totalPaginas;
    }
    if (AppState.usuariosPagination.page < 1) {
        AppState.usuariosPagination.page = 1;
    }

    renderUsuariosGrid(filtered);
    updateUsuariosStatsCard();
}

function renderUsuariosGrid(users) {
    const grid = document.getElementById('usuariosGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!users.length) {
        const empty = document.createElement('div');
        empty.className = 'usuario-empty-state';
        empty.innerHTML = `
            <i class="fas fa-user-slash"></i>
            <p>No se encontraron usuarios con los filtros actuales.</p>
        `;
        grid.appendChild(empty);
        renderUsuariosPagination(0);
        return;
    }

    const paginaActual = AppState.usuariosPagination?.page || 1;
    const inicio = (paginaActual - 1) * USUARIOS_POR_PAGINA;
    const paginaUsuarios = users.slice(inicio, inicio + USUARIOS_POR_PAGINA);

    paginaUsuarios.forEach(usuario => {
        const card = document.createElement('div');
        card.className = 'usuario-card gradient-card';
        card.dataset.rol = usuario.rol || 'sin-rol';
        card.dataset.estado = usuario.activo ? 'activo' : 'inactivo';
        card.innerHTML = buildUsuarioCardHTML(usuario);

        const toggle = card.querySelector('.usuario-toggle');
        if (toggle) {
            toggle.checked = usuario.activo;
            toggle.addEventListener('change', (event) => {
                handleUsuarioToggle(usuario.id, event.target.checked);
            });
        }

        grid.appendChild(card);
    });

    renderUsuariosPagination(users.length);
}

function buildUsuarioCardHTML(usuario) {
    const rol = usuario.rol || 'tecnico';
    const badgeClass = rol === 'admin'
        ? 'badge-admin'
        : rol === 'supervisor'
            ? 'badge-supervisor'
            : 'badge-tecnico';
    const telefono = usuario.telefono && usuario.telefono !== 'Sin registro' ? usuario.telefono : 'Sin registro';
    const departamento = usuario.departamento || 'Sin registro';
    const numeroEmpleado = usuario.numeroEmpleado || 'Sin registro';
    const ultimoAcceso = usuario.ultimoAcceso || 'Sin registro';
    const ultimaSesion = usuario.ultimaSesion || 'Sin registro';
    const sesiones = usuario.sesiones || { total: 0, activas: 0 };

    return `
        <div class="usuario-header">
            <div class="usuario-avatar">
                <i class="fas ${usuario.avatarIcon}"></i>
            </div>
            <div class="usuario-info-principal">
                <h3 class="usuario-nombre">${usuario.nombre}</h3>
                <span class="badge-rol ${badgeClass}">${rol.toUpperCase()}</span>
            </div>
        </div>
        <div class="usuario-detalles">
            <div class="detalle-item">
                <i class="fas fa-envelope"></i>
                <span>${usuario.email}</span>
            </div>
            <div class="detalle-item">
                <i class="fas fa-phone"></i>
                <span>${telefono}</span>
            </div>
            <div class="detalle-item">
                <i class="fas fa-building"></i>
                <span>${departamento}</span>
            </div>
            <div class="detalle-item">
                <i class="fas fa-id-badge"></i>
                <span>${numeroEmpleado}</span>
            </div>
        </div>
        <div class="usuario-footer">
            <div class="usuario-info-sesiones">
                <div class="usuario-sesion">
                    <span class="sesion-label">ÚLTIMO ACCESO</span>
                    <span class="sesion-valor">${ultimoAcceso}</span>
                </div>
                <div class="usuario-sesion">
                    <span class="sesion-label">ÚLTIMA SESIÓN</span>
                    <span class="sesion-valor">${ultimaSesion}</span>
                </div>
            </div>
            <div class="usuario-sesiones-resumen">
                <span class="sesion-label">SESIONES</span>
                <div class="sesion-valores">
                    <span class="sesion-total">${sesiones.total} registradas</span>
                    <span class="sesion-activas">${sesiones.activas} activas</span>
                </div>
            </div>
            <div class="usuario-switch-container">
                <div class="checkbox-wrapper-35">
                    <input type="checkbox" class="switch usuario-toggle" id="toggle-${usuario.id}" ${usuario.activo ? 'checked' : ''}>
                    <label for="toggle-${usuario.id}">
                        <span class="switch-x-text">Estado</span>
                        <span class="switch-x-toggletext">
                            <span class="switch-x-unchecked"><span class="switch-x-hiddenlabel">Estado: </span>Desactivar</span>
                            <span class="switch-x-checked"><span class="switch-x-hiddenlabel">Estado: </span>Activar</span>
                        </span>
                    </label>
                </div>
            </div>
            <div class="usuario-actions">
                <button class="btn-edit-user" type="button" onclick="editarUsuario('${usuario.id}')">
                    <i class="fas fa-pen-to-square"></i>
                    <span>Editar</span>
                </button>
                <button class="btn-delete-user" type="button" onclick="eliminarUsuario('${usuario.id}')">
                    <i class="fas fa-trash"></i>
                    <span>Eliminar</span>
                </button>
            </div>
        </div>
    `;
}

function renderUsuariosPagination(totalUsuarios) {
    const contenedor = document.getElementById('usuariosPagination');
    if (!contenedor) {
        return;
    }

    if (!totalUsuarios || totalUsuarios <= USUARIOS_POR_PAGINA) {
        contenedor.innerHTML = '';
        contenedor.style.display = 'none';
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(totalUsuarios / USUARIOS_POR_PAGINA));
    const paginaActual = AppState.usuariosPagination?.page || 1;
    const opciones = Array.from({ length: totalPaginas }, (_, index) => {
        const pagina = index + 1;
        const selected = pagina === paginaActual ? ' selected' : '';
        return `<option value="${pagina}"${selected}>${pagina}</option>`;
    }).join('');

    contenedor.style.display = 'flex';
    contenedor.innerHTML = `
        <button class="pagination-btn" data-action="prev" ${paginaActual === 1 ? 'disabled' : ''} aria-label="Página anterior de usuarios">
            <i class="fas fa-chevron-left"></i>
            <span>Anterior</span>
        </button>
        <div class="pagination-info">
            <span>Página</span>
            <select class="pagination-select" id="usuariosPaginationSelect" aria-label="Seleccionar página de usuarios">
                ${opciones}
            </select>
            <span>de ${totalPaginas}</span>
        </div>
        <button class="pagination-btn" data-action="next" ${paginaActual === totalPaginas ? 'disabled' : ''} aria-label="Página siguiente de usuarios">
            <span>Siguiente</span>
            <i class="fas fa-chevron-right"></i>
        </button>
        <span class="pagination-total">${totalUsuarios === 1 ? '1 usuario' : `${totalUsuarios} usuarios`}</span>
    `;

    const prevBtn = contenedor.querySelector('[data-action="prev"]');
    const nextBtn = contenedor.querySelector('[data-action="next"]');
    const select = contenedor.querySelector('#usuariosPaginationSelect');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (AppState.usuariosPagination.page > 1) {
                AppState.usuariosPagination.page -= 1;
                renderUsuariosGrid(AppState.usuariosFiltrados || []);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (AppState.usuariosPagination.page < totalPaginas) {
                AppState.usuariosPagination.page += 1;
                renderUsuariosGrid(AppState.usuariosFiltrados || []);
            }
        });
    }

    if (select) {
        select.addEventListener('change', (event) => {
            const nuevaPagina = parseInt(event.target.value, 10);
            if (!Number.isNaN(nuevaPagina)) {
                AppState.usuariosPagination.page = nuevaPagina;
                renderUsuariosGrid(AppState.usuariosFiltrados || []);
            }
        });
    }
}

function updateUsuariosStatsCard() {
    const totalEl = document.getElementById('usuarioStatsTotal');
    const activosEl = document.getElementById('usuarioStatsActivos');
    const adminsEl = document.getElementById('usuarioStatsAdmins');

    if (!totalEl || !activosEl || !adminsEl) {
        return;
    }

    const captionEl = document.getElementById('usuarioStatsCaption');
    const highlightEl = document.getElementById('usuarioStatsHighlight');
    const progressEl = document.getElementById('usuarioStatsProgress');

    const usuarios = AppState.usuarios.length ? AppState.usuarios : getUsuariosData();
    const total = usuarios.length;
    const activos = usuarios.filter(usuario => usuario.activo).length;
    const admins = usuarios.filter(usuario => usuario.rol === 'admin').length;

    totalEl.textContent = total;
    activosEl.textContent = activos;
    adminsEl.textContent = admins;

    const percentActivos = total ? Math.round((activos / total) * 100) : 0;
    if (progressEl) {
        progressEl.style.setProperty('--progress-value', `${percentActivos}%`);
        progressEl.dataset.percent = `${percentActivos}%`;
    }

    if (captionEl) {
        captionEl.textContent = total
            ? `El ${percentActivos}% del equipo está activo (${activos}/${total}).`
            : 'Aún no hay usuarios registrados.';
    }

    const ultimoRegistro = usuarios
        .filter(usuario => usuario.creadoEl)
        .sort((a, b) => new Date(b.creadoEl) - new Date(a.creadoEl))[0];

    if (highlightEl) {
        if (ultimoRegistro) {
            const fecha = new Date(ultimoRegistro.creadoEl).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            highlightEl.textContent = `Último registro: ${ultimoRegistro.nombre} (${fecha})`;
        } else {
            highlightEl.textContent = 'Último registro: Sin datos recientes';
        }
    }
}

function handleUsuarioToggle(usuarioId, isActive) {
    AppState.usuarios = AppState.usuarios.map(usuario =>
        usuario.id === usuarioId ? { ...usuario, activo: isActive } : usuario
    );
    saveUsuariosData();
    filterAndRenderUsuarios();
}

function mostrarModalNuevoUsuario() {
    // Redirigir a la página de registro
    window.location.href = 'login.html';
}

function editarUsuario(userId) {
    if (!UsuarioModalState.initialized) {
        initializeUsuarioEditModal();
    }

    if (!AppState.usuarios.length) {
        AppState.usuarios = getUsuariosData();
    }

    const usuario = AppState.usuarios.find(user => user.id === userId);
    if (!usuario) {
        alert('No se encontró el usuario seleccionado.');
        return;
    }

    if (!UsuarioModalState.modal) {
        alert('No se pudo abrir el modal de edición. Actualiza la página e inténtalo nuevamente.');
        return;
    }

    openUsuarioEditModal(usuario);
}

function eliminarUsuario(userId) {
    if (!confirm('¿Está seguro que desea eliminar este usuario?')) {
        return;
    }

    if (!AppState.usuarios.length) {
        AppState.usuarios = getUsuariosData();
    }

    AppState.usuarios = AppState.usuarios.filter(usuario => usuario.id !== userId);
    saveUsuariosData();
    filterAndRenderUsuarios();
    alert('Usuario eliminado exitosamente');
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function archivarPeriodo() {
    if (AppState.currentUser.role !== 'admin') {
        alert('Solo los administradores pueden archivar periodos');
        return;
    }

    ensureSabanasCollection();
    const sabana = getSelectedSabana();
    if (!sabana) {
        alert('No hay una sábana activa para archivar');
        return;
    }

    if (sabana.estado === 'archivada') {
        alert('Este periodo ya fue archivado anteriormente');
        return;
    }

    if (!confirm('¿Está seguro que desea archivar el periodo actual? Podrás consultarlo en el historial.')) {
        return;
    }

    sabana.estado = 'archivada';
    sabana.archivadoAt = new Date().toISOString();
    sabana.updatedAt = sabana.archivadoAt;
    saveSabanas(AppState.sabanaCollections);
    renderSabanaTipoSelect();
    applySabanaFilters(true);

    alert('Periodo archivado exitosamente');
    console.log('📦 Periodo archivado:', sabana.archivadoAt);
}

function verHistorialFiltros() {
    openHistorialSabanaModal();
}

function generarReporteChecklist() {
    const dataset = (AppState.checklistFiltradas && AppState.checklistFiltradas.length)
        ? AppState.checklistFiltradas
        : (JSON.parse(localStorage.getItem('checklistData')) || []);

    if (!dataset.length) {
        alert('No hay datos de checklist para generar el reporte.');
        return;
    }

    const rows = dataset.map(habitacion => {
        const counts = CHECKLIST_ESTADOS.reduce((acc, estado) => {
            acc[estado] = 0;
            return acc;
        }, {});

        (habitacion.items || []).forEach(item => {
            if (counts[item.estado] !== undefined) {
                counts[item.estado] += 1;
            }
        });

        const total = (habitacion.items || []).length;
        return `
            <tr>
                <td>${sanitizeText(habitacion.numero || '-')}</td>
                <td>${sanitizeText(habitacion.edificio || habitacion.edificio_nombre || '-')}</td>
                <td>${total}</td>
                <td>${counts.bueno}</td>
                <td>${counts.regular}</td>
                <td>${counts.malo}</td>
            </tr>
        `;
    }).join('');

    const filtros = AppState.checklistFilters || {};
    const estadoLabel = filtros.estado ? (CHECKLIST_ESTADO_LABELS[filtros.estado] || filtros.estado) : 'Todos';
    const resumenFiltros = `Categoría: ${filtros.categoria || 'Todas'} · Edificio: ${filtros.edificio || 'Todos'} · Estado: ${estadoLabel} · Búsqueda: ${filtros.busqueda || '—'}`;
    const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });

    const html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Reporte Checklist</title>
        <style>
            body { font-family: 'Montserrat', Arial, sans-serif; padding: 28px; color: #111; }
            h1 { margin-bottom: 4px; }
            p { margin: 0 0 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #222; padding: 8px 10px; font-size: 13px; text-align: center; }
            th { background: #f3f4f6; text-transform: uppercase; letter-spacing: .04em; }
            tfoot td { font-weight: 700; }
        </style>
    </head>
    <body>
        <h1>Reporte de Checklist de Inspecciones</h1>
        <p>${fecha}</p>
        <p>${sanitizeText(resumenFiltros)}</p>
        <table>
            <thead>
                <tr>
                    <th>Habitación</th>
                    <th>Edificio</th>
                    <th>Total Ítems</th>
                    <th>Bueno</th>
                    <th>Regular</th>
                    <th>Malo</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="6">${dataset.length} habitaciones incluidas en el reporte</td>
                </tr>
            </tfoot>
        </table>
    </body>
    </html>`;

    const reporteWindow = window.open('', '_blank');
    if (!reporteWindow) {
        alert('Habilita las ventanas emergentes para descargar el PDF.');
        return;
    }

    reporteWindow.document.write(html);
    reporteWindow.document.close();
    reporteWindow.focus();
    reporteWindow.print();
}

function generarReportePDF(modulo = 'tareas') {
    const registros = modulo === 'tareas'
        ? (AppState.tareasFiltradas && AppState.tareasFiltradas.length ? AppState.tareasFiltradas : AppState.tareas)
        : [];

    if (!registros || !registros.length) {
        showQuickToast('<strong>Reporte vacío</strong><p>No hay tareas para exportar con los filtros actuales.</p>');
        return;
    }

    const rows = registros.map(tarea => `
        <tr>
            <td>${sanitizeText(tarea.titulo)}</td>
            <td>${sanitizeText(getEstadoLabel(tarea.estado))}</td>
            <td>${sanitizeText(getPrioridadLabel(tarea.prioridad))}</td>
            <td>${sanitizeText(tarea.vence || 'Sin fecha')}</td>
            <td>${sanitizeText(tarea.responsable || 'Sin responsable')}</td>
            <td>${sanitizeText(tarea.ubicacion || 'Sin ubicación')}</td>
        </tr>
    `).join('');

    const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
    const html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Reporte de tareas</title>
        <style>
            body { font-family: 'Montserrat', Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #333; padding: 8px 10px; font-size: 13px; }
            th { background: #f0f0f0; text-transform: uppercase; }
            tfoot td { font-weight: 700; }
        </style>
    </head>
    <body>
        <h1>Reporte operativo de tareas</h1>
        <p>Generado el ${fecha}</p>
        <table>
            <thead>
                <tr>
                    <th>Tarea</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Vence</th>
                    <th>Responsable</th>
                    <th>Ubicación</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="6">Total de registros: ${registros.length}</td>
                </tr>
            </tfoot>
        </table>
    </body>
    </html>`;

    const reporteWindow = window.open('', '_blank');
    if (!reporteWindow) {
        alert('Por favor, habilita las ventanas emergentes para descargar el PDF.');
        return;
    }
    reporteWindow.document.write(html);
    reporteWindow.document.close();
    reporteWindow.focus();
    setTimeout(() => reporteWindow.print(), 600);
}

function eliminarTareaRapida() {
    const tareas = AppState.tareas || [];
    if (!tareas.length) {
        showQuickToast('<strong>Sin registros</strong><p>No hay tareas disponibles para eliminar.</p>');
        return;
    }

    const referencia = prompt('Escribe el ID o parte del título de la tarea que deseas eliminar:');
    if (!referencia || !referencia.trim()) {
        showQuickToast('<strong>Operación cancelada</strong><p>No se proporcionó referencia.</p>');
        return;
    }

    const query = referencia.trim().toLowerCase();
    const tarea = tareas.find(t => t.id?.toLowerCase() === query) ||
        tareas.find(t => (t.titulo || '').toLowerCase().includes(query));

    if (!tarea) {
        showQuickToast(`<strong>No encontrada</strong><p>No se encontró una tarea que coincida con "${sanitizeText(referencia)}".</p>`);
        return;
    }

    const confirmacion = confirm(`¿Eliminar la tarea "${tarea.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmacion) {
        showQuickToast('<strong>Sin cambios</strong><p>La tarea se mantiene en el tablero.</p>');
        return;
    }

    AppState.tareas = tareas.filter(t => t.id !== tarea.id);
    saveTareasData(AppState.tareas);
    filterAndRenderTareas();
    showQuickToast(`<strong>Tarea eliminada</strong><p>${sanitizeText(tarea.titulo)} se removió correctamente.</p>`);
}

function abrirModalCrearTarea() {
    const titulo = prompt('Título de la tarea');
    if (!titulo) {
        showQuickToast('<strong>Alta cancelada</strong><p>No se proporcionó título.</p>');
        return;
    }

    const descripcion = prompt('Descripción breve', titulo) || titulo;
    const prioridadEntrada = prompt('Prioridad (alta, media, baja)', 'media') || 'media';
    const prioridadNormalizada = ['alta', 'media', 'baja'].includes(prioridadEntrada.toLowerCase())
        ? prioridadEntrada.toLowerCase()
        : 'media';
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 2);
    const vence = prompt('Fecha de vencimiento (AAAA-MM-DD)', formatDateForInput(defaultDate)) || '';
    const ubicacion = prompt('Ubicación', 'Oficina Central') || 'Oficina Central';

    const nuevaTarea = {
        id: `task-${Date.now()}`,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        rol: AppState.currentUser?.role || 'tecnico',
        prioridad: prioridadNormalizada,
        estado: 'pendiente',
        vence: vence || null,
        icono: 'fa-list-check',
        etiquetas: [],
        ubicacion: ubicacion.trim() || 'Oficina Central',
        responsable: AppState.currentUser?.name || 'Equipo Mantto'
    };

    AppState.tareas = [nuevaTarea, ...AppState.tareas];
    saveTareasData(AppState.tareas);
    filterAndRenderTareas();
    showQuickToast(`<strong>Tarea creada</strong><p>${sanitizeText(nuevaTarea.titulo)} asignada a ${sanitizeText(nuevaTarea.responsable)}</p>`);
}

function showQuickToast(html, duration = 4500) {
    const toast = document.createElement('div');
    toast.className = 'quick-report-toast';
    toast.innerHTML = html;
    const stackIndex = document.querySelectorAll('.quick-report-toast').length;
    toast.style.top = `${90 + stackIndex * 110}px`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

// ============================================
// MÓDULO TAREAS
// ============================================

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

function setupTareasFilters() {
    const searchInput = document.getElementById('buscarTarea');
    const roleSelect = document.getElementById('filtroRolTarea');
    const estadoSelect = document.getElementById('filtroEstadoTarea');
    const prioridadSelect = document.getElementById('filtroPrioridadTarea');
    const quickActionsSelect = document.getElementById('quickActionsSelect');

    // Establecer el rol actual como valor predeterminado
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
            generarReportePDF('tareas');
            break;
        case 'nueva-tarea':
            abrirModalCrearTarea();
            break;
        case 'eliminar-tarea':
            eliminarTareaRapida();
            break;
        default:
            break;
    }
}

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
        // Mostrar solo las tareas del rol actual del usuario
        filtered = filtered.filter(t => t.rol === currentRole);
    } else if (filters.role === 'todos') {
        // Mostrar todas las tareas sin filtrar
    } else {
        // Filtrar por el rol específico seleccionado
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

function abrirModalDetalleTarea(tarea) {
    if (!tareaModalElements.modal) return;

    tareaModalElements.modal.style.display = 'flex';
    tareaModalElements.modal.setAttribute('aria-hidden', 'false');
    lockBodyScrollChecklist();

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
    unlockBodyScrollChecklist();
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

function isAnyTareaModalVisible() {
    const detalleVisible = tareaModalElements.modal && tareaModalElements.modal.getAttribute('aria-hidden') === 'false';
    const editarVisible = tareaEditModalState.modal && tareaEditModalState.modal.getAttribute('aria-hidden') === 'false';
    return Boolean(detalleVisible || editarVisible);
}

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
    if (prioridad) {
        prioridad.value = tarea.prioridad;
        if (typeof window.updateSemaforoDropdown === 'function') {
            window.updateSemaforoDropdown(prioridad);
        }
    }
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
    lockBodyScrollChecklist();

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
    unlockBodyScrollChecklist();
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

    // Calcular tareas urgentes (alta prioridad o vencidas)
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

    // Mostrar rol en español
    if (rolEl) {
        const rolesEspanol = {
            'admin': 'Administrador',
            'supervisor': 'Supervisor',
            'tecnico': 'Técnico'
        };
        rolEl.textContent = rolesEspanol[rolActual] || rolActual.charAt(0).toUpperCase() + rolActual.slice(1);
    }

    // Renderizar tareas por hacer
    renderTareasPorHacer(tareasRol);
}

function renderTareasPorHacer(tareasRol) {
    const container = document.getElementById('listaTareasPorHacer');
    const mensajeVacio = document.getElementById('mensajeNoTareasPorHacer');
    const contador = document.getElementById('contadorTareasPorHacer');

    console.log('📝 Renderizando tareas por hacer, total tareas rol:', tareasRol.length);

    if (!container) {
        console.error('❌ No se encontró el contenedor listaTareasPorHacer');
        return;
    }

    // Filtrar solo pendientes y en proceso, ordenar por prioridad y fecha
    const tareasPendientes = tareasRol
        .filter(t => t.estado === 'pendiente' || t.estado === 'en_proceso')
        .sort((a, b) => {
            // Primero por prioridad
            const prioridadOrder = { 'alta': 0, 'media': 1, 'baja': 2 };
            const prioA = prioridadOrder[a.prioridad] || 3;
            const prioB = prioridadOrder[b.prioridad] || 3;
            if (prioA !== prioB) return prioA - prioB;
            // Luego por fecha de vencimiento
            return new Date(a.vence) - new Date(b.vence);
        });

    console.log('✅ Tareas pendientes filtradas:', tareasPendientes.length);

    if (contador) contador.textContent = tareasPendientes.length;

    if (tareasPendientes.length === 0) {
        container.innerHTML = '';
        if (mensajeVacio) mensajeVacio.style.display = 'block';
        return;
    }

    if (mensajeVacio) mensajeVacio.style.display = 'none';

    container.innerHTML = tareasPendientes.map(tarea => {
        const fechaVence = new Date(tarea.vence);
        const hoy = new Date();
        const diasRestantes = Math.ceil((fechaVence - hoy) / (1000 * 60 * 60 * 24));
        const venceTexto = diasRestantes < 0 ? `Vencida hace ${Math.abs(diasRestantes)}d` :
            diasRestantes === 0 ? 'Vence hoy' :
                diasRestantes === 1 ? 'Vence mañana' :
                    `Vence en ${diasRestantes}d`;

        const prioridadClass = `prioridad-${tarea.prioridad}`;
        const prioridadLabel = tarea.prioridad.charAt(0).toUpperCase() + tarea.prioridad.slice(1);
        const estadoTexto = tarea.estado === 'en_proceso' ? 'En proceso' : 'Pendiente';
        const estadoClass = tarea.estado === 'en_proceso' ? 'estado-en-proceso' : 'estado-pendiente';

        const tagsHTML = tarea.etiquetas.map(tag => `<span class="tarea-tag-mini">${sanitizeText(tag)}</span>`).join('');

        const isUrgente = tarea.prioridad === 'alta' || diasRestantes <= 1;
        const urgenteBadge = isUrgente ? '<span class="badge-urgente-mini"><i class="fas fa-exclamation-triangle"></i> Urgente</span>' : '';

        const cardHTML = `
            <li class="tarea-pendiente-card ${prioridadClass}" data-task-id="${tarea.id}">
                <div class="tarea-pendiente-header">
                    <div class="tarea-pendiente-icon">
                        <i class="fa-solid ${tarea.icono}"></i>
                    </div>
                    <div class="tarea-pendiente-titulo-bloque">
                        <h3 class="tarea-pendiente-titulo">${sanitizeText(tarea.titulo)}</h3>
                        <div class="tarea-pendiente-badges">
                            <span class="alerta-prioridad-pill alerta-prioridad-${tarea.prioridad}">${prioridadLabel}</span>
                            ${urgenteBadge}
                        </div>
                    </div>
                </div>
                <p class="tarea-pendiente-descripcion">${sanitizeText(tarea.descripcion)}</p>
                <div class="tarea-pendiente-meta">
                    <span class="meta-item meta-vencimiento ${diasRestantes <= 1 ? 'meta-urgente' : ''}">
                        <i class="fas fa-calendar-day"></i> ${venceTexto}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-map-marker-alt"></i> ${sanitizeText(tarea.ubicacion)}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-user"></i> ${sanitizeText(tarea.responsable)}
                    </span>
                    <span class="meta-item meta-estado ${estadoClass}">
                        <i class="fas fa-info-circle"></i> ${estadoTexto}
                    </span>
                </div>
                <div class="tarea-pendiente-tags">${tagsHTML}</div>
                <div class="tarea-pendiente-footer">
                    <button class="btn-tarea-mini btn-ver-detalle" data-task-id="${tarea.id}">
                        <i class="fas fa-eye"></i> Ver detalle
                    </button>
                    <button class="btn-tarea-mini btn-iniciar" data-task-id="${tarea.id}">
                        <i class="fas fa-play"></i> ${tarea.estado === 'en_proceso' ? 'Continuar' : 'Iniciar'}
                    </button>
                </div>
            </li>
        `;
        console.log('📝 Card HTML generada para:', tarea.titulo);
        return cardHTML;
    }).join('');
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

// Hacer funciones globales para uso en HTML
window.toggleCambioRealizado = toggleCambioRealizado;
window.updateChecklistEstado = updateChecklistEstado;
window.exportarSabanaExcel = exportarSabanaExcel;
window.exportarChecklistExcel = exportarChecklistExcel;
window.mostrarModalNuevoUsuario = mostrarModalNuevoUsuario;
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.archivarPeriodo = archivarPeriodo;
window.verHistorialFiltros = verHistorialFiltros;
window.generarReporteChecklist = generarReporteChecklist;
window.openHistorialSabanaModal = openHistorialSabanaModal;
window.closeHistorialSabanaModal = closeHistorialSabanaModal;
window.openCrearSabanaModal = openCrearSabanaModal;
window.closeCrearSabanaModal = closeCrearSabanaModal;
window.poblarFiltroEdificiosChecklist = poblarFiltroEdificiosChecklist;
window.loadChecklistDataFromAPI = loadChecklistData;

console.log('✅ Checklist-tab.js cargado completamente');

// El selector de editores usa ahora un `select` nativo; no requiere JS adicional.
