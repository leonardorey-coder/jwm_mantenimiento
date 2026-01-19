// ========================================
// APP.JS - Sistema Principal JW Marriott
// ========================================

// Configuración de la API
// En Vercel: URL relativa. En Electron/localhost: usar origin (puerto dinámico)
const API_BASE_URL =
  window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('vercel.com')
    ? ''
    : window.location.hostname === 'localhost'
      ? ''
      : '';

/**
 * Wrapper seguro para confirm() usando dialogo nativo en el proceso principal
 * @param {string} message - Mensaje del confirm
 * @returns {boolean} - Resultado del confirm
 */
function electronSafeConfirm(message) {
  if (window.electronAPI && window.electronAPI.dialog) {
    return window.electronAPI.dialog.confirm(message);
  }
  return confirm(message);
}

/**
 * Wrapper seguro para alert() usando dialogo nativo en el proceso principal
 * @param {string} message - Mensaje del alert
 */
function electronSafeAlert(message) {
  if (window.electronAPI && window.electronAPI.dialog) {
    window.electronAPI.dialog.alert(message);
    return;
  }
  alert(message);
}

// Exponer globalmente para uso en otros archivos
window.electronSafeConfirm = electronSafeConfirm;
window.electronSafeAlert = electronSafeAlert;

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
  filtroServicioEspacios: null, // Almacena el término de búsqueda de servicio para espacios comunes
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
    editor: '',
    imagenes: '',
  },
  checklistPagination: {
    page: 1,
    perPage: 4,
    totalPages: 1,
  },
  checklistFiltradas: [],
  inspeccionesRecientes: [],
};

// Exponer AppState globalmente para módulos externos
window.AppState = AppState;

// ========================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================

// Función auxiliar para hacer requests autenticados
async function fetchWithAuth(url, options = {}) {
  const accessToken =
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken');
  const tokenType =
    localStorage.getItem('tokenType') ||
    sessionStorage.getItem('tokenType') ||
    'Bearer';

  if (!accessToken) {
    console.error('❌ [FETCH-AUTH] No hay token de acceso');
    window.location.href = 'login.html';
    throw new Error('No hay sesión activa');
  }

  const headers = {
    ...options.headers,
    Authorization: `${tokenType} ${accessToken}`,
    'Content-Type': 'application/json',
  };

  console.log('🔵 [FETCH-AUTH] Haciendo petición a:', url);
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si el token expiró, intentar refrescar
  if (response.status === 401) {
    console.log(
      '⚠️ [FETCH-AUTH] Token expirado (401), intentando refrescar...'
    );
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Reintentar la petición con el nuevo token
      const newAccessToken = localStorage.getItem('accessToken');
      headers['Authorization'] = `${tokenType} ${newAccessToken}`;
      console.log('🔵 [FETCH-AUTH] Reintentando con nuevo token...');
      return await fetch(url, { ...options, headers });
    } else {
      console.error(
        '❌ [FETCH-AUTH] No se pudo refrescar el token, redirigiendo a login'
      );
      window.location.href = 'login.html';
    }
  }

  return response;
}

// Refrescar access token usando refresh token
async function refreshAccessToken() {
  const refreshToken =
    localStorage.getItem('refreshToken') ||
    sessionStorage.getItem('refreshToken');

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
      body: JSON.stringify({ refreshToken }),
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
  // Limpiar persistencia de Electron (si existe)
  if (window.electronAPI && window.electronAPI.auth) {
    console.log(
      '🔴 [LOGOUT] Limpiando almacenamiento persistente de Electron...'
    );
    window.electronAPI.auth
      .clear()
      .catch((err) => console.error('❌ Error limpiando Electron Auth:', err));
  }

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
  console.log(
    '🚀 [APP.JS] DOMContentLoaded - Inicializando JW Marriott Sistema de Mantenimiento...'
  );
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
        console.log(
          '🚀 [APP.JS] Ejecutando mostrarAlertasYRecientes() forzado'
        );
        window.mostrarAlertasYRecientes();
      }
    }, 300);
  }

  // Configurar listener para cierre limpio de IndexedDB en Electron
  if (window.electronAPI && window.electronAPI.onBeforeQuit) {
    window.electronAPI.onBeforeQuit(async () => {
      console.log(
        '🛑 [APP.JS] Recibido evento app:before-quit, cerrando IndexedDB...'
      );
      if (window.dbManager && typeof window.dbManager.close === 'function') {
        await window.dbManager.close();
        console.log('✅ [APP.JS] IndexedDB cerrado correctamente');
      }
    });
    console.log('✅ [APP.JS] Listener de cierre limpio configurado');
  }
});

// ========================================
// AUTENTICACIÓN
// ========================================

async function checkAuthentication() {
  console.log(
    '🔐 [APP.JS] checkAuthentication() - Verificando autenticación...'
  );
  // Verificar token JWT (en localStorage o sessionStorage)
  const accessToken =
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken');
  const currentUser = JSON.parse(
    localStorage.getItem('currentUser') ||
    sessionStorage.getItem('currentUser') ||
    'null'
  );

  console.log('🔐 [APP.JS] Datos de autenticación:', {
    hasAccessToken: !!accessToken,
    hasCurrentUser: !!currentUser,
    userEmail: currentUser?.email,
    userRol: currentUser?.rol,
  });

  if (!accessToken || !currentUser) {
    // Redirigir al login si no hay sesión
    console.log(
      '🔐 [APP.JS] No hay sesión válida, redirigiendo a login.html...'
    );
    window.location.href = 'login.html';
    return false;
  }

  // Siempre obtener datos frescos del usuario desde el backend
  console.log(
    '🔐 [APP.JS] Obteniendo datos actualizados del usuario desde /api/auth/me...'
  );
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.usuario) {
        // Actualizar el usuario con los datos frescos del backend (incluye background_url)
        console.log('✅ [APP.JS] Datos del usuario actualizados desde backend');

        // Mantener el rol normalizado
        const updatedUser = {
          ...data.usuario,
          rol: data.usuario.rol_nombre || data.usuario.rol,
        };

        const isRemembered = localStorage.getItem('currentUser') !== null;
        if (isRemembered) {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        } else {
          sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        // Usar los datos actualizados
        currentUser.requiere_cambio_password =
          updatedUser.requiere_cambio_password;
        currentUser.background_url = updatedUser.background_url;

        // Si requiere cambio de contraseña, redirigir
        if (currentUser.requiere_cambio_password) {
          console.warn(
            '🟡 [APP.JS] Usuario requiere cambio de contraseña. Redirigiendo...'
          );
          window.location.href = 'login.html?forcePassword=1';
          return false;
        }
      }
    }
  } catch (error) {
    console.error('❌ [APP.JS] Error al obtener datos del usuario:', error);
    // Continuar con los datos del localStorage si falla la llamada
    console.warn(
      '⚠️ [APP.JS] Usando datos del usuario en localStorage como fallback'
    );
  }

  // Si el usuario local tiene requiere_cambio_password y no pudimos verificar con backend
  if (currentUser.requiere_cambio_password) {
    console.warn('🟡 [APP.JS] Usuario local requiere cambio de contraseña.');
    window.location.href = 'login.html?forcePassword=1';
    return false;
  }

  // Normalizar el campo de rol para compatibilidad
  if (currentUser.rol && !currentUser.role) {
    currentUser.role = currentUser.rol.toLowerCase();
    console.log(
      '🔐 [APP.JS] Rol normalizado:',
      currentUser.rol,
      '->',
      currentUser.role
    );
  }

  // Verificar si el token sigue vigente
  AppState.currentUser = currentUser;
  console.log('🔐 [APP.JS] Usuario asignado a AppState:', AppState.currentUser);
  console.log(
    '🔐 [APP.JS] Background URL:',
    AppState.currentUser.background_url
  );

  // Actualizar UI con info del usuario
  console.log('🔐 [APP.JS] Actualizando UI del usuario...');
  updateUserInfo();

  // Aplicar permisos según el rol
  console.log('🔐 [APP.JS] Aplicando permisos de rol:', currentUser.role);
  applyRolePermissions(currentUser.role);

  // Disparar evento para que el background-manager aplique el fondo
  const userUpdatedEvent = new CustomEvent('user-updated', {
    detail: { user: currentUser },
  });
  document.dispatchEvent(userUpdatedEvent);
  console.log('🔐 [APP.JS] Evento user-updated disparado');

  console.log(
    '✅ [APP.JS] Usuario autenticado:',
    currentUser.nombre || currentUser.name,
    '-',
    currentUser.role
  );
  return true;
}

function updateUserInfo() {
  const { nombre, name, rol, role } = AppState.currentUser;

  document.getElementById('userName').textContent = nombre || name;
  document.getElementById('userRole').textContent = (rol || role).toUpperCase();
}

function applyRolePermissions(role) {
  console.log(
    '🔑 [APP.JS] applyRolePermissions() - Aplicando permisos para rol:',
    role
  );
  // Agregar clase al body según el rol
  document.body.classList.add(role);
  console.log('🔑 [APP.JS] Clase añadida al body:', role);

  // Manejar elementos admin-only
  if (role === 'admin') {
    console.log(
      '🔑 [APP.JS] Rol ADMIN detectado, mostrando elementos admin-only'
    );
    const adminElements = document.querySelectorAll('.admin-only');
    console.log(
      '🔑 [APP.JS] Elementos admin-only encontrados:',
      adminElements.length
    );

    adminElements.forEach((el, index) => {
      if (!el.classList.contains('tab-content')) {
        if (el.tagName === 'A' || el.tagName === 'BUTTON') {
          el.style.display = 'flex';
          console.log(
            `🔑 [APP.JS] Mostrando elemento ${index + 1}:`,
            el.tagName,
            el.classList.toString()
          );
        } else {
          el.style.display = 'block';
          console.log(
            `🔑 [APP.JS] Mostrando elemento ${index + 1}:`,
            el.tagName,
            el.classList.toString()
          );
        }
      }
    });
  } else {
    console.log('🔑 [APP.JS] Rol NO-ADMIN, ocultando elementos admin-only');
    document.querySelectorAll('.admin-only').forEach((el) => {
      if (!el.classList.contains('tab-content')) {
        el.style.display = 'none';
      }
    });
  }

  // Manejar elementos supervisor-only (para supervisor y admin)
  if (role === 'admin' || role === 'supervisor') {
    console.log(
      '🔑 [APP.JS] Rol SUPERVISOR/ADMIN detectado, mostrando elementos supervisor-only'
    );
    const supervisorElements = document.querySelectorAll('.supervisor-only');
    console.log(
      '🔑 [APP.JS] Elementos supervisor-only encontrados:',
      supervisorElements.length
    );

    supervisorElements.forEach((el, index) => {
      if (el.tagName === 'A' || el.tagName === 'BUTTON') {
        el.style.display = 'flex';
        console.log(
          `🔑 [APP.JS] Mostrando elemento supervisor ${index + 1}:`,
          el.tagName,
          el.classList.toString()
        );
      } else {
        el.style.display = 'block';
        console.log(
          `🔑 [APP.JS] Mostrando elemento supervisor ${index + 1}:`,
          el.tagName,
          el.classList.toString()
        );
      }
    });
  } else {
    console.log('🔑 [APP.JS] Rol TECNICO, ocultando elementos supervisor-only');
    document.querySelectorAll('.supervisor-only').forEach((el) => {
      el.style.display = 'none';
    });
  }

  console.log('👤 Permisos aplicados para rol:', role);
}

async function logout() {
  if (!electronSafeConfirm('¿Está seguro que desea cerrar sesión?')) {
    return;
  }

  console.log('🔴 [LOGOUT] Cerrando sesión...');

  try {
    const refreshToken =
      localStorage.getItem('refreshToken') ||
      sessionStorage.getItem('refreshToken');

    if (refreshToken) {
      console.log('🔴 [LOGOUT] Enviando petición de logout al servidor...');
      await fetchWithAuth(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
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

  // Botón de recargar página / verificar actualizaciones
  const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
  if (checkUpdatesBtn) {
    // En Electron: verificar actualizaciones + recargar
    // En Web/PWA: solo recargar la página
    const isElectron = window.electronAPI && window.electronAPI.updates;

    checkUpdatesBtn.addEventListener('click', async () => {
      const btn = checkUpdatesBtn;
      const badge = btn.querySelector('.update-badge');

      // Estado de carga
      btn.classList.add('checking');
      btn.disabled = true;

      try {
        if (isElectron) {
          // En Electron: verificar actualizaciones primero
          const result = await window.electronAPI.updates.check();

          if (result.error) {
            if (window.mostrarAlertaBlur) {
              window.mostrarAlertaBlur(result.error, 'warning');
            } else {
              alert(result.error);
            }
          } else if (result.hasUpdate) {
            // Hay actualización disponible
            if (badge) badge.style.display = 'flex';
            const mensaje = `¡Nueva versión ${result.latestVersion} disponible! (Actual: ${result.currentVersion})`;

            if (window.mostrarAlertaBlur) {
              window.mostrarAlertaBlur(mensaje, 'info');
            }

            // Preguntar si desea abrir la página de descarga
            if (
              electronSafeConfirm(
                `${mensaje}\n\n¿Desea abrir la página de descarga?`
              )
            ) {
              window.open(result.downloadUrl, '_blank');
            }
          } else {
            if (badge) badge.style.display = 'none';
            const mensajeExito = `Estás al día (v${result.currentVersion}). Recargando...`;
            if (window.mostrarAlertaBlur) {
              window.mostrarAlertaBlur(mensajeExito, 'success');
            }
            // Recargar después de mostrar el mensaje
            setTimeout(() => {
              location.reload(true);
            }, 1000);
          }
        } else {
          // En Web/PWA: hacer hot reload completo (limpiar caché, SW, y recargar todo)
          if (window.mostrarAlertaBlur) {
            window.mostrarAlertaBlur('Recargando desde cero...', 'info');
          }

          // Hot reload completo: limpiar caché, service workers y recargar
          await performHotReload();
        }
      } catch (error) {
        console.error('Error:', error);
        // En caso de error, igual recargar la página
        location.reload(true);
      } finally {
        btn.classList.remove('checking');
        btn.disabled = false;
      }
    });
  }

  // Navegación entre tabs - Desktop y móvil
  document
    .querySelectorAll('.premium-nav .link, .premium-nav-mobile .link')
    .forEach((link) => {
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

  // Drag to resize modals
  setupModalDragResize();

  console.log('✅ Event listeners configurados');
}

// ========================================
// HOT RELOAD - Recarga completa de la aplicación
// ========================================

/**
 * Realiza un hot reload completo de la aplicación:
 * 1. Limpia todas las cachés del navegador (Cache API)
 * 2. Desregistra todos los service workers activos
 * 3. Recarga la página con un cache buster para forzar carga fresca de HTML/JS/CSS
 */
async function performHotReload() {
  console.log('🔄 [HOT RELOAD] Iniciando recarga completa...');

  try {
    // 1. Limpiar Cache API (si está disponible)
    if ('caches' in window) {
      console.log('🧹 [HOT RELOAD] Limpiando Cache API...');
      const cacheNames = await caches.keys();
      console.log('🧹 [HOT RELOAD] Cachés encontradas:', cacheNames);

      await Promise.all(
        cacheNames.map(async (cacheName) => {
          console.log(`🧹 [HOT RELOAD] Eliminando caché: ${cacheName}`);
          await caches.delete(cacheName);
        })
      );
      console.log('✅ [HOT RELOAD] Cache API limpiada');
    }

    // 2. Desregistrar todos los Service Workers
    if ('serviceWorker' in navigator) {
      console.log('🔧 [HOT RELOAD] Desregistrando Service Workers...');
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (registrations.length > 0) {
        await Promise.all(
          registrations.map(async (registration) => {
            console.log(
              `🔧 [HOT RELOAD] Desregistrando SW: ${registration.scope}`
            );
            await registration.unregister();
          })
        );
        console.log('✅ [HOT RELOAD] Service Workers desregistrados');
      } else {
        console.log('ℹ️ [HOT RELOAD] No hay Service Workers activos');
      }
    }

    // 3. Limpiar localStorage de cachés temporales (preservar auth y preferencias)
    const keysToPreserve = [
      'accessToken',
      'refreshToken',
      'currentUser',
      'usuarioActualId',
      'theme',
      'rememberMe',
    ];

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        !keysToPreserve.includes(key) &&
        (key.startsWith('ultimos') || key.startsWith('cached'))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      console.log(`🧹 [HOT RELOAD] Eliminando localStorage: ${key}`);
      localStorage.removeItem(key);
    });

    console.log('✅ [HOT RELOAD] Cachés de datos limpiadas');

    // 4. Forzar recarga sin caché agregando timestamp como cache buster
    const timestamp = Date.now();
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('_reload', timestamp);

    console.log('🚀 [HOT RELOAD] Recargando desde:', currentUrl.href);

    // Pequeña pausa para mostrar el mensaje
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Navegar a la nueva URL (esto fuerza recarga completa)
    window.location.href = currentUrl.href;
  } catch (error) {
    console.error('❌ [HOT RELOAD] Error durante hot reload:', error);
    // Fallback: recargar normalmente
    window.location.reload(true);
  }
}

// ========================================
// MODAL DRAG TO RESIZE
// ========================================
function setupModalDragResize() {
  // Usar delegación de eventos para capturar todos los modales
  document.addEventListener('touchstart', handleModalDragStart, {
    passive: false,
  });
  document.addEventListener('mousedown', handleModalDragStart);
}

function handleModalDragStart(e) {
  const header = e.target.closest('.modal-detalles-header');
  if (!header) return;

  // IMPORTANTE: Si el click/touch es en el botón de cierre, NO interceptar
  const closeButton = e.target.closest('.modal-detalles-cerrar');
  if (closeButton) return;

  const modalContent = header.closest(
    '.modal-detalles-contenido, .checklist-details-content'
  );
  if (!modalContent) return;

  // Solo activar si el touch/click es en la zona superior del header (cerca del indicador)
  const headerRect = header.getBoundingClientRect();
  const clickY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  const relativeY = clickY - headerRect.top;

  // Solo activar si está en los primeros 25px (zona del drag indicator)
  if (relativeY > 25) return;

  e.preventDefault();

  const startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  const startHeight = modalContent.offsetHeight;
  const windowHeight = window.innerHeight;
  const minHeight = 300;
  const maxHeight = windowHeight * 0.95;

  modalContent.classList.add('modal-dragging');

  function handleMove(moveEvent) {
    const currentY =
      moveEvent.type === 'touchmove'
        ? moveEvent.touches[0].clientY
        : moveEvent.clientY;
    const deltaY = startY - currentY; // Positivo cuando arrastra hacia arriba
    let newHeight = startHeight + deltaY;

    // Limitar altura
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    modalContent.style.maxHeight = newHeight + 'px';
  }

  function handleEnd() {
    modalContent.classList.remove('modal-dragging');

    // Si está casi al máximo, expandir completamente
    const currentHeight = modalContent.offsetHeight;
    if (currentHeight > windowHeight * 0.85) {
      modalContent.classList.add('modal-expanded');
      modalContent.style.maxHeight = '';
    } else {
      modalContent.classList.remove('modal-expanded');
    }

    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('touchend', handleEnd);
    document.removeEventListener('mouseup', handleEnd);
  }

  document.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('touchend', handleEnd);
  document.addEventListener('mouseup', handleEnd);
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
  const contenedorFiltrosEspacios = document.getElementById(
    'contenedorFiltrosEspacios'
  );

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
  const contenedorFiltrosSabana = document.getElementById(
    'contenedorFiltrosSabana'
  );

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
  const contenedorFiltrosTareas = document.getElementById(
    'contenedorFiltrosTareas'
  );

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

  // Filtro de estado de servicio en Sábana con indicador visual
  const filtroEstadoServicio = document.getElementById('filtroEstadoServicio');
  if (filtroEstadoServicio) {
    const semaforoWrapperServicio = filtroEstadoServicio.closest(
      '[data-semaforo-wrapper]'
    );
    const semaforoIndicatorServicio = semaforoWrapperServicio
      ? semaforoWrapperServicio.querySelector('.semaforo-indicator')
      : null;

    filtroEstadoServicio.addEventListener('change', () => {
      // Actualizar semáforo visual
      if (semaforoIndicatorServicio) {
        semaforoIndicatorServicio.classList.remove(
          'estado-realizado',
          'estado-pendiente'
        );
        if (filtroEstadoServicio.value) {
          semaforoIndicatorServicio.classList.add(
            `estado-${filtroEstadoServicio.value}`
          );
        }
      }
      filterSabana();
    });

    // Actualizar semáforo inicial si hay un valor seleccionado
    if (semaforoIndicatorServicio && filtroEstadoServicio.value) {
      semaforoIndicatorServicio.classList.add(
        `estado-${filtroEstadoServicio.value}`
      );
    }
  }

  // Buscador de Checklist
  const buscarChecklist = document.getElementById('buscarChecklist');
  if (buscarChecklist) {
    buscarChecklist.addEventListener('input', (e) => {
      filterChecklist(e.target.value);
    });
  }

  // Buscador de Habitación en Checklist
  const buscarHabitacionChecklist = document.getElementById(
    'buscarHabitacionChecklist'
  );
  if (buscarHabitacionChecklist) {
    buscarHabitacionChecklist.addEventListener('input', (e) => {
      AppState.checklistFilters.habitacion = e.target.value;
      AppState.checklistPagination.page = 1;
      applyChecklistFilters();
    });
  }

  // Filtro de estado de checklist
  const filtroEstadoChecklist = document.getElementById(
    'filtroEstadoChecklist'
  );
  if (filtroEstadoChecklist) {
    const semaforoWrapperChecklist = filtroEstadoChecklist.closest(
      '[data-semaforo-wrapper]'
    );
    const semaforoIndicatorChecklist = semaforoWrapperChecklist
      ? semaforoWrapperChecklist.querySelector('.semaforo-indicator')
      : null;

    filtroEstadoChecklist.addEventListener('change', (e) => {
      // Actualizar semáforo visual
      if (semaforoIndicatorChecklist) {
        semaforoIndicatorChecklist.classList.remove(
          'estado-bueno',
          'estado-regular',
          'estado-malo'
        );
        if (filtroEstadoChecklist.value) {
          semaforoIndicatorChecklist.classList.add(
            `estado-${filtroEstadoChecklist.value}`
          );
        }
      }
      filterChecklistByEstado(e.target.value);
    });

    // Actualizar semáforo inicial si hay un valor seleccionado
    if (semaforoIndicatorChecklist && filtroEstadoChecklist.value) {
      semaforoIndicatorChecklist.classList.add(
        `estado-${filtroEstadoChecklist.value}`
      );
    }
  }

  // Filtros de espacios comunes
  const buscarEspacioInput = document.getElementById('buscarEspacio');
  const buscarServicioInput = document.getElementById('buscarServicioEspacio');
  const filtroEdificioEspacioSelect = document.getElementById(
    'filtroEdificioEspacio'
  );
  const filtroAreaEspacioSelect = document.getElementById('filtroAreaEspacio');
  const filtroTipoSelect = document.getElementById('filtroTipoEspacio');
  const filtroPrioridadEspacioSelect = document.getElementById(
    'filtroPrioridadEspacio'
  );
  const filtroEstadoEspacioSelect = document.getElementById(
    'filtroEstadoEspacio'
  );

  if (buscarEspacioInput)
    buscarEspacioInput.addEventListener('input', filterEspaciosComunes);
  if (buscarServicioInput)
    buscarServicioInput.addEventListener('input', filterEspaciosComunes);
  if (filtroEdificioEspacioSelect) {
    filtroEdificioEspacioSelect.addEventListener('change', function () {
      // Actualizar áreas disponibles según edificio seleccionado
      poblarFiltroAreasEspacios();
      filterEspaciosComunes();
    });
  }
  if (filtroAreaEspacioSelect)
    filtroAreaEspacioSelect.addEventListener('change', filterEspaciosComunes);
  if (filtroTipoSelect)
    filtroTipoSelect.addEventListener('change', filterEspaciosComunes);

  // Configurar semáforo visual para filtro de prioridad de espacios
  if (filtroPrioridadEspacioSelect) {
    const semaforoWrapperPrioridad = filtroPrioridadEspacioSelect.closest(
      '[data-semaforo-wrapper]'
    );
    const semaforoIndicatorPrioridad = semaforoWrapperPrioridad
      ? semaforoWrapperPrioridad.querySelector('.semaforo-indicator')
      : null;

    filtroPrioridadEspacioSelect.addEventListener('change', function () {
      // Actualizar semáforo visual
      if (semaforoIndicatorPrioridad) {
        semaforoIndicatorPrioridad.classList.remove(
          'prioridad-baja',
          'prioridad-media',
          'prioridad-alta'
        );
        if (filtroPrioridadEspacioSelect.value) {
          semaforoIndicatorPrioridad.classList.add(
            `prioridad-${filtroPrioridadEspacioSelect.value}`
          );
        }
      }
      // Ejecutar filtro
      filterEspaciosComunes();
    });

    // Actualizar semáforo inicial si hay un valor seleccionado
    if (semaforoIndicatorPrioridad && filtroPrioridadEspacioSelect.value) {
      semaforoIndicatorPrioridad.classList.add(
        `prioridad-${filtroPrioridadEspacioSelect.value}`
      );
    }
  }

  // Configurar semáforo visual para filtro de estado de espacios
  if (filtroEstadoEspacioSelect) {
    const semaforoWrapperEstado = filtroEstadoEspacioSelect.closest(
      '[data-semaforo-wrapper]'
    );
    const semaforoIndicatorEstado = semaforoWrapperEstado
      ? semaforoWrapperEstado.querySelector('.semaforo-indicator')
      : null;

    filtroEstadoEspacioSelect.addEventListener('change', function () {
      // Actualizar semáforo visual
      if (semaforoIndicatorEstado) {
        semaforoIndicatorEstado.classList.remove(
          'estado-disponible',
          'estado-ocupado',
          'estado-mantenimiento',
          'estado-fuera_servicio'
        );
        if (filtroEstadoEspacioSelect.value) {
          semaforoIndicatorEstado.classList.add(
            `estado-${filtroEstadoEspacioSelect.value}`
          );
        }
      }
      // Ejecutar filtro
      filterEspaciosComunes();
    });

    // Actualizar semáforo inicial si hay un valor seleccionado
    if (semaforoIndicatorEstado && filtroEstadoEspacioSelect.value) {
      semaforoIndicatorEstado.classList.add(
        `estado-${filtroEstadoEspacioSelect.value}`
      );
    }
  }
}

function filterEspaciosComunes() {
  const buscarEspacio =
    document.getElementById('buscarEspacio')?.value.toLowerCase() || '';
  const buscarServicio =
    document.getElementById('buscarServicioEspacio')?.value.toLowerCase() || '';
  const filtroEdificio =
    document.getElementById('filtroEdificioEspacio')?.value || '';
  const filtroArea =
    document.getElementById('filtroAreaEspacio')?.value || '';
  const tipoFiltro = document.getElementById('filtroTipoEspacio')?.value || '';
  const prioridadFiltro =
    document.getElementById('filtroPrioridadEspacio')?.value || '';
  const estadoFiltro =
    document.getElementById('filtroEstadoEspacio')?.value || '';

  // Usar AppState para acceder a los datos globales
  const espaciosComunes = AppState.espaciosComunes || [];
  const mantenimientosEspacios = AppState.mantenimientosEspacios || [];

  const espaciosFiltrados = espaciosComunes.filter((espacio) => {
    const coincideNombre =
      !buscarEspacio || espacio.nombre.toLowerCase().includes(buscarEspacio);
    const coincideEdificio =
      !filtroEdificio ||
      espacio.edificio_id?.toString() === filtroEdificio ||
      espacio.edificio_nombre === filtroEdificio;
    const coincideArea =
      !filtroArea ||
      espacio.area_id?.toString() === filtroArea ||
      espacio.area_nombre === filtroArea;
    const coincideTipo = !tipoFiltro || espacio.tipo === tipoFiltro;
    const coincideEstado = !estadoFiltro || espacio.estado === estadoFiltro;

    const mantenimientosEspacio = mantenimientosEspacios.filter(
      (m) => m.espacio_comun_id === espacio.id
    );

    // Buscar servicio por descripción O por ID hexadecimal (serv-XXX)
    const coincideServicio =
      !buscarServicio ||
      mantenimientosEspacio.some((m) => {
        // Buscar por descripción
        if (m.descripcion.toLowerCase().includes(buscarServicio)) return true;

        // Buscar por ID hexadecimal (serv-XXX)
        const servicioHexId =
          'serv-' + m.id.toString(16).padStart(3, '0').toLowerCase();
        if (servicioHexId.includes(buscarServicio)) return true;

        // Buscar solo el número hex sin prefijo
        const hexSinPrefijo = m.id.toString(16).padStart(3, '0').toLowerCase();
        if (buscarServicio.includes(hexSinPrefijo)) return true;

        return false;
      });

    const coincidePrioridad =
      !prioridadFiltro ||
      mantenimientosEspacio.some((m) => m.prioridad === prioridadFiltro);

    return (
      coincideNombre &&
      coincideEdificio &&
      coincideArea &&
      coincideTipo &&
      coincideEstado &&
      coincideServicio &&
      coincidePrioridad
    );
  });

  // Almacenar el término de búsqueda de servicio para filtrar servicios específicos en las cards
  AppState.filtroServicioEspacios =
    buscarServicio.trim() !== '' ? buscarServicio : null;

  const mensajeNoResultados = document.getElementById('mensajeNoEspacios');
  const lista = document.getElementById('listaEspaciosComunes');

  if (espaciosFiltrados.length === 0) {
    if (mensajeNoResultados) mensajeNoResultados.style.display = 'block';
    if (lista) lista.style.display = 'none';
    // Also hide pagination when no results
    const paginacion = document.getElementById('espaciosPagination');
    if (paginacion) paginacion.style.display = 'none';
  } else {
    if (mensajeNoResultados) mensajeNoResultados.style.display = 'none';
    if (lista) lista.style.display = 'grid';

    // Update filtered spaces via the module's setter if available
    if (typeof window.setEspaciosComunesFiltrados === 'function') {
      window.setEspaciosComunesFiltrados(espaciosFiltrados);
      if (window.mostrarEspaciosComunes) {
        window.mostrarEspaciosComunes();
      }
    } else if (window.mostrarEspaciosComunes) {
      // Fallback: Temporarily replace AppState espacios
      const espaciosOriginales = AppState.espaciosComunes;
      AppState.espaciosComunes = espaciosFiltrados;
      window.mostrarEspaciosComunes();
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
      const modalUsuario = document.getElementById('modalUsuario');
      if (modalUsuario && modalUsuario.style.display !== 'none') {
        cerrarModalUsuario();
        return;
      }

      const modalDetalle = document.getElementById('modalDetalleUsuario');
      if (modalDetalle && modalDetalle.style.display !== 'none') {
        cerrarModalDetalleUsuario();
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

  tabContents.forEach((tab) => {
    const selector = tab.querySelector('.mobile-view-selector');
    if (!selector) return;

    const viewButtons = selector.querySelectorAll('.view-btn');
    const vistaDuo = tab.querySelector('.vista-duo');

    if (!vistaDuo) return;

    const columnaHabitaciones = vistaDuo.querySelector('.columna-principal');
    const columnaAlertas = vistaDuo.querySelector('.columna-lateral');

    // Verificar si estamos en el tab de checklist
    const isChecklistTab = tab.id === 'tab-checklist';

    viewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.getAttribute('data-view');

        // Actualizar botones activos solo en este selector
        viewButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');

        // Actualizar posición del slider animado
        const buttonIndex = Array.from(viewButtons).indexOf(button);
        if (buttonIndex === 0) {
          selector.classList.remove('slider-right');
        } else {
          selector.classList.add('slider-right');
        }

        if (isChecklistTab) {
          // En checklist tab: alternar entre grid y paneles laterales
          const checklistGrid =
            columnaHabitaciones?.querySelector('.checklist-grid');
          const paginacion = columnaHabitaciones?.querySelector(
            '.checklist-pagination'
          );

          if (view === 'checklists') {
            // Mostrar grid de checklists
            if (columnaHabitaciones)
              columnaHabitaciones.style.display = 'block';
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
            if (columnaHabitaciones)
              columnaHabitaciones.style.display = 'block';
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
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.remove('active');
  });

  // Desactivar todos los enlaces de navegación - Desktop y móvil
  document
    .querySelectorAll('.premium-nav .link, .premium-nav-mobile .link')
    .forEach((link) => {
      link.classList.remove('active');
    });

  // Mostrar el tab seleccionado
  const selectedTab = document.getElementById(`tab-${tabId}`);
  if (selectedTab) {
    selectedTab.classList.add('active');

    // Refrescar AOS en el nuevo tab
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  }

  // Activar el botón correspondiente - Desktop y móvil
  const selectedButtons = document.querySelectorAll(`[data-tab="${tabId}"]`);
  selectedButtons.forEach((button) => {
    button.classList.add('active');
  });

  AppState.currentTab = tabId;

  // Cargar datos específicos del tab solo si se solicita
  if (loadData) {
    loadTabData(tabId);
  }

  console.log('📄 Tab activo:', tabId);
}

const MAX_HAB_RENDER_RETRIES = 5;
let habRenderAttempts = 0;

function renderHabitacionesSafely(origen = 'tab-switch') {
  habRenderAttempts += 1;

  if (window.renderHabitacionesUI) {
    window.renderHabitacionesUI(origen);
    return true;
  }

  if (habRenderAttempts <= MAX_HAB_RENDER_RETRIES) {
    setTimeout(
      () => renderHabitacionesSafely(`${origen}-retry${habRenderAttempts}`),
      200
    );
  } else {
    console.warn('renderHabitacionesUI no disponible tras reintentos', {
      origen,
      habRenderAttempts,
    });
  }

  return false;
}

function loadTabData(tabId) {
  console.log('📁 [APP.JS] loadTabData INICIANDO - Tab:', tabId);
  console.log('📁 [APP.JS] Timestamp:', new Date().toISOString());

  switch (tabId) {
    case 'habitaciones':
      console.log('📁 [APP.JS] Procesando tab: habitaciones');
      // reset attempts on tab load
      habRenderAttempts = 0;
      if (!renderHabitacionesSafely('tab-switch')) {
        console.warn(
          '📁 [APP.JS] renderHabitacionesUI no disponible, se reintentará'
        );
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

  // Siempre recargar datos frescos para reflejar actividad reciente (último acceso, sesiones)
  await cargarRoles();
  await cargarUsuarios(true); // forceReload = true
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
        console.log(
          '✅ [LOAD-DATA] Edificios cargados:',
          AppState.edificios.length
        );
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
      const cuartosResponse = await fetchWithAuth(
        `${API_BASE_URL}/api/cuartos`
      );
      if (cuartosResponse.ok) {
        AppState.cuartos = await cuartosResponse.json();
        console.log(
          '✅ [LOAD-DATA] Cuartos cargados:',
          AppState.cuartos.length
        );
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
      const espaciosResponse = await fetchWithAuth(
        `${API_BASE_URL}/api/espacios-comunes`
      );
      if (espaciosResponse.ok) {
        AppState.espaciosComunes = await espaciosResponse.json();
        console.log(
          '✅ [LOAD-DATA] Espacios comunes cargados:',
          AppState.espaciosComunes.length
        );
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
    console.error(
      '❌ [LOAD-DATA] Error general cargando datos iniciales:',
      error
    );
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
      const sabanasActivas = sabanas.filter((s) => !s.archivada);
      if (sabanasActivas.length > 0) {
        // Ordenar por fecha_creacion DESC y obtener la primera (más reciente)
        const ultimaSabana = sabanasActivas.sort(
          (a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)
        )[0];

        console.log(
          '⭐ [SABANA] Cargando última sábana por defecto:',
          ultimaSabana.nombre
        );
        selectServicio.value = ultimaSabana.id;
        await window.cambiarServicioActual(ultimaSabana.id);
      }
    }
  } else {
    console.log('📋 [SABANA] Select ya tiene opciones, no recargar');
  }

  // Solo mostrar mensaje si no hay sábana seleccionada
  if (!selectServicio || !selectServicio.value) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="sabana-placeholder">Selecciona o crea una sábana para comenzar.</td></tr>';

    const tituloEl = document.getElementById('tituloServicioActual');
    if (tituloEl) {
      tituloEl.textContent = 'Sábana de Servicios';
    }

    const sabanaIdTab = document.getElementById('sabanaIdTab');
    if (sabanaIdTab) {
      sabanaIdTab.classList.remove('is-visible');
    }
  } else {
    console.log('📋 [SABANA] Ya hay una sábana seleccionada, mantener tabla');
  }
}

// FUNCIÓN OBSOLETA - Ahora se usa la de sabana-functions.js
// Esta función ya no se usa, se mantiene solo por compatibilidad
function renderSabanaTable_OLD(data) {
  console.warn(
    '⚠️ Llamando a función obsoleta renderSabanaTable_OLD - usar sabana-functions.js'
  );
  const tbody = document.getElementById('sabanaTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="sabana-placeholder">No hay registros para este servicio. Usa el botón "+ Nueva" para crear la sábana.</td></tr>';
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
      tr.className = row.realizado
        ? 'servicio-realizado'
        : 'servicio-pendiente';
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
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              observer.disconnect();
              sentinel.remove();
              setTimeout(renderBatch, 50); // Pequeño delay para suavidad
            }
          });
        },
        { rootMargin: '200px' }
      );

      observer.observe(sentinel);
    }
  };

  // Iniciar primer lote
  renderBatch();
}

// FUNCIÓN OBSOLETA - Ahora se usa la de sabana-functions.js
function cambiarServicioActual_OLD(servicioId) {
  console.warn(
    '⚠️ Llamando a función obsoleta cambiarServicioActual_OLD - usar sabana-functions.js'
  );
  const serviciosPersonalizados = JSON.parse(
    localStorage.getItem('serviciosPersonalizados') || '[]'
  );
  const servicio = serviciosPersonalizados.find((s) => s.id === servicioId);

  const nombreServicio = servicio?.nombre || 'Servicio';

  // Actualizar título
  const tituloEl = document.getElementById('tituloServicioActual');
  if (tituloEl) {
    tituloEl.textContent = `Sábana de${nombreServicio}`;
  }

  // Cargar datos del servicio
  const allData = JSON.parse(
    localStorage.getItem('sabanaServiciosData') || '{}'
  );
  const servicioData = allData[servicioId] || [];

  renderSabanaTable_OLD(servicioData);
  updateServiciosStats(servicioData);
}

function updateServiciosStats(data) {
  const completados = data.filter((s) => s.realizado).length;
  const total = data.length;

  const completadosEl = document.getElementById('serviciosCompletados');
  const totalesEl = document.getElementById('serviciosTotales');

  if (completadosEl) completadosEl.textContent = completados;
  if (totalesEl) totalesEl.textContent = total;
}

function toggleServicioRealizado(tipoServicio, cuartoId) {
  const allData = JSON.parse(
    localStorage.getItem('sabanaServiciosData') || '{}'
  );
  const servicioData = allData[tipoServicio] || [];
  const servicio = servicioData.find((s) => s.id === cuartoId);

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
    console.log(
      `✅ Servicio ${servicio.realizado ? 'marcado como realizado' : 'marcado como pendiente'} - ${servicio.habitacion}`
    );
  }
}

function updateObservaciones(tipoServicio, cuartoId, observaciones) {
  const allData = JSON.parse(
    localStorage.getItem('sabanaServiciosData') || '{}'
  );
  const servicioData = allData[tipoServicio] || [];
  const servicio = servicioData.find((s) => s.id === cuartoId);

  if (servicio) {
    servicio.observaciones = observaciones;
    allData[tipoServicio] = servicioData;
    localStorage.setItem('sabanaServiciosData', JSON.stringify(allData));
    console.log(
      `📝 Observaciones actualizadas para habitación ${servicio.habitacion}`
    );
  }
}

// FUNCIÓN OBSOLETA - Ahora se usa filterSabana de sabana-functions.js
function filterSabana_OLD() {
  console.warn(
    '⚠️ Llamando a función obsoleta filterSabana_OLD - usar sabana-functions.js'
  );
  const searchTerm =
    document.getElementById('buscarSabana')?.value.toLowerCase() || '';
  const edificioFiltro =
    document.getElementById('filtroEdificioSabana')?.value || '';
  const estadoFiltro =
    document.getElementById('filtroEstadoServicio')?.value || '';
  const servicioActual =
    document.getElementById('filtroServicioActual')?.value || 'cambio_chapas';

  const allData = JSON.parse(
    localStorage.getItem('sabanaServiciosData') || '{}'
  );
  const servicioData = allData[servicioActual] || [];

  const filtered = servicioData.filter((row) => {
    const matchSearch =
      !searchTerm ||
      row.habitacion.toLowerCase().includes(searchTerm) ||
      row.edificio.toLowerCase().includes(searchTerm) ||
      row.responsable.toLowerCase().includes(searchTerm);

    const matchEdificio = !edificioFiltro || row.edificio === edificioFiltro;
    const matchEstado =
      !estadoFiltro ||
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
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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

var CHECKLIST_ESTADOS = ['bueno', 'regular', 'malo'];
var CHECKLIST_ESTADO_LABELS = {
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Malo',
};

// Datos mock de inspecciones recientes
const DEFAULT_INSPECCIONES_RECIENTES = [
  {
    habitacion: 'A101',
    titulo: 'Revisión completa AC',
    tecnico: 'María López',
    fecha: 'Hoy · 09:15 AM',
    estado: 'pendiente',
  },
  {
    habitacion: '201',
    titulo: 'Cambio de Filtros',
    tecnico: 'Carlos Ruiz',
    fecha: 'Ayer · 04:45 PM',
    estado: 'aprobada',
  },
  {
    habitacion: '203',
    titulo: 'Inspección TV',
    tecnico: 'Ana García',
    fecha: 'Ayer · 02:20 PM',
    estado: 'aprobada',
  },
];

// Flag para controlar si el checklist ya fue cargado
let checklistCargado = false;

/**
 * Forzar recarga del checklist (resetea el flag y recarga)
 * Usar después de agregar/eliminar secciones o ítems
 */
function recargarChecklistData() {
  checklistCargado = false;
  loadChecklistData();
}

function loadChecklistData() {
  // Si ya está cargado, no mostrar skeleton ni recargar
  if (checklistCargado) {
    return;
  }

  // Limpiar datos antiguos del localStorage para asegurar sincronización con BD
  // Los datos frescos se cargarán desde la API
  localStorage.removeItem('checklistData');

  // Si existe la función de checklist-tab.js que usa la API, usarla
  if (typeof loadChecklistDataFromAPI === 'function') {
    return loadChecklistDataFromAPI();
  }

  // Si existe ChecklistAPI, cargar desde la API
  if (typeof ChecklistAPI !== 'undefined') {
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
                ${[0, 1, 2, 3, 4]
      .map(
        (i) => `
                    <div class="skeleton-item">
                        <div class="skeleton-item-name" style="width: ${itemWidths[i % itemWidths.length]}"></div>
                        <div class="skeleton-item-buttons">
                            <div class="skeleton-btn"></div>
                            <div class="skeleton-btn"></div>
                            <div class="skeleton-btn"></div>
                        </div>
                    </div>
                `
      )
      .join('')}
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

    AppState.checklistCategorias = categorias.map((cat) => ({
      id: cat.slug || cat.id.toString(),
      db_id: cat.id,
      nombre: cat.nombre,
      icono: cat.icono || 'fa-layer-group',
      orden: cat.orden,
    }));

    // Cargar datos de checklist
    const checklistData = await ChecklistAPI.getAllChecklistData();

    // Guardar en AppState como fuente de verdad (memoria)
    AppState.checklistFiltradas = checklistData;

    // Guardar copia de referencia completa (no se modifica con filtros)
    AppState.checklistDataCompleto = JSON.parse(JSON.stringify(checklistData));
    AppState.checklistPagination.totalPages = Math.ceil(
      checklistData.length / AppState.checklistPagination.perPage
    );

    // Poblar filtros de edificios, editores e iconos
    poblarFiltroEdificiosChecklist();
    poblarFiltroEditoresChecklist();
    poblarSelectIconos();

    // Marcar como cargado para evitar recargar skeleton al volver al tab
    checklistCargado = true;

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

  // Obtener edificios desde AppState
  let edificios = [];

  if (AppState.edificios && AppState.edificios.length > 0) {
    edificios = AppState.edificios.map((e) => ({ id: e.id, nombre: e.nombre }));
  } else if (
    AppState.checklistFiltradas &&
    AppState.checklistFiltradas.length > 0
  ) {
    // Extraer edificios únicos desde los datos cargados en memoria
    const edificiosMap = new Map();
    AppState.checklistFiltradas.forEach((hab) => {
      if (hab.edificio_id && hab.edificio_nombre) {
        edificiosMap.set(hab.edificio_id, hab.edificio_nombre);
      } else if (hab.edificio) {
        edificiosMap.set(hab.edificio, hab.edificio);
      }
    });
    edificios = Array.from(edificiosMap.entries()).map(([id, nombre]) => ({
      id: typeof id === 'number' ? id : nombre,
      nombre: nombre,
    }));
  }

  // Agregar opciones ordenadas
  edificios
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .forEach((edificio) => {
      const option = document.createElement('option');
      option.value = edificio.id;
      option.textContent = edificio.nombre;
      select.appendChild(option);
    });
}

/**
 * Poblar el select de filtro de edificios para espacios comunes
 */
function poblarFiltroEdificiosEspacios() {
  const select = document.getElementById('filtroEdificioEspacio');
  if (!select) return;

  // Limpiar opciones existentes (excepto la primera "Todos")
  select.innerHTML = '<option value="">Todos los edificios</option>';

  // Obtener edificios desde AppState o extraer de los espacios comunes
  let edificios = [];

  if (AppState.edificios && AppState.edificios.length > 0) {
    edificios = AppState.edificios.map((e) => ({ id: e.id, nombre: e.nombre }));
  } else {
    // Extraer edificios únicos de los espacios comunes
    const espaciosComunes = AppState.espaciosComunes || [];
    const edificiosMap = new Map();
    espaciosComunes.forEach((espacio) => {
      if (espacio.edificio_id && espacio.edificio_nombre) {
        edificiosMap.set(espacio.edificio_id, espacio.edificio_nombre);
      }
    });
    edificios = Array.from(edificiosMap.entries()).map(([id, nombre]) => ({
      id: parseInt(id),
      nombre: nombre,
    }));
  }

  // Agregar opciones ordenadas por nombre
  edificios
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .forEach((edificio) => {
      const option = document.createElement('option');
      option.value = edificio.id.toString();
      option.textContent = edificio.nombre;
      select.appendChild(option);
    });

  console.log(
    '🏢 [APP.JS] Filtro de edificios (espacios) poblado:',
    edificios.length
  );
}

// Hacer la función disponible globalmente
window.poblarFiltroEdificiosEspacios = poblarFiltroEdificiosEspacios;

/**
 * Poblar el select de filtro de áreas para espacios comunes
 * Se actualiza dinámicamente cuando cambia el edificio seleccionado
 */
function poblarFiltroAreasEspacios() {
  const select = document.getElementById('filtroAreaEspacio');
  if (!select) return;

  const filtroEdificio = document.getElementById('filtroEdificioEspacio')?.value || '';

  // Limpiar opciones existentes
  select.innerHTML = '<option value="">Todas las áreas</option>';

  // Extraer áreas únicas de los espacios comunes
  const espaciosComunes = AppState.espaciosComunes || [];
  const areasMap = new Map();

  espaciosComunes.forEach((espacio) => {
    // Si hay un edificio seleccionado, solo mostrar áreas de ese edificio
    if (filtroEdificio) {
      const edificioMatch =
        espacio.edificio_id?.toString() === filtroEdificio ||
        espacio.edificio_nombre === filtroEdificio;
      if (!edificioMatch) return;
    }

    if (espacio.area_id && espacio.area_nombre) {
      areasMap.set(espacio.area_id, espacio.area_nombre);
    }
  });

  const areas = Array.from(areasMap.entries()).map(([id, nombre]) => ({
    id: parseInt(id),
    nombre: nombre,
  }));

  // Agregar opciones ordenadas por nombre
  areas
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .forEach((area) => {
      const option = document.createElement('option');
      option.value = area.id.toString();
      option.textContent = area.nombre;
      select.appendChild(option);
    });

  console.log(
    '📍 [APP.JS] Filtro de áreas (espacios) poblado:',
    areas.length,
    filtroEdificio ? `(filtrado por edificio ${filtroEdificio})` : '(todas)'
  );
}

// Hacer la función disponible globalmente
window.poblarFiltroAreasEspacios = poblarFiltroAreasEspacios;

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
    usuarios = JSON.parse(
      localStorage.getItem('users') ||
      localStorage.getItem('usuariosData') ||
      '[]'
    );
  }

  // También extraer editores únicos de los datos de checklist en AppState
  const checklistData =
    AppState.checklistDataCompleto || AppState.checklistFiltradas || [];
  const editoresSet = new Set();
  checklistData.forEach((hab) => {
    if (hab.ultimo_editor) editoresSet.add(hab.ultimo_editor);
  });

  // Combinar usuarios de BD con editores encontrados en checklist
  const todosEditores = new Set([
    ...usuarios.map((u) => u.nombre),
    ...editoresSet,
  ]);

  // Agregar opciones ordenadas
  Array.from(todosEditores)
    .filter(Boolean)
    .sort()
    .forEach((editor) => {
      const option = document.createElement('option');
      option.value = editor;
      option.textContent = editor;
      select.appendChild(option);
    });

  console.log(
    '👥 [APP.JS] Filtro de editores poblado:',
    Array.from(todosEditores)
  );
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
    iconos.forEach((icono) => {
      const option = document.createElement('option');
      option.value = icono.value;
      option.textContent = `${icono.emoji} ${icono.label}`;
      select.appendChild(option);
    });

    console.log(
      '🎨 [APP.JS] Select de iconos poblado:',
      iconos.length,
      'opciones'
    );
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
  const grid = document.getElementById('checklistGrid');
  if (!grid) return;

  // Si no hay categorías, usar defaults
  if (AppState.checklistCategorias.length === 0) {
    AppState.checklistCategorias = [
      {
        id: 'climatizacion',
        nombre: 'Climatización',
        icono: 'fa-temperature-half',
      },
      { id: 'electronica', nombre: 'Electrónica', icono: 'fa-plug' },
      { id: 'mobiliario', nombre: 'Mobiliario', icono: 'fa-couch' },
      { id: 'sanitarios', nombre: 'Sanitarios', icono: 'fa-shower' },
      { id: 'amenidades', nombre: 'Amenidades', icono: 'fa-concierge-bell' },
      { id: 'estructura', nombre: 'Estructura', icono: 'fa-door-open' },
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
      { nombre: 'Ventanas', categoria: 'estructura' },
    ];
  }

  // Renderizar categorías
  renderChecklistCategorias();

  // Cargar inspecciones recientes
  loadInspeccionesRecientes();

  // Usar cuartos de AppState si están disponibles
  const cuartosMock =
    AppState.cuartos.length > 0
      ? AppState.cuartos.slice(0, 20)
      : [
        {
          id: 1,
          numero: 'S-A201',
          edificio_nombre: 'Alfa',
          estado: 'disponible',
        },
        {
          id: 2,
          numero: 'A204',
          edificio_nombre: 'Alfa',
          estado: 'disponible',
        },
        { id: 3, numero: 'A304', edificio_nombre: 'Alfa', estado: 'ocupado' },
        {
          id: 4,
          numero: 'A306',
          edificio_nombre: 'Alfa',
          estado: 'mantenimiento',
        },
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
    items: AppState.checklistItems.map((item) => ({
      nombre: item.nombre,
      categoria: item.categoria,
      estado: generarEstadoAleatorio(),
    })),
  }));

  AppState.checklistFiltradas = checklistData;
  AppState.checklistPagination.totalPages = Math.ceil(
    checklistData.length / AppState.checklistPagination.perPage
  );

  renderChecklistGrid(checklistData);
  renderChecklistPagination();
}

function renderChecklistCategorias() {
  const container = document.getElementById('checklistCategoriasFiltro');
  if (!container) return;

  // Limpiar categorías existentes (excepto el botón "Todas")
  const existingBtns = container.querySelectorAll(
    '.categoria-btn[data-categoria]:not([data-categoria=""])'
  );
  existingBtns.forEach((btn) => btn.remove());

  // Agregar event listener al botón "Todas"
  const btnTodas = container.querySelector('.categoria-btn[data-categoria=""]');
  if (btnTodas && !btnTodas.hasAttribute('data-listener-added')) {
    btnTodas.setAttribute('data-listener-added', 'true');
    btnTodas.onclick = () => filtrarChecklistPorCategoria('');
  }

  // Agregar categorías desde AppState
  AppState.checklistCategorias.forEach((cat) => {
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
  document.querySelectorAll('.categoria-btn').forEach((btn) => {
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
    grid.innerHTML =
      '<div class="mensaje-cargando">No hay habitaciones para mostrar</div>';
    return;
  }

  // Aplicar paginación
  const { page, perPage } = AppState.checklistPagination;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedData = data.slice(start, end);

  paginatedData.forEach((habitacion) => {
    const card = document.createElement('div');
    card.className = 'checklist-card';
    card.setAttribute('data-habitacion', habitacion.numero);
    card.setAttribute('data-cuarto-id', habitacion.cuarto_id);

    // Contar estados
    const counts = { bueno: 0, regular: 0, malo: 0 };
    habitacion.items.forEach((item) => {
      if (counts[item.estado] !== undefined) counts[item.estado]++;
    });

    const numero = habitacion.numero;
    const edificioLabel = habitacion.edificio || 'Sin edificio';
    const totalItems = habitacion.items.length;

    // Estado de la habitación
    const estadoHabitacion = habitacion.estado_cuarto || 'disponible';
    const estadoConfig = {
      disponible: {
        label: 'Disponible',
        icon: 'fa-circle-check',
        class: 'estado-disponible',
      },
      ocupado: { label: 'Ocupada', icon: 'fa-user', class: 'estado-ocupado' },
      mantenimiento: {
        label: 'Mantenimiento',
        icon: 'fa-wrench',
        class: 'estado-mantenimiento',
      },
    };
    const estadoInfo =
      estadoConfig[estadoHabitacion] || estadoConfig['disponible'];

    // Generar HTML de items
    const itemsHTML = habitacion.items
      .map((item, itemIndex) =>
        buildChecklistItemHTML(habitacion, item, itemIndex)
      )
      .join('');

    // Stats HTML
    const statsHTML = CHECKLIST_ESTADOS.map(
      (estado) => `
            <div class="checklist-card-stat ${estado}" data-estado="${estado}">
                <div class="checklist-card-stat-label">
                    <span class="semaforo-dot" aria-hidden="true"></span>
                    <span>${CHECKLIST_ESTADO_LABELS[estado]}</span>
                </div>
                <span class="checklist-card-stat-value">${counts[estado]}</span>
            </div>
        `
    ).join('');

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
                        <button class="checklist-foto-btn checklist-header-foto-btn" type="button" onclick="event.stopPropagation(); abrirCapturaFotoGeneral(${habitacion.cuarto_id}, '${numero}')" title="Tomar foto general">
                            <i class="fas fa-camera"></i>
                        </button>
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
                        <span class="checklist-meta-divider"></span>
                        <span class="checklist-meta-item checklist-foto-counter" data-cuarto-id="${habitacion.cuarto_id}">
                            <i class="fas fa-images"></i>
                            <span class="foto-count">-</span>
                        </span>
                        ${ultimoEditor
        ? `
                        <span class="checklist-meta-divider"></span>
                        <span class="checklist-meta-item checklist-editor-tag">
                            <i class="fas fa-user-edit"></i>
                            <span>${ultimoEditor}</span>
                        </span>`
        : ''
      }
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

    // Función para aplicar filtros combinados (búsqueda + estado)
    const aplicarFiltrosCard = () => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const items = itemsContainer.querySelectorAll('.checklist-item');
      const estadoActivo = card.querySelector('.checklist-card-stat.active');
      const estadoFiltro = estadoActivo
        ? estadoActivo.getAttribute('data-estado')
        : null;

      items.forEach((item) => {
        const itemName = item.getAttribute('data-item') || '';
        const matchesSearch = !searchTerm || itemName.includes(searchTerm);

        let matchesEstado = true;
        if (estadoFiltro) {
          const checkedRadio = item.querySelector('.estado-radio:checked');
          const estadoItem = checkedRadio ? checkedRadio.value : null;
          matchesEstado = estadoItem === estadoFiltro;
        }

        item.style.display = matchesSearch && matchesEstado ? '' : 'none';
      });
    };

    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      clearBtn.style.display = searchTerm ? 'flex' : 'none';
      aplicarFiltrosCard();
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      aplicarFiltrosCard();
      searchInput.focus();
    });

    // Event listeners para filtrado por estado en stats
    const statButtons = card.querySelectorAll('.checklist-card-stat');
    statButtons.forEach((statBtn) => {
      statBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Si el botón ya está activo, lo desactivamos
        const isActive = statBtn.classList.contains('active');

        // Remover clase active de todos los botones de esta card
        statButtons.forEach((btn) => btn.classList.remove('active'));

        // Si no estaba activo, activar el botón clickeado
        if (!isActive) {
          statBtn.classList.add('active');
        }

        // Aplicar filtros combinados (búsqueda + estado)
        aplicarFiltrosCard();
      });
    });

    // Event listener para botón de detalles (3 puntos)
    const actionBtn = card.querySelector('.checklist-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openChecklistDetailsModal(habitacion.cuarto_id);
      });
    }
  });

  // Cargar contadores de fotos para las tarjetas visibles
  cargarContadoresFotos();
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

  const optionsHTML = CHECKLIST_ESTADOS.map(
    (estado) => `
        <label class="checklist-semaforo-option ${estado}">
            <input type="radio" name="${groupName}" class="estado-radio" value="${estado}" ${item.estado === estado ? 'checked' : ''} onchange="updateChecklistEstado(${habitacion.cuarto_id}, ${itemId}, '${estado}')">
            <span class="semaforo-visual">
                <span class="semaforo-dot" aria-hidden="true"></span>
                <span class="semaforo-text">${CHECKLIST_ESTADO_LABELS[estado]}</span>
            </span>
        </label>
    `
  ).join('');

  return `
        <div class="checklist-item" data-item="${dataNombre}" data-item-id="${itemId}">
            <div class="checklist-item-left">
                <span class="checklist-item-name">${safeNombre}</span>
            </div>
            <div class="checklist-item-right">
                <div class="checklist-semaforo-group" role="radiogroup" aria-label="Estado para ${safeNombre}">${optionsHTML}</div>
                <button class="checklist-foto-btn" type="button" onclick="abrirCapturaFotoItem(${habitacion.cuarto_id}, ${itemId}, '${safeNombre.replace(/'/g, "\\'")}')" title="Tomar foto de ${safeNombre}">
                    <i class="fas fa-camera"></i>
                </button>
            </div>
        </div>
    `;
}

async function updateChecklistEstado(cuartoId, itemId, nuevoEstado) {
  const usuarioNombre =
    AppState.currentUser?.nombre || AppState.currentUser?.name || 'Usuario';
  const usuarioId = AppState.currentUser?.id;

  try {
    // Llamar a la API para guardar en BD
    if (typeof ChecklistAPI !== 'undefined') {
      await ChecklistAPI.updateItemEstado(cuartoId, itemId, nuevoEstado);
    }

    // Actualizar en AppState.checklistFiltradas (memoria) - fuente de verdad
    const habitacionFiltrada = AppState.checklistFiltradas?.find(
      (h) => h.cuarto_id === cuartoId
    );

    if (habitacionFiltrada) {
      const itemFiltrado = habitacionFiltrada.items.find(
        (i) => i.id === itemId
      );
      if (itemFiltrado) {
        itemFiltrado.estado = nuevoEstado;
      }
      habitacionFiltrada.ultimo_editor = usuarioNombre;
      habitacionFiltrada.fecha_ultima_edicion = new Date().toISOString();
    }

    // También actualizar en AppState.checklistDataCompleto para mantener sincronización
    const habitacionCompleta = AppState.checklistDataCompleto?.find(
      (h) => h.cuarto_id === cuartoId
    );

    if (habitacionCompleta) {
      const itemCompleto = habitacionCompleta.items.find(
        (i) => i.id === itemId
      );
      if (itemCompleto) {
        itemCompleto.estado = nuevoEstado;
      }
      habitacionCompleta.ultimo_editor = usuarioNombre;
      habitacionCompleta.fecha_ultima_edicion = new Date().toISOString();
    }

    // Guardar cambio reciente en localStorage (solo cambios, no todo el dataset)
    guardarCambioRecienteChecklist(
      cuartoId,
      itemId,
      nuevoEstado,
      usuarioNombre,
      usuarioId
    );

    // Actualizar contadores y UI en la card
    updateChecklistCardSummary(cuartoId);
    updateChecklistEditorInfo(cuartoId);

    // Actualizar modal de detalles si está abierto para este cuarto
    updateChecklistDetailsModal(cuartoId);

    // Actualizar inspecciones recientes para reflejar el cambio inmediatamente
    loadInspeccionesRecientes();

    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur(
        `✅ Estado actualizado por ${usuarioNombre}`,
        'success'
      );
  } catch (error) {
    console.error('❌ [APP.JS] Error actualizando estado:', error);
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('❌ Error al guardar cambio', 'error');
  }
}

/**
 * Guardar cambios recientes en localStorage (solo cambios, no todo el dataset)
 * Mantiene los últimos 100 cambios para referencia rápida
 */
function guardarCambioRecienteChecklist(
  cuartoId,
  itemId,
  estado,
  editor,
  editorId
) {
  try {
    const cambiosRecientes = JSON.parse(
      localStorage.getItem('checklistCambiosRecientes') || '[]'
    );

    cambiosRecientes.unshift({
      cuarto_id: cuartoId,
      item_id: itemId,
      estado: estado,
      editor: editor,
      editor_id: editorId,
      timestamp: new Date().toISOString(),
    });

    // Mantener solo los últimos 100 cambios
    if (cambiosRecientes.length > 100) {
      cambiosRecientes.splice(100);
    }

    localStorage.setItem(
      'checklistCambiosRecientes',
      JSON.stringify(cambiosRecientes)
    );
  } catch (error) {
    console.warn('⚠️ No se pudo guardar cambio en localStorage:', error);
  }
}

function updateChecklistCardSummary(cuartoId) {
  const card = document.querySelector(
    `.checklist-card[data-cuarto-id="${cuartoId}"]`
  );
  if (!card) return;

  // Obtener datos desde AppState (memoria)
  const habitacionFiltrada = AppState.checklistFiltradas?.find(
    (h) => h.cuarto_id === cuartoId
  );

  if (!habitacionFiltrada) return;

  // Contar estados de los ítems FILTRADOS (los visibles en la card)
  const counts = { bueno: 0, regular: 0, malo: 0 };

  // Actualizar los estados desde localStorage para tener el valor más reciente
  const checklistDataActualizado = JSON.parse(
    localStorage.getItem('checklistData') || '[]'
  );
  const habitacionCompleta = checklistDataActualizado.find(
    (h) => h.cuarto_id === cuartoId
  );

  // Para cada ítem filtrado, obtener su estado actualizado del localStorage
  habitacionFiltrada.items.forEach((itemFiltrado) => {
    // Buscar el estado actualizado en los datos completos
    const itemActualizado = habitacionCompleta?.items.find(
      (i) => i.id === itemFiltrado.id
    );
    const estado = itemActualizado?.estado || itemFiltrado.estado || 'bueno';
    if (counts[estado] !== undefined) {
      counts[estado]++;
    }
  });

  console.log(
    `📊 [CHECKLIST] Contadores actualizados (filtrados) para cuarto ${cuartoId}:`,
    counts
  );

  CHECKLIST_ESTADOS.forEach((estado) => {
    const valueEl = card.querySelector(
      `.checklist-card-stat[data-estado="${estado}"] .checklist-card-stat-value`
    );
    if (valueEl) {
      valueEl.textContent = counts[estado];
      // Animación de actualización
      valueEl.classList.add('stat-updated');
      setTimeout(() => valueEl.classList.remove('stat-updated'), 500);
    }
  });
}

function updateChecklistEditorInfo(cuartoId) {
  const card = document.querySelector(
    `.checklist-card[data-cuarto-id="${cuartoId}"]`
  );
  if (!card) return;

  const metaGroup = card.querySelector('.checklist-meta-group');
  if (!metaGroup) return;

  // Obtener datos desde AppState (memoria) en lugar de localStorage
  const habitacion = AppState.checklistFiltradas?.find(
    (h) => h.cuarto_id === cuartoId
  );
  if (!habitacion) return;

  const nombreEditor =
    habitacion.ultimo_editor ||
    AppState.currentUser?.nombre ||
    AppState.currentUser?.name;

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

/**
 * Actualizar el modal de detalles si está abierto para el cuarto especificado
 */
function updateChecklistDetailsModal(cuartoId) {
  const modal = document.getElementById('checklist-details-modal');
  if (!modal || modal.style.display !== 'flex') return;

  // Verificar que el modal es para este cuarto
  if (modal.dataset.cuartoId != cuartoId) return;

  // Obtener datos actualizados desde AppState
  const checklistData =
    AppState.checklistDataCompleto || AppState.checklistFiltradas || [];
  const habitacion = checklistData.find((h) => h.cuarto_id === cuartoId);

  if (!habitacion) return;

  // Recalcular contadores
  const counts = { bueno: 0, regular: 0, malo: 0 };
  habitacion.items.forEach((item) => {
    if (counts[item.estado] !== undefined) counts[item.estado]++;
  });

  // Actualizar valores en el DOM
  const statsGrid = modal.querySelector('.checklist-stats-grid');
  if (statsGrid) {
    const statValueElements = {
      bueno: statsGrid.querySelector('.checklist-stat-item.bueno .stat-value'),
      regular: statsGrid.querySelector(
        '.checklist-stat-item.regular .stat-value'
      ),
      malo: statsGrid.querySelector('.checklist-stat-item.malo .stat-value'),
    };

    Object.keys(statValueElements).forEach((estado) => {
      const element = statValueElements[estado];
      if (element) {
        element.textContent = counts[estado];
        element.classList.add('stat-updated');
        setTimeout(() => element.classList.remove('stat-updated'), 500);
      }
    });
  }

  // Actualizar historial de ediciones
  const buildHistorialHTML = () => {
    if (!habitacion.items || habitacion.items.length === 0) {
      return '<p class="no-history">No hay elementos registrados</p>';
    }

    const itemsPorEstado = {
      malo: habitacion.items.filter((item) => item.estado === 'malo'),
      regular: habitacion.items.filter((item) => item.estado === 'regular'),
      bueno: habitacion.items.filter((item) => item.estado === 'bueno'),
    };

    let html = '';

    if (itemsPorEstado.malo.length > 0) {
      html +=
        '<div class="history-group"><h4><span class="semaforo-dot malo"></span> En Mal Estado</h4><ul>';
      itemsPorEstado.malo.forEach((item) => {
        html += `<li class="history-item"><span class="item-name">${item.nombre}</span></li>`;
      });
      html += '</ul></div>';
    }

    if (itemsPorEstado.regular.length > 0) {
      html +=
        '<div class="history-group"><h4><span class="semaforo-dot regular"></span> Estado Regular</h4><ul>';
      itemsPorEstado.regular.forEach((item) => {
        html += `<li class="history-item"><span class="item-name">${item.nombre}</span></li>`;
      });
      html += '</ul></div>';
    }

    if (itemsPorEstado.bueno.length > 0) {
      html +=
        '<div class="history-group"><h4><span class="semaforo-dot bueno"></span> En Buen Estado</h4><ul>';
      itemsPorEstado.bueno.forEach((item) => {
        html += `<li class="history-item"><span class="item-name">${item.nombre}</span></li>`;
      });
      html += '</ul></div>';
    }

    return html || '<p class="no-history">No hay elementos registrados</p>';
  };

  const historyList = modal.querySelector('.checklist-history-list');
  if (historyList) {
    historyList.innerHTML = buildHistorialHTML();
  }

  // Actualizar último editor en el header
  const headerInfo = modal.querySelector('.checklist-modal-header-info span');
  if (headerInfo && habitacion.ultimo_editor) {
    const editorPart =
      headerInfo.querySelector('i.fa-user-edit')?.parentElement;
    if (editorPart) {
      editorPart.innerHTML = ` · <i class="fas fa-user-edit"></i> ${habitacion.ultimo_editor}`;
    } else {
      const currentContent = headerInfo.innerHTML;
      if (!currentContent.includes('fa-user-edit')) {
        headerInfo.innerHTML += ` · <i class="fas fa-user-edit"></i> ${habitacion.ultimo_editor}`;
      }
    }
  }

  // Actualizar último editor en la sección de info
  const editorInfoItem = modal.querySelector(
    '.checklist-info-item:has(i.fa-user-edit)'
  );
  if (editorInfoItem) {
    const editorSpan = editorInfoItem.querySelector('.info-content span');
    if (editorSpan) {
      editorSpan.textContent = habitacion.ultimo_editor || 'Sin ediciones';
    }
  }
}

function applyChecklistFilters() {
  // Usar datos completos como base (no filtrados)
  const allData =
    AppState.checklistDataCompleto || AppState.checklistFiltradas || [];

  if (allData.length === 0) {
    AppState.checklistFiltradas = [];
    renderChecklistGrid([]);
    return;
  }
  const searchLower = (AppState.checklistFilters.busqueda || '').toLowerCase();
  const categoriaActiva = AppState.checklistFilters.categoria;
  const edificioActivo = AppState.checklistFilters.edificio;
  const estadoActivo = AppState.checklistFilters.estado;
  const habitacionBusqueda = (AppState.checklistFilters.habitacion || '')
    .toLowerCase()
    .trim();
  const editorActivo = AppState.checklistFilters.editor;

  let habitacionesFiltradas = allData;

  // Filtrar por número de habitación
  if (habitacionBusqueda) {
    habitacionesFiltradas = habitacionesFiltradas.filter((hab) => {
      // El campo puede ser 'numero', 'numero_habitacion' o 'num_habitacion' según la fuente
      const numHabitacion = (
        hab.numero ||
        hab.numero_habitacion ||
        hab.num_habitacion ||
        ''
      )
        .toString()
        .toLowerCase();
      return numHabitacion.includes(habitacionBusqueda);
    });
    console.log(
      `🔍 [CHECKLIST] Buscando habitación: "${habitacionBusqueda}" - Encontradas: ${habitacionesFiltradas.length}`
    );
  }

  // Filtrar por edificio (puede ser ID o nombre)
  if (edificioActivo) {
    habitacionesFiltradas = habitacionesFiltradas.filter(
      (hab) =>
        hab.edificio === edificioActivo ||
        hab.edificio_nombre === edificioActivo ||
        hab.edificio_id == edificioActivo
    );
  }

  // Filtrar por editor (último editor que modificó)
  if (editorActivo) {
    habitacionesFiltradas = habitacionesFiltradas.filter(
      (hab) => hab.ultimo_editor === editorActivo
    );
  }

  // Filtrar por imágenes adjuntas (a nivel de habitación)
  const imagenesActivo = AppState.checklistFilters.imagenes;
  if (imagenesActivo) {
    habitacionesFiltradas = habitacionesFiltradas.filter((hab) => {
      // Usar fotos_count a nivel de cuarto (se carga desde API o localStorage)
      const fotosCount = hab.fotos_count || 0;
      if (imagenesActivo === 'con') {
        return fotosCount > 0;
      } else if (imagenesActivo === 'sin') {
        return fotosCount === 0;
      }
      return true;
    });
  }

  // Filtrar items dentro de cada habitación
  const requiereFiltradoItems = Boolean(
    categoriaActiva || searchLower || estadoActivo
  );
  if (requiereFiltradoItems) {
    habitacionesFiltradas = habitacionesFiltradas
      .map((habitacion) => {
        const baseItems = Array.isArray(habitacion.items)
          ? habitacion.items
          : [];
        const itemsFiltrados = baseItems.filter((item) => {
          const cumpleCategoria =
            !categoriaActiva ||
            item.categoria === categoriaActiva ||
            item.categoria_id == categoriaActiva;
          const nombreItem = (item.nombre || '').toLowerCase();
          const cumpleBusqueda =
            !searchLower || nombreItem.includes(searchLower);
          const cumpleEstado = !estadoActivo || item.estado === estadoActivo;
          return cumpleCategoria && cumpleBusqueda && cumpleEstado;
        });

        return itemsFiltrados.length > 0
          ? { ...habitacion, items: itemsFiltrados }
          : null;
      })
      .filter(Boolean);
  }

  AppState.checklistFiltradas = habitacionesFiltradas;
  AppState.checklistPagination.totalPages = Math.ceil(
    habitacionesFiltradas.length / AppState.checklistPagination.perPage
  );
  if (
    AppState.checklistPagination.page > AppState.checklistPagination.totalPages
  ) {
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

  container
    .querySelector('[data-action="prev"]')
    ?.addEventListener('click', () => {
      if (AppState.checklistPagination.page > 1) {
        AppState.checklistPagination.page--;
        renderChecklistGrid(AppState.checklistFiltradas);
        renderChecklistPagination();
        // Smooth scroll al inicio del grid
        const gridContainer =
          document.getElementById('checklistGrid') ||
          document.querySelector('.checklist-grid');
        if (gridContainer) {
          gridContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

  container
    .querySelector('[data-action="next"]')
    ?.addEventListener('click', () => {
      if (AppState.checklistPagination.page < totalPages) {
        AppState.checklistPagination.page++;
        renderChecklistGrid(AppState.checklistFiltradas);
        renderChecklistPagination();
        // Smooth scroll al inicio del grid
        const gridContainer =
          document.getElementById('checklistGrid') ||
          document.querySelector('.checklist-grid');
        if (gridContainer) {
          gridContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
}

function loadInspeccionesRecientes() {
  const lista = document.getElementById('listaInspeccionesRecientes');
  if (!lista) return;

  // Cargar inspecciones desde AppState (memoria) - fuente de verdad
  const checklistData = AppState.checklistDataCompleto || AppState.checklistFiltradas || [];

  // Filtrar habitaciones que tienen fecha de última edición (han sido inspeccionadas)
  const inspeccionadas = checklistData
    .filter((hab) => hab.ultimo_editor && hab.fecha_ultima_edicion)
    .map((hab) => {
      // Contar estados para determinar el estado general
      const counts = { bueno: 0, regular: 0, malo: 0 };
      (hab.items || []).forEach((item) => {
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
        edificio: hab.edificio || hab.edificio_nombre,
      };
    })
    // Ordenar por fecha más reciente
    .sort((a, b) => b.fecha_raw - a.fecha_raw)
    // Limitar a las últimas 10
    .slice(0, 10);

  AppState.inspeccionesRecientes = inspeccionadas;
  renderInspeccionesRecientes(inspeccionadas);

  console.log(
    '📋 [APP.JS] Inspecciones recientes cargadas:',
    inspeccionadas.length
  );
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
  const fechaSinHora = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );

  const hora = fecha.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (fechaSinHora.getTime() === hoy.getTime()) {
    return `Hoy · ${hora}`;
  } else if (fechaSinHora.getTime() === ayer.getTime()) {
    return `Ayer · ${hora}`;
  } else {
    const dia = fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    });
    return `${dia} · ${hora}`;
  }
}

function renderInspeccionesRecientes(data) {
  const lista = document.getElementById('listaInspeccionesRecientes');
  if (!lista) return;

  lista.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    lista.innerHTML =
      '<li class="inspeccion-placeholder"><i class="fas fa-clipboard-check"></i><span>Sin inspecciones recientes</span></li>';
    return;
  }

  data.forEach((inspeccion) => {
    const li = document.createElement('li');
    li.className = 'inspeccion-item';
    li.dataset.estado = inspeccion.estado;
    if (inspeccion.cuarto_id) {
      li.dataset.cuartoId = inspeccion.cuarto_id;
      li.style.cursor = 'pointer';
      li.title = 'Clic para ver detalles';
    }

    const edificioInfo = inspeccion.edificio
      ? `<span class="inspeccion-edificio">${inspeccion.edificio}</span>`
      : '';

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
  // Leer desde AppState (memoria) en lugar de localStorage
  const checklistData =
    AppState.checklistDataCompleto || AppState.checklistFiltradas || [];
  const habitacion = checklistData.find((h) => h.cuarto_id === cuartoId);

  if (!habitacion) {
    console.error('Habitación no encontrada');
    if (window.mostrarAlertaBlur) {
      window.mostrarAlertaBlur('No se encontró la habitación', 'error');
    }
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
  habitacion.items.forEach((item) => {
    if (counts[item.estado] !== undefined) counts[item.estado]++;
  });

  // Construir HTML del historial agrupado por estado
  const buildHistorialHTML = () => {
    if (!habitacion.items || habitacion.items.length === 0) {
      return '<p class="no-history">No hay elementos registrados</p>';
    }

    const itemsPorEstado = {
      malo: habitacion.items.filter((item) => item.estado === 'malo'),
      regular: habitacion.items.filter((item) => item.estado === 'regular'),
      bueno: habitacion.items.filter((item) => item.estado === 'bueno'),
    };

    let html = '';

    if (itemsPorEstado.malo.length > 0) {
      html +=
        '<div class="history-group"><h4><span class="semaforo-dot malo"></span> En Mal Estado</h4><ul>';
      itemsPorEstado.malo.forEach((item) => {
        html += `<li class="history-item"><span class="item-name">${item.nombre}</span></li>`;
      });
      html += '</ul></div>';
    }

    if (itemsPorEstado.regular.length > 0) {
      html +=
        '<div class="history-group"><h4><span class="semaforo-dot regular"></span> Estado Regular</h4><ul>';
      itemsPorEstado.regular.forEach((item) => {
        html += `<li class="history-item"><span class="item-name">${item.nombre}</span></li>`;
      });
      html += '</ul></div>';
    }

    if (itemsPorEstado.bueno.length > 0) {
      html +=
        '<div class="history-group"><h4><span class="semaforo-dot bueno"></span> En Buen Estado</h4><ul>';
      itemsPorEstado.bueno.forEach((item) => {
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
                <div class="checklist-modal-header-info">
                    <h3 style="margin:0;font-size:1.3rem;font-weight:700;">${habitacion.numero}</h3>
                    <span style="font-size:0.9rem;margin-top:0.25rem;display:block;">
                        <i class="fas fa-building"></i> ${habitacion.edificio || habitacion.edificio_nombre || 'Sin edificio'} · 
                        <i class="fas fa-clipboard-list"></i> ${habitacion.items.length} ítems
                        ${habitacion.ultimo_editor ? ` · <i class="fas fa-user-edit"></i> ${habitacion.ultimo_editor}` : ''}
                    </span>
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
                <div class="checklist-fotos-section" id="checklistFotosSection">
                    <h3><i class="fas fa-images"></i> Fotos de Inspección</h3>
                    <div class="checklist-fotos-carousel" id="checklistFotosCarousel">
                        <div class="checklist-fotos-empty"><i class="fas fa-spinner fa-spin"></i>Cargando fotos...</div>
                    </div>
                </div>
                <div class="checklist-modal-history">
                    <h3>Historial de Ediciones</h3>
                    <div class="checklist-history-list">${buildHistorialHTML()}</div>
                </div>
            </div>
            <div class="checklist-modal-footer">
                ${AppState.currentUser?.role === 'admin' ||
      AppState.currentUser?.role === 'supervisor'
      ? `
                <button class="filtros-action-button excel btn-export btn-excel-filtrado" data-cuarto-id="${cuartoId}" title="Exportar según filtros aplicados">
                    <i class="fas fa-filter"></i>
                    <div><div class="filtros-action-button-title">Exportar Filtrado</div><div class="filtros-action-button-subtitle">Según filtros activos</div></div>
                </button>
                <button class="filtros-action-button excel btn-export btn-excel" data-cuarto-id="${cuartoId}" title="Exportar todos los items">
                    <i class="fas fa-file-excel"></i>
                    <div><div class="filtros-action-button-title">Exportar Todo</div><div class="filtros-action-button-subtitle">Checklist completo</div></div>
                </button>
                `
      : ''
    }
            </div>
        </div>
    `;

  modal.style.display = 'flex';
  modal.style.zIndex = '2000';
  document.body.classList.add('modal-open');

  // Guardar cuartoId en el modal para poder actualizarlo después
  modal.dataset.cuartoId = cuartoId;

  // Agregar handler para cerrar con ESC (mismo patrón que modales de sábana)
  if (!window._cerrarChecklistEscHandler) {
    window._cerrarChecklistEscHandler = function (e) {
      if (e.key === 'Escape') {
        const modalVisible = document.getElementById('checklist-details-modal');
        if (modalVisible && modalVisible.style.display === 'flex') {
          e.stopImmediatePropagation();
          closeChecklistDetailsModal();
        }
      }
    };
    document.addEventListener('keydown', window._cerrarChecklistEscHandler);
  }

  // Agregar event listeners
  setTimeout(() => {
    const overlay = modal.querySelector('.modal-detalles-overlay');
    const closeBtn = modal.querySelector('.modal-detalles-cerrar');
    const excelBtn = modal.querySelector('.btn-excel');
    const excelFiltradoBtn = modal.querySelector('.btn-excel-filtrado');

    const closeModal = () => {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    };

    if (overlay) overlay.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Exportar TODO - sin filtros
    if (excelBtn) {
      excelBtn.addEventListener('click', () => {
        const headers = getChecklistExportHeaders();
        const rows = habitacion.items.map((item) => [
          habitacion.numero,
          habitacion.edificio || '',
          item.nombre,
          item.categoria || '',
          item.estado,
        ]);

        // Usar fecha local en lugar de UTC
        const fechaLocal = new Date();
        const fechaStr = `${fechaLocal.getFullYear()}-${String(fechaLocal.getMonth() + 1).padStart(2, '0')}-${String(fechaLocal.getDate()).padStart(2, '0')}`;
        const filename = `checklist_${habitacion.numero}_completo_${fechaStr}.xls`;
        downloadChecklistExcelFile({
          filename,
          headers,
          rows,
          sheetName: `Checklist ${habitacion.numero}`,
        });

        // Notificación de éxito
        if (window.mostrarAlertaBlur) {
          window.mostrarAlertaBlur(
            '✅ Checklist completo exportado exitosamente',
            'success'
          );
        } else {
          console.log('✅ Checklist completo exportado exitosamente');
        }
      });
    }

    // Exportar FILTRADO - según filtros aplicados
    if (excelFiltradoBtn) {
      excelFiltradoBtn.addEventListener('click', () => {
        // Obtener el filtro de estado - primero buscar en la card, luego en el filtro global
        let filtroEstado = '';
        let filtroCategoria = '';

        // Buscar si hay un filtro activo en la card de esta habitación
        const cardElement = document.querySelector(
          `.checklist-card[data-cuarto-id="${cuartoId}"]`
        );
        if (cardElement) {
          const estadoActivo = cardElement.querySelector(
            '.checklist-card-stat.active'
          );
          if (estadoActivo) {
            filtroEstado = estadoActivo.getAttribute('data-estado') || '';
          }
        }

        // Si no hay filtro en la card, usar el filtro global del panel
        if (!filtroEstado) {
          filtroEstado = AppState.checklistFilters?.estado || '';
        }

        // Obtener el filtro de categoría activo
        const categoriaActiva = document.querySelector('.categoria-btn.active');
        if (categoriaActiva) {
          filtroCategoria =
            categoriaActiva.getAttribute('data-categoria') || '';
        }

        // Filtrar items según estado y categoría seleccionados
        let itemsFiltrados = habitacion.items;

        // Filtrar por estado
        if (filtroEstado) {
          itemsFiltrados = itemsFiltrados.filter(
            (item) => item.estado === filtroEstado
          );
        }

        // Filtrar por categoría
        if (filtroCategoria) {
          itemsFiltrados = itemsFiltrados.filter((item) => {
            // Normalizar la categoría del item para comparar
            const catItem = (item.categoria || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '-');
            return (
              catItem === filtroCategoria ||
              item.categoria?.toLowerCase() === filtroCategoria
            );
          });
        }

        if (itemsFiltrados.length === 0) {
          if (window.mostrarAlertaBlur) {
            window.mostrarAlertaBlur(
              '⚠️ No hay items que coincidan con los filtros actuales',
              'warning'
            );
          }
          return;
        }

        const headers = getChecklistExportHeaders();
        const rows = itemsFiltrados.map((item) => [
          habitacion.numero,
          habitacion.edificio || '',
          item.nombre,
          item.categoria || '',
          item.estado,
        ]);
        // Usar fecha local en lugar de UTC
        const fechaLocal = new Date();
        const fechaStr = `${fechaLocal.getFullYear()}-${String(fechaLocal.getMonth() + 1).padStart(2, '0')}-${String(fechaLocal.getDate()).padStart(2, '0')}`;

        // Nombre del archivo incluye categoría y estado
        const catLabel = filtroCategoria ? `_${filtroCategoria}` : '';
        const estadoLabel = filtroEstado ? `_${filtroEstado}` : '';
        const filtroLabel =
          catLabel || estadoLabel
            ? `${catLabel}${estadoLabel}`
            : '_sin_filtros';
        const filename = `checklist_${habitacion.numero}${filtroLabel}_${fechaStr}.xls`;
        downloadChecklistExcelFile({
          filename,
          headers,
          rows,
          sheetName: `Checklist ${habitacion.numero}`,
        });

        // Notificación de éxito
        const mensajeCat = filtroCategoria
          ? `categoría: ${filtroCategoria}`
          : '';
        const mensajeEstado = filtroEstado ? `estado: ${filtroEstado}` : '';
        const mensajeFiltros = [mensajeCat, mensajeEstado]
          .filter((m) => m)
          .join(', ');
        const mensajeFinal = mensajeFiltros ? `(${mensajeFiltros})` : '';

        if (window.mostrarAlertaBlur) {
          window.mostrarAlertaBlur(
            `✅ Exportado ${itemsFiltrados.length} items ${mensajeFinal}`,
            'success'
          );
        } else {
          console.log(
            `✅ Exportado ${itemsFiltrados.length} items ${mensajeFinal}`
          );
        }
      });
    }

    // Cargar fotos del cuarto
    cargarFotosChecklist(cuartoId);
  }, 0);
}

/**
 * Cerrar modal de detalles de checklist
 * Esta función es llamada por el handler de ESC key en app-loader.js
 */
function closeChecklistDetailsModal() {
  const modal = document.getElementById('checklist-details-modal');

  // Remover handler de ESC
  if (window._cerrarChecklistEscHandler) {
    document.removeEventListener('keydown', window._cerrarChecklistEscHandler);
    window._cerrarChecklistEscHandler = null;
  }

  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
}

// Exponer función globalmente para ESC key handler
window.closeChecklistDetailsModal = closeChecklistDetailsModal;

function getChecklistExportHeaders() {
  return ['Habitación', 'Edificio', 'Item', 'Categoría', 'Estado'];
}

function escapeExcelXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Genera SpreadsheetML con AutoFilter para que Excel muestre filtros en los encabezados.
function buildChecklistExcelXml(headers, rows, sheetName) {
  const baseName = (sheetName || 'Checklist')
    .replace(/[\\/*?:\[\]]/g, '')
    .trim();
  const safeSheetName = baseName.slice(0, 31) || 'Checklist';
  const rowCount = rows.length + 1;
  const colCount = headers.length;
  const tableRows = [];

  tableRows.push('<Row ss:StyleID="Header">');
  headers.forEach((header) => {
    tableRows.push(
      `<Cell><Data ss:Type="String">${escapeExcelXml(header)}</Data></Cell>`
    );
  });
  tableRows.push('</Row>');

  rows.forEach((row) => {
    tableRows.push('<Row>');
    row.forEach((value) => {
      tableRows.push(
        `<Cell><Data ss:Type="String">${escapeExcelXml(value)}</Data></Cell>`
      );
    });
    tableRows.push('</Row>');
  });

  const tableRowsXml = tableRows.map((line) => `   ${line}`).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    ' <Styles>',
    '  <Style ss:ID="Default" ss:Name="Normal">',
    '   <Alignment ss:Vertical="Bottom"/>',
    '   <Font ss:FontName="Calibri" ss:Size="11"/>',
    '  </Style>',
    '  <Style ss:ID="Header">',
    '   <Font ss:Bold="1"/>',
    '   <Interior ss:Color="#D9E1F2" ss:Pattern="Solid"/>',
    '   <Borders>',
    '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '   </Borders>',
    '  </Style>',
    ' </Styles>',
    ` <Worksheet ss:Name="${escapeExcelXml(safeSheetName)}">`,
    `  <Table ss:ExpandedColumnCount="${colCount}" ss:ExpandedRowCount="${rowCount}" x:FullColumns="1" x:FullRows="1">`,
    tableRowsXml,
    '  </Table>',
    `  <AutoFilter x:Range="R1C1:R${rowCount}C${colCount}" xmlns="urn:schemas-microsoft-com:office:excel"/>`,
    ' </Worksheet>',
    '</Workbook>',
  ].join('\n');
}

function downloadChecklistExcelFile({ filename, headers, rows, sheetName }) {
  const xml = buildChecklistExcelXml(headers, rows, sheetName);
  const blob = new Blob([xml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
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
  const userRole =
    AppState.currentUser?.role || window.AppState?.currentUser?.role;
  if (userRole !== 'admin' && userRole !== 'supervisor') {
    electronSafeAlert(
      'Solo administradores y supervisores pueden exportar datos'
    );
    return;
  }

  const spinner = document.getElementById('downloadSpinner');
  if (spinner) spinner.style.display = 'flex';

  setTimeout(() => {
    // Obtener datos desde AppState en lugar de localStorage
    const checklistData =
      AppState.checklistDataCompleto || AppState.checklistFiltradas || [];

    if (checklistData.length === 0) {
      if (spinner) spinner.style.display = 'none';
      electronSafeAlert('No hay datos de checklist disponibles');
      return;
    }

    const headers = getChecklistExportHeaders();
    const rows = [];
    checklistData.forEach((habitacion) => {
      habitacion.items.forEach((item) => {
        rows.push([
          habitacion.numero,
          habitacion.edificio,
          item.nombre,
          item.categoria || '',
          item.estado,
        ]);
      });
    });

    // Usar fecha local en lugar de UTC
    const fechaLocal = new Date();
    const fechaStr = `${fechaLocal.getFullYear()}-${String(fechaLocal.getMonth() + 1).padStart(2, '0')}-${String(fechaLocal.getDate()).padStart(2, '0')}`;
    const filename = `checklist_completo_${fechaStr}.xls`;
    downloadChecklistExcelFile({
      filename,
      headers,
      rows,
      sheetName: 'Checklist completo',
    });

    if (spinner) spinner.style.display = 'none';
    electronSafeAlert('Checklist completo exportado exitosamente');
  }, 1000);
}

/**
 * Exporta el checklist de TODAS las habitaciones respetando todos los filtros activos
 * Filtros soportados: categoría, estado global, edificio, búsqueda habitación, búsqueda item, editor, estados individuales de cada card
 */
function exportarChecklistFiltrado() {
  const userRole =
    AppState.currentUser?.role || window.AppState?.currentUser?.role;
  if (userRole !== 'admin' && userRole !== 'supervisor') {
    electronSafeAlert(
      'Solo administradores y supervisores pueden exportar datos'
    );
    return;
  }

  const spinner = document.getElementById('downloadSpinner');
  if (spinner) spinner.style.display = 'flex';

  setTimeout(() => {
    // Obtener TODOS los datos del checklist desde AppState
    const checklistData =
      AppState.checklistDataCompleto || AppState.checklistFiltradas || [];

    if (checklistData.length === 0) {
      if (spinner) spinner.style.display = 'none';
      electronSafeAlert('No hay datos de checklist disponibles');
      return;
    }

    // Obtener filtros activos del panel global
    const filtroCategoria =
      document
        .querySelector('.categoria-btn.active')
        ?.getAttribute('data-categoria') || '';
    const filtroEstadoGlobal = AppState.checklistFilters?.estado || '';
    const filtroEdificio = AppState.checklistFilters?.edificio || '';
    const filtroBusquedaHabitacion =
      document
        .getElementById('buscarHabitacionChecklist')
        ?.value?.toLowerCase()
        .trim() || '';
    const filtroBusquedaItem = AppState.checklistFilters?.busqueda || '';
    const filtroEditor = AppState.checklistFilters?.editor || '';

    const headers = getChecklistExportHeaders();
    const rows = [];
    let totalItems = 0;
    let habitacionesExportadas = 0;
    let habitacionesConFiltroIndividual = 0;

    checklistData.forEach((habitacion) => {
      // Filtrar por edificio (comparar ID o nombre)
      if (filtroEdificio) {
        const cumpleEdificio =
          habitacion.edificio === filtroEdificio ||
          habitacion.edificio_nombre === filtroEdificio ||
          habitacion.edificio_id == filtroEdificio;
        if (!cumpleEdificio) {
          return;
        }
      }

      // Filtrar por búsqueda de habitación
      if (filtroBusquedaHabitacion) {
        const numHabitacion = (
          habitacion.numero ||
          habitacion.numero_habitacion ||
          habitacion.num_habitacion ||
          ''
        )
          .toString()
          .toLowerCase();
        if (!numHabitacion.includes(filtroBusquedaHabitacion)) {
          return;
        }
      }

      // Filtrar por editor (último editor que modificó la habitación)
      if (filtroEditor) {
        const ultimoEditor =
          habitacion.ultimo_editor || habitacion.editor || '';
        if (ultimoEditor !== filtroEditor) {
          return;
        }
      }

      // Filtrar por imágenes
      const filtroImagenes = AppState.checklistFilters?.imagenes || '';
      if (filtroImagenes) {
        const fotosCount = habitacion.fotos_count || 0;
        if (filtroImagenes === 'con' && fotosCount === 0) {
          return;
        }
        if (filtroImagenes === 'sin' && fotosCount > 0) {
          return;
        }
      }

      // Obtener el filtro de estado individual de esta habitación desde la card visible (si existe)
      // Buscar por ID o por número de habitación
      let cardElement = document.querySelector(
        `.checklist-card[data-cuarto-id="${habitacion.id}"]`
      );
      if (!cardElement) {
        cardElement = document.querySelector(
          `.checklist-card[data-habitacion="${habitacion.numero}"]`
        );
      }

      // Buscar el botón de estado activo en la card
      const estadoActivoCard = cardElement?.querySelector(
        '.checklist-card-stat.active'
      );
      const filtroEstadoCard = estadoActivoCard
        ? estadoActivoCard.getAttribute('data-estado')
        : null;

      // Contar habitaciones con filtro individual
      if (filtroEstadoCard) {
        habitacionesConFiltroIndividual++;
      }

      // Determinar el filtro de estado a usar (prioridad: card > global)
      const filtroEstadoFinal = filtroEstadoCard || filtroEstadoGlobal;

      let itemsExportadosHabitacion = 0;

      habitacion.items.forEach((item) => {
        // Filtrar por búsqueda de item
        if (filtroBusquedaItem) {
          const nombreItem = (item.nombre || '').toLowerCase();
          if (!nombreItem.includes(filtroBusquedaItem.toLowerCase())) {
            return;
          }
        }

        // Filtrar por categoría (ID o slug)
        if (filtroCategoria) {
          const cumpleCategoria =
            item.categoria === filtroCategoria ||
            item.categoria_id == filtroCategoria ||
            item.categoria_slug === filtroCategoria;
          if (!cumpleCategoria) {
            return;
          }
        }

        // Obtener el estado actual del item (preferir DOM si la card está visible)
        let itemEstado = item.estado;
        if (cardElement) {
          // Buscar el item en el DOM para obtener su estado actual
          const itemElement = cardElement.querySelector(
            `.checklist-item[data-item-id="${item.id}"]`
          );
          if (itemElement) {
            const checkedRadio = itemElement.querySelector(
              '.estado-radio:checked'
            );
            if (checkedRadio) {
              itemEstado = checkedRadio.value;
            }
          }
        }

        // Filtrar por estado
        if (filtroEstadoFinal && itemEstado !== filtroEstadoFinal) {
          return;
        }

        rows.push([
          habitacion.numero,
          habitacion.edificio || '',
          item.nombre,
          item.categoria || '',
          itemEstado,
        ]);
        totalItems++;
        itemsExportadosHabitacion++;
      });

      if (itemsExportadosHabitacion > 0) {
        habitacionesExportadas++;
      }
    });

    if (totalItems === 0) {
      if (spinner) spinner.style.display = 'none';
      if (window.mostrarAlertaBlur) {
        window.mostrarAlertaBlur(
          '⚠️ No hay items que coincidan con los filtros actuales',
          'warning'
        );
      } else {
        electronSafeAlert(
          'No hay items que coincidan con los filtros actuales'
        );
      }
      return;
    }

    // Generar nombre de archivo con "completo" + filtros
    const fechaLocal = new Date();
    const fechaStr = `${fechaLocal.getFullYear()}-${String(fechaLocal.getMonth() + 1).padStart(2, '0')}-${String(fechaLocal.getDate()).padStart(2, '0')}`;

    // Obtener nombre del edificio si se filtró por ID
    let edificioNombre = filtroEdificio;
    if (filtroEdificio) {
      // Buscar el nombre del edificio en los datos
      const habConEdificio = checklistData.find(
        (h) =>
          h.edificio_id == filtroEdificio ||
          h.edificio === filtroEdificio ||
          h.edificio_nombre === filtroEdificio
      );
      if (habConEdificio) {
        edificioNombre =
          habConEdificio.edificio_nombre ||
          habConEdificio.edificio ||
          filtroEdificio;
      }
    }

    // Obtener filtro de imágenes
    const filtroImagenes = AppState.checklistFilters?.imagenes || '';

    const catLabel = filtroCategoria ? `_${filtroCategoria}` : '';
    const estadoLabel = filtroEstadoGlobal ? `_${filtroEstadoGlobal}` : '';
    const edificioLabel = edificioNombre
      ? `_${edificioNombre.toString().replace(/\s+/g, '-').toLowerCase()}`
      : '';
    const editorLabel = filtroEditor
      ? `_${filtroEditor.replace(/\s+/g, '-').toLowerCase()}`
      : '';
    const busquedaHabLabel = filtroBusquedaHabitacion
      ? `_hab-${filtroBusquedaHabitacion.replace(/\s+/g, '-')}`
      : '';
    const busquedaItemLabel = filtroBusquedaItem
      ? `_item-${filtroBusquedaItem.replace(/\s+/g, '-').toLowerCase()}`
      : '';
    const imagenesLabel = filtroImagenes
      ? `_${filtroImagenes === 'con' ? 'con-fotos' : 'sin-fotos'}`
      : '';
    const filtrosIndividualesLabel =
      habitacionesConFiltroIndividual > 0 ? '_con_filtros_individuales' : '';
    const filtrosLabel = `${catLabel}${estadoLabel}${edificioLabel}${editorLabel}${busquedaHabLabel}${busquedaItemLabel}${imagenesLabel}${filtrosIndividualesLabel}`;

    const filename = `checklist_completo${filtrosLabel}_${fechaStr}.xls`;
    downloadChecklistExcelFile({
      filename,
      headers,
      rows,
      sheetName: 'Checklist filtrado',
    });

    if (spinner) spinner.style.display = 'none';

    // Mensaje de éxito con detalles
    const filtrosActivos = [];
    if (filtroCategoria) filtrosActivos.push(`categoría: ${filtroCategoria}`);
    if (filtroEstadoGlobal)
      filtrosActivos.push(`estado: ${filtroEstadoGlobal}`);
    if (edificioNombre) filtrosActivos.push(`edificio: ${edificioNombre}`);
    if (filtroBusquedaHabitacion)
      filtrosActivos.push(`habitación: "${filtroBusquedaHabitacion}"`);
    if (filtroBusquedaItem)
      filtrosActivos.push(`item: "${filtroBusquedaItem}"`);
    if (filtroEditor) filtrosActivos.push(`editor: ${filtroEditor}`);
    if (filtroImagenes)
      filtrosActivos.push(
        `imágenes: ${filtroImagenes === 'con' ? 'con fotos' : 'sin fotos'}`
      );

    const mensajeFiltros =
      filtrosActivos.length > 0 ? ` (${filtrosActivos.join(', ')})` : '';

    if (window.mostrarAlertaBlur) {
      window.mostrarAlertaBlur(
        `✅ Exportado ${totalItems} items de ${habitacionesExportadas} habitaciones${mensajeFiltros}`,
        'success'
      );
    } else {
      electronSafeAlert(
        `Checklist filtrado exportado: ${totalItems} items de ${habitacionesExportadas} habitaciones`
      );
    }
  }, 500);
}

function initChecklistEventListeners() {
  // Toggle de categorías (móvil) - usar onclick para evitar listeners duplicados
  const toggleBtn = document.getElementById('toggleCategoriasBtn');
  const wrapper = document.getElementById('checklistCategoriasWrapper');

  if (toggleBtn && wrapper) {
    // Restaurar estado previo si existe (para mantenerlo al cambiar de tab)
    if (typeof AppState.checklistFilterOpen === 'undefined') {
      AppState.checklistFilterOpen = false;
    }

    // Aplicar estado inicial
    wrapper.setAttribute(
      'data-mobile-open',
      AppState.checklistFilterOpen ? 'true' : 'false'
    );
    toggleBtn.setAttribute(
      'aria-expanded',
      AppState.checklistFilterOpen ? 'true' : 'false'
    );
    toggleBtn.classList.toggle('open', AppState.checklistFilterOpen);

    // Handler del toggle
    toggleBtn.onclick = () => {
      const isOpen = wrapper.getAttribute('data-mobile-open') === 'true';
      const newState = !isOpen;
      AppState.checklistFilterOpen = newState; // Guardar en estado
      wrapper.setAttribute('data-mobile-open', newState ? 'true' : 'false');
      toggleBtn.setAttribute('aria-expanded', newState ? 'true' : 'false');
      toggleBtn.classList.toggle('open', newState);
    };
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

  // Filtro por imágenes adjuntas
  const filtroImagenes = document.getElementById('filtroImagenesChecklist');
  if (filtroImagenes) {
    filtroImagenes.addEventListener('change', (e) => {
      AppState.checklistFilters.imagenes = e.target.value;
      AppState.checklistPagination.page = 1;
      applyChecklistFilters();
    });
  }

  // Búsqueda de inspecciones recientes
  const buscarInspeccion = document.getElementById('buscarInspeccionReciente');
  if (buscarInspeccion) {
    buscarInspeccion.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = DEFAULT_INSPECCIONES_RECIENTES.filter((insp) => {
        const texto =
          `${insp.habitacion} ${insp.titulo} ${insp.tecnico}`.toLowerCase();
        return texto.includes(term);
      });
      renderInspeccionesRecientes(filtered);
    });
  }

  // Botones de exportación - solo para admin y supervisor
  const userRole =
    AppState.currentUser?.role || window.AppState?.currentUser?.role;
  const panelAcciones = document.getElementById('panelAccionesChecklist');
  const btnExportar = document.getElementById('btnExportarChecklist');
  const btnExportarFiltrado = document.getElementById(
    'btnExportarChecklistFiltrado'
  );

  if (userRole === 'admin' || userRole === 'supervisor') {
    if (panelAcciones) panelAcciones.style.display = 'block';
    if (btnExportar) {
      btnExportar.addEventListener('click', exportarChecklistExcel);
    }
    if (btnExportarFiltrado) {
      btnExportarFiltrado.addEventListener('click', exportarChecklistFiltrado);
    }
  } else {
    if (panelAcciones) panelAcciones.style.display = 'none';
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
  const slugLocal = nombre
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (
    AppState.checklistCategorias.some(
      (cat) => cat.id === slugLocal || cat.slug === slugLocal
    )
  ) {
    if (feedback)
      feedback.textContent = 'Ya existe una sección con ese nombre.';
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
    const token =
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');
    const responseCategoria = await fetch('/api/checklist/categorias', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nombre, icono }),
    });

    if (!responseCategoria.ok) {
      const errorData = await responseCategoria.json();
      throw new Error(errorData.error || 'Error al crear categoría');
    }

    const nuevaCategoria = await responseCategoria.json();
    console.log('✅ Categoría creada en BD:', nuevaCategoria);

    // 2. Agregar ítems si los hay
    const itemsRaw = (itemsInput?.value || '').trim();
    const itemsArray = itemsRaw
      ? itemsRaw
        .split(/[,\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
      : [];

    for (const itemNombre of itemsArray) {
      try {
        await fetch('/api/checklist/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: itemNombre,
            categoria_id: nuevaCategoria.id,
          }),
        });
      } catch (itemError) {
        console.warn('Error al crear ítem:', itemNombre, itemError);
      }
    }

    // 3. Actualizar AppState con la nueva categoría
    AppState.checklistCategorias.push({
      id: nuevaCategoria.slug || nuevaCategoria.id,
      nombre: nuevaCategoria.nombre,
      icono: nuevaCategoria.icono,
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

    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur(
        `Sección "${nombre}" creada exitosamente`,
        'success'
      );
  } catch (error) {
    console.error('❌ Error al crear sección:', error);
    if (feedback) {
      feedback.textContent = `❌ ${error.message}`;
      feedback.style.color = '#ef4444';
    }
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur(`Error: ${error.message}`, 'error');
  } finally {
    // Restaurar botón
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<i class="fas fa-plus-circle"></i> Guardar sección';
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
    electronSafeAlert('No hay periodos archivados disponibles');
    return;
  }

  let mensaje = 'Periodos archivados:\n\n';
  historial.forEach((periodo, index) => {
    const fecha = new Date(periodo.fecha).toLocaleDateString('es-MX');
    mensaje += `${index + 1}. ${periodo.periodo} - Archivado el ${fecha}\n`;
  });

  electronSafeAlert(mensaje);
}

function generarReporteChecklist() {
  electronSafeAlert(
    'Generación de reporte PDF en desarrollo.\nPróximamente podrá descargar reportes detallados en formato PDF.'
  );
}

// ========================================
// ESPACIOS COMUNES - GESTIÓN
// ========================================

async function loadEspaciosComunesData() {
  console.log('🏢 [ESPACIOS] Cargando datos de espacios comunes...');
  console.log(
    '📥 [ESPACIOS] Cargando datos de espacios comunes y mantenimientos...'
  );

  // Mostrar skeletons solo si es la primera carga
  if (!window.espaciosComunesCargados && window.mostrarSkeletonsEspacios) {
    window.mostrarSkeletonsEspacios();
  }

  try {
    const [espaciosResponse, mantenimientosResponse] = await Promise.all([
      fetchWithAuth(`${API_BASE_URL}/api/espacios-comunes`),
      fetchWithAuth(`${API_BASE_URL}/api/mantenimientos/espacios`),
    ]);

    if (espaciosResponse.ok && mantenimientosResponse.ok) {
      AppState.espaciosComunes = await espaciosResponse.json();
      AppState.mantenimientosEspacios = await mantenimientosResponse.json();
      console.log(
        `✅ [ESPACIOS] Datos cargados: ${AppState.espaciosComunes.length} espacios, ${AppState.mantenimientosEspacios.length} mantenimientos.`
      );

      // Poblar filtro de edificios para espacios comunes
      poblarFiltroEdificiosEspacios();

      // Usar la nueva función de renderizado si está disponible
      if (window.cargarEspaciosComunes) {
        window.cargarEspaciosComunes();
      } else {
        // Fallback a la función antigua
        renderEspaciosComunes();
      }
    } else {
      console.error(
        '❌ [ESPACIOS] Error cargando datos:',
        espaciosResponse.status,
        mantenimientosResponse.status
      );
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
    lista.innerHTML =
      '<li class="mensaje-no-cuartos"><i class="fas fa-building"></i><p>No hay espacios comunes registrados</p></li>';
    return;
  }

  AppState.espaciosComunes.forEach((espacio) => {
    const mantenimientosEspacio = AppState.mantenimientosEspacios.filter(
      (m) => m.espacio_comun_id === espacio.id
    );

    const li = document.createElement('li');
    li.className = 'habitacion-card';
    li.setAttribute('data-aos', 'fade-up');
    li.setAttribute('data-espacio-id', espacio.id);

    const { estadoBadgeClass, estadoIcon, estadoText } = getEstadoBadgeInfo(
      espacio.estado
    );

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
    disponible: {
      class: 'estado-disponible',
      icon: 'fa-check-circle',
      text: 'Disponible',
    },
    ocupado: { class: 'estado-ocupado', icon: 'fa-user', text: 'Ocupado' },
    mantenimiento: {
      class: 'estado-mantenimiento',
      icon: 'fa-tools',
      text: 'Mantenimiento',
    },
    fuera_servicio: {
      class: 'estado-fuera-servicio',
      icon: 'fa-ban',
      text: 'Fuera de Servicio',
    },
  };

  const info = estadosMap[estado] || estadosMap['disponible'];
  return {
    estadoBadgeClass: info.class,
    estadoIcon: info.icon,
    estadoText: info.text,
  };
}

function generarServiciosEspacioHTML(mantenimientos, espacioId) {
  if (!mantenimientos || mantenimientos.length === 0) {
    return '<p class="habitacion-sin-servicios"><i class="fas fa-check-circle"></i> Sin servicios pendientes</p>';
  }

  return mantenimientos
    .map((m) => {
      const prioridadClass = m.prioridad || 'media';
      const estadoClass = m.estado || 'pendiente';
      const tipoIcon = m.tipo === 'rutina' ? 'fa-clock' : 'fa-wrench';
      const tieneNotas = m.notas && m.notas.trim();
      const iconoNota = tieneNotas
        ? `<span class="servicio-nota-indicador" title="Este servicio tiene notas"><i class="fas fa-sticky-note"></i></span>`
        : '';

      return `
            <div class="servicio-item servicio-${estadoClass}" data-mantenimiento-id="${m.id}">
                <div class="servicio-header">
                    <i class="fas ${tipoIcon}"></i>
                    <span class="servicio-tipo">${m.tipo === 'rutina' ? 'Alerta' : 'Servicio'}</span>
                    <span class="servicio-prioridad prioridad-${prioridadClass}">${m.prioridad || 'media'}</span>
                    ${iconoNota}
                </div>
                <div class="servicio-descripcion">${escapeHtml(m.descripcion)}</div>
                ${m.tipo === 'rutina' && m.dia_alerta
          ? `
                    <div class="servicio-fecha">
                        <i class="far fa-calendar-alt"></i> ${formatearFecha(m.dia_alerta)}
                        ${m.hora ? `<i class="far fa-clock"></i> ${m.hora}` : ''}
                    </div>
                `
          : ''
        }
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
    })
    .join('');
}

function mostrarBtnEditarEspacio(mantenimientos, espacioId) {
  if (mantenimientos.length === 0) {
    return '';
  }
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

  // Use formatting functions from app-loader.js (exposed on window)
  const formatearFechaCorta =
    window.formatearFechaCorta || ((fecha) => fecha || '');
  const formatearHora = window.formatearHora || ((hora) => hora || '');

  const listaAlertas = document.getElementById('listaAlertasEspacios');
  const listaEmitidas = document.getElementById('listaAlertasEmitidasEspacios');

  // Obtener fecha de hoy (sin hora para comparación)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Helper para obtener nombre del espacio
  const obtenerNombreEspacio = (alerta) => {
    if (alerta.espacio_nombre) return alerta.espacio_nombre;
    // Buscar en espaciosComunes si no viene el nombre
    const espacio = AppState.espaciosComunes?.find(
      (e) => e.id === alerta.espacio_comun_id
    );
    return espacio?.nombre || 'Espacio';
  };

  if (listaAlertas) {
    // Alertas Programadas: alertas que AÚN NO se han emitido (independiente de la fecha)
    const alertasPendientes = AppState.mantenimientosEspacios.filter((m) => {
      if (m.tipo !== 'rutina') return false;
      // Solo mostrar alertas pendientes o en proceso que NO han sido emitidas
      if (m.estado !== 'pendiente' && m.estado !== 'en_proceso') return false;

      // Mostrar solo alertas que NO han sido emitidas
      return !m.alerta_emitida;
    });

    const mensajeNoAlertasEspacios = document.getElementById(
      'mensaje-no-alertas-espacios'
    );

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
      listaAlertas.innerHTML = alertasPendientes
        .map((alerta) => {
          // Extraer fecha de dia_alerta si es timestamp
          const fechaAlerta = alerta.dia_alerta?.includes('T')
            ? alerta.dia_alerta.split('T')[0]
            : alerta.dia_alerta;
          const nombreEspacio = obtenerNombreEspacio(alerta);
          return `
                <li class="rutina-item prioridad-${alerta.prioridad || 'media'}" data-alerta-id="${alerta.id}">
                    <span class="rutina-info">
                        <span class="rutina-cuarto">${escapeHtml(nombreEspacio)}</span>
                        <span class="rutina-descripcion">${escapeHtml(alerta.descripcion)}</span>
                    </span>
                    <span class="rutina-hora">
                        ${fechaAlerta ? formatearFechaCorta(fechaAlerta) : '??/??'}
                        ${alerta.hora ? formatearHora(alerta.hora) : '--:--'}
                    </span>
                </li>
            `;
        })
        .join('');
    }
  }

  if (listaEmitidas) {
    // Alertas del Día: alertas emitidas de hoy (pendientes o en proceso, no completadas/canceladas)
    const alertasEmitidas = AppState.mantenimientosEspacios
      .filter((m) => {
        if (m.tipo !== 'rutina') return false;
        // Solo mostrar alertas pendientes o en proceso (no completadas/canceladas)
        if (m.estado !== 'pendiente' && m.estado !== 'en_proceso') return false;
        if (!m.alerta_emitida) return false; // Solo alertas emitidas

        // Si no tiene fecha, mostrar igual
        if (!m.dia_alerta) return true;

        // Comparar fecha de la alerta con hoy
        const fechaAlerta = new Date(m.dia_alerta);
        fechaAlerta.setHours(0, 0, 0, 0);

        // Mostrar en "Alertas del Día" solo si la fecha es hoy o anterior (alertas pasadas)
        return fechaAlerta.getTime() <= hoy.getTime();
      })
      .sort((a, b) => {
        // Ordenar por fecha y hora descendente (más reciente primero)
        const fechaA = a.dia_alerta || '';
        const fechaB = b.dia_alerta || '';
        const horaA = a.hora || '00:00';
        const horaB = b.hora || '00:00';

        // Comparar primero por fecha, luego por hora
        if (fechaA !== fechaB) {
          return fechaB.localeCompare(fechaA); // Descendente
        }
        return horaB.localeCompare(horaA); // Descendente
      });

    const mensajeNoAlertasEmitidas = document.getElementById(
      'mensaje-no-alertas-emitidas-espacios'
    );

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
      listaEmitidas.innerHTML = alertasEmitidas
        .map((alerta) => {
          // Extraer fecha de dia_alerta si es timestamp
          const fechaAlerta = alerta.dia_alerta?.includes('T')
            ? alerta.dia_alerta.split('T')[0]
            : alerta.dia_alerta;
          const nombreEspacio = obtenerNombreEspacio(alerta);
          return `
                <li class="rutina-item alerta-emitida prioridad-${alerta.prioridad || 'media'}" data-alerta-id="${alerta.id}">
                    <span class="rutina-info">
                        <span class="rutina-cuarto">${escapeHtml(nombreEspacio)}</span>
                        <span class="rutina-descripcion">${escapeHtml(alerta.descripcion)}</span>
                    </span>
                    <span class="rutina-hora">
                        ${fechaAlerta ? formatearFechaCorta(fechaAlerta) : '??/??'}
                        ${alerta.hora ? formatearHora(alerta.hora) : '--:--'}
                    </span>
                </li>
            `;
        })
        .join('');
    }

    listaEmitidas.addEventListener('click', (e) =>
      abrirModalDetalleServicioEnLista(e, 'rutina-item')
    );
  }

  if (listaAlertas) {
    listaAlertas.addEventListener('click', (e) =>
      abrirModalDetalleServicioEnLista(e, 'rutina-item')
    );
  }
}

function abrirModalDetalleServicioEnLista(e, claseDeListaItem) {
  if (e.target.classList.contains(claseDeListaItem)) {
    const alertaId = e.target.dataset.alertaId;
    abrirModalDetalleServicio(Number(alertaId));
  } else if (e.target.parentElement.classList.contains(claseDeListaItem)) {
    const alertaId = e.target.parentElement.dataset.alertaId;
    abrirModalDetalleServicio(Number(alertaId));
  } else if (
    e.target.parentElement.parentElement.classList.contains(claseDeListaItem)
  ) {
    const alertaId = e.target.parentElement.parentElement.dataset.alertaId;
    abrirModalDetalleServicio(Number(alertaId));
  }
}

function seleccionarEspacioComun(espacioId) {
  electronSafeAlert(
    `Funcionalidad en desarrollo: Agregar servicio al espacio ${espacioId}`
  );
}

function editarMantenimientoEspacio(mantenimientoId) {
  electronSafeAlert(
    `Funcionalidad en desarrollo: Editar mantenimiento ${mantenimientoId}`
  );
}

async function eliminarMantenimientoEspacio(mantenimientoId) {
  if (
    !electronSafeConfirm('¿Estás seguro de que deseas eliminar este servicio?')
  ) {
    return;
  }

  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/mantenimientos/${mantenimientoId}`,
      {
        method: 'DELETE',
      }
    );

    if (response.ok) {
      electronSafeAlert('Servicio eliminado correctamente');
      await loadEspaciosComunesData();
    } else {
      throw new Error('Error al eliminar servicio');
    }
  } catch (error) {
    console.error('Error eliminando servicio:', error);
    electronSafeAlert('Error al eliminar el servicio');
  }
}

async function cambiarEstadoEspacio(espacioId) {
  const espacio = AppState.espaciosComunes.find((e) => e.id === espacioId);
  if (!espacio) return;

  const estados = [
    { value: 'disponible', label: '🟢 Disponible' },
    { value: 'ocupado', label: '🔴 Ocupado' },
    { value: 'mantenimiento', label: '🟡 Mantenimiento' },
    { value: 'fuera_servicio', label: '⚫ Fuera de Servicio' },
  ];

  const opciones = estados
    .map((e) => `${e.value === espacio.estado ? '✓ ' : ''}${e.label}`)
    .join('\n');
  const nuevoEstado = prompt(
    `Estado actual: ${espacio.estado}\n\nSelecciona nuevo estado:\n${opciones}\n\nEscribe: disponible, ocupado, mantenimiento o fuera_servicio`
  );

  if (!nuevoEstado || !estados.find((e) => e.value === nuevoEstado.trim())) {
    return;
  }

  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/espacios-comunes/${espacioId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevoEstado.trim() }),
      }
    );

    if (response.ok) {
      electronSafeAlert('Estado actualizado correctamente');
      await loadEspaciosComunesData();
    } else {
      throw new Error('Error al actualizar estado');
    }
  } catch (error) {
    console.error('Error actualizando estado:', error);
    electronSafeAlert('Error al actualizar el estado');
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
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
    const response = await window.fetchWithAuth(
      `${API_BASE_URL}/api/usuarios/roles`
    );
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
    const response = await window.fetchWithAuth(
      `${API_BASE_URL}/api/auth/usuarios?includeInactive=1`
    );
    if (!response.ok) {
      throw new Error('Error al cargar usuarios');
    }

    AppState.usuarios = await response.json();
    console.log('👥 [USUARIOS] Total cargados:', AppState.usuarios.length);
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    usuariosGrid.innerHTML =
      '<div class="mensaje-error">Error al cargar usuarios. Por favor, intente nuevamente.</div>';
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
        ${roles.map((rol) => `<option value="${rol.id}">${rol.nombre}</option>`).join('')}
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
    usuariosGrid.innerHTML =
      '<div class="mensaje-vacio">No hay usuarios registrados</div>';
    return;
  }

  // Obtener valores de filtros
  const textoBusqueda = (AppState.usuariosFiltro || '').toLowerCase().trim();
  const filtroRol = document.getElementById('filtroRolUsuario')?.value || '';
  const filtroEstado =
    document.getElementById('filtroEstadoUsuario')?.value || '';

  const filtrados = AppState.usuarios.filter((usuario) => {
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
        usuario.rol_nombre,
        usuario.notas_admin,
      ]
        .filter(Boolean)
        .some((valor) => valor.toLowerCase().includes(textoBusqueda));
      if (!coincide) return false;
    }

    return true;
  });

  if (filtrados.length === 0) {
    usuariosGrid.innerHTML =
      '<div class="mensaje-vacio">No se encontraron usuarios con los filtros aplicados</div>';
    return;
  }

  usuariosGrid.innerHTML = filtrados.map(renderUsuarioCard).join('');
}

function renderUsuarioCard(usuario) {
  const estadoClase = usuario.activo ? 'estado-activo' : 'estado-inactivo';
  const rol = (usuario.rol_nombre || 'tecnico').toLowerCase();

  // Calcular tiempo relativo y semáforo de actividad
  const actividadRelativa = formatearTiempoRelativo(
    usuario.ultimo_acceso || usuario.ultima_sesion_login
  );
  const semaforoInfo = obtenerIconoSemaforo(actividadRelativa.nivel);

  // Determinar clase de badge según rol
  const badgeClass =
    rol === 'admin'
      ? 'badge-admin'
      : rol === 'supervisor'
        ? 'badge-supervisor'
        : 'badge-tecnico';

  // Determinar icono del avatar según rol
  const avatarIcon =
    rol === 'admin'
      ? 'fa-user-shield'
      : rol === 'supervisor'
        ? 'fa-user-tie'
        : 'fa-user';

  const estaBloqueado =
    usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date();
  const bloqueadoHasta = estaBloqueado
    ? formatUsuarioFecha(usuario.bloqueado_hasta)
    : null;

  // Sesiones del día y activas
  const sesionesHoy = usuario.sesiones_hoy || 0;
  const sesionesActivas = usuario.sesiones_activas || 0;

  return `
        <div class="usuario-card gradient-card ${estaBloqueado ? 'usuario-bloqueado' : ''}" data-rol="${rol}" data-estado="${usuario.activo ? 'activo' : 'inactivo'}" onclick="abrirModalDetalleUsuario(${usuario.id})">
            <div class="usuario-header">
                <div class="usuario-avatar">
                    <i class="fas ${avatarIcon}"></i>
                </div>
                <div class="usuario-info-principal">
                    <h3 class="usuario-nombre">${usuario.nombre || 'Sin nombre'}</h3>
                    <span class="badge-rol ${badgeClass}">${(usuario.rol_nombre || 'TÉCNICO').toUpperCase()}</span>
                </div>
            </div>
            ${estaBloqueado
      ? `
                <div class="usuario-bloqueado-alerta">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <strong>Usuario bloqueado por múltiples intentos fallidos</strong>
                        <small>Bloqueado hasta: ${bloqueadoHasta}</small>
                    </div>
                </div>
            `
      : ''
    }
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
                <div class="usuario-actividad">
                    <div class="actividad-header">
                        <i class="fas ${semaforoInfo.icono} ${semaforoInfo.clase}" title="${semaforoInfo.tooltip}"></i>
                        <span class="actividad-label">ÚLTIMA ACTIVIDAD</span>
                    </div>
                    <span class="actividad-valor">${actividadRelativa.texto}</span>
                </div>
                <div class="usuario-sesiones-resumen">
                    <span class="sesion-label">SESIONES</span>
                    <div class="sesion-valores">
                        <span class="sesion-hoy">${sesionesHoy} hoy</span>
                        <span class="sesion-activas">${sesionesActivas} ${sesionesActivas === 1 ? 'activa' : 'activas'}</span>
                    </div>
                </div>
                <div class="usuario-switch-container" onclick="event.stopPropagation()">
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
                <div class="usuario-actions" onclick="event.stopPropagation()">
                    ${estaBloqueado
      ? `
                    <button class="btn-unlock-user" type="button" onclick="desbloquearUsuario(${usuario.id})">
                        <i class="fas fa-unlock"></i>
                        <span>Desbloquear</span>
                    </button>
                    `
      : ''
    }
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
    return date.toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (error) {
    return 'Sin registro';
  }
}

/**
 * Formatea una fecha como tiempo relativo (hace X minutos/horas/días)
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {{texto: string, nivel: string}} - Objeto con texto y nivel del semáforo
 */
function formatearTiempoRelativo(fecha) {
  if (!fecha) return { texto: 'Sin registro', nivel: 'gris' };

  try {
    const ahora = new Date();
    const fechaActividad = new Date(fecha);
    const diffMs = ahora - fechaActividad;
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let texto;
    let nivel;

    if (diffMinutos < 1) {
      texto = 'Ahora mismo';
      nivel = 'verde';
    } else if (diffMinutos < 60) {
      texto = `hace ${diffMinutos} min`;
      nivel = 'verde';
    } else if (diffHoras < 24) {
      texto = `hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
      nivel = 'verde';
    } else if (diffDias < 7) {
      texto = `hace ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
      nivel = 'amarillo';
    } else if (diffDias < 30) {
      const semanas = Math.floor(diffDias / 7);
      texto = `hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
      nivel = 'rojo';
    } else {
      const meses = Math.floor(diffDias / 30);
      texto = `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
      nivel = 'gris';
    }

    return { texto, nivel };
  } catch (error) {
    return { texto: 'Sin registro', nivel: 'gris' };
  }
}

/**
 * Obtiene la información del icono de semáforo según el nivel de actividad
 * @param {string} nivel - Nivel de actividad (verde, amarillo, rojo, gris)
 * @returns {{icono: string, clase: string, tooltip: string}}
 */
function obtenerIconoSemaforo(nivel) {
  const iconos = {
    verde: {
      icono: 'fa-circle',
      clase: 'semaforo-verde',
      tooltip: 'Usuario activo',
    },
    amarillo: {
      icono: 'fa-circle',
      clase: 'semaforo-amarillo',
      tooltip: 'Actividad reciente',
    },
    rojo: { icono: 'fa-circle', clase: 'semaforo-rojo', tooltip: 'Inactivo' },
    gris: {
      icono: 'fa-circle',
      clase: 'semaforo-gris',
      tooltip: 'Sin actividad registrada',
    },
  };
  return iconos[nivel] || iconos.gris;
}

function resetUsuarioForm() {
  const form = document.getElementById('usuarioForm');
  if (!form) return;

  form.reset();
  AppState.usuarioFormMode = 'create';
  AppState.usuarioEdicion = null;

  document.getElementById('usuarioFormTitle').textContent =
    'Registrar nuevo usuario';
  const submitBtn = document.getElementById('usuarioFormSubmit');
  if (submitBtn) submitBtn.textContent = 'Crear usuario';

  const activoCheckbox = document.getElementById('usuarioActivo');
  if (activoCheckbox) activoCheckbox.checked = true;

  const passwordHelp = document.getElementById('usuarioPasswordHelp');
  if (passwordHelp)
    passwordHelp.textContent =
      'La contraseña temporal solo se solicita durante el alta de un usuario.';

  renderRolesSelect();
}

async function handleUsuarioFormSubmit(event) {
  event.preventDefault();
  if (AppState.currentUser?.role !== 'admin') return;

  const submitBtn = document.getElementById('btnSubmitUsuario');
  const originalHTML = submitBtn?.innerHTML;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> <span>GUARDANDO...</span>';
  }

  try {
    const payload = buildUsuarioPayload();

    if (!payload.nombre || !payload.email || !payload.rol) {
      throw new Error('Nombre, correo y rol son obligatorios');
    }

    const usuarioId = document.getElementById('usuarioIdEdicion')?.value;
    const isEdit = AppState.usuarioFormMode === 'edit' && usuarioId;

    if (!isEdit && !payload.password) {
      throw new Error(
        'La contraseña temporal es obligatoria para nuevos usuarios'
      );
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
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al guardar usuario');
    }

    electronSafeAlert(
      isEdit
        ? 'Usuario actualizado exitosamente'
        : 'Usuario creado exitosamente'
    );
    cerrarModalUsuario();
    await cargarUsuarios(true);
    resetUsuarioForm();
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    electronSafeAlert(error.message || 'Error al guardar usuario');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        originalHTML ||
        '<i class="fas fa-user-plus"></i> <span>CREAR USUARIO</span>';
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
    requiere_cambio_password:
      document.getElementById('requiereCambioPassword')?.checked || false,
    notas_admin: getValue('notasUsuario') || null,
  };

  const password = getValue('passwordUsuario');
  if (password) {
    payload.password = password;
  }

  return payload;
}

function editarUsuario(id) {
  const usuario = AppState.usuarios.find((u) => u.id === id);
  if (!usuario) {
    electronSafeAlert('Usuario no encontrado');
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
    btnSubmit.innerHTML =
      '<i class="fas fa-save"></i> <span>Actualizar usuario</span>';
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
      btnSubmit.innerHTML =
        '<i class="fas fa-user-plus"></i> <span>Crear usuario</span>';
    }
    if (passwordHelp) {
      passwordHelp.textContent =
        'La contraseña temporal solo se solicita durante el registro inicial.';
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
      const response = await window.fetchWithAuth(
        `${API_BASE_URL}/api/usuarios/${id}/activar`,
        {
          method: 'POST',
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al activar usuario');
      }
      await cargarUsuarios(true);
    } else {
      // Desactivar usuario
      const response = await window.fetchWithAuth(
        `${API_BASE_URL}/api/usuarios/${id}/desactivar`,
        {
          method: 'POST',
          body: JSON.stringify({ motivo: 'Desactivado por administrador' }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al desactivar usuario');
      }
      await cargarUsuarios(true);
    }
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    electronSafeAlert(error.message || 'Error al cambiar estado del usuario');
    // Recargar para restaurar el estado original del switch
    await cargarUsuarios(true);
  }
}

async function desactivarUsuario(id) {
  if (!electronSafeConfirm('¿Está seguro que desea desactivar este usuario?')) {
    return;
  }

  const motivo = prompt(
    'Motivo de desactivación',
    'Desactivado por administrador'
  );
  if (motivo === null) {
    return;
  }

  try {
    const response = await window.fetchWithAuth(
      `${API_BASE_URL}/api/usuarios/${id}/desactivar`,
      {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al desactivar usuario');
    }

    electronSafeAlert('Usuario desactivado exitosamente');
    await cargarUsuarios(true);
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    electronSafeAlert(error.message || 'Error al desactivar usuario');
  }
}

async function activarUsuario(id) {
  if (!electronSafeConfirm('¿Está seguro que desea reactivar este usuario?')) {
    return;
  }

  try {
    const response = await window.fetchWithAuth(
      `${API_BASE_URL}/api/usuarios/${id}/activar`,
      {
        method: 'POST',
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al reactivar usuario');
    }

    electronSafeAlert('Usuario reactivado exitosamente');
    await cargarUsuarios(true);
  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    electronSafeAlert(error.message || 'Error al activar usuario');
  }
}

async function desbloquearUsuario(id) {
  if (
    !electronSafeConfirm(
      '¿Deseas desbloquear este usuario? Podrá intentar iniciar sesión nuevamente.'
    )
  ) {
    return;
  }

  try {
    const response = await window.fetchWithAuth(
      `${API_BASE_URL}/api/usuarios/${id}/desbloquear`,
      {
        method: 'POST',
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al desbloquear usuario');
    }

    electronSafeAlert('Usuario desbloqueado exitosamente');
    await cargarUsuarios(true);
  } catch (error) {
    console.error('Error al desbloquear usuario:', error);
    electronSafeAlert(
      error.message || 'Error al desbloquear usuario. Intenta nuevamente.'
    );
  }
}

function eliminarUsuario() {
  electronSafeAlert(
    'Los usuarios no se pueden eliminar por seguridad.\nSolo se pueden desactivar.'
  );
}

function mostrarModalNuevoUsuario() {
  resetUsuarioForm();
  document
    .getElementById('usuarioForm')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('usuarioNombre')?.focus();
}

// ==========================================
// MODAL DETALLE USUARIO - Vista desde Card
// ==========================================

// Estado del usuario actualmente mostrado en el modal de detalles
let usuarioDetalleActual = null;

/**
 * Abre el modal de detalles de usuario al hacer clic en una card
 */
function abrirModalDetalleUsuario(id) {
  const usuario = AppState.usuarios.find((u) => u.id === id);
  if (!usuario) {
    console.error('Usuario no encontrado:', id);
    return;
  }

  usuarioDetalleActual = usuario;
  poblarModalDetalleUsuario(usuario);

  const modal = document.getElementById('modalDetalleUsuario');
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Cierra el modal de detalles de usuario
 */
function cerrarModalDetalleUsuario() {
  const modal = document.getElementById('modalDetalleUsuario');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  usuarioDetalleActual = null;
}

/**
 * Pobla el modal de detalles con la información del usuario
 */
function poblarModalDetalleUsuario(usuario) {
  const rol = (usuario.rol_nombre || 'tecnico').toLowerCase();

  // Nombre en el header
  const nombreEl = document.getElementById('detalleUsuarioNombre');
  if (nombreEl) nombreEl.textContent = usuario.nombre || 'Sin nombre';

  // Avatar con icono según rol
  const avatarEl = document.getElementById('detalleUsuarioAvatar');
  if (avatarEl) {
    const avatarIcon =
      rol === 'admin'
        ? 'fa-user-shield'
        : rol === 'supervisor'
          ? 'fa-user-tie'
          : 'fa-user';
    avatarEl.innerHTML = `<i class="fas ${avatarIcon}"></i>`;
  }

  // Badge de rol
  const rolBadgeEl = document.getElementById('detalleUsuarioRolBadge');
  if (rolBadgeEl) {
    rolBadgeEl.textContent = (usuario.rol_nombre || 'TÉCNICO').toUpperCase();
    rolBadgeEl.className = 'badge-rol detalle-usuario-badge';
    rolBadgeEl.classList.add(
      rol === 'admin'
        ? 'badge-admin'
        : rol === 'supervisor'
          ? 'badge-supervisor'
          : 'badge-tecnico'
    );
  }

  // Número de empleado
  const empleadoEl = document.getElementById('detalleUsuarioEmpleado');
  if (empleadoEl)
    empleadoEl.textContent = usuario.numero_empleado || 'Sin registro';

  // Información de contacto
  const emailEl = document.getElementById('detalleUsuarioEmail');
  if (emailEl) emailEl.textContent = usuario.email || 'Sin correo';

  const telefonoEl = document.getElementById('detalleUsuarioTelefono');
  if (telefonoEl) telefonoEl.textContent = usuario.telefono || 'Sin registro';

  const departamentoEl = document.getElementById('detalleUsuarioDepartamento');
  if (departamentoEl)
    departamentoEl.textContent = usuario.departamento || 'Sin registro';

  // Información de actividad con semáforo
  const actividadRelativa = formatearTiempoRelativo(
    usuario.ultimo_acceso || usuario.ultima_sesion_login
  );
  const semaforoInfo = obtenerIconoSemaforo(actividadRelativa.nivel);

  const semaforoIconEl = document.getElementById('detalleUsuarioSemaforoIcon');
  if (semaforoIconEl) {
    semaforoIconEl.className = `fas fa-circle ${semaforoInfo.clase}`;
    semaforoIconEl.title = semaforoInfo.tooltip;
  }

  const actividadRelativaEl = document.getElementById(
    'detalleUsuarioActividadRelativa'
  );
  if (actividadRelativaEl) {
    actividadRelativaEl.textContent = actividadRelativa.texto;
  }

  const sesionesHoyEl = document.getElementById('detalleUsuarioSesionesHoy');
  if (sesionesHoyEl) {
    sesionesHoyEl.textContent = usuario.sesiones_hoy || 0;
  }

  const sesionesActivasEl = document.getElementById(
    'detalleUsuarioSesionesActivas'
  );
  if (sesionesActivasEl)
    sesionesActivasEl.textContent = usuario.sesiones_activas || 0;

  // Estado del usuario (toggle)
  const toggleEl = document.getElementById('detalleUsuarioToggle');
  if (toggleEl) toggleEl.checked = usuario.activo;

  const estadoTextoEl = document.getElementById('detalleUsuarioEstadoTexto');
  if (estadoTextoEl) {
    estadoTextoEl.textContent = usuario.activo
      ? 'Usuario Activo'
      : 'Usuario Inactivo';
    estadoTextoEl.className = 'detalle-usuario-estado-texto';
    if (!usuario.activo) estadoTextoEl.classList.add('inactivo');
  }

  // Notas administrativas
  const notasSectionEl = document.getElementById('detalleUsuarioNotasSection');
  const notasTextoEl = document.getElementById('detalleUsuarioNotas');
  if (notasSectionEl && notasTextoEl) {
    if (usuario.notas_admin && usuario.notas_admin.trim()) {
      notasSectionEl.style.display = 'block';
      notasTextoEl.textContent = usuario.notas_admin;
    } else {
      notasSectionEl.style.display = 'none';
      notasTextoEl.textContent = '';
    }
  }

  // Verificar si está bloqueado
  const estaBloqueado =
    usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date();
  const bloqueadoAlertEl = document.getElementById(
    'detalleUsuarioBloqueadoAlert'
  );
  const btnDesbloquear = document.getElementById('btnDesbloquearDesdeDetalle');

  if (bloqueadoAlertEl) {
    bloqueadoAlertEl.style.display = estaBloqueado ? 'flex' : 'none';
    if (estaBloqueado) {
      const bloqueadoHastaEl = document.getElementById(
        'detalleUsuarioBloqueadoHasta'
      );
      if (bloqueadoHastaEl) {
        bloqueadoHastaEl.textContent = `Bloqueado hasta: ${formatUsuarioFecha(usuario.bloqueado_hasta)}`;
      }
    }
  }

  if (btnDesbloquear) {
    btnDesbloquear.style.display = estaBloqueado ? 'inline-flex' : 'none';
  }
}

/**
 * Toggle del estado del usuario desde el modal de detalles
 */
async function toggleUsuarioEstadoDesdeModal() {
  if (!usuarioDetalleActual) return;

  const toggleEl = document.getElementById('detalleUsuarioToggle');
  const activar = toggleEl?.checked;

  try {
    await toggleUsuarioEstado(usuarioDetalleActual.id, activar);
    // Actualizar la referencia local
    const usuarioActualizado = AppState.usuarios.find(
      (u) => u.id === usuarioDetalleActual.id
    );
    if (usuarioActualizado) {
      usuarioDetalleActual = usuarioActualizado;
      poblarModalDetalleUsuario(usuarioDetalleActual);
    }
  } catch (error) {
    console.error('Error al cambiar estado desde modal:', error);
    // Revertir el toggle si hubo error
    if (toggleEl) toggleEl.checked = !activar;
  }
}

/**
 * Abrir modal de edición desde el modal de detalles
 */
function editarUsuarioDesdeModal() {
  if (!usuarioDetalleActual) return;

  const usuarioId = usuarioDetalleActual.id;
  cerrarModalDetalleUsuario();
  editarUsuario(usuarioId);
}

/**
 * Desbloquear usuario desde el modal de detalles
 */
async function desbloquearUsuarioDesdeModal() {
  if (!usuarioDetalleActual) return;

  await desbloquearUsuario(usuarioDetalleActual.id);

  // Actualizar el modal si sigue abierto
  const usuarioActualizado = AppState.usuarios.find(
    (u) => u.id === usuarioDetalleActual.id
  );
  if (usuarioActualizado) {
    usuarioDetalleActual = usuarioActualizado;
    poblarModalDetalleUsuario(usuarioDetalleActual);
  }
}

// Exponer funciones globalmente
window.abrirModalDetalleUsuario = abrirModalDetalleUsuario;
window.cerrarModalDetalleUsuario = cerrarModalDetalleUsuario;
window.toggleUsuarioEstadoDesdeModal = toggleUsuarioEstadoDesdeModal;
window.editarUsuarioDesdeModal = editarUsuarioDesdeModal;
window.desbloquearUsuarioDesdeModal = desbloquearUsuarioDesdeModal;

// ==========================================
// CHECKLIST FOTOS - CAPTURA Y PREVIEW
// ==========================================

let checklistFotoActual = {
  file: null,
  cuartoId: null,
  itemId: null,
  itemNombre: null,
};

// Cache de items del catálogo para el selector
let checklistCatalogItemsCache = null;

/**
 * Obtiene los items del catálogo de checklist
 */
async function obtenerChecklistCatalogItems() {
  if (checklistCatalogItemsCache) {
    return checklistCatalogItemsCache;
  }

  try {
    if (typeof ChecklistAPI !== 'undefined') {
      checklistCatalogItemsCache = await ChecklistAPI.getCatalogItems();
      console.log(
        `📷 Catálogo cargado: ${checklistCatalogItemsCache.length} ítems`
      );
      return checklistCatalogItemsCache;
    }
  } catch (error) {
    console.error('❌ Error cargando catálogo:', error);
  }

  return [];
}

/**
 * Abre el input de captura de foto para foto general (sin ítem específico)
 */
function abrirCapturaFotoGeneral(cuartoId, cuartoNumero) {
  console.log(
    `📷 Abriendo captura de foto GENERAL para cuarto ${cuartoId}: ${cuartoNumero}`
  );

  // Guardar contexto sin ítem específico
  checklistFotoActual.cuartoId = cuartoId;
  checklistFotoActual.itemId = null;
  checklistFotoActual.itemNombre = null;

  abrirInputFotoChecklist();
}

/**
 * Abre el input de captura de foto para un ítem específico
 */
function abrirCapturaFotoItem(cuartoId, itemId, itemNombre) {
  console.log(
    `📷 Abriendo captura de foto para cuarto ${cuartoId}, ítem ${itemId}: ${itemNombre}`
  );

  // Guardar contexto
  checklistFotoActual.cuartoId = cuartoId;
  checklistFotoActual.itemId = Number(itemId);
  checklistFotoActual.itemNombre = itemNombre;

  abrirInputFotoChecklist();
}

/**
 * Abre el input file para captura de foto (compartido entre todas las funciones de captura)
 */
function abrirInputFotoChecklist() {
  // Crear input file invisible
  let inputFile = document.getElementById('checklistFotoInput');
  if (!inputFile) {
    inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.id = 'checklistFotoInput';
    inputFile.accept = 'image/*';
    inputFile.capture = 'environment'; // Cámara trasera en móvil
    inputFile.style.display = 'none';
    inputFile.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        checklistFotoActual.file = file;
        mostrarFotoPreview(file);
      }
    };
    document.body.appendChild(inputFile);
  }

  // Limpiar y abrir
  inputFile.value = '';
  inputFile.click();
}

/**
 * Crea y muestra el modal de preview de foto
 */
async function mostrarFotoPreview(file) {
  // Crear modal si no existe
  let modal = document.getElementById('modalFotoPreview');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalFotoPreview';
    modal.className = 'modal-detalles checklist-foto-preview-modal';
    document.body.appendChild(modal);
  }

  // Obtener items del catálogo para el selector (desde API)
  const catalogItems = await obtenerChecklistCatalogItems();
  const preselectedItemId = checklistFotoActual.itemId;

  const itemsOptions = catalogItems
    .map((item) => {
      const isSelected = Number(item.id) === Number(preselectedItemId);
      return `<option value="${item.id}" ${isSelected ? 'selected' : ''}>${item.nombre}</option>`;
    })
    .join('');

  console.log(
    `📷 Items en selector: ${catalogItems.length}, preseleccionado: ${preselectedItemId}`
  );

  const usuarioNombre =
    AppState.currentUser?.nombre || AppState.currentUser?.name || 'Usuario';
  const usuarioNombreSafe = (usuarioNombre || '').replace(/'/g, "\\'");
  const fechaIso = new Date().toISOString();
  const fechaHora = new Date().toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Crear URL temporal para preview
  const previewUrl = URL.createObjectURL(file);

  modal.innerHTML = `
        <div class="modal-detalles-overlay" onclick="cerrarModalFotoPreview()"></div>
        <div class="modal-detalles-contenido checklist-foto-preview-content">
            <div class="modal-detalles-header">
                <div class="checklist-foto-header-info">
                    <h3><i class="fas fa-camera"></i> Registrar Foto de Inspección</h3>
                    <span class="checklist-foto-timestamp">
                        <i class="fas fa-user"></i> ${usuarioNombre} · 
                        <i class="fas fa-clock"></i> ${fechaHora}
                    </span>
                </div>
                <button class="modal-detalles-cerrar" onclick="cerrarModalFotoPreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-detalles-body checklist-foto-preview-body">
                <div class="checklist-foto-preview-image-container is-clickable" onclick="mostrarFotoCompletaChecklist(null, '${previewUrl}', 'Foto de Inspección', '', '${usuarioNombreSafe}', '${fechaIso}')">
                    <img src="${previewUrl}" alt="Preview de foto" class="checklist-foto-preview-img">
                </div>
                <div class="checklist-foto-form">
                    <div class="checklist-foto-form-group">
                        <label for="fotoItemSelect"><i class="fas fa-link"></i> Vincular a ítem</label>
                        <select id="fotoItemSelect" class="checklist-foto-select">
                            <option value="">Sin vincular (foto general)</option>
                            ${itemsOptions}
                        </select>
                    </div>
                    <div class="checklist-foto-form-group">
                        <label for="fotoNotas"><i class="fas fa-sticky-note"></i> Notas / Observaciones</label>
                        <textarea id="fotoNotas" class="checklist-foto-textarea" placeholder="Describe lo que se observa en la foto..." rows="3"></textarea>
                    </div>
                </div>
            </div>
            <div class="checklist-foto-preview-footer">
                <button class="checklist-foto-btn-cancelar" onclick="cerrarModalFotoPreview()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="checklist-foto-btn-guardar" onclick="guardarFotoChecklist()">
                    <i class="fas fa-cloud-upload-alt"></i> Guardar Foto
                </button>
            </div>
        </div>
    `;

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  // Limpiar URL cuando se cierre
  modal.dataset.previewUrl = previewUrl;

  // Cerrar con ESC
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      cerrarModalFotoPreview();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

/**
 * Guarda la foto en el servidor
 */
async function guardarFotoChecklist() {
  if (!checklistFotoActual.file || !checklistFotoActual.cuartoId) {
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('❌ No hay foto para guardar', 'error');
    return;
  }

  const itemId = document.getElementById('fotoItemSelect')?.value || null;
  const notas = document.getElementById('fotoNotas')?.value || null;

  const btnGuardar = document.querySelector('.checklist-foto-btn-guardar');
  const textoOriginal = btnGuardar?.innerHTML;
  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
  }

  try {
    console.log(
      `📤 Subiendo foto para cuarto ${checklistFotoActual.cuartoId}...`
    );

    const resultado = await ChecklistAPI.uploadFoto(
      checklistFotoActual.cuartoId,
      checklistFotoActual.file,
      itemId ? parseInt(itemId) : null,
      notas
    );

    console.log('✅ Foto subida:', resultado);

    // Actualizar contador en la UI
    const cuartoId = checklistFotoActual.cuartoId;
    const counter = document.querySelector(
      `.checklist-foto-counter[data-cuarto-id="${cuartoId}"] .foto-count`
    );
    if (counter) {
      const currentCount = parseInt(counter.textContent) || 0;
      counter.textContent = currentCount + 1;
      console.log(
        `📸 Contador actualizado: ${currentCount} -> ${currentCount + 1}`
      );
    }

    // Actualizar fotos_count en AppState para que el filtro funcione
    const habitacionFiltrada = AppState.checklistFiltradas?.find(
      (h) => h.cuarto_id === cuartoId || h.id === cuartoId
    );
    if (habitacionFiltrada) {
      habitacionFiltrada.fotos_count =
        (habitacionFiltrada.fotos_count || 0) + 1;
    }

    const habitacionCompleta = AppState.checklistDataCompleto?.find(
      (h) => h.cuarto_id === cuartoId || h.id === cuartoId
    );
    if (habitacionCompleta) {
      habitacionCompleta.fotos_count =
        (habitacionCompleta.fotos_count || 0) + 1;
    }

    // Re-aplicar filtros para que el filtro de imágenes funcione automáticamente
    if (AppState.checklistFilters.imagenes) {
      applyChecklistFilters();
    }

    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('✅ Foto guardada correctamente', 'success');

    cerrarModalFotoPreview();

    // Limpiar estado
    checklistFotoActual = {
      file: null,
      cuartoId: null,
      itemId: null,
      itemNombre: null,
    };
  } catch (error) {
    console.error('❌ Error subiendo foto:', error);
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur(
        '❌ Error al guardar foto: ' + error.message,
        'error'
      );
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = textoOriginal;
    }
  }
}

/**
 * Cierra el modal de preview de foto
 */
function cerrarModalFotoPreview() {
  const modal = document.getElementById('modalFotoPreview');
  if (modal) {
    // Limpiar URL temporal
    if (modal.dataset.previewUrl) {
      URL.revokeObjectURL(modal.dataset.previewUrl);
    }
    modal.style.display = 'none';
  }
  document.body.classList.remove('modal-open');
}

/**
 * Carga las fotos de un cuarto y las muestra en el carrusel
 */
async function cargarFotosChecklist(cuartoId) {
  const carousel = document.getElementById('checklistFotosCarousel');
  if (!carousel) return;

  try {
    console.log(`📷 Cargando fotos del cuarto ${cuartoId}...`);

    if (typeof ChecklistAPI === 'undefined') {
      carousel.innerHTML =
        '<div class="checklist-fotos-empty"><i class="fas fa-camera-retro"></i>API no disponible</div>';
      return;
    }

    const fotos = await ChecklistAPI.getFotosByCuarto(cuartoId);
    console.log(`📷 ${fotos.length} fotos encontradas`);

    if (fotos.length === 0) {
      carousel.innerHTML =
        '<div class="checklist-fotos-empty"><i class="fas fa-camera-retro"></i>No hay fotos de inspección</div>';
      return;
    }

    // Renderizar fotos usando data attributes para evitar problemas con caracteres especiales
    carousel.innerHTML = fotos
      .map((foto) => {
        const itemLabel = foto.item_nombre || 'General';
        return `
                <div class="checklist-foto-thumb">
                    <button class="checklist-foto-delete-btn" onclick="event.stopPropagation(); eliminarFotoChecklist(${foto.id}, ${foto.cuarto_id})" title="Eliminar foto">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="checklist-foto-thumb-clickable" 
                         data-foto-id="${foto.id || ''}"
                         data-foto-url="${foto.foto_url || ''}"
                         data-item-nombre="${(foto.item_nombre || '').replace(/"/g, '&quot;')}"
                         data-notas="${(foto.notas || '').replace(/"/g, '&quot;').replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ')}"
                         data-usuario-nombre="${(foto.usuario_nombre || 'Usuario').replace(/"/g, '&quot;')}"
                         data-fecha="${foto.created_at || ''}"
                         style="cursor: pointer;">
                        <img src="${foto.foto_url}" alt="Foto de ${itemLabel}" loading="lazy">
                        <div class="checklist-foto-thumb-overlay">${itemLabel}</div>
                    </div>
                </div>
            `;
      })
      .join('');

    // Agregar event listeners delegados para evitar problemas con caracteres especiales
    const clickableElements = carousel.querySelectorAll(
      '.checklist-foto-thumb-clickable'
    );
    clickableElements.forEach((element) => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const fotoId = element.dataset.fotoId || null;
        const fotoUrl = element.dataset.fotoUrl || '';
        const itemNombre = element.dataset.itemNombre || 'Foto de Inspección';
        const notas = element.dataset.notas || '';
        const usuarioNombre = element.dataset.usuarioNombre || 'Usuario';
        const fecha = element.dataset.fecha || '';

        mostrarFotoCompletaChecklist(
          fotoId,
          fotoUrl,
          itemNombre,
          notas,
          usuarioNombre,
          fecha
        );
      });
    });
  } catch (error) {
    console.error('❌ Error cargando fotos:', error);
    carousel.innerHTML =
      '<div class="checklist-fotos-empty"><i class="fas fa-exclamation-triangle"></i>Error al cargar fotos</div>';
  }
}

/**
 * Carga los contadores de fotos para todas las tarjetas de checklist visibles
 * También actualiza fotos_count en AppState para que el filtro funcione
 */
async function cargarContadoresFotos() {
  const counters = document.querySelectorAll('.checklist-foto-counter');

  for (const counter of counters) {
    const cuartoId = counter.dataset.cuartoId;
    if (!cuartoId) continue;

    try {
      const fotos = await ChecklistAPI.getFotosByCuarto(cuartoId);
      const countSpan = counter.querySelector('.foto-count');
      if (countSpan) {
        countSpan.textContent = fotos.length;
      }

      // Actualizar fotos_count en AppState (en ambos arrays)
      const habitacionFiltrada = AppState.checklistFiltradas?.find(
        (h) => h.cuarto_id === parseInt(cuartoId) || h.id === parseInt(cuartoId)
      );
      if (habitacionFiltrada) {
        habitacionFiltrada.fotos_count = fotos.length;
      }

      const habitacionCompleta = AppState.checklistDataCompleto?.find(
        (h) => h.cuarto_id === parseInt(cuartoId) || h.id === parseInt(cuartoId)
      );
      if (habitacionCompleta) {
        habitacionCompleta.fotos_count = fotos.length;
      }
    } catch (error) {
      console.warn(`⚠️ Error cargando foto count para cuarto ${cuartoId}`);
    }
  }
}

/**
 * Muestra una foto en pantalla completa con todos sus detalles
 */
function mostrarFotoCompletaChecklist(
  fotoId,
  fotoUrl,
  itemNombre,
  notas,
  usuarioNombre,
  fecha
) {
  // Crear modal si no existe
  let modal = document.getElementById('modalFotoCompleta');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalFotoCompleta';
    modal.className = 'modal-detalles checklist-foto-completa-modal';
    document.body.appendChild(modal);
  }

  const fechaFormateada = fecha
    ? new Date(fecha).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    : 'Sin fecha';

  modal.innerHTML = `
        <div class="modal-detalles-overlay" onclick="cerrarModalFotoCompleta()"></div>
        <div class="modal-detalles-contenido checklist-foto-preview-content">
            <div class="modal-detalles-header">
                <div class="checklist-foto-header-info">
                    <h3><i class="fas fa-image"></i> ${itemNombre || 'Foto de Inspección'}</h3>
                    <span class="checklist-foto-timestamp">
                        <i class="fas fa-user"></i> ${usuarioNombre} · 
                        <i class="fas fa-clock"></i> ${fechaFormateada}
                    </span>
                </div>
                <button class="modal-detalles-cerrar" onclick="cerrarModalFotoCompleta()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-detalles-body checklist-foto-preview-body">
                <div class="checklist-foto-preview-image-container" style="max-height: 55vh;">
                    <img src="${fotoUrl}" alt="Foto completa" class="checklist-foto-preview-img">
                </div>
                ${notas
      ? `
                <div class="checklist-foto-form">
                    <div class="checklist-foto-form-group">
                        <label><i class="fas fa-sticky-note"></i> Notas / Observaciones</label>
                        <p style="margin: 0; padding: 0.75rem; background: var(--gris-claro); border-radius: var(--radio-pequeno); font-size: 0.95rem; white-space: pre-wrap;">${notas.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')}</p>
                    </div>
                </div>
                `
      : ''
    }
            </div>
            <div class="checklist-foto-preview-footer">
                <button class="checklist-foto-btn-cancelar" onclick="cerrarModalFotoCompleta()">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
            </div>
        </div>
    `;

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  // Cerrar con ESC (removiendo listener previo si existe)
  if (window.fotoCompletaEscHandler) {
    document.removeEventListener(
      'keydown',
      window.fotoCompletaEscHandler,
      true
    );
  }
  window.fotoCompletaEscHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      cerrarModalFotoCompleta();
    }
  };
  // Usar capture: true para interceptar antes que otros handlers
  document.addEventListener('keydown', window.fotoCompletaEscHandler, true);
}

/**
 * Cierra el modal de foto completa
 */
function cerrarModalFotoCompleta() {
  const modal = document.getElementById('modalFotoCompleta');
  if (modal) {
    modal.style.display = 'none';
  }
  // Remover listener de ESC (con capture:true para que coincida)
  if (window.fotoCompletaEscHandler) {
    document.removeEventListener(
      'keydown',
      window.fotoCompletaEscHandler,
      true
    );
    window.fotoCompletaEscHandler = null;
  }
  // No quitar modal-open porque el modal de detalles sigue abierto
}

/**
 * Elimina una foto de checklist con confirmación
 */
async function eliminarFotoChecklist(fotoId, cuartoId) {
  if (
    !electronSafeConfirm(
      '¿Eliminar esta foto? Esta acción no se puede deshacer.'
    )
  ) {
    return;
  }

  try {
    console.log(`🗑️ Eliminando foto ${fotoId}...`);

    await ChecklistAPI.deleteFoto(fotoId);

    console.log('✅ Foto eliminada');
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('✅ Foto eliminada', 'success');

    // Actualizar contador en la UI (decrementar)
    const counter = document.querySelector(
      `.checklist-foto-counter[data-cuarto-id="${cuartoId}"] .foto-count`
    );
    if (counter) {
      const currentCount = parseInt(counter.textContent) || 0;
      const newCount = Math.max(0, currentCount - 1);
      counter.textContent = newCount;
      console.log(`📸 Contador actualizado: ${currentCount} -> ${newCount}`);
    }

    // Actualizar fotos_count en AppState
    const habitacionFiltrada = AppState.checklistFiltradas?.find(
      (h) => h.cuarto_id === parseInt(cuartoId) || h.id === parseInt(cuartoId)
    );
    if (habitacionFiltrada) {
      habitacionFiltrada.fotos_count = Math.max(
        0,
        (habitacionFiltrada.fotos_count || 1) - 1
      );
    }

    const habitacionCompleta = AppState.checklistDataCompleto?.find(
      (h) => h.cuarto_id === parseInt(cuartoId) || h.id === parseInt(cuartoId)
    );
    if (habitacionCompleta) {
      habitacionCompleta.fotos_count = Math.max(
        0,
        (habitacionCompleta.fotos_count || 1) - 1
      );
    }

    // Re-aplicar filtros si hay filtro de imágenes activo
    if (AppState.checklistFilters.imagenes) {
      applyChecklistFilters();
    }

    // Recargar el carrusel
    cargarFotosChecklist(cuartoId);
  } catch (error) {
    console.error('❌ Error eliminando foto:', error);
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('❌ Error al eliminar foto', 'error');
  }
}

// Hacer funciones globales para uso en HTML
window.toggleServicioRealizado = toggleServicioRealizado;
window.updateChecklistEstado = updateChecklistEstado;
window.exportarChecklistExcel = exportarChecklistExcel;
window.exportarChecklistFiltrado = exportarChecklistFiltrado;
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
window.abrirCapturaFotoItem = abrirCapturaFotoItem;
window.abrirCapturaFotoGeneral = abrirCapturaFotoGeneral;
window.mostrarFotoPreview = mostrarFotoPreview;
window.guardarFotoChecklist = guardarFotoChecklist;
window.cerrarModalFotoPreview = cerrarModalFotoPreview;
window.cargarFotosChecklist = cargarFotosChecklist;
window.mostrarFotoCompletaChecklist = mostrarFotoCompletaChecklist;
window.cerrarModalFotoCompleta = cerrarModalFotoCompleta;
window.eliminarFotoChecklist = eliminarFotoChecklist;

console.log('✅ App.js cargado completamente');
