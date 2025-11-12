/**
 * App Loader - Carga los datos desde el servidor Express local
 * Este archivo reemplaza la lógica PHP para funcionar con la API local
 */

// URL base de la API local
const API_BASE_URL = 'http://localhost:3001';
console.log('🔧 DEBUG: app-loader.js ACTUALIZADO - Puerto configurado:', API_BASE_URL);

// Variables globales para almacenar datos
let cuartos = [];
let mantenimientos = [];
let edificios = [];
let intervalosNotificaciones = null;
let alertasEmitidas = new Set(); // Para evitar duplicados

// Paginación de habitaciones
const CUARTOS_POR_PAGINA = 10;
let cuartosFiltradosActual = [];
let paginaActualCuartos = 1;
let totalPaginasCuartos = 1;

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
        
        // Cargar datos iniciales
        console.log('📥 Iniciando carga de datos...');
        await cargarDatos();
        console.log('✅ Datos cargados exitosamente:', {
            cuartos: cuartos.length,
            edificios: edificios.length,
            mantenimientos: mantenimientos.length
        });

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
        
        // Cargar cuartos
        console.log('📋 Cargando cuartos desde:', `${API_BASE_URL}/api/cuartos`);
        const responseCuartos = await fetch(`${API_BASE_URL}/api/cuartos`);
        console.log('📊 Response cuartos - status:', responseCuartos.status, 'ok:', responseCuartos.ok, 'statusText:', responseCuartos.statusText);
        if (!responseCuartos.ok) {
            throw new Error(`❌ Error al cargar cuartos: ${responseCuartos.status} - ${responseCuartos.statusText}`);
        }
        cuartos = await responseCuartos.json();
        console.log('✅ Cuartos cargados exitosamente:', cuartos.length, 'ejemplos:', cuartos.slice(0, 2));
        
        // Cargar edificios
        console.log('🏢 Cargando edificios desde:', `${API_BASE_URL}/api/edificios`);
        const responseEdificios = await fetch(`${API_BASE_URL}/api/edificios`);
        console.log('📊 Response edificios - status:', responseEdificios.status, 'ok:', responseEdificios.ok, 'statusText:', responseEdificios.statusText);
        if (!responseEdificios.ok) {
            throw new Error(`❌ Error al cargar edificios: ${responseEdificios.status} - ${responseEdificios.statusText}`);
        }
        edificios = await responseEdificios.json();
        console.log('✅ Edificios cargados exitosamente:', edificios.length, 'ejemplos:', edificios);
        
        // Cargar mantenimientos
        console.log('🔧 Cargando mantenimientos desde:', `${API_BASE_URL}/api/mantenimientos`);
        const responseMantenimientos = await fetch(`${API_BASE_URL}/api/mantenimientos`);
        console.log('📊 Response mantenimientos - status:', responseMantenimientos.status, 'ok:', responseMantenimientos.ok, 'statusText:', responseMantenimientos.statusText);
        if (!responseMantenimientos.ok) {
            throw new Error(`❌ Error al cargar mantenimientos: ${responseMantenimientos.status} - ${responseMantenimientos.statusText}`);
        }
        mantenimientos = await responseMantenimientos.json();
        console.log('✅ Mantenimientos cargados exitosamente:', mantenimientos.length, 'ejemplos:', mantenimientos.slice(0, 2));
        
        console.log('🎉 Todos los datos cargados exitosamente desde API');
        
        // Guardar en localStorage como respaldo
        try {
            localStorage.setItem('ultimosCuartos', JSON.stringify(cuartos));
            localStorage.setItem('ultimosEdificios', JSON.stringify(edificios));
            localStorage.setItem('ultimosMantenimientos', JSON.stringify(mantenimientos));
            console.log('💾 Datos guardados en localStorage como respaldo');
        } catch (storageError) {
            console.warn('⚠️ No se pudo guardar en localStorage:', storageError);
        }
        
        return true;
        
    } catch (error) {
        console.error('💥 Error cargando datos desde API:', error);
        console.error('📋 Error type:', typeof error);
        console.error('📝 Error message:', error.message);
        console.error('🔍 Error stack:', error.stack);
        
        // Intentar cargar desde localStorage primero
        console.log('🔄 Intentando cargar desde localStorage...');
        try {
            const cuartosGuardados = localStorage.getItem('ultimosCuartos');
            const edificiosGuardados = localStorage.getItem('ultimosEdificios');
            const mantenimientosGuardados = localStorage.getItem('ultimosMantenimientos');
            
            if (cuartosGuardados && edificiosGuardados && mantenimientosGuardados) {
                cuartos = JSON.parse(cuartosGuardados);
                edificios = JSON.parse(edificiosGuardados);
                mantenimientos = JSON.parse(mantenimientosGuardados);
                
                console.log('💾 Datos cargados desde localStorage:', {
                    cuartos: cuartos.length,
                    edificios: edificios.length,
                    mantenimientos: mantenimientos.length
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
            
            console.log('Datos offline cargados:', {
                cuartos: cuartos.length,
                edificios: edificios.length,
                mantenimientos: mantenimientos.length
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
    
    if (buscarCuarto) buscarCuarto.addEventListener('input', filtrarCuartos);
    if (buscarAveria) buscarAveria.addEventListener('input', filtrarCuartos);
    if (filtroEdificio) filtroEdificio.addEventListener('change', filtrarCuartos);
    
    // Configurar formulario de agregar mantenimiento
    const formAgregar = document.getElementById('formAgregarMantenimientoLateral');
    if (formAgregar) {
        formAgregar.addEventListener('submit', manejarAgregarMantenimiento);
    }
    
    // Configurar sincronización bidireccional del select de cuartos
    const selectCuarto = document.getElementById('cuartoMantenimientoLateral');
    if (selectCuarto) {
        selectCuarto.addEventListener('change', function() {
            const cuartoId = this.value;
            if (cuartoId) {
                // Seleccionar visualmente el cuarto en la interfaz
                seleccionarCuartoDesdeSelect(parseInt(cuartoId));
            } else {
                // Si no hay selección, remover todas las selecciones
                const todosLosCuartos = document.querySelectorAll('.cuarto');
                todosLosCuartos.forEach(cuarto => {
                    cuarto.classList.remove('cuarto-seleccionado');
                });
            }
        });
    }
}

/**
 * Sincronizar estado base de cuartos filtrados y paginación
 */
function sincronizarCuartosFiltrados(mantenerPagina = false) {
    cuartosFiltradosActual = Array.isArray(cuartos) ? [...cuartos] : [];
    totalPaginasCuartos = cuartosFiltradosActual.length > 0
        ? Math.ceil(cuartosFiltradosActual.length / CUARTOS_POR_PAGINA)
        : 1;

    if (!mantenerPagina || paginaActualCuartos > totalPaginasCuartos) {
        paginaActualCuartos = cuartosFiltradosActual.length > 0 ? 1 : 1;
    }
}

/**
 * Mostrar cuartos en la lista principal con la misma estructura que index.php
 */
function mostrarCuartos() {
    console.log('=== MOSTRANDO CUARTOS ===');
    
    const listaCuartos = document.getElementById('listaCuartos');
    const mensajeNoResultados = document.getElementById('mensajeNoResultados');
    
    if (!listaCuartos) {
        console.error('Elemento listaCuartos no encontrado');
        return;
    }
    
    if (mensajeNoResultados) {
        mensajeNoResultados.style.display = 'none';
    }
    
    if ((!cuartosFiltradosActual || cuartosFiltradosActual.length === 0) && cuartos.length > 0) {
        cuartosFiltradosActual = [...cuartos];
    }
    
    const totalCuartos = cuartosFiltradosActual.length;
    
    if (totalCuartos === 0) {
        console.warn('No hay cuartos para mostrar');
        listaCuartos.style.display = 'grid';
        listaCuartos.innerHTML = '<li class="mensaje-no-cuartos">No hay cuartos registrados en el sistema.</li>';
        renderizarPaginacionCuartos(0);
        return;
    }
    
    totalPaginasCuartos = Math.max(1, Math.ceil(totalCuartos / CUARTOS_POR_PAGINA));
    
    if (paginaActualCuartos > totalPaginasCuartos) {
        paginaActualCuartos = totalPaginasCuartos;
    }
    if (paginaActualCuartos < 1) {
        paginaActualCuartos = 1;
    }
    
    const inicio = (paginaActualCuartos - 1) * CUARTOS_POR_PAGINA;
    const fin = Math.min(inicio + CUARTOS_POR_PAGINA, totalCuartos);
    const cuartosPagina = cuartosFiltradosActual.slice(inicio, fin);
    
    console.log(`Cuartos disponibles: ${totalCuartos} | Página ${paginaActualCuartos}/${totalPaginasCuartos}`);
    
    listaCuartos.style.display = 'grid';
    listaCuartos.innerHTML = '';
    let procesados = 0;

    // Lazy loading: crear cards vacías y cargar contenido solo cuando entran al viewport
    cuartosPagina.forEach((cuarto, index) => {
        try {
            const li = document.createElement('li');
            li.className = 'cuarto cuarto-lazy';
            li.id = `cuarto-${cuarto.id}`;
            li.setAttribute('loading', 'lazy'); // Lazy loading nativo del navegador

            const nombreCuarto = cuarto.nombre || cuarto.numero || `Cuarto ${cuarto.id}`;
            const edificioNombre = cuarto.edificio_nombre || `Edificio ${cuarto.edificio_id}`;

            // Guardar los datos necesarios en dataset para cargar luego
            li.dataset.nombreCuarto = nombreCuarto;
            li.dataset.edificioNombre = edificioNombre;
            li.dataset.descripcion = cuarto.descripcion || '';
            li.dataset.cuartoId = cuarto.id;
            li.dataset.edificioId = cuarto.edificio_id;
            li.dataset.index = inicio + index;

            // Card placeholder mejorado con skeleton loading
            li.innerHTML = `
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

            listaCuartos.appendChild(li);
            procesados++;
        } catch (error) {
            console.error(`Error procesando cuarto ${index}:`, error, cuarto);
        }
    });

    // IntersectionObserver para cargar el contenido real cuando la card entra al viewport
    if (window.cuartoObserver) {
        window.cuartoObserver.disconnect();
    }
    window.cuartoObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const li = entry.target;
                if (!li.dataset.loaded) {
                    // Marcar como cargando para evitar cargas duplicadas
                    li.dataset.loading = '1';
                    const cuartoId = parseInt(li.dataset.cuartoId, 10);
                    const nombreCuarto = li.dataset.nombreCuarto;
                    const edificioNombre = li.dataset.edificioNombre;
                    const descripcion = li.dataset.descripcion;
                    const cuartoCompleto = cuartos.find(c => c.id === cuartoId);
                    const mantenimientosCuarto = mantenimientos ? mantenimientos.filter(m => m.cuarto_id === cuartoId) : [];
                    
                    // Determinar estado del cuarto (ocupado, vacío, en mantenimiento, fuera de servicio)
                    const estadoCuarto = cuartoCompleto?.estado || 'vacio';
                    let estadoBadgeClass = 'estado-vacio';
                    let estadoIcon = 'fa-check-circle';
                    let estadoText = 'Vacío';
                    
                    switch(estadoCuarto.toLowerCase()) {
                        case 'ocupado':
                            estadoBadgeClass = 'estado-ocupado';
                            estadoIcon = 'fa-user';
                            estadoText = 'Ocupado';
                            break;
                        case 'en mantenimiento':
                        case 'mantenimiento':
                            estadoBadgeClass = 'estado-mantenimiento';
                            estadoIcon = 'fa-tools';
                            estadoText = 'En Mantenimiento';
                            break;
                        case 'fuera de servicio':
                        case 'fuera_servicio':
                            estadoBadgeClass = 'estado-fuera-servicio';
                            estadoIcon = 'fa-ban';
                            estadoText = 'Fuera de Servicio';
                            break;
                        default:
                            estadoBadgeClass = 'estado-vacio';
                            estadoIcon = 'fa-check-circle';
                            estadoText = 'Vacío';
                    }
                    
                    li.className = 'habitacion-card';
                    li.setAttribute('data-aos', 'fade-up');
                    li.innerHTML = `
                        <div class="habitacion-header">
                            <div class="habitacion-titulo">
                                <i class="habitacion-icon fas fa-door-closed"></i>
                                <div>
                                    <div class="habitacion-nombre">${escapeHtml(nombreCuarto)}</div>
                                    <div class="habitacion-edificio">
                                        <i class="fas fa-building"></i> ${escapeHtml(edificioNombre)}
                                    </div>
                                </div>
                            </div>
                            <div class="habitacion-estado-badge ${estadoBadgeClass}">
                                <i class="fas ${estadoIcon}"></i> ${estadoText}
                            </div>
                        </div>
                        <div class="habitacion-servicios" id="servicios-${cuartoId}">
                            ${generarServiciosHTML(mantenimientosCuarto, cuartoId)}
                        </div>
                        <div class="habitacion-acciones">
                            <button class="habitacion-boton boton-secundario" onclick="toggleModoEdicion(${cuartoId})" id="btn-editar-${cuartoId}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="habitacion-boton boton-principal" onclick="seleccionarCuarto(${cuartoId})">
                                <i class="fas fa-plus"></i> Agregar
                            </button>
                        </div>
                    `;
                    
                    li.dataset.loaded = '1';
                    li.classList.remove('cuarto-lazy');
                    
                    // Animar card con anime.js si está disponible
                    if (typeof window.animarNuevaTarjeta === 'function') {
                        window.animarNuevaTarjeta(li);
                    }
                }
                observer.unobserve(li);
            }
        });
    }, { 
        rootMargin: '150px', // Cargar 150px antes de que la card entre al viewport
        threshold: 0.01 // Cargar cuando al menos 1% de la card sea visible
    });

    // Observar todas las cards
    document.querySelectorAll('.cuarto-lazy').forEach(li => {
        window.cuartoObserver.observe(li);
    });

    console.log(`Se procesaron ${procesados} cuartos (página ${paginaActualCuartos}/${totalPaginasCuartos}) de ${totalCuartos} total (lazy)`);
    console.log('=== FIN MOSTRANDO CUARTOS ===');

    renderizarPaginacionCuartos(totalCuartos);
}

/**
 * Renderizar controles de paginación para las habitaciones
 */
function renderizarPaginacionCuartos(totalCuartos) {
    const contenedorPaginacion = document.getElementById('habitacionesPagination');
    if (!contenedorPaginacion) {
        return;
    }

    if (!totalCuartos || totalCuartos <= CUARTOS_POR_PAGINA) {
        contenedorPaginacion.innerHTML = '';
        contenedorPaginacion.style.display = 'none';
        return;
    }

    const totalPaginasCalculadas = Math.max(1, Math.ceil(totalCuartos / CUARTOS_POR_PAGINA));
    totalPaginasCuartos = totalPaginasCalculadas;
    if (paginaActualCuartos > totalPaginasCuartos) {
        paginaActualCuartos = totalPaginasCuartos;
    }

    const opciones = Array.from({ length: totalPaginasCalculadas }, (_, idx) => {
        const pagina = idx + 1;
        const seleccionado = pagina === paginaActualCuartos ? ' selected' : '';
        return `<option value="${pagina}"${seleccionado}>${pagina}</option>`;
    }).join('');

    const totalLabel = totalCuartos === 1 ? '1 habitación' : `${totalCuartos} habitaciones`;

    contenedorPaginacion.style.display = 'flex';
    contenedorPaginacion.innerHTML = `
        <button class="pagination-btn" data-action="prev" ${paginaActualCuartos === 1 ? 'disabled' : ''} aria-label="Página anterior de habitaciones">
            <i class="fas fa-chevron-left"></i>
            <span>Anterior</span>
        </button>
        <div class="pagination-info">
            <span>Página</span>
            <select class="pagination-select" id="habitacionesPaginationSelect" aria-label="Seleccionar página de habitaciones">
                ${opciones}
            </select>
            <span>de ${totalPaginasCalculadas}</span>
        </div>
        <button class="pagination-btn" data-action="next" ${paginaActualCuartos === totalPaginasCalculadas ? 'disabled' : ''} aria-label="Página siguiente de habitaciones">
            <span>Siguiente</span>
            <i class="fas fa-chevron-right"></i>
        </button>
        <span class="pagination-total">${totalLabel}</span>
    `;

    const botonAnterior = contenedorPaginacion.querySelector('[data-action="prev"]');
    const botonSiguiente = contenedorPaginacion.querySelector('[data-action="next"]');
    const selectorPaginas = contenedorPaginacion.querySelector('#habitacionesPaginationSelect');

    if (botonAnterior) {
        botonAnterior.addEventListener('click', () => {
            if (paginaActualCuartos > 1) {
                paginaActualCuartos -= 1;
                mostrarCuartos();
                // Esperar a que el DOM se actualice antes de hacer scroll
                setTimeout(() => desplazarListaCuartosAlInicio(), 100);
            }
        });
    }

    if (botonSiguiente) {
        botonSiguiente.addEventListener('click', () => {
            if (paginaActualCuartos < totalPaginasCuartos) {
                paginaActualCuartos += 1;
                mostrarCuartos();
                // Esperar a que el DOM se actualice antes de hacer scroll
                setTimeout(() => desplazarListaCuartosAlInicio(), 100);
            }
        });
    }

    if (selectorPaginas) {
        selectorPaginas.addEventListener('change', (event) => {
            const nuevaPagina = parseInt(event.target.value, 10);
            if (!Number.isNaN(nuevaPagina) && nuevaPagina >= 1 && nuevaPagina <= totalPaginasCuartos) {
                paginaActualCuartos = nuevaPagina;
                mostrarCuartos();
                // Esperar a que el DOM se actualice antes de hacer scroll
                setTimeout(() => desplazarListaCuartosAlInicio(), 100);
            }
        });
    }
}

/**
 * Desplazar la vista de habitaciones al inicio después de cambiar de página
 */
function desplazarListaCuartosAlInicio() {
    // Intentar hacer scroll al tab de habitaciones primero
    const tabHabitaciones = document.getElementById('tab-habitaciones');
    if (tabHabitaciones) {
        const rect = tabHabitaciones.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop;
        
        // Ajustar para el header fijo (aproximadamente 72px en móviles, 0 en desktop)
        const headerOffset = window.innerWidth <= 768 ? 72 : 0;
        const finalY = Math.max(0, targetY - headerOffset);
        
        window.scrollTo({
            top: finalY,
            behavior: 'smooth'
        });
        return;
    }
    
    // Fallback: hacer scroll al panel de filtros
    const panelFiltros = document.querySelector('.panel-filtros');
    if (panelFiltros) {
        const rect = panelFiltros.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop;
        
        // Ajustar para el header fijo
        const headerOffset = window.innerWidth <= 768 ? 72 : 0;
        const finalY = Math.max(0, targetY - headerOffset);
        
        window.scrollTo({
            top: finalY,
            behavior: 'smooth'
        });
        return;
    }
    
    // Último fallback: hacer scroll a la lista de cuartos
    const listaCuartos = document.getElementById('listaCuartos');
    if (listaCuartos) {
        const rect = listaCuartos.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop;
        
        // Ajustar para el header fijo
        const headerOffset = window.innerWidth <= 768 ? 72 : 0;
        const finalY = Math.max(0, targetY - headerOffset);
        
        window.scrollTo({
            top: finalY,
            behavior: 'smooth'
        });
    }
}

/**
 * Generar HTML de servicios (estilo espacios comunes)
 */
function generarServiciosHTML(servicios, cuartoId, modoEdicion = false) {
    if (!servicios || servicios.length === 0) {
        return '<div style="padding: 1rem; text-align: center; color: var(--texto-secundario); font-style: italic; min-height: 78.99px;">No hay servicios registrados</div>';
    }
    
    // Mostrar máximo 2 servicios más recientes
    const serviciosMostrar = servicios.slice(0, 2);
    const hayMasServicios = servicios.length > 2;
    
    let html = serviciosMostrar.map(servicio => {
        const esAlerta = servicio.tipo === 'rutina';
        const nivelClass = servicio.nivel_alerta ? `nivel-${servicio.nivel_alerta}` : '';
        
        // Para alertas, mostrar fecha y hora de alerta; para averías, fecha de registro
        let fechaHoraMostrar = '';
        if (esAlerta && (servicio.dia_alerta || servicio.hora)) {
            const fechaAlerta = servicio.dia_alerta ? formatearFechaCorta(servicio.dia_alerta) : '';
            const horaAlerta = servicio.hora ? formatearHora(servicio.hora) : '';
            fechaHoraMostrar = `<span><i class="far fa-clock"></i> ${fechaAlerta} ${horaAlerta}</span>`;
        } else if (servicio.fecha_registro) {
            fechaHoraMostrar = `<span><i class="far fa-clock"></i> ${formatearFechaCorta(servicio.fecha_registro)}</span>`;
        }
        
        // En modo edición, usar wrapper; en modo normal, solo el item
        if (modoEdicion) {
            return `
                <div class="servicio-item-wrapper modo-edicion" data-servicio-id="${servicio.id}">
                    <div class="servicio-item ${esAlerta ? 'servicio-alerta' : ''}" onclick="activarEdicionServicio(${servicio.id}, ${cuartoId})" style="cursor: pointer;">
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
                    <button class="btn-eliminar-inline" onclick="eliminarServicioInline(${servicio.id}, ${cuartoId}); event.stopPropagation();" title="Eliminar servicio">
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
                            ${fechaHoraMostrar}
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
            <div class="ver-mas-servicios" onclick="verDetallesServicios(${cuartoId}); event.stopPropagation();">
                <i class="fas fa-eye"></i>
                <span>Ver todos los servicios (${servicios.length})</span>
            </div>
        `;
    }
    
    return html;
}

/**
 * Generar HTML simple para mantenimientos (compatibilidad)
 */
function generarMantenimientosHTMLSimple(mantenimientos, cuartoId) {
    return generarServiciosHTML(mantenimientos, cuartoId);
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
 * Filtrar cuartos según los criterios de búsqueda
 */
function filtrarCuartos() {
    const buscarCuarto = document.getElementById('buscarCuarto').value.toLowerCase();
    const buscarAveria = document.getElementById('buscarAveria').value.toLowerCase();
    const filtroEdificio = document.getElementById('filtroEdificio').value;
    
    const cuartosFiltrados = cuartos.filter(cuarto => {
        // Filtro por nombre de cuarto
        const coincideNombre = (cuarto.nombre || cuarto.numero || '').toString().toLowerCase().includes(buscarCuarto);
        
        // Filtro por avería en mantenimientos
        const coincideAveria = buscarAveria === '' || 
            (mantenimientos && mantenimientos.some(m => 
                m.cuarto_id === cuarto.id && m.descripcion.toLowerCase().includes(buscarAveria)
            ));
        
        // Filtro por edificio
        const coincideEdificio = filtroEdificio === '' || cuarto.edificio_id.toString() === filtroEdificio;
        
        return coincideNombre && coincideAveria && coincideEdificio;
    });
    
    mostrarCuartosFiltrados(cuartosFiltrados);
}

/**
 * Mostrar cuartos filtrados
 */
function mostrarCuartosFiltrados(cuartosFiltrados) {
    const listaCuartos = document.getElementById('listaCuartos');
    const mensajeNoResultados = document.getElementById('mensajeNoResultados');
    
    if (!listaCuartos || !mensajeNoResultados) {
        return;
    }
    
    if (!cuartosFiltrados || cuartosFiltrados.length === 0) {
        listaCuartos.innerHTML = '';
        listaCuartos.style.display = 'none';
        mensajeNoResultados.style.display = 'block';
        cuartosFiltradosActual = [];
        paginaActualCuartos = 1;
        renderizarPaginacionCuartos(0);
        return;
    }
    
    listaCuartos.style.display = 'grid'; // Mantener grid para 2 columnas
    mensajeNoResultados.style.display = 'none';
    
    // Guardar cuarto seleccionado actual si existe
    const cuartoActualSeleccionado = document.querySelector('.cuarto-seleccionado');
    const idCuartoSeleccionado = cuartoActualSeleccionado ? 
        cuartoActualSeleccionado.id.replace('cuarto-', '') : null;
    
    cuartosFiltradosActual = [...cuartosFiltrados];
    
    if (idCuartoSeleccionado) {
        const indiceSeleccionado = cuartosFiltradosActual.findIndex(c => c.id.toString() === idCuartoSeleccionado);
        if (indiceSeleccionado >= 0) {
            paginaActualCuartos = Math.floor(indiceSeleccionado / CUARTOS_POR_PAGINA) + 1;
        } else {
            paginaActualCuartos = 1;
        }
    } else {
        paginaActualCuartos = 1;
    }
    
    mostrarCuartos();
    
    // Restaurar selección si el cuarto filtrado sigue visible
    if (idCuartoSeleccionado && 
        cuartosFiltrados.some(c => c.id.toString() === idCuartoSeleccionado)) {
        setTimeout(() => seleccionarCuarto(parseInt(idCuartoSeleccionado)), 200);
    }
}

/**
 * Mostrar alertas y mantenimientos recientes
 */
function mostrarAlertasYRecientes() {
    mostrarAlertas();
    mostrarRecientes();
    mostrarAlertasEmitidas();
}

/**
 * Mostrar alertas pendientes
 */
function mostrarAlertas() {
    const listaAlertas = document.getElementById('listaVistaRutinas');
    if (!listaAlertas) return;
    
    // Obtener TODAS las rutinas registradas, sin filtrar por fecha
    const todasLasRutinas = mantenimientos.filter(m => 
        m.tipo === 'rutina' && 
        m.dia_alerta
    ).sort((a, b) => {
        // Ordenar por fecha de alerta (más próximas primero)
        const fechaA = new Date(a.dia_alerta + ' ' + (a.hora || '00:00'));
        const fechaB = new Date(b.dia_alerta + ' ' + (b.hora || '00:00'));
        return fechaA - fechaB;
    });
    
    console.log(`📋 Mostrando todas las rutinas: ${todasLasRutinas.length} alertas encontradas`);
    console.log('🔍 Detalle de rutinas:', todasLasRutinas.map(r => `ID${r.id}(${r.dia_alerta} ${r.hora} - ${r.descripcion.substring(0, 20)}...)`));
    
    if (todasLasRutinas.length === 0) {
        listaAlertas.innerHTML = '<li class="mensaje-no-items">No hay alertas registradas</li>';
        return;
    }
    
    listaAlertas.innerHTML = '';
    // Mostrar TODAS las alertas, no solo 5
    todasLasRutinas.forEach((alerta, index) => {
        console.log(`📝 Procesando alerta ${index + 1}/${todasLasRutinas.length}:`, alerta);
        const li = document.createElement('li');
        li.className = 'rutina-item';
        li.id = `rutina-${alerta.id}`;
        
        // Obtener información del cuarto para mostrar contexto
        const cuarto = cuartos.find(c => c.id === alerta.cuarto_id);
        const nombreCuarto = cuarto ? (cuarto.nombre || cuarto.numero) : `Cuarto ${alerta.cuarto_id}`;
        const edificio = edificios.find(e => e.id === (cuarto ? cuarto.edificio_id : null));
        const nombreEdificio = edificio ? edificio.nombre : '';
        
        // Determinar estado de la alerta
        const yaEmitida = alerta.alerta_emitida === 1 || alertasEmitidas.has(alerta.id);
        const estadoTexto = yaEmitida ? '✅ Emitida' : '⏰ Programada';
        const estadoClase = yaEmitida ? 'alerta-emitida' : 'alerta-programada';
        
        // Añadir todos los atributos data necesarios para el sistema de notificaciones
        li.dataset.horaRaw = alerta.hora || '';
        li.dataset.diaRaw = alerta.dia_alerta || '';
        li.dataset.descripcion = alerta.descripcion || '';
        li.dataset.cuartoNombre = nombreCuarto;
        li.dataset.cuartoId = alerta.cuarto_id || '';
        
        li.innerHTML = `
            <span class="rutina-hora">
                ${alerta.dia_alerta ? formatearFechaCorta(alerta.dia_alerta) : '??/??'} 
                ${alerta.hora ? formatearHora(alerta.hora) : '--:--'}
            </span>
            <span class="rutina-info">
                <span class="rutina-cuarto" title="${escapeHtml(nombreEdificio)}">
                    ${escapeHtml(nombreCuarto)}
                </span>
                <span class="rutina-descripcion">
                    ${escapeHtml(alerta.descripcion)}
                </span>
                <span class="rutina-estado ${estadoClase}">
                    ${estadoTexto}
                </span>
            </span>
            <button class="boton-ir-rutina" onclick="scrollToCuarto(${alerta.cuarto_id})" title="Ver detalles">&#10148;</button>
        `;
        listaAlertas.appendChild(li);
    });
    
    console.log(`✅ Renderizadas ${todasLasRutinas.length} alertas en el panel principal`);
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
 * Mostrar alertas emitidas hoy (solo las que YA fueron emitidas)
 */
function mostrarAlertasEmitidas() {
    const listaEmitidas = document.getElementById('listaAlertasEmitidas');
    const mensajeNoEmitidas = document.getElementById('mensaje-no-alertas-emitidas');
    
    if (!listaEmitidas) {
        console.warn('Elemento listaAlertasEmitidas no encontrado');
        return;
    }
    
    // Usar fecha local actual (no UTC) para comparación
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    
    console.log(`📅 Fecha para buscar alertas emitidas: ${hoy} (local actual)`);
    
    // Buscar SOLO alertas emitidas hoy (tanto marcadas en BD como en memoria)
    const alertasEmitidasBD = mantenimientos.filter(m => {
        const cumpleCondicion = m.tipo === 'rutina' && 
            m.dia_alerta === hoy &&
            (m.alerta_emitida === 1 || alertasEmitidas.has(m.id)); // BD o memoria
        
        if (m.tipo === 'rutina' && m.dia_alerta === hoy) {
            console.log(`🔍 Rutina ID${m.id}: día=${m.dia_alerta}, emitida=${m.alerta_emitida}, en_memoria=${alertasEmitidas.has(m.id)}, cumple=${cumpleCondicion}`);
        }
        
        return cumpleCondicion;
    });
    
    console.log(`📋 Alertas emitidas hoy (${hoy}):`, alertasEmitidasBD.length, 
        'IDs:', alertasEmitidasBD.map(a => `${a.id}(${a.alerta_emitida ? 'BD' : 'MEM'})`));
    
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
            const cuarto = cuartos.find(c => c.id === alerta.cuarto_id);
            const nombreCuarto = cuarto ? (cuarto.nombre || cuarto.numero) : `Cuarto ${alerta.cuarto_id}`;
            
            const li = document.createElement('li');
            li.className = 'alerta-emitida-item';
            li.innerHTML = `
                <div class="alerta-cuarto">${escapeHtml(nombreCuarto)}</div>
                <div class="alerta-descripcion">${escapeHtml(alerta.descripcion)}</div>
                <div class="alerta-hora">${formatearHora(alerta.hora) || '--:--'}</div>
                <div class="alerta-fechas">
                    <div class="fecha-registro">Registrado: ${alerta.fecha_registro ? formatearFechaCompleta(alerta.fecha_registro) : 'N/A'}</div>
                    <div class="fecha-emision">Emitido: ${alerta.fecha_emision ? formatearHora(alerta.fecha_emision) : 'Pendiente'}</div>
                </div>
            `;
            listaEmitidas.appendChild(li);
        });
        
    console.log(`✅ Mostradas ${alertasEmitidasBD.length} alertas emitidas en UI`);
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
        nivel_alerta: formData.get('nivel_alerta') // Agregar nivel de alerta
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
        
        // Limpiar formulario y resetear a estado "Avería"
        event.target.reset();
        document.getElementById('tipoHiddenLateral').value = 'normal';
        document.getElementById('switchLabelLateral').textContent = 'Avería';
        document.getElementById('tipoMantenimientoSwitchLateral').checked = false;
        
        // Ocultar campos específicos de rutina/alerta
        const horaContainer = document.getElementById('horaRutinaLateralContainer');
        const diaContainer = document.getElementById('diaAlertaLateralContainer');
        if (horaContainer) horaContainer.style.display = 'none';
        if (diaContainer) diaContainer.style.display = 'none';
        
        // Recargar datos y actualizar toda la interfaz
        await cargarDatos();
        mostrarCuartos();
        cargarCuartosEnSelect(); // Actualizar también el select
        mostrarAlertasYRecientes();
        
        // Forzar actualización del sistema de notificaciones si es una rutina
        if (datos.tipo === 'rutina') {
            console.log('🔄 Nueva rutina agregada, verificando sistema de notificaciones...');
            // Dar tiempo a que se actualicen los datos y luego verificar
            setTimeout(() => {
                verificarYEmitirAlertas();
            }, 1500);
        }
        
        // Mostrar mensaje de éxito
        mostrarMensaje('Mantenimiento registrado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error al registrar mantenimiento:', error);
        mostrarMensaje(`Error al registrar mantenimiento: ${error.message}`, 'error');
    }
}

/**
 * Ver detalles de un cuarto (función placeholder)
 */
function verDetallesCuarto(cuartoId) {
    console.log('Ver detalles del cuarto:', cuartoId);
    // TODO: Implementar vista de detalles
    alert(`Ver detalles del cuarto ID: ${cuartoId}`);
}

/**
 * Formatear fecha para mostrar
 */
function formatearFecha(fecha) {
    if (!fecha) return '';
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
 * Escapar HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Seleccionar un cuarto único (remover selección de otros)
 */
function seleccionarCuarto(cuartoId) {
    // Remover selección de todos los cuartos
    const todosLosCuartos = document.querySelectorAll('.cuarto');
    todosLosCuartos.forEach(cuarto => {
        cuarto.classList.remove('cuarto-seleccionado');
    });
    
    // Seleccionar el cuarto clickeado
    const cuartoSeleccionado = document.getElementById(`cuarto-${cuartoId}`);
    if (cuartoSeleccionado) {
        cuartoSeleccionado.classList.add('cuarto-seleccionado');
        
        // Auto-seleccionar en el formulario lateral si existe
        const selectCuarto = document.getElementById('cuartoMantenimientoLateral');
        if (selectCuarto) {
            selectCuarto.value = cuartoId;
        }
        
        console.log(`Cuarto ${cuartoId} seleccionado`);
    }
}

/**
 * Seleccionar cuarto desde el select (con scroll automático)
 */
function seleccionarCuartoDesdeSelect(cuartoId) {
    // Remover selección de todos los cuartos
    const todosLosCuartos = document.querySelectorAll('.cuarto');
    todosLosCuartos.forEach(cuarto => {
        cuarto.classList.remove('cuarto-seleccionado');
    });
    
    // Seleccionar el cuarto y hacer scroll hacia él
    const cuartoSeleccionado = document.getElementById(`cuarto-${cuartoId}`);
    if (cuartoSeleccionado) {
        cuartoSeleccionado.classList.add('cuarto-seleccionado');
        
        // Hacer scroll suave hacia el cuarto seleccionado
        cuartoSeleccionado.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Añadir efecto visual temporal para destacar el cuarto
        cuartoSeleccionado.style.transition = 'all 0.3s ease';
        cuartoSeleccionado.style.transform = 'scale(1.02)';
        cuartoSeleccionado.style.boxShadow = '0 4px 20px rgba(74, 144, 226, 0.3)';
        
        setTimeout(() => {
            cuartoSeleccionado.style.transform = '';
            cuartoSeleccionado.style.boxShadow = '';
        }, 800);
        
        console.log(`Cuarto ${cuartoId} seleccionado desde select con scroll`);
    }
}

/**
 * Toggle de mantenimientos (función esperada por los botones)
 */
window.toggleMantenimientos = function(cuartoId, button) {
    const lista = document.getElementById(`mantenimientos-${cuartoId}`);
    if (!lista) return;
    
    if (lista.style.display === 'none') {
        lista.style.display = 'block';
        button.textContent = 'Ocultar Mantenimientos';
    } else {
        lista.style.display = 'none';
        button.textContent = 'Mostrar Mantenimientos';
    }
};

/**
 * Mostrar edición inline
 */
window.mostrarEdicionInline = function(mantenimientoId) {
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
window.ocultarEdicionInline = function(mantenimientoId) {
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
window.guardarMantenimientoInline = async function(mantenimientoId) {
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
        
        // Recargar datos y actualizar vista
        await cargarDatos();
        mostrarCuartos();
        mostrarAlertasYRecientes();
        
        mostrarMensaje('Mantenimiento actualizado', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al actualizar mantenimiento', 'error');
    }
};

/**
 * Eliminar mantenimiento inline
 */
window.eliminarMantenimientoInline = async function(mantenimientoId, cuartoId) {
    console.log('🗑️ Iniciando eliminación de mantenimiento:', { mantenimientoId, cuartoId });
    
    if (!confirm('¿Está seguro de eliminar este mantenimiento?')) {
        console.log('❌ Eliminación cancelada por el usuario');
        return;
    }
    
    try {
        console.log('🌐 Enviando DELETE a:', `${API_BASE_URL}/api/mantenimientos/${mantenimientoId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${mantenimientoId}`, {
            method: 'DELETE'
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Resultado eliminación:', result);
        
        // Recargar datos y actualizar vista
        console.log('🔄 Recargando datos después de eliminación...');
        await cargarDatos();
        mostrarCuartos();
        mostrarAlertasYRecientes();
        
        mostrarMensaje('Mantenimiento eliminado exitosamente', 'success');
        console.log('✅ Eliminación completada correctamente');
        
    } catch (error) {
        console.error('❌ Error eliminando mantenimiento:', error);
        mostrarMensaje(`Error al eliminar mantenimiento: ${error.message}`, 'error');
    }
};

/**
 * Scroll a cuarto específico
 */
window.scrollToCuarto = function(cuartoId) {
    const cuarto = document.getElementById(`cuarto-${cuartoId}`);
    if (cuarto) {
        cuarto.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Seleccionar el cuarto automáticamente
        seleccionarCuarto(cuartoId);
        
        // Highlight temporal adicional
        setTimeout(() => {
            cuarto.style.background = '#fffacd';
            setTimeout(() => {
                cuarto.style.background = '';
            }, 2000);
        }, 500);
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
window.handleTipoSwitchChange = function(switchElement) {
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
        console.log(`📅 Total rutinas: ${todasLasRutinas.length}`, todasLasRutinas.map(r => `ID${r.id}(${r.dia_alerta} ${r.hora})`));
        
        // Filtrar alertas que deben notificarse ahora
        const alertasPorNotificar = mantenimientos.filter(m => {
            if (m.tipo !== 'rutina' || !m.dia_alerta || !m.hora) {
                return false;
            }
            
            // Verificar si ya fue emitida
            if (m.alerta_emitida || alertasEmitidas.has(m.id)) {
                return false;
            }
            
            // Verificar si es el día correcto
            if (m.dia_alerta !== fechaActual) {
                return false;
            }
            
            // Verificar si es la hora correcta (con tolerancia de 1 minuto)
            const horaAlerta = m.hora;
            return horaAlerta === horaActual;
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
        
        // Obtener información del cuarto
        const cuarto = cuartos.find(c => c.id === alerta.cuarto_id);
        const nombreCuarto = cuarto ? (cuarto.nombre || cuarto.numero) : `Cuarto ${alerta.cuarto_id}`;
        const edificio = edificios.find(e => e.id === (cuarto ? cuarto.edificio_id : null));
        const nombreEdificio = edificio ? edificio.nombre : '';
        
        const titulo = `🔔 Alerta de Mantenimiento`;
        const mensaje = `${nombreCuarto}${nombreEdificio ? ` (${nombreEdificio})` : ''}\n${alerta.descripcion}`;
        
        // Reproducir sonido (con manejo de restricciones)
        reproducirSonidoAlerta();
        
        // Mostrar notificación del navegador
        mostrarNotificacionNavegador(titulo, mensaje, alerta);
        
        // Actualizar inmediatamente la interfaz (antes de la BD)
        mostrarAlertasEmitidas();
        
        // Marcar como emitida en la base de datos (en segundo plano)
        marcarAlertaComoEmitida(alerta.id).then(() => {
            console.log(`✅ Alerta ${alerta.id} confirmada en BD`);
            // Recargar datos y actualizar interfaz con datos actualizados de BD
            setTimeout(async () => {
                await cargarDatos();
                mostrarAlertasEmitidas();
            }, 500);
        }).catch(error => {
            console.error(`❌ Error marcando alerta ${alerta.id} en BD:`, error);
            // Aunque falle la BD, mantener en memoria la alerta emitida
        });
        
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
        const audio = new Audio('sounds/alert.mp3');
        audio.volume = 0.7;
        
        // Intentar reproducir con manejo mejorado de errores
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('🔊 Sonido de alerta reproducido correctamente');
                // Marcar que ya hubo interacción de audio exitosa
                window.audioInteractionEnabled = true;
            }).catch(error => {
                console.warn('⚠️ No se pudo reproducir el sonido automáticamente:', error.message);
                // Solo mostrar el mensaje visual si es por restricción de autoplay
                if (error.name === 'NotAllowedError') {
                    mostrarMensajeAudioBloqueado();
                }
            });
        }
    } catch (error) {
        console.warn('Error reproduciendo sonido:', error);
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
            
            notification.onclick = function() {
                window.focus();
                scrollToCuarto(alerta.cuarto_id);
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

/**
 * Abrir modal de detalle de un servicio específico
 */
window.abrirModalDetalleServicio = function(servicioId, desdeLista = false) {
    const servicio = mantenimientos.find(m => m.id === servicioId);
    if (!servicio) {
        console.error('Servicio no encontrado:', servicioId);
        return;
    }
    
    const cuarto = cuartos.find(c => c.id === servicio.cuarto_id);
    const nombreCuarto = cuarto ? (cuarto.nombre || cuarto.numero) : `Cuarto ${servicio.cuarto_id}`;
    
    const modal = document.getElementById('modalDetallesServicio');
    const titulo = document.getElementById('modalDetallesTitulo');
    const body = document.getElementById('modalDetallesBody');
    
    const esAlerta = servicio.tipo === 'rutina';
    
    // Generar contenido del modal
    let contenido = `
        <div class="detalle-item">
            <div class="detalle-label"><i class="fas fa-door-closed"></i> Habitación</div>
            <div class="detalle-valor">${escapeHtml(nombreCuarto)}</div>
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
    
    // Si es alerta, mostrar fecha, hora y nivel
    if (esAlerta) {
        if (servicio.dia_alerta || servicio.hora) {
            contenido += `
                <div class="detalle-fecha-hora">
                    ${servicio.dia_alerta ? `
                        <div class="detalle-item">
                            <div class="detalle-label"><i class="fas fa-calendar-alt"></i> Fecha de Alerta</div>
                            <div class="detalle-valor">${formatearFecha(servicio.dia_alerta)}</div>
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
        
        // Mostrar nivel de alerta si existe
        if (servicio.nivel_alerta) {
            const nivelTexto = {
                'baja': 'Baja',
                'media': 'Media',
                'alta': 'Alta'
            }[servicio.nivel_alerta] || 'Baja';
            
            contenido += `
                <div class="detalle-item">
                    <div class="detalle-label"><i class="fas fa-traffic-light"></i> Nivel de Alerta</div>
                    <div class="detalle-valor">
                        <div class="nivel-alerta-badge nivel-alerta-${servicio.nivel_alerta}">
                            <span class="semaforo-indicator"></span>
                            ${nivelTexto}
                        </div>
                    </div>
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
    const botonVolver = desdeLista ? `
        <button class="btn-volver-lista" onclick="verDetallesServicios(${servicio.cuarto_id})">
            <i class="fas fa-arrow-left"></i>
        </button>
    ` : '';
    
    titulo.innerHTML = `
        ${botonVolver}
        <i class="fas ${esAlerta ? 'fa-bell' : 'fa-wrench'}"></i> Detalle del Servicio
    `;
    body.innerHTML = contenido;
    modal.style.display = 'flex';
    
    // Animar entrada
    setTimeout(() => {
        modal.querySelector('.modal-detalles-contenido').style.opacity = '1';
    }, 10);
};

/**
 * Ver detalles de todos los servicios de una habitación
 */
window.verDetallesServicios = function(cuartoId) {
    const cuarto = cuartos.find(c => c.id === cuartoId);
    const nombreCuarto = cuarto ? (cuarto.nombre || cuarto.numero) : `Cuarto ${cuartoId}`;
    const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === cuartoId);
    
    const modal = document.getElementById('modalDetallesServicio');
    const titulo = document.getElementById('modalDetallesTitulo');
    const body = document.getElementById('modalDetallesBody');
    
    if (serviciosCuarto.length === 0) {
        titulo.innerHTML = `<i class="fas fa-door-closed"></i> ${escapeHtml(nombreCuarto)}`;
        body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--texto-secundario);">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem; font-weight: 600;">No hay servicios registrados</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Esta habitación no tiene servicios activos.</p>
            </div>
        `;
        modal.style.display = 'flex';
        return;
    }
    
    // Generar lista de todos los servicios con opción de eliminar
    let contenido = serviciosCuarto.map(servicio => {
        const esAlerta = servicio.tipo === 'rutina';
        const nivelIndicador = servicio.nivel_alerta ? `
            <span class="semaforo-indicator" style="
                display: inline-block;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: ${servicio.nivel_alerta === 'alta' ? '#ff0000' : servicio.nivel_alerta === 'media' ? '#ffff00' : '#00ff00'};
                box-shadow: 0 0 8px ${servicio.nivel_alerta === 'alta' ? '#ff0000' : servicio.nivel_alerta === 'media' ? '#ffff00' : '#00ff00'};
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
                        ${nivelIndicador}
                    </div>
                    <div class="detalle-valor">
                        ${escapeHtml(servicio.descripcion)}
                        ${servicio.dia_alerta || servicio.hora ? `
                            <div style="font-size: 0.85rem; color: var(--texto-secundario); margin-top: 0.3rem;">
                                ${servicio.dia_alerta ? formatearFecha(servicio.dia_alerta) : ''} 
                                ${servicio.hora ? formatearHora(servicio.hora) : ''}
                            </div>
                        ` : ''}
                    </div>
                    <i class="fas fa-chevron-right" style="color: var(--texto-secundario); font-size: 0.9rem;"></i>
                </div>
                <button class="btn-eliminar-servicio" onclick="eliminarServicioDesdeModal(${servicio.id}, ${cuartoId}); event.stopPropagation();" title="Eliminar servicio">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    }).join('');
    
    titulo.innerHTML = `<i class="fas fa-door-closed"></i> Servicios de ${escapeHtml(nombreCuarto)}`;
    body.innerHTML = contenido;
    modal.style.display = 'flex';
};

/**
 * Eliminar servicio desde el modal
 */
window.eliminarServicioDesdeModal = async function(servicioId, cuartoId) {
    if (!confirm('¿Está seguro de eliminar este servicio?')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando servicio:', servicioId);
        
        const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${servicioId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        console.log('✅ Servicio eliminado correctamente');
        
        // Recargar datos
        await cargarDatos();
        mostrarCuartos();
        mostrarAlertasYRecientes();
        
        // Actualizar el modal si aún está abierto
        const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === cuartoId);
        if (serviciosCuarto.length > 0) {
            // Si quedan servicios, actualizar el modal
            verDetallesServicios(cuartoId);
        } else {
            // Si no quedan servicios, cerrar el modal
            cerrarModalDetalles();
        }
        
        mostrarMensaje('Servicio eliminado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error eliminando servicio:', error);
        mostrarMensaje('Error al eliminar servicio: ' + error.message, 'error');
    }
};

/**
 * Cerrar modal de detalles
 */
window.cerrarModalDetalles = function() {
    const modal = document.getElementById('modalDetallesServicio');
    const contenido = modal.querySelector('.modal-detalles-contenido');
    
    // Animar salida
    contenido.style.opacity = '0';
    contenido.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        modal.style.display = 'none';
        contenido.style.opacity = '1';
        contenido.style.transform = 'translateY(0)';
    }, 200);
};

// Cerrar modal con tecla Escape
document.addEventListener('keydown', function(e) {
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
window.toggleModoEdicion = function(cuartoId) {
    const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
    const botonEditar = document.getElementById(`btn-editar-${cuartoId}`);
    
    if (!contenedorServicios || !botonEditar) return;
    
    // Verificar si ya está en modo edición
    const enModoEdicion = botonEditar.classList.contains('modo-edicion-activo');
    
    if (enModoEdicion) {
        // Desactivar modo edición
        botonEditar.classList.remove('modo-edicion-activo');
        botonEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
        
        // Regenerar servicios en modo normal
        const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === cuartoId);
        contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, cuartoId, false);
    } else {
        // Activar modo edición
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
window.activarEdicionServicio = function(servicioId, cuartoId) {
    const servicio = mantenimientos.find(m => m.id === servicioId);
    if (!servicio) return;
    
    const wrapper = document.querySelector(`.servicio-item-wrapper[data-servicio-id="${servicioId}"]`);
    if (!wrapper) return;
    
    const esAlerta = servicio.tipo === 'rutina';
    
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
                        id="edit-fecha-${servicioId}" 
                        value="${servicio.dia_alerta || ''}"
                    />
                    <input 
                        type="time" 
                        class="input-edicion-inline input-small" 
                        id="edit-hora-${servicioId}" 
                        value="${servicio.hora || ''}"
                    />
                </div>
                
                <div class="semaforo-edicion-inline">
                    <label class="semaforo-label-inline ${servicio.nivel_alerta === 'baja' ? 'active' : ''}">
                        <input type="radio" name="nivel-${servicioId}" value="baja" ${servicio.nivel_alerta === 'baja' || !servicio.nivel_alerta ? 'checked' : ''}>
                        <span class="semaforo-circle green"></span>
                    </label>
                    <label class="semaforo-label-inline ${servicio.nivel_alerta === 'media' ? 'active' : ''}">
                        <input type="radio" name="nivel-${servicioId}" value="media" ${servicio.nivel_alerta === 'media' ? 'checked' : ''}>
                        <span class="semaforo-circle yellow"></span>
                    </label>
                    <label class="semaforo-label-inline ${servicio.nivel_alerta === 'alta' ? 'active' : ''}">
                        <input type="radio" name="nivel-${servicioId}" value="alta" ${servicio.nivel_alerta === 'alta' ? 'checked' : ''}>
                        <span class="semaforo-circle red"></span>
                    </label>
                </div>
            ` : ''}
            
            <div class="form-inline-acciones">
                <button class="btn-form-inline btn-cancelar" onclick="cancelarEdicionServicio(${servicioId}, ${cuartoId})">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn-form-inline btn-guardar" onclick="guardarEdicionServicio(${servicioId}, ${cuartoId})">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    `;
};

/**
 * Cancelar edición de servicio
 */
window.cancelarEdicionServicio = function(servicioId, cuartoId) {
    // Regenerar la vista en modo edición (sin formulario)
    const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
    const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === cuartoId);
    contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, cuartoId, true);
};

/**
 * Guardar edición de servicio
 */
window.guardarEdicionServicio = async function(servicioId, cuartoId) {
    const servicio = mantenimientos.find(m => m.id === servicioId);
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
    
    // Si es alerta, incluir campos adicionales
    if (esAlerta) {
        const fecha = document.getElementById(`edit-fecha-${servicioId}`).value;
        const hora = document.getElementById(`edit-hora-${servicioId}`).value;
        const nivelSeleccionado = document.querySelector(`input[name="nivel-${servicioId}"]:checked`);
        
        if (!fecha || !hora) {
            mostrarMensaje('Fecha y hora son obligatorias para alertas', 'error');
            return;
        }
        
        datosActualizados.dia_alerta = fecha;
        datosActualizados.hora = hora;
        datosActualizados.nivel_alerta = nivelSeleccionado ? nivelSeleccionado.value : 'baja';
    }
    
    try {
        console.log('💾 Guardando cambios del servicio:', servicioId, datosActualizados);
        
        const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${servicioId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosActualizados)
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        console.log('✅ Servicio actualizado correctamente');
        
        // Recargar datos
        await cargarDatos();
        
        // Actualizar la vista manteniendo modo edición
        const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
        if (contenedorServicios) {
            const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === cuartoId);
            contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, cuartoId, true);
        }
        
        // Actualizar paneles laterales
        mostrarAlertasYRecientes();
        
        mostrarMensaje('Servicio actualizado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error actualizando servicio:', error);
        mostrarMensaje('Error al actualizar servicio: ' + error.message, 'error');
    }
};

/**
 * Eliminar servicio inline (desde la vista de edición)
 */
window.eliminarServicioInline = async function(servicioId, cuartoId) {
    if (!confirm('¿Está seguro de eliminar este servicio?')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando servicio inline:', servicioId);
        
        const response = await fetch(`${API_BASE_URL}/api/mantenimientos/${servicioId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        console.log('✅ Servicio eliminado correctamente');
        
        // Recargar datos
        await cargarDatos();
        
        // Actualizar solo la card específica manteniendo el modo edición
        const contenedorServicios = document.getElementById(`servicios-${cuartoId}`);
        const botonEditar = document.getElementById(`btn-editar-${cuartoId}`);
        const enModoEdicion = botonEditar && botonEditar.classList.contains('modo-edicion-activo');
        
        if (contenedorServicios) {
            const serviciosCuarto = mantenimientos.filter(m => m.cuarto_id === cuartoId);
            contenedorServicios.innerHTML = generarServiciosHTML(serviciosCuarto, cuartoId, enModoEdicion);
            
            // Si no quedan servicios, desactivar modo edición
            if (serviciosCuarto.length === 0 && botonEditar) {
                botonEditar.classList.remove('modo-edicion-activo');
                botonEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
            }
        }
        
        // Actualizar también los paneles laterales
        mostrarAlertasYRecientes();
        
        mostrarMensaje('Servicio eliminado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error eliminando servicio:', error);
        mostrarMensaje('Error al eliminar servicio: ' + error.message, 'error');
    }
};

console.log('App Loader cargado - JW Mantto v1.3 con Edición Inline Completa');
