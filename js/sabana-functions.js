// ========================================
// FUNCIONES DE SÁBANA CONECTADAS A BD
// ========================================

let currentSabanaId = null;
let currentSabanaArchivada = false;
let currentSabanaNombre = null;
let currentSabanaItems = []; // Guardar los items actuales para filtrado
let estoyCreandoSabana = false; // Flag para evitar dobles clicks
let cerrarModalNuevaSabanaEscHandler = null;
let cerrarModalHistorialEscHandler = null;
let cerrarModalConfirmarEliminarEscHandler = null;
let cerrarModalValidarEliminarEscHandler = null;

function lockBodyScroll() {
    document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
    document.body.classList.remove('modal-open');
}

function unlockBodyScrollIfNoModal() {
    // Pequeño delay para asegurar que el modal ya se ocultó
    setTimeout(() => {
        const modalVisible = Array.from(document.querySelectorAll('.modal-detalles'))
            .some(modal => window.getComputedStyle(modal).display !== 'none');

        if (!modalVisible) {
            document.body.classList.remove('modal-open');
        }
    }, 50);
}

// Helper para mostrar mensajes (compatible con app-loader.js)
function mostrarMensajeSabana(mensaje, tipo = 'info') {
    if (window.mostrarAlertaBlur) {
        window.mostrarAlertaBlur(mensaje, tipo);
    } else {
        console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
        if (tipo === 'error') {
            electronSafeAlert(mensaje);
        }
    }
}

function toggleAvisoArchivarActual() {
    const alertaArchivar = document.getElementById('alertaArchivarActual');
    const switchArchivar = document.getElementById('switchArchivarActual');

    if (alertaArchivar) {
        const debeMostrar = !!switchArchivar?.checked;
        alertaArchivar.style.display = debeMostrar ? 'flex' : 'none';
        
        if (debeMostrar && currentSabanaNombre) {
            const spanTexto = alertaArchivar.querySelector('span');
            if (spanTexto) {
                spanTexto.textContent = `La sábana actual "${currentSabanaNombre}" se moverá al historial en automático.`;
            }
        }
    }
}

async function cargarListaSabanas() {
    try {
        console.log('📥 Cargando lista de sábanas desde BD...');
        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas?includeArchivadas=true`);

        if (!response.ok) {
            throw new Error('Error al cargar sábanas');
        }

        const sabanas = await response.json();
        console.log('✅ Sábanas cargadas:', sabanas.length);

        const selectServicio = document.getElementById('filtroServicioActual');
        if (selectServicio) {
            selectServicio.innerHTML = '<option value="">-- Seleccionar sábana --</option>';

            // Filtrar solo sábanas NO archivadas para el select
            const sabanasActivas = sabanas.filter(s => !s.archivada);
            console.log(`📋 Sábanas activas para select: ${sabanasActivas.length}/${sabanas.length}`);

            sabanasActivas.forEach(sabana => {
                const option = document.createElement('option');
                option.value = sabana.id;
                option.textContent = sabana.nombre;
                option.dataset.archivada = false;
                selectServicio.appendChild(option);
            });
        }

        return sabanas;
    } catch (error) {
        console.error('❌ Error cargando lista de sábanas:', error);
        mostrarMensajeSabana('Error al cargar lista de sábanas', 'error');
        return [];
    }
}

async function cambiarServicioActual(sabanaId) {
    try {
        console.log('🔄 Cambiando a sábana:', sabanaId);

        if (!sabanaId) {
            document.getElementById('sabanaTableBody').innerHTML =
                '<tr><td colspan="7" class="sabana-placeholder">Selecciona una sábana.</td></tr>';
            // Ocultar notas y creador
            const notasContainer = document.getElementById('sabanaNotasContainer');
            if (notasContainer) notasContainer.style.display = 'none';
            const creadorContainer = document.getElementById('sabanaCreadorInfo');
            if (creadorContainer) creadorContainer.style.display = 'none';
            return;
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas/${sabanaId}`);

        if (!response.ok) {
            throw new Error('Error al cargar sábana');
        }

        const sabana = await response.json();
        console.log('✅ Sábana cargada:', sabana);
        console.log('📦 Items en la sábana:', sabana.items?.length || 0);

        currentSabanaId = sabana.id;
        currentSabanaArchivada = sabana.archivada;
        currentSabanaNombre = sabana.nombre;
        currentSabanaItems = sabana.items || []; // Guardar los items

        console.log('💾 currentSabanaItems guardados:', currentSabanaItems.length);

        // Asegurar que el select muestre la sábana actual, incluso si está archivada
        const selectServicio = document.getElementById('filtroServicioActual');
        if (selectServicio) {
            const optionExistente = Array.from(selectServicio.options).find(opt => opt.value === String(sabana.id));
            if (!optionExistente) {
                const option = document.createElement('option');
                option.value = sabana.id;
                option.textContent = `${sabana.nombre} (archivada)`;
                option.dataset.archivada = true;
                selectServicio.appendChild(option);
            }
            selectServicio.value = sabana.id;
        }

        const tituloEl = document.getElementById('tituloServicioActual');
        if (tituloEl) {
            if (sabana.archivada) {
                tituloEl.innerHTML = `
                    <span class="sabana-placeholder-title">Sábana de ${sabana.nombre}</span>
                    <span class="sabana-archivada-badge">
                        <i class="fas fa-lock"></i>
                        Archivada · Solo lectura
                    </span>
                `;
            } else {
                tituloEl.innerHTML = `<span class="sabana-placeholder-title"> Sábana de ${sabana.nombre}</span>`;
            }
        }

        const periodoEl = document.getElementById('periodoActual');
        if (periodoEl && sabana.fecha_creacion) {
            const fechaCreacion = new Date(sabana.fecha_creacion);
            periodoEl.textContent = `Creación: ${fechaCreacion.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`;
        }

        // Mostrar usuario creador
        const creadorContainer = document.getElementById('sabanaCreadorInfo');
        const creadorNombre = document.getElementById('sabanaCreadorNombre');
        if (creadorContainer && creadorNombre) {
            if (sabana.creador_nombre) {
                creadorNombre.textContent = sabana.creador_nombre;
                creadorContainer.style.display = 'block';
            } else {
                creadorContainer.style.display = 'none';
            }
        }

        // Mostrar notas de la sábana
        const notasContainer = document.getElementById('sabanaNotasContainer');
        const notasTexto = document.getElementById('sabanaNotasTexto');
        if (notasContainer && notasTexto) {
            if (sabana.notas && sabana.notas.trim()) {
                notasTexto.textContent = sabana.notas;
                notasContainer.style.display = 'flex';
            } else {
                notasContainer.style.display = 'none';
            }
        }

        renderSabanaTable(currentSabanaItems, sabana.archivada);

        // Poblar el select de edificios
        poblarEdificiosSabana(currentSabanaItems);

        // Poblar el select de personal
        poblarPersonalSabana(currentSabanaItems);

        if (sabana.archivada) {
            console.log('🔒 Sábana archivada cargada - modo solo lectura');
            mostrarMensajeSabana('Esta sábana está archivada. No se pueden realizar cambios.', 'warning');
        }

    } catch (error) {
        console.error('❌ Error cambiando sábana:', error);
        mostrarMensajeSabana('Error al cargar la sábana', 'error');
    }
}

function renderSabanaTable(items, archivada = false) {
    const tbody = document.getElementById('sabanaTableBody');
    if (!tbody) {
        console.error('⚠️ No se encontró elemento sabanaTableBody');
        return;
    }

    console.log('📊 Renderizando tabla con', items?.length || 0, 'items');

    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="sabana-placeholder">No hay registros en esta sábana.</td></tr>';
        console.log('⚠️ No hay items para mostrar');
        return;
    }

    console.log('✅ Renderizando', items.length, 'filas con lazy loading');

    // Lazy loading con Intersection Observer
    const BATCH_SIZE = 30; // Renderizar en lotes de 30
    let currentIndex = 0;

    const renderBatch = () => {
        const endIndex = Math.min(currentIndex + BATCH_SIZE, items.length);
        const fragment = document.createDocumentFragment();

        for (let i = currentIndex; i < endIndex; i++) {
            const item = items[i];
            const tr = document.createElement('tr');
            tr.setAttribute('data-lazy', 'true');

            const readonly = archivada ? 'disabled' : '';
            const readonlyClass = archivada ? 'readonly' : '';

            // Formatear fecha programada
            const fechaProgramada = item.fecha_programada
                ? new Date(item.fecha_programada).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
                : '-';

            tr.innerHTML = `
                <td data-label="Edificio">${item.edificio || 'Sin edificio'}</td>
                <td data-label="Habitación"><strong>${item.habitacion}</strong></td>
                <td data-label="Programada">${fechaProgramada}</td>
                <td data-label="Realizada">
                    ${item.fecha_realizado
                    ? `<span class="fecha-realizado">${new Date(item.fecha_realizado).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>`
                    : '<span style="color: #999;">-</span>'}
                </td>
                <td data-label="Responsable">
                    ${item.responsable_nombre || item.responsable
                    ? `<span class="responsable-nombre">${item.responsable_nombre || item.responsable}</span>`
                    : '<span style="color: #999;">-</span>'}
                </td>
                <td data-label="Observaciones">
                    <input 
                        type="text" 
                        class="input-observaciones ${readonlyClass}" 
                        value="${item.observaciones || ''}" 
                        data-item-id="${item.id}"
                        placeholder="${archivada ? 'Sin observaciones' : 'Escribe observaciones...'}"
                        ${readonly}
                        onchange="guardarObservacionSabana(${item.id}, this.value)"
                    />
                </td>
                <td style="text-align: center;" data-label="Estado">
                    <label class="checkbox-container ${readonlyClass}">
                        <input 
                            type="checkbox" 
                            class="checkbox-sabana" 
                            data-item-id="${item.id}"
                            ${item.realizado ? 'checked' : ''}
                            ${readonly}
                            onchange="toggleRealizadoSabana(${item.id}, this.checked)"
                        />
                        <span class="checkmark"></span>
                    </label>
                </td>
            `;

            fragment.appendChild(tr);
        }

        tbody.appendChild(fragment);
        currentIndex = endIndex;

        console.log(`📦 Renderizados ${endIndex}/${items.length} items`);

        // Si quedan más filas, preparar el sentinel para lazy loading
        if (currentIndex < items.length) {
            const sentinel = document.createElement('tr');
            sentinel.className = 'lazy-sentinel';
            sentinel.innerHTML = '<td colspan="7" style="height: 1px; padding: 0;"></td>';
            tbody.appendChild(sentinel);

            // Observer para cargar siguiente lote
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        observer.unobserve(entry.target);
                        entry.target.remove();
                        renderBatch();
                    }
                });
            }, {
                rootMargin: '100px' // Cargar cuando esté a 100px de ser visible
            });

            observer.observe(sentinel);
        } else {
            console.log('✅ Todas las filas renderizadas');
        }
    };

    // Iniciar el primer lote
    renderBatch();

    actualizarContadoresSabana(items);
}

function actualizarContadoresSabana(items) {
    const completados = items.filter(item => item.realizado).length;
    const total = items.length;

    const completadosEl = document.getElementById('serviciosCompletados');
    const totalesEl = document.getElementById('serviciosTotales');

    if (completadosEl) completadosEl.textContent = completados;
    if (totalesEl) totalesEl.textContent = total;
}

function poblarEdificiosSabana(items) {
    const selectEdificio = document.getElementById('filtroEdificioSabana');
    if (!selectEdificio) return;

    // Obtener edificios únicos - optimizado para reducir iteraciones
    const edificiosSet = new Set();
    for (const item of items) {
        if (item.edificio) {
            edificiosSet.add(item.edificio);
        }
    }
    const edificios = [...edificiosSet].sort();

    selectEdificio.innerHTML = '<option value="">Todos los edificios</option>';
    edificios.forEach(edificio => {
        const option = document.createElement('option');
        option.value = edificio;
        option.textContent = edificio;
        selectEdificio.appendChild(option);
    });

    console.log('🏢 Edificios cargados en select:', edificios.length);
}

function poblarPersonalSabana(items) {
    const selectPersonal = document.getElementById('filtroPersonalSabana');
    if (!selectPersonal) return;

    // Obtener personal único (responsables)
    const personalSet = new Set();
    items.forEach(item => {
        const responsable = item.responsable_nombre || item.responsable;
        if (responsable && responsable.trim()) {
            personalSet.add(responsable.trim());
        }
    });

    const personalUnico = Array.from(personalSet).sort();

    selectPersonal.innerHTML = '<option value="">Todo el personal</option>';
    personalUnico.forEach(personal => {
        const option = document.createElement('option');
        option.value = personal;
        option.textContent = personal;
        selectPersonal.appendChild(option);
    });

    console.log('👥 Personal cargado en select:', personalUnico.length);
}

async function toggleRealizadoSabana(itemId, realizado) {
    if (currentSabanaArchivada) {
        mostrarMensajeSabana('No se puede editar una sábana archivada', 'error');
        setTimeout(() => cambiarServicioActual(currentSabanaId), 100);
        return;
    }

    try {
        console.log('🔄 Actualizando item:', itemId, realizado);

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ realizado })
        });

        if (!response.ok) {
            throw new Error('Error al actualizar item');
        }

        const data = await response.json();
        console.log('✅ Item actualizado:', data);

        if (data.success && data.item) {
            const localItem = currentSabanaItems.find(i => i.id === itemId);
            if (localItem) {
                localItem.realizado = realizado;
                localItem.fecha_realizado = data.item.fecha_realizado;
                if (data.item.responsable) {
                    localItem.responsable = data.item.responsable;
                    localItem.responsable_nombre = data.item.responsable;
                    localItem.usuario_responsable_id = data.item.usuario_responsable_id;
                }
            }

            const checkbox = document.querySelector(`input.checkbox-sabana[data-item-id="${itemId}"]`);
            if (checkbox) {
                const row = checkbox.closest('tr');
                if (row) {
                    const fechaRealizadoCell = row.cells[3];
                    if (fechaRealizadoCell) {
                        const fechaRealizado = data.item.fecha_realizado
                            ? new Date(data.item.fecha_realizado).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                            : null;

                        fechaRealizadoCell.innerHTML = fechaRealizado
                            ? `<span class="fecha-realizado">${fechaRealizado}</span>`
                            : '<span style="color: #999;">-</span>';

                        fechaRealizadoCell.style.backgroundColor = 'rgba(76, 84, 76, 0.12)';
                        setTimeout(() => {
                            fechaRealizadoCell.style.backgroundColor = '';
                        }, 1000);
                    }

                    if (data.item.responsable) {
                        const responsableCell = row.cells[4];
                        if (responsableCell) {
                            responsableCell.innerHTML = `<span class="responsable-nombre">${data.item.responsable}</span>`;
                            responsableCell.style.backgroundColor = 'rgba(76, 84, 76, 0.12)';
                            setTimeout(() => {
                                responsableCell.style.backgroundColor = '';
                            }, 1000);
                        }
                        poblarPersonalSabana(currentSabanaItems);
                    }
                }
            }

            actualizarContadoresSabana(currentSabanaItems);
        }

        mostrarMensajeSabana(realizado ? 'Marcado como realizado' : 'Marcado como pendiente', 'success');

    } catch (error) {
        console.error('❌ Error actualizando item:', error);
        mostrarMensajeSabana('Error al actualizar el estado', 'error');
        setTimeout(() => cambiarServicioActual(currentSabanaId), 100);
    }
}

async function guardarObservacionSabana(itemId, observaciones) {
    if (currentSabanaArchivada) {
        mostrarMensajeSabana('No se puede editar una sábana archivada', 'error');
        return;
    }

    try {
        console.log('💾 Guardando observación:', itemId, observaciones);

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ observaciones })
        });

        if (!response.ok) {
            throw new Error('Error al guardar observación');
        }

        const data = await response.json();
        console.log('✅ Observación guardada:', data);

        // Actualizar UI si hay datos del responsable
        if (data.success && data.item) {
            // Actualizar el item en el array local
            const localItem = currentSabanaItems.find(i => i.id === itemId);
            if (localItem) {
                localItem.observaciones = observaciones;
                if (data.item.responsable) {
                    localItem.responsable = data.item.responsable;
                    localItem.usuario_responsable_id = data.item.usuario_responsable_id;
                }
            }

            // Actualizar la fila en la tabla si es necesario
            if (data.item.responsable) {
                // Buscar la fila por el input que disparó el evento (usando el itemId)
                const inputObservacion = document.querySelector(`input[data-item-id="${itemId}"]`);
                if (inputObservacion) {
                    const row = inputObservacion.closest('tr');
                    if (row) {
                        // La columna del responsable es la 5ta (índice 4)
                        const responsableCell = row.cells[4];
                        if (responsableCell) {
                            responsableCell.innerHTML = `<span class="responsable-nombre">${data.item.responsable}</span>`;
                            // Efecto visual de actualización
                            responsableCell.style.backgroundColor = 'rgba(76, 84, 76, 0.12)';
                            setTimeout(() => {
                                responsableCell.style.backgroundColor = '';
                            }, 1000);
                        }
                    }
                }

                // Actualizar filtro de personal si es un nuevo responsable
                poblarPersonalSabana(currentSabanaItems);
            }
        }

    } catch (error) {
        console.error('❌ Error guardando observación:', error);
        mostrarMensajeSabana('Error al guardar observación', 'error');
    }
}

function filterSabana() {
    const searchTerm = document.getElementById('buscarSabana')?.value.toLowerCase() || '';
    const edificioFiltro = document.getElementById('filtroEdificioSabana')?.value || '';
    const estadoFiltro = document.getElementById('filtroEstadoServicio')?.value || '';
    const personalFiltro = document.getElementById('filtroPersonalSabana')?.value || '';

    if (!currentSabanaItems || currentSabanaItems.length === 0) return;

    let itemsFiltrados = currentSabanaItems;

    // Filtrar por edificio
    if (edificioFiltro) {
        itemsFiltrados = itemsFiltrados.filter(item => item.edificio === edificioFiltro);
    }

    // Filtrar por estado
    if (estadoFiltro === 'realizado') {
        itemsFiltrados = itemsFiltrados.filter(item => item.realizado);
    } else if (estadoFiltro === 'pendiente') {
        itemsFiltrados = itemsFiltrados.filter(item => !item.realizado);
    }

    // Filtrar por personal
    if (personalFiltro) {
        itemsFiltrados = itemsFiltrados.filter(item => {
            const responsable = item.responsable_nombre || item.responsable;
            return responsable && responsable.trim() === personalFiltro;
        });
    }

    // Filtrar por búsqueda de texto
    if (searchTerm) {
        itemsFiltrados = itemsFiltrados.filter(item =>
            item.habitacion?.toLowerCase().includes(searchTerm) ||
            item.edificio?.toLowerCase().includes(searchTerm) ||
            item.observaciones?.toLowerCase().includes(searchTerm) ||
            item.responsable?.toLowerCase().includes(searchTerm) ||
            item.responsable_nombre?.toLowerCase().includes(searchTerm)
        );
    }

    renderSabanaTable(itemsFiltrados, currentSabanaArchivada);

    console.log(`🔍 Filtro aplicado: ${itemsFiltrados.length}/${currentSabanaItems.length} items mostrados`);
}

async function abrirModalNuevaSabana() {
    const modal = document.getElementById('modalNuevaSabana');
    if (!modal) {
        electronSafeAlert('Modal no encontrado');
        return;
    }

    // Limpiar campo de notas
    const inputNotas = document.getElementById('inputNotasSabana');
    if (inputNotas) {
        inputNotas.value = '';
    }

    // Limpiar y configurar input de nombre para nuevo servicio
    const inputNombre = document.getElementById('inputNombreServicio');
    if (inputNombre) {
        inputNombre.value = '';

        // Remover listeners anteriores y agregar uno nuevo
        const nuevoInputNombre = inputNombre.cloneNode(true);
        inputNombre.parentNode.replaceChild(nuevoInputNombre, inputNombre);

        // Agregar listener para Enter en nuevo servicio
        nuevoInputNombre.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('⌨️ Enter presionado en inputNombre');
                // Verificar que el botón no esté desactivado antes de crear
                const btn = document.getElementById('btn-confirmar-nueva-sabana');
                if (btn && !btn.disabled) {
                    confirmarNuevaSabana();
                }
            }
        });
    }

    // Agregar listener de Enter para select de servicio existente
    const selectServicio = document.getElementById('selectServicioNuevaSabana');
    if (selectServicio) {
        // Remover listeners anteriores y agregar uno nuevo
        const nuevoSelectServicio = selectServicio.cloneNode(true);
        selectServicio.parentNode.replaceChild(nuevoSelectServicio, selectServicio);

        nuevoSelectServicio.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('⌨️ Enter presionado en selectServicioNuevaSabana');

                // Verificar que el botón no esté desactivado antes de crear
                const btn = document.getElementById('btn-confirmar-nueva-sabana');
                if (btn && !btn.disabled) {
                    const tipoExistente = document.querySelector('input[name="tipoServicio"][value="existente"]');
                    if (tipoExistente?.checked && nuevoSelectServicio.value) {
                        crearNuevaSabanaPersonalizada(nuevoSelectServicio.value);
                    } else {
                        confirmarNuevaSabana();
                    }
                }
            }
        });
    }

    // Cargar servicios existentes en el select
    await cargarServiciosExistentes();

    // Resetear switch y aviso de archivado
    const switchArchivar = document.getElementById('switchArchivarActual');
    if (switchArchivar) {
        const nuevoSwitchArchivar = switchArchivar.cloneNode(true);
        nuevoSwitchArchivar.checked = false;
        switchArchivar.parentNode.replaceChild(nuevoSwitchArchivar, switchArchivar);
        nuevoSwitchArchivar.addEventListener('change', toggleAvisoArchivarActual);
        toggleAvisoArchivarActual();
    }

    // Permitir cerrar con Escape
    if (!cerrarModalNuevaSabanaEscHandler) {
        cerrarModalNuevaSabanaEscHandler = function (e) {
            if (e.key === 'Escape') {
                const modalVisible = document.getElementById('modalNuevaSabana');
                if (modalVisible && modalVisible.style.display === 'flex') {
                    cerrarModalNuevaSabana();
                }
            }
        };
        document.addEventListener('keydown', cerrarModalNuevaSabanaEscHandler);
    }

    modal.style.display = 'flex';
    lockBodyScroll();
}

async function cargarServiciosExistentes() {
    try {
        console.log('📋 Cargando servicios existentes para el select...');

        const selectServicio = document.getElementById('selectServicioNuevaSabana');
        console.log(`🔍 Buscando elemento selectServicioNuevaSabana: ${selectServicio ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);

        if (!selectServicio) {
            console.error('❌ NO SE ENCONTRÓ el elemento selectServicioNuevaSabana en el DOM');
            console.error('📝 Elementos SELECT en la página:', document.querySelectorAll('select').length);
            document.querySelectorAll('select').forEach((sel, idx) => {
                console.log(`   Select ${idx}: id="${sel.id}", class="${sel.className}"`);
            });
            return;
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas?includeArchivadas=false`);

        if (!response.ok) {
            throw new Error('Error al cargar servicios');
        }

        const sabanas = await response.json();
        console.log('📦 Sábanas obtenidas:', sabanas.length);
        console.log('📝 Muestra de sábanas:', sabanas.slice(0, 3).map(s => ({
            id: s.id,
            nombre: s.nombre,
            servicio_nombre: s.servicio_nombre,
            archivada: s.archivada
        })));

        // Extraer nombres únicos de servicios (sin fechas)
        const nombresSet = new Set();
        sabanas.forEach(s => {
            let nombre = s.servicio_nombre || s.nombre;
            if (nombre) {
                // Remover fechas del formato "Nombre - DD/MM/YYYY"
                nombre = nombre.replace(/\s*-\s*\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();
                if (nombre) {
                    nombresSet.add(nombre);
                }
            }
        });

        const nombresUnicos = Array.from(nombresSet).sort();
        console.log(`✅ Servicios únicos encontrados: ${nombresUnicos.length}`, nombresUnicos);

        selectServicio.innerHTML = '<option value="">-- Selecciona un servicio --</option>';

        nombresUnicos.forEach(nombre => {
            const option = document.createElement('option');
            option.value = nombre; // Usar el nombre como valor
            option.textContent = nombre;
            selectServicio.appendChild(option);
        });

        console.log(`✅ Select actualizado: ${selectServicio.options.length} opciones totales (incluyendo placeholder)`);
        console.log('📊 Contenido del select:', Array.from(selectServicio.options).map(o => `"${o.textContent}"`));

    } catch (error) {
        console.error('❌ Error cargando servicios existentes:', error);
    }
}

function cerrarModalNuevaSabana() {
    const modal = document.getElementById('modalNuevaSabana');
    if (modal) {
        modal.style.display = 'none';
        // Forzar desbloqueo del body al cerrar el modal
        unlockBodyScroll();
    }

    if (cerrarModalNuevaSabanaEscHandler) {
        document.removeEventListener('keydown', cerrarModalNuevaSabanaEscHandler);
        cerrarModalNuevaSabanaEscHandler = null;
    }
}

function toggleTipoServicioModal() {
    const tipoNuevo = document.querySelector('input[name="tipoServicio"][value="nuevo"]');
    const contenedorNuevo = document.getElementById('contenedorNuevoServicio');
    const contenedorExistente = document.getElementById('contenedorServicioExistente');

    if (tipoNuevo?.checked) {
        if (contenedorNuevo) contenedorNuevo.style.display = 'block';
        if (contenedorExistente) contenedorExistente.style.display = 'none';
    } else {
        if (contenedorNuevo) contenedorNuevo.style.display = 'none';
        if (contenedorExistente) contenedorExistente.style.display = 'block';
    }
}

async function confirmarNuevaSabana() {
    // Evitar dobles clicks/events
    if (estoyCreandoSabana) {
        console.warn('⚠️ Ya hay una sábana en proceso de creación');
        return;
    }
    estoyCreandoSabana = true;

    const btnConfirmarNuevaSabana = document.getElementById('btn-confirmar-nueva-sabana');
    const originalText = btnConfirmarNuevaSabana?.textContent || 'Confirmar';

    // Verificar qué tipo de servicio está seleccionado ANTES de cambiar el botón
    const tipoServicioRadio = document.querySelector('input[name="tipoServicio"]:checked');
    const tipoServicio = tipoServicioRadio?.value || 'nuevo';

    console.log('🔍 Tipo de servicio seleccionado:', tipoServicio);

    // Si es servicio existente, usar la función correspondiente
    if (tipoServicio === 'existente') {
        const selectServicio = document.getElementById('selectServicioNuevaSabana');
        const servicioSeleccionado = selectServicio?.value;

        if (!servicioSeleccionado) {
            electronSafeAlert('Selecciona un servicio de la lista');
            estoyCreandoSabana = false;
            selectServicio?.focus();
            return;
        }

        console.log('📋 Servicio existente seleccionado:', servicioSeleccionado);
        // Resetear el flag antes de delegar a la otra función
        estoyCreandoSabana = false;
        // Llamar a la función para crear sábana personalizada (ella manejará el botón)
        await crearNuevaSabanaPersonalizada(servicioSeleccionado);
        return;
    }

    // Si es nuevo servicio, cambiar el botón y continuar con el flujo normal
    if (btnConfirmarNuevaSabana) {
        btnConfirmarNuevaSabana.disabled = true;
        btnConfirmarNuevaSabana.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creando...`;
    }

    // Si es nuevo servicio, continuar con el flujo normal
    const inputNombre = document.getElementById('inputNombreServicio');
    let nombreServicio = inputNombre?.value.trim();
    const inputNotas = document.getElementById('inputNotasSabana');
    const notas = inputNotas?.value.trim() || null;
    const switchArchivar = document.getElementById('switchArchivarActual');
    const debeArchivarActual = switchArchivar?.checked || false;

    if (!nombreServicio) {
        electronSafeAlert('Ingresa el nombre del servicio');
        if (btnConfirmarNuevaSabana) {
            btnConfirmarNuevaSabana.disabled = false;
            btnConfirmarNuevaSabana.innerHTML = originalText;
        }
        estoyCreandoSabana = false;
        inputNombre?.focus();
        return;
    }

    console.log('📝 Nombre ingresado:', nombreServicio);
    console.log('🔍 Estado antes de crear:');
    console.log('   - currentSabanaId:', currentSabanaId);
    console.log('   - debeArchivarActual:', debeArchivarActual);
    console.log('   - switchArchivar.checked:', switchArchivar?.checked);

    try {
        // 1. Archivar sábana actual si el switch está activado Y hay una sábana seleccionada
        if (debeArchivarActual && currentSabanaId && !currentSabanaArchivada) {
            console.log('📦 Archivando sábana actual antes de crear nueva...');
            console.log('🎯 Sábana a archivar ID:', currentSabanaId);

            try {
                const archivarResponse = await fetchWithAuth(`${API_BASE_URL}/api/sabanas/${currentSabanaId}/archivar`, {
                    method: 'POST'
                });

                if (!archivarResponse.ok) {
                    const errorData = await archivarResponse.json().catch(() => ({}));
                    console.error('❌ Error archivando:', errorData);
                    throw new Error('Error al archivar sábana actual: ' + (errorData.error || 'desconocido'));
                }

                const archivarResultado = await archivarResponse.json();
                console.log('✅ Sábana actual archivada exitosamente:', archivarResultado);
            } catch (archivarError) {
                console.error('❌ Error en proceso de archivado:', archivarError);
                // Preguntar si desea continuar
                if (!window.electronSafeConfirm('Error al archivar la sábana actual. ¿Desea continuar creando la nueva sábana?')) {
                    // Restaurar botón al cancelar
                    if (btnConfirmarNuevaSabana) {
                        btnConfirmarNuevaSabana.disabled = false;
                        btnConfirmarNuevaSabana.innerHTML = originalText;
                    }
                    return;
                }
            }
        } else {
            if (!currentSabanaId) {
                console.log('ℹ️ No hay sábana actual para archivar (sin ID)');
            } else if (currentSabanaArchivada) {
                console.log('ℹ️ La sábana actual ya está archivada');
            } else if (!debeArchivarActual) {
                console.log('ℹ️ Switch de archivar desactivado - no se archivará la actual');
            }
        }

        // 2. Crear nueva sábana
        console.log('📝 Creando nueva sábana:', nombreServicio);

        const servicioId = 'servicio_' + nombreServicio.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .substring(0, 30) + '_' + Date.now();

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas`, {
            method: 'POST',
            body: JSON.stringify({
                nombre: nombreServicio,
                servicio_id: servicioId,
                servicio_nombre: nombreServicio,
                notas: notas
            })
        });

        if (!response.ok) {
            throw new Error('Error al crear sábana');
        }

        const nuevaSabana = await response.json();
        console.log('✅ Sábana creada:', nuevaSabana);

        await cargarListaSabanas();

        const selectServicio = document.getElementById('filtroServicioActual');
        if (selectServicio) {
            selectServicio.value = nuevaSabana.id;
        }

        await cambiarServicioActual(nuevaSabana.id);

        // Restaurar botón antes de cerrar
        if (btnConfirmarNuevaSabana) {
            btnConfirmarNuevaSabana.disabled = false;
            btnConfirmarNuevaSabana.innerHTML = originalText;
        }
        estoyCreandoSabana = false;

        cerrarModalNuevaSabana();

        const mensajeArchivado = debeArchivarActual ? ' (sábana anterior archivada)' : '';
        mostrarMensajeSabana(`Sábana "${nombreServicio}" creada exitosamente${mensajeArchivado}`, 'success');

    } catch (error) {
        console.error('❌ Error creando sábana:', error);
        electronSafeAlert('Error al crear la sábana: ' + error.message);
        if (btnConfirmarNuevaSabana) {
            btnConfirmarNuevaSabana.disabled = false;
            btnConfirmarNuevaSabana.innerHTML = originalText;
        }
        estoyCreandoSabana = false;
    }
}

async function verHistorialServicios() {
    const modal = document.getElementById('modalHistorialSabanas');
    const listaContainer = document.getElementById('listaHistorialSabanas');

    if (!modal || !listaContainer) {
        electronSafeAlert('Error al abrir el historial');
        return;
    }

    try {
        console.log('📚 Cargando historial de sábanas archivadas...');
        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas/archivadas`);

        if (!response.ok) {
            throw new Error('Error al cargar historial');
        }

        const historial = await response.json();
        console.log('📚 Sábanas archivadas recibidas:', historial.length);
        console.log('📦 Datos del historial:', historial);

        if (historial.length === 0) {
            listaContainer.innerHTML = `
                <div class="historial-vacio">
                    <i class="fas fa-archive"></i>
                    <p>Aún no hay sábanas archivadas.</p>
                </div>
            `;
        } else {
            listaContainer.innerHTML = historial.map(entry => {
                const fecha = new Date(entry.fecha_archivado || entry.fecha_creacion);
                const porcentaje = parseFloat(entry.progreso_porcentaje) || 0;
                const creadorInfo = entry.creador_nombre ? `<span class="historial-creador"><i class="fas fa-user"></i> ${Object.assign(document.createElement('div'), { textContent: entry.creador_nombre }).innerHTML}</span>` : '';
                const notasInfo = entry.notas ? `<div class="historial-notas"><i class="fas fa-sticky-note"></i> ${Object.assign(document.createElement('div'), { textContent: entry.notas.substring(0, 60) + (entry.notas.length > 60 ? '...' : '') }).innerHTML}</div>` : '';

                return `
                    <div class="historial-item" onclick="cargarSabanaDesdeHistorial(${entry.id})">
                        <div class="historial-item-header">
                             <h3>${Object.assign(document.createElement('div'), { textContent: entry.nombre }).innerHTML}</h3>
                            <span class="historial-fecha">${fecha.toLocaleDateString('es-MX')}</span>
                        </div>
                        ${creadorInfo}
                        ${notasInfo}
                        <div class="historial-stats">
                            <span class="stat">
                                <i class="fas fa-check-circle"></i> ${entry.items_completados || 0}/${entry.total_items || 0} completados
                            </span>
                            <span class="stat-progreso">${porcentaje.toFixed(0)}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        modal.style.display = 'flex';
        lockBodyScroll();

        if (!cerrarModalHistorialEscHandler) {
            cerrarModalHistorialEscHandler = function (e) {
                if (e.key === 'Escape') {
                    const modalVisible = document.getElementById('modalHistorialSabanas');
                    if (modalVisible && modalVisible.style.display === 'flex') {
                        cerrarModalHistorial();
                    }
                }
            };
            document.addEventListener('keydown', cerrarModalHistorialEscHandler);
        }

    } catch (error) {
        console.error('❌ Error cargando historial:', error);
        electronSafeAlert('Error al cargar el historial');
    }
}

function cerrarModalHistorial() {
    const modal = document.getElementById('modalHistorialSabanas');
    if (modal) {
        modal.style.display = 'none';
        // Forzar desbloqueo del body al cerrar el modal
        unlockBodyScroll();
    }

    if (cerrarModalHistorialEscHandler) {
        document.removeEventListener('keydown', cerrarModalHistorialEscHandler);
        cerrarModalHistorialEscHandler = null;
    }
}

async function cargarSabanaDesdeHistorial(sabanaId) {
    console.log('📖 Cargando sábana archivada desde historial:', sabanaId);
    cerrarModalHistorial();

    await cargarListaSabanas();

    const selectServicio = document.getElementById('filtroServicioActual');
    if (selectServicio) {
        selectServicio.value = sabanaId;
        // cambiarServicioActual ya detecta si está archivada y bloquea automáticamente
        await cambiarServicioActual(sabanaId);
        console.log('✅ Sábana archivada cargada en modo solo lectura');
    }
}

async function archivarPeriodo() {
    if (AppState.currentUser?.role !== 'admin') {
        electronSafeAlert('Solo los administradores pueden archivar sábanas');
        return;
    }

    if (!currentSabanaId) {
        electronSafeAlert('Selecciona una sábana para archivar');
        return;
    }

    if (currentSabanaArchivada) {
        electronSafeAlert('Esta sábana ya está archivada');
        return;
    }

    if (!window.electronSafeConfirm('¿Archivar esta sábana? Ya no podrá ser editada.')) {
        return;
    }

    try {
        console.log('📦 Iniciando archivado de sábana ID:', currentSabanaId);

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas/${currentSabanaId}/archivar`, {
            method: 'POST'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error del servidor:', errorData);
            throw new Error(errorData.error || 'Error al archivar sábana');
        }

        const resultado = await response.json();
        console.log('✅ Respuesta del servidor:', resultado);
        console.log('✅ Sábana archivada en BD, recargando...');

        // Recargar la lista de sábanas
        await cargarListaSabanas();

        // Recargar la sábana actual para mostrar el estado archivado
        await cambiarServicioActual(currentSabanaId);

        // Verificar que se archivó correctamente
        console.log('🔍 Verificando estado: currentSabanaArchivada =', currentSabanaArchivada);

        mostrarMensajeSabana('Sábana archivada exitosamente - Solo lectura. Puedes verla en el historial.', 'success');

    } catch (error) {
        console.error('❌ Error archivando sábana:', error);
        electronSafeAlert('Error al archivar la sábana');
    }
}

async function eliminarSabana() {
    if (AppState.currentUser?.role !== 'admin') {
        electronSafeAlert('Solo los administradores pueden eliminar sábanas');
        return;
    }

    if (!currentSabanaId) {
        electronSafeAlert('Selecciona una sábana para eliminar');
        return;
    }

    const selectServicio = document.getElementById('filtroServicioActual');
    const nombreSabanaOriginal = selectServicio?.options[selectServicio.selectedIndex]?.text || 'esta sábana';
    
    // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
    const nombreSabana = nombreSabanaOriginal.replace(/\s*\(archivada\)\s*/gi, '').trim();

    // Abrir el primer modal de confirmación
    abrirModalConfirmarEliminar(nombreSabana);
}

function abrirModalConfirmarEliminar(nombreSabana) {
    const modal = document.getElementById('modalConfirmarEliminar');
    const nombreEl1 = document.getElementById('nombreSabanaEliminar1');
    
    // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
    const nombreLimpio = nombreSabana.replace(/\s*\(archivada\)\s*/gi, '').trim();
    
    if (nombreEl1) {
        nombreEl1.textContent = nombreLimpio;
    }
    
    // Permitir cerrar con Escape
    if (!cerrarModalConfirmarEliminarEscHandler) {
        cerrarModalConfirmarEliminarEscHandler = function (e) {
            if (e.key === 'Escape') {
                const modalVisible = document.getElementById('modalConfirmarEliminar');
                if (modalVisible && modalVisible.style.display === 'flex') {
                    cerrarModalConfirmarEliminar();
                }
            }
        };
        document.addEventListener('keydown', cerrarModalConfirmarEliminarEscHandler);
    }
    
    if (modal) {
        modal.style.display = 'flex';
        lockBodyScroll();
    }
}

function cerrarModalConfirmarEliminar() {
    const modal = document.getElementById('modalConfirmarEliminar');
    if (modal) {
        modal.style.display = 'none';
        unlockBodyScroll();
    }
    
    if (cerrarModalConfirmarEliminarEscHandler) {
        document.removeEventListener('keydown', cerrarModalConfirmarEliminarEscHandler);
        cerrarModalConfirmarEliminarEscHandler = null;
    }
}

function abrirModalValidarEliminar() {
    // Cerrar el primer modal
    cerrarModalConfirmarEliminar();
    
    const modal = document.getElementById('modalValidarEliminar');
    const nombreEl2 = document.getElementById('nombreSabanaEliminar2');
    const inputConfirmar = document.getElementById('inputConfirmarEliminar');
    const inputNombre = document.getElementById('inputNombreSabanaEliminar');
    const placeholderConfirmar = document.getElementById('placeholderConfirmarEliminar');
    const placeholderNombre = document.getElementById('placeholderNombreSabana');
    const btnConfirmar = document.getElementById('btnConfirmarEliminar');
    
    const selectServicio = document.getElementById('filtroServicioActual');
    const nombreSabanaOriginal = selectServicio?.options[selectServicio.selectedIndex]?.text || 'esta sábana';
    
    // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
    const nombreSabana = nombreSabanaOriginal.replace(/\s*\(archivada\)\s*/gi, '').trim();
    
    if (nombreEl2) {
        nombreEl2.textContent = nombreSabana;
    }
    
    // Limpiar inputs
    if (inputConfirmar) {
        inputConfirmar.value = '';
        inputConfirmar.setAttribute('data-target', 'eliminar');
    }
    if (inputNombre) {
        inputNombre.value = '';
        inputNombre.setAttribute('data-target', nombreSabana);
    }
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar permanentemente';
    }
    
    // Establecer placeholders iniciales (sin espacios al inicio)
    if (placeholderConfirmar) {
        placeholderConfirmar.textContent = 'eliminar';
        placeholderConfirmar.style.left = '12px';
        placeholderConfirmar.style.color = '';
    }
    if (placeholderNombre) {
        placeholderNombre.textContent = nombreSabana;
        placeholderNombre.style.left = '12px';
        placeholderNombre.style.color = '';
    }
    
    // Permitir cerrar con Escape
    if (!cerrarModalValidarEliminarEscHandler) {
        cerrarModalValidarEliminarEscHandler = function (e) {
            if (e.key === 'Escape') {
                const modalVisible = document.getElementById('modalValidarEliminar');
                if (modalVisible && modalVisible.style.display === 'flex') {
                    cerrarModalValidarEliminar();
                }
            }
        };
        document.addEventListener('keydown', cerrarModalValidarEliminarEscHandler);
    }
    
    if (modal) {
        modal.style.display = 'flex';
        lockBodyScroll();
        
        // Focus en el primer input
        setTimeout(() => {
            if (inputConfirmar) inputConfirmar.focus();
        }, 100);
    }
}

function actualizarPlaceholderPersistente(inputId, placeholderId, targetText) {
    const input = document.getElementById(inputId);
    const placeholder = document.getElementById(placeholderId);
    
    if (!input || !placeholder) return;
    
    // Si targetText está vacío, obtenerlo del atributo data-target
    if (!targetText) {
        targetText = input.getAttribute('data-target') || '';
    }
    
    const inputValue = input.value;
    const inputLength = inputValue.length;
    
    // Verificar si lo escrito coincide con el inicio del texto objetivo
    if (targetText.startsWith(inputValue) && inputValue.length > 0) {
        // Mostrar solo lo que falta
        const remaining = targetText.substring(inputLength);
        placeholder.textContent = remaining;
        
        // Ajustar la posición del placeholder según el texto escrito
        const textWidth = getTextWidth(inputValue, input);
        placeholder.style.left = `${12 + textWidth}px`;
        placeholder.style.color = '';  // Restaurar color normal
    } else if (inputValue.length === 0) {
        // Si está vacío, mostrar el texto completo desde el inicio
        placeholder.textContent = targetText;
        placeholder.style.left = '12px';
        placeholder.style.color = '';  // Color normal
    } else {
        // Si no coincide, mostrar el texto completo con color de error
        placeholder.textContent = targetText;
        placeholder.style.left = '12px';
        placeholder.style.color = 'rgba(244, 67, 54, 0.3)';
    }
}

function getTextWidth(text, inputElement) {
    // Crear un elemento temporal para medir el ancho del texto
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const computedStyle = window.getComputedStyle(inputElement);
    context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    const metrics = context.measureText(text);
    return metrics.width;
}

function cerrarModalValidarEliminar() {
    const modal = document.getElementById('modalValidarEliminar');
    if (modal) {
        modal.style.display = 'none';
        unlockBodyScroll();
    }
    
    if (cerrarModalValidarEliminarEscHandler) {
        document.removeEventListener('keydown', cerrarModalValidarEliminarEscHandler);
        cerrarModalValidarEliminarEscHandler = null;
    }
}

function validarCamposEliminar() {
    const inputConfirmar = document.getElementById('inputConfirmarEliminar');
    const inputNombre = document.getElementById('inputNombreSabanaEliminar');
    const btnConfirmar = document.getElementById('btnConfirmarEliminar');
    const hintNombre = document.getElementById('hintNombreSabana');
    
    const selectServicio = document.getElementById('filtroServicioActual');
    const nombreSabanaOriginal = selectServicio?.options[selectServicio.selectedIndex]?.text || '';
    
    // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
    const nombreSabanaReal = nombreSabanaOriginal.replace(/\s*\(archivada\)\s*/gi, '').trim();
    
    const valorConfirmar = inputConfirmar?.value || '';
    const valorNombre = inputNombre?.value || '';
    
    // Validar que diga exactamente "eliminar"
    const confirmarValido = valorConfirmar === 'eliminar';
    
    // Validar que el nombre coincida exactamente
    const nombreValido = valorNombre === nombreSabanaReal;
    
    // Actualizar hint del nombre
    if (hintNombre) {
        if (valorNombre && !nombreValido) {
            hintNombre.textContent = 'El nombre no coincide';
            hintNombre.style.color = '#F44336';
        } else {
            hintNombre.textContent = 'Debe coincidir exactamente';
            hintNombre.style.color = '';
        }
    }
    
    // Habilitar/deshabilitar botón
    if (btnConfirmar) {
        btnConfirmar.disabled = !(confirmarValido && nombreValido);
    }
}

async function confirmarEliminarSabana() {
    const btnConfirmar = document.getElementById('btnConfirmarEliminar');
    
    const selectServicio = document.getElementById('filtroServicioActual');
    const nombreSabanaOriginal = selectServicio?.options[selectServicio.selectedIndex]?.text || 'esta sábana';
    
    // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
    const nombreSabana = nombreSabanaOriginal.replace(/\s*\(archivada\)\s*/gi, '').trim();
    
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
    }

    try {
        console.log('🗑️ Iniciando eliminación de sábana ID:', currentSabanaId);

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas/${currentSabanaId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error del servidor:', errorData);
            throw new Error(errorData.error || 'Error al eliminar sábana');
        }

        const resultado = await response.json();
        console.log('✅ Respuesta del servidor:', resultado);
        console.log('✅ Sábana eliminada de BD');

        currentSabanaId = null;
        currentSabanaArchivada = false;
        currentSabanaNombre = null;
        currentSabanaItems = [];

        await cargarListaSabanas();

        const tbody = document.getElementById('sabanaTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="sabana-placeholder">Selecciona una sábana.</td></tr>';
        }

        const tituloEl = document.getElementById('tituloServicioActual');
        if (tituloEl) {
            tituloEl.innerHTML = '<span class="sabana-placeholder-title">Selecciona una sábana</span>';
        }

        const periodoEl = document.getElementById('periodoActual');
        if (periodoEl) {
            periodoEl.textContent = 'Periodo Actual';
        }

        const completadosEl = document.getElementById('serviciosCompletados');
        if (completadosEl) {
            completadosEl.textContent = '0';
        }

        const totalesEl = document.getElementById('serviciosTotales');
        if (totalesEl) {
            totalesEl.textContent = '0';
        }

        // Ocultar notas y creador
        const notasContainer = document.getElementById('sabanaNotasContainer');
        if (notasContainer) notasContainer.style.display = 'none';
        const creadorContainer = document.getElementById('sabanaCreadorInfo');
        if (creadorContainer) creadorContainer.style.display = 'none';

        // Cerrar modal y restaurar botón
        cerrarModalValidarEliminar();
        
        // Restaurar botón
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar permanentemente';
        }

        mostrarMensajeSabana(`Sábana "${nombreSabana}" eliminada exitosamente`, 'success');

    } catch (error) {
        console.error('❌ Error eliminando sábana:', error);
        
        // Restaurar botón
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar permanentemente';
        }
        
        electronSafeAlert('Error al eliminar la sábana: ' + error.message);
    }
}

async function exportarSabanaExcel() {
    console.log('🟢🟢🟢 FUNCIÓN EXPORTAR LLAMADA 🟢🟢🟢');

    // Verificar permisos - solo admin y supervisor pueden exportar
    const userRole = window.AppState?.currentUser?.role || 'tecnico';
    if (userRole !== 'admin' && userRole !== 'supervisor') {
        console.warn('⚠️ Usuario sin permisos para exportar');
        electronSafeAlert('No tienes permisos para exportar. Esta función es solo para supervisores y administradores.');
        return;
    }

    console.log('currentSabanaId:', currentSabanaId);
    console.log('currentSabanaItems.length:', currentSabanaItems?.length);

    if (!currentSabanaId) {
        console.warn('⚠️ No hay sábana seleccionada');
        electronSafeAlert('Selecciona una sábana para exportar');
        return;
    }

    console.log('📊 Exportando sábana ID:', currentSabanaId);
    console.log('📦 Items disponibles en currentSabanaItems:', currentSabanaItems.length);

    // Usar los datos que ya están cargados en memoria
    if (!currentSabanaItems || currentSabanaItems.length === 0) {
        console.warn('⚠️ Sin datos para exportar');
        electronSafeAlert('No hay datos para exportar. Por favor, carga una sábana primero.');
        return;
    }

    try {
        // Obtener el nombre de la sábana del currentSabanaId o del select como respaldo
        let nombreSabana = 'sabana';

        // Intentar obtener del select (para sábanas no archivadas)
        const selectServicio = document.getElementById('filtroServicioActual');
        if (selectServicio?.options[selectServicio.selectedIndex]) {
            nombreSabana = selectServicio.options[selectServicio.selectedIndex].text;
        }
        // Si no está en el select (sábana archivada), obtener del título mostrado
        else if (document.getElementById('tituloServicioActual')) {
            const tituloText = document.getElementById('tituloServicioActual').innerText;
            // Extraer el nombre entre "de" y posibles etiquetas de estado
            const match = tituloText.match(/de\s+(.+?)(?:\s+Archivada|$)/i);
            nombreSabana = match ? match[1].trim() : 'sabana';
        }

        console.log('📝 Generando CSV con', currentSabanaItems.length, 'items');

        let csv = 'Edificio,Habitación,Fecha Programada,Fecha Realizado,Responsable,Observaciones,Realizado\n';

        currentSabanaItems.forEach((item, index) => {
            const fechaProgramada = item.fecha_programada
                ? new Date(item.fecha_programada).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
                : '-';

            const fechaRealizado = item.fecha_realizado
                ? new Date(item.fecha_realizado).toLocaleString('es-MX', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                })
                : '-';

            const responsable = item.responsable_nombre || item.responsable || '-';
            const observaciones = (item.observaciones || '').replace(/"/g, '""'); // Escapar comillas dobles
            const realizado = item.realizado ? 'Sí' : 'No';

            // Construir la línea CSV con todos los campos entre comillas para evitar problemas
            const edificio = (item.edificio || '-').replace(/"/g, '""');
            const habitacion = (item.habitacion || '-').replace(/"/g, '""');
            const responsableLimpio = responsable.replace(/"/g, '""');

            csv += `"${edificio}","${habitacion}","${fechaProgramada}","${fechaRealizado}","${responsableLimpio}","${observaciones}","${realizado}"\n`;

            if (index < 3) {
                console.log(`   Fila ${index + 1}:`, {
                    edificio: item.edificio,
                    habitacion: item.habitacion,
                    realizado: item.realizado,
                    observaciones: item.observaciones?.substring(0, 20)
                });
            }
        });

        console.log('✅ CSV generado:', csv.split('\n').length - 1, 'líneas (incluyendo header)');
        console.log('📄 Primeras 200 caracteres del CSV:', csv.substring(0, 200));

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Usar fecha local en lugar de UTC
        const fechaLocal = new Date();
        const fechaStr = `${fechaLocal.getFullYear()}-${String(fechaLocal.getMonth() + 1).padStart(2, '0')}-${String(fechaLocal.getDate()).padStart(2, '0')}`;
        a.download = `sabana_${nombreSabana.replace(/[^a-z0-9]/gi, '_')}_${fechaStr}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        console.log('✅ Archivo descargado');
        mostrarMensajeSabana(`Sábana exportada: ${currentSabanaItems.length} registros`, 'success');

    } catch (error) {
        console.error('❌ Error exportando sábana:', error);
        electronSafeAlert('Error al exportar la sábana');
    }
}

async function crearNuevaSabana(servicioId) {
    // Evitar dobles clicks/events
    if (estoyCreandoSabana) {
        console.warn('⚠️ Ya hay una sábana en proceso de creación');
        return;
    }
    estoyCreandoSabana = true;

    const btnConfirmarNuevaSabana = document.getElementById('btn-confirmar-nueva-sabana');
    const originalText = btnConfirmarNuevaSabana?.textContent || 'Confirmar';

    // Desactivar botón y mostrar spinner
    if (btnConfirmarNuevaSabana) {
        btnConfirmarNuevaSabana.disabled = true;
        btnConfirmarNuevaSabana.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creando...`;
    }

    try {
        console.log('📝 Creando sábana para servicio:', servicioId);

        // Extraer el nombre del servicio del ID (remover prefijos y sufijos timestamp)
        let servicioNombre = servicioId.replace(/^(servicio_|custom_)/, '').replace(/_\d+$/, '');
        servicioNombre = servicioNombre.replace(/_/g, ' ');
        servicioNombre = servicioNombre.charAt(0).toUpperCase() + servicioNombre.slice(1);

        const nombreSabana = `${servicioNombre}`;

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas`, {
            method: 'POST',
            body: JSON.stringify({
                servicio_id: servicioId,
                servicio_nombre: servicioNombre,
                nombre: nombreSabana
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear sábana');
        }

        const nuevaSabana = await response.json();
        console.log('✅ Sábana creada:', nuevaSabana);
        console.log('📦 Items en sábana nueva:', nuevaSabana.items?.length || 0);

        // Agregar la nueva sábana al select sin recargar toda la lista
        const selectServicio = document.getElementById('filtroServicioActual');
        if (selectServicio) {
            console.log('🔄 Agregando nueva opción al select con ID:', nuevaSabana.id);
            const option = document.createElement('option');
            option.value = nuevaSabana.id;
            option.textContent = `${nuevaSabana.nombre}`;
            option.dataset.archivada = nuevaSabana.archivada || false;
            selectServicio.appendChild(option);

            // Seleccionar la nueva opción
            selectServicio.value = nuevaSabana.id;
            console.log('✅ Select actualizado, valor seleccionado:', selectServicio.value);
        } else {
            console.error('⚠️ No se encontró el select filtroServicioActual');
        }

        // Delay para asegurar que el DOM se actualice
        await new Promise(resolve => setTimeout(resolve, 100));

        // Cargar la sábana recién creada
        console.log('📋 Cargando sábana recién creada:', nuevaSabana.id);
        await cambiarServicioActual(nuevaSabana.id);

        // Restaurar botón antes de cerrar
        if (btnConfirmarNuevaSabana) {
            btnConfirmarNuevaSabana.disabled = false;
            btnConfirmarNuevaSabana.innerHTML = originalText;
        }
        estoyCreandoSabana = false;

        cerrarModalNuevaSabana();
        mostrarMensajeSabana('Sábana creada exitosamente', 'success');

    } catch (error) {
        console.error('❌ Error creando sábana:', error);
        electronSafeAlert('Error al crear la sábana: ' + error.message);
        if (btnConfirmarNuevaSabana) {
            btnConfirmarNuevaSabana.disabled = false;
            btnConfirmarNuevaSabana.innerHTML = originalText;
        }
        estoyCreandoSabana = false;
    }
}

async function crearNuevaSabanaPersonalizada(nombreServicio) {
    // Evitar dobles clicks/events
    if (estoyCreandoSabana) {
        console.warn('⚠️ Ya hay una sábana en proceso de creación');
        return;
    }
    estoyCreandoSabana = true;

    const btnConfirmarNuevaSabana = document.getElementById('btn-confirmar-nueva-sabana');
    const originalText = btnConfirmarNuevaSabana?.textContent || 'Confirmar';

    // Desactivar botón y mostrar spinner
    if (btnConfirmarNuevaSabana) {
        btnConfirmarNuevaSabana.disabled = true;
        btnConfirmarNuevaSabana.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creando...`;
    }

    try {
        console.log('📝 Creando sábana personalizada:', nombreServicio);

        // Verificar si se debe archivar la actual
        const switchArchivar = document.getElementById('switchArchivarActual');
        const debeArchivarActual = switchArchivar?.checked || false;

        console.log('🔍 Estado antes de crear (personalizada):');
        console.log('   - currentSabanaId:', currentSabanaId);
        console.log('   - debeArchivarActual:', debeArchivarActual);
        console.log('   - currentSabanaArchivada:', currentSabanaArchivada);

        // 1. Archivar sábana actual si el switch está activado Y hay una sábana seleccionada
        if (debeArchivarActual && currentSabanaId && !currentSabanaArchivada) {
            console.log('📦 Archivando sábana actual antes de crear nueva...');
            console.log('🎯 Sábana a archivar ID:', currentSabanaId);

            try {
                const archivarResponse = await fetchWithAuth(`${API_BASE_URL}/api/sabanas/${currentSabanaId}/archivar`, {
                    method: 'POST'
                });

                if (!archivarResponse.ok) {
                    const errorData = await archivarResponse.json().catch(() => ({}));
                    console.error('❌ Error archivando:', errorData);
                    throw new Error('Error al archivar sábana actual: ' + (errorData.error || 'desconocido'));
                }

                const archivarResultado = await archivarResponse.json();
                console.log('✅ Sábana actual archivada exitosamente:', archivarResultado);
            } catch (archivarError) {
                console.error('❌ Error en proceso de archivado:', archivarError);
                // Preguntar si desea continuar
                if (!window.electronSafeConfirm('Error al archivar la sábana actual. ¿Desea continuar creando la nueva sábana?')) {
                    // Restaurar botón al cancelar
                    if (btnConfirmarNuevaSabana) {
                        btnConfirmarNuevaSabana.disabled = false;
                        btnConfirmarNuevaSabana.innerHTML = originalText;
                    }
                    return;
                }
            }
        } else {
            if (!currentSabanaId) {
                console.log('ℹ️ No hay sábana actual para archivar (sin ID)');
            } else if (currentSabanaArchivada) {
                console.log('ℹ️ La sábana actual ya está archivada');
            } else if (!debeArchivarActual) {
                console.log('ℹ️ Switch de archivar desactivado - no se archivará la actual');
            }
        }

        // 2. Crear nueva sábana
        const inputNotas = document.getElementById('inputNotasSabana');
        const notas = inputNotas?.value.trim() || null;

        const servicioId = 'servicio_' + nombreServicio.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .substring(0, 30) + '_' + Date.now();

        const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas`, {
            method: 'POST',
            body: JSON.stringify({
                nombre: nombreServicio,
                servicio_id: servicioId,
                servicio_nombre: nombreServicio,
                notas: notas
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear sábana');
        }

        const nuevaSabana = await response.json();
        console.log('✅ Sábana personalizada creada:', nuevaSabana);
        console.log('📦 Items en sábana nueva:', nuevaSabana.items?.length || 0);

        // Recargar la lista de sábanas para actualizar el select
        await cargarListaSabanas();

        // Seleccionar la nueva sábana
        const selectServicio = document.getElementById('filtroServicioActual');
        if (selectServicio) {
            selectServicio.value = nuevaSabana.id;
            console.log('✅ Select actualizado, valor seleccionado:', selectServicio.value);
        }

        // Cargar la sábana recién creada
        await cambiarServicioActual(nuevaSabana.id);

        // Restaurar botón antes de cerrar
        if (btnConfirmarNuevaSabana) {
            btnConfirmarNuevaSabana.disabled = false;
            btnConfirmarNuevaSabana.innerHTML = originalText;
        }
        estoyCreandoSabana = false;

        cerrarModalNuevaSabana();

        const mensajeArchivado = (debeArchivarActual && currentSabanaId) ? ' (sábana anterior archivada)' : '';
        mostrarMensajeSabana(`Sábana "${nombreServicio}" creada exitosamente${mensajeArchivado}`, 'success');

    } catch (error) {
        console.error('❌ Error creando sábana personalizada:', error);
        electronSafeAlert('Error al crear la sábana: ' + error.message);
        if (btnConfirmarNuevaSabana) {
            btnConfirmarNuevaSabana.disabled = false;
            btnConfirmarNuevaSabana.innerHTML = originalText;
        }
        estoyCreandoSabana = false;
    }
}

window.cargarListaSabanas = cargarListaSabanas;
window.cambiarServicioActual = cambiarServicioActual;
window.toggleRealizadoSabana = toggleRealizadoSabana;
window.guardarObservacionSabana = guardarObservacionSabana;
window.filterSabana = filterSabana;
window.abrirModalNuevaSabana = abrirModalNuevaSabana;
window.cerrarModalNuevaSabana = cerrarModalNuevaSabana;
window.toggleTipoServicioModal = toggleTipoServicioModal;
window.confirmarNuevaSabana = confirmarNuevaSabana;
window.verHistorialServicios = verHistorialServicios;
window.cerrarModalHistorial = cerrarModalHistorial;
window.cargarSabanaDesdeHistorial = cargarSabanaDesdeHistorial;
window.archivarPeriodo = archivarPeriodo;
window.eliminarSabana = eliminarSabana;
window.abrirModalConfirmarEliminar = abrirModalConfirmarEliminar;
window.cerrarModalConfirmarEliminar = cerrarModalConfirmarEliminar;
window.abrirModalValidarEliminar = abrirModalValidarEliminar;
window.cerrarModalValidarEliminar = cerrarModalValidarEliminar;
window.validarCamposEliminar = validarCamposEliminar;
window.confirmarEliminarSabana = confirmarEliminarSabana;
window.actualizarPlaceholderPersistente = actualizarPlaceholderPersistente;
window.exportarSabanaExcel = exportarSabanaExcel;
window.crearNuevaSabana = crearNuevaSabana;
window.crearNuevaSabanaPersonalizada = crearNuevaSabanaPersonalizada;

// Override para asegurar que exportarSabanaExcel siempre está disponible
if (window.exportarSabanaExcel) {
    const originalExportar = window.exportarSabanaExcel;
    window.exportarSabanaExcel = function () {
        console.log('🟢 WRAPPER: Llamando a exportarSabanaExcel');
        return originalExportar.apply(this, arguments);
    };
}

console.log('✅ [SABANA-FUNCTIONS] Todas las funciones exportadas a window');
console.log('📋 Funciones disponibles:', {
    cargarListaSabanas: typeof window.cargarListaSabanas,
    cambiarServicioActual: typeof window.cambiarServicioActual,
    exportarSabanaExcel: typeof window.exportarSabanaExcel,
    confirmarNuevaSabana: typeof window.confirmarNuevaSabana,
    crearNuevaSabana: typeof window.crearNuevaSabana,
    crearNuevaSabanaPersonalizada: typeof window.crearNuevaSabanaPersonalizada,
    archivarPeriodo: typeof window.archivarPeriodo,
    eliminarSabana: typeof window.eliminarSabana
});

