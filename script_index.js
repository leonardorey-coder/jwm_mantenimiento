// --- Registro del Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js') // Cambiado a ruta relativa
        .then(registration => {
        console.log('ServiceWorker registrado con éxito:', registration.scope);
        })
        .catch(error => {
        console.log('Fallo en el registro de ServiceWorker:', error);
        });
    });
}
// --- Fin Registro del Service Worker ---

// --- INICIO: Lógica de filtrado y búsqueda con JavaScript ---

const inputBusqueda = document.getElementById('buscarCuarto');
const selectEdificio = document.getElementById('filtroEdificio');
const listaCuartos = document.getElementById('listaCuartos');
const todosLosCuartos = listaCuartos.querySelectorAll('li.cuarto'); // Obtener todos los LIs una vez
const mensajeNoResultados = document.getElementById('mensajeNoResultados');
const selectCuartoLateral = document.getElementById('cuartoMantenimientoLateral'); // Referencia al select lateral
const listaAlertasEmitidasContainer = document.getElementById('listaAlertasEmitidas'); // Contenedor para alertas emitidas
const mensajeNoAlertasEmitidas = document.getElementById('mensaje-no-alertas-emitidas'); // Mensaje

// Obtener referencias a los nuevos elementos
const inputBusquedaAveria = document.getElementById('buscarAveria');

// --- INICIO: Almacenamiento de Alertas Descartadas ---
const LOCAL_STORAGE_KEY_DESCARTADAS = 'alertasEmitidasDescartadasHoy';
let alertasDescartadasHoy = new Set();

// Cargar IDs descartados desde localStorage al inicio
function cargarAlertasDescartadas() {
    const hoyStr = new Date().toISOString().split('T')[0];
    const dataGuardada = localStorage.getItem(LOCAL_STORAGE_KEY_DESCARTADAS);
    if (dataGuardada) {
        try {
            const { fecha, ids } = JSON.parse(dataGuardada);
            if (fecha === hoyStr && Array.isArray(ids)) {
                alertasDescartadasHoy = new Set(ids);
                console.log("Alertas descartadas cargadas para hoy:", alertasDescartadasHoy);
            } else {
                // Si la fecha no coincide, limpiar localStorage para el nuevo día
                localStorage.removeItem(LOCAL_STORAGE_KEY_DESCARTADAS);
                console.log("Datos de alertas descartadas de día anterior eliminados.");
            }
        } catch (e) {
            console.error("Error al parsear alertas descartadas de localStorage:", e);
            localStorage.removeItem(LOCAL_STORAGE_KEY_DESCARTADAS); // Limpiar si hay error
        }
    }
    console.log("Alertas descartadas inicializadas:", alertasDescartadasHoy);
}

// Guardar IDs descartados en localStorage
function guardarAlertasDescartadas() {
    const hoyStr = new Date().toISOString().split('T')[0];
    const dataParaGuardar = {
        fecha: hoyStr,
        ids: Array.from(alertasDescartadasHoy) // Convertir Set a Array para JSON
    };
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_DESCARTADAS, JSON.stringify(dataParaGuardar));
    } catch (e) {
        console.error("Error al guardar alertas descartadas en localStorage:", e);
    }
}
// --- FIN: Almacenamiento de Alertas Descartadas ---

function filtrarCuartos() {
    const terminoBusqueda = inputBusqueda.value.toLowerCase().trim();
    const terminoBusquedaAveria = inputBusquedaAveria ? inputBusquedaAveria.value.toLowerCase().trim() : "";
    const edificioIdSeleccionado = selectEdificio.value;
    let cuartosVisibles = 0;

    todosLosCuartos.forEach(cuarto => {
        const nombreCuarto = cuarto.dataset.nombre;
        const nombreEdificio = cuarto.dataset.edificioNombre;
        const idEdificioCuarto = cuarto.dataset.edificioId;
        const idCuarto = cuarto.id.split('-')[1];
        
        // Comprobar filtro de edificio
        const coincideEdificio = edificioIdSeleccionado === "" || edificioIdSeleccionado === idEdificioCuarto;

        // Comprobar término de búsqueda en nombre de cuarto o edificio
        const coincideBusqueda = terminoBusqueda === "" || 
                                nombreCuarto.includes(terminoBusqueda) || 
                                nombreEdificio.includes(terminoBusqueda);
        
        // NUEVO: Comprobar término de búsqueda en averías del cuarto
        let coincideAveria = true; // Por defecto, si no hay término de búsqueda de avería
        
        if (terminoBusquedaAveria !== "") {
            coincideAveria = false; // Asumimos que no coincide hasta probar
            
            // Buscar mantenimientos de tipo normal (avería) y verificar si alguno contiene el término
            const mantenimientosLista = document.getElementById(`mantenimientos-${idCuarto}`);
            if (mantenimientosLista) {
                const mantenimientos = mantenimientosLista.querySelectorAll('li.mantenimiento');
                
                mantenimientos.forEach(mantenimiento => {
                    // Solo buscar en mantenimientos que NO son de tipo "rutina" (es decir, son averías)
                    if (mantenimiento.dataset.tipo !== 'rutina') {
                        const descripcion = mantenimiento.dataset.descripcion.toLowerCase();
                        if (descripcion.includes(terminoBusquedaAveria)) {
                            coincideAveria = true;
                        }
                    }
                });
            }
        }

        // Mostrar u ocultar el cuarto basado en todos los criterios
        if (coincideEdificio && coincideBusqueda && coincideAveria) {
            cuarto.style.display = ''; // Mostrar (restaura el display por defecto)
            cuartosVisibles++;
        } else {
            cuarto.style.display = 'none'; // Ocultar
        }
    });

    // Mostrar u ocultar el mensaje de "no resultados"
    if (cuartosVisibles === 0 && todosLosCuartos.length > 0) { // Solo mostrar si originalmente había cuartos
            mensajeNoResultados.style.display = 'block';
    } else {
            mensajeNoResultados.style.display = 'none';
    }
}

// Añadir event listeners
inputBusqueda.addEventListener('input', filtrarCuartos);
selectEdificio.addEventListener('change', filtrarCuartos);

// Añadir event listener para el nuevo campo de búsqueda de averías
if (inputBusquedaAveria) {
    inputBusquedaAveria.addEventListener('input', filtrarCuartos);
}

// --- FIN: Lógica de filtrado y búsqueda con JavaScript ---

// --- INICIO: Lógica de Notificaciones ---

let alertasNotificadasHoy = new Set(); // Para no repetir notificaciones en el mismo día
let intervaloVerificacionAlertas = null;

// 1. Solicitar permiso al cargar
function solicitarPermisoNotificaciones() {
    if (!("Notification" in window)) {
        console.log("Este navegador no soporta notificaciones de escritorio.");
    } else if (Notification.permission === "granted") {
        console.log("Permiso para notificaciones ya concedido.");
        iniciarVerificacionAlertas(); // Iniciar si ya tenemos permiso
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Permiso para notificaciones concedido.");
                iniciarVerificacionAlertas(); // Iniciar después de obtener permiso
            } else {
                console.log("Permiso para notificaciones denegado.");
            }
        });
    } else {
        console.log("Permiso para notificaciones está denegado permanentemente.");
    }
}

// 2. Función para mostrar la notificación
function mostrarNotificacionAlerta(idAlerta, hora, dia, descripcion, cuartoNombre, cuartoId) { // Añadir dia
    if (Notification.permission !== "granted") return;

    const ahora = new Date();
    const hoyStr = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    // La clave de notificación sigue siendo por día y ID, para evitar múltiples notificaciones de la *misma* alerta *hoy*
    const claveNotificacion = `${hoyStr}-${idAlerta}`;

    if (alertasNotificadasHoy.has(claveNotificacion)) {
        return; // Ya notificado hoy
    }

    // Incluir día en el título si existe
    const titulo = `Alerta (${dia ? dia + ' ' : ''}${hora})`;
    const opciones = {
        body: `${cuartoNombre}: ${descripcion}`,
        icon: './icons/icon-192x192.png',
        tag: `alerta-${idAlerta}`,
        renotify: true,
        data: {
            cuartoId: cuartoId
        }
    };

    const notificacion = new Notification(titulo, opciones);
    alertasNotificadasHoy.add(claveNotificacion);
    console.log(`Notificación mostrada para alerta ${idAlerta}`);

    notificacion.onclick = (event) => {
        console.log("Notificación clickeada", event.notification.data);
        // Enfocar la ventana/tab si existe
        window.focus();
        // Ir al cuarto correspondiente
        if (event.notification.data && event.notification.data.cuartoId) {
            scrollToCuarto(event.notification.data.cuartoId);
        }
        // Cerrar la notificación
        event.notification.close();
    };
}


// 3. Función que verifica las alertas y actualiza emitidas
function verificarAlertas() {
    if (Notification.permission !== "granted") {
        // Si se deniega el permiso después de iniciar, detener verificaciones
        if (intervaloVerificacionAlertas) {
            clearInterval(intervaloVerificacionAlertas);
            intervaloVerificacionAlertas = null;
            console.log("Permiso denegado, deteniendo verificación de alertas.");
        }
        return;
    }

    const ahora = new Date();
    const horaActual = ahora.getHours().toString().padStart(2, '0');
    const minutoActual = ahora.getMinutes().toString().padStart(2, '0');
    const horaMinutoActual = `${horaActual}:${minutoActual}`;
    const hoyStr = ahora.toISOString().split('T')[0]; // YYYY-MM-DD en hora local
    
    console.log("Verificando alertas:", horaMinutoActual, "- Fecha actual:", hoyStr);

    const listaAlertasPanel = document.querySelectorAll('.lista-vista-rutinas .rutina-item');
    let algunaEmitidaNueva = false;

    listaAlertasPanel.forEach(itemAlerta => {
        const horaAlerta = itemAlerta.dataset.horaRaw; // HH:MM
        const diaAlerta = itemAlerta.dataset.diaRaw; // YYYY-MM-DD
        const idAlerta = String(itemAlerta.id.split('-')[1]); // Convertir a string para consistencia
        const descripcion = itemAlerta.dataset.descripcion;
        const cuartoNombre = itemAlerta.dataset.cuartoNombre;
        const cuartoId = itemAlerta.dataset.cuartoId;
        
        // Validar que la alerta tenga datos completos
        if (!diaAlerta || !horaAlerta) {
            console.log(`Alerta ${idAlerta} ignorada por falta de fecha/hora`);
            return; // Continuar con la siguiente alerta
        }
        
        // Verificación de alerta para hoy o fecha pasada
        const diaAlertaDate = new Date(diaAlerta + 'T00:00:00');
        const hoyDate = new Date(hoyStr + 'T00:00:00');
        
        // Crear objetos Date completos para la comparación exacta (con hora)
        const [year, month, day] = diaAlerta.split('-').map(Number);
        const [alertHour, alertMinute] = horaAlerta.split(':').map(Number);
        const fechaHoraAlerta = new Date(year, month - 1, day, alertHour, alertMinute, 0);
        
        // Fechas iguales (mismo día) - para mostrar notificación puntual
        const esMismoDia = diaAlertaDate.getTime() === hoyDate.getTime();
        const esHoraExacta = horaAlerta === horaMinutoActual;
        
        // Alerta ya pasó (para agregar a Emitidas Hoy)
        const alertaYaPaso = fechaHoraAlerta < ahora;
        
        console.log(`Evaluando alerta ${idAlerta}: día=${diaAlerta}, hora=${horaAlerta}`, 
                     `¿Mismo día?: ${esMismoDia}, ¿Hora exacta?: ${esHoraExacta}, ¿Ya pasó?: ${alertaYaPaso}`);
        
        // Agregar SOLO a Emitidas Hoy cuando realmente ya pasó la fecha/hora
        if (alertaYaPaso) {
            const idEmitida = `emitida-${idAlerta}`;
            if (!alertasDescartadasHoy.has(idAlerta) && !document.getElementById(idEmitida)) {
                console.log(`Agregando alerta ${idAlerta} a emitidas (${diaAlerta} ${horaAlerta})`);
                agregarAlertaEmitida(idAlerta, horaAlerta, diaAlerta, descripcion, cuartoNombre, cuartoId);
                algunaEmitidaNueva = true;
            }
        }
        
        // Mostrar notificación SOLO si es exactamente hoy y la hora actual exacta
        if (esMismoDia && esHoraExacta) {
            console.log(`¡NOTIFICANDO alerta ${idAlerta}!`);
            mostrarNotificacionAlerta(idAlerta, formatTime12Hour(horaAlerta), formatDate(diaAlerta), descripcion, cuartoNombre, cuartoId);
        }
    });

    // Actualizar visibilidad del mensaje si se añadió alguna alerta emitida
    if (algunaEmitidaNueva) {
        actualizarMensajeEmitidasVacias();
    }

    // Reiniciar el set de notificaciones a medianoche
    if (horaMinutoActual === "00:00") {
        alertasNotificadasHoy.clear();
        alertasDescartadasHoy.clear(); // Limpiar el Set en memoria
        localStorage.removeItem(LOCAL_STORAGE_KEY_DESCARTADAS); // Limpiar localStorage
        console.log("Reiniciado el registro de notificaciones y alertas descartadas diarias.");
        // Limpiar también la lista de alertas emitidas
        if(listaAlertasEmitidasContainer) {
            listaAlertasEmitidasContainer.innerHTML = '';
            actualizarMensajeEmitidasVacias();
        }
    }
}

// NUEVO: Función para agregar un item a la lista de Alertas Emitidas
function agregarAlertaEmitida(idAlerta, horaAlerta, diaAlerta, descripcion, cuartoNombre, cuartoId) { // Añadir diaAlerta
    if (!listaAlertasEmitidasContainer) {
        console.error("Error: Container de alertas emitidas no encontrado");
        return;
    }
    
    if (alertasDescartadasHoy.has(idAlerta)) {
        console.log(`Alerta ${idAlerta} ya fue descartada, no se agrega`);
        return;
    }

    const idEmitida = `emitida-${idAlerta}`;
    if (document.getElementById(idEmitida)) {
        console.log(`Alerta ${idAlerta} ya existe en el DOM, no se duplica`);
        return;
    }

    console.log(`Creando elemento DOM para alerta emitida ${idAlerta}`);
    const li = document.createElement('li');
    li.className = 'alerta-emitida-item';
    li.id = idEmitida;
    // Incluir día formateado
    li.innerHTML = `
        <span class="alerta-emitida-hora">${formatDate(diaAlerta)} ${formatTime12Hour(horaAlerta)}</span>
        <span class="alerta-emitida-info">
            <span class="alerta-emitida-cuarto" title="ID Cuarto: ${cuartoId}">${escapeHTML(cuartoNombre)}</span>
            <span class="alerta-emitida-descripcion">${escapeHTML(descripcion)}</span>
        </span>
        <button class="boton-dismiss-alerta" data-alerta-id="${idAlerta}" title="Descartar alerta emitida">×</button>
    `;
    listaAlertasEmitidasContainer.appendChild(li);
    console.log(`Alerta ${idAlerta} agregada a la lista de emitidas`);
    
    // Asegurar que la lista sea visible
    actualizarMensajeEmitidasVacias();
}

// NUEVO: Función para actualizar el mensaje de "no hay alertas emitidas"
function actualizarMensajeEmitidasVacias() {
    if (listaAlertasEmitidasContainer && mensajeNoAlertasEmitidas) {
        if (listaAlertasEmitidasContainer.children.length === 0) {
            mensajeNoAlertasEmitidas.style.display = 'block';
        } else {
            mensajeNoAlertasEmitidas.style.display = 'none';
        }
    }
}

// 4. Iniciar la verificación periódica (solo si se concede permiso)
function iniciarVerificacionAlertas() {
    if (intervaloVerificacionAlertas) return; // Ya iniciado
    if (Notification.permission === "granted") {
        console.log("Iniciando verificación periódica de alertas...");
        verificarAlertas(); // Verificar inmediatamente al iniciar
        
        // Verificar cada minuto (60000ms)
        intervaloVerificacionAlertas = setInterval(verificarAlertas, 60000);
    } else {
        // Si no hay permiso, al menos intentar poblar las emitidas una vez
        verificarAlertas();
    }
}

// --- FIN: Lógica de Notificaciones ---

// Función para mostrar/ocultar campos de alerta en el formulario lateral
function toggleCamposAlertaLateral(mostrar) {
    const horaContainer = document.getElementById('horaRutinaLateralContainer');
    const horaInput = document.getElementById('horaRutinaLateral');
    const diaContainer = document.getElementById('diaAlertaLateralContainer'); // NUEVO
    const diaInput = document.getElementById('diaAlertaLateral'); // NUEVO
    const horaLabel = horaContainer.querySelector('label');
    const diaLabel = diaContainer.querySelector('label'); // NUEVO

    if (mostrar) {
        horaContainer.style.display = 'block';
        diaContainer.style.display = 'block'; // NUEVO
        horaInput.required = true;
        diaInput.required = true; // NUEVO
        if (horaLabel) horaLabel.textContent = 'Hora de la Alerta';
        if (diaLabel) diaLabel.textContent = 'Día de la Alerta'; // NUEVO
    } else {
        horaContainer.style.display = 'none';
        diaContainer.style.display = 'none'; // NUEVO
        horaInput.required = false;
        diaInput.required = false; // NUEVO
        horaInput.value = '';
        diaInput.value = ''; // NUEVO
        if (horaLabel) horaLabel.textContent = 'Hora de la Alerta';
        if (diaLabel) diaLabel.textContent = 'Día de la Alerta'; // NUEVO
    }
}

// --- INICIO: Nueva función para manejar el cambio del switch ---
function handleTipoSwitchChange(checkbox) {
    const isRutina = checkbox.checked;
    const hiddenInput = document.getElementById('tipoHiddenLateral');
    const switchLabel = document.getElementById('switchLabelLateral');

    if (isRutina) {
        hiddenInput.value = 'rutina';
        switchLabel.textContent = 'Alerta';
        toggleCamposAlertaLateral(true); // Modificado para mostrar/ocultar ambos campos
    } else {
        hiddenInput.value = 'normal'; // Mantenemos 'normal' en el valor del input para compatibilidad con la BD
        switchLabel.textContent = 'Avería'; // Cambiamos el texto de la interfaz a "Avería"
        toggleCamposAlertaLateral(false); // Modificado para mostrar/ocultar ambos campos
    }
}
// --- FIN: Nueva función para manejar el cambio del switch ---

// --- INICIO: Función para actualizar la selección visual ---
function actualizarSeleccionVisual(selectedId) {
    // Quitar la clase de todos los cuartos primero
    todosLosCuartos.forEach(card => {
        card.classList.remove('cuarto-seleccionado');
    });

    // Si hay un ID seleccionado, añadir la clase al cuarto correspondiente
    if (selectedId) {
        const selectedCard = document.getElementById(`cuarto-${selectedId}`);
        if (selectedCard) {
            selectedCard.classList.add('cuarto-seleccionado');
        }
    }
}
// --- FIN: Función para actualizar la selección visual ---


// Asegurarse de que el estado inicial sea correcto al cargar la página
document.addEventListener('DOMContentLoaded', () => {

    // --- INICIO: Cargar alertas descartadas ---
    cargarAlertasDescartadas();
    // --- FIN: Cargar alertas descartadas ---

    // --- INICIO: Solicitar permiso para notificaciones ---
    solicitarPermisoNotificaciones(); // Esto llamará a iniciarVerificacionAlertas si hay permiso
    // --- FIN: Solicitar permiso ---

    // --- INICIO: Lazy Loading con Intersection Observer ---
    const lazyCuartos = document.querySelectorAll('.cuarto-lazy');

    if ("IntersectionObserver" in window) {
        let lazyObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('cuarto-lazy'); // Mostrar la tarjeta
                    observer.unobserve(entry.target); // Dejar de observar esta tarjeta
                }
            });
        }, { rootMargin: "0px 0px -50px 0px" }); // Empezar a cargar un poco antes de que entre completamente

        lazyCuartos.forEach((cuarto) => {
            lazyObserver.observe(cuarto);
        });
    } else {
        // Fallback para navegadores sin IntersectionObserver (mostrar todo)
        lazyCuartos.forEach((cuarto) => {
            cuarto.classList.remove('cuarto-lazy');
        });
    }
    // --- FIN: Lazy Loading con Intersection Observer ---


    // --- INICIO: Listener único en el contenedor usando delegación ---
    listaCuartos.addEventListener('click', (event) => {
        const cuartoCard = event.target.closest('li.cuarto');
        if (!cuartoCard) return;
        if (event.target.tagName === 'BUTTON' || event.target.closest('button')) return;
        if (event.target.closest('.lista-mantenimientos')) return;

        const cuartoId = cuartoCard.id.split('-')[1];
        if (selectCuartoLateral && cuartoId) {
            // Actualizar el valor del select Y la clase visual
            if (selectCuartoLateral.value !== cuartoId) {
                selectCuartoLateral.value = cuartoId;
                actualizarSeleccionVisual(cuartoId); // Actualizar visualmente
            } else {
                // Si ya estaba seleccionado, solo asegurar que tenga la clase
                actualizarSeleccionVisual(cuartoId);
            }

            // Scroll suave en pantallas pequeñas
            if (window.innerWidth < 992) {
                const formContainer = document.querySelector('.formulario-mantenimiento-lateral');
                if (formContainer) {
                    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }
    });
    // --- FIN: Listener único en el contenedor ---

    // --- INICIO: Listener para cambios en el select lateral ---
    // Asegura que si se cambia el select manualmente, la tarjeta se actualice
    selectCuartoLateral.addEventListener('change', () => {
        actualizarSeleccionVisual(selectCuartoLateral.value);
    });
    // --- FIN: Listener para cambios en el select lateral ---


    // Asegurar estado inicial del switch y campo hora
    const initialSwitch = document.getElementById('tipoMantenimientoSwitchLateral');
    if (initialSwitch) {
        handleTipoSwitchChange(initialSwitch);
    }

    // Añadir funcionalidad para preparar edición de edificio desde el modal
        window.prepararEditarEdificio = function(id, nombre) {
            document.getElementById('edificioId').value = id;
            document.getElementById('editarNombreEdificio').value = nombre;
            // Opcional: Enfocar el campo de nombre
            document.getElementById('editarNombreEdificio').focus();
        }

        // Opcional: Aplicar selección visual inicial si el select tiene un valor precargado al cargar la página
        // if (selectCuartoLateral.value) {
        //    actualizarSeleccionVisual(selectCuartoLateral.value);
        // }

    // --- INICIO: Listener para descartar Alertas Emitidas (Delegación) ---
    if (listaAlertasEmitidasContainer) {
        listaAlertasEmitidasContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('boton-dismiss-alerta')) {
                const alertaId = String(event.target.dataset.alertaId); // Convertir a string para consistencia
                const item = event.target.closest('.alerta-emitida-item');
                if (item && alertaId) {
                    // Añadir al Set y guardar en localStorage
                    alertasDescartadasHoy.add(alertaId);
                    guardarAlertasDescartadas();
                    console.log(`Alerta ${alertaId} descartada y guardada en localStorage.`);

                    // Animación opcional de fade-out y eliminación del DOM
                    item.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                    item.style.opacity = '0';
                    item.style.transform = 'translateX(20px)';
                    setTimeout(() => {
                        item.remove();
                        actualizarMensajeEmitidasVacias(); // Verificar si la lista quedó vacía
                    }, 300);
                }
            }
        });
    }
    // --- FIN: Listener para descartar Alertas Emitidas ---

    // Actualizar estado inicial del mensaje de emitidas vacías
    actualizarMensajeEmitidasVacias();

    // --- INICIO: Manejar envío del formulario para evitar múltiples registros ---
    const formMantenimiento = document.getElementById('formAgregarMantenimientoLateral');
    if (formMantenimiento) {
        formMantenimiento.addEventListener('submit', function(event) {
            // Obtener el botón de envío
            const submitButton = this.querySelector('button[type="submit"]');
            
            // Validación del formulario (los campos required ya son validados por el navegador)
            const tipoHidden = document.getElementById('tipoHiddenLateral');
            const esRutina = tipoHidden && tipoHidden.value === 'rutina';
            
            if (esRutina) {
                const horaInput = document.getElementById('horaRutinaLateral');
                const diaInput = document.getElementById('diaAlertaLateral');
                
                if (!horaInput.value.trim()) {
                    alert('La hora es obligatoria para alertas.');
                    horaInput.focus();
                    event.preventDefault();
                    return false;
                }
                
                if (!diaInput.value.trim()) {
                    alert('El día es obligatorio para alertas.');
                    diaInput.focus();
                    event.preventDefault();
                    return false;
                }
            }
            
            // Si pasa todas las validaciones, deshabilitar el botón y cambiar texto
            submitButton.disabled = true;
            submitButton.classList.add('button-disabled');
            
            // Guardar el texto original
            submitButton.dataset.originalText = submitButton.textContent;
            submitButton.textContent = 'Registrando...';
            
            // Continuar con el envío (no usamos event.preventDefault() aquí)
            // El formulario se enviará normalmente
            
            // Configurar un temporizador de seguridad para reactivar el botón
            // después de 10 segundos en caso de que la redirección no ocurra
            setTimeout(() => {
                if (document.body.contains(submitButton)) {
                    submitButton.disabled = false;
                    submitButton.classList.remove('button-disabled');
                    submitButton.textContent = submitButton.dataset.originalText || 'Registrar';
                }
            }, 10000);
        });

        // Limpiar campos y reactivar botón después de redirección/recarga
        // Esto es útil si el usuario usa el botón "Atrás" del navegador
        window.addEventListener('pageshow', function(event) {
            // El evento pageshow se dispara incluso cuando se navega desde caché
            const submitButton = formMantenimiento.querySelector('button[type="submit"]');
            if (submitButton && submitButton.disabled) {
                submitButton.disabled = false;
                submitButton.classList.remove('button-disabled');
                submitButton.textContent = submitButton.dataset.originalText || 'Registrar';
            }
            
            // Opcional: Limpiar campos del formulario
            const descripcionInput = document.getElementById('descripcionMantenimientoLateral');
            if (descripcionInput) descripcionInput.value = '';
            
            const horaInput = document.getElementById('horaRutinaLateral');
            if (horaInput) horaInput.value = '';
            
            const diaInput = document.getElementById('diaAlertaLateral');
            if (diaInput) diaInput.value = '';
        });
    }
    // --- FIN: Manejar envío del formulario ---

});

// --- INICIO: Función para hacer scroll al cuarto desde la lista de rutinas ---
// Nota: Esta función asume que el ID del mantenimiento es único y se puede usar
// para encontrar el cuarto asociado si es necesario, o mejor, usar el ID del cuarto directamente.
// Modificaremos el botón para pasar el ID del cuarto.
function scrollToCuarto(cuartoId) { // Cambiado a cuartoId
    const cuartoCard = document.getElementById(`cuarto-${cuartoId}`);
    if (cuartoCard) {
        // Asegurarse de que el cuarto esté visible (por si estaba filtrado)
        // Podríamos quitar filtros o simplemente hacer scroll
        // Por simplicidad, solo haremos scroll. Si está oculto, no se verá.
        cuartoCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Opcional: Resaltar la tarjeta brevemente
        cuartoCard.classList.add('resaltar');
        setTimeout(() => {
            cuartoCard.classList.remove('resaltar');
        }, 2000); // Duración del resaltado (igual que la animación CSS)

        // También seleccionar en el dropdown lateral
        if (selectCuartoLateral) {
            selectCuartoLateral.value = cuartoId;
            actualizarSeleccionVisual(cuartoId); // Actualizar borde azul
        }
    }
}
// --- FIN: Función para hacer scroll al cuarto ---

// --- INICIO: Funciones para Edición/Eliminación Inline ---

function mostrarEdicionInline(mantenimientoId) {
    const item = document.getElementById(`mantenimiento-${mantenimientoId}`);
    if (!item) return;
    item.querySelector('.vista-mantenimiento').style.display = 'none';
    item.querySelector('.edicion-inline-mantenimiento').style.display = 'flex'; // O 'block' según el CSS
    item.classList.add('editando'); // Añadir clase para posible estilo
}

function ocultarEdicionInline(mantenimientoId) {
    const item = document.getElementById(`mantenimiento-${mantenimientoId}`);
    if (!item) return;
    item.querySelector('.vista-mantenimiento').style.display = 'flex'; // O 'block'
    item.querySelector('.edicion-inline-mantenimiento').style.display = 'none';
    item.classList.remove('editando'); // Quitar clase

    // Opcional: Resetear valores del input a los originales si se cancela
    const descInput = item.querySelector('.input-editar-descripcion');
    const horaInput = item.querySelector('.input-editar-hora');
    descInput.value = item.dataset.descripcion;
    if (horaInput) {
        horaInput.value = item.dataset.hora;
    }
}

async function guardarMantenimientoInline(mantenimientoId) {
    const item = document.getElementById(`mantenimiento-${mantenimientoId}`);
    if (!item) return;

    const descInput = item.querySelector('.input-editar-descripcion');
    const horaInput = item.querySelector('.input-editar-hora');
    const diaInput = item.querySelector('.input-editar-dia'); // NUEVO

    const nuevaDescripcion = descInput.value.trim();
    const nuevaHora = horaInput ? horaInput.value : null;
    const nuevaFecha = diaInput ? diaInput.value : null; // NUEVO
    const tipo = item.dataset.tipo;
    const cuartoId = item.dataset.cuartoId;

    if (!nuevaDescripcion) {
        alert('La descripción no puede estar vacía.');
        descInput.focus();
        return;
    }
    if (tipo === 'rutina') {
        if (!nuevaHora) {
            alert('La hora es obligatoria para las alertas.');
            horaInput.focus();
            return;
        }
        if (!nuevaFecha) { // NUEVO
            alert('El día es obligatorio para las alertas.');
            diaInput.focus();
            return;
        }
    }

    const datos = {
        accion: 'editar_mantenimiento_inline',
        mantenimiento_id: mantenimientoId,
        cuarto_id: cuartoId,
        descripcion: nuevaDescripcion,
        tipo: tipo,
        hora: nuevaHora,
        dia_alerta: nuevaFecha // NUEVO
    };

    try {
        const response = await fetch('procesar.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(datos)
        });

        const resultado = await response.json();

        if (resultado.success) {
            // Actualizar el DOM con los nuevos datos
            const descSpan = item.querySelector('.vista-mantenimiento .mantenimiento-descripcion');
            const tiempoRutinaSpan = descSpan.querySelector('.tiempo-rutina');
            const tiempoRegistroSpanHTML = descSpan.querySelector('.tiempo-registro').outerHTML; // Guardar el span de registro

            // Reconstruir el span de descripción
            descSpan.innerHTML = `
                ${escapeHTML(nuevaDescripcion)}
                ${tipo === 'rutina' && (nuevaHora || nuevaFecha) ?
                    `<span class="tiempo-rutina">
                        ${nuevaFecha ? formatDate(nuevaFecha) + ' ' : ''}
                        ${nuevaHora ? formatTime12Hour(nuevaHora) : ''}
                    </span>`
                : ''}
                ${tiempoRegistroSpanHTML}
            `;

            // Actualizar atributos data-*
            item.dataset.descripcion = nuevaDescripcion;
            if (tipo === 'rutina') {
                item.dataset.hora = nuevaHora || '';
                item.dataset.dia = nuevaFecha || ''; // NUEVO
            }

            ocultarEdicionInline(mantenimientoId);

            // ---- Actualizar la card en Alertas ----
            if (tipo === 'rutina') {
                const alertaCard = document.getElementById(`rutina-${mantenimientoId}`);
                if (alertaCard) {
                    alertaCard.dataset.horaRaw = nuevaHora || '';
                    alertaCard.dataset.diaRaw = nuevaFecha || ''; // NUEVO
                    const descAlerta = alertaCard.querySelector('.rutina-descripcion');
                    if (descAlerta) descAlerta.textContent = nuevaDescripcion;
                    const horaAlertaSpan = alertaCard.querySelector('.rutina-hora'); // El span que muestra día y hora
                    if (horaAlertaSpan) {
                        horaAlertaSpan.textContent = `${nuevaFecha ? formatDateShort(nuevaFecha) : '??/??'} ${nuevaHora ? formatTime12Hour(nuevaHora) : '--:--'}`;
                    }
                    // Reordenar visualmente si es necesario (más complejo, omitido por ahora)
                }
            }
            // ---- Actualizar la card en Mantenimientos Recientes ----
            const recienteCard = document.getElementById(`reciente-${mantenimientoId}`);
            if (recienteCard) {
                const descReciente = recienteCard.querySelector('.reciente-descripcion');
                if (descReciente) descReciente.textContent = nuevaDescripcion;
                if (tipo === 'rutina') {
                    const horaRecienteSpan = recienteCard.querySelector('.reciente-hora'); // El span que muestra día y hora
                    if (horaRecienteSpan) {
                         horaRecienteSpan.textContent = `${nuevaFecha ? formatDate(nuevaFecha) + ' ' : ''}${nuevaHora ? formatTime12Hour(nuevaHora) : ''}`;
                    } else if (nuevaFecha || nuevaHora) { // Si no existía el span pero ahora hay fecha/hora
                         // Crear y añadir el span (simplificado, ajustar según estructura exacta)
                         const infoSpan = recienteCard.querySelector('.reciente-info');
                         const newSpan = document.createElement('span');
                         newSpan.className = 'reciente-hora';
                         newSpan.textContent = `${nuevaFecha ? formatDate(nuevaFecha) + ' ' : ''}${nuevaHora ? formatTime12Hour(nuevaHora) : ''}`;
                         // Insertar antes del span de fecha de registro
                         const fechaRegistroSpan = infoSpan.querySelector('.reciente-fecha');
                         if (fechaRegistroSpan) {
                             infoSpan.insertBefore(newSpan, fechaRegistroSpan);
                         } else {
                             infoSpan.appendChild(newSpan);
                         }
                    }
                } else { // Si cambió de rutina a normal, eliminar el span de hora/fecha
                    const horaRecienteSpan = recienteCard.querySelector('.reciente-hora');
                    if (horaRecienteSpan) horaRecienteSpan.remove();
                }
            }
        } else {
            alert('Error al actualizar: ' + (resultado.message || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error en fetch:', error);
        alert('Error de conexión al intentar guardar.');
    }
}

async function eliminarMantenimientoInline(mantenimientoId, cuartoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este mantenimiento?')) {
        return;
    }

    const datos = {
        accion: 'eliminar_mantenimiento_inline',
        mantenimiento_id: mantenimientoId,
        cuarto_id: cuartoId // Enviar cuarto_id para actualizar contador
    };

    try {
        const response = await fetch('procesar.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(datos)
        });

        const resultado = await response.json();

        if (resultado.success) {
            const item = document.getElementById(`mantenimiento-${mantenimientoId}`);
            if (item) {
                item.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    item.remove();
                    // Verificar si era el último mantenimiento para mostrar mensaje
                    const lista = document.getElementById(`mantenimientos-${cuartoId}`);
                    if (lista && lista.children.length === 0) {
                        lista.innerHTML = '<li class="mensaje-no-mantenimientos">No hay mantenimientos registrados para este cuarto.</li>';
                    }
                }, 300); // Esperar a que termine la animación
            }
            // Actualizar contador en la tarjeta principal
            const contadorSpan = document.getElementById(`contador-mantenimientos-${cuartoId}`);
            if (contadorSpan) {
                const nuevoValor = parseInt(contadorSpan.textContent) - 1;
                contadorSpan.textContent = Math.max(0, nuevoValor); // Evitar negativos
            }
                // alert('Mantenimiento eliminado'); // O notificación sutil

            // ---- NUEVO: Eliminar de panel "Alertas" ----
            const alertaCard = document.getElementById(`rutina-${mantenimientoId}`);
            if (alertaCard) {
                alertaCard.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                alertaCard.style.opacity = '0';
                alertaCard.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    alertaCard.remove();
                    const listaAlertas = document.querySelector('.lista-vista-rutinas');
                    if (listaAlertas && listaAlertas.children.length === 0) {
                        listaAlertas.innerHTML = '<li class="mensaje-no-rutinas">No hay alertas programadas.</li>';
                    }
                }, 300);
            }
            // ---- NUEVO: Eliminar de panel "Mantenimientos Recientes" ----
            const recienteCard = document.getElementById(`reciente-${mantenimientoId}`);
            if (recienteCard) {
                recienteCard.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                recienteCard.style.opacity = '0';
                recienteCard.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    recienteCard.remove();
                    const listaRecientes = document.querySelector('.lista-vista-recientes');
                    if (listaRecientes && listaRecientes.children.length === 0) {
                        listaRecientes.innerHTML = '<li class="mensaje-no-recientes">No hay mantenimientos recientes.</li>';
                    }
                }, 300);
            }
        } else {
            alert('Error al eliminar: ' + (resultado.message || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error en fetch:', error);
        alert('Error de conexión al intentar eliminar.');
    }
}

// Funciones auxiliares
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function formatTime12Hour(timeString) { // timeString en formato HH:MM
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours);
    const m = parseInt(minutes);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12; // Convertir 0 a 12
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
} // No contiene texto "Rutina"

// NUEVA función auxiliar para formatear fecha
function formatDate(dateString) { // dateString en formato YYYY-MM-DD
    if (!dateString) return '';
    try {
        const [year, month, day] = dateString.split('-');
        // Asegurarse de que los componentes son válidos si es necesario
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString; // Devolver original si hay error
    }
}
// NUEVA función auxiliar para formatear fecha corta (DD/MM)
function formatDateShort(dateString) { // dateString en formato YYYY-MM-DD
    if (!dateString) return '??/??';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}`;
    } catch (e) {
        return '??/??';
    }
}

// --- FIN: Funciones para Edición/Eliminación Inline ---

// Asegurarse de que el estado inicial sea correcto al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // ... (Existing DOMContentLoaded code: lazy loading, card click, select change, switch init, prepararEditarEdificio) ...

    // Eliminar llamadas a funciones de modal si existían
});

// Eliminar funciones antiguas si ya no se usan en ningún lado
// window.abrirModalEditarMantenimiento = undefined;
// window.confirmarEliminarMantenimiento = undefined;
