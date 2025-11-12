// ========================================
// APP.JS - Sistema Principal JW Marriott
// ========================================

// Estado global de la aplicación
const AppState = {
    currentUser: null,
    theme: 'light',
    currentTab: 'habitaciones',
    edificios: [],
    cuartos: [],
    mantenimientos: [],
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
    
    // Buscadores
    setupSearchListeners();
    
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

function loadSabanaData() {
    console.log('📋 Cargando datos de sábana...');
    
    const tbody = document.getElementById('sabanaTableBody');
    if (!tbody) return;
    
    // Generar datos de ejemplo completos
    const sabanaData = AppState.cuartos.slice(0, 30).map((cuarto, index) => {
        const estados = ['bueno', 'revisar', 'cambiar'];
        const randomEstado = estados[Math.floor(Math.random() * estados.length)];
        const fechaRevision = new Date(2025, 0, 1 + index);
        const fechaProxima = new Date(2025, 5, 1 + index); // 6 meses después
        const responsables = ['Juan Pérez', 'María López', 'Carlos Ruiz', 'Ana García'];
        
        return {
            habitacion: cuarto.numero,
            edificio: cuarto.edificio_nombre,
            tipoFiltro: Math.random() > 0.5 ? 'HEPA Premium' : 'HEPA Standard',
            ultimaRevision: fechaRevision.toLocaleDateString('es-MX'),
            estado: randomEstado,
            proximoCambio: fechaProxima.toLocaleDateString('es-MX'),
            responsable: responsables[Math.floor(Math.random() * responsables.length)],
            cambioRealizado: false
        };
    });
    
    // Guardar en localStorage si no existe
    if (!localStorage.getItem('sabanaData')) {
        localStorage.setItem('sabanaData', JSON.stringify(sabanaData));
    } else {
        const savedData = JSON.parse(localStorage.getItem('sabanaData'));
        renderSabanaTable(savedData);
        return;
    }
    
    renderSabanaTable(sabanaData);
}

function renderSabanaTable(data) {
    const tbody = document.getElementById('sabanaTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Determinar clase de estado
        let estadoClase = 'bueno';
        let estadoTexto = 'Bueno';
        
        if (row.estado === 'revisar') {
            estadoClase = 'revisar';
            estadoTexto = 'Revisar';
        } else if (row.estado === 'cambiar') {
            estadoClase = 'cambiar';
            estadoTexto = 'Cambiar';
        }
        
        tr.innerHTML = `
            <td data-label="Habitación">${row.habitacion}</td>
            <td data-label="Última Revisión">${row.ultimaRevision}</td>
            <td data-label="Tipo de Filtro">${row.tipoFiltro}</td>
            <td data-label="Estado">
                <span class="filtro-estado ${estadoClase}">
                    ${estadoTexto}
                </span>
            </td>
            <td data-label="Próximo Cambio">${row.proximoCambio}</td>
            <td data-label="Responsable">${row.responsable}</td>
            <td data-label="Realizado">
                <input 
                    type="checkbox" 
                    class="checkbox-sabana" 
                    ${row.cambioRealizado ? 'checked' : ''}
                    onchange="toggleCambioRealizado(${index})"
                >
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleCambioRealizado(index) {
    const sabanaData = JSON.parse(localStorage.getItem('sabanaData'));
    sabanaData[index].cambioRealizado = !sabanaData[index].cambioRealizado;
    localStorage.setItem('sabanaData', JSON.stringify(sabanaData));
    
    console.log(`✅ Cambio ${sabanaData[index].cambioRealizado ? 'marcado' : 'desmarcado'} para habitación ${sabanaData[index].habitacion}`);
}

function filterSabana(searchTerm) {
    const allData = JSON.parse(localStorage.getItem('sabanaData'));
    const filtered = allData.filter(row => 
        row.habitacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.edificio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.responsable.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderSabanaTable(filtered);
}

function exportarSabanaExcel() {
    if (AppState.currentUser.role !== 'admin') {
        alert('Solo los administradores pueden exportar datos');
        return;
    }
    
    // Mostrar spinner
    document.getElementById('downloadSpinner').style.display = 'flex';
    
    setTimeout(() => {
        const sabanaData = JSON.parse(localStorage.getItem('sabanaData'));
        
        // Crear CSV completo con todos los campos
        let csv = 'Habitación,Última Revisión,Tipo de Filtro,Estado,Próximo Cambio,Responsable,Cambio Realizado\n';
        sabanaData.forEach(row => {
            const estadoTexto = row.estado === 'bueno' ? 'Bueno' : (row.estado === 'revisar' ? 'Revisar' : 'Cambiar');
            csv += `${row.habitacion},${row.ultimaRevision},${row.tipoFiltro},${estadoTexto},${row.proximoCambio},${row.responsable},${row.cambioRealizado ? 'Sí' : 'No'}\n`;
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

function loadUsuariosData() {
    console.log('👥 Cargando datos de usuarios...');
    
    const grid = document.getElementById('usuariosGrid');
    if (!grid) return;
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    renderUsuariosGrid(users);
}

function renderUsuariosGrid(users) {
    const grid = document.getElementById('usuariosGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'usuario-card';
        
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const roleColors = {
            admin: '#A15C5C',
            supervisor: '#FFB500',
            tecnico: '#4C544C'
        };
        
        card.innerHTML = `
            <div class="usuario-header">
                <div class="usuario-avatar" style="background: ${roleColors[user.role] || '#4C544C'};">
                    ${initials}
                </div>
                <div class="usuario-info">
                    <div class="usuario-nombre">${user.name}</div>
                    <div class="usuario-email">${user.email}</div>
                    <span class="usuario-role">${user.role}</span>
                </div>
            </div>
            <div class="usuario-actions">
                <button class="btn-edit-user" onclick="editarUsuario(${user.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete-user" onclick="eliminarUsuario(${user.id})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function mostrarModalNuevoUsuario() {
    // Redirigir a la página de registro
    window.location.href = 'login.html';
}

function editarUsuario(userId) {
    alert(`Función de edición en desarrollo para usuario ID: ${userId}`);
    // Aquí implementarías un modal de edición
}

function eliminarUsuario(userId) {
    if (!confirm('¿Está seguro que desea eliminar este usuario?')) {
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const filtered = users.filter(u => u.id !== userId);
    localStorage.setItem('users', JSON.stringify(filtered));
    
    loadUsuariosData();
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
    
    if (!confirm('¿Está seguro que desea archivar el periodo actual? Esto creará una copia de respaldo.')) {
        return;
    }
    
    const sabanaData = JSON.parse(localStorage.getItem('sabanaData'));
    const fechaArchivo = new Date().toISOString();
    
    // Guardar en historial
    const historial = JSON.parse(localStorage.getItem('sabanaHistorial')) || [];
    historial.push({
        fecha: fechaArchivo,
        periodo: 'Enero - Junio 2025',
        datos: sabanaData
    });
    localStorage.setItem('sabanaHistorial', JSON.stringify(historial));
    
    alert('Periodo archivado exitosamente');
    console.log('📦 Periodo archivado:', fechaArchivo);
}

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

console.log('✅ App.js cargado completamente');

