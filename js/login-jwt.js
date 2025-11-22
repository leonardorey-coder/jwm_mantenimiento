// ========================================
// LOGIN.JS - Sistema de Autenticación JWT
// ======================================== 

// Configuración de la API
const API_BASE_URL = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('vercel.com') ? '' : 
                     window.location.port === '3000' ? '' : 'http://localhost:3001';

// Detectar tema guardado
document.addEventListener('DOMContentLoaded', () => {
    // Solo ejecutar en login.html
    if (!window.location.pathname.includes('login.html')) {
        console.log('🔵 [LOGIN-JWT] No estamos en login.html, saltando inicialización');
        return;
    }
    
    console.log('🔵 [LOGIN-JWT] DOMContentLoaded en login.html');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    updateThemeIcon(savedTheme);
    setupForcePasswordModal();
    initializeAuth();
});

// Toggle entre Login y Registro
const toggleButtons = document.querySelectorAll('.toggle-button');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        const mode = button.getAttribute('data-mode');
        
        // Actualizar botones activos
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Mostrar formulario correspondiente
        if (mode === 'login') {
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        } else {
            registerForm.classList.add('active');
            loginForm.classList.remove('active');
        }
        
        // Limpiar mensajes
        hideMessage();
    });
});

// Toggle de visibilidad de contraseña
const togglePasswordButtons = document.querySelectorAll('.toggle-password');
togglePasswordButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// Toggle de tema
const themeToggleBtn = document.getElementById('themeToggleLogin');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const themeBtn = document.getElementById('themeToggleLogin');
    if (!themeBtn) return;
    
    const icon = themeBtn.querySelector('i');
    if (!icon) return;
    
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Inicializar sistema de autenticación
async function initializeAuth() {
    console.log('🔵 [LOGIN-JWT] initializeAuth() - Iniciando verificación de autenticación');
    // Verificar si hay token JWT válido (en localStorage o sessionStorage)
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
    
    console.log('🔵 [LOGIN-JWT] Tokens encontrados:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        hasCurrentUser: !!currentUser,
        userRole: currentUser?.rol 
    });
    
    if (accessToken && currentUser) {
        // Verificar si el token está expirado
        const tokenExpiration = localStorage.getItem('tokenExpiration') || sessionStorage.getItem('tokenExpiration');
        console.log('🔵 [LOGIN-JWT] Token expiration:', tokenExpiration);
        if (tokenExpiration && new Date(tokenExpiration) > new Date()) {
            if (currentUser?.requiere_cambio_password) {
                console.log('🟡 [LOGIN-JWT] El usuario debe cambiar su contraseña antes de continuar');
                showForcePasswordModal(currentUser);
                showMessage('Debes actualizar tu contraseña antes de acceder al panel.', 'info');
                return;
            }
            // Token válido, redirigir al dashboard
            console.log('🔵 [LOGIN-JWT] Token válido, redirigiendo al dashboard...');
            redirectToDashboard(currentUser.rol);
        } else if (refreshToken) {
            // Token expirado, intentar refrescar
            console.log('🔵 [LOGIN-JWT] Token expirado, intentando refrescar...');
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                const refreshedUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
                if (refreshedUser?.requiere_cambio_password) {
                    console.log('🟡 [LOGIN-JWT] Usuario refrescado pero requiere cambio de contraseña. Mostrando modal');
                    showForcePasswordModal(refreshedUser);
                    showMessage('Debes actualizar tu contraseña antes de acceder al panel.', 'info');
                    return;
                }
                if (refreshedUser?.rol) {
                    redirectToDashboard(refreshedUser.rol);
                }
            }
        }
    } else {
        console.log('🔵 [LOGIN-JWT] No hay sesión activa, mostrando formulario de login');
    }
}

// Manejar envío del formulario de login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🟢 [LOGIN-JWT] Formulario de login enviado');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    console.log('🟢 [LOGIN-JWT] Datos de login:', { email, rememberMe });
    
    if (!email || !password) {
        console.log('🔴 [LOGIN-JWT] Campos vacíos');
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }
    
    // Mostrar loading
    const submitBtn = loginForm.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
    submitBtn.disabled = true;
    
    try {
        console.log('🟢 [LOGIN-JWT] Enviando petición de login a:', `${API_BASE_URL}/api/auth/login`);
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('🟢 [LOGIN-JWT] Respuesta recibida, status:', response.status);
        const data = await response.json();
        console.log('🟢 [LOGIN-JWT] Data recibida:', { 
            success: data.success, 
            usuario: data.usuario ? { 
                nombre: data.usuario.nombre, 
                email: data.usuario.email, 
                rol: data.usuario.rol 
            } : null,
            hasSesionId: !!data.sesion_id
        });
        
        if (!response.ok) {
            throw new Error(data.mensaje || data.error || 'Error al iniciar sesión');
        }
        
        if (data.success) {
            console.log('🟢 [LOGIN-JWT] Login exitoso, guardando datos...');
            
            // Guardar en IndexedDB si está disponible
            if (window.storageHelper) {
                try {
                    await window.storageHelper.saveAuthTokens({
                        accessToken: data.tokens.accessToken,
                        refreshToken: data.tokens.refreshToken,
                        tokenType: data.tokens.tokenType,
                        expiresIn: data.tokens.expiresIn,
                        sesionId: data.sesion_id
                    }, rememberMe);
                    console.log('✅ [LOGIN-JWT] Tokens guardados en IndexedDB');
                } catch (idbError) {
                    console.warn('⚠️ Error guardando tokens en IndexedDB:', idbError);
                }
            }
            
            // Guardar tokens también en localStorage/sessionStorage como fallback
            if (rememberMe) {
                localStorage.setItem('accessToken', data.tokens.accessToken);
                localStorage.setItem('refreshToken', data.tokens.refreshToken);
                localStorage.setItem('tokenExpiration', data.tokens.expiresIn);
                localStorage.setItem('tokenType', data.tokens.tokenType);
                localStorage.setItem('sesionId', data.sesion_id);
            } else {
                sessionStorage.setItem('accessToken', data.tokens.accessToken);
                sessionStorage.setItem('refreshToken', data.tokens.refreshToken);
                sessionStorage.setItem('tokenExpiration', data.tokens.expiresIn);
                sessionStorage.setItem('tokenType', data.tokens.tokenType);
                sessionStorage.setItem('sesionId', data.sesion_id);
            }
            
            console.log('🟢 [LOGIN-JWT] Tokens guardados:', {
                hasAccessToken: !!data.tokens.accessToken,
                hasRefreshToken: !!data.tokens.refreshToken,
                expiresIn: data.tokens.expiresIn,
                sesionId: data.sesion_id
            });
            
            // Guardar información del usuario
            const requiereCambioPassword = !!data.usuario.requiere_cambio_password;

            const userData = {
                id: data.usuario.id,
                nombre: data.usuario.nombre,
                email: data.usuario.email,
                numero_empleado: data.usuario.numero_empleado,
                departamento: data.usuario.departamento,
                telefono: data.usuario.telefono,
                rol: data.usuario.rol,
                permisos: data.usuario.permisos,
                requiere_cambio_password: requiereCambioPassword
            };
            
            // Guardar usuario en IndexedDB
            if (window.storageHelper) {
                try {
                    await window.storageHelper.saveCurrentUser(userData, rememberMe);
                    console.log('✅ [LOGIN-JWT] Usuario guardado en IndexedDB');
                } catch (idbError) {
                    console.warn('⚠️ Error guardando usuario en IndexedDB:', idbError);
                }
            }
            
            // Fallback a localStorage/sessionStorage
            if (rememberMe) {
                localStorage.setItem('currentUser', JSON.stringify(userData));
            } else {
                sessionStorage.setItem('currentUser', JSON.stringify(userData));
            }
            console.log('🟢 [LOGIN-JWT] Usuario guardado:', { id: userData.id, nombre: userData.nombre, rol: userData.rol });
            
            if (requiereCambioPassword) {
                console.log('🟡 [LOGIN-JWT] Usuario debe cambiar su contraseña inmediatamente');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                showMessage('Debes actualizar tu contraseña antes de continuar.', 'info');
                showForcePasswordModal(userData);
                return;
            }

            // Mostrar mensaje de éxito
            showMessage(`¡Bienvenido, ${data.usuario.nombre}!`, 'success');
            
            // Redirigir después de 1 segundo
            console.log('🟢 [LOGIN-JWT] Redirigiendo al dashboard en 1 segundo...');
            setTimeout(() => {
                redirectToDashboard(data.usuario.rol);
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        showMessage(error.message, 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Refrescar access token usando refresh token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    
    if (!refreshToken) {
        clearAuthData();
        return false;
    }
    
    try {
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
            return true;
        }
        
    } catch (error) {
        console.error('Error al refrescar token:', error);
        clearAuthData();
        return false;
    }
}

// Limpiar datos de autenticación
function clearAuthData() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiration');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('sesionId');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('tokenExpiration');
    sessionStorage.removeItem('tokenType');
    sessionStorage.removeItem('sesionId');
    sessionStorage.removeItem('currentUser');
}

// Redirigir al dashboard según el rol
function redirectToDashboard(role) {
    console.log('🟢 [LOGIN-JWT] redirectToDashboard() llamado con rol:', role);
    // Por ahora todos van al mismo dashboard
    console.log('🟢 [LOGIN-JWT] Redirigiendo a index.html...');
    window.location.href = 'index.html';
}

// Mostrar mensajes
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = text;
    messageDiv.className = `auth-message ${type} show`;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        hideMessage();
    }, 5000);
}

function hideMessage() {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.classList.remove('show');
}

// Link de "Olvidé mi contraseña"
document.querySelector('.forgot-password').addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/contacto-admin`);
        const data = await response.json();
        
        if (data.success && data.administrador) {
            showMessage(
                `Para recuperar tu contraseña, contacta a ${data.administrador.nombre} al correo ${data.administrador.email} o teléfono ${data.administrador.telefono}`,
                'info'
            );
        }
    } catch (error) {
        showMessage('Para recuperar tu contraseña, contacta al administrador: fcruz@grupodiestra.com', 'info');
    }
});

// Prevenir envío del formulario de registro (ya que está deshabilitado)
registerForm?.addEventListener?.('submit', (e) => {
    e.preventDefault();
    showMessage('El registro está deshabilitado. Contacta al administrador.', 'info');
});

function setupForcePasswordModal() {
    const form = document.getElementById('forcePasswordForm');
    if (form) {
        form.addEventListener('submit', handleForcePasswordSubmit);
    }
}

function showForcePasswordModal(usuario) {
    const modal = document.getElementById('forcePasswordModal');
    if (!modal) return;
    const label = document.getElementById('forcePasswordUser');
    if (label) {
        label.textContent = usuario?.nombre || usuario?.email || 'tu cuenta';
    }
    setForcePasswordFeedback('Ingresa una contraseña nueva para continuar.', 'info');
    modal.classList.add('show');
    document.getElementById('forceCurrentPassword')?.focus();
}

function hideForcePasswordModal() {
    const modal = document.getElementById('forcePasswordModal');
    if (!modal) return;
    modal.classList.remove('show');
    ['forceCurrentPassword', 'forceNewPassword', 'forceConfirmPassword'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    const feedback = document.getElementById('forcePasswordFeedback');
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'force-password-feedback';
    }
}

function setForcePasswordFeedback(message, type = 'error') {
    const feedback = document.getElementById('forcePasswordFeedback');
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.className = 'force-password-feedback show';
    if (type === 'error') {
        feedback.classList.add('error');
    } else if (type === 'success') {
        feedback.classList.add('success');
    }
}

async function handleForcePasswordSubmit(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('.btn-submit');
    const originalText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    const passwordActual = document.getElementById('forceCurrentPassword')?.value.trim();
    const nuevoPassword = document.getElementById('forceNewPassword')?.value.trim();
    const confirmarPassword = document.getElementById('forceConfirmPassword')?.value.trim();

    if (!passwordActual || !nuevoPassword || !confirmarPassword) {
        setForcePasswordFeedback('Completa todos los campos para continuar.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
        return;
    }

    if (nuevoPassword.length < 8) {
        setForcePasswordFeedback('La nueva contraseña debe tener al menos 8 caracteres.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
        return;
    }

    if (nuevoPassword !== confirmarPassword) {
        setForcePasswordFeedback('La confirmación debe coincidir con la nueva contraseña.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/auth/cambiar-password-obligatorio`, {
            method: 'POST',
            body: JSON.stringify({ passwordActual, nuevoPassword, confirmarPassword })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensaje || data.error || 'No se pudo actualizar la contraseña');
        }

        setForcePasswordFeedback('Contraseña actualizada correctamente. Redirigiendo...', 'success');
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}');
        storedUser.requiere_cambio_password = false;
        const isRemembered = localStorage.getItem('currentUser') !== null;
        if (isRemembered) {
            localStorage.setItem('currentUser', JSON.stringify(storedUser));
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(storedUser));
        }

        setTimeout(() => {
            hideForcePasswordModal();
            showMessage('Contraseña actualizada. Bienvenido nuevamente.', 'success');
            redirectToDashboard(storedUser.rol || storedUser.role);
        }, 1200);
    } catch (error) {
        console.error('Error al cambiar contraseña obligatoria:', error);
        setForcePasswordFeedback(error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// Función auxiliar para hacer requests autenticados
async function fetchWithAuth(url, options = {}) {
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') || sessionStorage.getItem('tokenType') || 'Bearer';
    
    if (!accessToken) {
        throw new Error('No hay sesión activa');
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `${tokenType} ${accessToken}`,
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // Si el token expiró, intentar refrescar
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Reintentar la petición con el nuevo token
            const newAccessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
            headers['Authorization'] = `${tokenType} ${newAccessToken}`;
            return await fetch(url, { ...options, headers });
        }
    }
    
    return response;
}

// Exportar función para uso en otras páginas (solo en login.html)
// fetchWithAuth ya está definido en app.js para uso en index.html
