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

// Datos mock para modo offline
const datosOffline = {
    edificios: [
        { id: 1, nombre: 'Edificio A', descripcion: 'Edificio principal' },
        { id: 2, nombre: 'Edificio B', descripcion: 'Edificio secundario' }
    ],
    cuartos: [
        { id: 1, numero: '101', edificio_id: 1, edificio_nombre: 'Edificio A', estado: 'ocupado' },
        { id: 2, numero: '102', edificio_id: 1, edificio_nombre: 'Edificio A', estado: 'libre' },
        { id: 3, numero: '201', edificio_id: 2, edificio_nombre: 'Edificio B', estado: 'mantenimiento' },
        { id: 4, numero: '202', edificio_id: 2, edificio_nombre: 'Edificio B', estado: 'libre' },
        { id: 5, numero: '301', edificio_id: 1, edificio_nombre: 'Edificio A', estado: 'ocupado' }
    ],
    mantenimientos: [
        {
            id: 1,
            cuarto_id: 1,
            tipo: 'limpieza',
            descripcion: 'Limpieza general de habitación',
            fecha_solicitud: '2024-07-21',
            estado: 'pendiente',
            cuarto_numero: '101'
        },
        {
            id: 2,
            cuarto_id: 3,
            tipo: 'reparacion',
            descripcion: 'Reparar aire acondicionado',
            fecha_solicitud: '2024-07-21',
            estado: 'en_proceso',
            cuarto_numero: '201'
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
 * Mostrar cuartos en la lista principal con la misma estructura que index.php
 */
function mostrarCuartos() {
    console.log('=== MOSTRANDO CUARTOS ===');
    
    const listaCuartos = document.getElementById('listaCuartos');
    if (!listaCuartos) {
        console.error('Elemento listaCuartos no encontrado');
        return;
    }
    
    console.log('Container encontrado:', listaCuartos);
    console.log('Cuartos disponibles:', cuartos ? cuartos.length : 0);
    
    if (!cuartos || cuartos.length === 0) {
        console.warn('No hay cuartos para mostrar');
        listaCuartos.innerHTML = '<li class="mensaje-no-cuartos">No hay cuartos registrados en el sistema.</li>';
        return;
    }
    
    console.log('Estructura del primer cuarto:', cuartos[0]);
    
    listaCuartos.innerHTML = '';
    let procesados = 0;

    // Lazy loading: crear cards vacías y cargar contenido solo cuando entran al viewport
    cuartos.forEach((cuarto, index) => {
        try {
            const li = document.createElement('li');
            li.className = 'cuarto cuarto-lazy';
            li.id = `cuarto-${cuarto.id}`;

            // Guardar los datos necesarios en dataset para cargar luego
            li.dataset.nombreCuarto = cuarto.nombre || cuarto.numero || `Cuarto ${cuarto.id}`;
            li.dataset.edificioNombre = cuarto.edificio_nombre || `Edificio ${cuarto.edificio_id}`;
            li.dataset.descripcion = cuarto.descripcion || '';
            li.dataset.cuartoId = cuarto.id;
            li.dataset.edificioId = cuarto.edificio_id;
            li.dataset.index = index;

            // Card vacía (placeholder)
            li.innerHTML = `<div class="card-placeholder" style="height: 120px; background: #f3f3f3; border-radius: 10px;"></div>`;

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
                    const cuartoId = parseInt(li.dataset.cuartoId);
                    const nombreCuarto = li.dataset.nombreCuarto;
                    const edificioNombre = li.dataset.edificioNombre;
                    const descripcion = li.dataset.descripcion;
                    const numMantenimientos = mantenimientos ? mantenimientos.filter(m => m.cuarto_id === cuartoId).length : 0;
                    li.innerHTML = `
                        <h2>${escapeHtml(nombreCuarto)}</h2>
                        <p class="edificio-cuarto">Edificio: ${escapeHtml(edificioNombre)}</p>
                        ${descripcion ? `<p>Última fecha: ${escapeHtml(descripcion)}</p>` : ''}
                        <p>Estado: <span class="estado-disponible">Disponible</span></p>
                        <p>Número de averías: <span id="contador-mantenimientos-${cuartoId}">${numMantenimientos}</span></p>
                        <button class="boton-toggle-mantenimientos" onclick="toggleMantenimientos(${cuartoId}, this)">Mostrar Mantenimientos</button>
                        <ul class="lista-mantenimientos" id="mantenimientos-${cuartoId}" style="display: none;">
                            ${generarMantenimientosHTMLSimple(mantenimientos.filter(m => m.cuarto_id === cuartoId))}
                        </ul>
                    `;
                    // Evento de selección
                    li.addEventListener('click', function(e) {
                        if (!e.target.closest('button')) {
                            seleccionarCuarto(cuartoId);
                        }
                    });
                    li.dataset.loaded = '1';
                    li.classList.remove('cuarto-lazy');
                    li.style.opacity = '1';
                    li.style.transform = 'translateY(0)';
                }
                observer.unobserve(li);
            }
        });
    }, { rootMargin: '100px' });

    // Observar todas las cards
    document.querySelectorAll('.cuarto-lazy').forEach(li => {
        window.cuartoObserver.observe(li);
    });

    console.log(`Se procesaron ${procesados} cuartos de ${cuartos.length} total (lazy)`);
    console.log('=== FIN MOSTRANDO CUARTOS ===');
}

/**
 * Generar HTML simple para mantenimientos
 */
function generarMantenimientosHTMLSimple(mantenimientos) {
    if (!mantenimientos || mantenimientos.length === 0) {
        return '<li class="mensaje-no-mantenimientos">No hay mantenimientos registrados para este cuarto.</li>';
    }
    
    return mantenimientos.map(mant => `
        <li class="mantenimiento ${mant.tipo === 'rutina' ? 'mantenimiento-alerta' : ''}" 
            id="mantenimiento-${mant.id}">
            <div class="vista-mantenimiento">
                <span class="mantenimiento-descripcion">
                    ${escapeHtml(mant.descripcion)}
                    ${mant.tipo === 'rutina' && (mant.hora || mant.dia_alerta) ? `
                        <span class="tiempo-rutina">
                            ${mant.dia_alerta ? formatearFecha(mant.dia_alerta) + ' ' : ''}
                            ${mant.hora ? formatearHora(mant.hora) : ''}
                        </span>
                    ` : ''}
                    <span class="tiempo-registro">
                        Registrado: ${formatearFechaCompleta(mant.fecha_registro)}
                    </span>
                </span>
                <div class="acciones-mantenimiento">
                    <button class="boton-accion-inline eliminar" onclick="eliminarMantenimientoInline(${mant.id}, ${mant.cuarto_id})" title="Eliminar">🗑️</button>
                </div>
            </div>
        </li>
    `).join('');
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
    
    if (cuartosFiltrados.length === 0) {
        listaCuartos.style.display = 'none';
        mensajeNoResultados.style.display = 'block';
        return;
    }
    
    listaCuartos.style.display = 'grid'; // Mantener grid para 2 columnas
    mensajeNoResultados.style.display = 'none';
    
    // Guardar cuarto seleccionado actual si existe
    const cuartoActualSeleccionado = document.querySelector('.cuarto-seleccionado');
    const idCuartoSeleccionado = cuartoActualSeleccionado ? 
        cuartoActualSeleccionado.id.replace('cuarto-', '') : null;
    
    // Temporal: mostrar cuartos filtrados manteniendo la misma funcionalidad
    const cuartosOriginales = cuartos;
    cuartos = cuartosFiltrados;
    mostrarCuartos();
    cuartos = cuartosOriginales;
    
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
    
    const hoy = new Date();
    const alertasPendientes = mantenimientos.filter(m => 
        m.tipo === 'rutina' && 
        m.dia_alerta &&
        new Date(m.dia_alerta) <= hoy
    ).sort((a, b) => new Date(a.dia_alerta) - new Date(b.dia_alerta));
    
    if (alertasPendientes.length === 0) {
        listaAlertas.innerHTML = '<li class="mensaje-no-items">No hay alertas pendientes</li>';
        return;
    }
    
    listaAlertas.innerHTML = '';
    alertasPendientes.slice(0, 5).forEach(alerta => {
        const li = document.createElement('li');
        li.className = 'rutina-item';
        li.id = `rutina-${alerta.id}`;
        
        // Añadir todos los atributos data necesarios para el sistema de notificaciones
        li.dataset.horaRaw = alerta.hora || '';
        li.dataset.diaRaw = alerta.dia_alerta || '';
        li.dataset.descripcion = alerta.descripcion || '';
        li.dataset.cuartoNombre = alerta.cuarto_nombre || `Cuarto ${alerta.cuarto_id}`;
        li.dataset.cuartoId = alerta.cuarto_id || '';
        
        li.innerHTML = `
            <span class="rutina-hora">
                ${alerta.dia_alerta ? formatearFechaCorta(alerta.dia_alerta) : '??/??'} 
                ${alerta.hora ? formatearHora(alerta.hora) : '--:--'}
            </span>
            <span class="rutina-info">
                <span class="rutina-cuarto" title="${escapeHtml(alerta.edificio_nombre || 'Sin edificio')}">
                    ${escapeHtml(alerta.cuarto_nombre || 'Cuarto ' + alerta.cuarto_id)}
                </span>
                <span class="rutina-descripcion">
                    ${escapeHtml(alerta.descripcion)}
                </span>
            </span>
            <button class="boton-ir-rutina" onclick="scrollToCuarto(${alerta.cuarto_id})" title="Ver detalles">&#10148;</button>
        `;
        listaAlertas.appendChild(li);
    });
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
 * Mostrar alertas emitidas hoy
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
    
    // Buscar alertas emitidas hoy (tanto marcadas en BD como en memoria)
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
        dia_alerta: formData.get('dia_alerta')
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
 */
window.handleTipoSwitchChange = function(switchElement) {
    const label = document.getElementById('switchLabelLateral');
    const hiddenInput = document.getElementById('tipoHiddenLateral');
    const horaContainer = document.getElementById('horaRutinaLateralContainer');
    const diaContainer = document.getElementById('diaAlertaLateralContainer');
    
    if (switchElement.checked) {
        label.textContent = 'Alerta';
        hiddenInput.value = 'rutina';
        horaContainer.style.display = 'block';
        diaContainer.style.display = 'block';
    } else {
        label.textContent = 'Avería';
        hiddenInput.value = 'normal';
        horaContainer.style.display = 'none';
        diaContainer.style.display = 'none';
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

console.log('App Loader cargado - JW Mantto v1.1 con Notificaciones Automáticas');
