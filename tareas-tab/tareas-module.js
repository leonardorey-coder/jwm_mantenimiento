// tareas-tab/tareas-module.js

/**
 * Módulo para la gestión de tareas, incluyendo la creación, edición,
 * y visualización de tareas en modales y tarjetas.
 */

// ------------------------------
// MANEJO DE ESTADO Y CONSTANTES
// ------------------------------

const API_URL = '/api'; // URL base para la API
let cuartoIdActual = null; // Almacena el ID del cuarto al crear una tarea
let tareaIdActual = null; // Almacena el ID de la tarea al editar
let archivosSeleccionados = []; // Almacena archivos seleccionados

// Headers para peticiones autenticadas
const obtenerHeadersConAuth = () => {
    // Intentar obtener el token de diferentes fuentes
    const token = localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('accessToken');

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('⚠️ No se encontró token de autenticación');
    }

    return headers;
};


// ------------------------------
// CONTROL DE MODALES
// ------------------------------

/**
 * Abre el modal para crear una nueva tarea.
 * @param {number} cuartoId - El ID del cuarto al que se asociará la tarea.
 */
function abrirModalCrearTarea(cuartoId) {
    console.log('Abriendo modal para crear tarea en cuarto ID:', cuartoId);
    cuartoIdActual = cuartoId;
    tareaIdActual = null;

    const modal = document.getElementById('modalCrearTarea');
    if (!modal) {
        console.error('El modal de creación de tareas no se encuentra en el DOM.');
        return;
    }

    // Limpiar formulario y mostrar
    limpiarFormulario('formCrearTarea');
    cargarUsuariosEnSelect('crearTareaResponsable');

    // Cargar servicios para selección múltiple (todos los servicios)
    cargarServiciosParaSeleccion();

    // Establecer fecha mínima como hoy
    const inputFecha = document.getElementById('crearTareaFecha');
    if (inputFecha) {
        const hoy = new Date().toISOString().split('T')[0];
        inputFecha.min = hoy;
        // Establecer fecha por defecto como mañana
        const mañana = new Date();
        mañana.setDate(mañana.getDate() + 1);
        inputFecha.value = mañana.toISOString().split('T')[0];
    }

    // Inicializar semáforo con valor por defecto (media)
    setTimeout(() => actualizarSemaforoPrioridad('crearTareaPrioridad', 'semaforoPrioridadCrear'), 100);

    // Guardar el cuarto ID en el campo hidden
    const inputCuartoId = document.getElementById('tareaCrearCuartoId');
    if (inputCuartoId) {
        inputCuartoId.value = cuartoId;
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    // Foco en el primer campo
    setTimeout(() => {
        const primerInput = document.getElementById('crearTareaNombre');
        if (primerInput) primerInput.focus();
    }, 100);
}

// Variables para lazy loading de servicios
let todosLosServicios = [];
let serviciosFiltrados = [];
let serviciosRenderizados = 0;
const SERVICIOS_POR_LOTE = 20;
let observerServicios = null;

/**
 * Carga TODOS los servicios para mostrarlos con lazy loading en el modal.
 */
async function cargarServiciosParaSeleccion() {
    const container = document.getElementById('listaServiciosCrear');
    const inputBusqueda = document.getElementById('buscarServiciosTarea');

    if (!container) return;

    container.innerHTML = '<p class="mensaje-vacio"><i class="fas fa-spinner fa-spin"></i> Cargando servicios...</p>';

    try {
        // Fetch sin cuarto_id para obtener todos
        const response = await fetch(`${API_URL}/mantenimientos`, { headers: obtenerHeadersConAuth() });
        if (!response.ok) throw new Error('Error al cargar servicios');

        todosLosServicios = await response.json();
        serviciosFiltrados = [...todosLosServicios]; // Inicialmente todos
        serviciosRenderizados = 0;

        if (todosLosServicios.length === 0) {
            container.innerHTML = '<p class="mensaje-vacio">No hay servicios registrados en el sistema.</p>';
            return;
        }

        container.innerHTML = '';

        // Renderizar primer lote
        renderizarLoteServicios(container);

        // Configurar IntersectionObserver para lazy loading
        if (observerServicios) observerServicios.disconnect();

        observerServicios = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                renderizarLoteServicios(container);
            }
        }, { root: container, threshold: 0.1 });

        // Crear elemento centinela
        const sentinel = document.createElement('div');
        sentinel.id = 'sentinel-servicios';
        sentinel.style.height = '10px';
        container.appendChild(sentinel);
        observerServicios.observe(sentinel);

        // Configurar evento de búsqueda
        if (inputBusqueda) {
            inputBusqueda.value = ''; // Limpiar búsqueda al abrir
            // Remover listeners anteriores para evitar duplicados (clonando el nodo)
            const nuevoInput = inputBusqueda.cloneNode(true);
            inputBusqueda.parentNode.replaceChild(nuevoInput, inputBusqueda);

            nuevoInput.addEventListener('input', (e) => {
                filtrarServicios(e.target.value);
            });
        }

    } catch (error) {
        console.error('Error al cargar servicios para selección:', error);
        container.innerHTML = '<p class="mensaje-vacio error">Error al cargar servicios.</p>';
    }
}

/**
 * Filtra los servicios según el término de búsqueda y reinicia el renderizado
 * @param {string} termino - Término de búsqueda
 */
function filtrarServicios(termino) {
    const container = document.getElementById('listaServiciosCrear');
    if (!container) return;

    const terminoLower = termino.toLowerCase().trim();

    if (!terminoLower) {
        serviciosFiltrados = [...todosLosServicios];
    } else {
        serviciosFiltrados = todosLosServicios.filter(servicio => {
            const descripcion = (servicio.descripcion || '').toLowerCase();
            const ubicacion = (servicio.cuarto_numero ? `hab. ${servicio.cuarto_numero}` : (servicio.edificio_nombre || '')).toLowerCase();
            const tipo = (servicio.tipo || '').toLowerCase();

            return descripcion.includes(terminoLower) ||
                ubicacion.includes(terminoLower) ||
                tipo.includes(terminoLower);
        });
    }

    // Reiniciar renderizado
    serviciosRenderizados = 0;
    container.innerHTML = '';

    if (serviciosFiltrados.length === 0) {
        container.innerHTML = '<p class="mensaje-vacio">No se encontraron servicios que coincidan.</p>';
        return;
    }

    // Renderizar primer lote de los filtrados
    renderizarLoteServicios(container);

    // Re-agregar centinela para lazy loading
    const sentinel = document.createElement('div');
    sentinel.id = 'sentinel-servicios';
    sentinel.style.height = '10px';
    container.appendChild(sentinel);

    if (observerServicios) {
        observerServicios.disconnect();
        observerServicios.observe(sentinel);
    }
}

/**
 * Renderiza un lote de servicios en el contenedor
 * @param {HTMLElement} container - El contenedor de la lista
 */
function renderizarLoteServicios(container) {
    const siguienteLote = serviciosFiltrados.slice(serviciosRenderizados, serviciosRenderizados + SERVICIOS_POR_LOTE);

    const estadoServicios = {
        "cancelado": "Cancelado",
        "pendiente": "Pendiente",
        "en_proceso": "En Proceso",
        "completado": "Completado"
    }

    if (siguienteLote.length === 0) return;

    const fragment = document.createDocumentFragment();

    siguienteLote.forEach(servicio => {
        const item = document.createElement('div');
        item.className = 'servicio-checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `servicio_check_${servicio.id}`;
        checkbox.value = servicio.id;
        checkbox.name = 'servicios_seleccionados';

        const label = document.createElement('label');
        label.htmlFor = `servicio_check_${servicio.id}`;

        const titulo = document.createElement('span');
        titulo.textContent = servicio.descripcion || 'Servicio sin descripción';

        const meta = document.createElement('span');
        meta.className = 'servicio-meta';
        // Mostrar ubicación (Cuarto/Edificio) ya que ahora son todos los servicios
        const ubicacion = servicio.cuarto_numero ? `Hab. ${servicio.cuarto_numero}` : (servicio.edificio_nombre || 'Sin ubicación');
        meta.textContent = `${ubicacion} · ${servicio.tipo === 'normal' ? 'Avería' : servicio.tipo === 'rutina' ? 'Alerta' : 'Otro'} · ${estadoServicios[servicio.estado]}`;

        label.appendChild(titulo);
        label.appendChild(meta);

        item.appendChild(checkbox);
        item.appendChild(label);
        fragment.appendChild(item);
    });

    // Insertar antes del sentinel si existe
    const sentinel = document.getElementById('sentinel-servicios');
    if (sentinel) {
        container.insertBefore(fragment, sentinel);
    } else {
        container.appendChild(fragment);
    }

    serviciosRenderizados += siguienteLote.length;

    // Si ya no hay más, desconectar observer
    if (serviciosRenderizados >= serviciosFiltrados.length && observerServicios) {
        observerServicios.disconnect();
        if (sentinel) sentinel.remove();
    }
}

/**
 * Abre el modal para editar una tarea existente.
 * @param {number} tareaId - El ID de la tarea a editar.
 */
async function abrirModalEditarTarea(tareaId) {
    console.log('Abriendo modal para editar tarea ID:', tareaId);
    if (!tareaId) {
        console.warn('Se intentó abrir el modal de edición sin un ID de tarea.');
        mostrarNotificacion('No se puede editar: ID de tarea no válido', 'error');
        return;
    }

    tareaIdActual = tareaId;
    cuartoIdActual = null;

    const modal = document.getElementById('modalEditarTarea');
    if (!modal) {
        console.error('El modal de edición de tareas no se encuentra en el DOM.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tareas/${tareaId}`, { headers: obtenerHeadersConAuth() });
        if (!response.ok) {
            throw new Error(`Error al obtener los datos de la tarea: ${response.statusText}`);
        }
        const tarea = await response.json();

        // Poblar formulario con los datos de la tarea
        await poblarFormularioEdicion(tarea);

        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

    } catch (error) {
        console.error('Error al abrir modal de edición:', error);
        mostrarNotificacion('No se pudieron cargar los datos de la tarea', 'error');
    }
}


/**
 * Cierra un modal específico por su ID.
 * @param {string} modalId - El ID del modal a cerrar ('modalCrearTarea' o 'modalEditarTarea').
 */
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        console.log(`Modal ${modalId} cerrado.`);
    } else {
        console.warn(`Se intentó cerrar un modal con ID '${modalId}' que no existe.`);
    }

    // Limpiar formularios al cerrar
    if (modalId === 'modalCrearTarea') {
        limpiarFormulario('formCrearTarea');
        archivosSeleccionados = [];
    } else if (modalId === 'modalEditarTarea') {
        limpiarFormulario('formEditarTarea');
        archivosSeleccionados = [];
    }

    // Resetear IDs actuales
    cuartoIdActual = null;
    tareaIdActual = null;
}

// ------------------------------
// MANEJO DE FORMULARIOS
// ------------------------------

/**
 * Gestiona el envío del formulario de creación de tarea.
 * @param {Event} event - El evento de submit del formulario.
 */
async function submitCrearTarea(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    // Validación de campos requeridos
    const nombre = formData.get('nombre')?.trim();
    const descripcion = formData.get('descripcion')?.trim();
    const ubicacion = formData.get('ubicacion')?.trim();
    const fechaLimite = formData.get('fecha_limite');
    const responsableId = formData.get('responsable_id');

    if (!nombre || !descripcion || !fechaLimite || !responsableId) {
        mostrarNotificacion('Por favor completa todos los campos requeridos', 'error');
        return;
    }

    // Recolectar tags
    const tags = [];
    document.querySelectorAll('#tagsListCrear .tag').forEach(tag => {
        const texto = tag.textContent.replace('×', '').trim();
        if (texto) tags.push(texto);
    });

    const tareaData = {
        titulo: nombre,  // Backend espera 'titulo'
        descripcion: descripcion,
        ubicacion: ubicacion,
        prioridad: formData.get('prioridad'),
        estado: formData.get('estado'),
        fecha_limite: fechaLimite,
        responsable_id: parseInt(responsableId),
        cuarto_id: cuartoIdActual,
        tags: tags
    };

    console.log('Enviando nueva tarea:', tareaData);

    // Deshabilitar botón de submit
    const btnSubmit = form.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

    try {
        const response = await fetch(`${API_URL}/tareas`, {
            method: 'POST',
            headers: obtenerHeadersConAuth(),
            body: JSON.stringify(tareaData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al crear la tarea: ${response.statusText}`);
        }

        const nuevaTarea = await response.json();
        console.log('Tarea creada con éxito:', nuevaTarea);

        // Asignar tarea a servicios seleccionados
        const checkboxesServicios = document.querySelectorAll('input[name="servicios_seleccionados"]:checked');
        if (checkboxesServicios.length > 0) {
            console.log(`Asignando tarea ${nuevaTarea.id} a ${checkboxesServicios.length} servicios...`);

            const promesasAsignacion = Array.from(checkboxesServicios).map(checkbox => {
                const servicioId = checkbox.value;
                // Actualizamos el servicio para asignarle la tarea
                // Nota: Asumimos que el endpoint PUT /api/mantenimientos/:id acepta tarea_id
                // Si no existe ese campo en la BD, esto podría fallar o ser ignorado por el backend
                return fetch(`${API_URL}/mantenimientos/${servicioId}`, {
                    method: 'PUT',
                    headers: obtenerHeadersConAuth(),
                    body: JSON.stringify({ tarea_id: nuevaTarea.id })
                }).then(res => {
                    if (!res.ok) console.warn(`Error al asignar tarea a servicio ${servicioId}`);
                    return res;
                }).catch(err => console.error(`Error de red al asignar servicio ${servicioId}`, err));
            });

            await Promise.all(promesasAsignacion);
            mostrarNotificacion(`Tarea creada y asignada a ${checkboxesServicios.length} servicios`, 'success');
        } else {
            mostrarNotificacion('¡Tarea creada con éxito!', 'success');
        }

        cerrarModal('modalCrearTarea');

        // Actualizar selectores con la nueva tarea
        await actualizarSelectoresTareas();

        // Seleccionar automáticamente la tarea recién creada en el selector del cuarto
        if (cuartoIdActual && nuevaTarea.id) {
            const selector = document.getElementById(`tareaAsignadaInline-${cuartoIdActual}`);
            if (selector) {
                // Agregar la nueva opción
                const option = document.createElement('option');
                option.value = nuevaTarea.id;
                option.textContent = `${nuevaTarea.nombre}`;
                option.selected = true;
                selector.appendChild(option);
            }
        }

        // Refrescar tarjetas en la pestaña de tareas si existe la función
        await refrescarTarjetasTareas();

    } catch (error) {
        console.error('Error en submitCrearTarea:', error);
        mostrarNotificacion(`Error al crear la tarea: ${error.message}`, 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
    }
}

/**
 * Gestiona el envío del formulario de edición de tarea.
 * @param {Event} event - El evento de submit del formulario.
 */
async function submitEditarTarea(event) {
    event.preventDefault();
    if (!tareaIdActual) {
        console.error('No hay un ID de tarea para actualizar.');
        mostrarNotificacion('Error: No se puede actualizar la tarea', 'error');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);

    // Validación
    const nombre = formData.get('nombre')?.trim();
    const descripcion = formData.get('descripcion')?.trim();

    if (!nombre || !descripcion) {
        mostrarNotificacion('El nombre y descripción son requeridos', 'error');
        return;
    }

    // Recolectar tags
    const tags = [];
    document.querySelectorAll('#tagsListEditar .tag').forEach(tag => {
        const texto = tag.textContent.replace('×', '').trim();
        if (texto) tags.push(texto);
    });

    const tareaData = {
        titulo: nombre,  // Backend espera 'titulo', no 'nombre'
        descripcion: descripcion,
        ubicacion: formData.get('ubicacion')?.trim(),
        prioridad: formData.get('prioridad'),
        estado: formData.get('estado'),
        fecha_limite: formData.get('fecha_limite'),
        responsable_id: parseInt(formData.get('responsable_id')),
        tags: tags
    };

    console.log(`Actualizando tarea ${tareaIdActual}:`, tareaData);

    // Deshabilitar botón de submit
    const btnSubmit = form.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const response = await fetch(`${API_URL}/tareas/${tareaIdActual}`, {
            method: 'PUT',
            headers: obtenerHeadersConAuth(),
            body: JSON.stringify(tareaData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al actualizar la tarea: ${response.statusText}`);
        }

        const tareaActualizada = await response.json();
        console.log('Tarea actualizada con éxito:', tareaActualizada);

        // Guardar el ID antes de cerrar el modal (porque cerrarModal resetea tareaIdActual)
        const tareaId = tareaIdActual;

        cerrarModal('modalEditarTarea');
        mostrarNotificacion('¡Tarea actualizada con éxito!', 'success');

        // Actualizar solo la tarjeta específica en lugar de recargar todas
        await actualizarTarjetaTarea(tareaId);
        await actualizarSelectoresTareas();

    } catch (error) {
        console.error('Error en submitEditarTarea:', error);
        mostrarNotificacion(`Error al actualizar la tarea: ${error.message}`, 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
    }
}

// ------------------------------
// FUNCIONES AUXILIARES DE UI
// ------------------------------

/**
 * Muestra una notificación al usuario
 * @param {string} mensaje - El mensaje a mostrar
 * @param {string} tipo - El tipo de notificación ('success', 'error', 'warning', 'info')
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Buscar si existe una función global de notificaciones y NO es esta misma función
    if (typeof window.mostrarNotificacion === 'function' && window.mostrarNotificacion !== mostrarNotificacion) {
        window.mostrarNotificacion(mensaje, tipo);
        return;
    }

    // Fallback: usar alert o console
    if (tipo === 'error') {
        console.error(`Error: ${mensaje}`);
        // No usar alert para no bloquear la UI en loops
    } else {
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    }

    // Si existe un contenedor de notificaciones en el DOM, usarlo (implementación simple)
    const container = document.getElementById('notification-container');
    if (container) {
        const notif = document.createElement('div');
        notif.className = `notification ${tipo}`;
        notif.textContent = mensaje;
        container.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }
}

/**
 * Limpia los campos de un formulario.
 * @param {string} formId - El ID del formulario a limpiar.
 */
function limpiarFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();

        // Limpiar tags
        const tagsContainers = form.querySelectorAll('.tarea-edit-tags');
        tagsContainers.forEach(container => {
            container.innerHTML = '';
        });

        // Limpiar previsualizaciones de archivos
        const filePreviews = form.querySelectorAll('.file-preview');
        filePreviews.forEach(preview => {
            preview.innerHTML = '';
        });

        // Limpiar inputs de archivo
        const fileInputs = form.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.value = '';
        });

        console.log(`Formulario ${formId} limpiado.`);
    }
}

/**
 * Puebla el formulario de edición con los datos de una tarea.
 * @param {object} tarea - El objeto de la tarea con sus datos.
 */
async function poblarFormularioEdicion(tarea) {
    const form = document.getElementById('formEditarTarea');
    if (!form) return;

    // Actualizar título del modal
    const titulo = document.getElementById('tareaEditTitulo');
    if (titulo) {
        titulo.textContent = tarea.titulo || 'Tarea';
    }

    // Guardar ID de la tarea
    const inputId = document.getElementById('tareaEditId');
    if (inputId) {
        inputId.value = tarea.id;
    }

    // Poblar campos básicos
    const inputNombre = document.getElementById('editarTareaNombre');
    if (inputNombre) inputNombre.value = tarea.titulo || '';

    const inputDescripcion = document.getElementById('editarTareaDescripcion');
    if (inputDescripcion) inputDescripcion.value = tarea.descripcion || '';

    const inputUbicacion = document.getElementById('editarTareaUbicacion');
    if (inputUbicacion) inputUbicacion.value = tarea.ubicacion || '';

    const selectPrioridad = document.getElementById('editarTareaPrioridad');
    if (selectPrioridad) selectPrioridad.value = tarea.prioridad || 'media';

    const selectEstado = document.getElementById('editarTareaEstado');
    if (selectEstado) selectEstado.value = tarea.estado || 'pendiente';

    // Formatear fecha para input type="date"
    // Formatear fecha para input type="date"
    const inputFecha = document.getElementById('editarTareaFecha');
    // Intentar con fecha_vencimiento (backend) o fecha_limite (frontend legacy)
    const fechaValor = tarea.fecha_vencimiento || tarea.fecha_limite;

    if (inputFecha && fechaValor) {
        const fecha = new Date(fechaValor);
        // Ajustar zona horaria si es necesario, pero split('T')[0] suele funcionar para ISO strings
        inputFecha.value = fecha.toISOString().split('T')[0];
    }

    // Cargar y seleccionar responsable
    // Intentar con asignado_a (backend) o responsable_id (frontend legacy)
    const responsableId = tarea.asignado_a || tarea.responsable_id;
    await cargarUsuariosEnSelect('editarTareaResponsable', responsableId);

    // Actualizar semáforo de prioridad
    setTimeout(() => actualizarSemaforoPrioridad('editarTareaPrioridad', 'semaforoPrioridadEditar'), 100);

    // Cargar tags si existen
    if (tarea.tags && Array.isArray(tarea.tags) && tarea.tags.length > 0) {
        const tagsContainer = document.getElementById('tagsListEditar');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            tarea.tags.forEach(tag => {
                agregarTagAlDOM(tag, tagsContainer);
            });
        }
    }
}

/**
 * Carga la lista de usuarios en un elemento <select>.
 * @param {string} selectId - El ID del <select> a poblar.
 * @param {number} [selectedUserId] - El ID del usuario que debe aparecer seleccionado.
 */
async function cargarUsuariosEnSelect(selectId, selectedUserId = null) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`El select con ID '${selectId}' no fue encontrado.`);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/usuarios`, { headers: obtenerHeadersConAuth() });
        if (!response.ok) throw new Error('No se pudo obtener la lista de usuarios.');

        const usuarios = await response.json();

        select.innerHTML = '<option value="">Seleccione un responsable...</option>';

        usuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id;
            option.textContent = usuario.nombre_completo || usuario.nombre || `Usuario ${usuario.id}`;
            if (usuario.id == selectedUserId) {
                option.selected = true;
            }
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        select.innerHTML = '<option value="">Error al cargar usuarios</option>';
    }
}

/**
 * Agrega un tag al DOM en el contenedor especificado
 * @param {string} tagText - El texto del tag
 * @param {HTMLElement} container - El contenedor donde agregar el tag
 */
function agregarTagAlDOM(tagText, container) {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';

    const textNode = document.createTextNode(tagText);
    tagElement.appendChild(textNode);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', 'Eliminar tag');
    removeBtn.onclick = () => eliminarTag(tagElement);

    tagElement.appendChild(removeBtn);
    container.appendChild(tagElement);
}

/**
 * Agrega una etiqueta a la lista de tags en el formulario.
 * @param {string} inputId - El ID del input de donde obtener el texto del tag
 * @param {string} containerId - El ID del contenedor donde agregar el tag
 */
function agregarTag(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    if (!input || !container) {
        console.error('Input o contenedor de tags no encontrado');
        return;
    }

    const tagValue = input.value.trim();

    if (!tagValue) {
        return;
    }

    // Evitar duplicados
    const tagsExistentes = Array.from(container.querySelectorAll('.tag')).map(
        tag => tag.textContent.replace('×', '').trim()
    );

    if (tagsExistentes.includes(tagValue)) {
        mostrarNotificacion('Este tag ya existe', 'warning');
        input.value = '';
        return;
    }

    agregarTagAlDOM(tagValue, container);
    input.value = '';
    input.focus();
}

/**
 * Elimina un elemento de tag del DOM.
 * @param {HTMLElement} tagElement - El elemento del tag a eliminar.
 */
function eliminarTag(tagElement) {
    if (tagElement && tagElement.parentNode) {
        tagElement.remove();
    }
}

/**
 * Maneja la selección de un archivo adjunto.
 * @param {Event} event - El evento del input de tipo file.
 * @param {string} previewContainerId - El ID del contenedor de previsualización
 */
function manejarArchivoAdjunto(event, previewContainerId) {
    const previewContainer = document.getElementById(previewContainerId);
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    const files = event.target.files;
    archivosSeleccionados = Array.from(files);

    if (files.length > 0) {
        for (const file of files) {
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-preview-item';
            fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            previewContainer.appendChild(fileInfo);
        }
    }
}

/**
 * Actualiza el color del semáforo de prioridad basado en la selección.
 * @param {string} selectId - El ID del select de prioridad.
 * @param {string} semaforoId - El ID del div que representa el semáforo.
 */
function actualizarSemaforoPrioridad(selectId, semaforoId) {
    const select = document.getElementById(selectId);
    const semaforo = document.getElementById(semaforoId);

    if (!select || !semaforo) {
        console.warn(`No se encontró el select ${selectId} o el semáforo ${semaforoId}`);
        return;
    }

    const prioridad = select.value;

    // Remover todas las clases de prioridad
    semaforo.classList.remove('prioridad-alta', 'prioridad-media', 'prioridad-baja');

    // Agregar la clase correspondiente
    if (prioridad) {
        semaforo.classList.add(`prioridad-${prioridad}`);
    }
}

/**
 * Carga todas las tareas disponibles en los selectores de los formularios de servicio.
 * @param {string} selectId - El ID del select a poblar
 * @param {number} selectedTaskId - El ID de la tarea seleccionada
 */
async function cargarTareasEnSelector(selectId, selectedTaskId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const response = await fetch(`${API_URL}/tareas`, { headers: obtenerHeadersConAuth() });
        if (!response.ok) throw new Error('No se pudo obtener la lista de tareas');

        const tareas = await response.json();
        select.innerHTML = '<option value="">-- Sin asignar existente --</option>';

        tareas.forEach(tarea => {
            const option = document.createElement('option');
            option.value = tarea.id;
            option.textContent = tarea.titulo;
            if (tarea.id == selectedTaskId) {
                option.selected = true;
            }
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando tareas en selector:', error);
        select.innerHTML = '<option value="">Error al cargar tareas</option>';
    }
}

/**
 * Actualiza solo una tarjeta específica de tarea en lugar de recargar todas
 * @param {number} tareaId - ID de la tarea a actualizar
 */
async function actualizarTarjetaTarea(tareaId) {
    console.log(`🔄 Actualizando tarjeta de tarea ${tareaId}...`);

    try {
        // Obtener los datos actualizados de la tarea desde el backend
        const response = await fetch(`${API_URL}/tareas/${tareaId}`, {
            headers: obtenerHeadersConAuth()
        });

        if (!response.ok) {
            throw new Error('Error al obtener datos de la tarea');
        }

        const tareaActualizada = await response.json();
        console.log('Tarea obtenida:', tareaActualizada);

        // Actualizar en el array local
        const indice = todasLasTareas.findIndex(t => t.id == tareaId);
        if (indice !== -1) {
            todasLasTareas[indice] = tareaActualizada;
        }

        // Buscar la tarjeta en el DOM
        const tarjetaExistente = document.querySelector(`li[data-tarea-id="${tareaId}"]`);

        if (tarjetaExistente) {
            // Crear nueva tarjeta con datos actualizados
            const nuevaTarjeta = crearTarjetaTarea(tareaActualizada);

            // Reemplazar la tarjeta antigua con la nueva
            tarjetaExistente.replaceWith(nuevaTarjeta);
            console.log(`✅ Tarjeta ${tareaId} actualizada en el DOM`);
        } else {
            console.warn(`⚠️ No se encontró la tarjeta ${tareaId} en el DOM, puede estar filtrada`);
        }

        // Actualizar el resumen de tareas
        if (typeof actualizarResumenTareas === 'function') {
            actualizarResumenTareas();
        }

    } catch (error) {
        console.error('Error al actualizar tarjeta de tarea:', error);
        mostrarNotificacion('Error al actualizar la vista de la tarea', 'error');
    }
}

// ------------------------------
// ACTUALIZACIÓN DE DATOS CON LAZY LOADING
// ------------------------------

// Variables para lazy loading de tareas
let todasLasTareas = [];
let tareasFiltradas = [];
let tareasRenderizadas = 0;
const TAREAS_POR_LOTE = 6;
let observerTareas = null;

/**
 * Crea un skeleton card para tareas
 * @returns {HTMLElement} Elemento li con skeleton
 */
function crearSkeletonTarea() {
    const li = document.createElement('li');
    li.className = 'skeleton-tarea-card';

    li.innerHTML = `
        <div class="skeleton-tarea-header">
            <div class="skeleton-tarea-badges">
                <div class="skeleton-badge-task"></div>
            </div>
            <div class="skeleton-badge-task"></div>
        </div>
        
        <div class="skeleton-tarea-body">
            <div class="skeleton-tarea-title"></div>
            
            <div class="skeleton-tarea-ubicacion">
                <div class="skeleton-icon-small"></div>
                <div class="skeleton-text-line w-40"></div>
            </div>
            
            <div class="skeleton-tarea-vencimiento"></div>
            
            <div class="skeleton-tarea-tags">
                <div class="skeleton-tag"></div>
                <div class="skeleton-tag"></div>
            </div>
        </div>
        
        <div class="skeleton-tarea-footer">
            <div class="skeleton-responsable">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-responsable-info">
                    <div class="skeleton-text-line w-40"></div>
                    <div class="skeleton-text-line w-50"></div>
                </div>
            </div>
            <div class="skeleton-tarea-buttons">
                <div class="skeleton-button-task"></div>
                <div class="skeleton-button-task"></div>
            </div>
        </div>
    `;

    return li;
}

/**
 * Renderiza un lote de tareas
 * @param {HTMLElement} container - El contenedor de la lista
 */
function renderizarLoteTareas(container) {
    const siguienteLote = tareasFiltradas.slice(tareasRenderizadas, tareasRenderizadas + TAREAS_POR_LOTE);

    if (siguienteLote.length === 0) return;

    const fragment = document.createDocumentFragment();

    siguienteLote.forEach((tarea, index) => {
        const card = crearTarjetaTarea(tarea);
        card.classList.add('tarea-lazy');

        // Añadir animación con delay progresivo
        setTimeout(() => {
            card.classList.add('card-appear');
        }, index * 50);

        fragment.appendChild(card);
    });

    // Insertar antes del sentinel
    const sentinel = document.getElementById('sentinel-tareas');
    if (sentinel) {
        container.insertBefore(fragment, sentinel);
    } else {
        container.appendChild(fragment);
    }

    tareasRenderizadas += siguienteLote.length;

    // Si ya no hay más, desconectar observer
    if (tareasRenderizadas >= tareasFiltradas.length && observerTareas) {
        observerTareas.disconnect();
        if (sentinel) sentinel.remove();
        console.log(`✅ Todas las ${tareasRenderizadas} tareas renderizadas`);
    }
}

/**
 * Aplica los filtros a las tareas y actualiza la vista
 */
function aplicarFiltrosTareas() {
    const inputBusqueda = document.getElementById('buscarTarea');
    const selectEstado = document.getElementById('filtroEstadoTarea');
    const selectPrioridad = document.getElementById('filtroPrioridadTarea');
    const selectRol = document.getElementById('filtroRolTarea');

    const terminoBusqueda = inputBusqueda ? inputBusqueda.value.toLowerCase().trim() : '';
    const estadoFiltro = selectEstado ? selectEstado.value : '';
    const prioridadFiltro = selectPrioridad ? selectPrioridad.value : '';
    const rolFiltro = selectRol ? selectRol.value : '';

    // Obtener el rol del usuario actual si es necesario
    let rolUsuarioActual = null;
    if (rolFiltro === 'mi-rol') {
        // Intentar obtener el rol desde AppState
        let userRole = null;
        if (window.AppState && window.AppState.currentUser) {
            userRole = window.AppState.currentUser.role || window.AppState.currentUser.rol;
        }

        // Si no está en AppState, intentar desde localStorage/sessionStorage
        if (!userRole) {
            try {
                const storedUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
                if (storedUser) {
                    userRole = storedUser.role || storedUser.rol;
                }
            } catch (e) {
                console.warn('Error obteniendo usuario de storage:', e);
            }
        }

        if (userRole) {
            // Los roles en la BD están en MAYÚSCULAS: 'ADMIN', 'SUPERVISOR', 'TECNICO'
            const roleMap = {
                'admin': 'ADMIN',
                'supervisor': 'SUPERVISOR',
                'tecnico': 'TECNICO',
                'administrador': 'ADMIN',
                'Administrador': 'ADMIN',
                'Supervisor': 'SUPERVISOR',
                'Técnico': 'TECNICO',
                'ADMIN': 'ADMIN',
                'SUPERVISOR': 'SUPERVISOR',
                'TECNICO': 'TECNICO'
            };
            rolUsuarioActual = roleMap[userRole] || roleMap[userRole.toLowerCase()] || userRole.toUpperCase();
            console.log('🔍 Filtro "Mi rol":', { userRole, rolUsuarioActual });
        } else {
            console.warn('⚠️ No se pudo obtener el rol del usuario para el filtro "Mi rol"');
        }
    }

    tareasFiltradas = todasLasTareas.filter(tarea => {
        // Filtro de búsqueda (título, descripción, ubicación, tags)
        if (terminoBusqueda) {
            const titulo = (tarea.titulo || '').toLowerCase();
            const descripcion = (tarea.descripcion || '').toLowerCase();
            const ubicacion = (tarea.ubicacion || '').toLowerCase();
            const tags = Array.isArray(tarea.tags) ? tarea.tags.join(' ').toLowerCase() : '';
            const asignado = (tarea.asignado_a_nombre || '').toLowerCase();

            const coincideBusqueda = titulo.includes(terminoBusqueda) ||
                descripcion.includes(terminoBusqueda) ||
                ubicacion.includes(terminoBusqueda) ||
                tags.includes(terminoBusqueda) ||
                asignado.includes(terminoBusqueda);

            if (!coincideBusqueda) return false;
        }

        // Filtro de estado
        if (estadoFiltro && tarea.estado !== estadoFiltro) {
            return false;
        }

        // Filtro de prioridad
        if (prioridadFiltro && tarea.prioridad !== prioridadFiltro) {
            return false;
        }

        // Filtro de rol
        if (rolFiltro === 'mi-rol') {
            if (!rolUsuarioActual) {
                // Si no se puede determinar el rol del usuario, no mostrar ninguna tarea
                return false;
            }
            if (tarea.asignado_a_rol_nombre !== rolUsuarioActual) {
                return false;
            }
        } else if (rolFiltro && rolFiltro !== 'todos' && rolFiltro !== 'mi-rol') {
            // Los roles en la BD están en MAYÚSCULAS: 'ADMIN', 'SUPERVISOR', 'TECNICO'
            const rolMap = {
                'admin': 'ADMIN',
                'supervisor': 'SUPERVISOR',
                'tecnico': 'TECNICO',
                'ADMIN': 'ADMIN',
                'SUPERVISOR': 'SUPERVISOR',
                'TECNICO': 'TECNICO'
            };
            const rolBuscado = rolMap[rolFiltro] || rolMap[rolFiltro.toLowerCase()] || rolFiltro.toUpperCase();
            console.log('🔍 Filtro por rol específico:', { rolFiltro, rolBuscado, tareaRol: tarea.asignado_a_rol_nombre });
            if (tarea.asignado_a_rol_nombre !== rolBuscado) {
                return false;
            }
        }

        return true;
    });

    // Reiniciar renderizado
    tareasRenderizadas = 0;
    const listaTareas = document.getElementById('listaTareas');
    if (listaTareas) {
        listaTareas.innerHTML = '';

        if (tareasFiltradas.length === 0) {
            const mensajeNoTareas = document.getElementById('mensajeNoTareas');
            if (mensajeNoTareas) {
                mensajeNoTareas.style.display = 'block';
            }
            // Actualizar resumen incluso cuando no hay tareas (para poner contadores en 0)
            actualizarResumenTareas();
            return;
        }

        // Ocultar mensaje de no tareas si hay resultados
        const mensajeNoTareas = document.getElementById('mensajeNoTareas');
        if (mensajeNoTareas) {
            mensajeNoTareas.style.display = 'none';
        }

        // Crear sentinel para lazy loading
        const sentinel = document.createElement('div');
        sentinel.id = 'sentinel-tareas';
        sentinel.style.height = '1px';
        listaTareas.appendChild(sentinel);

        // Configurar Intersection Observer
        if (observerTareas) {
            observerTareas.disconnect();
        }

        observerTareas = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    renderizarLoteTareas(listaTareas);
                }
            });
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });

        observerTareas.observe(sentinel);

        // Renderizar primer lote inmediatamente
        renderizarLoteTareas(listaTareas);

        // Actualizar resumen de tareas
        actualizarResumenTareas();
    }
}

/**
 * Actualiza el texto del rol en el resumen según el filtro seleccionado
 */
function actualizarRolResumen() {
    const selectRol = document.getElementById('filtroRolTarea');
    const elRolResumen = document.getElementById('tareasResumenRol');

    if (!selectRol || !elRolResumen) return;

    const rolFiltro = selectRol.value;

    // Mapeo de valores del filtro a nombres de rol
    const rolMap = {
        'mi-rol': 'Mi Rol',
        'todos': 'Todos los Roles',
        'admin': 'Administrador',
        'supervisor': 'Supervisor',
        'tecnico': 'Técnico'
    };

    const nombreRol = rolMap[rolFiltro] || 'Mi Rol';
    elRolResumen.textContent = nombreRol;
}

/**
 * Actualiza el resumen de tareas en la columna lateral
 */
function actualizarResumenTareas() {
    // Asegurar que tareasFiltradas esté definida como array
    if (!Array.isArray(tareasFiltradas)) {
        tareasFiltradas = [];
    }

    const pendientes = tareasFiltradas.filter(t => t.estado === 'pendiente').length;
    const enProceso = tareasFiltradas.filter(t => t.estado === 'en_proceso').length;
    const completadas = tareasFiltradas.filter(t => t.estado === 'completada').length;
    const urgentes = tareasFiltradas.filter(t =>
        t.prioridad === 'alta' ||
        (t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date())
    ).length;
    const total = tareasFiltradas.length;

    const elPendientes = document.getElementById('tareasResumenPendientes');
    const elEnProceso = document.getElementById('tareasResumenEnProceso');
    const elCompletadas = document.getElementById('tareasResumenCompletadas');
    const elUrgentes = document.getElementById('tareasResumenUrgentes');
    const elTotal = document.getElementById('tareasResumenTotal');

    if (elPendientes) elPendientes.textContent = pendientes;
    if (elEnProceso) elEnProceso.textContent = enProceso;
    if (elCompletadas) elCompletadas.textContent = completadas;
    if (elUrgentes) elUrgentes.textContent = urgentes;
    if (elTotal) elTotal.textContent = total;

    // Actualizar Monitor Operativo
    const statsPendientes = document.getElementById('tareasStatsPendientes');
    const statsActivas = document.getElementById('tareasStatsActivas');
    const statsCompletadas = document.getElementById('tareasStatsCompletadas');
    const statsProgress = document.getElementById('tareasStatsProgress');
    const statsCaption = document.getElementById('tareasStatsCaption');
    const statsHighlight = document.getElementById('tareasStatsHighlight');

    if (statsPendientes) statsPendientes.textContent = pendientes;
    if (statsActivas) statsActivas.textContent = enProceso;
    if (statsCompletadas) statsCompletadas.textContent = completadas;

    // Actualizar progress bar (porcentaje de completadas)
    if (statsProgress && total > 0) {
        const porcentaje = Math.round((completadas / total) * 100);
        statsProgress.setAttribute('data-percent', `${porcentaje}%`);
        statsProgress.style.setProperty('--progress-value', `${porcentaje}%`);
    }

    // Actualizar caption
    if (statsCaption) {
        statsCaption.textContent = `Total de tareas: ${total}`;
    }
    if (statsHighlight) {
        statsHighlight.textContent = `${completadas} completadas · ${pendientes} pendientes`;
    }

    // Actualizar también el texto del rol
    actualizarRolResumen();
}

/**
 * Refresca la vista de tarjetas de tareas en la pestaña "Tareas".
 */
async function refrescarTarjetasTareas() {
    console.log('🔄 Refrescando tarjetas de tareas con lazy loading...');

    // Buscar función global primero
    if (typeof window.refrescarTarjetasTareas === 'function' && window.refrescarTarjetasTareas !== refrescarTarjetasTareas) {
        window.refrescarTarjetasTareas();
        return;
    }

    // Implementación local
    const listaTareas = document.getElementById('listaTareas');
    if (!listaTareas) {
        console.warn('No se encontró el contenedor #listaTareas');
        return;
    }

    try {
        // Mostrar skeletons mientras carga
        listaTareas.innerHTML = '';
        for (let i = 0; i < TAREAS_POR_LOTE; i++) {
            listaTareas.appendChild(crearSkeletonTarea());
        }

        // Fetch tasks from API
        const response = await fetch(`${API_URL}/tareas`, { headers: obtenerHeadersConAuth() });
        if (!response.ok) throw new Error('Error al cargar tareas');

        todasLasTareas = await response.json();
        console.log(`📋 ${todasLasTareas.length} tareas cargadas`);

        // Aplicar filtros iniciales
        aplicarFiltrosTareas();

        console.log('✅ Sistema de lazy loading de tareas iniciado');

    } catch (error) {
        console.error('Error al refrescar tarjetas de tareas:', error);
        listaTareas.innerHTML = '<p class="mensaje-vacio error">Error al cargar tareas.</p>';
    }
}

/**
 * Crea una tarjeta HTML para una tarea
 * @param {Object} tarea - Objeto de tarea
 * @returns {HTMLElement} Elemento li con la tarjeta
 */
function crearTarjetaTarea(tarea) {
    const li = document.createElement('li');
    li.className = 'cuarto-item';
    li.dataset.tareaId = tarea.id;

    // Status mapping
    const estadoMap = {
        'pendiente': { label: 'Pendiente', class: 'status-pending' },
        'en_proceso': { label: 'En Proceso', class: 'status-progress' },
        'completada': { label: 'Completada', class: 'status-completed' },
        'cancelada': { label: 'Cancelada', class: 'status-cancelled' }
    };
    const estadoInfo = estadoMap[tarea.estado] || { label: tarea.estado, class: 'status-pending' };

    // Priority mapping (without emoji in text, CSS will add the dot)
    const prioridadMap = {
        'alta': { label: 'Alta', class: 'prioridad-alta' },
        'media': { label: 'Media', class: 'prioridad-media' },
        'baja': { label: 'Baja', class: 'prioridad-baja' }
    };
    const prioridadInfo = prioridadMap[tarea.prioridad] || { label: tarea.prioridad, class: 'prioridad-media' };

    // Calculate days until due date
    let diasVencimiento = '';
    let vencimientoClass = 'normal';
    if (tarea.fecha_vencimiento) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaLimite = new Date(tarea.fecha_vencimiento);
        fechaLimite.setHours(0, 0, 0, 0);
        const diffTime = fechaLimite - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            diasVencimiento = `Vencida hace ${Math.abs(diffDays)} días`;
            vencimientoClass = 'vencido';
        } else if (diffDays === 0) {
            diasVencimiento = 'Vence hoy';
            vencimientoClass = 'proximo';
        } else if (diffDays === 1) {
            diasVencimiento = 'Vence mañana';
            vencimientoClass = 'proximo';
        } else if (diffDays <= 3) {
            diasVencimiento = `Vence en ${diffDays} días`;
            vencimientoClass = 'proximo';
        } else {
            diasVencimiento = `Vence en ${diffDays} días`;
            vencimientoClass = 'normal';
        }
    }

    // Get initials for avatar
    const initials = (tarea.asignado_a_nombre || 'FC').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    li.innerHTML = `
        <div class="cuarto-contenido">
            <div class="cuarto-header">
                <div class="cuarto-numero-container">
                    <span class="badge ${estadoInfo.class}">${estadoInfo.label}</span>
                </div>
                <span class="badge ${prioridadInfo.class}">${prioridadInfo.label}</span>
            </div>
            
            <div class="cuarto-info">
                <h3 class="tarea-titulo">${tarea.titulo}</h3>
                
                <div class="tarea-ubicacion">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${tarea.ubicacion || 'Sin ubicación'}</span>
                </div>
                
                ${diasVencimiento ? `
                    <div class="tarea-vencimiento ${vencimientoClass}">
                        <i class="fas fa-calendar"></i>
                        <span>${diasVencimiento}</span>
                    </div>
                ` : ''}
                
                ${tarea.tags && tarea.tags.length > 0 ? `
                    <div class="tarea-tags">
                        ${tarea.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="cuarto-acciones">
                <div class="tarea-responsable">
                    <div class="tarea-responsable-avatar">${initials}</div>
                    <div class="tarea-responsable-info">
                        <div class="tarea-responsable-label">Responsable</div>
                        <div class="tarea-responsable-nombre">${tarea.asignado_a_nombre || 'Sin asignar'}</div>
                    </div>
                </div>
                <div class="tarea-acciones-btns">
                    <button class="btn-cuarto-action" onclick="verDetalleTarea(${tarea.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-cuarto-action btn-edit" onclick="abrirModalEditarTarea(${tarea.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    return li;
}

/**
 * Actualiza todos los selectores de tareas en la aplicación.
 * Útil después de crear o editar una tarea.
 */
async function actualizarSelectoresTareas() {
    console.log('Actualizando todos los selectores de tareas...');
    const selectores = document.querySelectorAll('.selector-tarea-servicio');

    if (selectores.length === 0) {
        console.log('No se encontraron selectores de tareas para actualizar.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tareas`, { headers: obtenerHeadersConAuth() });
        if (!response.ok) throw new Error('No se pudo obtener la lista de tareas para actualizar selectores.');

        const tareas = await response.json();

        selectores.forEach(select => {
            const selectedValue = select.value;
            const primeraOpcion = select.options[0]?.text || '-- Sin asignar existente --';

            select.innerHTML = `<option value="">${primeraOpcion}</option>`;

            tareas.forEach(tarea => {
                const option = document.createElement('option');
                option.value = tarea.id;
                option.textContent = tarea.titulo;
                select.appendChild(option);
            });

            // Re-seleccionar el valor que estaba antes si aún existe
            if (tareas.some(t => t.id == selectedValue)) {
                select.value = selectedValue;
            }
        });

        console.log(`${selectores.length} selectores actualizados con ${tareas.length} tareas.`);

    } catch (error) {
        console.error('Error al actualizar los selectores de tareas:', error);
    }
}


// ------------------------------
// DETALLE DE TAREA
// ------------------------------

/**
 * Abre el modal de detalle de tarea y carga todos los datos
 * @param {number} tareaId - ID de la tarea a mostrar
 */
async function verDetalleTarea(tareaId) {
    console.log('🔍 Abriendo detalle de tarea ID:', tareaId);

    // Asignar el ID de la tarea actual para el botón "Accionar"
    tareaIdActual = tareaId;

    const modal = document.getElementById('modalDetalleTarea');
    if (!modal) {
        console.error('Modal de detalle de tarea no encontrado');
        return;
    }

    try {
        // Verificar autenticación
        const headers = obtenerHeadersConAuth();
        console.log('🔐 Headers preparados:', Object.keys(headers));

        // Mostrar modal inmediatamente con loading
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

        // Cargar datos de la tarea
        console.log(`📡 Fetching: ${API_URL}/tareas/${tareaId}`);
        const response = await fetch(`${API_URL}/tareas/${tareaId}`, {
            headers: headers
        });

        console.log(`📊 Response status: ${response.status}`);

        if (response.status === 401) {
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const tarea = await response.json();
        console.log('📋 Tarea cargada:', tarea);

        // Poblar información básica
        document.getElementById('tareaModalId').textContent = `TASK-${String(tarea.id).padStart(3, '0')}`;
        document.getElementById('tareaModalTitulo').textContent = tarea.titulo || 'Sin título';
        document.getElementById('tareaModalDescripcion').textContent = tarea.descripcion || 'Sin descripción';

        // Badges de prioridad y estado
        const prioridadBadge = document.getElementById('tareaModalPrioridad');
        const estadoBadge = document.getElementById('tareaModalEstado');

        const prioridadMap = {
            'alta': { label: 'ALTA', class: 'prioridad-alta' },
            'media': { label: 'MEDIA', class: 'prioridad-media' },
            'baja': { label: 'BAJA', class: 'prioridad-baja' }
        };

        const estadoMap = {
            'pendiente': { label: 'PENDIENTE', class: 'status-pending' },
            'en_proceso': { label: 'EN PROCESO', class: 'status-progress' },
            'completada': { label: 'COMPLETADA', class: 'status-completed' },
            'cancelada': { label: 'CANCELADA', class: 'status-cancelled' }
        };

        const prioridadInfo = prioridadMap[tarea.prioridad] || prioridadMap['media'];
        const estadoInfo = estadoMap[tarea.estado] || estadoMap['pendiente'];

        prioridadBadge.textContent = prioridadInfo.label;
        prioridadBadge.className = 'tarea-modal-pill ' + prioridadInfo.class;

        estadoBadge.textContent = estadoInfo.label;
        estadoBadge.className = 'tarea-modal-pill ' + estadoInfo.class;

        // Información del grid
        document.getElementById('tareaModalUbicacion').textContent = tarea.ubicacion || 'Sin ubicación';
        document.getElementById('tareaModalResponsable').textContent = tarea.asignado_a_nombre || 'Sin asignar';

        // Formato de fecha de vencimiento
        if (tarea.fecha_vencimiento) {
            const fecha = new Date(tarea.fecha_vencimiento);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            fecha.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

            let textoVencimiento = '';
            if (diffDays < 0) {
                textoVencimiento = `Vencida hace ${Math.abs(diffDays)} días`;
            } else if (diffDays === 0) {
                textoVencimiento = 'Vence hoy';
            } else if (diffDays === 1) {
                textoVencimiento = 'Vence mañana';
            } else {
                textoVencimiento = `Vence en ${diffDays} días`;
            }

            document.getElementById('tareaModalVence').textContent = textoVencimiento;
        } else {
            document.getElementById('tareaModalVence').textContent = 'Sin fecha límite';
        }

        // Mapear rol asignado a formato legible
        const rolMap = {
            'ADMIN': 'Administrador',
            'SUPERVISOR': 'Supervisor',
            'TECNICO': 'Técnico',
            'admin': 'Administrador',
            'supervisor': 'Supervisor',
            'tecnico': 'Técnico'
        };
        const rolAsignado = tarea.asignado_a_rol_nombre
            ? (rolMap[tarea.asignado_a_rol_nombre] || tarea.asignado_a_rol_nombre)
            : 'Sin asignar';
        document.getElementById('tareaModalRol').textContent = rolAsignado;

        // Configurar botón de acción y texto de próxima acción según estado
        const btnAccionar = document.getElementById('tareaModalAccion');
        const nextStepText = document.getElementById('tareaModalNextStep');

        if (btnAccionar && nextStepText) {
            // Resetear estado del botón
            btnAccionar.disabled = false;
            btnAccionar.className = 'tarea-modal-btn btn-primary';

            if (tarea.estado === 'pendiente') {
                nextStepText.textContent = 'Iniciar';
                btnAccionar.innerHTML = '<i class="fas fa-play"></i> Iniciar';
                btnAccionar.onclick = () => accionarTarea(tarea.id, 'en_proceso');
            } else if (tarea.estado === 'en_proceso') {
                nextStepText.textContent = 'Completar';
                btnAccionar.innerHTML = '<i class="fas fa-check"></i> Completar';
                btnAccionar.className = 'tarea-modal-btn btn-success'; // Cambiar color a verde
                btnAccionar.onclick = () => accionarTarea(tarea.id, 'completada');
            } else if (tarea.estado === 'completada') {
                nextStepText.textContent = 'Finalizada';
                btnAccionar.innerHTML = '<i class="fas fa-check-double"></i> Completada';
                btnAccionar.disabled = true;
                btnAccionar.className = 'tarea-modal-btn btn-secondary';
            } else if (tarea.estado === 'cancelada') {
                nextStepText.textContent = 'Cancelada';
                btnAccionar.innerHTML = '<i class="fas fa-ban"></i> Cancelada';
                btnAccionar.disabled = true;
                btnAccionar.className = 'tarea-modal-btn btn-danger';
            }
        }

        // Fecha de creación
        if (tarea.fecha_creacion) {
            const fechaCreacion = new Date(tarea.fecha_creacion);
            const opciones = {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            document.getElementById('tareaModalUltimoMovimiento').textContent =
                fechaCreacion.toLocaleDateString('es-ES', opciones);
        } else {
            document.getElementById('tareaModalUltimoMovimiento').textContent = 'Sin fecha';
        }

        // Tags
        const tagsContainer = document.getElementById('tareaModalTags');
        if (tarea.tags && tarea.tags.length > 0) {
            tagsContainer.innerHTML = tarea.tags.map(tag =>
                `<span class="tarea-tag-mini">${tag}</span>`
            ).join('');
        } else {
            tagsContainer.innerHTML = '<span class="tarea-tag-mini">General</span>';
        }

        // Cargar servicios asignados
        await cargarServiciosAsignados(tareaId);

    } catch (error) {
        console.error('Error al cargar detalle de tarea:', error);
        mostrarNotificacion('Error al cargar los detalles de la tarea', 'error');
        modal.style.display = 'none';
    }
}

/**
 * Carga los servicios asignados a una tarea
 * @param {number} tareaId - ID de la tarea
 */
async function cargarServiciosAsignados(tareaId) {
    const container = document.getElementById('tareaModalServicios');
    const serviciosContainer = document.getElementById('tareaModalServiciosContainer');

    if (!container || !serviciosContainer) return;

    try {
        // Mostrar loading
        container.innerHTML = '<p style="text-align: center; color: var(--texto-secundario);"><i class="fas fa-spinner fa-spin"></i> Cargando servicios...</p>';
        serviciosContainer.style.display = 'block';

        // Obtener todos los servicios (mantenimientos)
        const headers = window.obtenerHeadersConAuth
            ? await window.obtenerHeadersConAuth()
            : { 'Content-Type': 'application/json' };

        const response = await fetch(`${API_URL}/mantenimientos`, { headers });

        if (!response.ok) throw new Error('Error al cargar servicios');

        const todosServicios = await response.json();

        // Filtrar servicios que tienen esta tarea asignada
        const serviciosAsignados = todosServicios.filter(servicio =>
            servicio.tarea_id == tareaId
        );

        console.log(`📌 ${serviciosAsignados.length} servicios asignados a la tarea ${tareaId}`);

        if (serviciosAsignados.length === 0) {
            container.innerHTML = `
                <div class="servicios-vacio">
                    <i class="fas fa-inbox"></i>
                    <p>No hay servicios asignados a esta tarea</p>
                </div>
            `;
            return;
        }

        // Renderizar servicios
        container.innerHTML = serviciosAsignados.map(servicio => {
            const estadoMap = {
                'cancelado': { label: 'Cancelado', class: 'estado-cancelado' },
                'pendiente': { label: 'Pendiente', class: 'estado-pendiente' },
                'en_proceso': { label: 'En Proceso', class: 'estado-en_proceso' },
                'completado': { label: 'Completado', class: 'estado-completado' }
            };

            const estadoInfo = estadoMap[servicio.estado] || estadoMap['pendiente'];
            const ubicacion = servicio.cuarto_numero
                ? `Hab. ${servicio.cuarto_numero}`
                : (servicio.edificio_nombre || 'Sin ubicación');

            const tipoIcono = servicio.tipo === 'normal' ? 'fa-wrench' : 'fa-bell';
            const tipoTexto = servicio.tipo === 'normal' ? 'Avería' : 'Alerta';

            // Personal asignado al servicio
            const personalAsignado = servicio.usuario_asignado_nombre || 'Sin asignar';

            return `
                <div class="servicio-asignado-item">
                    <div class="servicio-asignado-info">
                        <div class="servicio-asignado-titulo">
                            ${servicio.descripcion || 'Servicio sin descripción'}
                        </div>
                        <div class="servicio-asignado-meta">
                            <span>
                                <i class="fas fa-map-marker-alt"></i>
                                ${ubicacion}
                            </span>
                            <span>
                                <i class="fas ${tipoIcono}"></i>
                                ${tipoTexto}
                            </span>
                            <span>
                                <i class="fas fa-user"></i>
                                ${personalAsignado}
                            </span>
                        </div>
                    </div>
                    <span class="servicio-asignado-badge ${estadoInfo.class}">
                        ${estadoInfo.label}
                    </span>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error al cargar servicios asignados:', error);
        container.innerHTML = `
            <div class="servicios-vacio">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar los servicios</p>
            </div>
        `;
    }
}

/**
 * Cierra el modal de detalle de tarea
 */
function cerrarModalDetalleTarea() {
    const modal = document.getElementById('modalDetalleTarea');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Cambia el estado de una tarea
 * @param {number} tareaId - ID de la tarea
 * @param {string} nuevoEstado - Nuevo estado ('en_proceso', 'completada')
 */
async function accionarTarea(tareaId, nuevoEstado = 'en_proceso') {
    try {
        console.log(`🚀 Accionando tarea ${tareaId} a estado: ${nuevoEstado}...`);

        const headers = obtenerHeadersConAuth();

        const response = await fetch(`${API_URL}/tareas/${tareaId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                estado: nuevoEstado
            })
        });

        if (!response.ok) {
            throw new Error(`Error al actualizar tarea: ${response.statusText}`);
        }

        const tareaActualizada = await response.json();
        console.log(`✅ Tarea actualizada a "${nuevoEstado}":`, tareaActualizada);

        // Actualizar UI del modal
        const estadoBadge = document.getElementById('tareaModalEstado');
        const btnAccionar = document.getElementById('tareaModalAccion');
        const nextStepText = document.getElementById('tareaModalNextStep');

        if (nuevoEstado === 'en_proceso') {
            if (estadoBadge) {
                estadoBadge.className = 'tarea-badge-estado status-progress';
                estadoBadge.innerHTML = '<i class="fas fa-spinner"></i> En Proceso';
            }
            if (btnAccionar) {
                btnAccionar.innerHTML = '<i class="fas fa-check"></i> Completar';
                btnAccionar.className = 'tarea-modal-btn btn-success';
                btnAccionar.onclick = () => accionarTarea(tareaId, 'completada');
            }
            if (nextStepText) nextStepText.textContent = 'Completar';
            mostrarNotificacion('Tarea iniciada correctamente', 'success');

        } else if (nuevoEstado === 'completada') {
            if (estadoBadge) {
                estadoBadge.className = 'tarea-badge-estado status-completed';
                estadoBadge.innerHTML = '<i class="fas fa-check-circle"></i> Completada';
            }
            if (btnAccionar) {
                btnAccionar.innerHTML = '<i class="fas fa-check-double"></i> Completada';
                btnAccionar.disabled = true;
                btnAccionar.className = 'tarea-modal-btn btn-secondary';
            }
            if (nextStepText) nextStepText.textContent = 'Finalizada';
            mostrarNotificacion('¡Tarea completada con éxito!', 'success');
        }


        // Actualizar solo la tarjeta específica en lugar de recargar todas
        await actualizarTarjetaTarea(tareaId);

    } catch (error) {
        console.error('❌ Error al accionar tarea:', error);
        mostrarNotificacion(`Error al accionar tarea: ${error.message}`, 'error');
    }
}

// ------------------------------
// INICIALIZACIÓN Y EVENT LISTENERS
// ------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando módulo de tareas...');

    // Asignar eventos a los formularios de los modales
    const formCrear = document.getElementById('formCrearTarea');
    if (formCrear) {
        formCrear.addEventListener('submit', submitCrearTarea);
        console.log('Evento submit asignado al formulario de crear tarea');
    } else {
        console.warn('Formulario formCrearTarea no encontrado');
    }

    const formEditar = document.getElementById('formEditarTarea');
    if (formEditar) {
        formEditar.addEventListener('submit', submitEditarTarea);
        console.log('Evento submit asignado al formulario de editar tarea');
    } else {
        console.warn('Formulario formEditarTarea no encontrado');
    }

    // Botón "Accionar" para cambiar estado a "En proceso"
    const btnAccionar = document.getElementById('tareaModalAccion');
    if (btnAccionar) {
        btnAccionar.addEventListener('click', async () => {
            if (!tareaIdActual) {
                console.warn('No hay tarea actual para accionar');
                return;
            }
            await accionarTarea(tareaIdActual);
        });
    }

    // Asignar eventos a los botones de "agregar tag"
    const btnAddTagCrear = document.getElementById('btnAgregarTagCrear');
    if (btnAddTagCrear) {
        btnAddTagCrear.addEventListener('click', () => agregarTag('crearTareaTags', 'tagsListCrear'));
    }

    const btnAddTagEditar = document.getElementById('btnAgregarTagEditar');
    if (btnAddTagEditar) {
        btnAddTagEditar.addEventListener('click', () => agregarTag('editarTareaTags', 'tagsListEditar'));
    }

    // Permitir agregar tags con Enter
    const inputTagCrear = document.getElementById('crearTareaTags');
    if (inputTagCrear) {
        inputTagCrear.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                agregarTag('crearTareaTags', 'tagsListCrear');
            }
        });
    }

    const inputTagEditar = document.getElementById('editarTareaTags');
    if (inputTagEditar) {
        inputTagEditar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                agregarTag('editarTareaTags', 'tagsListEditar');
            }
        });
    }

    // Event listeners para filtros de tareas
    const inputBuscarTarea = document.getElementById('buscarTarea');
    if (inputBuscarTarea) {
        let timeoutBusqueda = null;
        inputBuscarTarea.addEventListener('input', (e) => {
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(() => {
                if (todasLasTareas.length > 0) {
                    aplicarFiltrosTareas();
                }
            }, 300);
        });
    }

    const selectEstadoTarea = document.getElementById('filtroEstadoTarea');
    if (selectEstadoTarea) {
        selectEstadoTarea.addEventListener('change', () => {
            if (todasLasTareas.length > 0) {
                aplicarFiltrosTareas();
            }
        });
    }

    const selectPrioridadTarea = document.getElementById('filtroPrioridadTarea');
    if (selectPrioridadTarea) {
        const semaforoWrapper = selectPrioridadTarea.closest('[data-semaforo-wrapper]');
        const semaforoIndicator = semaforoWrapper ? semaforoWrapper.querySelector('.semaforo-indicator') : null;

        selectPrioridadTarea.addEventListener('change', () => {
            // Actualizar semáforo visual
            if (semaforoIndicator) {
                semaforoIndicator.classList.remove('prioridad-alta', 'prioridad-media', 'prioridad-baja');
                if (selectPrioridadTarea.value) {
                    semaforoIndicator.classList.add(`prioridad-${selectPrioridadTarea.value}`);
                }
            }

            if (todasLasTareas.length > 0) {
                aplicarFiltrosTareas();
            }
        });

        // Actualizar semáforo inicial
        if (semaforoIndicator && selectPrioridadTarea.value) {
            semaforoIndicator.classList.add(`prioridad-${selectPrioridadTarea.value}`);
        }
    }

    const selectRolTarea = document.getElementById('filtroRolTarea');
    if (selectRolTarea) {
        selectRolTarea.addEventListener('change', () => {
            // Actualizar el texto del rol en el resumen inmediatamente
            actualizarRolResumen();

            if (todasLasTareas.length > 0) {
                aplicarFiltrosTareas();
            }
        });
    }

    // Event listeners para cerrar modales
    document.querySelectorAll('[data-close-crear-modal]').forEach(el => {
        el.addEventListener('click', () => cerrarModal('modalCrearTarea'));
    });

    document.querySelectorAll('[data-close-modal]').forEach(el => {
        el.addEventListener('click', () => cerrarModal('modalEditarTarea'));
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalCrear = document.getElementById('modalCrearTarea');
            const modalEditar = document.getElementById('modalEditarTarea');

            if (modalCrear && modalCrear.style.display === 'flex') {
                cerrarModal('modalCrearTarea');
            }
            if (modalEditar && modalEditar.style.display === 'flex') {
                cerrarModal('modalEditarTarea');
            }
        }
    });

    // Inicializar semáforos
    const selectPrioridadCrear = document.getElementById('crearTareaPrioridad');
    if (selectPrioridadCrear) {
        selectPrioridadCrear.addEventListener('change', () =>
            actualizarSemaforoPrioridad('crearTareaPrioridad', 'semaforoPrioridadCrear'));
    }

    const selectPrioridadEditar = document.getElementById('editarTareaPrioridad');
    if (selectPrioridadEditar) {
        selectPrioridadEditar.addEventListener('change', () =>
            actualizarSemaforoPrioridad('editarTareaPrioridad', 'semaforoPrioridadEditar'));
    }

    // Eventos para el manejo de archivos adjuntos (Input Change)
    const inputArchivoCrear = document.getElementById('crearTareaAdjuntos');
    if (inputArchivoCrear) {
        inputArchivoCrear.addEventListener('change', (e) => {
            manejarArchivoAdjunto(e, 'filePreviewCrear');
        });
    }

    const inputArchivoEditar = document.getElementById('editarTareaAdjuntos');
    if (inputArchivoEditar) {
        inputArchivoEditar.addEventListener('change', (e) => {
            manejarArchivoAdjunto(e, 'filePreviewEditar');
        });
    }

    // Drag and Drop para archivos
    const setupDragAndDrop = (labelId, inputId, previewId) => {
        const label = document.querySelector(`label[for="${inputId}"]`);
        const input = document.getElementById(inputId);

        if (!label || !input) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            label.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            label.addEventListener(eventName, () => label.classList.add('highlight'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            label.addEventListener(eventName, () => label.classList.remove('highlight'), false);
        });

        label.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            // Asignar archivos al input
            input.files = files;

            // Disparar evento change manualmente
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
        }, false);
    };

    setupDragAndDrop('uploadLabelCrear', 'crearTareaAdjuntos', 'filePreviewCrear');
    setupDragAndDrop('uploadLabelEditar', 'editarTareaAdjuntos', 'filePreviewEditar');

    // Cerrar modales al hacer clic en el overlay
    const modales = ['modalCrearTarea', 'modalEditarTarea', 'modalDetalleTarea'];
    modales.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const overlay = modal.querySelector('.modal-detalles-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    if (modalId === 'modalDetalleTarea') {
                        cerrarModalDetalleTarea();
                    } else {
                        cerrarModal(modalId);
                    }
                });
            }

            // Cerrar con botones [data-close-modal]
            const closeBtns = modal.querySelectorAll('[data-close-modal]');
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (modalId === 'modalDetalleTarea') {
                        cerrarModalDetalleTarea();
                    } else {
                        cerrarModal(modalId);
                    }
                });
            });
        }
    });

    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalCrear = document.getElementById('modalCrearTarea');
            const modalEditar = document.getElementById('modalEditarTarea');
            const modalDetalle = document.getElementById('modalDetalleTarea');

            if (modalCrear && modalCrear.style.display === 'flex') {
                cerrarModal('modalCrearTarea');
            } else if (modalEditar && modalEditar.style.display === 'flex') {
                cerrarModal('modalEditarTarea');
            } else if (modalDetalle && modalDetalle.style.display === 'flex') {
                cerrarModalDetalleTarea();
            }
        }
    });

    // Inicializar el texto del rol en el resumen
    actualizarRolResumen();

    console.log('Módulo de tareas inicializado correctamente.');
});

// ------------------------------
// EXPONER FUNCIONES AL SCOPE GLOBAL
// ------------------------------

window.abrirModalCrearTarea = abrirModalCrearTarea;
window.abrirModalEditarTarea = abrirModalEditarTarea;
window.cerrarModal = cerrarModal;
window.cargarTareasEnSelector = cargarTareasEnSelector;
window.verDetalleTarea = verDetalleTarea;
window.cerrarModalDetalleTarea = cerrarModalDetalleTarea;

// ------------------------------
// PRÓXIMOS VENCIMIENTOS
// ------------------------------

/**
 * Carga las tareas que vencen en los próximos 3 días
 */
async function cargarProximosVencimientos() {
    const timeline = document.getElementById('tareasTimeline');
    const mensajeNoTimeline = document.getElementById('mensajeNoTimeline');

    if (!timeline) {
        console.warn('⚠️ Elemento tareasTimeline no encontrado');
        return;
    }

    try {
        // Mostrar loading
        timeline.innerHTML = '<li class="mensaje-cargando">Cargando vencimientos...</li>';
        if (mensajeNoTimeline) mensajeNoTimeline.style.display = 'none';

        // Obtener headers con autenticación
        const headers = window.obtenerHeadersConAuth
            ? await window.obtenerHeadersConAuth()
            : obtenerHeadersConAuth();

        // Obtener todas las tareas
        const response = await fetch(`${API_URL}/tareas`, { headers });

        if (!response.ok) {
            throw new Error(`Error al cargar tareas: ${response.status}`);
        }

        const todasLasTareas = await response.json();

        // Calcular fecha actual y fecha límite (hoy + 3 días)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const tresDias = new Date(hoy);
        tresDias.setDate(hoy.getDate() + 3);
        tresDias.setHours(23, 59, 59, 999);

        // Filtrar tareas que vencen en los próximos 3 días
        const tareasProximas = todasLasTareas.filter(tarea => {
            if (!tarea.fecha_vencimiento || tarea.estado === 'completada' || tarea.estado === 'cancelada') {
                return false;
            }

            const fechaVencimiento = new Date(tarea.fecha_vencimiento);
            fechaVencimiento.setHours(0, 0, 0, 0);

            return fechaVencimiento >= hoy && fechaVencimiento <= tresDias;
        });

        // Ordenar por fecha de vencimiento (más cercano primero)
        tareasProximas.sort((a, b) =>
            new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento)
        );

        console.log(`📅 ${tareasProximas.length} tareas con vencimiento próximo`);

        // Mostrar tareas o mensaje de "todo al día"
        if (tareasProximas.length === 0) {
            timeline.innerHTML = '';
            if (mensajeNoTimeline) mensajeNoTimeline.style.display = 'block';
        } else {
            // Renderizar cada tarea
            timeline.innerHTML = tareasProximas.map(tarea => {
                const fechaVenc = new Date(tarea.fecha_vencimiento);
                const diasRestantes = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

                // Determinar el texto y clase para los días restantes
                let textoVencimiento, claseVencimiento;
                if (diasRestantes === 0) {
                    textoVencimiento = 'Vence hoy';
                    claseVencimiento = 'vence-hoy';
                } else if (diasRestantes === 1) {
                    textoVencimiento = 'Vence mañana';
                    claseVencimiento = 'vence-manana';
                } else {
                    textoVencimiento = `Vence en ${diasRestantes} días`;
                    claseVencimiento = 'vence-proximo';
                }

                // Prioridad
                const prioridadMap = {
                    'alta': 'prioridad-alta',
                    'media': 'prioridad-media',
                    'baja': 'prioridad-baja'
                };
                const clasePrioridad = prioridadMap[tarea.prioridad] || 'prioridad-media';

                return `
                    <li class="timeline-task-item ${claseVencimiento}" onclick="window.verDetalleTarea(${tarea.id})" style="cursor: pointer;">
                        <div class="timeline-task-info">
                            <div class="timeline-task-header">
                                <span class="timeline-task-titulo">${tarea.titulo}</span>
                                <span class="badge-mini ${clasePrioridad}">${tarea.prioridad}</span>
                            </div>
                            <div class="timeline-task-meta">
                                <span class="timeline-vencimiento ${claseVencimiento}">
                                    <i class="fas fa-clock"></i> ${textoVencimiento}
                                </span>
                                ${tarea.ubicacion ? `
                                    <span class="timeline-ubicacion">
                                        <i class="fas fa-map-marker-alt"></i> ${tarea.ubicacion}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </li>
                `;
            }).join('');

            if (mensajeNoTimeline) mensajeNoTimeline.style.display = 'none';
        }

    } catch (error) {
        console.error('❌ Error al cargar próximos vencimientos:', error);
        timeline.innerHTML = `
            <li class="mensaje-error">
                <i class="fas fa-exclamation-triangle"></i> 
                Error al cargar vencimientos
            </li>
        `;
    }
}

// Exponer función al scope global
window.cargarProximosVencimientos = cargarProximosVencimientos;

console.log('Módulo tareas-module.js cargado.');
