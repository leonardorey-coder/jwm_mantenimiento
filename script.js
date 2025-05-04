// Variables globales
let cuartoActualId = null;

// Elementos del DOM para modales
const modalMantenimiento = document.getElementById('modalMantenimiento');
const modalEditarMantenimiento = document.getElementById('modalEditarMantenimiento');
const modalEditarEdificio = document.getElementById('modalEditarEdificio');
const modalEditarCuarto = document.getElementById('modalEditarCuarto');

// Elementos para los tipos de mantenimiento
const tipoNormalBtn = document.getElementById('tipoNormal');
const tipoRutinaBtn = document.getElementById('tipoRutina');
const formMantenimientoNormal = document.getElementById('formMantenimientoNormal');
const formMantenimientoRutina = document.getElementById('formMantenimientoRutina');
const cuartoSeleccionado = document.getElementById('cuartoSeleccionado');

// Elementos para búsqueda dinámica
const buscarCuartoInput = document.getElementById('buscarCuarto');

// Evento al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar elementos
    inicializarInputsFlotantes();
    
    // Manejar mensajes de error o éxito (si existen en la URL)
    manejarMensajes();
    
    // Configurar búsqueda en tiempo real
    configurarBusquedaTiempoReal();
});

// Función para inicializar el estado de los inputs flotantes
function inicializarInputsFlotantes() {
    const inputs = document.querySelectorAll('.input-flotante input, .input-flotante textarea');
    inputs.forEach(input => {
        // Si el input ya tiene un valor, asegurarnos de que la etiqueta esté flotando
        if (input.value.trim() !== '') {
            input.classList.add('con-valor');
        }
        
        // Agregar eventos para mantener la clase cuando cambia el valor
        input.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                this.classList.add('con-valor');
            } else {
                this.classList.remove('con-valor');
            }
        });
    });
}

// Función para manejar mensajes de error o éxito
function manejarMensajes() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Mensajes de éxito
    if (urlParams.has('mensaje')) {
        const mensaje = urlParams.get('mensaje');
        let textoMensaje = '';
        
        switch (mensaje) {
            case 'edificio_agregado':
                textoMensaje = 'Edificio agregado correctamente.';
                break;
            case 'edificio_actualizado':
                textoMensaje = 'Edificio actualizado correctamente.';
                break;
            case 'edificio_eliminado':
                textoMensaje = 'Edificio eliminado correctamente.';
                break;
            case 'cuarto_agregado':
                textoMensaje = 'Cuarto registrado correctamente.';
                break;
            case 'cuarto_actualizado':
                textoMensaje = 'Cuarto actualizado correctamente.';
                break;
            case 'cuarto_eliminado':
                textoMensaje = 'Cuarto eliminado correctamente.';
                break;
            case 'mantenimiento_agregado':
                textoMensaje = 'Mantenimiento registrado correctamente.';
                break;
            // No hay caso específico para 'mantenimiento_actualizado' o 'eliminado', se usa default
            // case 'mantenimiento_actualizado':
            //     textoMensaje = 'Mantenimiento actualizado correctamente.';
            //     break;
            // case 'mantenimiento_eliminado':
            //     textoMensaje = 'Mantenimiento eliminado correctamente.';
            //     break;
            default:
                textoMensaje = 'Operación completada correctamente.';
        }
        
        // Usar notificación más moderna si está disponible (ej. Toastify, SweetAlert) o alert simple
        // alert(textoMensaje); 
        console.log("Mensaje:", textoMensaje); // Log para depuración
    }
    
    // Mensajes de error
    if (urlParams.has('error')) {
        const error = urlParams.get('error');
        let textoError = '';
        
        switch (error) {
            case 'nombre_vacio':
                textoError = 'El nombre no puede estar vacío.';
                break;
            case 'edificio_existe':
                textoError = 'Ya existe un edificio con ese nombre.';
                break;
            case 'edificio_con_cuartos':
                textoError = 'No se puede eliminar el edificio porque tiene cuartos asociados.';
                break;
            case 'cuarto_existe':
                textoError = 'Ya existe un cuarto con ese nombre en el mismo edificio.';
                break;
            case 'datos_incompletos':
                textoError = 'Por favor, complete todos los campos obligatorios.';
                break;
            case 'hora_obligatoria': // La clave de error no cambia
                textoError = 'Para las alertas, la hora es obligatoria.'; // Mensaje cambia
                break;
            case 'error_sql':
                textoError = 'Error en la base de datos. Por favor, intente de nuevo.';
                break;
            default:
                textoError = 'Ha ocurrido un error. Por favor, intente de nuevo.';
        }
        
        // Usar notificación más moderna o alert simple
        alert(textoError); // Mostrar errores importantes al usuario
        console.error("Error:", textoError); // Log para depuración
    }
    
    // Limpiar parámetros de URL después de mostrar mensajes
    if (urlParams.has('mensaje') || urlParams.has('error')) {
        const path = window.location.pathname;
        window.history.replaceState({}, document.title, path);
    }
}

// Función para alternar visibilidad de mantenimientos
function toggleMantenimientos(idCuarto, btnToggle) {
    const listaMantenimientos = document.getElementById(`mantenimientos-${idCuarto}`);
    const cuartoCard = document.getElementById(`cuarto-${idCuarto}`); // Obtener la tarjeta del cuarto

    if (listaMantenimientos.style.display === 'none' || listaMantenimientos.style.display === '') {
        listaMantenimientos.style.display = 'block';
        btnToggle.textContent = 'Ocultar Mantenimientos';
        // Opcional: Scroll suave para asegurar que la lista sea visible si se abre hacia abajo
        // setTimeout(() => { // Pequeño delay para permitir que se muestre
        //     listaMantenimientos.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // }, 100);
    } else {
        listaMantenimientos.style.display = 'none';
        btnToggle.textContent = 'Mostrar Mantenimientos';
    }
}

// --- ELIMINADAS FUNCIONES DE MODAL ANTIGUAS ---
// function abrirModal(idCuarto, nombreCuarto, nombreEdificio) { ... }
// function cerrarModal(modal) { ... }
// function cambiarTipoMantenimiento(tipo) { ... }
// function abrirModalEditarMantenimiento(idMantenimiento, idCuarto) { ... }
// function abrirModalEditarEdificio(idEdificio, nombreEdificio) { ... }
// function abrirModalEditarCuarto(idCuarto) { ... }
// function confirmarEliminarEdificio(idEdificio, nombreEdificio) { ... }
// function confirmarEliminarCuarto(idCuarto, nombreCuarto) { ... }
// function confirmarEliminarMantenimiento(idMantenimiento, idCuarto) { ... }

// --- FIN ELIMINACIÓN ---

// Configurar búsqueda en tiempo real
function configurarBusquedaTiempoReal() {
    if (buscarCuartoInput) {
        let temporizador;
        
        buscarCuartoInput.addEventListener('input', function() {
            clearTimeout(temporizador);
            
            temporizador = setTimeout(() => {
                const termino = this.value.trim();
                
                // Obtener el formulario de filtro existente y agregar o actualizar el campo de búsqueda
                const form = document.getElementById('formFiltroEdificio');
                
                // Crear o actualizar el campo de búsqueda
                let inputBusqueda = form.querySelector('input[name="buscar"]');
                if (!inputBusqueda) {
                    inputBusqueda = document.createElement('input');
                    inputBusqueda.type = 'hidden';
                    inputBusqueda.name = 'buscar';
                    form.appendChild(inputBusqueda);
                }
                inputBusqueda.value = termino;
                
                // Enviar el formulario
                form.submit();
            }, 500); // Retraso de 500ms para no hacer demasiadas peticiones
        });
    }
}