// ========================================
// LOGIN.JS - Sistema de Autenticación
// ======================================== 

// Detectar tema guardado
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    updateThemeIcon(savedTheme);
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
themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Inicializar sistema de autenticación
function initializeAuth() {
    // Verificar si ya hay sesión activa
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.token) {
        // Redirigir al dashboard según el rol
        redirectToDashboard(currentUser.role);
    }
    
    // Crear usuarios por defecto si no existen
    if (!localStorage.getItem('users')) {
        const defaultUsers = [
            {
                id: 1,
                name: 'Administrador',
                email: 'admin@jwmarriott.com',
                password: 'admin123', // En producción usar hash
                role: 'admin',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Supervisor',
                email: 'supervisor@jwmarriott.com',
                password: 'super123',
                role: 'supervisor',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: 'Técnico',
                email: 'tecnico@jwmarriott.com',
                password: 'tecnico123',
                role: 'tecnico',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
    }
}

// Manejo del formulario de login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showMessage('Por favor, complete todos los campos', 'error');
        return;
    }
    
    // Validar credenciales
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Crear sesión
        const sessionData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(),
            loginTime: new Date().toISOString(),
            rememberMe: rememberMe
        };
        
        localStorage.setItem('currentUser', JSON.stringify(sessionData));
        
        showMessage('Inicio de sesión exitoso. Redirigiendo...', 'success');
        
        setTimeout(() => {
            redirectToDashboard(user.role);
        }, 1000);
        
    } else {
        showMessage('Credenciales incorrectas. Intente nuevamente.', 'error');
    }
});

// Manejo del formulario de registro
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const role = document.getElementById('registerRole').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Validaciones
    if (!name || !email || !role || !password || !confirmPassword) {
        showMessage('Por favor, complete todos los campos', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Formato de correo electrónico inválido', 'error');
        return;
    }
    
    // Verificar si el email ya existe
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.find(u => u.email === email)) {
        showMessage('Este correo electrónico ya está registrado', 'error');
        return;
    }
    
    // Crear nuevo usuario
    const newUser = {
        id: users.length + 1,
        name: name,
        email: email,
        password: password, // En producción usar hash
        role: role,
        createdAt: new Date().toISOString(),
        active: true
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    showMessage('Registro exitoso. Ahora puede iniciar sesión.', 'success');
    
    // Cambiar al formulario de login después de 2 segundos
    setTimeout(() => {
        toggleButtons[0].click();
        document.getElementById('loginEmail').value = email;
        registerForm.reset();
    }, 2000);
});

// Funciones auxiliares
function showMessage(text, type) {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = text;
    messageDiv.className = `auth-message ${type}`;
    
    if (type === 'error') {
        // Auto-ocultar errores después de 5 segundos
        setTimeout(() => hideMessage(), 5000);
    }
}

function hideMessage() {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.className = 'auth-message';
    messageDiv.textContent = '';
}

function generateToken() {
    return 'token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function redirectToDashboard(role) {
    // Redirigir según el rol
    switch (role) {
        case 'admin':
            window.location.href = 'index.html?view=admin';
            break;
        case 'supervisor':
            window.location.href = 'index.html?view=supervisor';
            break;
        case 'tecnico':
            window.location.href = 'index.html?view=tecnico';
            break;
        default:
            window.location.href = 'index.html';
    }
}

// Manejar "Olvidé mi contraseña"
document.querySelector('.forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    showMessage('Contacte al administrador para recuperar su contraseña: admin@jwmarriott.com', 'success');
});

