// ========================================
// JW MARRIOTT - ENHANCED FRONTEND FEATURES
// ========================================

// Inicializar AOS (Animate On Scroll)
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    }
    
    // Inicializar tabs
    initializeTabs();
    
    // Inicializar botones brutalist de navegación
    initializeBrutalistNavButtons();
    
    // Inicializar animaciones
    initializeAnimations();
    
    // Inicializar temporizador de filtros
    initializeFiltroTimer();
    
    // Cargar datos iniciales
    loadInitialData();
});

// ========================================
// SISTEMA DE TABS
// ========================================
function initializeTabs() {
    const tabLinks = document.querySelectorAll('.link[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetTab = this.getAttribute('data-tab');
            
            // Remover active de todos los links
            tabLinks.forEach(l => l.classList.remove('active'));
            
            // Agregar active al link clickeado
            this.classList.add('active');
            
            // Ocultar todos los tabs
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Mostrar el tab seleccionado
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Refrescar AOS en el nuevo tab
                if (typeof AOS !== 'undefined') {
                    AOS.refresh();
                }
            }
        });
    });
}

// ========================================
// BOTONES BRUTALIST DE NAVEGACIÓN
// ========================================
function initializeBrutalistNavButtons() {
    const navButtons = document.querySelectorAll('.brutalist-nav-button[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetTab = this.getAttribute('data-tab');
            
            // Remover active de todos los botones
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            // Agregar active al botón clickeado
            this.classList.add('active');
            
            // Ocultar todos los tabs
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Mostrar el tab correspondiente
            const activeTab = document.getElementById(`tab-${targetTab}`);
            if (activeTab) {
                activeTab.classList.add('active');
                
                // Refresh AOS animations
                if (typeof AOS !== 'undefined') {
                    AOS.refresh();
                }
            }
        });
    });
}

// ========================================
// ANIMACIONES CON ANIME.JS
// ========================================
function initializeAnimations() {
    if (typeof anime === 'undefined') return;
    
    // Animación para las cards al cargar
    // NOTA: Excluir cards de habitaciones y espacios comunes (ya que tienen carga dinámica)
    anime({
        targets: '.brutalist-card:not(#listaCuartos .brutalist-card):not(#listaEspacios .brutalist-card)',
        translateY: [50, 0],
        opacity: [0, 1],
        delay: anime.stagger(100),
        duration: 800,
        easing: 'easeOutExpo'
    });
    
    // Animación para los botones al hover (se activa con eventos)
    setupButtonAnimations();
}

function setupButtonAnimations() {
    const buttons = document.querySelectorAll('.brutalist-card__button, .container-btn-file, .Documents-btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            if (typeof anime === 'undefined') return;
            
            anime({
                targets: this,
                scale: 1.05,
                duration: 200,
                easing: 'easeOutQuad'
            });
        });
        
        button.addEventListener('mouseleave', function() {
            if (typeof anime === 'undefined') return;
            
            anime({
                targets: this,
                scale: 1,
                duration: 200,
                easing: 'easeOutQuad'
            });
        });
    });
}

// ========================================
// TEMPORIZADOR DE FILTROS (6 MESES)
// ========================================
function initializeFiltroTimer() {
    const timerElement = document.getElementById('filtroTimer');
    if (!timerElement) return;
    
    // Fecha de inicio del periodo actual (ejemplo: 1 de enero 2025)
    const fechaInicio = new Date('2025-01-01');
    const fechaProximoCambio = new Date('2025-07-01');
    
    function actualizarTimer() {
        const ahora = new Date();
        const diferencia = fechaProximoCambio - ahora;
        
        if (diferencia > 0) {
            const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
            const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            timerElement.textContent = `${dias} días ${horas} hrs`;
            
            // Cambiar color según tiempo restante
            if (dias < 30) {
                timerElement.style.color = 'var(--prioridad-alta)';
            } else if (dias < 60) {
                timerElement.style.color = 'var(--prioridad-media)';
            } else {
                timerElement.style.color = 'var(--prioridad-baja)';
            }
        } else {
            timerElement.textContent = '¡Cambio pendiente!';
            timerElement.style.color = 'var(--prioridad-alta)';
        }
    }
    
    // Actualizar cada hora
    actualizarTimer();
    setInterval(actualizarTimer, 3600000);
}

// ========================================
// EXPORTAR BITÁCORA CON ANIMACIÓN
// ========================================
function exportarBitacora(event) {
    if (event) event.preventDefault();
    
    // Mostrar spinner de descarga
    const spinner = document.getElementById('downloadSpinner');
    if (spinner) {
        spinner.style.display = 'flex';
        
        // Simular descarga (aquí se conectaría con el backend)
        setTimeout(() => {
            // Aquí iría la lógica real de descarga del backend
            console.log('Exportando bitácora...');
            
            // Ocultar spinner después de 2 segundos
            setTimeout(() => {
                spinner.style.display = 'none';
                if (window.mostrarAlertaBlur) window.mostrarAlertaBlur('Bitácora exportada exitosamente', 'success');
            }, 2000);
        }, 500);
    }
}

// ========================================
// EXPORTAR FILTROS A EXCEL
// ========================================
function exportarFiltrosExcel() {
    const spinner = document.getElementById('downloadSpinner');
    if (spinner) {
        spinner.style.display = 'flex';
        
        setTimeout(() => {
            console.log('Exportando filtros a Excel...');
            
            setTimeout(() => {
                spinner.style.display = 'none';
                if (window.mostrarAlertaBlur) window.mostrarAlertaBlur('Excel generado exitosamente', 'success');
            }, 2000);
        }, 500);
    }
}

// ========================================
// ARCHIVAR PERIODO ANTERIOR
// ========================================
// NOTA: Esta función está comentada porque la implementación real
// está en sabana-functions.js conectada a la base de datos
/*
function archivarPeriodo() {
    if (confirm('¿Está seguro de archivar el periodo anterior? Esta acción moverá los registros al historial.')) {
        const spinner = document.getElementById('downloadSpinner');
        if (spinner) {
            const downloadText = spinner.querySelector('.download-text');
            if (downloadText) {
                downloadText.textContent = 'Archivando periodo...';
            }
            spinner.style.display = 'flex';
            
            setTimeout(() => {
                console.log('Archivando periodo...');
                
                setTimeout(() => {
                    spinner.style.display = 'none';
                    if (downloadText) {
                        downloadText.textContent = 'Generando documento...';
                    }
                    if (window.mostrarAlertaBlur) window.mostrarAlertaBlur('Periodo archivado exitosamente', 'success');
                }, 2000);
            }, 500);
        }
    }
}
*/
// La función real archivarPeriodo() está en sabana-functions.js

// ========================================
// VER HISTORIAL DE FILTROS
// ========================================
function verHistorialFiltros() {
    if (window.mostrarAlertaBlur) window.mostrarAlertaBlur('Abriendo historial de filtros...', 'info');
    // Aquí se abriría un modal o nueva vista con el historial
    console.log('Ver historial de filtros');
}

// ========================================
// SISTEMA DE NOTIFICACIONES
// ========================================
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.className = `notificacion notif-${tipo}`;
    notif.innerHTML = `
        <i class="fas fa-${getIconoNotificacion(tipo)}"></i>
        <span>${mensaje}</span>
    `;
    
    // Estilos inline para la notificación
    notif.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--blanco);
        border: 3px solid var(--negro-carbon);
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 8px 8px 0 var(--negro-carbon);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Color según tipo
    const colores = {
        'success': 'var(--prioridad-baja)',
        'error': 'var(--prioridad-alta)',
        'warning': 'var(--prioridad-media)',
        'info': 'var(--gris-oscuro)'
    };
    
    notif.querySelector('i').style.color = colores[tipo] || colores.info;
    
    // Agregar al DOM
    document.body.appendChild(notif);
    
    // Animar con anime.js si está disponible
    if (typeof anime !== 'undefined') {
        anime({
            targets: notif,
            translateX: [100, 0],
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutQuad'
        });
    }
    
    // Remover después de 3 segundos
    setTimeout(() => {
        if (typeof anime !== 'undefined') {
            anime({
                targets: notif,
                translateX: [0, 100],
                opacity: [1, 0],
                duration: 300,
                easing: 'easeInQuad',
                complete: () => notif.remove()
            });
        } else {
            notif.remove();
        }
    }, 3000);
}

function getIconoNotificacion(tipo) {
    const iconos = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return iconos[tipo] || iconos.info;
}

// ========================================
// CARGAR DATOS INICIALES
// ========================================
function loadInitialData() {
    // Esta función se conecta con el backend existente
    // No modificamos la lógica del backend, solo mejoramos la presentación
    console.log('Frontend mejorado cargado - Backend mantiene su lógica original');
}

// ========================================
// APLICAR PRIORIDADES CON SEMÁFORO
// ========================================
function aplicarPrioridad(elemento, tipo) {
    // tipo puede ser: 'alta', 'media', 'baja'
    elemento.classList.remove('prioridad-alta', 'prioridad-media', 'prioridad-baja');
    elemento.classList.add(`prioridad-${tipo}`);
}

// ========================================
// ANIMACIÓN DE TARJETAS AL AGREGAR
// ========================================
function animarNuevaTarjeta(elemento) {
    if (typeof anime === 'undefined') return;
    
    // NO animar cards de habitaciones o espacios comunes (carga dinámica)
    // Esto evita la sensación de carga lenta
    if (elemento.closest('#listaCuartos') || elemento.closest('#listaEspacios')) {
        return; // Salir sin animar
    }
    
    anime({
        targets: elemento,
        scale: [0.8, 1],
        opacity: [0, 1],
        translateY: [-20, 0],
        duration: 500,
        easing: 'easeOutElastic(1, .8)'
    });
}

// ========================================
// BACKGROUND PARTICLES (THREE.JS)
// ========================================
function initializeThreeBackground() {
    if (typeof THREE === 'undefined') return;
    
    // Crear escena sutil de partículas en el fondo (opcional)
    // Este es un efecto premium pero sutil para no distraer
    const container = document.createElement('div');
    container.id = 'three-bg';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        opacity: 0.03;
        pointer-events: none;
    `;
    document.body.prepend(container);
    
    // Configuración básica de THREE.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    
    // Crear partículas
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    
    for (let i = 0; i < 1000; i++) {
        vertices.push(
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000
        );
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const material = new THREE.PointsMaterial({ color: 0x4C544C, size: 2 });
    const points = new THREE.Points(geometry, material);
    
    scene.add(points);
    camera.position.z = 500;
    
    // Animación
    function animate() {
        requestAnimationFrame(animate);
        points.rotation.x += 0.0001;
        points.rotation.y += 0.0001;
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Responsive
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Inicializar background (opcional, se puede comentar si no se desea)
// initializeThreeBackground();

// ========================================
// SMOOTH SCROLL
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ========================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ========================================
window.exportarBitacora = exportarBitacora;
window.exportarFiltrosExcel = exportarFiltrosExcel;
// window.archivarPeriodo = archivarPeriodo; // COMENTADO - Usar la función real de sabana-functions.js
window.verHistorialFiltros = verHistorialFiltros;
window.mostrarNotificacion = mostrarNotificacion;
window.aplicarPrioridad = aplicarPrioridad;
window.animarNuevaTarjeta = animarNuevaTarjeta;

// ========================================
// OVERRIDE: generarMantenimientosHTMLSimple con nuevo estilo
// ========================================
// Esperar a que se cargue app-loader.js y sobrescribir la función
setTimeout(() => {
    if (typeof window.generarMantenimientosHTMLSimple !== 'undefined') {
        console.log('⚠️ Sobrescribiendo generarMantenimientosHTMLSimple con nuevo estilo...');
    }
    
    window.generarMantenimientosHTMLSimpleOriginal = window.generarMantenimientosHTMLSimple;
    
    window.generarMantenimientosHTMLSimple = function(mantenimientos) {
        if (!mantenimientos || mantenimientos.length === 0) {
            return '<li class="mensaje-no-mantenimientos" style="padding: 1rem; text-align: center; color: var(--gris-grafito);"><i class="fas fa-check-circle"></i> Sin servicios pendientes</li>';
        }
        
        return mantenimientos.map(mant => {
            const esAlerta = mant.tipo === 'rutina';
            const iconoTipo = esAlerta ? 'fa-bell' : 'fa-wrench';
            const clasePrioridad = esAlerta ? 'prioridad-media' : 'prioridad-baja';
            
            return `
            <li class="mantenimiento ${clasePrioridad}" 
                id="mantenimiento-${mant.id}"
                style="padding: 0.75rem; background: var(--gris-claro); border-left: 4px solid; border-radius: 4px; margin-bottom: 0.5rem;">
                <div class="vista-mantenimiento" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                            <i class="fas ${iconoTipo}" style="color: var(--verde-oliva);"></i>
                            <span class="mantenimiento-descripcion" style="font-weight: 600;">
                                ${escapeHtml(mant.descripcion)}
                            </span>
                        </div>
                        <div class="acciones-mantenimiento" style="display: flex; gap: 0.25rem;">
                            <button class="boton-accion-inline eliminar brutalist-btn-small" 
                                    onclick="eliminarMantenimientoInline(${mant.id}, ${mant.cuarto_id})" 
                                    title="Eliminar"
                                    style="padding: 0.25rem 0.5rem; border: 2px solid var(--negro-carbon); background: var(--blanco); cursor: pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${esAlerta && (mant.hora || mant.dia_alerta) ? `
                        <div class="tiempo-rutina" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--gris-grafito);">
                            <i class="far fa-clock"></i>
                            <span>
                                ${mant.dia_alerta ? formatearFecha(mant.dia_alerta) + ' ' : ''}
                                ${mant.hora ? formatearHora(mant.hora) : ''}
                            </span>
                        </div>
                    ` : ''}
                    <div class="tiempo-registro" style="font-size: 0.8rem; color: var(--gris-grafito);">
                        <i class="far fa-calendar-alt"></i>
                        Registrado: ${formatearFechaCompleta(mant.fecha_registro)}
                    </div>
                </div>
            </li>
            `;
        }).join('');
    };
}, 1000);

// ========================================
// MANEJO DE CAMPOS DE ALERTA CONDICIONALES
// ========================================
function handleTipoSwitchChange(switchElement) {
    const tipoHidden = document.getElementById('tipoHiddenLateral');
    const alertaFieldsContainer = document.getElementById('alertaFieldsContainer');
    
    if (!alertaFieldsContainer) {
        console.error('❌ No se encontró el contenedor de campos de alerta');
        return;
    }
    
    if (switchElement.checked) {
        // Modo ALERTA activado
        console.log('✅ Modo ALERTA activado - Mostrando campos');
        if (tipoHidden) tipoHidden.value = 'rutina';
        alertaFieldsContainer.classList.add('show');
        alertaFieldsContainer.style.display = 'block';
    } else {
        // Modo AVERÍA activado
        console.log('⚠️ Modo AVERÍA activado - Ocultando campos');
        if (tipoHidden) tipoHidden.value = 'normal';
        alertaFieldsContainer.classList.remove('show');
        alertaFieldsContainer.style.display = 'none';
    }
}

// Hacer la función global para que pueda ser llamada desde el HTML
window.handleTipoSwitchChange = handleTipoSwitchChange;

// ========================================
// FUNCIONES PARA INSPECCIONES - ACCIONES RÁPIDAS
// ========================================

/**
 * Muestra el formulario de acción rápida seleccionado
 * @param {string} formId - ID del formulario a mostrar
 */
function mostrarFormularioAccion(formId) {
    // Ocultar todos los formularios de acciones
    const todosLosFormularios = document.querySelectorAll('.accion-form-container');
    todosLosFormularios.forEach(form => {
        form.style.display = 'none';
    });
    
    // Mostrar el formulario seleccionado
    const formularioSeleccionado = document.getElementById(formId);
    if (formularioSeleccionado) {
        formularioSeleccionado.style.display = 'block';
        
        // Scroll suave hacia el formulario
        formularioSeleccionado.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Inicializar canvas de firma si es el formulario de firma
        if (formId === 'formFirma') {
            inicializarCanvasFirma();
        }
    }
}

/**
 * Cierra el formulario de acción rápida
 * @param {string} formId - ID del formulario a cerrar
 */
function cerrarFormularioAccion(formId) {
    const formulario = document.getElementById(formId);
    if (formulario) {
        formulario.style.display = 'none';
    }
}

/**
 * Inicializa el canvas de firma digital
 */
function inicializarCanvasFirma() {
    const canvas = document.getElementById('canvasFirma');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let dibujando = false;
    let posX = 0;
    let posY = 0;
    
    // Ajustar tamaño del canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    // Configurar estilo de dibujo
    ctx.strokeStyle = '#1E1E1E';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Eventos de mouse
    canvas.addEventListener('mousedown', (e) => {
        dibujando = true;
        const rect = canvas.getBoundingClientRect();
        posX = e.clientX - rect.left;
        posY = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!dibujando) return;
        
        const rect = canvas.getBoundingClientRect();
        const newX = e.clientX - rect.left;
        const newY = e.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(posX, posY);
        ctx.lineTo(newX, newY);
        ctx.stroke();
        
        posX = newX;
        posY = newY;
    });
    
    canvas.addEventListener('mouseup', () => {
        dibujando = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        dibujando = false;
    });
    
    // Eventos táctiles para dispositivos móviles
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        dibujando = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        posX = touch.clientX - rect.left;
        posY = touch.clientY - rect.top;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!dibujando) return;
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const newX = touch.clientX - rect.left;
        const newY = touch.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(posX, posY);
        ctx.lineTo(newX, newY);
        ctx.stroke();
        
        posX = newX;
        posY = newY;
    });
    
    canvas.addEventListener('touchend', () => {
        dibujando = false;
    });
}

/**
 * Limpia el canvas de firma
 */
function limpiarFirma() {
    const canvas = document.getElementById('canvasFirma');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Hacer las funciones globales
window.mostrarFormularioAccion = mostrarFormularioAccion;
window.cerrarFormularioAccion = cerrarFormularioAccion;
window.limpiarFirma = limpiarFirma;

console.log('✨ JW Marriott Enhanced Frontend loaded successfully');
