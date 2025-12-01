// ========================================
// FUNCIONES DE SÁBANA CONECTADAS A BD
// ========================================

let currentSabanaId = null;
let currentSabanaArchivada = false;
let currentSabanaItems = []; // Guardar los items actuales para filtrado
let currentSabanaFechaCreacion = null; // Fecha de creación de la sábana para fallback
let estoyCreandoSabana = false; // Flag para evitar dobles clicks
let cerrarModalNuevaSabanaEscHandler = null;
let cerrarModalHistorialEscHandler = null;

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
    if (typeof mostrarMensaje === 'function') {
        mostrarMensaje(mensaje, tipo);
    } else {
        console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
        if (tipo === 'error') {
            alert(mensaje);
        }
    }
}

function toggleAvisoArchivarActual() {
    const alertaArchivar = document.getElementById('alertaArchivarActual');
    const switchArchivar = document.getElementById('switchArchivarActual');

    if (alertaArchivar) {
        const debeMostrar = !!switchArchivar?.checked;
        alertaArchivar.style.display = debeMostrar ? 'flex' : 'none';
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
                '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Selecciona una sábana.</td></tr>';
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
        currentSabanaItems = sabana.items || []; // Guardar los items
        currentSabanaFechaCreacion = sabana.fecha_creacion || null; // Guardar fecha creación

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
                    <span style="color: white;">Sábana de ${sabana.nombre}</span>
                    <span class="sabana-archivada-badge">
                        <i class="fas fa-lock"></i>
                        Archivada · Solo lectura
                    </span>
                `;
            } else {
                tituloEl.innerHTML = `<span style="color: white;"> Sábana de ${sabana.nombre}</span>`;
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No hay registros en esta sábana.</td></tr>';
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

            // Formatear fecha programada (fallback a fecha de creación de sábana)
            const fechaParaUsar = item.fecha_programada || currentSabanaFechaCreacion;
            const fechaProgramada = fechaParaUsar
                ? new Date(fechaParaUsar).toLocaleDateString('es-MX', {
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
                    ${(() => {
                        const nombre = item.responsable_nombre || item.responsable;
                        return (nombre && nombre !== 'null' && nombre !== 'undefined')
                            ? `<span class="responsable-nombre">${nombre}</span>`
                            : '<span style="color: #999;">-</span>';
                    })()}
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

    // Obtener edificios únicos
    const edificios = [...new Set(items.map(item => item.edificio).filter(Boolean))].sort();

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
        alert('Modal no encontrado');
        return;
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

    // Desactivar botón y mostrar spinner
    if (btnConfirmarNuevaSabana) {
        btnConfirmarNuevaSabana.disabled = true;
        btnConfirmarNuevaSabana.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creando...`;
    }

    const inputNombre = document.getElementById('inputNombreServicio');
    let nombreServicio = inputNombre?.value.trim();
    const switchArchivar = document.getElementById('switchArchivarActual');
    const debeArchivarActual = switchArchivar?.checked || false;

    if (!nombreServicio) {
        alert('Ingresa el nombre del servicio');
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
                if (!confirm('Error al archivar la sábana actual. ¿Desea continuar creando la nueva sábana?')) {
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
                notas: null
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
        alert('Error al crear la sábana: ' + error.message);
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
        alert('Error al abrir el historial');
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
                // Asegurar que porcentaje sea un número
                const porcentaje = parseFloat(entry.progreso_porcentaje) || 0;

                return `
                    <div class="historial-item" onclick="cargarSabanaDesdeHistorial(${entry.id})">
                        <div class="historial-item-header">
                            <h3>${entry.nombre}</h3>
                            <span class="historial-fecha">${fecha.toLocaleDateString('es-MX')}</span>
                        </div>
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
        alert('Error al cargar el historial');
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
        alert('Solo los administradores pueden archivar sábanas');
        return;
    }

    if (!currentSabanaId) {
        alert('Selecciona una sábana para archivar');
        return;
    }

    if (currentSabanaArchivada) {
        alert('Esta sábana ya está archivada');
        return;
    }

    if (!confirm('¿Archivar esta sábana? Ya no podrá ser editada.')) {
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
        alert('Error al archivar la sábana');
    }
}

async function exportarSabanaExcel() {
    console.log('🟢🟢🟢 FUNCIÓN EXPORTAR LLAMADA 🟢🟢🟢');
    console.log('currentSabanaId:', currentSabanaId);
    console.log('currentSabanaItems.length:', currentSabanaItems?.length);

    if (!currentSabanaId) {
        console.warn('⚠️ No hay sábana seleccionada');
        alert('Selecciona una sábana para exportar');
        return;
    }

    console.log('📊 Exportando sábana ID:', currentSabanaId);
    console.log('📦 Items disponibles en currentSabanaItems:', currentSabanaItems.length);

    // Usar los datos que ya están cargados en memoria
    if (!currentSabanaItems || currentSabanaItems.length === 0) {
        console.warn('⚠️ Sin datos para exportar');
        alert('No hay datos para exportar. Por favor, carga una sábana primero.');
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
            // Fallback a fecha de creación de sábana si no hay fecha_programada
            const fechaParaUsar = item.fecha_programada || currentSabanaFechaCreacion;
            const fechaProgramada = fechaParaUsar
                ? new Date(fechaParaUsar).toLocaleDateString('es-MX', {
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
        a.download = `sabana_${nombreSabana.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        console.log('✅ Archivo descargado');
        mostrarMensajeSabana(`Sábana exportada: ${currentSabanaItems.length} registros`, 'success');

    } catch (error) {
        console.error('❌ Error exportando sábana:', error);
        alert('Error al exportar la sábana');
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
        alert('Error al crear la sábana: ' + error.message);
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
                if (!confirm('Error al archivar la sábana actual. ¿Desea continuar creando la nueva sábana?')) {
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
                notas: null
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
        alert('Error al crear la sábana: ' + error.message);
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
    crearNuevaSabanaPersonalizada: typeof window.crearNuevaSabanaPersonalizada
});
