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
    const toggleBtn = document.getElementById('toggleFiltros');
    const contenedorFiltros = document.getElementById('contenedorFiltros');
    
    if (toggleBtn && contenedorFiltros) {
        toggleBtn.addEventListener('click', () => {
            // Toggle de la clase 'show'
            contenedorFiltros.classList.toggle('show');
            toggleBtn.classList.toggle('active');
            
            // Guardar preferencia en localStorage
            const isOpen = contenedorFiltros.classList.contains('show');
            localStorage.setItem('filtrosOpen', isOpen);
        });
        
        // Restaurar estado previo del localStorage
        const filtrosOpen = localStorage.getItem('filtrosOpen');
        if (filtrosOpen === 'true') {
            contenedorFiltros.classList.add('show');
            toggleBtn.classList.add('active');
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
                if (view === 'habitaciones') {
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
                console.warn('⚠️ [LOAD-DATA] Error cargando edificios, usando datos mock');
                AppState.edificios = [
                    { id: 1, nombre: 'Edificio A' },
                    { id: 2, nombre: 'Edificio B' },
                    { id: 3, nombre: 'Edificio C' }
                ];
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
                console.warn('⚠️ [LOAD-DATA] Error cargando cuartos, usando datos mock');
                AppState.cuartos = generateMockCuartos();
            }
        } catch (error) {
            console.error('❌ [LOAD-DATA] Error en cuartos:', error);
            AppState.cuartos = generateMockCuartos();
        }
        
        console.log('✅ [LOAD-DATA] Datos iniciales cargados');
    } catch (error) {
        console.error('❌ [LOAD-DATA] Error general cargando datos iniciales:', error);
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
// SÁBANA - REGISTRO DE SERVICIOS
// ========================================

// Tipos de servicio disponibles
const TIPOS_SERVICIO = [
    { id: 'cambio_chapas', nombre: 'Cambio de Chapas' },
    { id: 'cambio_sabanas', nombre: 'Cambio de Sábanas' },
    { id: 'cambio_filtros', nombre: 'Cambio de Filtros' },
    { id: 'mantenimiento_ac', nombre: 'Mantenimiento A/C' },
    { id: 'limpieza_profunda', nombre: 'Limpieza Profunda' },
    { id: 'pintura', nombre: 'Pintura' },
    { id: 'plomeria', nombre: 'Plomería' },
    { id: 'electricidad', nombre: 'Electricidad' }
];

const SABANA_DATA_VERSION = '2';

function loadSabanaData() {
    console.log('📋 [SABANA] Cargando datos de sábana de servicios...');
    console.log('📋 [SABANA] Cuartos disponibles:', AppState.cuartos.length);
    
    const tbody = document.getElementById('sabanaTableBody');
    if (!tbody) {
        console.error('❌ [SABANA] No se encontró #sabanaTableBody');
        return;
    }
    
    if (AppState.cuartos.length === 0) {
        console.warn('⚠️ [SABANA] No hay cuartos cargados, generando datos mock...');
        AppState.cuartos = generateMockCuartos();
    }
    
    // Cargar edificios en el filtro
    const filtroEdificioSabana = document.getElementById('filtroEdificioSabana');
    if (filtroEdificioSabana) {
        const edificiosUnicos = [...new Set(AppState.cuartos.map(c => c.edificio_nombre))];
        filtroEdificioSabana.innerHTML = '<option value="">Todos los edificios</option>';
        edificiosUnicos.forEach(edificio => {
            const option = document.createElement('option');
            option.value = edificio;
            option.textContent = edificio;
            filtroEdificioSabana.appendChild(option);
        });
    }
    
    // Cargar servicios personalizados en el selector principal
    const selectServicio = document.getElementById('filtroServicioActual');
    if (selectServicio) {
        const serviciosPersonalizados = JSON.parse(localStorage.getItem('serviciosPersonalizados') || '[]');
        if (serviciosPersonalizados.length > 0) {
            serviciosPersonalizados.forEach(servicio => {
                const existeOption = Array.from(selectServicio.options).find(opt => opt.value === servicio.id);
                if (!existeOption) {
                    const option = document.createElement('option');
                    option.value = servicio.id;
                    option.textContent = `${servicio.nombre} ⭐`;
                    selectServicio.appendChild(option);
                }
            });
        }
    }

    if (localStorage.getItem('sabanaServiciosDataVersion') !== SABANA_DATA_VERSION) {
        localStorage.removeItem('sabanaServiciosData');
        localStorage.setItem('sabanaServiciosDataVersion', SABANA_DATA_VERSION);
        console.log('♻️ [SABANA] Datos de ejemplo eliminados. Nueva versión lista.');
    }

    if (!localStorage.getItem('sabanaServiciosData')) {
        localStorage.setItem('sabanaServiciosData', JSON.stringify({}));
    }
    
    // Cargar el servicio seleccionado
    const servicioActual = document.getElementById('filtroServicioActual')?.value || 'cambio_chapas';
    cambiarServicioActual(servicioActual);
}

function renderSabanaTable(data) {
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

function cambiarServicioActual(servicioId) {
    const servicioInfo = TIPOS_SERVICIO.find(s => s.id === servicioId);
    const serviciosPersonalizados = JSON.parse(localStorage.getItem('serviciosPersonalizados') || '[]');
    const servicioPersonalizado = serviciosPersonalizados.find(s => s.id === servicioId);
    
    const nombreServicio = servicioInfo?.nombre || servicioPersonalizado?.nombre || 'Servicio';
    
    // Actualizar título
    const tituloEl = document.getElementById('tituloServicioActual');
    if (tituloEl) {
        const icono = servicioPersonalizado ? '⭐' : '<i class="fas fa-clipboard-list"></i>';
        tituloEl.innerHTML = `${icono} Sábana de ${nombreServicio}`;
    }
    
    // Cargar datos del servicio
    const allData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const servicioData = allData[servicioId] || [];
    
    renderSabanaTable(servicioData);
    updateServiciosStats(servicioData);
}

function updateServiciosStats(data) {
    const completados = data.filter(s => s.realizado).length;
    const total = data.length;
    
    const completadosEl = document.getElementById('serviciosCompletados');
    const totalesEl = document.getElementById('serviciosTotales');
    const periodoEl = document.getElementById('periodoActual');
    
    if (completadosEl) completadosEl.textContent = completados;
    if (totalesEl) totalesEl.textContent = total;
    if (periodoEl) {
        const fecha = new Date();
        periodoEl.textContent = `${fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
    }
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

function filterSabana() {
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
    
    renderSabanaTable(filtered);
    updateServiciosStats(filtered);
}

function formatFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function exportarSabanaExcel() {
    if (AppState.currentUser?.role !== 'admin') {
        alert('Solo los administradores pueden exportar datos');
        return;
    }
    
    const servicioActual = document.getElementById('filtroServicioActual')?.value || 'cambio_chapas';
    const servicioInfo = TIPOS_SERVICIO.find(s => s.id === servicioActual);
    const allData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const servicioData = allData[servicioActual] || [];
    
    // Crear CSV completo con todos los campos
    let csv = 'Edificio,Habitación,Fecha Programada,Fecha Realizado,Responsable,Observaciones,Realizado\n';
    servicioData.forEach(row => {
        csv += `${row.edificio},${row.habitacion},${row.fechaProgramada},${row.fechaRealizado || '-'},"${row.responsable}","${row.observaciones}",${row.realizado ? 'Sí' : 'No'}\n`;
    });
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sabana_${servicioActual}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert(`Sábana de ${servicioInfo?.nombre || 'servicios'} exportada exitosamente`);
}

function abrirModalNuevaSabana() {
    const modal = document.getElementById('modalNuevaSabana');
    const select = document.getElementById('selectServicioNuevaSabana');
    const inputNombre = document.getElementById('inputNombreServicio');
    if (!modal || !select) {
        return;
    }

    // Cargar servicios personalizados guardados
    const serviciosPersonalizados = JSON.parse(localStorage.getItem('serviciosPersonalizados') || '[]');
    
    select.innerHTML = '<option value="">-- Selecciona un servicio --</option>';
    
    // Agregar servicios base
    TIPOS_SERVICIO.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo.id;
        option.textContent = tipo.nombre;
        select.appendChild(option);
    });
    
    // Agregar servicios personalizados
    if (serviciosPersonalizados.length > 0) {
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────────────';
        select.appendChild(separator);
        
        serviciosPersonalizados.forEach(servicio => {
            const option = document.createElement('option');
            option.value = servicio.id;
            option.textContent = `${servicio.nombre} ⭐`;
            select.appendChild(option);
        });
    }

    const servicioActual = document.getElementById('filtroServicioActual')?.value;
    if (servicioActual) {
        // Verificar si está en "existente"
        const radioExistente = document.querySelector('input[name="tipoServicio"][value="existente"]');
        if (radioExistente) {
            radioExistente.checked = true;
            toggleTipoServicioModal();
        }
        select.value = servicioActual;
    } else {
        // Resetear al modo "nuevo"
        const radioNuevo = document.querySelector('input[name="tipoServicio"][value="nuevo"]');
        if (radioNuevo) {
            radioNuevo.checked = true;
            toggleTipoServicioModal();
        }
        if (inputNombre) inputNombre.value = '';
    }

    modal.style.display = 'flex';
}

function toggleTipoServicioModal() {
    const radioNuevo = document.querySelector('input[name="tipoServicio"][value="nuevo"]:checked');
    const contenedorNuevo = document.getElementById('contenedorNuevoServicio');
    const contenedorExistente = document.getElementById('contenedorServicioExistente');
    
    if (radioNuevo) {
        // Modo nuevo servicio
        if (contenedorNuevo) contenedorNuevo.style.display = 'flex';
        if (contenedorExistente) contenedorExistente.style.display = 'none';
    } else {
        // Modo servicio existente
        if (contenedorNuevo) contenedorNuevo.style.display = 'none';
        if (contenedorExistente) contenedorExistente.style.display = 'flex';
    }
}

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

function generarSabanaParaServicio(servicioId) {
    if (AppState.cuartos.length === 0) {
        AppState.cuartos = generateMockCuartos();
    }

    const fechaProgramada = new Date().toISOString().split('T')[0];
    return AppState.cuartos.map(cuarto => ({
        id: cuarto.id,
        cuarto_id: cuarto.id,
        habitacion: cuarto.numero,
        edificio: cuarto.edificio_nombre,
        tipoServicio: servicioId,
        fechaProgramada,
        fechaRealizado: '',
        responsable: '',
        observaciones: '',
        realizado: false
    }));
}

function crearNuevaSabana(servicioId) {
    const servicioInfo = TIPOS_SERVICIO.find(s => s.id === servicioId);
    const serviciosPersonalizados = JSON.parse(localStorage.getItem('serviciosPersonalizados') || '[]');
    const servicioPersonalizado = serviciosPersonalizados.find(s => s.id === servicioId);
    
    const nombreServicio = servicioInfo?.nombre || servicioPersonalizado?.nombre;
    
    if (!nombreServicio) {
        alert('El servicio seleccionado no es válido.');
        return;
    }

    const allData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const historial = JSON.parse(localStorage.getItem('sabanaServiciosHistorial') || '[]');
    const registrosActuales = allData[servicioId];

    if (Array.isArray(registrosActuales) && registrosActuales.length > 0) {
        historial.push({
            id: `${servicioId}_${Date.now()}`,
            servicioId,
            servicioNombre: nombreServicio,
            archivadoEl: new Date().toISOString(),
            total: registrosActuales.length,
            completados: registrosActuales.filter(item => item.realizado).length,
            datos: registrosActuales
        });
        localStorage.setItem('sabanaServiciosHistorial', JSON.stringify(historial));
    } else if (!localStorage.getItem('sabanaServiciosHistorial')) {
        localStorage.setItem('sabanaServiciosHistorial', JSON.stringify([]));
    }

    allData[servicioId] = generarSabanaParaServicio(servicioId);
    localStorage.setItem('sabanaServiciosData', JSON.stringify(allData));

    const filtroServicio = document.getElementById('filtroServicioActual');
    if (filtroServicio) {
        filtroServicio.value = servicioId;
    }

    cerrarModalNuevaSabana();
    cambiarServicioActual(servicioId);
    alert(`Sábana lista para ${nombreServicio}. La anterior quedó archivada en el historial.`);
}

function crearNuevaSabanaPersonalizada(nombreServicio) {
    // Generar ID único basado en timestamp y texto normalizado
    const servicioId = 'custom_' + nombreServicio.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9]+/g, '_') // Reemplazar caracteres especiales
        .substring(0, 30) + '_' + Date.now();
    
    // Guardar en lista de servicios personalizados
    const serviciosPersonalizados = JSON.parse(localStorage.getItem('serviciosPersonalizados') || '[]');
    const nuevoServicio = {
        id: servicioId,
        nombre: nombreServicio,
        creadoEl: new Date().toISOString()
    };
    serviciosPersonalizados.push(nuevoServicio);
    localStorage.setItem('serviciosPersonalizados', JSON.stringify(serviciosPersonalizados));
    
    // Actualizar el select del filtro principal con el nuevo servicio
    actualizarSelectServicios(servicioId, nombreServicio);
    
    // Crear la sábana usando la función existente
    crearNuevaSabana(servicioId);
}

function actualizarSelectServicios(servicioId, nombreServicio) {
    const selectFiltro = document.getElementById('filtroServicioActual');
    if (!selectFiltro) return;
    
    // Verificar si ya existe
    const existeOption = Array.from(selectFiltro.options).find(opt => opt.value === servicioId);
    if (existeOption) return;
    
    // Agregar al select del filtro
    const option = document.createElement('option');
    option.value = servicioId;
    option.textContent = `${nombreServicio} ⭐`;
    selectFiltro.appendChild(option);
}

function agregarServicioMasivo() {
    alert('Funcionalidad de agregar servicio en desarrollo. Próximamente podrás agregar servicios masivamente a múltiples habitaciones.');
}

function archivarPeriodo() {
    if (AppState.currentUser?.role !== 'admin') {
        alert('Solo los administradores pueden archivar periodos');
        return;
    }
    
    if (!confirm('Esto archivará todas las sábanas vigentes y limpiará los registros actuales. ¿Deseas continuar?')) {
        return;
    }

    const sabanaData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const historial = JSON.parse(localStorage.getItem('sabanaServiciosHistorial') || '[]');
    const fechaArchivo = new Date().toISOString();
    let sabanasArchivadas = 0;

    Object.entries(sabanaData).forEach(([servicioId, registros]) => {
        if (!Array.isArray(registros) || registros.length === 0) {
            return;
        }
        const servicioInfo = TIPOS_SERVICIO.find(s => s.id === servicioId);
        historial.push({
            id: `${servicioId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            servicioId,
            servicioNombre: servicioInfo?.nombre || servicioId,
            archivadoEl: fechaArchivo,
            total: registros.length,
            completados: registros.filter(item => item.realizado).length,
            datos: registros
        });
        sabanasArchivadas += 1;
    });

    localStorage.setItem('sabanaServiciosHistorial', JSON.stringify(historial));
    localStorage.setItem('sabanaServiciosData', JSON.stringify({}));

    const servicioActual = document.getElementById('filtroServicioActual')?.value || 'cambio_chapas';
    cambiarServicioActual(servicioActual);
    alert(sabanasArchivadas === 0 
        ? 'No había sábanas activas para archivar.'
        : `Periodo archivado correctamente. ${sabanasArchivadas} sábanas se movieron al historial.`);
}

function verHistorialServicios() {
    const modal = document.getElementById('modalHistorialSabanas');
    const listaContainer = document.getElementById('listaHistorialSabanas');
    
    if (!modal || !listaContainer) {
        alert('Error al abrir el historial.');
        return;
    }
    
    const historial = JSON.parse(localStorage.getItem('sabanaServiciosHistorial') || '[]');
    
    if (historial.length === 0) {
        listaContainer.innerHTML = `
            <div class="historial-vacio">
                <i class="fas fa-archive"></i>
                <p>Aún no hay sábanas archivadas.</p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem;">Usa el botón "+ Nueva" para comenzar a generar historial.</p>
            </div>
        `;
    } else {
        // Ordenar por fecha más reciente primero
        const historialOrdenado = historial.slice().reverse();
        
        listaContainer.innerHTML = historialOrdenado.map(entry => {
            const fecha = new Date(entry.archivadoEl);
            const fechaFormateada = fecha.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            const horaFormateada = fecha.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const porcentaje = entry.total > 0 
                ? Math.round((entry.completados / entry.total) * 100) 
                : 0;
            
            return `
                <div class="historial-item" onclick="cargarSabanaDesdeHistorial('${entry.id}')">
                    <div class="historial-item-header">
                        <div class="historial-item-titulo">
                            <i class="fas fa-clipboard-list"></i>
                            <span>${entry.servicioNombre}</span>
                        </div>
                        <div class="historial-item-fecha">
                            <i class="far fa-calendar-alt"></i>
                            ${fechaFormateada}
                        </div>
                    </div>
                    <div class="historial-item-stats">
                        <div class="historial-stat">
                            <i class="fas fa-check-circle"></i>
                            <span class="historial-stat-valor">${entry.completados}/${entry.total}</span>
                            <span>habitaciones</span>
                            <span class="historial-stat-porcentaje">${porcentaje}%</span>
                        </div>
                        <div class="historial-stat">
                            <i class="far fa-clock"></i>
                            <span>${horaFormateada}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    modal.style.display = 'flex';
}

function cerrarModalHistorial() {
    const modal = document.getElementById('modalHistorialSabanas');
    if (modal) {
        modal.style.display = 'none';
    }
}

function cargarSabanaDesdeHistorial(entryId) {
    const historial = JSON.parse(localStorage.getItem('sabanaServiciosHistorial') || '[]');
    const entry = historial.find(h => h.id === entryId);
    
    if (!entry) {
        alert('No se encontró la sábana en el historial.');
        return;
    }
    
    // Crear una copia temporal de la sábana archivada
    const allData = JSON.parse(localStorage.getItem('sabanaServiciosData') || '{}');
    const tempServiceId = `historial_${entry.servicioId}_${Date.now()}`;
    
    // Guardar temporalmente los datos históricos
    allData[tempServiceId] = entry.datos;
    localStorage.setItem('sabanaServiciosData', JSON.stringify(allData));
    
    // Actualizar el select si no existe el servicio
    const selectFiltro = document.getElementById('filtroServicioActual');
    if (selectFiltro) {
        const existeOption = Array.from(selectFiltro.options).find(opt => opt.value === entry.servicioId);
        if (!existeOption) {
            const option = document.createElement('option');
            option.value = tempServiceId;
            option.textContent = `${entry.servicioNombre} (Historial)`;
            selectFiltro.appendChild(option);
        }
        selectFiltro.value = existeOption ? entry.servicioId : tempServiceId;
    }
    
    // Cerrar modal y cargar datos
    cerrarModalHistorial();
    cambiarServicioActual(existeOption ? entry.servicioId : tempServiceId);
    
    // Mensaje informativo
    const fecha = new Date(entry.archivadoEl).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    alert(`Sábana cargada: ${entry.servicioNombre}\nArchivada el ${fecha}\n${entry.completados}/${entry.total} habitaciones completadas`);
}

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
window.toggleCambioRealizado = toggleCambioRealizado;
window.updateChecklistEstado = updateChecklistEstado;
window.exportarSabanaExcel = exportarSabanaExcel;
window.abrirModalNuevaSabana = abrirModalNuevaSabana;
window.cerrarModalNuevaSabana = cerrarModalNuevaSabana;
window.confirmarNuevaSabana = confirmarNuevaSabana;
window.toggleTipoServicioModal = toggleTipoServicioModal;
window.cerrarModalHistorial = cerrarModalHistorial;
window.cargarSabanaDesdeHistorial = cargarSabanaDesdeHistorial;
window.exportarChecklistExcel = exportarChecklistExcel;
window.mostrarModalNuevoUsuario = mostrarModalNuevoUsuario;
window.editarUsuario = editarUsuario;
window.desactivarUsuario = desactivarUsuario;
window.activarUsuario = activarUsuario;
window.desbloquearUsuario = desbloquearUsuario;
window.eliminarUsuario = eliminarUsuario;
window.cargarUsuarios = cargarUsuarios;
window.resetUsuarioForm = resetUsuarioForm;
window.archivarPeriodo = archivarPeriodo;
window.verHistorialFiltros = verHistorialFiltros;
window.verHistorialServicios = verHistorialServicios;
window.generarReporteChecklist = generarReporteChecklist;

console.log('✅ App.js cargado completamente');

