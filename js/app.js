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
    checklistItems: [
        'Aire acondicionado',
        'Televisión',
        'Sofá',
        'Cama',
        'Baño',
        'Minibar',
        'Closet',
        'Ventanas',
        'Cortinas',
        'Iluminación',
        'Teléfono',
        'Caja fuerte'
    ]
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
    console.log('🚀 [APP.JS] DOMContentLoaded - Inicializando JW Marriott Sistema de Mantenimiento...');
    console.log('🚀 [APP.JS] URL actual:', window.location.href);
    console.log('🚀 [APP.JS] LocalStorage keys:', Object.keys(localStorage));

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
    console.log('🚀 [APP.JS] Cargando tab activo:', AppState.currentTab);
    loadTabData(AppState.currentTab);
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
    const usuariosSearchInput = document.getElementById('usuariosSearchInput');
    if (usuariosSearchInput) {
        usuariosSearchInput.addEventListener('input', (e) => {
            AppState.usuariosFiltro = e.target.value;
            renderUsuariosList();
        });
    }

    const usuariosShowInactive = document.getElementById('usuariosShowInactive');
    if (usuariosShowInactive) {
        usuariosShowInactive.addEventListener('change', () => {
            cargarUsuarios();
        });
    }

    const usuariosRefreshBtn = document.getElementById('usuariosRefreshBtn');
    if (usuariosRefreshBtn) {
        usuariosRefreshBtn.addEventListener('click', () => {
            cargarUsuarios();
        });
    }

    const usuarioForm = document.getElementById('usuarioForm');
    if (usuarioForm) {
        usuarioForm.addEventListener('submit', handleUsuarioFormSubmit);
    }

    const usuarioFormCancel = document.getElementById('usuarioFormCancel');
    if (usuarioFormCancel) {
        usuarioFormCancel.addEventListener('click', resetUsuarioForm);
    }
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

        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.getAttribute('data-view');

                // Actualizar botones activos solo en este selector
                viewButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Alternar visibilidad de columnas
                if (view === 'habitaciones' || view === 'tareas') {
                    if (columnaHabitaciones) columnaHabitaciones.style.display = 'block';
                    if (columnaAlertas) columnaAlertas.style.display = 'none';
                } else if (view === 'alertas') {
                    if (columnaHabitaciones) columnaHabitaciones.style.display = 'none';
                    if (columnaAlertas) columnaAlertas.style.display = 'block';
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
    switch (tabId) {
        case 'espacios':
            loadEspaciosComunesData();
            break;
        case 'sabana':
            loadSabanaData();
            break;
        case 'checklist':
            loadChecklistData();
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

function cerrarModalNuevaSabana() {
    const modal = document.getElementById('modalNuevaSabana');
    if (modal) {
        modal.style.display = 'none';
    }
}

function confirmarNuevaSabana() {
    const radioNuevo = document.querySelector('input[name="tipoServicio"][value="nuevo"]:checked');

    if (radioNuevo) {
        // Crear con nombre personalizado
        const inputNombre = document.getElementById('inputNombreServicio');
        const nombreServicio = inputNombre?.value.trim();

        if (!nombreServicio) {
            alert('Ingresa el nombre del servicio que se realizará.');
            inputNombre?.focus();
            return;
        }

        crearNuevaSabanaPersonalizada(nombreServicio);
    } else {
        // Usar servicio existente
        const select = document.getElementById('selectServicioNuevaSabana');
        const servicioId = select?.value;

        if (!servicioId) {
            alert('Selecciona el servicio que se realizará.');
            return;
        }

        crearNuevaSabana(servicioId);
    }
}


// FUNCIONES DE SÁBANA MOVIDAS A sabana-functions.js
// Las funciones están en sabana-functions.js y son accedidas vía window.*

// ========================================
// CHECKLIST - INSPECCIONES
// ========================================

function loadChecklistData() {
    console.log('📋 Cargando datos de checklist...');

    const grid = document.getElementById('checklistGrid');
    if (!grid) return;

    // Generar checklist para cada habitación
    if (!localStorage.getItem('checklistData')) {
        const checklistData = AppState.cuartos.slice(0, 20).map(cuarto => ({
            cuarto_id: cuarto.id,
            numero: cuarto.numero,
            edificio: cuarto.edificio_nombre,
            items: AppState.checklistItems.map(item => ({
                nombre: item,
                estado: 'bueno' // bueno, regular, malo
            }))
        }));
        localStorage.setItem('checklistData', JSON.stringify(checklistData));
    }

    const checklistData = JSON.parse(localStorage.getItem('checklistData'));
    renderChecklistGrid(checklistData);
}

function renderChecklistGrid(data) {
    const grid = document.getElementById('checklistGrid');
    if (!grid) return;

    grid.innerHTML = '';

    data.forEach(habitacion => {
        const card = document.createElement('div');
        card.className = 'checklist-card';
        card.setAttribute('data-habitacion', habitacion.numero);

        const itemsHTML = habitacion.items.map((item, itemIndex) => `
            <div class="checklist-item" data-item="${item.nombre.toLowerCase()}">
                <span class="checklist-item-name">${item.nombre}</span>
                <div class="checklist-estado">
                    <input 
                        type="radio" 
                        id="bueno_${habitacion.cuarto_id}_${itemIndex}" 
                        name="estado_${habitacion.cuarto_id}_${itemIndex}"
                        class="estado-radio"
                        ${item.estado === 'bueno' ? 'checked' : ''}
                        onchange="updateChecklistEstado(${habitacion.cuarto_id}, ${itemIndex}, 'bueno')"
                    >
                    <label for="bueno_${habitacion.cuarto_id}_${itemIndex}" class="estado-label bueno">
                        Bueno
                    </label>
                    
                    <input 
                        type="radio" 
                        id="regular_${habitacion.cuarto_id}_${itemIndex}" 
                        name="estado_${habitacion.cuarto_id}_${itemIndex}"
                        class="estado-radio"
                        ${item.estado === 'regular' ? 'checked' : ''}
                        onchange="updateChecklistEstado(${habitacion.cuarto_id}, ${itemIndex}, 'regular')"
                    >
                    <label for="regular_${habitacion.cuarto_id}_${itemIndex}" class="estado-label regular">
                        Regular
                    </label>
                    
                    <input 
                        type="radio" 
                        id="malo_${habitacion.cuarto_id}_${itemIndex}" 
                        name="estado_${habitacion.cuarto_id}_${itemIndex}"
                        class="estado-radio"
                        ${item.estado === 'malo' ? 'checked' : ''}
                        onchange="updateChecklistEstado(${habitacion.cuarto_id}, ${itemIndex}, 'malo')"
                    >
                    <label for="malo_${habitacion.cuarto_id}_${itemIndex}" class="estado-label malo">
                        Malo
                    </label>
                </div>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="checklist-header">
                <h3 class="checklist-habitacion">${habitacion.numero}</h3>
                <span style="font-size: 0.85rem; color: var(--texto-secundario);">${habitacion.edificio}</span>
            </div>
            <div class="checklist-items">
                ${itemsHTML}
            </div>
        `;

        grid.appendChild(card);
    });
}

function updateChecklistEstado(cuartoId, itemIndex, nuevoEstado) {
    const checklistData = JSON.parse(localStorage.getItem('checklistData'));
    const habitacion = checklistData.find(h => h.cuarto_id === cuartoId);

    if (habitacion) {
        habitacion.items[itemIndex].estado = nuevoEstado;
        localStorage.setItem('checklistData', JSON.stringify(checklistData));
        console.log(`✅ Estado actualizado: ${habitacion.numero} - ${habitacion.items[itemIndex].nombre} -> ${nuevoEstado}`);
    }
}

function filterChecklist(searchTerm) {
    const allData = JSON.parse(localStorage.getItem('checklistData'));
    const searchLower = searchTerm.toLowerCase();

    const filtered = allData.filter(habitacion => {
        // Buscar en número de habitación
        if (habitacion.numero.toLowerCase().includes(searchLower)) {
            return true;
        }

        // Buscar en items del checklist
        return habitacion.items.some(item =>
            item.nombre.toLowerCase().includes(searchLower)
        );
    });

    renderChecklistGrid(filtered);
}

function filterChecklistByEstado(estado) {
    if (!estado) {
        loadChecklistData();
        return;
    }

    const allData = JSON.parse(localStorage.getItem('checklistData'));

    const filtered = allData.filter(habitacion => {
        return habitacion.items.some(item => item.estado === estado);
    });

    renderChecklistGrid(filtered);
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

    // Mostrar skeletons instantáneamente
    if (window.mostrarSkeletonsEspacios) {
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
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
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

async function cargarUsuarios() {
    const usuariosGrid = document.getElementById('usuariosGrid');
    if (!usuariosGrid || AppState.currentUser?.role !== 'admin') {
        return;
    }

    try {
        AppState.usuariosLoading = true;
        renderUsuariosList();

        const includeInactive = document.getElementById('usuariosShowInactive')?.checked ? '1' : '0';
        const response = await window.fetchWithAuth(`${API_BASE_URL}/api/auth/usuarios?includeInactive=${includeInactive}`);
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

function renderUsuariosList() {
    const usuariosGrid = document.getElementById('usuariosGrid');
    if (!usuariosGrid) return;

    if (AppState.usuariosLoading) {
        usuariosGrid.innerHTML = '<div class="mensaje-cargando">Cargando usuarios...</div>';
        return;
    }

    if (!AppState.usuarios || AppState.usuarios.length === 0) {
        usuariosGrid.innerHTML = '<div class="mensaje-vacio">No hay usuarios registrados</div>';
        return;
    }

    const filtro = (AppState.usuariosFiltro || '').toLowerCase().trim();
    const showInactiveOnly = document.getElementById('usuariosShowInactive')?.checked;

    const filtrados = AppState.usuarios.filter(usuario => {
        if (showInactiveOnly) {
            if (usuario.activo) return false;
        } else if (!usuario.activo) {
            return false;
        }
        if (!filtro) return true;
        return [
            usuario.nombre,
            usuario.email,
            usuario.departamento,
            usuario.numero_empleado,
            usuario.rol_nombre
        ].filter(Boolean).some(valor => valor.toLowerCase().includes(filtro));
    });

    if (filtrados.length === 0) {
        const mensaje = showInactiveOnly
            ? 'No se encontraron usuarios inactivos con los filtros aplicados'
            : 'No se encontraron usuarios activos con los filtros aplicados';
        usuariosGrid.innerHTML = `<div class="mensaje-vacio">${mensaje}</div>`;
        return;
    }

    usuariosGrid.innerHTML = filtrados.map(renderUsuarioCard).join('');
}

function renderUsuarioCard(usuario) {
    const estadoClase = usuario.activo ? 'estado-activo' : 'estado-inactivo';
    const estadoTexto = usuario.activo ? 'Activo' : 'Inactivo';
    const ultimaSesion = formatUsuarioFecha(usuario.ultima_sesion_login);
    const ultimoAcceso = formatUsuarioFecha(usuario.ultimo_acceso);

    const estaBloqueado = usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date();
    const bloqueadoHasta = estaBloqueado ? formatUsuarioFecha(usuario.bloqueado_hasta) : null;

    return `
        <div class="usuario-card ${estadoClase} ${estaBloqueado ? 'usuario-bloqueado' : ''}">
            <div class="usuario-card-head">
                <div>
                    <h3>${usuario.nombre || 'Sin nombre'}</h3>
                    <div class="usuario-card-meta-line">
                        <span class="usuarios-status-badge ${estadoClase}">${estadoTexto}</span>
                        <span class="usuario-rol pill">${usuario.rol_nombre || 'SIN ROL'}</span>
                        ${estaBloqueado ? '<span class="usuarios-status-badge usuario-bloqueado-badge"><i class="fas fa-lock"></i> Bloqueado</span>' : ''}
                    </div>
                </div>
                <button class="btn-icon" title="Editar usuario" onclick="editarUsuario(${usuario.id})">
                    <i class="fas fa-edit"></i>
                </button>
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
                <div class="usuario-detalle">
                    <i class="fas fa-envelope"></i>
                    <span>${usuario.email || 'sin correo'}</span>
                </div>
                ${usuario.telefono ? `<div class="usuario-detalle"><i class="fas fa-phone"></i><span>${usuario.telefono}</span></div>` : ''}
                ${usuario.departamento ? `<div class="usuario-detalle"><i class="fas fa-building"></i><span>${usuario.departamento}</span></div>` : ''}
                ${usuario.numero_empleado ? `<div class="usuario-detalle"><i class="fas fa-id-card"></i><span>${usuario.numero_empleado}</span></div>` : ''}
            </div>
            <div class="usuario-card-footer">
                <div>
                    <small>Último acceso</small>
                    <strong>${ultimoAcceso}</strong>
                </div>
                <div>
                    <small>Última sesión</small>
                    <strong>${ultimaSesion}</strong>
                </div>
                <div>
                    <small>Sesiones</small>
                    <strong>${usuario.total_sesiones || 0} · Activas ${usuario.sesiones_activas || 0}</strong>
                </div>
            </div>
            <div class="usuario-acciones">
                ${estaBloqueado
            ? `<button class="btn-desbloquear" onclick="desbloquearUsuario(${usuario.id})"><i class="fas fa-unlock"></i> Desbloquear</button>
                       ${usuario.activo ? `<button class="btn-desactivar" onclick="desactivarUsuario(${usuario.id})"><i class="fas fa-user-slash"></i> Desactivar</button>` : ''}`
            : usuario.activo
                ? `<button class="btn-desactivar" onclick="desactivarUsuario(${usuario.id})"><i class="fas fa-user-slash"></i> Desactivar</button>`
                : `<button class="btn-activar" onclick="activarUsuario(${usuario.id})"><i class="fas fa-user-check"></i> Reactivar</button>`
        }
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

    const submitBtn = document.getElementById('usuarioFormSubmit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
    }

    try {
        const payload = buildUsuarioPayload();

        if (!payload.nombre || !payload.email || !payload.rol) {
            throw new Error('Nombre, correo y rol son obligatorios');
        }

        const isEdit = AppState.usuarioFormMode === 'edit' && AppState.usuarioEdicion;
        if (!isEdit && !payload.password) {
            throw new Error('La contraseña temporal es obligatoria para nuevos usuarios');
        }

        const endpoint = isEdit
            ? `${API_BASE_URL}/api/usuarios/${AppState.usuarioEdicion.id}`
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
        await cargarUsuarios();
        resetUsuarioForm();
    } catch (error) {
        console.error('Error al guardar usuario:', error);
        alert(error.message || 'Error al guardar usuario');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = AppState.usuarioFormMode === 'edit' ? 'Actualizar usuario' : 'Crear usuario';
        }
    }
}

function buildUsuarioPayload() {
    const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
    const getCheckbox = (id) => document.getElementById(id)?.checked || false;

    const payload = {
        nombre: getValue('usuarioNombre'),
        email: getValue('usuarioEmail').toLowerCase(),
        telefono: getValue('usuarioTelefono') || null,
        departamento: getValue('usuarioDepartamento') || null,
        numero_empleado: getValue('usuarioNumeroEmpleado') || null,
        rol: document.getElementById('usuarioRol')?.value || '',
        activo: getCheckbox('usuarioActivo'),
        requiere_cambio_password: getCheckbox('usuarioRequierePassword'),
        notas_admin: getValue('usuarioNotas') || null
    };

    const password = getValue('usuarioPassword');
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

    document.getElementById('usuarioFormTitle').textContent = `Editar usuario`;
    const submitBtn = document.getElementById('usuarioFormSubmit');
    if (submitBtn) submitBtn.textContent = 'Actualizar usuario';

    const setValue = (id, value) => {
        const input = document.getElementById(id);
        if (input) input.value = value || '';
    };

    setValue('usuarioNombre', usuario.nombre);
    setValue('usuarioEmail', usuario.email);
    setValue('usuarioTelefono', usuario.telefono);
    setValue('usuarioDepartamento', usuario.departamento);
    setValue('usuarioNumeroEmpleado', usuario.numero_empleado);
    setValue('usuarioNotas', usuario.notas_admin);

    const rolSelect = document.getElementById('usuarioRol');
    if (rolSelect) {
        renderRolesSelect(usuario.rol_id || rolSelect.value);
        const rolValue = usuario.rol_id ? String(usuario.rol_id) : '';
        if (rolValue) {
            rolSelect.value = rolValue;
        } else if (usuario.rol_nombre) {
            const match = (AppState.roles || []).find(r => r.nombre === usuario.rol_nombre);
            if (match) rolSelect.value = String(match.id);
        }
    }

    const activoCheckbox = document.getElementById('usuarioActivo');
    if (activoCheckbox) activoCheckbox.checked = !!usuario.activo;

    const requierePwd = document.getElementById('usuarioRequierePassword');
    if (requierePwd) requierePwd.checked = !!usuario.requiere_cambio_password;

    const passwordInput = document.getElementById('usuarioPassword');
    if (passwordInput) passwordInput.value = '';

    const passwordHelp = document.getElementById('usuarioPasswordHelp');
    if (passwordHelp) passwordHelp.textContent = 'Ingrese una nueva contraseña solo si desea restablecerla.';

    document.getElementById('usuarioForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        await cargarUsuarios();
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
        await cargarUsuarios();
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
        await cargarUsuarios();
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

console.log('✅ App.js cargado completamente');