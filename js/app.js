// ========================================
// APP.JS - Sistema Principal JW Marriott
// ========================================

// Configuración de la API
const API_BASE_URL = window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('vercel.com') ? '' :
    window.location.port === '3000' ? '' : 'http://localhost:3001';

// Estado global de la aplicación
const AppState = {
    currentUser: null,
    theme: 'light',
    currentTab: 'habitaciones',
    edificios: [],
    cuartos: [],
    mantenimientos: [],
    espaciosComunes: [],
    mantenimientosEspacios: [],
    usuarios: [],
    roles: [],
    usuariosFiltro: '',
    usuariosLoading: false,
    usuarioFormMode: 'create',
    usuarioEdicion: null,
    // Los ítems y categorías de checklist se cargan desde la API de PostgreSQL
    checklistItems: [],
    checklistCategorias: [],
    checklistFilters: {
        categoria: '',
        busqueda: '',
        habitacion: '',
        edificio: '',
        estado: '',
        editor: ''
    },
    checklistPagination: {
        page: 1,
        perPage: 4,
        totalPages: 1
    },
    checklistFiltradas: [],
    inspeccionesRecientes: []
};

// ========================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================

// Función auxiliar para hacer requests autenticados
async function fetchWithAuth(url, options = {}) {
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') || sessionStorage.getItem('tokenType') || 'Bearer';

    if (!accessToken) {
        console.error('❌ [FETCH-AUTH] No hay token de acceso');
        window.location.href = 'login.html';
        throw new Error('No hay sesión activa');
    }

    const headers = {
        ...options.headers,
        'Authorization': `${tokenType} ${accessToken}`,
        'Content-Type': 'application/json'
    };

    console.log('🔵 [FETCH-AUTH] Haciendo petición a:', url);
    const response = await fetch(url, {
        ...options,
        headers
    });

    // Si el token expiró, intentar refrescar
    if (response.status === 401) {
        console.log('⚠️ [FETCH-AUTH] Token expirado (401), intentando refrescar...');
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Reintentar la petición con el nuevo token
            const newAccessToken = localStorage.getItem('accessToken');
            headers['Authorization'] = `${tokenType} ${newAccessToken}`;
            console.log('🔵 [FETCH-AUTH] Reintentando con nuevo token...');
            return await fetch(url, { ...options, headers });
        } else {
            console.error('❌ [FETCH-AUTH] No se pudo refrescar el token, redirigiendo a login');
            window.location.href = 'login.html';
        }
    }

    return response;
}

// Refrescar access token usando refresh token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

    if (!refreshToken) {
        clearAuthData();
        return false;
    }

    try {
        console.log('🔵 [REFRESH-TOKEN] Intentando refrescar token...');
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || 'Error al refrescar token');
        }

        if (data.success) {
            // Actualizar tokens en el storage correspondiente
            const isRemembered = localStorage.getItem('refreshToken') !== null;
            if (isRemembered) {
                localStorage.setItem('accessToken', data.tokens.accessToken);
                localStorage.setItem('tokenExpiration', data.tokens.expiresIn);
            } else {
                sessionStorage.setItem('accessToken', data.tokens.accessToken);
                sessionStorage.setItem('tokenExpiration', data.tokens.expiresIn);
            }
            console.log('✅ [REFRESH-TOKEN] Token refrescado exitosamente');
            return true;
        }

    } catch (error) {
        console.error('❌ [REFRESH-TOKEN] Error al refrescar token:', error);
        clearAuthData();
        return false;
    }
}

// Limpiar datos de autenticación
function clearAuthData() {
    // Limpiar localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiration');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('sesionId');
    localStorage.removeItem('currentUser');
    // Limpiar sessionStorage
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('tokenExpiration');
    sessionStorage.removeItem('tokenType');
    sessionStorage.removeItem('sesionId');
    sessionStorage.removeItem('currentUser');
}

// Exportar función para uso en otras páginas
window.fetchWithAuth = fetchWithAuth;

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [APP.JS] ========================================');
    console.log('🚀 [APP.JS] DOMContentLoaded - Inicializando JW Marriott Sistema de Mantenimiento...');
    console.log('🚀 [APP.JS] Timestamp:', new Date().toISOString());
    console.log('🚀 [APP.JS] URL actual:', window.location.href);
    console.log('🚀 [APP.JS] LocalStorage keys:', Object.keys(localStorage));
    console.log('🚀 [APP.JS] ========================================');

    // Verificar autenticación (ahora es async)
    console.log('🚀 [APP.JS] Llamando a checkAuthentication()...');
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return; // Si no está autenticado, ya se redirigió
    }

    // Inicializar tema
    console.log('🚀 [APP.JS] Inicializando tema...');
    initializeTheme();

    // Configurar event listeners
    console.log('🚀 [APP.JS] Configurando event listeners...');
    setupEventListeners();

    // Inicializar navegación
    console.log('🚀 [APP.JS] Inicializando navegación...');
    initializeNavigation();

    // Cargar datos iniciales y luego renderizar el tab activo
    console.log('🚀 [APP.JS] Cargando datos iniciales...');
    await loadInitialData();

    // Cargar el tab activo después de tener los datos
    console.log('🚀 [APP.JS] ========================================');
    console.log('🚀 [APP.JS] Cargando tab activo:', AppState.currentTab);
    console.log('🚀 [APP.JS] Timestamp:', new Date().toISOString());
    console.log('🚀 [APP.JS] ========================================');
    loadTabData(AppState.currentTab);
    
    // FORZAR renderizado de habitaciones si es el tab inicial
    // Esto soluciona el problema de skeletons colgados después del login
    if (AppState.currentTab === 'habitaciones') {
        console.log('🚀 [APP.JS] Forzando renderizado de habitaciones...');
        setTimeout(() => {
            if (typeof window.mostrarCuartos === 'function') {
                console.log('🚀 [APP.JS] Ejecutando mostrarCuartos() forzado');
                window.mostrarCuartos();
            }
            if (typeof window.mostrarAlertasYRecientes === 'function') {
                console.log('🚀 [APP.JS] Ejecutando mostrarAlertasYRecientes() forzado');
                window.mostrarAlertasYRecientes();
            }
        }, 300);
    }
});

// ========================================
// AUTENTICACIÓN
// ========================================

async function checkAuthentication() {
    console.log('🔐 [APP.JS] checkAuthentication() - Verificando autenticación...');
    // Verificar token JWT (en localStorage o sessionStorage)
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');

    console.log('🔐 [APP.JS] Datos de autenticación:', {
        hasAccessToken: !!accessToken,
        hasCurrentUser: !!currentUser,
        userEmail: currentUser?.email,
        userRol: currentUser?.rol
    });

    if (!accessToken || !currentUser) {
        // Redirigir al login si no hay sesión
        console.log('🔐 [APP.JS] No hay sesión válida, redirigiendo a login.html...');
        window.location.href = 'login.html';
        return false;
    }

    // Si el usuario local tiene requiere_cambio_password, verificar con el backend
    if (currentUser.requiere_cambio_password) {
        console.warn('🟡 [APP.JS] Usuario local requiere cambio de contraseña. Verificando estado actual...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Actualizar el usuario con los datos frescos del backend
                if (data.usuario && !data.usuario.requiere_cambio_password) {
                    console.log('✅ [APP.JS] Backend confirmó: usuario ya NO requiere cambio de contraseña. Actualizando storage...');
                    currentUser.requiere_cambio_password = false;
                    const isRemembered = localStorage.getItem('currentUser') !== null;
                    if (isRemembered) {
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    } else {
                        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                } else if (data.usuario && data.usuario.requiere_cambio_password) {
                    console.warn('🟡 [APP.JS] Backend confirmó: usuario aún requiere cambio de contraseña. Redirigiendo...');
                    window.location.href = 'login.html?forcePassword=1';
                    return false;
                }
            }
        } catch (error) {
            console.error('❌ [APP.JS] Error al verificar estado del usuario:', error);
            // Si hay error, por seguridad redirigir a login
            window.location.href = 'login.html?forcePassword=1';
            return false;
        }
    }

    // Normalizar el campo de rol para compatibilidad
    if (currentUser.rol && !currentUser.role) {
        currentUser.role = currentUser.rol.toLowerCase();
        console.log('🔐 [APP.JS] Rol normalizado:', currentUser.rol, '->', currentUser.role);
    }

    // Verificar si el token sigue vigente
    AppState.currentUser = currentUser;
    console.log('🔐 [APP.JS] Usuario asignado a AppState:', AppState.currentUser);

    // Actualizar UI con info del usuario
    console.log('🔐 [APP.JS] Actualizando UI del usuario...');
    updateUserInfo();

    // Aplicar permisos según el rol
    console.log('🔐 [APP.JS] Aplicando permisos de rol:', currentUser.role);
    applyRolePermissions(currentUser.role);

    console.log('✅ [APP.JS] Usuario autenticado:', currentUser.nombre || currentUser.name, '-', currentUser.role);
    return true;
}

function updateUserInfo() {
    const { nombre, name, rol, role } = AppState.currentUser;

    document.getElementById('userName').textContent = nombre || name;
    document.getElementById('userRole').textContent = (rol || role).toUpperCase();
}

function applyRolePermissions(role) {
    console.log('🔑 [APP.JS] applyRolePermissions() - Aplicando permisos para rol:', role);
    // Agregar clase al body según el rol
    document.body.classList.add(role);
    console.log('🔑 [APP.JS] Clase añadida al body:', role);

    // Manejar elementos admin-only
    if (role === 'admin') {
        console.log('🔑 [APP.JS] Rol ADMIN detectado, mostrando elementos admin-only');
        const adminElements = document.querySelectorAll('.admin-only');
        console.log('🔑 [APP.JS] Elementos admin-only encontrados:', adminElements.length);

        adminElements.forEach((el, index) => {
            if (!el.classList.contains('tab-content')) {
                if (el.tagName === 'A' || el.tagName === 'BUTTON') {
                    el.style.display = 'flex';
                    console.log(`🔑 [APP.JS] Mostrando elemento ${index + 1}:`, el.tagName, el.classList.toString());
                } else {
                    el.style.display = 'block';
                    console.log(`🔑 [APP.JS] Mostrando elemento ${index + 1}:`, el.tagName, el.classList.toString());
                }
            }
        });
    } else {
        console.log('🔑 [APP.JS] Rol NO-ADMIN, ocultando elementos admin-only');
        document.querySelectorAll('.admin-only').forEach(el => {
            if (!el.classList.contains('tab-content')) {
                el.style.display = 'none';
            }
        });
    }

    // Manejar elementos supervisor-only (para supervisor y admin)
    if (role === 'admin' || role === 'supervisor') {
        console.log('🔑 [APP.JS] Rol SUPERVISOR/ADMIN detectado, mostrando elementos supervisor-only');
        const supervisorElements = document.querySelectorAll('.supervisor-only');
        console.log('🔑 [APP.JS] Elementos supervisor-only encontrados:', supervisorElements.length);

        supervisorElements.forEach((el, index) => {
            if (el.tagName === 'A' || el.tagName === 'BUTTON') {
                el.style.display = 'flex';
                console.log(`🔑 [APP.JS] Mostrando elemento supervisor ${index + 1}:`, el.tagName, el.classList.toString());
            } else {
                el.style.display = 'block';
                console.log(`🔑 [APP.JS] Mostrando elemento supervisor ${index + 1}:`, el.tagName, el.classList.toString());
            }
        });
    } else {
        console.log('🔑 [APP.JS] Rol TECNICO, ocultando elementos supervisor-only');
        document.querySelectorAll('.supervisor-only').forEach(el => {
            el.style.display = 'none';
        });
    }

    console.log('👤 Permisos aplicados para rol:', role);
}

async function logout() {
    if (!confirm('¿Está seguro que desea cerrar sesión?')) {
        return;
    }

    console.log('🔴 [LOGOUT] Cerrando sesión...');

    try {
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

        if (refreshToken) {
            console.log('🔴 [LOGOUT] Enviando petición de logout al servidor...');
            await fetchWithAuth(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                body: JSON.stringify({ refreshToken })
            });
            console.log('🔴 [LOGOUT] Sesión cerrada en el servidor');
        }
    } catch (error) {
        console.error('❌ [LOGOUT] Error al cerrar sesión en servidor:', error);
        // Continuar con el logout local aunque falle el servidor
    } finally {
        console.log('🔴 [LOGOUT] Limpiando datos locales...');
        clearAuthData();
        console.log('🔴 [LOGOUT] Redirigiendo a login...');
        window.location.href = 'login.html';
    }
}

// ========================================
// TEMA (CLARO/OSCURO)
// ========================================

// Función de notificaciones toast
function showNotification(message, type = 'info') {
    // Buscar o crear contenedor de notificaciones
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // Estilos según tipo
    const colors = {
        success: { bg: '#10b981', icon: '✅' },
        error: { bg: '#ef4444', icon: '❌' },
        warning: { bg: '#f59e0b', icon: '⚠️' },
        info: { bg: '#3b82f6', icon: 'ℹ️' }
    };
    const config = colors[type] || colors.info;

    notification.style.cssText = `
        background: ${config.bg};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    `;

    notification.innerHTML = `<span>${config.icon}</span><span>${message}</span>`;
    container.appendChild(notification);

    // Agregar animación CSS si no existe
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Auto-remover después de 4 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

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

// ========================================
// EVENT LISTENERS
// ========================================

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

    // Selector de vistas móvil (Habitaciones | Alertas)
    setupMobileViewSelector();

    // Toggle de filtros para móvil
    setupFiltrosToggle();

    // Buscadores
    setupSearchListeners();

    // Gestión de usuarios (solo admin)
    setupUsuariosListeners();

    console.log('✅ Event listeners configurados');
}

// Función para manejar el toggle de filtros en móvil
function setupFiltrosToggle() {
    // Toggle para Habitaciones
    const toggleBtn = document.getElementById('toggleFiltros');
    const contenedorFiltros = document.getElementById('contenedorFiltros');

    if (toggleBtn && contenedorFiltros) {
        // Asegurar que empiece cerrado (remover clase 'show' si existe)
        contenedorFiltros.classList.remove('show');
        toggleBtn.classList.remove('active');

        toggleBtn.addEventListener('click', () => {
            contenedorFiltros.classList.toggle('show');
            toggleBtn.classList.toggle('active');

            const isOpen = contenedorFiltros.classList.contains('show');
            localStorage.setItem('filtrosOpen', isOpen);
            console.log('🔄 Filtros toggled:', isOpen ? 'ABIERTO' : 'CERRADO');
        });

        // Solo abrir si el usuario lo abrió previamente
        const filtrosOpen = localStorage.getItem('filtrosOpen');
        console.log('📱 Estado inicial filtros desde localStorage:', filtrosOpen);

        if (filtrosOpen === 'true') {
            contenedorFiltros.classList.add('show');
            toggleBtn.classList.add('active');
            console.log('✅ Filtros abiertos (preferencia guardada)');
        } else {
            console.log('✅ Filtros cerrados (estado por defecto)');
        }
    }

    // Toggle para Espacios Comunes
    const toggleBtnEspacios = document.getElementById('toggleFiltrosEspacios');
    const contenedorFiltrosEspacios = document.getElementById('contenedorFiltrosEspacios');

    if (toggleBtnEspacios && contenedorFiltrosEspacios) {
        // Asegurar que empiece cerrado
        contenedorFiltrosEspacios.classList.remove('show');
        toggleBtnEspacios.classList.remove('active');

        toggleBtnEspacios.addEventListener('click', () => {
            contenedorFiltrosEspacios.classList.toggle('show');
            toggleBtnEspacios.classList.toggle('active');

            const isOpen = contenedorFiltrosEspacios.classList.contains('show');
            localStorage.setItem('filtrosEspaciosOpen', isOpen);
        });

        const filtrosEspaciosOpen = localStorage.getItem('filtrosEspaciosOpen');
        if (filtrosEspaciosOpen === 'true') {
            contenedorFiltrosEspacios.classList.add('show');
            toggleBtnEspacios.classList.add('active');
        }
    }

    // Toggle para Sábana
    const toggleBtnSabana = document.getElementById('toggleFiltrosSabana');
    const contenedorFiltrosSabana = document.getElementById('contenedorFiltrosSabana');

    if (toggleBtnSabana && contenedorFiltrosSabana) {
        // Asegurar que empiece cerrado
        contenedorFiltrosSabana.classList.remove('show');
        toggleBtnSabana.classList.remove('active');

        toggleBtnSabana.addEventListener('click', () => {
            contenedorFiltrosSabana.classList.toggle('show');
            toggleBtnSabana.classList.toggle('active');

            const isOpen = contenedorFiltrosSabana.classList.contains('show');
            localStorage.setItem('filtrosSabanaOpen', isOpen);
        });

        const filtrosSabanaOpen = localStorage.getItem('filtrosSabanaOpen');
        if (filtrosSabanaOpen === 'true') {
            contenedorFiltrosSabana.classList.add('show');
            toggleBtnSabana.classList.add('active');
        }
    }

    // Toggle para Tareas
    const toggleBtnTareas = document.getElementById('toggleFiltrosTareas');
    const contenedorFiltrosTareas = document.getElementById('contenedorFiltrosTareas');

    if (toggleBtnTareas && contenedorFiltrosTareas) {
        // Asegurar que empiece cerrado
        contenedorFiltrosTareas.classList.remove('show');
        toggleBtnTareas.classList.remove('active');

        toggleBtnTareas.addEventListener('click', () => {
            contenedorFiltrosTareas.classList.toggle('show');
            toggleBtnTareas.classList.toggle('active');

            const isOpen = contenedorFiltrosTareas.classList.contains('show');
            localStorage.setItem('filtrosTareasOpen', isOpen);
        });

        const filtrosTareasOpen = localStorage.getItem('filtrosTareasOpen');
        if (filtrosTareasOpen === 'true') {
            contenedorFiltrosTareas.classList.add('show');
            toggleBtnTareas.classList.add('active');
        }
    }
}

function setupSearchListeners() {
    // Buscador de Sábana
    const buscarSabana = document.getElementById('buscarSabana');
    if (buscarSabana) {
        buscarSabana.addEventListener('input', () => {
            filterSabana();
        });
    }

    // Filtros de Sábana
    const filtroEdificioSabana = document.getElementById('filtroEdificioSabana');
    if (filtroEdificioSabana) {
        filtroEdificioSabana.addEventListener('change', () => {
            filterSabana();
        });
    }

    const filtroServicioActual = document.getElementById('filtroServicioActual');
    if (filtroServicioActual) {
        filtroServicioActual.addEventListener('change', (e) => {
            cambiarServicioActual(e.target.value);
        });
    }

    const filtroEstadoServicio = document.getElementById('filtroEstadoServicio');
    if (filtroEstadoServicio) {
        filtroEstadoServicio.addEventListener('change', () => {
            filterSabana();
        });
    }

    // Buscador de Checklist
    const buscarChecklist = document.getElementById('buscarChecklist');
    if (buscarChecklist) {
        buscarChecklist.addEventListener('input', (e) => {
            filterChecklist(e.target.value);
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

    // Filtro de estado de checklist
    const filtroEstadoChecklist = document.getElementById('filtroEstadoChecklist');
    if (filtroEstadoChecklist) {
        filtroEstadoChecklist.addEventListener('change', (e) => {
            filterChecklistByEstado(e.target.value);
        });
    }

    // Filtros de espacios comunes
    const buscarEspacioInput = document.getElementById('buscarEspacio');
    const buscarServicioInput = document.getElementById('buscarServicioEspacio');
    const filtroTipoSelect = document.getElementById('filtroTipoEspacio');
    const filtroPrioridadSelect = document.getElementById('filtroPrioridadEspacio');
    const filtroEstadoSelect = document.getElementById('filtroEstadoEspacio');

    if (buscarEspacioInput) buscarEspacioInput.addEventListener('input', filterEspaciosComunes);
    if (buscarServicioInput) buscarServicioInput.addEventListener('input', filterEspaciosComunes);
    if (filtroTipoSelect) filtroTipoSelect.addEventListener('change', filterEspaciosComunes);
    if (filtroPrioridadSelect) filtroPrioridadSelect.addEventListener('change', filterEspaciosComunes);
    if (filtroEstadoSelect) filtroEstadoSelect.addEventListener('change', filterEspaciosComunes);
}

function filterEspaciosComunes() {
    const buscarEspacio = document.getElementById('buscarEspacio')?.value.toLowerCase() || '';
    const buscarServicio = document.getElementById('buscarServicioEspacio')?.value.toLowerCase() || '';
    const tipoFiltro = document.getElementById('filtroTipoEspacio')?.value || '';
    const prioridadFiltro = document.getElementById('filtroPrioridadEspacio')?.value || '';
    const estadoFiltro = document.getElementById('filtroEstadoEspacio')?.value || '';

    // Usar AppState para acceder a los datos globales
    const espaciosComunes = AppState.espaciosComunes || [];
    const mantenimientosEspacios = AppState.mantenimientosEspacios || [];

    const espaciosFiltrados = espaciosComunes.filter(espacio => {
        const coincideNombre = !buscarEspacio || espacio.nombre.toLowerCase().includes(buscarEspacio);
        const coincideTipo = !tipoFiltro || espacio.tipo === tipoFiltro;
        const coincideEstado = !estadoFiltro || espacio.estado === estadoFiltro;

        const mantenimientosEspacio = mantenimientosEspacios.filter(m => m.espacio_comun_id === espacio.id);
        const coincideServicio = !buscarServicio || mantenimientosEspacio.some(m =>
            m.descripcion.toLowerCase().includes(buscarServicio)
        );

        const coincidePrioridad = !prioridadFiltro || mantenimientosEspacio.some(m =>
            m.prioridad === prioridadFiltro
        );

        return coincideNombre && coincideTipo && coincideEstado && coincideServicio && coincidePrioridad;
    });

    const mensajeNoResultados = document.getElementById('mensajeNoEspacios');
    const lista = document.getElementById('listaEspaciosComunes');

    if (espaciosFiltrados.length === 0) {
        if (mensajeNoResultados) mensajeNoResultados.style.display = 'block';
        if (lista) lista.style.display = 'none';
    } else {
        if (mensajeNoResultados) mensajeNoResultados.style.display = 'none';
        if (lista) lista.style.display = 'grid';

        // Actualizar espacios filtrados y mostrar usando nueva función
        if (window.mostrarEspaciosComunes) {
            // Guardar espacios originales
            const espaciosOriginales = AppState.espaciosComunes;

            // Temporalmente reemplazar con filtrados
            AppState.espaciosComunes = espaciosFiltrados;

            // Llamar a la nueva función de renderizado
            window.mostrarEspaciosComunes();

            // Restaurar espacios originales
            AppState.espaciosComunes = espaciosOriginales;
        }
    }
}

function setupUsuariosListeners() {
    // Búsqueda por texto
    const buscarUsuario = document.getElementById('buscarUsuario');
    if (buscarUsuario) {
        buscarUsuario.addEventListener('input', (e) => {
            AppState.usuariosFiltro = e.target.value;
            renderUsuariosList();
        });
    }

    // Filtro por rol
    const filtroRolUsuario = document.getElementById('filtroRolUsuario');
    if (filtroRolUsuario) {
        filtroRolUsuario.addEventListener('change', () => {
            renderUsuariosList();
        });
    }

    // Filtro por estado
    const filtroEstadoUsuario = document.getElementById('filtroEstadoUsuario');
    if (filtroEstadoUsuario) {
        filtroEstadoUsuario.addEventListener('change', () => {
            renderUsuariosList();
        });
    }

    // Formulario de usuario
    const usuarioForm = document.getElementById('formUsuario');
    if (usuarioForm) {
        usuarioForm.addEventListener('submit', handleUsuarioFormSubmit);
    }

    // Cerrar modal de usuario con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modalUsuario');
            if (modal && modal.style.display !== 'none') {
                cerrarModalUsuario();
            }
        }
    });
}

// ========================================
// SELECTOR DE VISTAS MÓVIL
// ========================================

function setupMobileViewSelector() {
    // Buscar todos los selectores en diferentes tabs
    const tabContents = document.querySelectorAll('.tab-content');

    tabContents.forEach(tab => {
        const selector = tab.querySelector('.mobile-view-selector');
        if (!selector) return;

        const viewButtons = selector.querySelectorAll('.view-btn');
        const vistaDuo = tab.querySelector('.vista-duo');

        if (!vistaDuo) return;

        const columnaHabitaciones = vistaDuo.querySelector('.columna-principal');
        const columnaAlertas = vistaDuo.querySelector('.columna-lateral');

        // Verificar si estamos en el tab de checklist
        const isChecklistTab = tab.id === 'tab-checklist';

        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.getAttribute('data-view');

                // Actualizar botones activos solo en este selector
                viewButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                if (isChecklistTab) {
                    // En checklist tab: alternar entre grid y paneles laterales
                    const checklistGrid = columnaHabitaciones?.querySelector('.checklist-grid');
                    const paginacion = columnaHabitaciones?.querySelector('.checklist-pagination');

                    if (view === 'checklists') {
                        // Mostrar grid de checklists
                        if (columnaHabitaciones) columnaHabitaciones.style.display = 'block';
                        if (checklistGrid) checklistGrid.style.display = 'grid';
                        if (paginacion) paginacion.style.display = 'block';
                        if (columnaAlertas) columnaAlertas.style.display = 'none';
                    } else if (view === 'inspecciones') {
                        // Ocultar columna principal completa y mostrar paneles laterales
                        if (columnaHabitaciones) columnaHabitaciones.style.display = 'none';
                        if (checklistGrid) checklistGrid.style.display = 'none';
                        if (paginacion) paginacion.style.display = 'none';
                        if (columnaAlertas) columnaAlertas.style.display = 'block';
                    }
                } else {
                    // Otros tabs: comportamiento normal (alternar columnas)
                    if (view === 'habitaciones' || view === 'tareas') {
                        if (columnaHabitaciones) columnaHabitaciones.style.display = 'block';
                        if (columnaAlertas) columnaAlertas.style.display = 'none';
                    } else if (view === 'alertas') {
                        if (columnaHabitaciones) columnaHabitaciones.style.display = 'none';
                        if (columnaAlertas) columnaAlertas.style.display = 'block';
                    }
                }
            });
        });
    });
}

// ========================================
// NAVEGACIÓN ENTRE TABS
// ========================================

function initializeNavigation() {
    // Verificar si hay un parámetro de URL
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');

    if (view) {
        switchTab(view === 'admin' ? 'usuarios' : 'habitaciones', false);
    } else {
        switchTab('habitaciones', false);
    }
}

function switchTab(tabId, loadData = true) {
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

    // Cargar datos específicos del tab solo si se solicita
    if (loadData) {
        loadTabData(tabId);
    }

    console.log('📄 Tab activo:', tabId);
}

function loadTabData(tabId) {
    console.log('📁 [APP.JS] loadTabData INICIANDO - Tab:', tabId);
    console.log('📁 [APP.JS] Timestamp:', new Date().toISOString());
    
    switch (tabId) {
        case 'habitaciones':
            console.log('📁 [APP.JS] Procesando tab: habitaciones');
            if (window.renderHabitacionesUI) {
                console.log('📁 [APP.JS] Llamando renderHabitacionesUI...');
                window.renderHabitacionesUI('tab-switch');
            } else if (window.mostrarCuartos) {
                console.log('📁 [APP.JS] Llamando mostrarCuartos...');
                window.mostrarCuartos();
            } else {
                console.warn('📁 [APP.JS] Ni renderHabitacionesUI ni mostrarCuartos disponibles!');
            }
            break;
        case 'espacios':
            loadEspaciosComunesData();
            break;
        case 'sabana':
            loadSabanaData();
            break;
        case 'checklist':
            loadChecklistData();
            initChecklistEventListeners();
            break;
        case 'usuarios':
            if (AppState.currentUser.role === 'admin') {
                loadUsuariosData();
            }
            break;
        case 'tareas':
            // Ensure module is loaded
            if (window.ensureTareasModule) {
                window.ensureTareasModule();
            }
            // Load task cards
            if (window.refrescarTarjetasTareas) {
                window.refrescarTarjetasTareas();
            }
            // Load upcoming deadlines
            if (window.cargarProximosVencimientos) {
                window.cargarProximosVencimientos();
            }
            break;
    }
}

async function loadUsuariosData() {
    console.log('👥 Cargando datos de usuarios...');
    
    // Si ya hay usuarios cargados, solo renderizar (no mostrar skeleton)
    if (AppState.usuarios && AppState.usuarios.length > 0) {
        console.log('👥 [USUARIOS] Usando datos en caché:', AppState.usuarios.length);
        renderUsuariosList();
        return;
    }
    
    // Primera carga: cargar roles y usuarios
    await cargarRoles();
    await cargarUsuarios();
}

// ========================================
// CARGAR DATOS INICIALES
// ========================================

async function loadInitialData() {
    try {
        console.log('📥 [LOAD-DATA] Cargando datos iniciales desde API...');

        // Cargar edificios
        try {
            console.log('📥 [LOAD-DATA] Cargando edificios...');
            const edifResponse = await fetchWithAuth(`${API_BASE_URL}/api/edificios`);
            if (edifResponse.ok) {
                AppState.edificios = await edifResponse.json();
                console.log('✅ [LOAD-DATA] Edificios cargados:', AppState.edificios.length);
            } else {
                console.error('❌ [LOAD-DATA] Error cargando edificios');
                AppState.edificios = [];
            }
        } catch (error) {
            console.error('❌ [LOAD-DATA] Error en edificios:', error);
            AppState.edificios = [];
        }

        // Cargar cuartos
        try {
            console.log('📥 [LOAD-DATA] Cargando cuartos...');
            const cuartosResponse = await fetchWithAuth(`${API_BASE_URL}/api/cuartos`);
            if (cuartosResponse.ok) {
                AppState.cuartos = await cuartosResponse.json();
                console.log('✅ [LOAD-DATA] Cuartos cargados:', AppState.cuartos.length);
            } else {
                console.error('❌ [LOAD-DATA] Error cargando cuartos');
                AppState.cuartos = [];
            }
        } catch (error) {
            console.error('❌ [LOAD-DATA] Error en cuartos:', error);
            AppState.cuartos = [];
        }

        // Cargar espacios comunes
        try {
            console.log('📥 [LOAD-DATA] Cargando espacios comunes...');
            const espaciosResponse = await fetchWithAuth(`${API_BASE_URL}/api/espacios-comunes`);
            if (espaciosResponse.ok) {
                AppState.espaciosComunes = await espaciosResponse.json();
                console.log('✅ [LOAD-DATA] Espacios comunes cargados:', AppState.espaciosComunes.length);
            } else {
                console.warn('⚠️ [LOAD-DATA] Error cargando espacios comunes');
                AppState.espaciosComunes = [];
            }
        } catch (error) {
            console.error('❌ [LOAD-DATA] Error en espacios comunes:', error);
            AppState.espaciosComunes = [];
        }

        console.log('✅ [LOAD-DATA] Datos iniciales cargados');
    } catch (error) {
        console.error('❌ [LOAD-DATA] Error general cargando datos iniciales:', error);
    }
}


// ========================================
// SÁBANA - REGISTRO DE SERVICIOS (CONECTADO A BD)
// ========================================

async function loadSabanaData() {
    console.log('📋 [SABANA] Cargando datos de sábana de servicios desde BD...');

    const tbody = document.getElementById('sabanaTableBody');
    if (!tbody) {
        console.error('❌ [SABANA] No se encontró #sabanaTableBody');
        return;
    }

    if (AppState.cuartos.length === 0) {
        console.warn('⚠️ [SABANA] No hay cuartos cargados aún');
    }

    // Solo cargar la lista de sábanas si el select está vacío
    const selectServicio = document.getElementById('filtroServicioActual');
    if (selectServicio && selectServicio.options.length <= 1) {
        console.log('📋 [SABANA] Cargando lista de sábanas por primera vez');
        const sabanas = await window.cargarListaSabanas();

        // Cargar la última sábana creada por defecto
        if (sabanas && sabanas.length > 0) {
            const sabanasActivas = sabanas.filter(s => !s.archivada);
            if (sabanasActivas.length > 0) {
                // Ordenar por fecha_creacion DESC y obtener la primera (más reciente)
                const ultimaSabana = sabanasActivas.sort((a, b) =>
                    new Date(b.fecha_creacion) - new Date(a.fecha_creacion)
                )[0];

                console.log('⭐ [SABANA] Cargando última sábana por defecto:', ultimaSabana.nombre);
                selectServicio.value = ultimaSabana.id;
                await window.cambiarServicioActual(ultimaSabana.id);
            }
        }
    } else {
        console.log('📋 [SABANA] Select ya tiene opciones, no recargar');
    }

    // Solo mostrar mensaje si no hay sábana seleccionada
    if (!selectServicio || !selectServicio.value) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Selecciona o crea una sábana para comenzar.</td></tr>';

        const tituloEl = document.getElementById('tituloServicioActual');
        if (tituloEl) {
            tituloEl.textContent = 'Sábana de Servicios';
        }
    } else {
        console.log('📋 [SABANA] Ya hay una sábana seleccionada, mantener tabla');
    }
}

// FUNCIÓN OBSOLETA - Ahora se usa la de sabana-functions.js
// Esta función ya no se usa, se mantiene solo por compatibilidad
function renderSabanaTable_OLD(data) {
    console.warn('⚠️ Llamando a función obsoleta renderSabanaTable_OLD - usar sabana-functions.js');
    const tbody = document.getElementById('sabanaTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No hay registros para este servicio. Usa el botón "+ Nueva" para crear la sábana.</td></tr>';
        return;
    }

    // Lazy loading con Intersection Observer
    const BATCH_SIZE = 20; // Renderizar en lotes de 20
    let currentIndex = 0;

    const renderBatch = () => {
        const endIndex = Math.min(currentIndex + BATCH_SIZE, data.length);
        const fragment = document.createDocumentFragment();

        for (let i = currentIndex; i < endIndex; i++) {
            const row = data[i];
            const tr = document.createElement('tr');
            tr.className = row.realizado ? 'servicio-realizado' : 'servicio-pendiente';
            tr.setAttribute('data-lazy', 'true');

            tr.innerHTML = `
                <td data-label="Edificio">${row.edificio}</td>
                <td data-label="Habitación"><strong>${row.habitacion}</strong></td>
                <td data-label="Fecha Programada">${formatFecha(row.fechaProgramada)}</td>
                <td data-label="Fecha Realizado">
                    ${row.fechaRealizado ? formatFecha(row.fechaRealizado) : '<span style="color: #999;">-</span>'}
                </td>
                <td data-label="Responsable">${row.responsable}</td>
                <td data-label="Observaciones">
                    <input 
                        type="text" 
                        class="input-observaciones" 
                        value="${row.observaciones}" 
                        placeholder="Agregar observaciones..."
                        onchange="updateObservaciones('${row.tipoServicio}', ${row.id}, this.value)"
                        ${!row.realizado ? 'disabled' : ''}
                    >
                </td>
                <td data-label="Realizado" style="text-align: center;">
                    <input 
                        type="checkbox" 
                        class="checkbox-sabana" 
                        ${row.realizado ? 'checked' : ''}
                        onchange="toggleServicioRealizado('${row.tipoServicio}', ${row.id})"
                    >
                </td>
            `;
            fragment.appendChild(tr);
        }

        tbody.appendChild(fragment);
        currentIndex = endIndex;

        // Si quedan más filas, preparar el sentinel
        if (currentIndex < data.length) {
            const sentinel = document.createElement('tr');
            sentinel.className = 'lazy-sentinel';
            sentinel.innerHTML = '<td colspan="7" style="height: 1px;"></td>';
            tbody.appendChild(sentinel);

            // Observer para cargar siguiente lote
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        observer.disconnect();
                        sentinel.remove();
                        setTimeout(renderBatch, 50); // Pequeño delay para suavidad
                    }
                });
            }, { rootMargin: '200px' });

            observer.observe(sentinel);
        }
    };

    // Iniciar primer lote
    renderBatch();
}

// FUNCIÓN OBSOLETA - Ahora se usa la de sabana-functions.js
function cambiarServicioActual_OLD(servicioId) {
    console.warn('⚠️ Llamando a función obsoleta cambiarServicioActual_OLD - usar sabana-functions.js');
    const serviciosPersonalizados = JSON.parse(localStorage.getItem('serviciosPersonalizados') || '[]');
    const servicio = serviciosPersonalizados.find(s => s.id === servicioId);

    const nombreServicio = servicio?.nombre || 'Servicio';

    // Actualizar título
    const tituloEl = document.getElementById('tituloServicioActual');
    if (tituloEl) {
        tituloEl.textContent = `Sábana de ${nombreServicio}`;
    }

    // Cargar datos del servicio
    const allData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const servicioData = allData[servicioId] || [];

    renderSabanaTable_OLD(servicioData);
    updateServiciosStats(servicioData);
}

function updateServiciosStats(data) {
    const completados = data.filter(s => s.realizado).length;
    const total = data.length;

    const completadosEl = document.getElementById('serviciosCompletados');
    const totalesEl = document.getElementById('serviciosTotales');

    if (completadosEl) completadosEl.textContent = completados;
    if (totalesEl) totalesEl.textContent = total;
}

function toggleServicioRealizado(tipoServicio, cuartoId) {
    const allData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const servicioData = allData[tipoServicio] || [];
    const servicio = servicioData.find(s => s.id === cuartoId);

    if (servicio) {
        servicio.realizado = !servicio.realizado;
        if (servicio.realizado && !servicio.fechaRealizado) {
            servicio.fechaRealizado = new Date().toISOString().split('T')[0];
        } else if (!servicio.realizado) {
            servicio.fechaRealizado = '';
            servicio.observaciones = '';
        }
        allData[tipoServicio] = servicioData;
        localStorage.setItem('sabanaServiciosData', JSON.stringify(allData));

        // Recargar la vista actual
        cambiarServicioActual(tipoServicio);
        console.log(`✅ Servicio ${servicio.realizado ? 'marcado como realizado' : 'marcado como pendiente'} - ${servicio.habitacion}`);
    }
}

function updateObservaciones(tipoServicio, cuartoId, observaciones) {
    const allData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const servicioData = allData[tipoServicio] || [];
    const servicio = servicioData.find(s => s.id === cuartoId);

    if (servicio) {
        servicio.observaciones = observaciones;
        allData[tipoServicio] = servicioData;
        localStorage.setItem('sabanaServiciosData', JSON.stringify(allData));
        console.log(`📝 Observaciones actualizadas para habitación ${servicio.habitacion}`);
    }
}

// FUNCIÓN OBSOLETA - Ahora se usa filterSabana de sabana-functions.js
function filterSabana_OLD() {
    console.warn('⚠️ Llamando a función obsoleta filterSabana_OLD - usar sabana-functions.js');
    const searchTerm = document.getElementById('buscarSabana')?.value.toLowerCase() || '';
    const edificioFiltro = document.getElementById('filtroEdificioSabana')?.value || '';
    const estadoFiltro = document.getElementById('filtroEstadoServicio')?.value || '';
    const servicioActual = document.getElementById('filtroServicioActual')?.value || 'cambio_chapas';

    const allData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const servicioData = allData[servicioActual] || [];

    const filtered = servicioData.filter(row => {
        const matchSearch = !searchTerm ||
            row.habitacion.toLowerCase().includes(searchTerm) ||
            row.edificio.toLowerCase().includes(searchTerm) ||
            row.responsable.toLowerCase().includes(searchTerm);

        const matchEdificio = !edificioFiltro || row.edificio === edificioFiltro;
        const matchEstado = !estadoFiltro ||
            (estadoFiltro === 'realizado' && row.realizado) ||
            (estadoFiltro === 'pendiente' && !row.realizado);

        return matchSearch && matchEdificio && matchEstado;
    });

    renderSabanaTable_OLD(filtered);
    updateServiciosStats(filtered);
}

function formatFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ⚠️ DELEGADOR: NO REDEFINIR - Usar solo la función de sabana-functions.js
// La función real está en sabana-functions.js con soporte a BD
// Al no redefinir aquí, window.exportarSabanaExcel permanece apuntando a la versión correcta

// Esto evita conflictos de carga y recursión infinita:
// - Si definimos función aquí → sobrescribe window.exportarSabanaExcel
// - Cuando se llama, busca window.exportarSabanaExcel → encuentra la que acaba de definir
// - Resultado: recursión infinita

// SOLUCIÓN: Dejar que sabana-functions.js defina la función directamente sin intermediarios

// ⚠️ NOTA: abrirModalNuevaSabana está definida en sabana-functions.js
// No se redefine aquí para evitar conflictos de versión

// ⚠️ NOTA: toggleTipoServicioModal está definida en sabana-functions.js
// No se redefine aquí para evitar conflictos de versión

// ⚠️ NOTA: cerrarModalNuevaSabana está definida en sabana-functions.js
// No se redefine aquí - usar la versión de sabana-functions.js

// ⚠️ NOTA: confirmarNuevaSabana está definida en sabana-functions.js
// No se redefine aquí - usar la versión de sabana-functions.js


// FUNCIONES DE SÁBANA MOVIDAS A sabana-functions.js
// Las funciones están en sabana-functions.js y son accedidas vía window.*

// ========================================
// CHECKLIST - INSPECCIONES
// ========================================

const CHECKLIST_ESTADOS = ['bueno', 'regular', 'malo'];
const CHECKLIST_ESTADO_LABELS = {
    bueno: 'Bueno',
    regular: 'Regular',
    malo: 'Malo'
};

// Datos mock de inspecciones recientes
const DEFAULT_INSPECCIONES_RECIENTES = [
    { habitacion: 'A101', titulo: 'Revisión completa AC', tecnico: 'María López', fecha: 'Hoy · 09:15 AM', estado: 'pendiente' },
    { habitacion: '201', titulo: 'Cambio de Filtros', tecnico: 'Carlos Ruiz', fecha: 'Ayer · 04:45 PM', estado: 'aprobada' },
    { habitacion: '203', titulo: 'Inspección TV', tecnico: 'Ana García', fecha: 'Ayer · 02:20 PM', estado: 'aprobada' }
];

// Flag para controlar si el checklist ya fue cargado
let checklistCargado = false;

/**
 * Forzar recarga del checklist (resetea el flag y recarga)
 * Usar después de agregar/eliminar secciones o ítems
 */
function recargarChecklistData() {
    console.log('🔄 [APP.JS] Forzando recarga de checklist...');
    checklistCargado = false;
    loadChecklistData();
}

function loadChecklistData() {
    console.log('📋 [APP.JS] loadChecklistData() llamado');

    // Si ya está cargado, no mostrar skeleton ni recargar
    if (checklistCargado) {
        console.log('📋 [APP.JS] Checklist ya cargado, omitiendo recarga');
        return;
    }

    // Limpiar datos antiguos del localStorage para asegurar sincronización con BD
    // Los datos frescos se cargarán desde la API
    localStorage.removeItem('checklistData');
    console.log('🗑️ [APP.JS] Cache de checklistData limpiado');

    // Si existe la función de checklist-tab.js que usa la API, usarla
    if (typeof loadChecklistDataFromAPI === 'function') {
        console.log('📋 [APP.JS] Delegando a loadChecklistDataFromAPI()...');
        return loadChecklistDataFromAPI();
    }

    // Si existe ChecklistAPI, cargar desde la API
    if (typeof ChecklistAPI !== 'undefined') {
        console.log('📋 [APP.JS] ChecklistAPI disponible, cargando desde BD...');
        return loadChecklistFromAPIFallback();
    }

    console.warn('⚠️ [APP.JS] ChecklistAPI no disponible, usando fallback local');
    loadChecklistDataLocal();
}

/**
 * Genera HTML de skeleton loading para el grid de checklist
 * @param {number} count - Número de skeletons a generar
 * @returns {string} HTML del skeleton
 */
function generarSkeletonChecklist(count = 6) {
    const itemWidths = ['60%', '75%', '50%', '80%', '65%', '70%'];
    
    const skeletonCard = (index) => `
        <div class="skeleton-checklist-card" style="animation-delay: ${index * 0.1}s">
            <div class="skeleton-checklist-header">
                <div class="skeleton-room-badge"></div>
                <div class="skeleton-edificio"></div>
            </div>
            <div class="skeleton-stats">
                <div class="skeleton-stat">
                    <div class="skeleton-stat-dot" style="background: #22c55e"></div>
                    <div class="skeleton-stat-value"></div>
                </div>
                <div class="skeleton-stat">
                    <div class="skeleton-stat-dot" style="background: #f59e0b"></div>
                    <div class="skeleton-stat-value"></div>
                </div>
                <div class="skeleton-stat">
                    <div class="skeleton-stat-dot" style="background: #ef4444"></div>
                    <div class="skeleton-stat-value"></div>
                </div>
            </div>
            <div class="skeleton-items-list">
                ${[0,1,2,3,4].map(i => `
                    <div class="skeleton-item">
                        <div class="skeleton-item-name" style="width: ${itemWidths[i % itemWidths.length]}"></div>
                        <div class="skeleton-item-buttons">
                            <div class="skeleton-btn"></div>
                            <div class="skeleton-btn"></div>
                            <div class="skeleton-btn"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="skeleton-footer">
                <div class="skeleton-editor"></div>
                <div class="skeleton-date"></div>
            </div>
        </div>
    `;

    return Array.from({ length: count }, (_, i) => skeletonCard(i)).join('');
}

// Función de fallback para cargar desde API
async function loadChecklistFromAPIFallback() {
    const grid = document.getElementById('checklistGrid');
    if (!grid) return;

    grid.innerHTML = generarSkeletonChecklist(6);

    try {
        // Cargar categorías
        const categorias = await ChecklistAPI.getCategorias();
        console.log('📋 [APP.JS] Categorías desde API:', categorias.length);

        AppState.checklistCategorias = categorias.map(cat => ({
            id: cat.slug || cat.id.toString(),
            db_id: cat.id,
            nombre: cat.nombre,
            icono: cat.icono || 'fa-layer-group',
            orden: cat.orden
        }));

        // Cargar datos de checklist
        const checklistData = await ChecklistAPI.getAllChecklistData();
        console.log('📋 [APP.JS] Datos de cuartos desde API:', checklistData.length);

        // Guardar en localStorage como fuente de verdad para actualizaciones
        localStorage.setItem('checklistData', JSON.stringify(checklistData));
        console.log('💾 [APP.JS] Datos de checklist guardados en localStorage');

        AppState.checklistFiltradas = checklistData;
        AppState.checklistPagination.totalPages = Math.ceil(checklistData.length / AppState.checklistPagination.perPage);

        // Poblar filtros de edificios, editores e iconos
        poblarFiltroEdificiosChecklist();
        poblarFiltroEditoresChecklist();
        poblarSelectIconos();

        // Marcar como cargado para evitar recargar skeleton al volver al tab
        checklistCargado = true;
        console.log('✅ [APP.JS] Checklist marcado como cargado');

        renderChecklistCategorias();
        loadInspeccionesRecientes();
        renderChecklistGrid(checklistData);
        renderChecklistPagination();

    } catch (error) {
        console.error('❌ [APP.JS] Error cargando desde API:', error);
        loadChecklistDataLocal();
    }
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

    // Agregar opciones ordenadas
    edificios.sort().forEach(edificio => {
        const option = document.createElement('option');
        option.value = edificio;
        option.textContent = edificio;
        select.appendChild(option);
    });

    console.log('🏢 [APP.JS] Filtro de edificios poblado:', edificios);
}

/**
 * Poblar el select de filtro de editores con usuarios de la BD
 */
function poblarFiltroEditoresChecklist() {
    const select = document.getElementById('filtroEditorChecklist');
    if (!select) return;

    // Limpiar opciones existentes (excepto la primera "Todos")
    select.innerHTML = '<option value="">Todos los editores</option>';

    // Obtener usuarios desde AppState o localStorage
    let usuarios = [];

    if (AppState.usuarios && AppState.usuarios.length > 0) {
        usuarios = AppState.usuarios;
    } else {
        // Intentar desde localStorage
        usuarios = JSON.parse(localStorage.getItem('users') || localStorage.getItem('usuariosData') || '[]');
    }

    // También extraer editores únicos de los datos de checklist
    const checklistData = JSON.parse(localStorage.getItem('checklistData') || '[]');
    const editoresSet = new Set();
    checklistData.forEach(hab => {
        if (hab.ultimo_editor) editoresSet.add(hab.ultimo_editor);
    });

    // Combinar usuarios de BD con editores encontrados en checklist
    const todosEditores = new Set([
        ...usuarios.map(u => u.nombre),
        ...editoresSet
    ]);

    // Agregar opciones ordenadas
    Array.from(todosEditores).filter(Boolean).sort().forEach(editor => {
        const option = document.createElement('option');
        option.value = editor;
        option.textContent = editor;
        select.appendChild(option);
    });

    console.log('👥 [APP.JS] Filtro de editores poblado:', Array.from(todosEditores));
}

/**
 * Poblar el select de iconos para nuevas secciones desde la API
 */
async function poblarSelectIconos() {
    const select = document.getElementById('seccionIcono');
    if (!select) return;

    try {
        const response = await fetch('/api/checklist/iconos');
        if (!response.ok) throw new Error('Error al obtener iconos');

        const iconos = await response.json();

        // Limpiar y poblar
        select.innerHTML = '';
        iconos.forEach(icono => {
            const option = document.createElement('option');
            option.value = icono.value;
            option.textContent = `${icono.emoji} ${icono.label}`;
            select.appendChild(option);
        });

        console.log('🎨 [APP.JS] Select de iconos poblado:', iconos.length, 'opciones');
    } catch (error) {
        console.error('❌ Error poblando iconos:', error);
        // Fallback con iconos básicos
        select.innerHTML = `
            <option value="fa-layer-group">📦 Genérico</option>
            <option value="fa-couch">🛋️ Mobiliario</option>
            <option value="fa-plug">🔌 Electrónica</option>
            <option value="fa-shower">🚿 Sanitarios</option>
        `;
    }
}

// Función local para cuando no hay API disponible
function loadChecklistDataLocal() {
    console.log('📋 [APP.JS] Cargando datos locales/mock de checklist...');

    const grid = document.getElementById('checklistGrid');
    if (!grid) return;

    // Si no hay categorías, usar defaults
    if (AppState.checklistCategorias.length === 0) {
        AppState.checklistCategorias = [
            { id: 'climatizacion', nombre: 'Climatización', icono: 'fa-temperature-half' },
            { id: 'electronica', nombre: 'Electrónica', icono: 'fa-plug' },
            { id: 'mobiliario', nombre: 'Mobiliario', icono: 'fa-couch' },
            { id: 'sanitarios', nombre: 'Sanitarios', icono: 'fa-shower' },
            { id: 'amenidades', nombre: 'Amenidades', icono: 'fa-concierge-bell' },
            { id: 'estructura', nombre: 'Estructura', icono: 'fa-door-open' }
        ];
    }

    // Si no hay items, usar defaults
    if (AppState.checklistItems.length === 0) {
        AppState.checklistItems = [
            { nombre: 'Aire acondicionado', categoria: 'climatizacion' },
            { nombre: 'Calefacción', categoria: 'climatizacion' },
            { nombre: 'Televisión', categoria: 'electronica' },
            { nombre: 'Sofá', categoria: 'mobiliario' },
            { nombre: 'Cama', categoria: 'mobiliario' },
            { nombre: 'Baño', categoria: 'sanitarios' },
            { nombre: 'Minibar', categoria: 'amenidades' },
            { nombre: 'Ventanas', categoria: 'estructura' }
        ];
    }

    // Renderizar categorías
    renderChecklistCategorias();

    // Cargar inspecciones recientes
    loadInspeccionesRecientes();

    // Usar cuartos de AppState si están disponibles
    const cuartosMock = AppState.cuartos.length > 0 ? AppState.cuartos.slice(0, 20) : [
        { id: 1, numero: 'S-A201', edificio_nombre: 'Alfa', estado: 'disponible' },
        { id: 2, numero: 'A204', edificio_nombre: 'Alfa', estado: 'disponible' },
        { id: 3, numero: 'A304', edificio_nombre: 'Alfa', estado: 'ocupado' },
        { id: 4, numero: 'A306', edificio_nombre: 'Alfa', estado: 'mantenimiento' }
    ];

    // Función para generar estados aleatorios realistas
    const generarEstadoAleatorio = () => {
        const rand = Math.random();
        if (rand < 0.6) return 'bueno';
        if (rand < 0.85) return 'regular';
        return 'malo';
    };

    const checklistData = cuartosMock.map((cuarto, idx) => ({
        cuarto_id: cuarto.id,
        numero: cuarto.numero,
        edificio: cuarto.edificio_nombre,
        estado_cuarto: cuarto.estado || 'disponible',
        ultimo_editor: ['Fidel', 'María', 'gael', 'raul'][idx % 4],
        items: AppState.checklistItems.map(item => ({
            nombre: item.nombre,
            categoria: item.categoria,
            estado: generarEstadoAleatorio()
        }))
    }));

    AppState.checklistFiltradas = checklistData;
    AppState.checklistPagination.totalPages = Math.ceil(checklistData.length / AppState.checklistPagination.perPage);

    renderChecklistGrid(checklistData);
    renderChecklistPagination();
}

function renderChecklistCategorias() {
    const container = document.getElementById('checklistCategoriasFiltro');
    if (!container) return;

    // Limpiar categorías existentes (excepto el botón "Todas")
    const existingBtns = container.querySelectorAll('.categoria-btn[data-categoria]:not([data-categoria=""])');
    existingBtns.forEach(btn => btn.remove());

    // Agregar event listener al botón "Todas"
    const btnTodas = container.querySelector('.categoria-btn[data-categoria=""]');
    if (btnTodas && !btnTodas.hasAttribute('data-listener-added')) {
        btnTodas.setAttribute('data-listener-added', 'true');
        btnTodas.onclick = () => filtrarChecklistPorCategoria('');
    }

    // Agregar categorías desde AppState
    AppState.checklistCategorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'categoria-btn';
        btn.setAttribute('data-categoria', cat.id);
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('data-categoria-btn', '');
        btn.type = 'button';
        btn.onclick = () => filtrarChecklistPorCategoria(cat.id);
        btn.innerHTML = `
            <div class="categoria-btn-icon" aria-hidden="true"><i class="fas ${cat.icono}"></i></div>
            <div class="categoria-btn-text"><span class="categoria-btn-label">${cat.nombre}</span><small>Ver ítems</small></div>
        `;
        container.appendChild(btn);
    });
}

function filtrarChecklistPorCategoria(categoriaId) {
    AppState.checklistFilters.categoria = categoriaId;
    AppState.checklistPagination.page = 1;

    // Actualizar estado visual de botones
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    const btnActivo = document.querySelector(`[data-categoria="${categoriaId}"]`);
    if (btnActivo) {
        btnActivo.classList.add('active');
        btnActivo.setAttribute('aria-pressed', 'true');
    }

    applyChecklistFilters();
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

        // Contar estados
        const counts = { bueno: 0, regular: 0, malo: 0 };
        habitacion.items.forEach(item => {
            if (counts[item.estado] !== undefined) counts[item.estado]++;
        });

        const numero = habitacion.numero;
        const edificioLabel = habitacion.edificio || 'Sin edificio';
        const totalItems = habitacion.items.length;

        // Estado de la habitación
        const estadoHabitacion = habitacion.estado_cuarto || 'disponible';
        const estadoConfig = {
            'disponible': { label: 'Disponible', icon: 'fa-circle-check', class: 'estado-disponible' },
            'ocupado': { label: 'Ocupada', icon: 'fa-user', class: 'estado-ocupado' },
            'mantenimiento': { label: 'Mantenimiento', icon: 'fa-wrench', class: 'estado-mantenimiento' }
        };
        const estadoInfo = estadoConfig[estadoHabitacion] || estadoConfig['disponible'];

        // Generar HTML de items
        const itemsHTML = habitacion.items.map((item, itemIndex) => buildChecklistItemHTML(habitacion, item, itemIndex)).join('');

        // Stats HTML
        const statsHTML = CHECKLIST_ESTADOS.map(estado => `
            <div class="checklist-card-stat ${estado}" data-estado="${estado}">
                <div class="checklist-card-stat-label">
                    <span class="semaforo-dot" aria-hidden="true"></span>
                    <span>${CHECKLIST_ESTADO_LABELS[estado]}</span>
                </div>
                <span class="checklist-card-stat-value">${counts[estado]}</span>
            </div>
        `).join('');

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
                        <button class="checklist-action-btn" title="Ver detalles">
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
                <input type="text" class="checklist-search-input" placeholder="Buscar en esta habitación..." data-card-id="${habitacion.cuarto_id}">
                <button class="checklist-search-clear" style="display: none;" title="Limpiar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="checklist-card-stats">${statsHTML}</div>
            <div class="checklist-items" role="list">${itemsHTML}</div>
        `;

        grid.appendChild(card);

        // Event listeners para búsqueda en card
        const searchInput = card.querySelector('.checklist-search-input');
        const clearBtn = card.querySelector('.checklist-search-clear');
        const itemsContainer = card.querySelector('.checklist-items');

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const items = itemsContainer.querySelectorAll('.checklist-item');
            clearBtn.style.display = searchTerm ? 'flex' : 'none';
            items.forEach(item => {
                const itemName = item.getAttribute('data-item') || '';
                item.style.display = itemName.includes(searchTerm) ? '' : 'none';
            });
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            itemsContainer.querySelectorAll('.checklist-item').forEach(item => item.style.display = '');
            searchInput.focus();
        });

        // Event listener para botón de detalles
        const actionBtn = card.querySelector('.checklist-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => openChecklistDetailsModal(habitacion.cuarto_id));
        }
    });
}

function buildChecklistItemHTML(habitacion, item, itemIndex) {
    const safeNombre = item.nombre || '';
    const dataNombre = safeNombre.toLowerCase();
    // SIEMPRE usar el ID del ítem de la BD (nunca el índice)
    // Los IDs de BD empiezan en 1, si no hay ID es un error de datos
    const itemId = item.id;
    if (!itemId) {
        console.warn(`⚠️ [CHECKLIST] Ítem sin ID válido:`, item);
        return ''; // No renderizar ítems sin ID
    }
    const groupName = `estado_${habitacion.cuarto_id}_${itemId}`;

    const optionsHTML = CHECKLIST_ESTADOS.map(estado => `
        <label class="checklist-semaforo-option ${estado}">
            <input type="radio" name="${groupName}" class="estado-radio" value="${estado}" ${item.estado === estado ? 'checked' : ''} onchange="updateChecklistEstado(${habitacion.cuarto_id}, ${itemId}, '${estado}')">
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
                <div class="checklist-semaforo-group" role="radiogroup" aria-label="Estado para ${safeNombre}">${optionsHTML}</div>
            </div>
        </div>
    `;
}

async function updateChecklistEstado(cuartoId, itemId, nuevoEstado) {
    console.log(`📝 [APP.JS] Actualizando estado: cuarto=${cuartoId}, item=${itemId}, estado=${nuevoEstado}`);

    const usuarioNombre = AppState.currentUser?.nombre || AppState.currentUser?.name || 'Usuario';

    try {
        // Llamar a la API para guardar en BD
        if (typeof ChecklistAPI !== 'undefined') {
            console.log('📝 [APP.JS] Guardando en BD via ChecklistAPI...');
            await ChecklistAPI.updateItemEstado(cuartoId, itemId, nuevoEstado);
            console.log('✅ [APP.JS] Estado guardado en BD');
        }

        // Actualizar cache local (localStorage)
        const checklistData = JSON.parse(localStorage.getItem('checklistData') || '[]');
        const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);

        if (habitacion) {
            // Buscar el ítem por ID (no por índice)
            const item = habitacion.items.find(i => i.id === itemId);
            if (item) {
                item.estado = nuevoEstado;
                console.log(`✅ [APP.JS] Ítem actualizado en cache: ${item.nombre} -> ${nuevoEstado}`);
            }

            // Actualizar último editor
            habitacion.ultimo_editor = usuarioNombre;
            habitacion.fecha_ultima_edicion = new Date().toISOString();

            localStorage.setItem('checklistData', JSON.stringify(checklistData));

            // También actualizar en AppState.checklistFiltradas para mantener sincronización
            const habitacionFiltrada = AppState.checklistFiltradas?.find(h => h.cuarto_id === cuartoId);
            if (habitacionFiltrada) {
                const itemFiltrado = habitacionFiltrada.items.find(i => i.id === itemId);
                if (itemFiltrado) {
                    itemFiltrado.estado = nuevoEstado;
                    console.log(`✅ [APP.JS] Ítem actualizado en filtrados: ${itemFiltrado.nombre} -> ${nuevoEstado}`);
                }
                habitacionFiltrada.ultimo_editor = usuarioNombre;
                habitacionFiltrada.fecha_ultima_edicion = new Date().toISOString();
            }

            // Actualizar contadores en la card (pasar cuartoId, no habitacion)
            updateChecklistCardSummary(cuartoId);
            updateChecklistEditorInfo(cuartoId);
        }

        showNotification(`✅ Estado actualizado por ${usuarioNombre}`, 'success');

    } catch (error) {
        console.error('❌ [APP.JS] Error actualizando estado:', error);
        showNotification('❌ Error al guardar cambio', 'error');
    }
}

function updateChecklistCardSummary(cuartoId) {
    const card = document.querySelector(`.checklist-card[data-cuarto-id="${cuartoId}"]`);
    if (!card) return;

    // Obtener datos de los ítems FILTRADOS (los que se muestran actualmente)
    // Esto mantiene la consistencia con los filtros aplicados
    const habitacionFiltrada = AppState.checklistFiltradas?.find(h => h.cuarto_id === cuartoId);
    
    // Si no hay datos filtrados, obtener del localStorage como fallback
    if (!habitacionFiltrada) {
        const checklistData = JSON.parse(localStorage.getItem('checklistData') || '[]');
        const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);
        if (!habitacion) return;
        
        // Usar datos completos si no hay filtros activos
        const counts = { bueno: 0, regular: 0, malo: 0 };
        habitacion.items.forEach(item => {
            const estado = item.estado || 'bueno';
            if (counts[estado] !== undefined) {
                counts[estado]++;
            }
        });
        
        CHECKLIST_ESTADOS.forEach(estado => {
            const valueEl = card.querySelector(`.checklist-card-stat[data-estado="${estado}"] .checklist-card-stat-value`);
            if (valueEl) {
                valueEl.textContent = counts[estado];
                valueEl.classList.add('stat-updated');
                setTimeout(() => valueEl.classList.remove('stat-updated'), 500);
            }
        });
        return;
    }

    // Contar estados de los ítems FILTRADOS (los visibles en la card)
    const counts = { bueno: 0, regular: 0, malo: 0 };
    
    // Actualizar los estados desde localStorage para tener el valor más reciente
    const checklistDataActualizado = JSON.parse(localStorage.getItem('checklistData') || '[]');
    const habitacionCompleta = checklistDataActualizado.find(h => h.cuarto_id === cuartoId);
    
    // Para cada ítem filtrado, obtener su estado actualizado del localStorage
    habitacionFiltrada.items.forEach(itemFiltrado => {
        // Buscar el estado actualizado en los datos completos
        const itemActualizado = habitacionCompleta?.items.find(i => i.id === itemFiltrado.id);
        const estado = itemActualizado?.estado || itemFiltrado.estado || 'bueno';
        if (counts[estado] !== undefined) {
            counts[estado]++;
        }
    });

    console.log(`📊 [CHECKLIST] Contadores actualizados (filtrados) para cuarto ${cuartoId}:`, counts);

    CHECKLIST_ESTADOS.forEach(estado => {
        const valueEl = card.querySelector(`.checklist-card-stat[data-estado="${estado}"] .checklist-card-stat-value`);
        if (valueEl) {
            valueEl.textContent = counts[estado];
            // Animación de actualización
            valueEl.classList.add('stat-updated');
            setTimeout(() => valueEl.classList.remove('stat-updated'), 500);
        }
    });
}

function updateChecklistEditorInfo(cuartoId) {
    const card = document.querySelector(`.checklist-card[data-cuarto-id="${cuartoId}"]`);
    if (!card) return;

    const metaGroup = card.querySelector('.checklist-meta-group');
    if (!metaGroup) return;

    // Obtener datos frescos del localStorage
    const checklistData = JSON.parse(localStorage.getItem('checklistData') || '[]');
    const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);
    if (!habitacion) return;

    const nombreEditor = habitacion.ultimo_editor || AppState.currentUser?.nombre || AppState.currentUser?.name;

    if (nombreEditor) {
        // Buscar si ya existe el editor tag
        let editorTag = metaGroup.querySelector('.checklist-editor-tag');
        let divider = editorTag?.previousElementSibling;

        if (!editorTag) {
            // Crear el separador si no existe
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

function applyChecklistFilters() {
    const checklistDataRaw = localStorage.getItem('checklistData');
    if (!checklistDataRaw) {
        AppState.checklistFiltradas = [];
        renderChecklistGrid([]);
        return;
    }

    const allData = JSON.parse(checklistDataRaw);
    const searchLower = (AppState.checklistFilters.busqueda || '').toLowerCase();
    const categoriaActiva = AppState.checklistFilters.categoria;
    const edificioActivo = AppState.checklistFilters.edificio;
    const estadoActivo = AppState.checklistFilters.estado;
    const habitacionBusqueda = (AppState.checklistFilters.habitacion || '').toLowerCase().trim();
    const editorActivo = AppState.checklistFilters.editor;

    let habitacionesFiltradas = allData;

    // Filtrar por número de habitación
    if (habitacionBusqueda) {
        habitacionesFiltradas = habitacionesFiltradas.filter(hab => {
            // El campo puede ser 'numero', 'numero_habitacion' o 'num_habitacion' según la fuente
            const numHabitacion = (hab.numero || hab.numero_habitacion || hab.num_habitacion || '').toString().toLowerCase();
            return numHabitacion.includes(habitacionBusqueda);
        });
        console.log(`🔍 [CHECKLIST] Buscando habitación: "${habitacionBusqueda}" - Encontradas: ${habitacionesFiltradas.length}`);
    }

    // Filtrar por edificio
    if (edificioActivo) {
        habitacionesFiltradas = habitacionesFiltradas.filter(hab =>
            hab.edificio === edificioActivo || hab.edificio_nombre === edificioActivo
        );
    }

    // Filtrar por editor (último editor que modificó)
    if (editorActivo) {
        habitacionesFiltradas = habitacionesFiltradas.filter(hab =>
            hab.ultimo_editor === editorActivo
        );
    }

    // Filtrar items dentro de cada habitación
    const requiereFiltradoItems = Boolean(categoriaActiva || searchLower || estadoActivo);
    if (requiereFiltradoItems) {
        habitacionesFiltradas = habitacionesFiltradas.map(habitacion => {
            const baseItems = Array.isArray(habitacion.items) ? habitacion.items : [];
            const itemsFiltrados = baseItems.filter(item => {
                const cumpleCategoria = !categoriaActiva || item.categoria === categoriaActiva;
                const nombreItem = (item.nombre || '').toLowerCase();
                const cumpleBusqueda = !searchLower || nombreItem.includes(searchLower);
                const cumpleEstado = !estadoActivo || item.estado === estadoActivo;
                return cumpleCategoria && cumpleBusqueda && cumpleEstado;
            });

            return itemsFiltrados.length > 0 ? { ...habitacion, items: itemsFiltrados } : null;
        }).filter(Boolean);
    }

    AppState.checklistFiltradas = habitacionesFiltradas;
    AppState.checklistPagination.totalPages = Math.ceil(habitacionesFiltradas.length / AppState.checklistPagination.perPage);
    if (AppState.checklistPagination.page > AppState.checklistPagination.totalPages) {
        AppState.checklistPagination.page = 1;
    }

    renderChecklistGrid(habitacionesFiltradas);
    renderChecklistPagination();
}

function renderChecklistPagination() {
    const container = document.getElementById('checklistPaginacion');
    if (!container) return;

    const totalItems = AppState.checklistFiltradas?.length || 0;
    const { perPage, page } = AppState.checklistPagination;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    if (totalItems <= perPage) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = `
        <button class="pagination-btn" data-action="prev" ${page === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i><span>Anterior</span>
        </button>
        <div class="pagination-info">
            <span>Página ${page} de ${totalPages}</span>
        </div>
        <button class="pagination-btn" data-action="next" ${page === totalPages ? 'disabled' : ''}>
            <span>Siguiente</span><i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
        if (AppState.checklistPagination.page > 1) {
            AppState.checklistPagination.page--;
            renderChecklistGrid(AppState.checklistFiltradas);
            renderChecklistPagination();
            // Smooth scroll al inicio del grid
            const gridContainer = document.getElementById('checklistGrid') || document.querySelector('.checklist-grid');
            if (gridContainer) {
                gridContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    container.querySelector('[data-action="next"]')?.addEventListener('click', () => {
        if (AppState.checklistPagination.page < totalPages) {
            AppState.checklistPagination.page++;
            renderChecklistGrid(AppState.checklistFiltradas);
            renderChecklistPagination();
            // Smooth scroll al inicio del grid
            const gridContainer = document.getElementById('checklistGrid') || document.querySelector('.checklist-grid');
            if (gridContainer) {
                gridContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
}

function loadInspeccionesRecientes() {
    const lista = document.getElementById('listaInspeccionesRecientes');
    if (!lista) return;

    // Cargar inspecciones desde los datos reales del checklist
    const checklistData = JSON.parse(localStorage.getItem('checklistData') || '[]');

    // Filtrar habitaciones que tienen fecha de última edición (han sido inspeccionadas)
    const inspeccionadas = checklistData
        .filter(hab => hab.ultimo_editor && hab.fecha_ultima_edicion)
        .map(hab => {
            // Contar estados para determinar el estado general
            const counts = { bueno: 0, regular: 0, malo: 0 };
            (hab.items || []).forEach(item => {
                if (counts[item.estado] !== undefined) counts[item.estado]++;
            });

            // Determinar estado general: malo > regular > bueno
            let estadoGeneral = 'aprobada'; // bueno = aprobada
            if (counts.malo > 0) {
                estadoGeneral = 'rechazada';
            } else if (counts.regular > 0) {
                estadoGeneral = 'pendiente';
            }

            // Generar título basado en el estado
            let titulo = 'Inspección completa';
            if (counts.malo > 0) {
                titulo = `${counts.malo} ítem(s) en mal estado`;
            } else if (counts.regular > 0) {
                titulo = `${counts.regular} ítem(s) requieren atención`;
            } else {
                titulo = 'Todo en buen estado';
            }

            return {
                habitacion: hab.numero || hab.numero_habitacion || 'N/A',
                cuarto_id: hab.cuarto_id,
                titulo: titulo,
                tecnico: hab.ultimo_editor,
                fecha: formatearFechaInspeccion(hab.fecha_ultima_edicion),
                fecha_raw: new Date(hab.fecha_ultima_edicion),
                estado: estadoGeneral,
                edificio: hab.edificio || hab.edificio_nombre
            };
        })
        // Ordenar por fecha más reciente
        .sort((a, b) => b.fecha_raw - a.fecha_raw)
        // Limitar a las últimas 10
        .slice(0, 10);

    AppState.inspeccionesRecientes = inspeccionadas;
    renderInspeccionesRecientes(inspeccionadas);

    console.log('📋 [APP.JS] Inspecciones recientes cargadas:', inspeccionadas.length);
}

/**
 * Formatear fecha para mostrar en inspecciones
 */
function formatearFechaInspeccion(fechaStr) {
    if (!fechaStr) return 'Sin fecha';

    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
    const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

    const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    if (fechaSinHora.getTime() === hoy.getTime()) {
        return `Hoy · ${hora}`;
    } else if (fechaSinHora.getTime() === ayer.getTime()) {
        return `Ayer · ${hora}`;
    } else {
        const dia = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        return `${dia} · ${hora}`;
    }
}

function renderInspeccionesRecientes(data) {
    const lista = document.getElementById('listaInspeccionesRecientes');
    if (!lista) return;

    lista.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
        lista.innerHTML = '<li class="inspeccion-placeholder"><i class="fas fa-clipboard-check"></i><span>Sin inspecciones recientes</span></li>';
        return;
    }

    data.forEach(inspeccion => {
        const li = document.createElement('li');
        li.className = 'inspeccion-item';
        li.dataset.estado = inspeccion.estado;
        if (inspeccion.cuarto_id) {
            li.dataset.cuartoId = inspeccion.cuarto_id;
            li.style.cursor = 'pointer';
            li.title = 'Clic para ver detalles';
        }

        const edificioInfo = inspeccion.edificio ? `<span class="inspeccion-edificio">${inspeccion.edificio}</span>` : '';

        li.innerHTML = `
            <div class="inspeccion-habitacion">
                <i class="fas fa-bed"></i>
                <span class="inspeccion-numero">${inspeccion.habitacion}</span>
                ${edificioInfo}
            </div>
            <div class="inspeccion-titulo">${inspeccion.titulo}</div>
            <div class="inspeccion-footer">
                <span><i class="fas fa-user"></i> ${inspeccion.tecnico}</span>
                <span><i class="fas fa-calendar"></i> ${inspeccion.fecha}</span>
            </div>
            <div class="inspeccion-estado estado-${inspeccion.estado}"></div>
        `;

        // Agregar evento de clic para abrir modal de detalles
        if (inspeccion.cuarto_id) {
            li.addEventListener('click', () => {
                if (typeof openChecklistDetailsModal === 'function') {
                    openChecklistDetailsModal(inspeccion.cuarto_id);
                }
            });
        }

        lista.appendChild(li);
    });
}

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

    // Obtener estadísticas
    const counts = { bueno: 0, regular: 0, malo: 0 };
    habitacion.items.forEach(item => {
        if (counts[item.estado] !== undefined) counts[item.estado]++;
    });

    // Construir HTML del historial agrupado por estado
    const buildHistorialHTML = () => {
        if (!habitacion.items || habitacion.items.length === 0) {
            return '<p class="no-history">No hay elementos registrados</p>';
        }

        const itemsPorEstado = {
            malo: habitacion.items.filter(item => item.estado === 'malo'),
            regular: habitacion.items.filter(item => item.estado === 'regular'),
            bueno: habitacion.items.filter(item => item.estado === 'bueno')
        };

        let html = '';

        if (itemsPorEstado.malo.length > 0) {
            html += '<div class="history-group"><h4><span class="semaforo-dot malo"></span> En Mal Estado</h4><ul>';
            itemsPorEstado.malo.forEach(item => {
                html += `<li class="history-item"><span class="item-name">${item.nombre}</span></li>`;
            });
            html += '</ul></div>';
        }

        if (itemsPorEstado.regular.length > 0) {
            html += '<div class="history-group"><h4><span class="semaforo-dot regular"></span> Estado Regular</h4><ul>';
            itemsPorEstado.regular.forEach(item => {
                html += `<li class="history-item"><span class="item-name">${item.nombre}</span></li>`;
            });
            html += '</ul></div>';
        }

        if (itemsPorEstado.bueno.length > 0) {
            html += '<div class="history-group"><h4><span class="semaforo-dot bueno"></span> En Buen Estado</h4><ul>';
            itemsPorEstado.bueno.forEach(item => {
                html += `<li class="history-item"><span class="item-name">${item.nombre}</span></li>`;
            });
            html += '</ul></div>';
        }

        return html || '<p class="no-history">No hay elementos registrados</p>';
    };

    // Construir contenido del modal
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
                        ${habitacion.ultimo_editor ? `<span class="checklist-meta-item checklist-editor-tag" style="display:flex;align-items:center;gap:0.3rem;font-size:0.95rem;font-weight:600;color:var(--verde-oliva);background:none;border:none;padding:0;"><i class="fas fa-user-edit"></i> <span>${habitacion.ultimo_editor}</span></span>` : ''}
                    </div>
                </div>
                <button class="modal-detalles-cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-detalles-body checklist-details-body">
                <div class="checklist-modal-info">
                    <div class="checklist-info-item">
                        <i class="fas fa-building"></i>
                        <div class="info-content">
                            <strong>Edificio</strong>
                            <span>${habitacion.edificio || habitacion.edificio_nombre || 'Sin edificio'}</span>
                        </div>
                    </div>
                    <div class="checklist-info-item">
                        <i class="fas fa-clipboard-list"></i>
                        <div class="info-content">
                            <strong>Total de ítems</strong>
                            <span>${habitacion.items.length} elementos registrados</span>
                        </div>
                    </div>
                    <div class="checklist-info-item">
                        <i class="fas fa-user-edit"></i>
                        <div class="info-content">
                            <strong>Último editor</strong>
                            <span>${habitacion.ultimo_editor || 'Sin ediciones'}</span>
                        </div>
                    </div>
                    <div class="checklist-info-item">
                        <i class="fas fa-hashtag"></i>
                        <div class="info-content">
                            <strong>ID de habitación</strong>
                            <span>${habitacion.cuarto_id}</span>
                        </div>
                    </div>
                </div>
                <div class="checklist-modal-stats">
                    <h3>Resumen de Estados</h3>
                    <div class="checklist-stats-grid">
                        <div class="checklist-stat-item bueno">
                            <span class="semaforo-dot"></span>
                            <span class="stat-label">Bueno</span>
                            <span class="stat-value">${counts.bueno}</span>
                        </div>
                        <div class="checklist-stat-item regular">
                            <span class="semaforo-dot"></span>
                            <span class="stat-label">Regular</span>
                            <span class="stat-value">${counts.regular}</span>
                        </div>
                        <div class="checklist-stat-item malo">
                            <span class="semaforo-dot"></span>
                            <span class="stat-label">Malo</span>
                            <span class="stat-value">${counts.malo}</span>
                        </div>
                    </div>
                </div>
                <div class="checklist-modal-history">
                    <h3>Historial de Ediciones</h3>
                    <div class="checklist-history-list">${buildHistorialHTML()}</div>
                </div>
            </div>
            <div class="checklist-modal-footer" style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:flex-end;align-items:center;">
                <button class="filtros-action-button excel btn-export btn-excel" data-cuarto-id="${cuartoId}">
                    <i class="fas fa-file-excel"></i>
                    <div><div style="font-weight:700;">Exportar Excel</div><div style="font-size:0.8rem;opacity:0.8;">Descargar checklist</div></div>
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.style.zIndex = '2000';
    document.body.classList.add('modal-open');

    // Agregar event listeners
    setTimeout(() => {
        const overlay = modal.querySelector('.modal-detalles-overlay');
        const closeBtn = modal.querySelector('.modal-detalles-cerrar');
        const excelBtn = modal.querySelector('.btn-excel');

        const closeModal = () => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        };

        if (overlay) overlay.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        if (excelBtn) {
            excelBtn.addEventListener('click', () => {
                // Exportar solo esta habitación a Excel/CSV
                let csv = 'Habitación,Edificio,Item,Categoría,Estado\n';
                habitacion.items.forEach(item => {
                    csv += `${habitacion.numero},${habitacion.edificio || ''},${item.nombre},${item.categoria || ''},${item.estado}\n`;
                });

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `checklist_${habitacion.numero}_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);

                // Notificación de éxito
                if (typeof showNotification === 'function') {
                    showNotification('✅ Checklist exportado exitosamente', 'success');
                } else {
                    console.log('✅ Checklist exportado exitosamente');
                }
            });
        }
    }, 0);
}

function filterChecklist(searchTerm) {
    AppState.checklistFilters.busqueda = searchTerm;
    AppState.checklistPagination.page = 1;
    applyChecklistFilters();
}

function filterChecklistByEstado(estado) {
    AppState.checklistFilters.estado = estado;
    AppState.checklistPagination.page = 1;
    applyChecklistFilters();
}

function exportarChecklistExcel() {
    if (AppState.currentUser?.role !== 'admin') {
        alert('Solo los administradores pueden exportar datos');
        return;
    }

    const spinner = document.getElementById('downloadSpinner');
    if (spinner) spinner.style.display = 'flex';

    setTimeout(() => {
        const checklistData = JSON.parse(localStorage.getItem('checklistData'));

        let csv = 'Habitación,Edificio,Item,Categoría,Estado\n';
        checklistData.forEach(habitacion => {
            habitacion.items.forEach(item => {
                csv += `${habitacion.numero},${habitacion.edificio},${item.nombre},${item.categoria || ''},${item.estado}\n`;
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `checklist_inspecciones_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        if (spinner) spinner.style.display = 'none';
        alert('Checklist exportado exitosamente');
    }, 1000);
}

function initChecklistEventListeners() {
    // Toggle de categorías (móvil)
    const toggleBtn = document.getElementById('toggleCategoriasBtn');
    const wrapper = document.getElementById('checklistCategoriasWrapper');

    if (toggleBtn && wrapper) {
        toggleBtn.addEventListener('click', () => {
            const isOpen = wrapper.getAttribute('data-mobile-open') === 'true';
            wrapper.setAttribute('data-mobile-open', !isOpen ? 'true' : 'false');
            toggleBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
        });
    }

    // Búsqueda general
    const buscarInput = document.getElementById('buscarChecklist');
    if (buscarInput) {
        buscarInput.addEventListener('input', (e) => {
            AppState.checklistFilters.busqueda = e.target.value;
            AppState.checklistPagination.page = 1;
            applyChecklistFilters();
        });
    }

    // Filtro por edificio
    const filtroEdificio = document.getElementById('filtroEdificioChecklist');
    if (filtroEdificio) {
        filtroEdificio.addEventListener('change', (e) => {
            AppState.checklistFilters.edificio = e.target.value;
            AppState.checklistPagination.page = 1;
            applyChecklistFilters();
        });
    }

    // Filtro por estado
    const filtroEstado = document.getElementById('filtroEstadoChecklist');
    if (filtroEstado) {
        filtroEstado.addEventListener('change', (e) => {
            AppState.checklistFilters.estado = e.target.value;
            AppState.checklistPagination.page = 1;
            applyChecklistFilters();
        });
    }

    // Filtro por editor
    const filtroEditor = document.getElementById('filtroEditorChecklist');
    if (filtroEditor) {
        filtroEditor.addEventListener('change', (e) => {
            AppState.checklistFilters.editor = e.target.value;
            AppState.checklistPagination.page = 1;
            applyChecklistFilters();
        });
    }

    // Búsqueda de inspecciones recientes
    const buscarInspeccion = document.getElementById('buscarInspeccionReciente');
    if (buscarInspeccion) {
        buscarInspeccion.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = DEFAULT_INSPECCIONES_RECIENTES.filter(insp => {
                const texto = `${insp.habitacion} ${insp.titulo} ${insp.tecnico}`.toLowerCase();
                return texto.includes(term);
            });
            renderInspeccionesRecientes(filtered);
        });
    }

    // Botones de exportación
    const btnExportar = document.getElementById('btnExportarChecklist');
    if (btnExportar) {
        btnExportar.addEventListener('click', exportarChecklistExcel);
    }

    const btnReporte = document.getElementById('btnGenerarReporte');
    if (btnReporte) {
        btnReporte.addEventListener('click', generarReporteChecklist);
    }

    // Formulario de nueva sección
    const formNuevaSeccion = document.getElementById('formNuevaSeccionChecklist');
    if (formNuevaSeccion) {
        formNuevaSeccion.addEventListener('submit', handleNuevaSeccionSubmit);
    }
}

async function handleNuevaSeccionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const nombreInput = form.querySelector('#seccionNombre');
    const iconoSelect = form.querySelector('#seccionIcono');
    const itemsInput = form.querySelector('#seccionItems');
    const feedback = document.getElementById('checklistAddFeedback');
    const submitBtn = form.querySelector('button[type="submit"]');

    const nombre = (nombreInput?.value || '').trim();
    if (!nombre) {
        if (feedback) feedback.textContent = 'Escribe un nombre para la sección.';
        nombreInput?.focus();
        return;
    }

    // Verificar si ya existe localmente
    const slugLocal = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (AppState.checklistCategorias.some(cat => cat.id === slugLocal || cat.slug === slugLocal)) {
        if (feedback) feedback.textContent = 'Ya existe una sección con ese nombre.';
        return;
    }

    const icono = iconoSelect?.value || 'fa-layer-group';

    // Deshabilitar botón mientras se guarda
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    try {
        // 1. Crear categoría en la BD
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        const responseCategoria = await fetch('/api/checklist/categorias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, icono })
        });

        if (!responseCategoria.ok) {
            const errorData = await responseCategoria.json();
            throw new Error(errorData.error || 'Error al crear categoría');
        }

        const nuevaCategoria = await responseCategoria.json();
        console.log('✅ Categoría creada en BD:', nuevaCategoria);

        // 2. Agregar ítems si los hay
        const itemsRaw = (itemsInput?.value || '').trim();
        const itemsArray = itemsRaw ? itemsRaw.split(/[,\n]+/).map(item => item.trim()).filter(Boolean) : [];

        for (const itemNombre of itemsArray) {
            try {
                await fetch('/api/checklist/items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        nombre: itemNombre, 
                        categoria_id: nuevaCategoria.id 
                    })
                });
            } catch (itemError) {
                console.warn('Error al crear ítem:', itemNombre, itemError);
            }
        }

        // 3. Actualizar AppState con la nueva categoría
        AppState.checklistCategorias.push({
            id: nuevaCategoria.slug || nuevaCategoria.id,
            nombre: nuevaCategoria.nombre,
            icono: nuevaCategoria.icono
        });

        // 4. Re-renderizar solo el contenedor de categorías
        renderChecklistCategorias();
        
        // 5. Limpiar formulario
        form.reset();

        if (feedback) {
            feedback.textContent = `✅ Sección "${nombre}" agregada correctamente.`;
            feedback.style.color = '#22c55e';
            setTimeout(() => { 
                feedback.textContent = ''; 
                feedback.style.color = '';
            }, 3000);
        }

        showNotification(`Sección "${nombre}" creada exitosamente`, 'success');

    } catch (error) {
        console.error('❌ Error al crear sección:', error);
        if (feedback) {
            feedback.textContent = `❌ ${error.message}`;
            feedback.style.color = '#ef4444';
        }
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Guardar sección';
        }
    }
}

// ========================================
// GESTIÓN DE USUARIOS (Solo Admin)
// ========================================

// Función cargarUsuarios ya definida más abajo (línea ~922)

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function verHistorialFiltros() {
    const historial = JSON.parse(localStorage.getItem('sabanaHistorial')) || [];

    if (historial.length === 0) {
        alert('No hay periodos archivados disponibles');
        return;
    }

    let mensaje = 'Periodos archivados:\n\n';
    historial.forEach((periodo, index) => {
        const fecha = new Date(periodo.fecha).toLocaleDateString('es-MX');
        mensaje += `${index + 1}. ${periodo.periodo} - Archivado el ${fecha}\n`;
    });

    alert(mensaje);
}

function generarReporteChecklist() {
    alert('Generación de reporte PDF en desarrollo.\nPróximamente podrá descargar reportes detallados en formato PDF.');
}

// ========================================
// ESPACIOS COMUNES - GESTIÓN
// ========================================

async function loadEspaciosComunesData() {
    console.log('🏢 [ESPACIOS] Cargando datos de espacios comunes...');
    console.log('📥 [ESPACIOS] Cargando datos de espacios comunes y mantenimientos...');

    // Mostrar skeletons solo si es la primera carga
    if (!window.espaciosComunesCargados && window.mostrarSkeletonsEspacios) {
        window.mostrarSkeletonsEspacios();
    }

    try {
        const [espaciosResponse, mantenimientosResponse] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/espacios-comunes`),
            fetchWithAuth(`${API_BASE_URL}/api/mantenimientos/espacios`)
        ]);

        if (espaciosResponse.ok && mantenimientosResponse.ok) {
            AppState.espaciosComunes = await espaciosResponse.json();
            AppState.mantenimientosEspacios = await mantenimientosResponse.json();
            console.log(`✅ [ESPACIOS] Datos cargados: ${AppState.espaciosComunes.length} espacios, ${AppState.mantenimientosEspacios.length} mantenimientos.`);

            // Usar la nueva función de renderizado si está disponible
            if (window.cargarEspaciosComunes) {
                window.cargarEspaciosComunes();
            } else {
                // Fallback a la función antigua
                renderEspaciosComunes();
            }
        } else {
            console.error('❌ [ESPACIOS] Error cargando datos:', espaciosResponse.status, mantenimientosResponse.status);
            AppState.espaciosComunes = [];
            AppState.mantenimientosEspacios = [];
            if (window.mostrarEspaciosComunes) {
                window.mostrarEspaciosComunes();
            } else {
                renderEspaciosComunes();
            }
        }
    } catch (error) {
        console.error('❌ [ESPACIOS] Error cargando datos:', error);
        AppState.espaciosComunes = [];
        AppState.mantenimientosEspacios = [];
        if (window.mostrarEspaciosComunes) {
            window.mostrarEspaciosComunes();
        } else {
            renderEspaciosComunes();
        }
    }
}

function renderEspaciosComunes() {
    const lista = document.getElementById('listaEspaciosComunes');
    if (!lista) {
        console.error('❌ [ESPACIOS] No se encontró #listaEspaciosComunes');
        return;
    }

    lista.innerHTML = '';

    if (AppState.espaciosComunes.length === 0) {
        lista.innerHTML = '<li class="mensaje-no-cuartos"><i class="fas fa-building"></i><p>No hay espacios comunes registrados</p></li>';
        return;
    }

    AppState.espaciosComunes.forEach(espacio => {
        const mantenimientosEspacio = AppState.mantenimientosEspacios.filter(
            m => m.espacio_comun_id === espacio.id
        );

        const li = document.createElement('li');
        li.className = 'habitacion-card';
        li.setAttribute('data-aos', 'fade-up');
        li.setAttribute('data-espacio-id', espacio.id);

        const { estadoBadgeClass, estadoIcon, estadoText } = getEstadoBadgeInfo(espacio.estado);

        li.innerHTML = `
            <div class="habitacion-header">
                <div class="habitacion-titulo">
                    <i class="habitacion-icon fas fa-building"></i>
                    <div>
                        <div class="habitacion-nombre">${escapeHtml(espacio.nombre)}</div>
                        <div class="habitacion-edificio">
                            <i class="fas fa-building"></i> ${escapeHtml(espacio.edificio_nombre || 'Sin edificio')}
                        </div>
                    </div>
                </div>
                <div class="habitacion-estado-badge ${estadoBadgeClass}">
                    <i class="fas ${estadoIcon}"></i> ${estadoText}
                </div>
            </div>
            <div class="habitacion-servicios" id="servicios-espacio-${espacio.id}">
                ${generarServiciosEspacioHTML(mantenimientosEspacio, espacio.id)}
            </div>
            <div class="habitacion-acciones">
                ${mostrarBtnEditarEspacio(mantenimientosEspacio, espacio.id)}
                <button class="habitacion-boton boton-principal" onclick="seleccionarEspacioComun(${espacio.id})">
                    <i class="fas fa-plus"></i> Agregar Servicio
                </button>
            </div>
        `;

        lista.appendChild(li);
    });
}

function getEstadoBadgeInfo(estado) {
    const estadosMap = {
        'disponible': { class: 'estado-disponible', icon: 'fa-check-circle', text: 'Disponible' },
        'ocupado': { class: 'estado-ocupado', icon: 'fa-user', text: 'Ocupado' },
        'mantenimiento': { class: 'estado-mantenimiento', icon: 'fa-tools', text: 'Mantenimiento' },
        'fuera_servicio': { class: 'estado-fuera-servicio', icon: 'fa-ban', text: 'Fuera de Servicio' }
    };

    const info = estadosMap[estado] || estadosMap['disponible'];
    return {
        estadoBadgeClass: info.class,
        estadoIcon: info.icon,
        estadoText: info.text
    };
}

function generarServiciosEspacioHTML(mantenimientos, espacioId) {
    if (!mantenimientos || mantenimientos.length === 0) {
        return '<p class="habitacion-sin-servicios"><i class="fas fa-check-circle"></i> Sin servicios pendientes</p>';
    }

    return mantenimientos.map(m => {
        const prioridadClass = m.prioridad || 'media';
        const estadoClass = m.estado || 'pendiente';
        const tipoIcon = m.tipo === 'rutina' ? 'fa-clock' : 'fa-wrench';

        return `
            <div class="servicio-item servicio-${estadoClass}" data-mantenimiento-id="${m.id}">
                <div class="servicio-header">
                    <i class="fas ${tipoIcon}"></i>
                    <span class="servicio-tipo">${m.tipo === 'rutina' ? 'Alerta' : 'Servicio'}</span>
                    <span class="servicio-prioridad prioridad-${prioridadClass}">${m.prioridad || 'media'}</span>
                </div>
                <div class="servicio-descripcion">${escapeHtml(m.descripcion)}</div>
                ${m.tipo === 'rutina' && m.dia_alerta ? `
                    <div class="servicio-fecha">
                        <i class="far fa-calendar-alt"></i> ${formatearFecha(m.dia_alerta)}
                        ${m.hora ? `<i class="far fa-clock"></i> ${m.hora}` : ''}
                    </div>
                ` : ''}
                <div class="servicio-acciones">
                    <button class="servicio-btn btn-editar" onclick="editarMantenimientoEspacio(${m.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="servicio-btn btn-eliminar" onclick="eliminarMantenimientoEspacio(${m.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function mostrarBtnEditarEspacio(mantenimientos, espacioId) {
    return `
        <button class="habitacion-boton boton-secundario" onclick="cambiarEstadoEspacio(${espacioId})">
            <i class="fas fa-exchange-alt"></i> Cambiar Estado
        </button>
    `;
}

// COMMENTED OUT - This function is now in app-loader.js with updated IDs
// function actualizarEstadisticasEspacios() {
//     const total = AppState.espaciosComunes.length;
//     const disponibles = AppState.espaciosComunes.filter(e => e.estado === 'disponible').length;
//     const mantenimiento = AppState.espaciosComunes.filter(e => e.estado === 'mantenimiento').length;
//     const fueraServicio = AppState.espaciosComunes.filter(e => e.estado === 'fuera_servicio').length;

//     document.getElementById('totalEspacios').textContent = total;
//     document.getElementById('espaciosDisponibles').textContent = disponibles;
//     document.getElementById('espaciosMantenimiento').textContent = mantenimiento;
//     document.getElementById('espaciosFuera').textContent = fueraServicio;
// }

async function cargarAlertasEspacios() {
    console.log('📋 [ESPACIOS] Cargando alertas...');
    const listaAlertas = document.getElementById('listaAlertasEspacios');
    const listaEmitidas = document.getElementById('listaAlertasEmitidasEspacios');

    // Obtener fecha de hoy (sin hora para comparación)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (listaAlertas) {
        // Alertas Programadas: alertas que AÚN NO se han emitido (independiente de la fecha)
        const alertasPendientes = AppState.mantenimientosEspacios.filter(m => {
            if (m.tipo !== 'rutina' || m.estado !== 'pendiente') return false;

            // Mostrar solo alertas que NO han sido emitidas
            return !m.alerta_emitida;
        });

        const mensajeNoAlertasEspacios = document.getElementById('mensaje-no-alertas-espacios');

        if (alertasPendientes.length === 0) {
            listaAlertas.innerHTML = '';
            listaAlertas.style.display = 'none';
            if (mensajeNoAlertasEspacios) {
                mensajeNoAlertasEspacios.style.display = 'block';
            }
        } else {
            listaAlertas.style.display = 'block';
            if (mensajeNoAlertasEspacios) {
                mensajeNoAlertasEspacios.style.display = 'none';
            }
            listaAlertas.innerHTML = alertasPendientes.map(alerta => `
                <li class="alerta-item prioridad-${alerta.prioridad || 'media'}">
                    <div class="alerta-info">
                        <strong>${escapeHtml(alerta.espacio_nombre || 'Espacio')}</strong>
                        <span class="alerta-descripcion">${escapeHtml(alerta.descripcion)}</span>
                    </div>
                    <div class="alerta-meta">
                        ${alerta.dia_alerta ? formatearFecha(alerta.dia_alerta) : ''}
                        ${alerta.hora ? alerta.hora : ''}
                    </div>
                </li>
            `).join('');
        }
    }

    if (listaEmitidas) {
        // Alertas del Día: alertas emitidas de hoy
        const alertasEmitidas = AppState.mantenimientosEspacios.filter(m => {
            if (m.tipo !== 'rutina' || m.estado !== 'pendiente') return false;
            if (!m.alerta_emitida) return false; // Solo alertas emitidas

            // Si no tiene fecha, usar lógica antigua
            if (!m.dia_alerta) return true;

            // Comparar fecha de la alerta con hoy
            const fechaAlerta = new Date(m.dia_alerta);
            fechaAlerta.setHours(0, 0, 0, 0);

            // Mostrar en "Alertas del Día" solo si la fecha es hoy
            return fechaAlerta.getTime() === hoy.getTime();
        });

        const mensajeNoAlertasEmitidas = document.getElementById('mensaje-no-alertas-emitidas-espacios');

        if (alertasEmitidas.length === 0) {
            listaEmitidas.innerHTML = '';
            listaEmitidas.style.display = 'none';
            if (mensajeNoAlertasEmitidas) {
                mensajeNoAlertasEmitidas.style.display = 'block';
            }
        } else {
            listaEmitidas.style.display = 'block';
            if (mensajeNoAlertasEmitidas) {
                mensajeNoAlertasEmitidas.style.display = 'none';
            }
            listaEmitidas.innerHTML = alertasEmitidas.map(alerta => `
                <li class="alerta-item alerta-emitida prioridad-${alerta.prioridad || 'media'}">
                    <div class="alerta-info">
                        <strong>${escapeHtml(alerta.espacio_nombre || 'Espacio')}</strong>
                        <span class="alerta-descripcion">${escapeHtml(alerta.descripcion)}</span>
                    </div>
                    <div class="alerta-meta">
                        ${alerta.dia_alerta ? formatearFecha(alerta.dia_alerta) : ''}
                        ${alerta.hora ? alerta.hora : ''}
                    </div>
                </li>
            `).join('');
        }
    }
}

function seleccionarEspacioComun(espacioId) {
    alert(`Funcionalidad en desarrollo: Agregar servicio al espacio ${espacioId}`);
}

function editarMantenimientoEspacio(mantenimientoId) {
    alert(`Funcionalidad en desarrollo: Editar mantenimiento ${mantenimientoId}`);
}

async function eliminarMantenimientoEspacio(mantenimientoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/mantenimientos/${mantenimientoId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Servicio eliminado correctamente');
            await loadEspaciosComunesData();
        } else {
            throw new Error('Error al eliminar servicio');
        }
    } catch (error) {
        console.error('Error eliminando servicio:', error);
        alert('Error al eliminar el servicio');
    }
}

async function cambiarEstadoEspacio(espacioId) {
    const espacio = AppState.espaciosComunes.find(e => e.id === espacioId);
    if (!espacio) return;

    const estados = [
        { value: 'disponible', label: '🟢 Disponible' },
        { value: 'ocupado', label: '🔴 Ocupado' },
        { value: 'mantenimiento', label: '🟡 Mantenimiento' },
        { value: 'fuera_servicio', label: '⚫ Fuera de Servicio' }
    ];

    const opciones = estados.map(e => `${e.value === espacio.estado ? '✓ ' : ''}${e.label}`).join('\n');
    const nuevoEstado = prompt(`Estado actual: ${espacio.estado}\n\nSelecciona nuevo estado:\n${opciones}\n\nEscribe: disponible, ocupado, mantenimiento o fuera_servicio`);

    if (!nuevoEstado || !estados.find(e => e.value === nuevoEstado.trim())) {
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/espacios-comunes/${espacioId}`, {
            method: 'PUT',
            body: JSON.stringify({ estado: nuevoEstado.trim() })
        });

        if (response.ok) {
            alert('Estado actualizado correctamente');
            await loadEspaciosComunesData();
        } else {
            throw new Error('Error al actualizar estado');
        }
    } catch (error) {
        console.error('Error actualizando estado:', error);
        alert('Error al actualizar el estado');
    }
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    
    try {
        let year, month, day;
        const fechaStr = String(fecha);

        // Formato YYYY-MM-DD (simple)
        if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
            [year, month, day] = fechaStr.split('-').map(Number);
        }
        // Formato ISO con timestamp (2025-12-02T00:00:00.000Z)
        else if (/^\d{4}-\d{2}-\d{2}T/.test(fechaStr)) {
            const fechaPart = fechaStr.split('T')[0];
            [year, month, day] = fechaPart.split('-').map(Number);
        }
        // Otros formatos - usar UTC
        else {
            const dateObj = new Date(fechaStr);
            if (!isNaN(dateObj.getTime())) {
                day = dateObj.getUTCDate();
                month = dateObj.getUTCMonth() + 1;
                year = dateObj.getUTCFullYear();
            } else {
                return '';
            }
        }

        // Crear fecha local
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (error) {
        console.error('Error formateando fecha:', error, fecha);
        return '';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// GESTIÓN DE USUARIOS (Solo Admin)
// ========================================
async function cargarRoles() {
    const rolSelect = document.getElementById('usuarioRol');
    if (!rolSelect || AppState.currentUser?.role !== 'admin') {
        return;
    }

    try {
        console.log('👤 [USUARIOS] Cargando roles...');
        const response = await window.fetchWithAuth(`${API_BASE_URL}/api/usuarios/roles`);
        if (!response.ok) {
            throw new Error('Error al obtener roles');
        }
        AppState.roles = await response.json();
        renderRolesSelect();
    } catch (error) {
        console.error('Error al cargar roles:', error);
        AppState.roles = [];
    }
}

async function cargarUsuarios(forceReload = false) {
    const usuariosGrid = document.getElementById('usuariosGrid');
    if (!usuariosGrid || AppState.currentUser?.role !== 'admin') {
        return;
    }

    // Si ya hay datos y no se fuerza la recarga, solo renderizar
    if (!forceReload && AppState.usuarios && AppState.usuarios.length > 0) {
        console.log('👥 [USUARIOS] Usando caché, total:', AppState.usuarios.length);
        renderUsuariosList();
        return;
    }

    try {
        AppState.usuariosLoading = true;
        renderUsuariosList();

        // Siempre cargar todos los usuarios (activos e inactivos) - el filtrado se hace en el cliente
        const response = await window.fetchWithAuth(`${API_BASE_URL}/api/auth/usuarios?includeInactive=1`);
        if (!response.ok) {
            throw new Error('Error al cargar usuarios');
        }

        AppState.usuarios = await response.json();
        console.log('👥 [USUARIOS] Total cargados:', AppState.usuarios.length);
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        usuariosGrid.innerHTML = '<div class="mensaje-error">Error al cargar usuarios. Por favor, intente nuevamente.</div>';
    } finally {
        AppState.usuariosLoading = false;
        renderUsuariosList();
    }
}

function renderRolesSelect(selectedValue) {
    const rolSelect = document.getElementById('usuarioRol');
    if (!rolSelect) return;

    const roles = AppState.roles || [];
    const previousValue = selectedValue || rolSelect.value;

    rolSelect.innerHTML = `
        <option value="">Selecciona un rol...</option>
        ${roles.map(rol => `<option value="${rol.id}">${rol.nombre}</option>`).join('')}
    `;

    if (previousValue) {
        rolSelect.value = previousValue;
    }
}

function renderUsuariosSkeletons(count = 6) {
    const skeleton = `
        <div class="usuario-card-skeleton">
            <div class="skeleton-header">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-info">
                    <div class="skeleton-line skeleton-name"></div>
                    <div class="skeleton-line skeleton-badge"></div>
                </div>
            </div>
            <div class="skeleton-detalles">
                <div class="skeleton-line skeleton-detail"></div>
                <div class="skeleton-line skeleton-detail"></div>
                <div class="skeleton-line skeleton-detail"></div>
                <div class="skeleton-line skeleton-detail"></div>
            </div>
            <div class="skeleton-footer">
                <div class="skeleton-line skeleton-sessions"></div>
                <div class="skeleton-line skeleton-toggle"></div>
                <div class="skeleton-line skeleton-button"></div>
            </div>
        </div>
    `;
    return Array(count).fill(skeleton).join('');
}

function renderUsuariosList() {
    const usuariosGrid = document.getElementById('usuariosGrid');
    if (!usuariosGrid) return;

    if (AppState.usuariosLoading) {
        usuariosGrid.innerHTML = renderUsuariosSkeletons(6);
        return;
    }

    if (!AppState.usuarios || AppState.usuarios.length === 0) {
        usuariosGrid.innerHTML = '<div class="mensaje-vacio">No hay usuarios registrados</div>';
        return;
    }

    // Obtener valores de filtros
    const textoBusqueda = (AppState.usuariosFiltro || '').toLowerCase().trim();
    const filtroRol = document.getElementById('filtroRolUsuario')?.value || '';
    const filtroEstado = document.getElementById('filtroEstadoUsuario')?.value || '';

    const filtrados = AppState.usuarios.filter(usuario => {
        // Filtrar por estado
        if (filtroEstado === 'activo' && !usuario.activo) return false;
        if (filtroEstado === 'inactivo' && usuario.activo) return false;
        
        // Filtrar por rol
        if (filtroRol) {
            const rolUsuario = (usuario.rol_nombre || 'tecnico').toLowerCase();
            if (rolUsuario !== filtroRol) return false;
        }
        
        // Filtrar por texto de búsqueda
        if (textoBusqueda) {
            const coincide = [
                usuario.nombre,
                usuario.email,
                usuario.departamento,
                usuario.numero_empleado,
                usuario.rol_nombre
            ].filter(Boolean).some(valor => valor.toLowerCase().includes(textoBusqueda));
            if (!coincide) return false;
        }
        
        return true;
    });

    if (filtrados.length === 0) {
        usuariosGrid.innerHTML = '<div class="mensaje-vacio">No se encontraron usuarios con los filtros aplicados</div>';
        return;
    }

    usuariosGrid.innerHTML = filtrados.map(renderUsuarioCard).join('');
}

function renderUsuarioCard(usuario) {
    const estadoClase = usuario.activo ? 'estado-activo' : 'estado-inactivo';
    const ultimaSesion = formatUsuarioFecha(usuario.ultima_sesion_login);
    const ultimoAcceso = formatUsuarioFecha(usuario.ultimo_acceso);
    const rol = (usuario.rol_nombre || 'tecnico').toLowerCase();
    
    // Determinar clase de badge según rol
    const badgeClass = rol === 'admin' ? 'badge-admin' 
        : rol === 'supervisor' ? 'badge-supervisor' 
        : 'badge-tecnico';
    
    // Determinar icono del avatar según rol
    const avatarIcon = rol === 'admin' ? 'fa-user-shield' 
        : rol === 'supervisor' ? 'fa-user-tie' 
        : 'fa-user';

    const estaBloqueado = usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date();
    const bloqueadoHasta = estaBloqueado ? formatUsuarioFecha(usuario.bloqueado_hasta) : null;

    return `
        <div class="usuario-card gradient-card ${estaBloqueado ? 'usuario-bloqueado' : ''}" data-rol="${rol}" data-estado="${usuario.activo ? 'activo' : 'inactivo'}">
            <div class="usuario-header">
                <div class="usuario-avatar">
                    <i class="fas ${avatarIcon}"></i>
                </div>
                <div class="usuario-info-principal">
                    <h3 class="usuario-nombre">${usuario.nombre || 'Sin nombre'}</h3>
                    <span class="badge-rol ${badgeClass}">${(usuario.rol_nombre || 'TÉCNICO').toUpperCase()}</span>
                </div>
            </div>
            ${estaBloqueado ? `
                <div class="usuario-bloqueado-alerta">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <strong>Usuario bloqueado por múltiples intentos fallidos</strong>
                        <small>Bloqueado hasta: ${bloqueadoHasta}</small>
                    </div>
                </div>
            ` : ''}
            <div class="usuario-detalles">
                <div class="detalle-item">
                    <i class="fas fa-envelope"></i>
                    <span>${usuario.email || 'Sin correo'}</span>
                </div>
                <div class="detalle-item">
                    <i class="fas fa-phone"></i>
                    <span>${usuario.telefono || 'Sin registro'}</span>
                </div>
                <div class="detalle-item">
                    <i class="fas fa-building"></i>
                    <span>${usuario.departamento || 'Sin registro'}</span>
                </div>
                <div class="detalle-item">
                    <i class="fas fa-id-badge"></i>
                    <span>${usuario.numero_empleado || 'Sin registro'}</span>
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
                        <span class="sesion-total">${usuario.total_sesiones || 0} registradas</span>
                        <span class="sesion-activas">${usuario.sesiones_activas || 0} activas</span>
                    </div>
                </div>
                <div class="usuario-switch-container">
                    <div class="checkbox-wrapper-35">
                        <input type="checkbox" class="switch usuario-toggle" id="toggle-${usuario.id}" ${usuario.activo ? 'checked' : ''} onchange="toggleUsuarioEstado(${usuario.id}, this.checked)">
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
                    ${estaBloqueado ? `
                    <button class="btn-unlock-user" type="button" onclick="desbloquearUsuario(${usuario.id})">
                        <i class="fas fa-unlock"></i>
                        <span>Desbloquear</span>
                    </button>
                    ` : ''}
                    <button class="btn-edit-user" type="button" onclick="editarUsuario(${usuario.id})">
                        <i class="fas fa-pen-to-square"></i>
                        <span>Editar</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function formatUsuarioFecha(fecha) {
    if (!fecha) return 'Sin registro';
    try {
        const date = new Date(fecha);
        return date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (error) {
        return 'Sin registro';
    }
}

function resetUsuarioForm() {
    const form = document.getElementById('usuarioForm');
    if (!form) return;

    form.reset();
    AppState.usuarioFormMode = 'create';
    AppState.usuarioEdicion = null;

    document.getElementById('usuarioFormTitle').textContent = 'Registrar nuevo usuario';
    const submitBtn = document.getElementById('usuarioFormSubmit');
    if (submitBtn) submitBtn.textContent = 'Crear usuario';

    const activoCheckbox = document.getElementById('usuarioActivo');
    if (activoCheckbox) activoCheckbox.checked = true;

    const passwordHelp = document.getElementById('usuarioPasswordHelp');
    if (passwordHelp) passwordHelp.textContent = 'La contraseña temporal solo se solicita durante el alta de un usuario.';

    renderRolesSelect();
}

async function handleUsuarioFormSubmit(event) {
    event.preventDefault();
    if (AppState.currentUser?.role !== 'admin') return;

    const submitBtn = document.getElementById('btnSubmitUsuario');
    const originalHTML = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>GUARDANDO...</span>';
    }

    try {
        const payload = buildUsuarioPayload();

        if (!payload.nombre || !payload.email || !payload.rol) {
            throw new Error('Nombre, correo y rol son obligatorios');
        }

        const usuarioId = document.getElementById('usuarioIdEdicion')?.value;
        const isEdit = AppState.usuarioFormMode === 'edit' && usuarioId;
        
        if (!isEdit && !payload.password) {
            throw new Error('La contraseña temporal es obligatoria para nuevos usuarios');
        }

        const endpoint = isEdit
            ? `${API_BASE_URL}/api/usuarios/${usuarioId}`
            : `${API_BASE_URL}/api/usuarios`;
        const method = isEdit ? 'PUT' : 'POST';

        if (isEdit && !payload.password) {
            delete payload.password;
        }

        const response = await window.fetchWithAuth(endpoint, {
            method,
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error al guardar usuario');
        }

        alert(isEdit ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
        cerrarModalUsuario();
        await cargarUsuarios(true);
        resetUsuarioForm();
    } catch (error) {
        console.error('Error al guardar usuario:', error);
        alert(error.message || 'Error al guardar usuario');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML || '<i class="fas fa-user-plus"></i> <span>CREAR USUARIO</span>';
        }
    }
}

function buildUsuarioPayload() {
    const getValue = (id) => document.getElementById(id)?.value?.trim() || '';

    const payload = {
        nombre: getValue('nombreUsuario'),
        email: getValue('correoUsuario').toLowerCase(),
        telefono: getValue('telefonoUsuario') || null,
        departamento: getValue('departamentoUsuario') || null,
        numero_empleado: getValue('numeroEmpleadoUsuario') || null,
        rol: document.getElementById('rolUsuario')?.value || '',
        requiere_cambio_password: document.getElementById('requiereCambioPassword')?.checked || false,
        notas_admin: getValue('notasUsuario') || null
    };

    const password = getValue('passwordUsuario');
    if (password) {
        payload.password = password;
    }

    return payload;
}

function editarUsuario(id) {
    const usuario = AppState.usuarios.find(u => u.id === id);
    if (!usuario) {
        alert('Usuario no encontrado');
        return;
    }

    AppState.usuarioFormMode = 'edit';
    AppState.usuarioEdicion = usuario;

    // Configurar modal para edición
    const modalTitulo = document.getElementById('modalUsuarioTitulo');
    const modalSubtitulo = document.getElementById('modalUsuarioSubtitulo');
    const btnSubmit = document.getElementById('btnSubmitUsuario');
    const passwordHelp = document.getElementById('passwordHelp');
    
    if (modalSubtitulo) modalSubtitulo.textContent = 'Editar usuario';
    if (modalTitulo) modalTitulo.textContent = 'Actualizar';
    if (btnSubmit) {
        btnSubmit.innerHTML = '<i class="fas fa-save"></i> <span>Actualizar usuario</span>';
    }
    if (passwordHelp) {
        passwordHelp.textContent = 'Deja vacío para mantener la contraseña actual.';
    }

    // Llenar formulario con datos del usuario
    const setValue = (id, value) => {
        const input = document.getElementById(id);
        if (input) input.value = value || '';
    };

    document.getElementById('usuarioIdEdicion').value = usuario.id;
    setValue('nombreUsuario', usuario.nombre);
    setValue('correoUsuario', usuario.email);
    setValue('telefonoUsuario', usuario.telefono);
    setValue('departamentoUsuario', usuario.departamento);
    setValue('numeroEmpleadoUsuario', usuario.numero_empleado);
    setValue('notasUsuario', usuario.notas_admin);
    setValue('passwordUsuario', '');

    const rolSelect = document.getElementById('rolUsuario');
    if (rolSelect && usuario.rol_nombre) {
        const rolValue = usuario.rol_nombre.toLowerCase();
        rolSelect.value = rolValue;
    }

    // Checkbox de cambio de contraseña
    const requiereCambio = document.getElementById('requiereCambioPassword');
    if (requiereCambio) {
        requiereCambio.checked = !!usuario.requiere_cambio_password;
    }

    // Abrir modal
    abrirModalUsuario(true);
}

// Función para abrir el modal de usuario
function abrirModalUsuario(esEdicion = false) {
    const modal = document.getElementById('modalUsuario');
    
    if (!esEdicion) {
        // Reset para nuevo usuario
        AppState.usuarioFormMode = 'create';
        AppState.usuarioEdicion = null;
        
        const modalTitulo = document.getElementById('modalUsuarioTitulo');
        const modalSubtitulo = document.getElementById('modalUsuarioSubtitulo');
        const btnSubmit = document.getElementById('btnSubmitUsuario');
        const passwordHelp = document.getElementById('passwordHelp');
        const form = document.getElementById('formUsuario');
        
        if (modalSubtitulo) modalSubtitulo.textContent = 'Nuevo usuario';
        if (modalTitulo) modalTitulo.textContent = 'Crear';
        if (btnSubmit) {
            btnSubmit.innerHTML = '<i class="fas fa-user-plus"></i> <span>Crear usuario</span>';
        }
        if (passwordHelp) {
            passwordHelp.textContent = 'La contraseña temporal solo se solicita durante el registro inicial.';
        }
        if (form) form.reset();
        
        // Por defecto, marcar el checkbox de cambio de contraseña
        const requiereCambio = document.getElementById('requiereCambioPassword');
        if (requiereCambio) requiereCambio.checked = true;
        
        document.getElementById('usuarioIdEdicion').value = '';
    }
    
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

// Función para cerrar el modal de usuario
function cerrarModalUsuario() {
    const modal = document.getElementById('modalUsuario');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

// Función para toggle de estado de usuario (nuevo switch)
async function toggleUsuarioEstado(id, activar) {
    try {
        if (activar) {
            // Activar usuario
            const response = await window.fetchWithAuth(`${API_BASE_URL}/api/usuarios/${id}/activar`, {
                method: 'POST'
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al activar usuario');
            }
            await cargarUsuarios(true);
        } else {
            // Desactivar usuario
            const response = await window.fetchWithAuth(`${API_BASE_URL}/api/usuarios/${id}/desactivar`, {
                method: 'POST',
                body: JSON.stringify({ motivo: 'Desactivado por administrador' })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al desactivar usuario');
            }
            await cargarUsuarios(true);
        }
    } catch (error) {
        console.error('Error al cambiar estado de usuario:', error);
        alert(error.message || 'Error al cambiar estado del usuario');
        // Recargar para restaurar el estado original del switch
        await cargarUsuarios(true);
    }
}

async function desactivarUsuario(id) {
    if (!confirm('¿Está seguro que desea desactivar este usuario?')) {
        return;
    }

    const motivo = prompt('Motivo de desactivación', 'Desactivado por administrador');
    if (motivo === null) {
        return;
    }

    try {
        const response = await window.fetchWithAuth(`${API_BASE_URL}/api/usuarios/${id}/desactivar`, {
            method: 'POST',
            body: JSON.stringify({ motivo })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error al desactivar usuario');
        }

        alert('Usuario desactivado exitosamente');
        await cargarUsuarios(true);
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        alert(error.message || 'Error al desactivar usuario');
    }
}

async function activarUsuario(id) {
    if (!confirm('¿Está seguro que desea reactivar este usuario?')) {
        return;
    }

    try {
        const response = await window.fetchWithAuth(`${API_BASE_URL}/api/usuarios/${id}/activar`, {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error al reactivar usuario');
        }

        alert('Usuario reactivado exitosamente');
        await cargarUsuarios(true);
    } catch (error) {
        console.error('Error al reactivar usuario:', error);
        alert(error.message || 'Error al activar usuario');
    }
}

async function desbloquearUsuario(id) {
    if (!confirm('¿Deseas desbloquear este usuario? Podrá intentar iniciar sesión nuevamente.')) {
        return;
    }

    try {
        const response = await window.fetchWithAuth(`${API_BASE_URL}/api/usuarios/${id}/desbloquear`, {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error al desbloquear usuario');
        }

        alert('Usuario desbloqueado exitosamente');
        await cargarUsuarios(true);
    } catch (error) {
        console.error('Error al desbloquear usuario:', error);
        alert(error.message || 'Error al desbloquear usuario. Intenta nuevamente.');
    }
}

function eliminarUsuario() {
    alert('Los usuarios no se pueden eliminar por seguridad.\nSolo se pueden desactivar.');
}

function mostrarModalNuevoUsuario() {
    resetUsuarioForm();
    document.getElementById('usuarioForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('usuarioNombre')?.focus();
}



// Hacer funciones globales para uso en HTML
window.toggleServicioRealizado = toggleServicioRealizado;
window.updateChecklistEstado = updateChecklistEstado;
window.exportarChecklistExcel = exportarChecklistExcel;
window.mostrarModalNuevoUsuario = mostrarModalNuevoUsuario;
window.editarUsuario = editarUsuario;
window.abrirModalUsuario = abrirModalUsuario;
window.cerrarModalUsuario = cerrarModalUsuario;
window.toggleUsuarioEstado = toggleUsuarioEstado;
window.desactivarUsuario = desactivarUsuario;
window.activarUsuario = activarUsuario;
window.desbloquearUsuario = desbloquearUsuario;
window.eliminarUsuario = eliminarUsuario;
window.cargarUsuarios = cargarUsuarios;
window.resetUsuarioForm = resetUsuarioForm;
window.verHistorialFiltros = verHistorialFiltros;
window.generarReporteChecklist = generarReporteChecklist;
window.seleccionarEspacioComun = seleccionarEspacioComun;
window.editarMantenimientoEspacio = editarMantenimientoEspacio;
window.eliminarMantenimientoEspacio = eliminarMantenimientoEspacio;
window.cambiarEstadoEspacio = cambiarEstadoEspacio;
window.cargarAlertasEspacios = cargarAlertasEspacios;
window.recargarChecklistData = recargarChecklistData;

console.log('✅ App.js cargado completamente');
