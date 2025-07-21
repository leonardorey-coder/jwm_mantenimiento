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

// --- INICIO: Sistema de Audio para Notificaciones ---
let audioContext = null;
let alertSound = null;
let audioEnabled = true;

// Función para inicializar el contexto de audio
function inicializarAudio() {
    try {
        // Crear contexto de audio compatible con diferentes navegadores
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // Cargar el archivo de sonido
        cargarSonidoAlerta();
        
        console.log('Sistema de audio inicializado correctamente');
        return true;
    } catch (error) {
        console.warn('No se pudo inicializar el sistema de audio:', error);
        audioEnabled = false;
        return false;
    }
}

// Función para cargar el sonido de alerta
async function cargarSonidoAlerta() {
    try {
        const response = await fetch('./sounds/alert.mp3');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        alertSound = await audioContext.decodeAudioData(arrayBuffer);
        
        console.log('Sonido de alerta cargado correctamente');
    } catch (error) {
        console.warn('No se pudo cargar el sonido de alerta:', error);
        audioEnabled = false;
    }
}

// Función para reproducir el sonido de alerta
function reproducirSonidoAlerta() {
    if (!audioEnabled || !audioContext || !alertSound) {
        console.log('Audio no disponible, omitiendo sonido');
        return false;
    }
    
    try {
        // Reanudar el contexto de audio si está suspendido (requerido por algunos navegadores)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Crear y configurar el source
        const source = audioContext.createBufferSource();
        source.buffer = alertSound;
        
        // Crear un nodo de ganancia para controlar el volumen
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.7, audioContext.currentTime); // Volumen al 70%
        
        // Conectar: source -> gainNode -> destination
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Reproducir
        source.start(0);
        
        console.log('Sonido de alerta reproducido');
        return true;
    } catch (error) {
        console.error('Error al reproducir sonido de alerta:', error);
        return false;
    }
}

// Función alternativa usando HTML5 Audio (fallback)
function reproducirSonidoAlertaFallback() {
    try {
        const audio = new Audio('./sounds/alert.mp3');
        audio.volume = 0.7;
        audio.play().then(() => {
            console.log('Sonido de alerta reproducido (fallback)');
        }).catch(error => {
            console.warn('Error al reproducir sonido (fallback):', error);
        });
        return true;
    } catch (error) {
        console.error('Error en fallback de audio:', error);
        return false;
    }
}

// Función principal para reproducir sonido con fallbacks
function reproducirSonido() {
    // Intentar con Web Audio API primero
    if (!reproducirSonidoAlerta()) {
        // Si falla, usar HTML5 Audio como fallback
        reproducirSonidoAlertaFallback();
    }
}
// --- FIN: Sistema de Audio para Notificaciones ---

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
        // Aun así, verificar alertas emitidas
        verificarAlertas();
        return;
    } 
    
    // Si ya tenemos permiso, iniciamos directamente
    if (Notification.permission === "granted") {
        console.log("Permiso para notificaciones ya concedido.");
        iniciarVerificacionAlertas(); // Iniciar si ya tenemos permiso
        return;
    } 
    
    // Si el permiso fue explícitamente denegado
    if (Notification.permission === "denied") {
        console.log("Permiso para notificaciones está denegado permanentemente.");
        // Aun así, verificar alertas emitidas
        verificarAlertas();
        return;
    }
    
    // Si el permiso está en estado default (sin decidir)
    // mostramos un mensaje explicativo antes de solicitar
    console.log("Solicitando permiso para mostrar notificaciones...");
    
    // Podríamos mostrar un mensaje al usuario explicando por qué necesitamos el permiso
    // antes de solicitarlo, para aumentar la probabilidad de aceptación
    
    // Solicitar permiso
    Notification.requestPermission()
        .then(permission => {
            if (permission === "granted") {
                console.log("Permiso para notificaciones concedido.");
                // Mostrar una notificación de prueba opcional
                setTimeout(() => {
                    new Notification("Notificaciones Activadas", {
                        body: "El sistema de alertas de mantenimiento ahora puede notificarte.",
                        icon: './icons/icon-192x192.png'
                    });
                }, 1000);
                
                // Iniciar la verificación después de obtener permiso
                iniciarVerificacionAlertas();
            } else {
                console.log("Permiso para notificaciones denegado.");
                // Aun sin permiso, verificar alertas emitidas
                verificarAlertas();
            }
        })
        .catch(error => {
            console.error("Error al solicitar permiso:", error);
            // Si hay un error, al menos verificar alertas emitidas
            verificarAlertas();
        });
}

// 2. Función para mostrar la notificación
function mostrarNotificacionAlerta(idAlerta, hora, dia, descripcion, cuartoNombre, cuartoId) {
    // Verificar soporte para notificaciones
    if (!("Notification" in window)) {
        console.error("Este navegador no soporta notificaciones.");
        return;
    }
    
    // Verificar permisos
    if (Notification.permission !== "granted") {
        console.error("No hay permiso para mostrar notificaciones.");
        // Intentar solicitar permiso si está en estado default (no decidido)
        if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    // Intentarlo de nuevo después de obtener el permiso
                    setTimeout(() => mostrarNotificacionAlerta(idAlerta, hora, dia, descripcion, cuartoNombre, cuartoId), 500);
                }
            });
        }
        return;
    }

    const ahora = new Date();
    const hoyStr = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    // La clave de notificación sigue siendo por día y ID, para evitar múltiples notificaciones de la *misma* alerta *hoy*
    const claveNotificacion = `${hoyStr}-${idAlerta}`;

    if (alertasNotificadasHoy.has(claveNotificacion)) {
        console.log(`Alerta ${idAlerta} ya notificada hoy, ignorando`);
        return; // Ya notificado hoy
    }

    try {
        // Incluir día en el título si existe
        const offsetMinutos = ahora.getTimezoneOffset();
        const offsetHoras = Math.abs(Math.floor(offsetMinutos / 60));
        const offsetResto = Math.abs(offsetMinutos % 60);
        const offsetSigno = offsetMinutos <= 0 ? '+' : '-';
        const offsetStr = `UTC${offsetSigno}${offsetHoras.toString().padStart(2, '0')}:${offsetResto.toString().padStart(2, '0')}`;
        
        // Título que incluye información de zona horaria local
        const titulo = `Alerta (${dia ? dia + ' ' : ''}${hora}) - Hora local`;
        
        const opciones = {
            body: `${cuartoNombre}: ${descripcion}`,
            icon: './icons/icon-192x192.png',
            badge: './icons/badge-96x96.png', // Añadir un badge para móviles
            tag: `alerta-${idAlerta}`,
            requireInteraction: true, // La notificación permanece hasta que el usuario interactúe
            renotify: true,
            vibrate: [200, 100, 200], // Patrón de vibración para dispositivos móviles
            data: {
                cuartoId: cuartoId,
                zonaHoraria: offsetStr,
                timestamp: Date.now()
            }
        };

        // IMPORTANTE: Creamos una referencia a la notificación y la guardamos
        const notificacion = new Notification(titulo, opciones);
        
        // Marcamos como notificada antes de que termine la función
        alertasNotificadasHoy.add(claveNotificacion);
        console.log(`Notificación mostrada para alerta ${idAlerta} en zona horaria ${offsetStr} a las ${ahora.toLocaleTimeString()}`);

        // Configurar eventos de la notificación
        notificacion.onclick = (event) => {
            console.log("Notificación clickeada", event.target.data || "Sin datos");
            // Enfocar la ventana/tab si existe
            window.focus();
            // Ir al cuarto correspondiente
            scrollToCuarto(cuartoId);
            // Cerrar la notificación
            event.target.close();
        };
        
        notificacion.onshow = () => {
            console.log(`Notificación ${idAlerta} mostrada en pantalla`);
        };
        
        notificacion.onerror = (error) => {
            console.error(`Error al mostrar notificación ${idAlerta}:`, error);
        };
        
        // Programar un cierre automático después de 30 segundos
        setTimeout(() => {
            notificacion.close();
        }, 30000);
        
        return notificacion; // Devolver la referencia a la notificación
    } catch (error) {
        console.error("Error al crear notificación:", error);
    }
}

// 3. Función que verifica las alertas y actualiza emitidas
function verificarAlertas() {
    const ahora = new Date();
    const horaActual = ahora.getHours().toString().padStart(2, '0');
    const minutoActual = ahora.getMinutes().toString().padStart(2, '0');
    const horaMinutoActual = `${horaActual}:${minutoActual}`;
    
    // Obtenemos la fecha en formato local directamente desde Date
    const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    
    console.log("Verificando alertas:", horaMinutoActual, "- Fecha actual (local):", hoyStr);

    // Verificar permisos de notificación
    if (Notification.permission !== "granted") {
        // Si se deniega el permiso después de iniciar, detener verificaciones
        if (intervaloVerificacionAlertas) {
            clearInterval(intervaloVerificacionAlertas);
            intervaloVerificacionAlertas = null;
            console.log("Permiso denegado, deteniendo verificación de alertas.");
        }
        // Aun así verificar alertas emitidas
        verificarAlertasEmitidas();
        return;
    }

    const listaAlertasPanel = document.querySelectorAll('.lista-vista-rutinas .rutina-item');
    let algunaEmitidaNueva = false;
    let notificacionesMostradas = 0;
    let alertasActivasHoy = []; // Para almacenar alertas que deben sonar hoy

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
        
        try {
            // Convertir la fecha/hora de la alerta a un objeto Date en la zona horaria local del cliente
            const [alertaYear, alertaMonth, alertaDay] = diaAlerta.split('-').map(Number);
            const [alertaHour, alertaMinute] = horaAlerta.split(':').map(Number);
            
            // Crear el objeto Date con la zona horaria local del cliente
            const fechaHoraAlerta = new Date(alertaYear, alertaMonth - 1, alertaDay, alertaHour, alertaMinute, 0);
            
            // Comparación más precisa de fechas y horas
            const ahoraYear = ahora.getFullYear();
            const ahoraMonth = ahora.getMonth(); // 0-11
            const ahoraDay = ahora.getDate();
            const ahoraHour = ahora.getHours();
            const ahoraMinute = ahora.getMinutes();
            
            const alertYear = fechaHoraAlerta.getFullYear();
            const alertMonth = fechaHoraAlerta.getMonth(); // 0-11
            const alertDay = fechaHoraAlerta.getDate();
            const alertHour = fechaHoraAlerta.getHours();
            const alertMinute = fechaHoraAlerta.getMinutes();
            
            // Verificar si la fecha actual y la de la alerta son el mismo día
            const esHoy = ahoraYear === alertYear && ahoraMonth === alertMonth && ahoraDay === alertDay;
            
            // Verificar si es exactamente la hora y minuto de la alerta (con tolerancia de ±1 minuto)
            const diferenciaMinutos = Math.abs((ahoraHour * 60 + ahoraMinute) - (alertHour * 60 + alertMinute));
            const esHoraExacta = diferenciaMinutos <= 1; // Tolerancia de 1 minuto
            
            // Verificar si la alerta ya pasó (para agregarla a la lista de emitidas)
            const alertaYaPaso = fechaHoraAlerta <= ahora;
            
            console.log(`Evaluando alerta ${idAlerta}: día=${diaAlerta}, hora=${horaAlerta}`, 
                         `¿Es hoy?: ${esHoy}, ¿Hora exacta?: ${esHoraExacta}, ¿Ya pasó?: ${alertaYaPaso}`,
                         `Diferencia minutos: ${diferenciaMinutos}`,
                         `Fecha alerta: ${alertDay}/${alertMonth+1}/${alertYear}, Fecha actual: ${ahoraDay}/${ahoraMonth+1}/${ahoraYear}`);
            
            // Agregar SOLO a Emitidas Hoy cuando es de HOY y ya pasó la hora
            if (esHoy && alertaYaPaso) {
                const idEmitida = `emitida-${idAlerta}`;
                if (!alertasDescartadasHoy.has(idAlerta) && !document.getElementById(idEmitida)) {
                    console.log(`Agregando alerta ${idAlerta} a emitidas de hoy (${diaAlerta} ${horaAlerta})`);
                    agregarAlertaEmitida(idAlerta, horaAlerta, diaAlerta, descripcion, cuartoNombre, cuartoId);
                    algunaEmitidaNueva = true;
                }
            }
            
            // Mostrar notificación y reproducir sonido si es hoy y es la hora exacta
            if (esHoy && esHoraExacta) {
                // Verificar si no hemos notificado ya esta alerta hoy
                const claveNotificacion = `${hoyStr}-${idAlerta}`;
                if (!alertasNotificadasHoy.has(claveNotificacion)) {
                    console.log(`¡NOTIFICANDO alerta ${idAlerta} con sonido!`);
                    
                    // Agregar a la lista de alertas activas para reproducir sonido
                    alertasActivasHoy.push({
                        id: idAlerta,
                        descripcion: descripcion,
                        cuartoNombre: cuartoNombre,
                        cuartoId: cuartoId,
                        hora: horaAlerta,
                        dia: diaAlerta
                    });
                    
                    try {
                        // Marcar como notificada antes de mostrar la notificación
                        alertasNotificadasHoy.add(claveNotificacion);
                        
                        // Usar la función compatible para mostrar notificaciones
                        const titulo = `🔔 Alerta: ${descripcion.substring(0, 20)}${descripcion.length > 20 ? '...' : ''}`;
                        const mensaje = `${cuartoNombre}: ${descripcion} - ${formatTime12Hour(horaAlerta)}`;
                        
                        // Llamar a la función compatible que maneja diferentes navegadores
                        mostrarNotificacionCompatible(
                            titulo,
                            mensaje,
                            './icons/icon-192x192.png',
                            { 
                                cuartoId: cuartoId,
                                idAlerta: idAlerta,
                                diaAlerta: diaAlerta,
                                horaAlerta: horaAlerta,
                                conSonido: true // Indicar que debe reproducir sonido
                            }
                        );
                        
                        console.log(`Notificación enviada para alerta ${idAlerta} - ${new Date().toLocaleTimeString()}`);
                        notificacionesMostradas++;
                    } catch (error) {
                        console.error(`Error al crear notificación para alerta ${idAlerta}:`, error);
                    }
                } else {
                    console.log(`Alerta ${idAlerta} ya fue notificada hoy, omitiendo notificación.`);
                }
            }
        } catch (error) {
            console.error(`Error al procesar alerta ${idAlerta}:`, error);
        }
    });

    // Reproducir sonido si hay alertas activas
    if (alertasActivasHoy.length > 0) {
        console.log(`Reproduciendo sonido para ${alertasActivasHoy.length} alerta(s) activa(s)`);
        
        // Reproducir sonido inmediatamente
        reproducirSonido();
        
        // Si hay múltiples alertas, reproducir sonido adicional después de 2 segundos
        if (alertasActivasHoy.length > 1) {
            setTimeout(() => {
                reproducirSonido();
                console.log('Sonido adicional para múltiples alertas');
            }, 2000);
        }
    }

    // Mostrar un log de resumen
    console.log(`Verificación de alertas completada: ${notificacionesMostradas} notificaciones mostradas, ${alertasActivasHoy.length} sonidos reproducidos.`);

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
    
    // Forzar la solicitud de permiso si aún no se ha concedido
    if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Permiso para notificaciones concedido.");
                // Reiniciar esta función luego de obtener el permiso
                iniciarVerificacionAlertas();
            } else {
                console.log("Permiso para notificaciones denegado.");
                // Aun sin permiso, verificar alertas emitidas
                verificarAlertas();
            }
        });
        return; // Salir y esperar el callback del permiso
    }
    
    if (Notification.permission === "granted") {
        console.log("Iniciando verificación periódica de alertas con notificaciones habilitadas...");
        
        // Verificar inmediatamente al iniciar
        verificarAlertas(); 
        
        // Enviar una notificación de inicio para confirmar que funcionan
        try {
            const ahora = new Date();
            
            // Usar la función compatible para mostrar la notificación de inicio
            mostrarNotificacionCompatible(
                "Sistema de alertas activo", 
                `Notificaciones activadas - ${ahora.toLocaleDateString()} ${ahora.toLocaleTimeString()}`,
                './icons/icon-192x192.png'
            );
            
            console.log("Notificación inicial enviada:", ahora.toLocaleString());
        } catch (e) {
            console.error("Error al mostrar notificación inicial:", e);
            // Como respaldo, mostrar una alerta visual
            crearAlertaVisual("Sistema de alertas activo", "Notificaciones activadas, pero hay un problema con las notificaciones del navegador.");
        }
        
        // Verificar cada minuto exactamente al cambio de minuto
        const ahora = new Date();
        const segundosRestantes = 60 - ahora.getSeconds();
        const milisegundosRestantes = (segundosRestantes * 1000) - ahora.getMilliseconds();
        
        // Esperar hasta el próximo minuto exacto para iniciar el intervalo
        console.log(`Programando próxima verificación en ${segundosRestantes} segundos y ${ahora.getMilliseconds()} ms`);
        
        // Primer timeout para alinear con el cambio de minuto
        setTimeout(() => {
            console.log("Iniciando intervalo de verificación alineado con minutos exactos");
            verificarAlertas(); // Verificar en el minuto exacto
            
            // Ahora iniciar el intervalo de 60 segundos
            intervaloVerificacionAlertas = setInterval(verificarAlertas, 60000);
        }, milisegundosRestantes);
    } else {
        // Si no hay permiso, al menos intentar poblar las emitidas una vez
        console.log("Verificando alertas emitidas (sin notificaciones)...");
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

    // --- INICIO: Inicializar sistema de audio ---
    // Inicializar el sistema de audio después de una interacción del usuario
    // (requerido por las políticas de autoplay de los navegadores)
    const inicializarAudioConInteraccion = () => {
        inicializarAudio();
        // Remover los listeners después de la primera interacción
        document.removeEventListener('click', inicializarAudioConInteraccion);
        document.removeEventListener('keydown', inicializarAudioConInteraccion);
        document.removeEventListener('touchstart', inicializarAudioConInteraccion);
    };
    
    // Agregar listeners para la primera interacción del usuario
    document.addEventListener('click', inicializarAudioConInteraccion);
    document.addEventListener('keydown', inicializarAudioConInteraccion);
    document.addEventListener('touchstart', inicializarAudioConInteraccion);
    
    // Intentar inicializar inmediatamente (puede fallar por políticas del navegador)
    try {
        inicializarAudio();
    } catch (error) {
        console.log('Inicialización inmediata de audio falló, esperando interacción del usuario');
    }
    // --- FIN: Inicializar sistema de audio ---

    // --- INICIO: Cargar alertas descartadas ---
    cargarAlertasDescartadas();
    // --- FIN: Cargar alertas descartadas ---

    // --- INICIO: Solicitar permiso para notificaciones ---
    solicitarPermisoNotificaciones(); // Esto llamará a iniciarVerificacionAlertas si hay permiso
    // --- FIN: Solicitar permiso ---
    
    // --- INICIO: Verificación inicial de alertas emitidas ---
    // Verificar inmediatamente al cargar la página
    verificarAlertasEmitidas();
    
    // Configurar verificación periódica de alertas emitidas (cada 30 segundos)
    // Esto garantiza que las alertas emitidas se actualicen incluso sin interacción del usuario
    setInterval(verificarAlertasEmitidas, 30000);
    // --- FIN: Verificación inicial de alertas emitidas ---

    // --- INICIO: Crear botón de prueba de notificaciones ---
    // Crear el botón solo en modo de desarrollo o si se solicita explícitamente
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.has('debug') || false;
    
    if (debugMode) {
        // Ubicar el contenedor adecuado para el botón
        const container = document.querySelector('.panel-alertas-emitidas h2') || 
                        document.querySelector('.panel-vista-rutinas h2') ||
                        document.querySelector('.vista-duo');
        
        if (container) {
            // Crear el botón de prueba
            const testButton = document.createElement('button');
            testButton.id = 'btnTestNotificacion';
            testButton.className = 'boton-test-notificacion';
            testButton.textContent = 'Probar Notificaciones';
            testButton.title = 'Haz clic para probar si las notificaciones funcionan';
            testButton.style.marginLeft = '10px';
            testButton.style.padding = '3px 8px';
            testButton.style.fontSize = '0.8em';
            testButton.style.backgroundColor = '#007bff';
            testButton.style.color = 'white';
            testButton.style.border = 'none';
            testButton.style.borderRadius = '4px';
            testButton.style.cursor = 'pointer';
            
            // Crear botón de prueba de sonido
            const testSoundButton = document.createElement('button');
            testSoundButton.id = 'btnTestSonido';
            testSoundButton.className = 'boton-test-sonido';
            testSoundButton.textContent = 'Probar Sonido';
            testSoundButton.title = 'Haz clic para probar el sonido de alerta';
            testSoundButton.style.marginLeft = '5px';
            testSoundButton.style.padding = '3px 8px';
            testSoundButton.style.fontSize = '0.8em';
            testSoundButton.style.backgroundColor = '#28a745';
            testSoundButton.style.color = 'white';
            testSoundButton.style.border = 'none';
            testSoundButton.style.borderRadius = '4px';
            testSoundButton.style.cursor = 'pointer';
            
            // Añadir evento de clic para notificaciones
            testButton.addEventListener('click', function(e) {
                e.preventDefault();
                testNotificacion();
            });
            
            // Añadir evento de clic para sonido
            testSoundButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Probando sonido de alerta...');
                if (!audioEnabled) {
                    inicializarAudio();
                }
                reproducirSonido();
            });
            
            // Añadir botones junto al título
            if (container.tagName === 'H2') {
                container.parentNode.insertBefore(testButton, container.nextSibling);
                container.parentNode.insertBefore(testSoundButton, testButton.nextSibling);
            } else {
                // Si no hay un título H2, añadirlo en algún lugar visible
                container.appendChild(testButton);
                container.appendChild(testSoundButton);
            }
            
            console.log('Botones de prueba de notificaciones y sonido añadidos.');
        }
    }
    // --- FIN: Crear botón de prueba de notificaciones ---

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
}

// Función auxiliar para formatear fecha
function formatDate(dateString) { // dateString en formato YYYY-MM-DD
    if (!dateString) return '';
    try {
        // Crear un objeto Date con la fecha en la zona horaria local del usuario
        const [year, month, day] = dateString.split('-').map(Number);
        const fecha = new Date(year, month - 1, day);
        
        // Obtener los componentes de fecha en la zona horaria local
        const localDay = fecha.getDate().toString().padStart(2, '0');
        const localMonth = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const localYear = fecha.getFullYear();
        
        return `${localDay}/${localMonth}/${localYear}`;
    } catch (e) {
        console.error('Error al formatear fecha:', e);
        return dateString; // Devolver original si hay error
    }
}

// Función auxiliar para formatear fecha corta (DD/MM)
function formatDateShort(dateString) { // dateString en formato YYYY-MM-DD
    if (!dateString) return '??/??';
    try {
        // Crear un objeto Date con la fecha en la zona horaria local del usuario
        const [year, month, day] = dateString.split('-').map(Number);
        const fecha = new Date(year, month - 1, day);
        
        // Obtener los componentes de fecha en la zona horaria local
        const localDay = fecha.getDate().toString().padStart(2, '0');
        const localMonth = (fecha.getMonth() + 1).toString().padStart(2, '0');
        
        return `${localDay}/${localMonth}`;
    } catch (e) {
        console.error('Error al formatear fecha corta:', e);
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

// Nueva función para verificar y actualizar alertas emitidas sin recargar la página
function verificarAlertasEmitidas() {
    const ahora = new Date();
    console.log("Verificando alertas emitidas sin recargar la página:", ahora.toLocaleString());
    
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
            return; // Continuar con la siguiente alerta
        }
        
        // Convertir la fecha/hora de la alerta a un objeto Date en la zona horaria local del cliente
        const [alertaYear, alertaMonth, alertaDay] = diaAlerta.split('-').map(Number);
        const [alertaHour, alertaMinute] = horaAlerta.split(':').map(Number);
        
        // Crear el objeto Date con la zona horaria local del cliente
        const fechaHoraAlerta = new Date(alertaYear, alertaMonth - 1, alertaDay, alertaHour, alertaMinute, 0);
        
        // Verificar si la alerta ya pasó (para agregarla a la lista de emitidas)
        const alertaYaPaso = fechaHoraAlerta <= ahora;
        
        // Agregar SOLO a Emitidas Hoy cuando realmente ya pasó la fecha/hora
        if (alertaYaPaso) {
            const idEmitida = `emitida-${idAlerta}`;
            if (!alertasDescartadasHoy.has(idAlerta) && !document.getElementById(idEmitida)) {
                console.log(`Agregando alerta ${idAlerta} a emitidas sin recargar (${diaAlerta} ${horaAlerta})`);
                agregarAlertaEmitida(idAlerta, horaAlerta, diaAlerta, descripcion, cuartoNombre, cuartoId);
                algunaEmitidaNueva = true;
            }
        }
    });

    // Actualizar visibilidad del mensaje si se añadió alguna alerta emitida
    if (algunaEmitidaNueva) {
        actualizarMensajeEmitidasVacias();
    }
    
    return algunaEmitidaNueva; // Devolver si se agregó alguna nueva
}

// Función para probar explícitamente las notificaciones
function testNotificacion() {
    console.log("Iniciando prueba de notificaciones con sonido...");
    
    // Asegurar que el audio esté inicializado
    if (!audioEnabled) {
        console.log("Inicializando sistema de audio para la prueba...");
        inicializarAudio();
    }
    
    // Intentar crear una notificación de prueba
    const resultado = mostrarNotificacionPrueba();
    
    // Si la notificación de prueba falló pero tenemos permisos, mostrar información adicional
    if (!resultado && Notification.permission === "granted") {
        console.warn("La notificación de prueba falló a pesar de tener permisos. Intentando diagnosticar...");
        
        // Mostrar información del navegador y la plataforma
        const navegador = navigator.userAgent;
        const plataforma = navigator.platform;
        console.log("Navegador:", navegador);
        console.log("Plataforma:", plataforma);
        
        // Verificar si estamos en modo incógnito (solo funciona en algunos navegadores)
        try {
            const isIncognito = !window.indexedDB || !window.localStorage;
            console.log("¿Posible modo incógnito?:", isIncognito);
        } catch (e) {
            console.log("No se pudo detectar modo incógnito:", e);
        }
        
        // Mostrar alerta con información relevante
        alert(`Prueba de notificación fallida a pesar de tener permisos. 
Navegador: ${navegador.split(' ')[0]}
Audio habilitado: ${audioEnabled}
Esto puede deberse a:
1. Configuración del navegador
2. Modo incógnito
3. Restricciones del sistema operativo
4. Bloqueo por extensiones

Por favor, verifica en la configuración del navegador que las notificaciones estén permitidas para este sitio.`);
    }
    
    // Devolver el resultado para posibles usos futuros
    return resultado;
}

// Función para mostrar una notificación inmediata de prueba desde cualquier lugar del código
function mostrarNotificacionPrueba() {
    // Verificar soporte para notificaciones
    if (!("Notification" in window)) {
        alert("Este navegador no soporta notificaciones de escritorio.");
        return false;
    }
    
    // Verificar permisos
    if (Notification.permission !== "granted") {
        if (Notification.permission === "default") {
            // Intentar solicitar permiso
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    // Intentarlo de nuevo después de obtener el permiso
                    setTimeout(mostrarNotificacionPrueba, 500);
                } else {
                    alert("Es necesario permitir notificaciones para que funcionen las alertas.");
                }
            });
        } else {
            alert("Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración del navegador.");
        }
        return false;
    }

    // Si tenemos permiso, mostrar una notificación simple con sonido
    try {
        const ahora = new Date();
        
        // Reproducir sonido de prueba
        console.log("Reproduciendo sonido de prueba...");
        reproducirSonido();
        
        const notificacionPrueba = new Notification("🔔 Prueba de Notificación con Sonido", {
            body: `Notificación de prueba: ${ahora.toLocaleTimeString()}\n¿Escuchaste el sonido de alerta?`,
            icon: './icons/icon-192x192.png',
            tag: 'test-notification',
            requireInteraction: false,
            renotify: true,
            silent: false, // Asegurar que no sea silenciosa
            vibrate: [200, 100, 200] // Vibración para móviles
        });
        
        console.log("Notificación de prueba enviada:", ahora.toLocaleString());
        
        // Manejar eventos de la notificación
        notificacionPrueba.onshow = () => {
            console.log("Notificación de prueba mostrada correctamente");
        };
        
        notificacionPrueba.onclick = () => {
            window.focus();
            notificacionPrueba.close();
            console.log("Notificación de prueba clickeada");
            
            // Reproducir sonido adicional al hacer clic
            setTimeout(() => {
                reproducirSonido();
                console.log("Sonido adicional reproducido al hacer clic");
            }, 100);
        };
        
        notificacionPrueba.onerror = (error) => {
            console.error("Error en notificación de prueba:", error);
            alert("Error al mostrar la notificación de prueba. Consulta la consola del navegador para más detalles.");
        };
        
        // Cerrar automáticamente después de 8 segundos
        setTimeout(() => {
            notificacionPrueba.close();
        }, 8000);
        
        return true;
    } catch (error) {
        console.error("Error al crear notificación de prueba:", error);
        alert("Error al crear la notificación de prueba: " + error.message);
        return false;
    }
}

// Función para crear una alerta visual dentro de la página (cuando fallen las notificaciones)
function crearAlertaVisual(titulo, mensaje) {
    // Crear div de alerta flotante
    const alertaDiv = document.createElement('div');
    alertaDiv.className = 'alerta-visual';
    alertaDiv.style.position = 'fixed';
    alertaDiv.style.top = '20px';
    alertaDiv.style.right = '20px';
    alertaDiv.style.backgroundColor = '#007bff';
    alertaDiv.style.color = 'white';
    alertaDiv.style.padding = '15px';
    alertaDiv.style.borderRadius = '5px';
    alertaDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    alertaDiv.style.zIndex = '9999';
    alertaDiv.style.maxWidth = '300px';
    alertaDiv.style.transition = 'opacity 0.5s ease';
    alertaDiv.style.cursor = 'pointer';
    
    alertaDiv.innerHTML = `
        <div style="font-weight:bold;margin-bottom:5px;">${titulo}</div>
        <div>${mensaje}</div>
    `;
    
    // Agregar al body
    document.body.appendChild(alertaDiv);
    
    // Agregar evento de clic para cerrar
    alertaDiv.addEventListener('click', () => {
        alertaDiv.style.opacity = '0';
        setTimeout(() => alertaDiv.remove(), 500);
    });
    
    // Auto-eliminar después de 10 segundos
    setTimeout(() => {
        alertaDiv.style.opacity = '0';
        setTimeout(() => alertaDiv.remove(), 500);
    }, 10000);
    
    return alertaDiv;
}

// Función especial para mostrar notificaciones compatibles con Brave/Chrome
function mostrarNotificacionCompatible(titulo, mensaje, icono, datos = {}) {
    console.log("Intentando mostrar notificación compatible:", titulo);
    
    // Reproducir sonido si se indica en los datos
    if (datos.conSonido) {
        console.log("Reproduciendo sonido para notificación");
        reproducirSonido();
    }
    
    // Detectar si es un navegador basado en Chromium (Chrome, Brave, Edge, etc.)
    const esChromium = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const esBrave = navigator.brave !== undefined;
    
    console.log("Navegador detectado:", 
        esBrave ? "Brave" : 
        esChromium ? "Chrome/Chromium" : 
        "Otro navegador");
    
    // Verificar permisos de notificación
    if (Notification.permission !== "granted") {
        console.error("No hay permiso para mostrar notificaciones");
        // Mostrar alerta visual como fallback
        crearAlertaVisual(titulo, mensaje);
        return null;
    }
    
    try {
        // Intentar usar ServiceWorker para notificaciones si está disponible
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log("Intentando notificación vía ServiceWorker");
            
            // Crear también una alerta visual para asegurar que el usuario vea algo
            crearAlertaVisual(titulo, mensaje);
            
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(titulo, {
                    body: mensaje,
                    icon: icono || './icons/icon-192x192.png',
                    requireInteraction: true,
                    vibrate: [200, 100, 200, 100, 200], // Patrón de vibración más notable
                    silent: false, // Asegurar que no sea silenciosa
                    data: datos
                }).then(() => {
                    console.log("Notificación vía ServiceWorker enviada correctamente");
                }).catch(error => {
                    console.error("Error al mostrar notificación vía ServiceWorker:", error);
                    crearAlertaVisual(titulo, mensaje);
                });
            }).catch(error => {
                console.error("Error con ServiceWorker.ready:", error);
                crearAlertaVisual(titulo, mensaje);
            });
            
            return true;
        } else {
            // Método tradicional para navegadores que no son Chromium o sin ServiceWorker
            console.log("ServiceWorker no disponible, usando método tradicional");
            
            // Mostrar alerta visual como respaldo
            crearAlertaVisual(titulo, mensaje);
            
            // En Chrome/Brave, intentar con tag diferente cada vez
            const uniqueTag = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            // Crear y configurar la notificación
            const opciones = {
                body: mensaje,
                icon: icono || './icons/icon-192x192.png',
                tag: uniqueTag,
                requireInteraction: true,
                renotify: true,  // Importante para Chrome
                silent: false,   // Asegurar que no sea silenciosa
                vibrate: [200, 100, 200, 100, 200], // Patrón de vibración más notable
                data: datos
            };
            
            // Crear la notificación directamente
            const notificacion = new Notification(titulo, opciones);
            
            // Agregar eventos
            notificacion.onshow = function() {
                console.log(`Notificación "${titulo}" mostrada en pantalla`);
            };
            
            notificacion.onclick = function() {
                console.log(`Notificación "${titulo}" clickeada`);
                window.focus();
                this.close();
                
                // Si hay datos de cuartoId, hacer scroll
                if (datos && datos.cuartoId) {
                    scrollToCuarto(datos.cuartoId);
                }
            };
            
            // Cerrar después de 15 segundos para alertas importantes
            setTimeout(() => {
                if (notificacion) notificacion.close();
            }, 15000);
            
            return notificacion;
        }
    } catch (error) {
        console.error("Error al crear notificación compatible:", error);
        // Mostrar alerta visual como respaldo
        crearAlertaVisual(titulo, mensaje);
        return null;
    }
}

// Función accesible globalmente para forzar notificaciones desde la consola
window.forzarNotificacion = function() {
    console.log("Forzando notificación manual con sonido...");
    
    // Asegurar que el audio esté inicializado
    if (!audioEnabled) {
        console.log("Inicializando sistema de audio para notificación forzada...");
        inicializarAudio();
    }
    
    // Verificar permisos
    if (Notification.permission !== "granted") {
        alert("No hay permiso para mostrar notificaciones. Por favor, concede el permiso.");
        
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                setTimeout(window.forzarNotificacion, 500);
            } else {
                alert("Se denegó el permiso para notificaciones.");
            }
        });
        
        return false;
    }
    
    try {
        const ahora = new Date();
        
        // Reproducir sonido inmediatamente
        console.log("Reproduciendo sonido para notificación forzada...");
        reproducirSonido();
        
        // Usar la nueva función compatible
        mostrarNotificacionCompatible(
            "🔔 Notificación forzada manualmente", 
            `Esta es una notificación de prueba creada manualmente a las ${ahora.toLocaleTimeString()}`,
            './icons/icon-192x192.png',
            { conSonido: false } // No reproducir sonido adicional ya que lo hicimos arriba
        );
        
        // También crear una alerta actual sin esperar si hay alertas disponibles
        const primer_alerta = document.querySelector('.lista-vista-rutinas .rutina-item');
        if (primer_alerta) {
            const idAlerta = String(primer_alerta.id.split('-')[1]);
            const horaAlerta = primer_alerta.dataset.horaRaw;
            const diaAlerta = primer_alerta.dataset.diaRaw;
            const descripcion = primer_alerta.dataset.descripcion;
            const cuartoNombre = primer_alerta.dataset.cuartoNombre;
            const cuartoId = primer_alerta.dataset.cuartoId;
            
            setTimeout(() => {
                // Reproducir sonido adicional para la segunda notificación
                reproducirSonido();
                
                mostrarNotificacionCompatible(
                    `🔔 Alerta forzada: ${descripcion.substring(0, 20)}`,
                    `${cuartoNombre}: ${descripcion} - ${formatTime12Hour(horaAlerta)}`,
                    './icons/icon-192x192.png',
                    { 
                        cuartoId: cuartoId,
                        conSonido: false // No reproducir sonido adicional ya que lo hicimos arriba
                    }
                );
                
                console.log(`Notificación de alerta forzada creada para ID ${idAlerta}`);
            }, 3000); // Esperar 3 segundos entre notificaciones
        }
        
        // Mostrar información de estado del audio
        console.log(`Estado del sistema de audio:
- Audio habilitado: ${audioEnabled}
- Contexto de audio: ${audioContext ? audioContext.state : 'No disponible'}
- Sonido cargado: ${alertSound ? 'Sí' : 'No'}`);
        
        return true;
    } catch (error) {
        console.error("Error al crear notificación forzada:", error);
        alert("Error: " + error.message);
        return false;
    }
};
