// Las funciones de habitaciones se cargan desde app-loader-habitaciones.js (cargado previamente)
// y están disponibles globalmente en window

(() => {
    'use strict';

    /**
     * App Loader - Carga los datos desde el servidor Express local
     * Este archivo reemplaza la lógica PHP para funcionar con la API local
     */

    // URL base de la API - Detecta automáticamente el entorno
    // En Vercel, usa la URL relativa. En local, usa localhost:3000 (Vercel dev) o 3001 (Express)
    const API_BASE_URL = (() => {
        const hostname = window.location.hostname;
        const port = window.location.port;

        // Detectar si estamos en Vercel (producción o preview)
        if (hostname.includes('vercel.app') || hostname.includes('vercel.com')) {
            // En Vercel, usar URL relativa (mismo dominio)
            console.log('🌐 Entorno: Vercel (producción/preview)');
            return '';
        }

        // En desarrollo local con Vercel CLI (puerto 3000)
        if (port === '3000') {
            console.log('🌐 Entorno: Vercel Dev (localhost:3000)');
            return ''; // Usar URL relativa, Vercel dev maneja las rutas
        }

        // En desarrollo local con Express (puerto 3001)
        console.log('🌐 Entorno: Express local (localhost:3001)');
        return 'http://localhost:3001';
    })();

    console.log('🔧 DEBUG: app-loader.js - Configuración:', {
        hostname: window.location.hostname,
        port: window.location.port,
        apiBaseUrl: API_BASE_URL || window.location.origin,
        fullApiUrl: API_BASE_URL ? API_BASE_URL : window.location.origin
    });

    // Variables globales para almacenar datos
    let cuartos = [];
    let mantenimientos = [];
    let edificios = [];
    let usuarios = []; // Lista de usuarios activos
    let usuarioActualId = null; // ID del usuario actual logeado
    let intervalosNotificaciones = null;
    let alertasEmitidas = new Set(); // Para evitar duplicados

    /**
     * Helper para obtener headers con autenticación JWT
     */
    async function obtenerHeadersConAuth(contentType = 'application/json') {
        const headers = {};

        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        // Intentar obtener desde IndexedDB primero
        let accessToken = null;

        if (window.storageHelper) {
            try {
                accessToken = await window.storageHelper.getAccessToken();
            } catch (error) {
                console.warn('⚠️ Error obteniendo token de IndexedDB:', error);
            }
        }

        // Fallback a localStorage/sessionStorage
        if (!accessToken) {
            accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        }

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        return headers;
    }

    // Paginación de habitaciones
    const CUARTOS_POR_PAGINA = 10;
    let cuartosFiltradosActual = [];
    let paginaActualCuartos = 1;
    let totalPaginasCuartos = 1;

    // Crear objeto de estado compartido que mantiene referencias actualizadas
    // Usamos getters para que siempre retorne los valores actuales
    window.appLoaderState = {
        get cuartos() { return cuartos; },
        set cuartos(val) { cuartos = val; },
        get mantenimientos() { return mantenimientos; },
        set mantenimientos(val) { mantenimientos = val; },
        get edificios() { return edificios; },
        set edificios(val) { edificios = val; },
        get usuarios() { return usuarios; },
        set usuarios(val) { usuarios = val; },
        get cuartosFiltradosActual() { return cuartosFiltradosActual; },
        set cuartosFiltradosActual(val) { cuartosFiltradosActual = val; },
        get paginaActualCuartos() { return paginaActualCuartos; },
        set paginaActualCuartos(val) { paginaActualCuartos = val; },
        get totalPaginasCuartos() { return totalPaginasCuartos; },
        set totalPaginasCuartos(val) { totalPaginasCuartos = val; },
        CUARTOS_POR_PAGINA: CUARTOS_POR_PAGINA
    };

    // Paginación de espacios comunes
    const ESPACIOS_POR_PAGINA = 10;
    let espaciosComunesFiltradosActual = [];
    let paginaActualEspacios = 1;
    let totalPaginasEspacios = 1;

    // Datos mock para modo offline
    const datosOffline = {
        edificios: [
            { id: 1, nombre: 'Torre A', descripcion: 'Edificio principal' },
            { id: 2, nombre: 'Torre B', descripcion: 'Edificio secundario' }
        ],
        cuartos: [
            { id: 1, numero: '101', nombre: '101', edificio_id: 1, edificio_nombre: 'Torre A', estado: 'ocupado' },
            { id: 2, numero: '102', nombre: '102', edificio_id: 1, edificio_nombre: 'Torre A', estado: 'vacio' },
            { id: 3, numero: '201', nombre: '201', edificio_id: 2, edificio_nombre: 'Torre B', estado: 'mantenimiento' },
            { id: 4, numero: '202', nombre: '202', edificio_id: 2, edificio_nombre: 'Torre B', estado: 'vacio' },
            { id: 5, numero: '301', nombre: '301', edificio_id: 1, edificio_nombre: 'Torre A', estado: 'fuera_servicio' }
        ],
        usuarios: [
            { id: 1, nombre: 'Juan Pérez', rol_id: 1, departamento: 'Mantenimiento', rol_nombre: 'Administrador' },
            { id: 2, nombre: 'María García', rol_id: 2, departamento: 'Limpieza', rol_nombre: 'Técnico' },
            { id: 3, nombre: 'Carlos López', rol_id: 2, departamento: 'Mantenimiento', rol_nombre: 'Técnico' },
            { id: 4, nombre: 'Ana Martínez', rol_id: 3, departamento: 'Recepción', rol_nombre: 'Usuario' }
        ],
        mantenimientos: [
            {
                id: 1,
                cuarto_id: 1,
                tipo: 'normal',
                descripcion: 'Reparación de aire acondicionado',
                fecha_registro: new Date().toISOString(),
                estado: 'pendiente',
                cuarto_numero: '101',
                cuarto_nombre: '101'
            },
            {
                id: 2,
                cuarto_id: 1,
                tipo: 'rutina',
                descripcion: 'Cambio de filtros programado',
                hora: '14:00:00',
                dia_alerta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                nivel_alerta: 'media',
                fecha_registro: new Date().toISOString(),
                estado: 'pendiente',
                cuarto_numero: '101',
                cuarto_nombre: '101'
            },
            {
                id: 3,
                cuarto_id: 1,
                tipo: 'rutina',
                descripcion: 'Inspección de seguridad',
                hora: '10:00:00',
                dia_alerta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                nivel_alerta: 'alta',
                fecha_registro: new Date().toISOString(),
                estado: 'pendiente',
                cuarto_numero: '101',
                cuarto_nombre: '101'
            },
            {
                id: 4,
                cuarto_id: 1,
                tipo: 'normal',
                descripcion: 'Revisión de plomería en baño',
                fecha_registro: new Date().toISOString(),
                estado: 'pendiente',
                cuarto_numero: '101',
                cuarto_nombre: '101'
            },
            {
                id: 5,
                cuarto_id: 2,
                tipo: 'normal',
                descripcion: 'Limpieza profunda',
                fecha_registro: new Date().toISOString(),
                estado: 'pendiente',
                cuarto_numero: '102',
                cuarto_nombre: '102'
            },
            {
                id: 6,
                cuarto_id: 3,
                tipo: 'rutina',
                descripcion: 'Mantenimiento preventivo',
                hora: '09:00:00',
                dia_alerta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                nivel_alerta: 'baja',
                fecha_registro: new Date().toISOString(),
                estado: 'pendiente',
                cuarto_numero: '201',
                cuarto_nombre: '201'
            }
        ]
    };

    // Caché de plantillas para evitar recrearlas
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
     * Función que se ejecuta cuando se carga la página
     */
    async function inicializarApp() {
        console.log('🚀🚀🚀 JW Mantto - INICIALIZANDO APP 🚀🚀🚀');
        console.log('🌐 API_BASE_URL configurado:', API_BASE_URL);
        console.log('📍 URL actual:', window.location.href);
        console.log('📄 User Agent:', navigator.userAgent);
        console.log('📋 Document readyState:', document.readyState);

        // Preparar audio para primera interacción del usuario
        habilitarAudioConInteraccion();

        try {
            console.log('🔍 Verificando elementos DOM...');
            // Verificar que los elementos existan
            const listaCuartos = document.getElementById('listaCuartos');
            const filtroEdificio = document.getElementById('filtroEdificio');
            console.log('📋 Elementos encontrados:', {
                listaCuartos: !!listaCuartos,
                filtroEdificio: !!filtroEdificio
            });

            if (!listaCuartos) {
                throw new Error('❌ Elemento listaCuartos no encontrado en el DOM');
            }

            // Mostrar skeletons de carga inicial
            console.log('💀 Mostrando skeletons de carga...');
            mostrarSkeletonsIniciales();

            // Cargar datos iniciales
            console.log('📥 Iniciando carga de datos...');
            await cargarDatos();
            console.log('✅ Datos cargados exitosamente:', {
                cuartos: cuartos.length,
                edificios: edificios.length,
                mantenimientos: mantenimientos.length
            });

            // Marcar alertas pasadas como emitidas
            await marcarAlertasPasadasComoEmitidas();

            // Establecer usuario actual desde la sesión JWT
            let currentUser = null;

            // Intentar obtener desde IndexedDB primero
            if (window.storageHelper) {
                try {
                    currentUser = await window.storageHelper.getCurrentUser();
                } catch (error) {
                    console.warn('⚠️ Error obteniendo usuario de IndexedDB:', error);
                }
            }

            // Fallback a localStorage/sessionStorage
            if (!currentUser) {
                currentUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
            }

            if (currentUser && currentUser.id) {
                usuarioActualId = currentUser.id;

                // Guardar en IndexedDB si está disponible
                if (window.storageHelper) {
                    await window.storageHelper.saveCurrentUser(currentUser, true);
                }

                localStorage.setItem('usuarioActualId', currentUser.id);
                console.log('👤 Usuario actual desde JWT:', currentUser.nombre, '(ID:', currentUser.id, ')');

                // Mostrar usuario actual en el header
                mostrarUsuarioActualEnHeader();
            } else if (usuarios && usuarios.length > 0) {
                // Fallback: usar primer usuario si no hay sesión JWT
                const usuarioGuardado = localStorage.getItem('usuarioActualId');
                usuarioActualId = usuarioGuardado ? parseInt(usuarioGuardado) : usuarios[0].id;
                console.warn('⚠️ No hay sesión JWT activa, usando usuario por defecto:', usuarioActualId);

                // Mostrar usuario actual en el header
                mostrarUsuarioActualEnHeader();
            }

            sincronizarCuartosFiltrados();

            // Configurar eventos de la interfaz
            console.log('⚙️ Configurando eventos de interfaz...');
            configurarEventos();

            // Mostrar datos en la interfaz
            console.log('🖼️ Renderizando interfaz...');
            mostrarCuartos();
            mostrarEdificios();
            cargarCuartosEnSelect();
            mostrarAlertasYRecientes();

            // Iniciar sistema de notificaciones
            console.log('🔔 Iniciando sistema de notificaciones...');
            iniciarSistemaNotificaciones();

            console.log('🎉 Aplicación cargada exitosamente');

        } catch (error) {
            console.error('💥 Error al inicializar la aplicación:', error);
            console.error('📋 Error name:', error.name);
            console.error('📝 Error message:', error.message);
            console.error('🔍 Stack trace:', error.stack);

            // Intentar diagnóstico adicional
            console.log('🔧 Iniciando diagnóstico de error...');
            console.log('🌐 Conectividad a API:', API_BASE_URL);

            // Probar conectividad básica
            try {
                console.log('🧪 Probando conectividad básica...');
                const response = await fetch(API_BASE_URL + '/api/cuartos');
                console.log('📡 Response status:', response.status);
                console.log('📊 Response ok:', response.ok);
            } catch (fetchError) {
                console.error('🚫 Error de conectividad crítico:', fetchError);
                console.error('🔍 Fetch error details:', fetchError.message);
                throw fetchError; // Re-lanzar el error para manejarlo arriba
            }

            // Si llegamos aquí, hubo un error de aplicación, no de red
            console.log('� Error de aplicación, re-intentando...');


            // Si llegamos aquí, usar datos offline como último recurso
            console.log('🆘 Usando datos offline como último recurso...');
            try {
                cuartos = datosOffline.cuartos;
                edificios = datosOffline.edificios;
                mantenimientos = datosOffline.mantenimientos;

                sincronizarCuartosFiltrados();
                mostrarCuartos();
                mostrarEdificios();
                cargarCuartosEnSelect();
                mostrarAlertasYRecientes();

                mostrarMensaje('Aplicación funcionando en modo offline', 'warning');
            } catch (offlineError) {
                console.error('Error cargando datos offline:', offlineError);
                mostrarError('Error crítico al cargar la aplicación.');
            }
        }
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarApp);
    } else {
        // DOM ya está listo, ejecutar inmediatamente
        console.log('📄 DOM ya está listo, ejecutando inmediatamente...');
        inicializarApp();
    }

    /**
     * Habilitar audio con la primera interacción del usuario
     */
    function habilitarAudioConInteraccion() {
        const habilitarAudio = () => {
            if (!window.audioInteractionEnabled) {
                // Reproducir un sonido silencioso para habilitar el contexto de audio
                const audio = new Audio();
                audio.volume = 0;
                audio.play().then(() => {
                    window.audioInteractionEnabled = true;
                    console.log('🔊 Audio habilitado tras interacción del usuario');
                }).catch(() => {
                    console.log('⚠️ No se pudo habilitar audio automáticamente');
                });
            }

            // Remover event listeners después de la primera interacción
            document.removeEventListener('click', habilitarAudio);
            document.removeEventListener('keydown', habilitarAudio);
        };

        // Añadir listeners para la primera interacción
        document.addEventListener('click', habilitarAudio, { once: true });
        document.addEventListener('keydown', habilitarAudio, { once: true });
    }

    /**
     * Cargar todos los datos desde la API
     */
    async function cargarDatos() {
        try {
            console.log('🔄 Iniciando carga de datos desde API...');
            console.log('🌐 API_BASE_URL:', API_BASE_URL);
            console.log('📍 Location:', window.location.href);
            console.log('🌍 Protocol:', window.location.protocol);

            // Cargar datos críticos en paralelo (habitaciones, edificios, mantenimientos)
            console.log('📋 Iniciando cargas paralelas base...');
            const [responseCuartos, responseEdificios, responseMantenimientos] = await Promise.all([
                fetch(`${API_BASE_URL}/api/cuartos`),
                fetch(`${API_BASE_URL}/api/edificios`),
                fetch(`${API_BASE_URL}/api/mantenimientos`)
            ]);

            // Validar respuestas principales
            if (!responseCuartos.ok) throw new Error(`❌ Error al cargar cuartos: ${responseCuartos.status}`);
            if (!responseEdificios.ok) throw new Error(`❌ Error al cargar edificios: ${responseEdificios.status}`);
            if (!responseMantenimientos.ok) throw new Error(`❌ Error al cargar mantenimientos: ${responseMantenimientos.status}`);

            // Parsear JSON en paralelo para los datos principales
            [cuartos, edificios, mantenimientos] = await Promise.all([
                responseCuartos.json(),
                responseEdificios.json(),
                responseMantenimientos.json()
            ]);

            // Cargar usuarios de forma independiente (no crítico)
            try {
                console.log('👤 Cargando usuarios activos...');
                const responseUsuarios = await fetch(`${API_BASE_URL}/api/usuarios`);
                if (!responseUsuarios.ok) {
                    throw new Error(`Error HTTP ${responseUsuarios.status}`);
                }
                usuarios = await responseUsuarios.json();
            } catch (usuariosError) {
                console.warn('⚠️ No se pudieron cargar los usuarios desde API, usando datos previos/locales si existen.', usuariosError);
                if (!usuarios || usuarios.length === 0) {
                    // Intentar cargar desde IndexedDB primero
                    if (window.storageHelper) {
                        const usuariosDB = await window.storageHelper.getUsuarios();
                        usuarios = usuariosDB && usuariosDB.length > 0 ? usuariosDB : [];
                    }
                    // Fallback a localStorage
                    if (!usuarios || usuarios.length === 0) {
                        const usuariosGuardados = localStorage.getItem('ultimosUsuarios');
                        usuarios = usuariosGuardados ? JSON.parse(usuariosGuardados) : [];
                    }
                }
            }

            console.log('✅ Datos principales cargados:', {
                cuartos: cuartos.length,
                edificios: edificios.length,
                mantenimientos: mantenimientos.length,
                usuarios: usuarios?.length || 0
            });

            console.log('🎉 Todos los datos cargados exitosamente desde API');

            // Guardar en IndexedDB primero, luego localStorage como respaldo
            try {
                if (window.storageHelper) {
                    await window.storageHelper.saveAllData({
                        cuartos,
                        edificios,
                        mantenimientos,
                        usuarios
                    });
                    console.log('💾 Datos guardados en IndexedDB');
                }

                // Mantener localStorage como fallback
                localStorage.setItem('ultimosCuartos', JSON.stringify(cuartos));
                localStorage.setItem('ultimosEdificios', JSON.stringify(edificios));
                localStorage.setItem('ultimosMantenimientos', JSON.stringify(mantenimientos));
                localStorage.setItem('ultimosUsuarios', JSON.stringify(usuarios));
                console.log('💾 Datos guardados en localStorage como respaldo');
            } catch (storageError) {
                console.warn('⚠️ No se pudo guardar en storage:', storageError);
            }

            return true;

        } catch (error) {
            console.error('💥 Error cargando datos desde API:', error);
            console.error('📋 Error type:', typeof error);
            console.error('📝 Error message:', error.message);
            console.error('🔍 Error stack:', error.stack);

            // Intentar cargar desde IndexedDB primero
            if (window.storageHelper) {
                console.log('🔄 Intentando cargar desde IndexedDB...');
                try {
                    const offlineData = await window.storageHelper.loadOfflineData();

                    if (offlineData.hasData) {
                        cuartos = offlineData.data.cuartos || [];
                        edificios = offlineData.data.edificios || [];
                        mantenimientos = offlineData.data.mantenimientos || [];
                        usuarios = offlineData.data.usuarios || [];

                        setTimeout(() => {
                            mostrarMensaje('Datos cargados desde IndexedDB (modo offline)', 'info');
                        }, 2000);

                        return true;
                    }
                } catch (idbError) {
                    console.error('💥 Error al cargar desde IndexedDB:', idbError);
                }
            }

            // Fallback a localStorage
            console.log('🔄 Intentando cargar desde localStorage...');
            try {
                const cuartosGuardados = localStorage.getItem('ultimosCuartos');
                const edificiosGuardados = localStorage.getItem('ultimosEdificios');
                const mantenimientosGuardados = localStorage.getItem('ultimosMantenimientos');
                const usuariosGuardados = localStorage.getItem('ultimosUsuarios');

                if (cuartosGuardados && edificiosGuardados && mantenimientosGuardados) {
                    cuartos = JSON.parse(cuartosGuardados);
                    edificios = JSON.parse(edificiosGuardados);
                    mantenimientos = JSON.parse(mantenimientosGuardados);
                    usuarios = usuariosGuardados ? JSON.parse(usuariosGuardados) : [];

                    console.log('💾 Datos cargados desde localStorage:', {
                        cuartos: cuartos.length,
                        edificios: edificios.length,
                        mantenimientos: mantenimientos.length,
                        usuarios: usuarios.length
                    });

                    setTimeout(() => {
                        mostrarMensaje('Datos cargados desde caché local (sin conexión al servidor)', 'info');
                    }, 2000);

                    return true;
                } else {
                    console.log('❌ No hay datos válidos en localStorage');
                }
            } catch (localStorageError) {
                console.error('💥 Error al cargar desde localStorage:', localStorageError);
            }

            console.log('🆘 Usando datos offline como último recurso...');

            // Usar datos offline
            try {
                cuartos = datosOffline.cuartos;
                edificios = datosOffline.edificios;
                mantenimientos = datosOffline.mantenimientos;
                usuarios = datosOffline.usuarios || [];

                console.log('Datos offline cargados:', {
                    cuartos: cuartos.length,
                    edificios: edificios.length,
                    mantenimientos: mantenimientos.length,
                    usuarios: usuarios.length
                });

                // Mostrar mensaje informativo al usuario
                setTimeout(() => {
                    mostrarMensaje('Aplicación funcionando en modo offline con datos de ejemplo', 'info');
                }, 2000);

                return true;
            } catch (offlineError) {
                console.error('Error cargando datos offline:', offlineError);
                throw new Error('No se pueden cargar datos ni desde API ni desde cache offline');
            }
        }
    }

    /**
     * Configurar eventos de la interfaz
     */
    function configurarEventos() {
        // Configurar filtros
        const buscarCuarto = document.getElementById('buscarCuarto');
        const buscarAveria = document.getElementById('buscarAveria');
        const filtroEdificio = document.getElementById('filtroEdificio');
        const filtroPrioridad = document.getElementById('filtroPrioridad');
        const filtroEstado = document.getElementById('filtroEstado');

        if (buscarCuarto) buscarCuarto.addEventListener('input', filtrarCuartos);
        if (buscarAveria) buscarAveria.addEventListener('input', filtrarCuartos);
        if (filtroEdificio) filtroEdificio.addEventListener('change', filtrarCuartos);
        if (filtroPrioridad) filtroPrioridad.addEventListener('change', filtrarCuartos);
        if (filtroEstado) filtroEstado.addEventListener('change', filtrarCuartos);

        // Configurar formulario de agregar mantenimiento
        const formAgregar = document.getElementById('formAgregarMantenimientoLateral');
        if (formAgregar) {
            formAgregar.addEventListener('submit', manejarAgregarMantenimiento);
        }

        // Configurar sincronización bidireccional del select de cuartos
        const selectCuarto = document.getElementById('cuartoMantenimientoLateral');
        if (selectCuarto) {
            selectCuarto.addEventListener('change', function () {
                const cuartoId = this.value;
                if (cuartoId) {
                    // Seleccionar visualmente el cuarto en la interfaz
                    seleccionarCuartoDesdeSelect(parseInt(cuartoId));

                    // Actualizar el selector de estado con el estado actual del cuarto
                    actualizarSelectorEstado(parseInt(cuartoId));
                } else {
                    // Si no hay selección, remover todas las selecciones
                    const todosLosCuartos = document.querySelectorAll('.cuarto');
                    todosLosCuartos.forEach(cuarto => {
                        cuarto.classList.remove('cuarto-seleccionado');
                    });

                    // Limpiar selector de estado
                    const estadoSelector = document.getElementById('estadoCuartoSelector');
                    if (estadoSelector) estadoSelector.value = '';
                }
            });
        }
    }

    /**
     * Mostrar el usuario actual en el header
     */
    function mostrarUsuarioActualEnHeader() {
        // Intentar obtener usuario desde JWT primero
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');

        let usuarioMostrar = null;

        if (currentUser && currentUser.id) {
            // Usuario desde JWT
            usuarioMostrar = {
                nombre: currentUser.nombre,
                rol_nombre: currentUser.rol || currentUser.rol_nombre
            };
        } else if (usuarioActualId) {
            // Buscar en lista de usuarios
            usuarioMostrar = usuarios.find(u => u.id === usuarioActualId);
        }

        if (!usuarioMostrar) {
            console.warn('⚠️ No se pudo determinar el usuario actual');
            return;
        }

        const userNameElement = document.getElementById('userName');
        const userRoleElement = document.getElementById('userRole');

        if (userNameElement) {
            userNameElement.textContent = usuarioMostrar.nombre;
        }

        if (userRoleElement) {
            userRoleElement.textContent = usuarioMostrar.rol_nombre || 'Usuario';
        }

        console.log('✅ Usuario mostrado en header:', usuarioMostrar.nombre, '(' + (usuarioMostrar.rol_nombre || 'Usuario') + ')');
    }

    /**
     * Generar HTML de servicios (estilo espacios comunes)
     */
    function generarServiciosHTML(servicios, cuartoId, modoEdicion = false, esEspacio = false) {

        if (!servicios || servicios.length === 0) {
            return '<div style="padding: 1rem; text-align: center; color: var(--texto-secundario); font-style: italic; min-height: 78.99px;">No hay servicios registrados</div>';
        }

        // Mostrar máximo 2 servicios más recientes
        const serviciosMostrar = servicios.slice(0, 2);
        const hayMasServicios = servicios.length > 2;

        let html = serviciosMostrar.map(servicio => {
            const esAlerta = servicio.tipo === 'rutina';
            const prioridadClass = servicio.prioridad ? `prioridad-${servicio.prioridad}` : '';

            // Estado del mantenimiento con emoji
            let estadoBadge = '';
            if (servicio.estado) {
                const estadosEmoji = {
                    'pendiente': 'Pendiente',
                    'en_proceso': 'En Proceso',
                    'completado': 'Completado',
                    'cancelado': 'Cancelado'
                };
                estadoBadge = `<span class="estado-badge estado-${servicio.estado}">${estadosEmoji[servicio.estado] || servicio.estado}</span>`;
            }

            // Usuario asignado
            let usuarioAsignado = '';
            if (servicio.usuario_asignado_id) {
                const usuario = usuarios.find(u => u.id === servicio.usuario_asignado_id);
                if (usuario) {
                    usuarioAsignado = `<span><i class="fas fa-user-check"></i> ${usuario.nombre}</span>`;
                }
            }

            // Para alertas, mostrar día y hora de alerta; para averías, fecha de registro
            let fechaHoraMostrar = '';
            if (esAlerta && (servicio.dia_alerta || servicio.hora)) {
                const diaAlerta = servicio.dia_alerta ? formatearDiaAlerta(servicio.dia_alerta) : '';
                const horaAlerta = servicio.hora ? formatearHora(servicio.hora) : '';
                fechaHoraMostrar = `<span><i class="far fa-clock"></i> ${diaAlerta} ${horaAlerta}</span>`;
            } else if (servicio.fecha_registro) {
                fechaHoraMostrar = `<span><i class="far fa-clock"></i> ${formatearFechaCorta(servicio.fecha_registro)}</span>`;
            }

            // Fecha de finalización
            let fechaFinalizacion = '';
            if (servicio.fecha_finalizacion && (servicio.estado === 'completado' || servicio.estado === 'cancelado')) {
                fechaFinalizacion = `<span><i class="fas fa-flag-checkered"></i> ${formatearFechaCorta(servicio.fecha_finalizacion)}</span>`;
            }

            // En modo edición, usar wrapper; en modo normal, solo el item
            if (modoEdicion) {
                return `
            <div class="servicio-item-wrapper modo-edicion" data-servicio-id="${servicio.id}">
                <div class="servicio-item ${esAlerta ? 'servicio-alerta' : ''}" onclick="activarEdicionServicio(${servicio.id}, ${cuartoId}, ${esEspacio})" style="cursor: pointer;">
                    <div class="servicio-info">
                        <div class="servicio-descripcion">${escapeHtml(servicio.descripcion)}</div>
                        <div class="servicio-meta">
                            <span class="servicio-tipo-badge">
                                <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i>
                                ${esAlerta ? 'Alerta' : 'Avería'}
                            </span>
                            ${estadoBadge}
                            ${fechaHoraMostrar}
                            ${usuarioAsignado}
                            ${fechaFinalizacion}
                        </div>
                    </div>
                    <i class="fas fa-pen" style="color: var(--texto-secundario); font-size: 1rem;"></i>
                </div>
                <button class="btn-eliminar-inline" onclick="eliminarServicioInline(${servicio.id}, ${cuartoId}, ${esEspacio}); event.stopPropagation();" title="Eliminar servicio">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
            } else {
                return `
            <div class="servicio-item ${esAlerta ? 'servicio-alerta' : ''}" onclick="abrirModalDetalleServicio(${servicio.id}, false)">
                <div class="servicio-info">
                    <div class="servicio-descripcion">${escapeHtml(servicio.descripcion)}</div>
                    <div class="servicio-meta">
                        <span class="servicio-tipo-badge">
                            <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i>
                            ${esAlerta ? 'Alerta' : 'Avería'}
                        </span>
                        ${estadoBadge}
                        ${fechaHoraMostrar}
                        ${usuarioAsignado}
                        ${fechaFinalizacion}
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--texto-secundario); font-size: 1.2rem;"></i>
            </div>
        `;
            }
        }).join('');

        // Si hay más servicios, agregar botón con ícono de ojo
        if (hayMasServicios) {
            const serviciosRestantes = servicios.length - 2;
            html += `
        <div class="ver-mas-servicios" onclick="verDetallesServicios(${cuartoId}, ${esEspacio}); event.stopPropagation();">
            <i class="fas fa-eye"></i>
            <span>Ver todos los servicios (${servicios.length})</span>
        </div>
    `;
        }

        return html;
    }

    /**
     * Mostrar edificios en el select de filtros
     */
    function mostrarEdificios() {
        const filtroEdificio = document.getElementById('filtroEdificio');
        if (!filtroEdificio) return;

        // Mantener la opción "Todos los edificios"
        filtroEdificio.innerHTML = '<option value="">Todos los edificios</option>';

        edificios.forEach(edificio => {
            const option = document.createElement('option');
            option.value = edificio.id;
            option.textContent = edificio.nombre;
            filtroEdificio.appendChild(option);
        });
    }

    /**
     * Cargar cuartos en el select del formulario con optgroups
     */
    function cargarCuartosEnSelect() {
        const select = document.getElementById('cuartoMantenimientoLateral');
        if (!select) return;

        select.innerHTML = '<option value="">-- Seleccionar Cuarto --</option>';

        // Agrupar cuartos por edificio
        const cuartosPorEdificio = {};
        cuartos.forEach(cuarto => {
            const edificioNombre = cuarto.edificio_nombre || 'Edificio ' + cuarto.edificio_id;
            if (!cuartosPorEdificio[edificioNombre]) {
                cuartosPorEdificio[edificioNombre] = [];
            }
            cuartosPorEdificio[edificioNombre].push(cuarto);
        });

        // Crear optgroups
        Object.keys(cuartosPorEdificio).sort().forEach(edificioNombre => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = edificioNombre;

            cuartosPorEdificio[edificioNombre]
                .sort((a, b) => (a.nombre || a.numero || '').localeCompare(b.nombre || b.numero || ''))
                .forEach(cuarto => {
                    const option = document.createElement('option');
                    option.value = cuarto.id;
                    option.textContent = cuarto.nombre || cuarto.numero;
                    optgroup.appendChild(option);
                });

            select.appendChild(optgroup);
        });
    }



    /**
     * Mostrar alertas y mantenimientos recientes
     */
    function mostrarAlertasYRecientes() {
        mostrarAlertas();
        mostrarRecientes();
        mostrarAlertasEmitidas();
        mostrarHistorialAlertas();
    }

    /**
     * Mostrar alertas pendientes (no emitidas) desde la API
     */
    async function mostrarAlertas() {
        const listaAlertas = document.getElementById('listaVistaRutinas');
        if (!listaAlertas) return;

        try {
            console.log('📋 Cargando alertas pendientes desde BD...');

            // Obtener alertas pendientes desde la API
            const response = await fetch(`${API_BASE_URL}/api/alertas/pendientes`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const alertasPendientes = await response.json();

            console.log(`📋 Alertas pendientes desde BD: ${alertasPendientes.length}`);
            console.log('🔍 Detalle de alertas:', alertasPendientes.map(r => `ID${r.id}(${r.dia_alerta} ${r.hora} - ${r.descripcion.substring(0, 20)}...)`));

            // Buscar el mensaje de "no hay alertas"
            const mensajeNoAlertas = document.getElementById('mensaje-no-alertas-encontradas');

            if (alertasPendientes.length === 0) {
                listaAlertas.innerHTML = '';
                listaAlertas.style.display = 'none';
                if (mensajeNoAlertas) {
                    mensajeNoAlertas.style.display = 'block';
                    mensajeNoAlertas.innerHTML = '<i class="fas fa-check-circle"></i> No hay alertas programadas';
                }
                return;
            }

            // Hay alertas, mostrar la lista y ocultar el mensaje
            listaAlertas.style.display = 'block';
            if (mensajeNoAlertas) {
                mensajeNoAlertas.style.display = 'none';
            }

            listaAlertas.innerHTML = '';
            // Mostrar TODAS las alertas pendientes
            alertasPendientes.forEach((alerta, index) => {
                console.log(`📝 Procesando alerta ${index + 1}/${alertasPendientes.length}:`, alerta);
                const li = document.createElement('li');
                li.className = 'rutina-item';
                li.id = `rutina-${alerta.id}`;

                const isEspacioComun = !!alerta.espacio_comun_id;
                const nombreUbicacion = isEspacioComun ? alerta.espacio_nombre : (alerta.cuarto_numero || `Cuarto ${alerta.cuarto_id}`);
                const nombreEdificio = alerta.edificio_nombre || '';
                const ubicacionId = isEspacioComun ? alerta.espacio_comun_id : alerta.cuarto_id;

                // Extraer fecha de dia_alerta si es timestamp
                const fechaAlerta = alerta.dia_alerta?.includes('T') ? alerta.dia_alerta.split('T')[0] : alerta.dia_alerta;

                // Todas estas alertas son pendientes (no emitidas)
                const estadoTexto = '⏰ Programada';
                const estadoClase = 'alerta-programada';

                // Añadir todos los atributos data necesarios para el sistema de notificaciones
                li.dataset.horaRaw = alerta.hora || '';
                li.dataset.diaRaw = fechaAlerta || '';
                li.dataset.descripcion = alerta.descripcion || '';
                li.dataset.cuartoNombre = nombreUbicacion;
                li.dataset.cuartoId = ubicacionId || '';

                li.innerHTML = `
                <span class="rutina-hora">
                    ${fechaAlerta ? formatearFechaCorta(fechaAlerta) : '??/??'} 
                    ${alerta.hora ? formatearHora(alerta.hora) : '--:--'}
                </span>
                <span class="rutina-info">
                    <span class="rutina-cuarto" title="${escapeHtml(nombreEdificio)}">
                        ${escapeHtml(nombreUbicacion)}
                    </span>
                    <span class="rutina-descripcion">
                        ${escapeHtml(alerta.descripcion)}
                    </span>
                    <span class="rutina-estado ${estadoClase}">
                        ${estadoTexto}
                    </span>
                </span>
                <button class="boton-ir-rutina" onclick="scrollToElement(${ubicacionId}, ${isEspacioComun})" title="Ver detalles">&#10148;</button>
            `;
                listaAlertas.appendChild(li);
            });

            console.log(`✅ Renderizadas ${alertasPendientes.length} alertas pendientes en el panel`);

        } catch (error) {
            console.error('❌ Error cargando alertas pendientes:', error);
            listaAlertas.innerHTML = '<li class="mensaje-no-items">Error cargando alertas</li>';
        }
    }

    /**
     * Mostrar mantenimientos recientes
     */
    function mostrarRecientes() {
        console.log('=== MOSTRANDO RECIENTES ===');

        const listaRecientes = document.getElementById('listaVistaRecientes');
        if (!listaRecientes) {
            console.error('Elemento listaVistaRecientes no encontrado');
            return;
        }

        console.log('Mantenimientos disponibles:', mantenimientos ? mantenimientos.length : 0);

        if (!mantenimientos || mantenimientos.length === 0) {
            listaRecientes.innerHTML = '<li class="mensaje-no-items">No hay mantenimientos recientes</li>';
            return;
        }

        const recientes = mantenimientos
            .filter(m => m.tipo === 'normal')
            .sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro))
            .slice(0, 5);

        console.log('Mantenimientos recientes filtrados:', recientes.length);

        if (recientes.length === 0) {
            listaRecientes.innerHTML = '<li class="mensaje-no-items">No hay mantenimientos recientes</li>';
            return;
        }

        listaRecientes.innerHTML = '';
        recientes.forEach((mantenimiento, index) => {
            console.log(`Procesando mantenimiento reciente ${index + 1}:`, mantenimiento);

            const li = document.createElement('li');
            li.className = 'reciente-item';
            li.innerHTML = `
            <span class="reciente-tipo reciente-tipo-normal">Avería</span>
            <span class="reciente-info">
                <span class="reciente-cuarto" title="${escapeHtml(mantenimiento.edificio_nombre || 'Sin edificio')}">
                    ${escapeHtml(mantenimiento.cuarto_nombre || 'Cuarto ' + mantenimiento.cuarto_id)}
                </span>
                <span class="reciente-descripcion">
                    ${escapeHtml(mantenimiento.descripcion)}
                </span>
                <span class="reciente-fecha">
                    ${formatearFechaCompleta(mantenimiento.fecha_registro)}
                </span>
            </span>
            <button class="boton-ir-rutina" onclick="scrollToCuarto(${mantenimiento.cuarto_id})" title="Ir al cuarto">&#10148;</button>
        `;
            listaRecientes.appendChild(li);
        });

        console.log('=== FIN MOSTRANDO RECIENTES ===');
    }

    /**
     * Mostrar alertas emitidas hoy en el panel de alertas del día (desde API)
     */
    async function mostrarAlertasEmitidas() {
        const listaEmitidas = document.getElementById('listaAlertasEmitidas');
        const mensajeNoEmitidas = document.getElementById('mensaje-no-alertas-emitidas');

        if (!listaEmitidas) {
            console.warn('Elemento listaAlertasEmitidas no encontrado');
            return;
        }

        try {
            // Usar fecha local actual (no UTC)
            const ahora = new Date();
            const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

            console.log(`📅 Cargando alertas emitidas para hoy: ${hoy}`);

            // Obtener alertas emitidas de hoy desde la API
            const response = await fetch(`${API_BASE_URL}/api/alertas/emitidas?fecha=${hoy}`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const alertasEmitidasBD = await response.json();

            console.log(`📋 Alertas emitidas hoy desde BD:`, alertasEmitidasBD.length);

            if (alertasEmitidasBD.length === 0) {
                listaEmitidas.style.display = 'none';
                if (mensajeNoEmitidas) mensajeNoEmitidas.style.display = 'block';
                return;
            }

            listaEmitidas.style.display = 'block';
            if (mensajeNoEmitidas) mensajeNoEmitidas.style.display = 'none';

            listaEmitidas.innerHTML = '';
            alertasEmitidasBD
                .sort((a, b) => (b.hora || '').localeCompare(a.hora || '')) // Ordenar por hora desc
                .forEach(alerta => {
                    const nombreCuarto = alerta.cuarto_numero || `Cuarto ${alerta.cuarto_id}`;

                    // Extraer fecha de dia_alerta
                    const fechaAlerta = alerta.dia_alerta?.includes('T') ? alerta.dia_alerta.split('T')[0] : alerta.dia_alerta;

                    // Determinar clase de prioridad
                    const prioridadClass = alerta.prioridad ? `prioridad-${alerta.prioridad}` : 'prioridad-media';

                    const li = document.createElement('li');
                    li.className = `alerta-emitida-item ${prioridadClass}`;
                    li.innerHTML = `
                    <div class="alerta-cuarto">${escapeHtml(nombreCuarto)}</div>
                    <div class="alerta-descripcion">${escapeHtml(alerta.descripcion)}</div>
                    <div class="alerta-hora">${formatearHora(alerta.hora) || '--:--'}</div>
                    <div class="alerta-fechas">
                        <div class="fecha-registro">Fecha: ${fechaAlerta ? formatearDiaAlerta(fechaAlerta) : 'N/A'}</div>
                    </div>
                `;
                    listaEmitidas.appendChild(li);
                });

            console.log(`✅ Mostradas ${alertasEmitidasBD.length} alertas emitidas hoy en UI`);

        } catch (error) {
            console.error('❌ Error cargando alertas emitidas:', error);
            if (mensajeNoEmitidas) {
                mensajeNoEmitidas.textContent = 'Error cargando alertas';
                mensajeNoEmitidas.style.display = 'block';
            }
            listaEmitidas.style.display = 'none';
        }
    }

    /**
     * Mostrar historial completo de alertas emitidas (desde API, sin filtro de fecha)
     */
    async function mostrarHistorialAlertas() {
        const listaHistorial = document.getElementById('listaHistorialAlertas');
        const mensajeNoHistorial = document.getElementById('mensaje-no-historial');

        if (!listaHistorial) {
            console.warn('Elemento listaHistorialAlertas no encontrado');
            return;
        }

        try {
            console.log(`📚 Cargando historial completo de alertas emitidas desde BD...`);

            // Obtener TODAS las alertas emitidas desde la API (sin filtro de fecha)
            const response = await fetch(`${API_BASE_URL}/api/alertas/emitidas`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const todasAlertasEmitidas = await response.json();

            console.log(`📚 Historial completo desde BD:`, todasAlertasEmitidas.length);

            if (todasAlertasEmitidas.length === 0) {
                listaHistorial.style.display = 'none';
                if (mensajeNoHistorial) mensajeNoHistorial.style.display = 'block';
                return;
            }

            listaHistorial.style.display = 'block';
            if (mensajeNoHistorial) mensajeNoHistorial.style.display = 'none';

            listaHistorial.innerHTML = '';
            todasAlertasEmitidas.forEach(alerta => {
                const nombreCuarto = alerta.cuarto_numero || `Cuarto ${alerta.cuarto_id}`;

                // Extraer fecha de dia_alerta
                const fechaAlerta = alerta.dia_alerta?.includes('T') ? alerta.dia_alerta.split('T')[0] : alerta.dia_alerta;

                // Determinar clase de prioridad
                const prioridadClass = alerta.prioridad ? `prioridad-${alerta.prioridad}` : 'prioridad-media';

                const li = document.createElement('li');
                li.className = `alerta-emitida-item ${prioridadClass}`;
                li.innerHTML = `
                <div class="alerta-cuarto">${escapeHtml(nombreCuarto)}</div>
                <div class="alerta-descripcion">${escapeHtml(alerta.descripcion)}</div>
                <div class="alerta-hora">${formatearHora(alerta.hora) || '--:--'}</div>
                <div class="alerta-fechas">
                    <div class="fecha-registro">Fecha: ${fechaAlerta ? formatearDiaAlerta(fechaAlerta) : 'N/A'}</div>
                </div>
            `;
                listaHistorial.appendChild(li);
            });

            console.log(`✅ Mostradas ${todasAlertasEmitidas.length} alertas en historial`);

        } catch (error) {
            console.error('❌ Error cargando historial de alertas:', error);
            if (mensajeNoHistorial) {
                mensajeNoHistorial.textContent = 'Error cargando historial';
                mensajeNoHistorial.style.display = 'block';
            }
            listaHistorial.style.display = 'none';
        }
    }

    /**
     * Marcar automáticamente como emitidas las alertas cuya fecha/hora ya pasó
     */
    async function marcarAlertasPasadasComoEmitidas() {
        try {
            console.log('🔄 Verificando alertas pasadas...');

            const response = await fetch(`${API_BASE_URL}/api/alertas/marcar-pasadas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (result.count > 0) {
                console.log(`✅ ${result.count} alertas pasadas marcadas como emitidas`);
                // Recargar datos para reflejar los cambios
                await cargarDatos();
            } else {
                console.log('ℹ️ No hay alertas pasadas pendientes de marcar');
            }

            return result.count;

        } catch (error) {
            console.error('❌ Error marcando alertas pasadas:', error);
            return 0;
        }
    }

    /**
     * Manejar el envío del formulario de agregar mantenimiento
     */
    async function manejarAgregarMantenimiento(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const datos = {
            cuarto_id: formData.get('cuarto_id'),
            tipo: formData.get('tipo'),
            descripcion: formData.get('descripcion'),
            hora: formData.get('hora'),
            dia_alerta: formData.get('dia_alerta'),
            prioridad: formData.get('prioridad'), // Cambiado de nivel_alerta a prioridad
            estado_cuarto: formData.get('estado_cuarto')
        };

        console.log('📝 Enviando datos de mantenimiento:', datos);

        // Validaciones básicas en frontend
        if (!datos.cuarto_id) {
            mostrarMensaje('Por favor selecciona un cuarto', 'error');
            return;
        }

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

        // ⚡ ACTUALIZACIÓN OPTIMISTA: Crear servicio temporal y actualizar UI inmediatamente
        const servicioTemporal = {
            id: Date.now(), // ID temporal
            cuarto_id: parseInt(datos.cuarto_id),
            tipo: datos.tipo,
            descripcion: datos.descripcion,
            hora: datos.hora,
            dia_alerta: datos.dia_alerta,
            prioridad: datos.prioridad,
            fecha_registro: new Date().toISOString(),
            _temporal: true // Marcar como temporal
        };

        // Agregar a array local inmediatamente
        mantenimientos.push(servicioTemporal);

        // Actualizar UI inmediatamente
        const cuartoId = parseInt(datos.cuarto_id);
        actualizarCardCuartoEnUI(cuartoId);
        mostrarAlertasYRecientes();

        // Limpiar formulario inmediatamente
        event.target.reset();
        const tipoHidden = document.getElementById('tipoHiddenLateral');
        const tipoSwitch = document.getElementById('tipoMantenimientoSwitchLateral');
        if (tipoHidden) tipoHidden.value = 'normal';
        if (tipoSwitch) tipoSwitch.checked = false;
        const alertaFieldsContainer = document.getElementById('alertaFieldsContainer');
        if (alertaFieldsContainer) alertaFieldsContainer.style.display = 'none';
        const estadoSelector = document.getElementById('estadoCuartoSelector');
        if (estadoSelector) estadoSelector.value = '';
        const pills = document.querySelectorAll('.estado-pill');
        pills.forEach(pill => pill.classList.remove('activo'));

        mostrarMensaje('✨ Servicio agregado', 'success');

        try {
            console.log('🌐 Enviando request a:', `${API_BASE_URL}/api/mantenimientos`);

            const response = await fetch(`${API_BASE_URL}/api/mantenimientos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const resultado = await response.json();
            console.log('✅ Mantenimiento registrado exitosamente:', resultado);

            // Reemplazar servicio temporal con el real
            const index = mantenimientos.findIndex(m => m.id === servicioTemporal.id);
            if (index !== -1) {
                mantenimientos[index] = resultado;
            }

            // Actualizar UI con datos reales (silenciosamente)
            actualizarCardCuartoEnUI(cuartoId);
            mostrarAlertasYRecientes();

            if (datos.tipo === 'rutina') {
                setTimeout(() => verificarYEmitirAlertas(), 500);
            }

        } catch (error) {
            console.error('❌ Error al registrar mantenimiento:', error);

            // ⚡ ROLLBACK: Remover servicio temporal si falla
            const index = mantenimientos.findIndex(m => m.id === servicioTemporal.id);
            if (index !== -1) {
                mantenimientos.splice(index, 1);
            }

            // Actualizar UI para reflejar el rollback
            actualizarCardCuartoEnUI(cuartoId);
            mostrarAlertasYRecientes();

            mostrarMensaje(`❌ Error al registrar: ${error.message}`, 'error');
        }
    }

    /**
     * Formatear fecha para mostrar
     */
    function formatearFecha(fecha) {
        if (!fecha) return '';

        // Si es formato YYYY-MM-DD, parsearlo manualmente para evitar problemas de zona horaria
        if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            const [year, month, day] = fecha.split('-').map(Number);
            const fechaLocal = new Date(year, month - 1, day);
            return fechaLocal.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }

        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Formatear fecha completa con hora
     */
    function formatearFechaCompleta(fecha) {
        if (!fecha) return '';
        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Formatear fecha corta (dd/mm)
     */
    function formatearFechaCorta(fecha) {
        if (!fecha) return '';

        // Si es formato YYYY-MM-DD, parsearlo manualmente para evitar problemas de zona horaria
        if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            const [year, month, day] = fecha.split('-').map(Number);
            const fechaLocal = new Date(year, month - 1, day);
            return fechaLocal.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit'
            });
        }

        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit'
        });
    }

    /**
     * Formatear hora
     */
    function formatearHora(hora) {
        if (!hora) return '';

        // Si es un timestamp completo (ISO string), extraer solo la hora
        if (hora.includes('T') || hora.includes('-')) {
            try {
                const fecha = new Date(hora);
                if (isNaN(fecha.getTime())) {
                    return 'Hora inválida';
                }
                return fecha.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            } catch (error) {
                console.error('Error formateando timestamp:', error, hora);
                return 'Hora inválida';
            }
        }

        // Si es solo hora (formato HH:mm), usar el comportamiento original
        try {
            return new Date('1970-01-01 ' + hora).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formateando hora:', error, hora);
            return 'Hora inválida';
        }
    }

    /**
     * Formatear día de alerta (fecha en formato "día de mes")
     */
    function formatearDiaAlerta(fecha) {
        if (!fecha) return '';

        // Si es un número (día del mes), crear una fecha para el mes actual
        if (typeof fecha === 'number' || (!isNaN(parseInt(fecha)) && !String(fecha).includes('-'))) {
            const diaNum = parseInt(fecha);
            const hoy = new Date();
            const fechaAlerta = new Date(hoy.getFullYear(), hoy.getMonth(), diaNum);
            const dia = fechaAlerta.getDate();
            const mes = fechaAlerta.toLocaleDateString('es-ES', { month: 'long' });
            return `${dia} de ${mes}`;
        }

        // Si es una fecha completa (YYYY-MM-DD o timestamp)
        try {
            // Si es formato YYYY-MM-DD, parsearlo manualmente para evitar problemas de zona horaria
            if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
                const [year, month, day] = fecha.split('-').map(Number);
                const fechaObj = new Date(year, month - 1, day); // month - 1 porque los meses en JS son 0-indexed
                const dia = fechaObj.getDate();
                const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' });
                return `${dia} de ${mes}`;
            }

            // Para otros formatos, usar Date constructor
            const fechaObj = new Date(fecha);
            if (!isNaN(fechaObj.getTime())) {
                const dia = fechaObj.getDate();
                const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' });
                return `${dia} de ${mes}`;
            }
        } catch (error) {
            console.error('Error formateando fecha de alerta:', error, fecha);
        }

        return fecha;
    }

    /**
     * Escapar HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Mostrar edición inline
     */
    window.mostrarEdicionInline = function (mantenimientoId) {
        const mantenimiento = document.getElementById(`mantenimiento-${mantenimientoId}`);
        if (!mantenimiento) return;

        const vista = mantenimiento.querySelector('.vista-mantenimiento');
        const edicion = mantenimiento.querySelector('.edicion-inline-mantenimiento');

        vista.style.display = 'none';
        edicion.style.display = 'block';
    };

    /**
     * Ocultar edición inline
     */
    window.ocultarEdicionInline = function (mantenimientoId) {
        const mantenimiento = document.getElementById(`mantenimiento-${mantenimientoId}`);
        if (!mantenimiento) return;

        const vista = mantenimiento.querySelector('.vista-mantenimiento');
        const edicion = mantenimiento.querySelector('.edicion-inline-mantenimiento');

        vista.style.display = 'block';
        edicion.style.display = 'none';
    };

    /**
     * Guardar mantenimiento inline
     */
    window.guardarMantenimientoInline = async function (mantenimientoId) {
        const mantenimiento = document.getElementById(`mantenimiento-${mantenimientoId}`);
        if (!mantenimiento) return;

        const descripcion = mantenimiento.querySelector('.input-editar-descripcion').value;
        const dia = mantenimiento.querySelector('.input-editar-dia')?.value;
        const hora = mantenimiento.querySelector('.input-editar-hora')?.value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${mantenimientoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    descripcion,
                    dia_alerta: dia,
                    hora
                })
            });

            if (!response.ok) throw new Error('Error al actualizar');

            console.log('✅ Mantenimiento actualizado en BD');

            // Marcar alertas pasadas como emitidas (por si la nueva fecha/hora ya pasó)
            await marcarAlertasPasadasComoEmitidas();

            // Recargar datos y actualizar vista
            await cargarDatos();
            mostrarCuartos();
            mostrarAlertasYRecientes();

            // Actualizar paneles de alertas emitidas
            await mostrarAlertasEmitidas();
            await mostrarHistorialAlertas();

            mostrarMensaje('Mantenimiento actualizado', 'success');

        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('Error al actualizar mantenimiento', 'error');
        }
    };

    /**
     * Mostrar mensaje al usuario
     */
    function mostrarMensaje(mensaje, tipo = 'info') {
        // Crear elemento de mensaje
        const div = document.createElement('div');
        div.className = `mensaje mensaje-${tipo}`;
        div.textContent = mensaje;
        div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        background-color: ${tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#f44336' : '#2196F3'};
    `;

        document.body.appendChild(div);

        // Eliminar después de 3 segundos
        setTimeout(() => {
            div.remove();
        }, 3000);
    }

    /**
     * Mostrar error crítico
     */
    function mostrarError(mensaje) {
        const contenedor = document.querySelector('.contenedor');
        if (contenedor) {
            contenedor.innerHTML = `
            <div class="error-critico" style="text-align: center; padding: 50px; color: #f44336;">
                <h2>Error de Conexión</h2>
                <p>${mensaje}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
        }
    }

    /**
     * Función global para manejar el cambio del switch de tipo de mantenimiento
     * (debe estar disponible globalmente para el HTML)
     * Esta función es un respaldo, pero la principal está en index.html
     */
    window.handleTipoSwitchChange = function (switchElement) {
        const tipoHidden = document.getElementById('tipoHiddenLateral');
        const alertaFields = document.getElementById('alertaFieldsContainer');

        if (!alertaFields) {
            console.warn('⚠️ alertaFieldsContainer no encontrado, usando función de respaldo');
            return;
        }

        if (switchElement.checked) {
            // Modo ALERTA - MOSTRAR campos
            if (tipoHidden) tipoHidden.value = 'rutina';
            alertaFields.classList.add('show');
            alertaFields.style.display = 'block';

            // Hacer los campos requeridos cuando es alerta
            const horaInput = document.getElementById('horaRutinaLateral');
            const fechaInput = document.getElementById('diaAlertaLateral');
            if (horaInput) horaInput.setAttribute('required', 'required');
            if (fechaInput) fechaInput.setAttribute('required', 'required');
        } else {
            // Modo AVERÍA - OCULTAR campos
            if (tipoHidden) tipoHidden.value = 'normal';
            alertaFields.classList.remove('show');
            alertaFields.style.display = 'none';

            // Remover atributo required cuando es avería
            const horaInput = document.getElementById('horaRutinaLateral');
            const fechaInput = document.getElementById('diaAlertaLateral');
            if (horaInput) horaInput.removeAttribute('required');
            if (fechaInput) fechaInput.removeAttribute('required');
        }
    };

    // Hacer algunas funciones disponibles globalmente para debugging
    window.appDebug = {
        cuartos: () => cuartos,
        mantenimientos: () => mantenimientos,
        edificios: () => edificios,
        seleccionarCuarto: seleccionarCuarto,
        recargarDatos: async () => {
            console.log('🔄 Recargando datos manualmente...');
            await cargarDatos();
            mostrarCuartos();
            cargarCuartosEnSelect();
            mostrarAlertasYRecientes();
            console.log('✅ Datos recargados');
        },
        verificarAlertas: () => verificarYEmitirAlertas(),
        alertasEmitidas: () => Array.from(alertasEmitidas)
    };

    // Exponer funciones utilizadas por atributos inline
    window.seleccionarCuarto = seleccionarCuarto;
    window.seleccionarCuartoDesdeSelect = seleccionarCuartoDesdeSelect;

    function scrollToElement(id, isEspacio) {
        if (isEspacio) {
            const tabButton = document.querySelector(`button[data-tab="espacios"]`);
            if (tabButton) {
                tabButton.click();
                setTimeout(() => {
                    const elemento = document.querySelector(`[data-espacio-id="${id}"]`);
                    if (elemento) {
                        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        elemento.classList.add('highlight');
                        setTimeout(() => elemento.classList.remove('highlight'), 2000);
                    }
                }, 200); // give time for the tab to switch
            }
        } else {
            // scrollToCuarto is defined in app-loader-habitaciones.js and attached to window
            if (window.scrollToCuarto) {
                window.scrollToCuarto(id);
            }
        }
    }
    window.scrollToElement = scrollToElement;

    /**
     * SISTEMA DE NOTIFICACIONES AUTOMÁTICAS
     */

    /**
     * Iniciar el sistema de notificaciones automáticas
     */
    function iniciarSistemaNotificaciones() {
        console.log('🔔 Iniciando sistema de notificaciones automáticas');

        // Solicitar permisos de notificación
        solicitarPermisosNotificacion();

        // Verificar alertas cada 30 segundos
        if (intervalosNotificaciones) {
            clearInterval(intervalosNotificaciones);
        }

        intervalosNotificaciones = setInterval(() => {
            verificarYEmitirAlertas();
        }, 30000); // 30 segundos

        // Verificar inmediatamente
        setTimeout(() => verificarYEmitirAlertas(), 2000);

        console.log('✅ Sistema de notificaciones iniciado');
    }

    /**
     * Solicitar permisos de notificación del navegador
     */
    async function solicitarPermisosNotificacion() {
        try {
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    console.log('Permisos de notificación:', permission);
                }
            }
        } catch (error) {
            console.warn('Error solicitando permisos de notificación:', error);
        }
    }

    /**
     * Verificar alertas pendientes y emitir notificaciones
     */
    async function verificarYEmitirAlertas() {
        try {
            const ahora = new Date();
            const horaActual = ahora.toTimeString().slice(0, 5); // HH:MM
            // Usar fecha local en lugar de UTC
            const fechaActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

            console.log(`🕒 Verificando alertas - ${fechaActual} ${horaActual}`);

            // Debug: mostrar todas las rutinas disponibles
            const todasLasRutinas = mantenimientos.filter(m => m.tipo === 'rutina');
            console.log(`📅 Total rutinas: ${todasLasRutinas.length}`, todasLasRutinas.map(r => {
                const fechaAlerta = r.dia_alerta?.includes('T') ? r.dia_alerta.split('T')[0] : r.dia_alerta;
                return `ID${r.id}(${fechaAlerta} ${r.hora})`;
            }));

            // Filtrar alertas que deben notificarse ahora
            const alertasPorNotificar = mantenimientos.filter(m => {
                if (m.tipo !== 'rutina' || !m.dia_alerta || !m.hora) {
                    return false;
                }

                // Verificar si ya fue emitida
                if (m.alerta_emitida || alertasEmitidas.has(m.id)) {
                    return false;
                }

                // Extraer solo la fecha de dia_alerta (puede venir como timestamp o como fecha)
                const fechaAlerta = m.dia_alerta.includes('T') ? m.dia_alerta.split('T')[0] : m.dia_alerta;

                // Verificar si es el día correcto
                if (fechaAlerta !== fechaActual) {
                    return false;
                }

                // Verificar si es la hora correcta (comparar solo HH:MM sin segundos)
                const horaAlerta = m.hora.slice(0, 5); // Extraer solo HH:MM
                const coincide = horaAlerta === horaActual;

                if (coincide) {
                    console.log(`✅ Alerta ID${m.id} coincide: ${fechaAlerta} ${horaAlerta} === ${fechaActual} ${horaActual}`);
                }

                return coincide;
            });

            console.log(`📢 Alertas por notificar: ${alertasPorNotificar.length}`);

            // Emitir notificaciones para cada alerta
            for (const alerta of alertasPorNotificar) {
                await emitirNotificacionAlerta(alerta);
            }

        } catch (error) {
            console.error('Error verificando alertas:', error);
        }
    }

    /**
     * Emitir notificación para una alerta específica
     */
    async function emitirNotificacionAlerta(alerta) {
        try {
            console.log(`🚨 Emitiendo alerta para:`, alerta);

            // Marcar inmediatamente en memoria para evitar duplicados
            alertasEmitidas.add(alerta.id);

            // Marcar como emitida en la base de datos usando PATCH /emitir
            try {
                const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${alerta.id}/emitir`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.error(`❌ Error marcando alerta ${alerta.id} como emitida:`, response.status);
                } else {
                    console.log(`✅ Alerta ${alerta.id} marcada como emitida en BD`);
                }
            } catch (error) {
                console.error(`❌ Error actualizando alerta ${alerta.id}:`, error);
            }

            // Obtener información de la ubicación (cuarto o espacio)
            const isEspacioComun = !!alerta.espacio_comun_id;
            const ubicacionId = isEspacioComun ? alerta.espacio_comun_id : alerta.cuarto_id;
            let nombreUbicacion, edificio, nombreEdificio;

            if (isEspacioComun) {
                const espacio = window.appLoaderState.espaciosComunes.find(e => e.id === ubicacionId);
                nombreUbicacion = espacio ? espacio.nombre : `Espacio ${ubicacionId}`;
                edificio = espacio ? edificios.find(e => e.id === espacio.edificio_id) : null;
                nombreEdificio = edificio ? edificio.nombre : '';
            } else {
                const cuarto = cuartos.find(c => c.id === ubicacionId);
                nombreUbicacion = cuarto ? (cuarto.nombre || cuarto.numero) : `Cuarto ${ubicacionId}`;
                edificio = cuarto ? edificios.find(e => e.id === cuarto.edificio_id) : null;
                nombreEdificio = edificio ? edificio.nombre : '';
            }

            const titulo = `🔔 Alerta de Mantenimiento`;
            const mensaje = `${nombreUbicacion}${nombreEdificio ? ` (${nombreEdificio})` : ''}\n${alerta.descripcion}`;

            // Reproducir sonido (con manejo de restricciones)
            reproducirSonidoAlerta();

            // Mostrar notificación del navegador
            mostrarNotificacionNavegador(titulo, mensaje, alerta);

            // Actualizar inmediatamente la interfaz
            mostrarAlertasEmitidas();
            mostrarHistorialAlertas();

            // Recargar datos después de un momento para reflejar cambios de BD
            setTimeout(async () => {
                await cargarDatos();
                mostrarAlertasEmitidas();
                mostrarHistorialAlertas();
            }, 1000);

            console.log(`✅ Alerta emitida correctamente para ${nombreCuarto} (ID: ${alerta.id})`);

        } catch (error) {
            console.error('Error emitiendo notificación:', error);
        }
    }

    /**
     * Reproducir sonido de alerta
     */
    function reproducirSonidoAlerta() {
        try {
            console.log('🔊 Intentando reproducir sonido de alerta...');
            const audio = new Audio('sounds/alert.mp3');
            audio.volume = 0.7;

            // Log cuando el archivo carga
            audio.addEventListener('canplaythrough', () => {
                console.log('✅ Archivo de audio cargado correctamente');
            });

            audio.addEventListener('error', (e) => {
                console.error('❌ Error cargando archivo de audio:', e);
                console.error('Ruta intentada: sounds/alert.mp3');
            });

            // Intentar reproducir con manejo mejorado de errores
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('🔊 Sonido de alerta reproducido correctamente');
                    // Marcar que ya hubo interacción de audio exitosa
                    window.audioInteractionEnabled = true;
                }).catch(error => {
                    console.warn('⚠️ No se pudo reproducir el sonido automáticamente:', error.message);
                    console.warn('Tipo de error:', error.name);
                    // Solo mostrar el mensaje visual si es por restricción de autoplay
                    if (error.name === 'NotAllowedError') {
                        mostrarMensajeAudioBloqueado();
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error reproduciendo sonido:', error);
        }
    }

    /**
     * Mostrar mensaje cuando el audio está bloqueado
     */
    function mostrarMensajeAudioBloqueado() {
        // Crear un elemento visual temporal para indicar que hay una alerta
        const alertaBloqueada = document.createElement('div');
        alertaBloqueada.innerHTML = '🔊 ¡ALERTA DE MANTENIMIENTO! (Click para activar sonido)';
        alertaBloqueada.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: linear-gradient(135deg, #ff6b6b, #ff8e3c);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 1001;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
        animation: pulseAlert 1.5s infinite;
        font-size: 14px;
    `;

        // Añadir animación CSS
        if (!document.getElementById('alertAnimationCSS')) {
            const style = document.createElement('style');
            style.id = 'alertAnimationCSS';
            style.textContent = `
            @keyframes pulseAlert {
                0% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(1); opacity: 0.9; }
            }
        `;
            document.head.appendChild(style);
        }

        // Al hacer click, activar audio y cerrar mensaje
        alertaBloqueada.addEventListener('click', () => {
            const audio = new Audio('sounds/alert.mp3');
            audio.volume = 0.7;
            audio.play().then(() => {
                console.log('🔊 Audio activado por interacción del usuario');
            }).catch(console.warn);
            alertaBloqueada.remove();
        });

        document.body.appendChild(alertaBloqueada);

        // Auto-eliminar después de 8 segundos
        setTimeout(() => {
            if (alertaBloqueada.parentNode) {
                alertaBloqueada.remove();
            }
        }, 8000);
    }

    /**
     * Mostrar notificación del navegador
     */
    function mostrarNotificacionNavegador(titulo, mensaje, alerta) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                const notification = new Notification(titulo, {
                    body: mensaje,
                    icon: 'icons/icon-192x192.png',
                    badge: 'icons/icon-192x192.png',
                    requireInteraction: true,
                    tag: `alerta-${alerta.id}` // Para evitar duplicados
                });

                notification.onclick = function () {
                    window.focus();
                    const isEspacioComun = !!alerta.espacio_comun_id;
                    const ubicacionId = isEspacioComun ? alerta.espacio_comun_id : alerta.cuarto_id;
                    scrollToElement(ubicacionId, isEspacioComun);
                    notification.close();
                };

                // Auto-cerrar después de 10 segundos
                setTimeout(() => {
                    notification.close();
                }, 10000);

            } else {
                // Fallback: mostrar alert del navegador
                alert(`${titulo}\n\n${mensaje}`);
            }
        } catch (error) {
            console.warn('Error mostrando notificación del navegador:', error);
            // Fallback final
            alert(`${titulo}\n\n${mensaje}`);
        }
    }

    /**
     * Marcar alerta como emitida en la base de datos
     */
    async function marcarAlertaComoEmitida(alertaId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${alertaId}/emitir`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error marcando alerta como emitida');
            }

            console.log(`✅ Alerta ${alertaId} marcada como emitida en BD`);

            return true; // Indicar éxito

        } catch (error) {
            console.error(`❌ Error marcando alerta ${alertaId} como emitida:`, error);
            throw error;
        }
    }

    /**
     * Detener sistema de notificaciones (útil para debugging)
     */
    function detenerSistemaNotificaciones() {
        if (intervalosNotificaciones) {
            clearInterval(intervalosNotificaciones);
            intervalosNotificaciones = null;
            console.log('🔕 Sistema de notificaciones detenido');
        }
    }

    // Exponer funciones de notificaciones para debugging
    window.notificationDebug = {
        iniciar: iniciarSistemaNotificaciones,
        detener: detenerSistemaNotificaciones,
        verificar: verificarYEmitirAlertas,
        alertasEmitidas: () => Array.from(alertasEmitidas)
    };

    /**
     * FUNCIONES PARA MODAL DE DETALLES DE SERVICIOS
     */

    function lockBodyScroll() {
        document.body.classList.add('modal-open');
    }

    function unlockBodyScrollIfNoModal() {
        const modalVisible = Array.from(document.querySelectorAll('.modal-detalles'))
            .some(modal => window.getComputedStyle(modal).display !== 'none');

        if (!modalVisible) {
            document.body.classList.remove('modal-open');
        }
    }

    /**
     * Abrir modal de detalle de un servicio específico
     */
    window.abrirModalDetalleServicio = function (servicioId, desdeLista = false) {
        let servicio = mantenimientos.find(m => m.id === servicioId);

        // Si no se encuentra en mantenimientos de cuartos, buscar en espacios comunes
        if (!servicio && typeof window.appLoaderState.mantenimientosEspacios !== 'undefined') {
            servicio = window.appLoaderState.mantenimientosEspacios.find(m => m.id === servicioId);
        }

        if (!servicio) {
            console.error('Servicio no encontrado:', servicioId);
            return;
        }

        let nombreUbicacion = '';
        let labelUbicacion = 'Habitación';
        let iconUbicacion = 'fa-door-closed';

        if (servicio.espacio_comun_id) {
            const espacio = window.appLoaderState.espaciosComunes.find(e => e.id === servicio.espacio_comun_id);
            nombreUbicacion = espacio ? espacio.nombre : `Espacio ${servicio.espacio_comun_id}`;
            labelUbicacion = 'Espacio Común';
            iconUbicacion = 'fa-building';
        } else {
            const cuarto = cuartos.find(c => c.id === servicio.cuarto_id);
            nombreUbicacion = cuarto ? (cuarto.nombre || cuarto.numero) : `Cuarto ${servicio.cuarto_id}`;
        }

        const modal = document.getElementById('modalDetallesServicio');
        const titulo = document.getElementById('modalDetallesTitulo');
        const body = document.getElementById('modalDetallesBody');

        const esAlerta = servicio.tipo === 'rutina';

        // Generar contenido del modal
        let contenido = `
        <div class="detalle-item">
            <div class="detalle-label"><i class="fas ${iconUbicacion}"></i> ${labelUbicacion}</div>
            <div class="detalle-valor">${escapeHtml(nombreUbicacion)}</div>
        </div>
        
        <div class="detalle-item">
            <div class="detalle-label"><i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i> Tipo de Servicio</div>
            <div class="detalle-valor">${esAlerta ? 'Alerta Programada' : 'Avería'}</div>
        </div>
        
        <div class="detalle-item">
            <div class="detalle-label"><i class="fas fa-align-left"></i> Descripción</div>
            <div class="detalle-valor">${escapeHtml(servicio.descripcion)}</div>
        </div>
    `;

        // Mostrar estado si existe
        if (servicio.estado) {
            const estadoTexto = {
                'pendiente': 'Pendiente',
                'en_proceso': 'En Proceso',
                'completado': 'Completado',
                'cancelado': 'Cancelado'
            }[servicio.estado] || 'Pendiente';

            contenido += `
            <div class="detalle-item">
                <div class="detalle-label"><i class="fas fa-tasks"></i> Estado</div>
                <div class="detalle-valor">
                    <span class="estado-badge estado-${servicio.estado}">${estadoTexto}</span>
                </div>
            </div>
        `;
        }

        // Mostrar usuario creador si existe
        if (servicio.usuario_creador_id) {
            const usuarioCreador = usuarios.find(u => u.id === servicio.usuario_creador_id);
            const nombreCreador = usuarioCreador ? usuarioCreador.nombre : `Usuario #${servicio.usuario_creador_id}`;
            contenido += `
            <div class="detalle-item">
                <div class="detalle-label"><i class="fas fa-user-plus"></i> Registrado por</div>
                <div class="detalle-valor">${escapeHtml(nombreCreador)}</div>
            </div>
        `;
        }

        // Mostrar usuario asignado si existe
        if (servicio.usuario_asignado_id) {
            const usuarioAsignado = usuarios.find(u => u.id === servicio.usuario_asignado_id);
            const nombreAsignado = usuarioAsignado ? `${usuarioAsignado.nombre} (${usuarioAsignado.rol_nombre || 'Usuario'})` : `Usuario #${servicio.usuario_asignado_id}`;
            contenido += `
            <div class="detalle-item">
                <div class="detalle-label"><i class="fas fa-user-tag"></i> Personal Asignado</div>
                <div class="detalle-valor">${escapeHtml(nombreAsignado)}</div>
            </div>
        `;
        }

        // Mostrar notas si existen
        if (servicio.notas && servicio.notas.trim()) {
            contenido += `
            <div class="detalle-item">
                <div class="detalle-label"><i class="fas fa-sticky-note"></i> Notas Adicionales</div>
                <div class="detalle-valor" style="white-space: pre-wrap;">${escapeHtml(servicio.notas)}</div>
            </div>
        `;
        }

        // Mostrar fecha de creación
        if (servicio.fecha_creacion) {
            contenido += `
            <div class="detalle-item">
                <div class="detalle-label"><i class="fas fa-calendar-plus"></i> Fecha de Creación</div>
                <div class="detalle-valor">${formatearFechaCompleta(servicio.fecha_creacion)}</div>
            </div>
        `;
        }

        // Mostrar fecha de finalización si existe
        if (servicio.fecha_finalizacion) {
            contenido += `
            <div class="detalle-item">
                <div class="detalle-label"><i class="fas fa-check-circle"></i> Finalizado el</div>
                <div class="detalle-valor">${formatearFechaCompleta(servicio.fecha_finalizacion)}</div>
            </div>
        `;
        }

        // Mostrar prioridad si existe (para todos los tipos de servicio)
        if (servicio.prioridad) {
            const prioridadTexto = {
                'baja': 'Baja',
                'media': 'Media',
                'alta': 'Alta',
                'urgente': 'Urgente'
            }[servicio.prioridad] || 'Media';

            contenido += `
            <div class="detalle-item">
                <div class="detalle-label"><i class="fas fa-traffic-light"></i> Prioridad</div>
                <div class="detalle-valor">
                    <div class="nivel-alerta-badge nivel-alerta-${servicio.prioridad}">
                        <span class="semaforo-indicator"></span>
                        ${prioridadTexto}
                    </div>
                </div>
            </div>
        `;
        }

        // Si es alerta, mostrar fecha y hora
        if (esAlerta) {
            if (servicio.dia_alerta || servicio.hora) {
                contenido += `
                <div class="detalle-fecha-hora">
                    ${servicio.dia_alerta ? `
                        <div class="detalle-item">
                            <div class="detalle-label"><i class="fas fa-calendar-alt"></i> Día de Alerta</div>
                            <div class="detalle-valor">${formatearDiaAlerta(servicio.dia_alerta)}</div>
                        </div>
                    ` : ''}
                    ${servicio.hora ? `
                        <div class="detalle-item">
                            <div class="detalle-label"><i class="fas fa-clock"></i> Hora de Alerta</div>
                            <div class="detalle-valor">${formatearHora(servicio.hora)}</div>
                        </div>
                    ` : ''}
                </div>
            `;
            }
        }

        // Fecha de registro
        if (servicio.fecha_registro) {
            contenido += `
            <div class="detalle-item">
                <div class="detalle-label"><i class="far fa-calendar-plus"></i> Registrado el</div>
                <div class="detalle-valor">${formatearFechaCompleta(servicio.fecha_registro)}</div>
            </div>
        `;
        }

        // Si viene desde la lista, agregar botón de volver
        let botonVolver = '';
        if (desdeLista) {
            const idVolver = servicio.espacio_comun_id || servicio.cuarto_id;
            const esEspacioVolver = !!servicio.espacio_comun_id;
            botonVolver = `
            <button class="btn-volver-lista" onclick="verDetallesServicios(${idVolver}, ${esEspacioVolver})">
                <i class="fas fa-arrow-left"></i>
            </button>
        `;
        }

        titulo.innerHTML = `
        ${botonVolver}
        <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i> Detalle del Servicio
    `;
        body.innerHTML = contenido;
        modal.style.display = 'flex';
        lockBodyScroll();

        // Animar entrada
        setTimeout(() => {
            modal.querySelector('.modal-detalles-contenido').style.opacity = '1';
        }, 10);
    };

    /**
     * Ver detalles de todos los servicios de una habitación o espacio
     */
    window.verDetallesServicios = function (id, esEspacio = false) {
        let nombreUbicacion = '';
        let serviciosUbicacion = [];
        let iconUbicacion = 'fa-door-closed';

        if (esEspacio) {
            const espacio = window.appLoaderState.espaciosComunes.find(e => e.id === id);
            nombreUbicacion = espacio ? espacio.nombre : `Espacio ${id}`;
            serviciosUbicacion = window.appLoaderState.mantenimientosEspacios.filter(m => m.espacio_comun_id === id);
            iconUbicacion = 'fa-building';
        } else {
            const cuarto = cuartos.find(c => c.id === id);
            nombreUbicacion = cuarto ? (cuarto.nombre || cuarto.numero) : `Cuarto ${id}`;
            serviciosUbicacion = mantenimientos.filter(m => m.cuarto_id === id);
        }

        const modal = document.getElementById('modalDetallesServicio');
        const titulo = document.getElementById('modalDetallesTitulo');
        const body = document.getElementById('modalDetallesBody');

        if (serviciosUbicacion.length === 0) {
            titulo.innerHTML = `<i class="fas ${iconUbicacion}"></i> ${escapeHtml(nombreUbicacion)}`;
            body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--texto-secundario);">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem; font-weight: 600;">No hay servicios registrados</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Esta ubicación no tiene servicios activos.</p>
            </div>
        `;
            modal.style.display = 'flex';
            return;
        }

        // Generar lista de todos los servicios con opción de editar y eliminar
        let contenido = serviciosUbicacion.map(servicio => {
            const esAlerta = servicio.tipo === 'rutina';
            const prioridadIndicador = servicio.prioridad ? `
            <span class="semaforo-indicator" style="
                display: inline-block;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: ${servicio.prioridad === 'alta' || servicio.prioridad === 'urgente' ? '#ff0000' : servicio.prioridad === 'media' ? '#ffff00' : '#00ff00'};
                box-shadow: 0 0 8px ${servicio.prioridad === 'alta' || servicio.prioridad === 'urgente' ? '#ff0000' : servicio.prioridad === 'media' ? '#ffff00' : '#00ff00'};
                border: 2px solid var(--negro-carbon);
                margin-left: 0.5rem;
            "></span>
        ` : '';

            return `
            <div class="detalle-item-editable">
                <div class="detalle-item-contenido" onclick="abrirModalDetalleServicio(${servicio.id}, true)">
                    <div class="detalle-label">
                        <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i> 
                        ${esAlerta ? 'Alerta' : 'Avería'}
                        ${prioridadIndicador}
                    </div>
                    <div class="detalle-valor">
                        ${escapeHtml(servicio.descripcion)}
                        ${servicio.dia_alerta || servicio.hora ? `
                            <div style="font-size: 0.85rem; color: var(--texto-secundario); margin-top: 0.3rem;">
                                ${servicio.dia_alerta ? formatearDiaAlerta(servicio.dia_alerta) : ''} 
                                ${servicio.hora ? formatearHora(servicio.hora) : ''}
                            </div>
                        ` : ''}
                    </div>
                    <i class="fas fa-chevron-right" style="color: var(--texto-secundario); font-size: 0.9rem;"></i>
                </div>
                <div class="detalle-item-acciones">
                    <button class="btn-editar-servicio" onclick="editarServicioDesdeModal(${servicio.id}, ${id}, ${esEspacio}); event.stopPropagation();" title="Editar servicio">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn-eliminar-servicio" onclick="eliminarServicioDesdeModal(${servicio.id}, ${id}, ${esEspacio}); event.stopPropagation();" title="Eliminar servicio">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');

        titulo.innerHTML = `<i class="fas ${iconUbicacion}"></i> Servicios de ${escapeHtml(nombreUbicacion)}`;
        body.innerHTML = contenido;
        modal.style.display = 'flex';
        lockBodyScroll();
    };

    /**
     * Eliminar servicio desde el modal
     */
    window.eliminarServicioDesdeModal = async function (servicioId, id, esEspacio = false) {
        if (!confirm('¿Está seguro de eliminar este servicio?')) {
            return;
        }

        const listaMantenimientos = esEspacio ? window.appLoaderState.mantenimientosEspacios : mantenimientos;

        // ⚡ ACTUALIZACIÓN OPTIMISTA: Guardar referencia para rollback
        const servicioIndex = listaMantenimientos.findIndex(m => m.id === servicioId);
        if (servicioIndex === -1) return;

        const servicioEliminado = listaMantenimientos[servicioIndex];

        // Eliminar del array local inmediatamente
        listaMantenimientos.splice(servicioIndex, 1);

        // Si es un servicio de espacio, también eliminarlo del array mantenimientos
        if (esEspacio) {
            const indexEnMantenimientos = mantenimientos.findIndex(m => m.id === servicioId);
            if (indexEnMantenimientos !== -1) {
                mantenimientos.splice(indexEnMantenimientos, 1);
            }
        }

        // Actualizar modal inmediatamente
        verDetallesServicios(id, esEspacio);

        // Actualizar card en el fondo
        if (esEspacio) {
            renderizarServiciosEspacio(id);
        } else {
            const contenedorServicios = document.getElementById(`servicios-${id}`);
            if (contenedorServicios) {
                const serviciosUbicacion = listaMantenimientos.filter(m => m.cuarto_id === id);
                contenedorServicios.innerHTML = generarServiciosHTML(serviciosUbicacion, id, false, false);
            }
        }
        mostrarAlertasYRecientes();

        mostrarMensaje('✨ Servicio eliminado', 'success');

        try {
            console.log('🗑️ Eliminando servicio desde modal:', servicioId);

            const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${servicioId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }

            console.log('✅ Servicio eliminado correctamente en servidor');

        } catch (error) {
            console.error('❌ Error eliminando servicio:', error);

            // ⚡ ROLLBACK: Restaurar servicio eliminado
            listaMantenimientos.splice(servicioIndex, 0, servicioEliminado);

            // Si es un servicio de espacio, también restaurarlo en el array mantenimientos
            if (esEspacio) {
                const indexEnMantenimientos = mantenimientos.findIndex(m => m.id === servicioId);
                if (indexEnMantenimientos === -1) {
                    // Si no existe, agregarlo
                    mantenimientos.push(servicioEliminado);
                }
            }

            // Actualizar UI para reflejar el rollback
            verDetallesServicios(id, esEspacio);
            if (esEspacio) {
                renderizarServiciosEspacio(id);
            } else {
                if (contenedorServicios) {
                    const serviciosUbicacion = listaMantenimientos.filter(m => m.cuarto_id === id);
                    contenedorServicios.innerHTML = generarServiciosHTML(serviciosUbicacion, id, false, false);
                }
            }
            mostrarAlertasYRecientes();

            mostrarMensaje('❌ Error al eliminar: ' + error.message, 'error');
        }
    };

    /**
     * Editar servicio desde el modal
     */
    window.editarServicioDesdeModal = function (servicioId, id, esEspacio = false) {
        console.log('✏️ Editando servicio desde modal:', servicioId, 'ID:', id);

        // Cerrar el modal
        cerrarModalDetalles();

        // Esperar a que el modal se cierre antes de activar la edición
        setTimeout(() => {
            // Activar modo edición en la card
            const botonEditar = document.getElementById(esEspacio ? `btn-editar-espacio-${id}` : `btn-editar-${id}`);
            if (botonEditar && !botonEditar.classList.contains('modo-edicion-activo')) {
                // Si no está en modo edición, activarlo
                if (esEspacio) {
                    toggleModoEdicionEspacio(id);
                } else {
                    toggleModoEdicion(id);
                }
            }

            // Esperar un poco más para que se renderice el modo edición
            setTimeout(() => {
                // IMPORTANTE: Expandir TODOS los servicios en modo edición
                if (esEspacio) {
                    renderizarServiciosEspacio(id);

                    // Activar edición del servicio específico
                    setTimeout(() => {
                        activarEdicionServicio(servicioId, id, esEspacio);
                    }, 100);
                } else {
                    const contenedorServicios = document.getElementById(`servicios-${id}`);
                    if (contenedorServicios) {
                        const listaMantenimientos = esEspacio ? window.appLoaderState.mantenimientosEspacios : mantenimientos;
                        const serviciosUbicacion = listaMantenimientos.filter(m => esEspacio ? m.espacio_comun_id === id : m.cuarto_id === id);

                        // Regenerar con TODOS los servicios (sin límite de 2)
                        let html = serviciosUbicacion.map(servicio => {
                            const esAlerta = servicio.tipo === 'rutina';

                            let fechaHoraMostrar = '';
                            if (esAlerta && (servicio.dia_alerta || servicio.hora)) {
                                const diaAlerta = servicio.dia_alerta ? formatearDiaAlerta(servicio.dia_alerta) : '';
                                const horaAlerta = servicio.hora ? formatearHora(servicio.hora) : '';
                                fechaHoraMostrar = `<span><i class="far fa-clock"></i> ${diaAlerta} ${horaAlerta}</span>`;
                            } else if (servicio.fecha_registro) {
                                fechaHoraMostrar = `<span><i class="far fa-clock"></i> ${formatearFechaCorta(servicio.fecha_registro)}</span>`;
                            }

                            return `
                            <div class="servicio-item-wrapper modo-edicion" data-servicio-id="${servicio.id}">
                                <div class="servicio-item ${esAlerta ? 'servicio-alerta' : ''}" onclick="activarEdicionServicio(${servicio.id}, ${id})" style="cursor: pointer;">
                                    <div class="servicio-info">
                                        <div class="servicio-descripcion">${escapeHtml(servicio.descripcion)}</div>
                                        <div class="servicio-meta">
                                            <span class="servicio-tipo-badge">
                                                <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i>
                                                ${esAlerta ? 'Alerta' : 'Avería'}
                                            </span>
                                            ${fechaHoraMostrar}
                                        </div>
                                    </div>
                                    <i class="fas fa-pen" style="color: var(--texto-secundario); font-size: 1rem;"></i>
                                </div>
                                <button class="btn-eliminar-inline" onclick="eliminarServicioInline(${servicio.id}, ${id}); event.stopPropagation();" title="Eliminar servicio">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        `;
                        }).join('');

                        contenedorServicios.innerHTML = html;

                        // Activar edición del servicio específico
                        setTimeout(() => {
                            activarEdicionServicio(servicioId, id);
                        }, 100);
                    }
                }

                // Hacer scroll a la card
                const selector = esEspacio ? `[data-espacio-id="${id}"]` : `[data-cuarto-id="${id}"]`;
                const card = document.querySelector(selector);
                if (card) {
                    card.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });

                    card.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                    }, 1500);
                }
            }, 300);
        }, 200);
    };

    /**
     * Cerrar modal de detalles
     */
    window.cerrarModalDetalles = function () {
        const modal = document.getElementById('modalDetallesServicio');
        const contenido = modal.querySelector('.modal-detalles-contenido');

        // Animar salida
        contenido.style.opacity = '0';
        contenido.style.transform = 'translateY(30px)';

        setTimeout(() => {
            modal.style.display = 'none';
            contenido.style.opacity = '1';
            contenido.style.transform = 'translateY(0)';
            unlockBodyScrollIfNoModal();
        }, 200);
    };

    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modalDetallesServicio');
            if (modal && modal.style.display === 'flex') {
                cerrarModalDetalles();
            }
        }
    });

    /**
     * FUNCIONES PARA EDICIÓN INLINE DE SERVICIOS
     */

    /**
     * Alternar modo de edición para una habitación
     */
    window.toggleModoEdicion = function (cuartoId) {
        const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
        const botonEditar = document.getElementById(`btn-editar-${cuartoId}`);
        const contenedorEditarEstadoInline = document.getElementById(`estado-selector-inline-id-${cuartoId}`)

        if (!contenedorServicios || !botonEditar) return;

        // Verificar si ya está en modo edición
        const enModoEdicion = botonEditar.classList.contains('modo-edicion-activo');

        if (enModoEdicion) {
            // Desactivar modo edición
            contenedorEditarEstadoInline.style.display = "none"
            botonEditar.classList.remove('modo-edicion-activo');
            botonEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';

            // Regenerar servicios en modo normal
            const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === cuartoId);
            contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, cuartoId, false);
        } else {
            // Activar modo edición
            contenedorEditarEstadoInline.style.display = "block"
            botonEditar.classList.add('modo-edicion-activo');
            botonEditar.innerHTML = '<i class="fas fa-check"></i> Listo';

            // Regenerar servicios en modo edición
            const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === cuartoId);
            contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, cuartoId, true);
        }
    };

    /**
     * Activar edición de un servicio específico inline
     */
    window.activarEdicionServicio = function (servicioId, id, esEspacio = false) {
        const listaMantenimientos = esEspacio ? window.appLoaderState.mantenimientosEspacios : mantenimientos;
        const servicio = listaMantenimientos.find(m => m.id === servicioId);
        if (!servicio) return;

        const wrapper = document.querySelector(`.servicio-item-wrapper[data-servicio-id="${servicioId}"]`);
        if (!wrapper) return;

        const esAlerta = servicio.tipo === 'rutina';

        // Normalizar formato de fecha para el input date (YYYY-MM-DD)
        let diaAlertaFormatted = '';
        if (servicio.dia_alerta) {
            try {
                const fecha = new Date(servicio.dia_alerta);
                if (!isNaN(fecha.getTime())) {
                    // Formatear como YYYY-MM-DD para el input date
                    const year = fecha.getFullYear();
                    const month = String(fecha.getMonth() + 1).padStart(2, '0');
                    const day = String(fecha.getDate()).padStart(2, '0');
                    diaAlertaFormatted = `${year}-${month}-${day}`;
                }
            } catch (e) {
                console.error('Error formateando dia_alerta:', e);
            }
        }

        // Generar opciones de usuarios
        const opcionesUsuarios = usuarios.map(u =>
            `<option value="${u.id}" ${servicio.usuario_asignado_id === u.id ? 'selected' : ''}>${u.nombre}${u.rol_nombre ? ` (${u.rol_nombre})` : ''}</option>`
        ).join('');

        // Generar formulario de edición inline
        wrapper.innerHTML = `
        <div class="servicio-form-inline ${esAlerta ? 'servicio-alerta' : ''}">
            <div class="form-inline-header">
                <span class="servicio-tipo-badge">
                    <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i>
                    ${esAlerta ? 'Alerta' : 'Avería'}
                </span>
            </div>
            
            <input 
                type="text" 
                class="input-edicion-inline" 
                id="edit-desc-${servicioId}" 
                value="${escapeHtml(servicio.descripcion)}"
                placeholder="Descripción"
            />
            
            ${esAlerta ? `
                <div class="form-inline-row">
                    <input 
                        type="date" 
                        class="input-edicion-inline input-small" 
                        id="edit-dia-${servicioId}" 
                        value="${diaAlertaFormatted}"
                    />
                    <input 
                        type="time" 
                        class="input-edicion-inline input-small" 
                        id="edit-hora-${servicioId}" 
                        value="${servicio.hora || ''}"
                    />
                </div>
            ` : ''}
            
            <select class="input-edicion-inline" id="edit-estado-${servicioId}">
                <option value="pendiente" ${servicio.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="en_proceso" ${servicio.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                <option value="completado" ${servicio.estado === 'completado' ? 'selected' : ''}>Completado</option>
                <option value="cancelado" ${servicio.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
            
            <select class="input-edicion-inline" id="edit-usuario-${servicioId}">
                <option value="">-- Sin asignar --</option>
                ${opcionesUsuarios}
            </select>
            
            <textarea 
                class="input-edicion-inline" 
                id="edit-notas-${servicioId}" 
                placeholder="Notas adicionales (opcional)"
                rows="2"
                style="resize: vertical; font-family: inherit;">${servicio.notas || ''}</textarea>
            
            <div class="semaforo-edicion-inline">
                <label class="semaforo-label-inline ${servicio.prioridad === 'baja' ? 'active' : ''}">
                    <input type="radio" name="prioridad-${servicioId}" value="baja" ${servicio.prioridad === 'baja' || !servicio.prioridad ? 'checked' : ''}>
                    <span class="semaforo-circle green"></span>
                </label>
                <label class="semaforo-label-inline ${servicio.prioridad === 'media' ? 'active' : ''}">
                    <input type="radio" name="prioridad-${servicioId}" value="media" ${servicio.prioridad === 'media' ? 'checked' : ''}>
                    <span class="semaforo-circle yellow"></span>
                </label>
                <label class="semaforo-label-inline ${servicio.prioridad === 'alta' ? 'active' : ''}">
                    <input type="radio" name="prioridad-${servicioId}" value="alta" ${servicio.prioridad === 'alta' ? 'checked' : ''}>
                    <span class="semaforo-circle red"></span>
                </label>
            </div>

                    <!-- Botón de editar Tarea (abre modal) y Selector de Tareas para asignar (opcional) -->
            <div class="tarea-asignada-selector-inline">
                <label class="tarea-asignada-label-inline">
                    <i class="fas fa-tasks"></i> Asignar Tarea (Opcional)
                </label>
                <div class="tarea-asignada-inputs-inline" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; margin-top: 10px;">
                <button style="font-size: 0.7rem; display: flex; align-items: center; gap: 5px; flex-direction: row; flex-wrap: nowrap;" type="button" class="btn-inline btn-crear-tarea" onclick="abrirModalCrearTarea(${id})">
                    <i class="fas fa-plus"></i> Crear
                </button>
                <!-- Se deberá seleccionar la tarea asignada si el servicio tiene una tarea asignada-->
                    <select class="input-inline" id="tarea_asignada_edit-${servicioId}" name="tarea_asignada_edit-${servicioId}">
                        <option value="">-- Sin asignar existente --</option>
                        
                    </select>
                </div>
            </div>        
            
            <div class="form-inline-acciones">
                <button class="btn-form-inline btn-cancelar" onclick="cancelarEdicionServicio(${servicioId}, ${id}, ${esEspacio})">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn-form-inline btn-guardar" onclick="guardarEdicionServicio(${servicioId}, ${id}, ${esEspacio})">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    `;

        // Cargar tareas en el selector después de crear el formulario
        if (window.cargarTareasEnSelector) {
            // Usar el ID del selector y pasar el tarea_id para pre-selección
            window.cargarTareasEnSelector(`tarea_asignada_edit-${servicioId}`, servicio.tarea_id);
        }
    };

    /**
     * Cancelar edición de servicio
     */
    window.cancelarEdicionServicio = function (servicioId, id, esEspacio = false) {
        if (esEspacio) {
            renderizarServiciosEspacio(id);
        } else {
            // Regenerar la vista respetando el estado del botón de edición
            const contenedorServicios = document.getElementById(`servicios-${id}`);
            const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === id);
            // Verificar si el botón de edición está activo antes de renderizar
            const botonEditar = document.getElementById(`btn-editar-${id}`);
            const enModoEdicion = botonEditar && botonEditar.classList.contains('modo-edicion-activo');
            contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, id, enModoEdicion);
        }
    };

    /**
     * Guardar edición de servicio
     */
    window.guardarEdicionServicio = async function (servicioId, id, esEspacio = false) {
        const listaMantenimientos = esEspacio ? window.appLoaderState.mantenimientosEspacios : mantenimientos;
        const servicio = listaMantenimientos.find(m => m.id === servicioId);
        if (!servicio) return;

        const esAlerta = servicio.tipo === 'rutina';

        // Obtener valores del formulario
        const descripcion = document.getElementById(`edit-desc-${servicioId}`).value.trim();

        if (!descripcion) {
            mostrarMensaje('La descripción no puede estar vacía', 'error');
            return;
        }

        const datosActualizados = {
            descripcion: descripcion
        };

        // Obtener prioridad (para todos los servicios)
        const prioridadSeleccionada = document.querySelector(`input[name="prioridad-${servicioId}"]:checked`);
        if (prioridadSeleccionada) {
            datosActualizados.prioridad = prioridadSeleccionada.value;
        }

        // Obtener estado del mantenimiento
        const estadoInput = document.getElementById(`edit-estado-${servicioId}`);
        if (estadoInput) {
            datosActualizados.estado = estadoInput.value;
        }

        // Obtener usuario asignado
        const usuarioInput = document.getElementById(`edit-usuario-${servicioId}`);
        if (usuarioInput) {
            datosActualizados.usuario_asignado_id = usuarioInput.value || null;
        }

        // Obtener notas
        const notasInput = document.getElementById(`edit-notas-${servicioId}`);
        if (notasInput) {
            datosActualizados.notas = notasInput.value.trim() || null;
        }

        // Obtener tarea asignada
        const tareaSelector = document.querySelector(`select[name="tarea_asignada_edit-${servicioId}"]`);
        if (tareaSelector) {
            datosActualizados.tarea_id = tareaSelector.value || null;
        }

        // Si es alerta, incluir campos adicionales
        if (esAlerta) {
            const diaInput = document.getElementById(`edit-dia-${servicioId}`);
            const horaInput = document.getElementById(`edit-hora-${servicioId}`);

            const fecha = diaInput ? diaInput.value : '';
            const hora = horaInput ? horaInput.value : '';

            if (!fecha || !hora) {
                mostrarMensaje('Fecha y hora son obligatorios para alertas', 'error');
                return;
            }

            datosActualizados.dia_alerta = fecha;
            datosActualizados.hora = hora;
        }

        // ⚡ ACTUALIZACIÓN OPTIMISTA: Guardar datos originales para rollback
        const datosOriginales = { ...servicio };

        // Actualizar objeto local inmediatamente
        Object.assign(servicio, datosActualizados);

        // Actualizar UI inmediatamente
        if (esEspacio) {
            renderizarServiciosEspacio(id);
        } else {
            const contenedorServicios = document.getElementById(`servicios-${id}`);
            if (contenedorServicios) {
                const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === id);
                // Verificar si el botón de edición está activo antes de renderizar
                const botonEditar = document.getElementById(`btn-editar-${id}`);
                const enModoEdicion = botonEditar && botonEditar.classList.contains('modo-edicion-activo');
                contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, id, enModoEdicion);

                // Actualizar selectores de tareas para todos los servicios del cuarto
                serviciosCuarto.forEach(servicio => {
                    const selectorId = `tarea_asignada_edit-${servicio.id}`;
                    if (window.cargarTareasEnSelector) {
                        window.cargarTareasEnSelector(selectorId, servicio.tarea_id);
                    }
                });
            }
        }
        mostrarAlertasYRecientes();

        mostrarMensaje('✨ Servicio actualizado', 'success');

        try {
            console.log('💾 Guardando cambios del servicio:', servicioId, datosActualizados);

            // Obtener headers con autenticación (await porque es async)
            const headers = await obtenerHeadersConAuth();

            const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${servicioId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(datosActualizados)
            });

            if (!response.ok) {
                let errorDetails = `Error ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetails += `: ${errorData.error || errorData.details || JSON.stringify(errorData)}`;
                } catch (e) {
                    const errorText = await response.text();
                    errorDetails += `: ${errorText}`;
                }
                throw new Error(errorDetails);
            }

            const resultado = await response.json();
            console.log('✅ Servicio actualizado correctamente en servidor');

            // Recargar datos completos desde la API para obtener nombres de usuarios
            if (esEspacio) {
                // Para espacios, recargar y sincronizar datos
                await window.recargarMantenimientosEspacios();
                // Actualizar UI con datos frescos
                renderizarServiciosEspacio(id);
            } else {
                // Para cuartos, recargar datos generales
                await cargarDatos();

                // Actualizar UI con datos frescos
                const contenedorServiciosActualizado = document.getElementById(`servicios-${id}`);
                if (contenedorServiciosActualizado) {
                    const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === id);
                    // Verificar si el botón de edición está activo antes de renderizar
                    const botonEditar = document.getElementById(`btn-editar-${id}`);
                    const enModoEdicion = botonEditar && botonEditar.classList.contains('modo-edicion-activo');
                    contenedorServiciosActualizado.innerHTML = generarServiciosHTML(serviciosCuarto, id, enModoEdicion);

                    // Actualizar selectores de tareas para todos los servicios del cuarto
                    serviciosCuarto.forEach(servicio => {
                        const selectorId = `tarea_asignada_edit-${servicio.id}`;
                        if (window.cargarTareasEnSelector) {
                            window.cargarTareasEnSelector(selectorId, servicio.tarea_id);
                        }
                    });
                }
            }
            mostrarAlertasYRecientes();

            // Actualizar paneles de alertas
            await mostrarAlertasEmitidas();
            await mostrarHistorialAlertas();

            // 🎯 NUEVO: Verificar y actualizar estado de tarea si el servicio está asignado a una
            if (datosActualizados.tarea_id && typeof window.verificarYActualizarTareaIndividual === 'function') {
                console.log(`🔄 Verificando tarea ${datosActualizados.tarea_id} después de actualizar servicio...`);
                await window.verificarYActualizarTareaIndividual(datosActualizados.tarea_id);
            }

            // También verificar si se DESASIGNÓ de una tarea (tarea_id cambió de una tarea a otra o a null)
            if (datosOriginales.tarea_id && datosOriginales.tarea_id !== datosActualizados.tarea_id) {
                if (typeof window.verificarYActualizarTareaIndividual === 'function') {
                    console.log(`🔄 Verificando tarea anterior ${datosOriginales.tarea_id} después de reasignar servicio...`);
                    await window.verificarYActualizarTareaIndividual(datosOriginales.tarea_id);
                }
            }

        } catch (error) {
            console.error('❌ Error actualizando servicio:', error);

            // ⚡ ROLLBACK: Restaurar datos originales
            Object.assign(servicio, datosOriginales);

            // Actualizar UI para reflejar el rollback
            if (esEspacio) {
                renderizarServiciosEspacio(id);
            } else {
                if (contenedorServicios) {
                    const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === id);
                    // Verificar si el botón de edición está activo antes de renderizar
                    const botonEditar = document.getElementById(`btn-editar-${id}`);
                    const enModoEdicion = botonEditar && botonEditar.classList.contains('modo-edicion-activo');
                    contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, id, enModoEdicion);
                }
            }
            mostrarAlertasYRecientes();

            mostrarMensaje('❌ Error al actualizar: ' + error.message, 'error');
        }
    };

    /**
     * Eliminar servicio inline (desde la vista de edición)
     */
    window.eliminarServicioInline = async function (servicioId, id, esEspacio = false) {
        if (!confirm('¿Está seguro de eliminar este servicio?')) {
            return;
        }

        const listaMantenimientos = esEspacio ? window.appLoaderState.mantenimientosEspacios : mantenimientos;

        // ⚡ ACTUALIZACIÓN OPTIMISTA: Guardar referencia para rollback
        const servicioIndex = listaMantenimientos.findIndex(m => m.id === servicioId);
        if (servicioIndex === -1) return;

        const servicioEliminado = listaMantenimientos[servicioIndex];

        // Eliminar del array local inmediatamente
        listaMantenimientos.splice(servicioIndex, 1);

        // Actualizar UI inmediatamente
        if (esEspacio) {
            renderizarServiciosEspacio(id);
        } else {
            const contenedorServicios = document.getElementById(`servicios-${id}`);
            const botonEditar = document.getElementById(`btn-editar-${id}`);
            const enModoEdicion = botonEditar && botonEditar.classList.contains('modo-edicion-activo');

            if (contenedorServicios) {
                const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === id);
                contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, id, enModoEdicion);

                if (serviciosCuarto.length === 0 && botonEditar) {
                    botonEditar.classList.remove('modo-edicion-activo');
                    botonEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
                }
            }
        }
        mostrarAlertasYRecientes();

        mostrarMensaje('✨ Servicio eliminado', 'success');

        try {
            console.log('🗑️ Eliminando servicio inline:', servicioId);

            const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${servicioId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }

            console.log('✅ Servicio eliminado correctamente en servidor');

        } catch (error) {
            console.error('❌ Error eliminando servicio:', error);

            // ⚡ ROLLBACK: Restaurar servicio eliminado
            listaMantenimientos.splice(servicioIndex, 0, servicioEliminado);

            // Actualizar UI para reflejar el rollback
            if (esEspacio) {
                renderizarServiciosEspacio(id);
            } else {
                if (contenedorServicios) {
                    const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === id);
                    contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, id, enModoEdicion);
                }
            }
            mostrarAlertasYRecientes();

            mostrarMensaje('❌ Error al eliminar: ' + error.message, 'error');
        }
    };



    /**
     * Seleccionar estado usando pills (función global llamada desde el HTML)
     */
    window.seleccionarEstadoPill = async function (pillElement, nuevoEstado) {
        const selectCuarto = document.getElementById('cuartoMantenimientoLateral');
        const cuartoId = selectCuarto ? parseInt(selectCuarto.value) : null;

        if (!cuartoId) {
            mostrarMensaje('⚠️ Selecciona primero un cuarto', 'warning');
            return;
        }

        try {
            console.log(`🔄 Actualizando estado del cuarto ${cuartoId} a: ${nuevoEstado}`);

            const response = await fetch(`${API_BASE_URL}/api/cuartos/${cuartoId}`, {
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
            const cuarto = cuartos.find(c => c.id === cuartoId);
            if (cuarto) {
                cuarto.estado = nuevoEstado;
            }

            // Actualizar hidden input
            const estadoSelector = document.getElementById('estadoCuartoSelector');
            if (estadoSelector) {
                estadoSelector.value = nuevoEstado;
            }

            // Actualizar UI de los pills
            const pills = document.querySelectorAll('.estado-pill');
            pills.forEach(pill => pill.classList.remove('activo'));
            pillElement.classList.add('activo');

            // Actualizar solo el badge de estado de la card específica
            if (window.actualizarEstadoBadgeCard) {
                window.actualizarEstadoBadgeCard(cuartoId, nuevoEstado);
            } else {
                // Fallback: recargar todas las cards si la función no está disponible
                mostrarCuartos();
            }

            // Mapeo de estados a emojis para el mensaje
            const estadoEmojis = {
                'disponible': '🟢',
                'ocupado': '🔵',
                'mantenimiento': '🟡',
                'fuera_servicio': '🔴'
            };

            const estadoLabels = {
                'disponible': 'Disponible',
                'ocupado': 'Ocupado',
                'mantenimiento': 'Mantenimiento',
                'fuera_servicio': 'Fuera de servicio'
            };

            mostrarMensaje(
                `${estadoEmojis[nuevoEstado]} Estado actualizado: ${estadoLabels[nuevoEstado]}`,
                'success'
            );

        } catch (error) {
            console.error('❌ Error actualizando estado:', error);
            mostrarMensaje('Error al actualizar estado: ' + error.message, 'error');

            // Revertir el selector al estado anterior
            actualizarSelectorEstado(cuartoId);
        }
    };

    /**
     * Actualizar estado del cuarto (compatibilidad con select tradicional si se usa)
     */
    window.actualizarEstadoCuarto = async function (selectElement) {
        const nuevoEstado = selectElement.value;
        if (!nuevoEstado) return;

        // Buscar el pill correspondiente y simular click
        const pill = document.querySelector(`.estado-pill[data-estado="${nuevoEstado}"]`);
        if (pill) {
            await window.seleccionarEstadoPill(pill, nuevoEstado);
        }
    };

    /**
     * ========================================
     * FUNCIONES PARA ESPACIOS COMUNES
     * ========================================
     */

    // Funciones cargo desde el archivo app-loader-espacios-comunes.js
    // Exponer funciones necesarias para app-loader-espacios-comunes.js

    /**
     * ========================================
     * FIN FUNCIONES ESPACIOS COMUNES
     * ========================================
     */

    // Exponer funciones necesarias para app-loader-habitaciones.js
    window.API_BASE_URL = API_BASE_URL;
    window.generarServiciosHTML = generarServiciosHTML;
    window.escapeHtml = escapeHtml;
    window.obtenerHeadersConAuth = obtenerHeadersConAuth;
    window.formatearFecha = formatearFecha;
    window.formatearFechaCompleta = formatearFechaCompleta;
    window.formatearFechaCorta = formatearFechaCorta;
    window.formatearHora = formatearHora;
    window.formatearDiaAlerta = formatearDiaAlerta;
    window.mostrarMensaje = mostrarMensaje;
    window.cargarDatos = cargarDatos;
    window.mostrarAlertasYRecientes = mostrarAlertasYRecientes;
    window.marcarAlertasPasadasComoEmitidas = marcarAlertasPasadasComoEmitidas;
    window.cargarCuartosEnSelect = cargarCuartosEnSelect;
    window.mostrarAlertasEmitidas = mostrarAlertasEmitidas;
    window.mostrarHistorialAlertas = mostrarHistorialAlertas;
    window.verificarYEmitirAlertas = verificarYEmitirAlertas;
    window.actualizarSelectorEstado = actualizarSelectorEstado;
    console.log('✅ Funciones auxiliares exportadas a window para módulos externos');

    console.log('App Loader cargado - JW Mantto v1.3 con Edición Inline Completa Modular completo pendiente');

})();
