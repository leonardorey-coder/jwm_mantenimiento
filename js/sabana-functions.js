// ========================================
// FUNCIONES DE SÁBANA CONECTADAS A BD
// ========================================

let currentSabanaId = null;
let currentSabanaArchivada = false;
let currentSabanaNombre = null;
let currentSabanaItems = []; // Guardar los items actuales para filtrado
let sabanasCache = []; // Cache para búsqueda rápida por ID
let estoyCreandoSabana = false; // Flag para evitar dobles clicks
let cerrarModalNuevaSabanaEscHandler = null;
let cerrarModalHistorialEscHandler = null;
let cerrarModalConfirmarEliminarEscHandler = null;
let cerrarModalValidarEliminarEscHandler = null;

/**
 * Convierte un timestamp UTC de la base de datos a string formateado en zona horaria local.
 * Garantiza comportamiento consistente entre Web y Electron.
 * La BD almacena timestamps en UTC sin indicador de zona horaria.
 * @param {string|Date} utcTimestamp - Timestamp de la BD (UTC)
 * @param {object} options - Opciones de Intl.DateTimeFormat
 * @returns {string} Fecha formateada en zona horaria local
 */
function formatFechaLocal(utcTimestamp, options = {}) {
  if (!utcTimestamp) return '-';

  let dateStr = utcTimestamp;

  // Si es string y no tiene indicador de zona horaria, asumir UTC agregando Z
  if (typeof dateStr === 'string') {
    // Normalizar: reemplazar espacio por T si es necesario
    dateStr = dateStr.replace(' ', 'T');

    // Si ya tiene Z o offset (+/-), dejarlo como está
    if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
      dateStr = dateStr + 'Z';
    }
  }

  // Parse como UTC
  const date = new Date(dateStr);

  // Verificar fecha válida
  if (isNaN(date.getTime())) return '-';

  // Opciones por defecto para display - JavaScript automáticamente convierte a hora local
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return date.toLocaleDateString('es-MX', { ...defaultOptions, ...options });
}

/**
 * Formatea fecha corta (para tablas) con conversión de zona horaria
 * @param {string|Date} utcTimestamp - Timestamp ISO de la BD (UTC)
 * @returns {string} Fecha formateada como DD/MM/YYYY
 */
function formatFechaCorta(utcTimestamp) {
  return formatFechaLocal(utcTimestamp, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Formatea fecha y hora con conversión de zona horaria
 * @param {string|Date} utcTimestamp - Timestamp ISO de la BD (UTC)
 * @returns {string} Fecha y hora formateada
 */
function formatFechaHora(utcTimestamp) {
  if (!utcTimestamp) return '-';

  let dateStr = utcTimestamp;

  // Si es string y no tiene indicador de zona horaria, asumir UTC agregando Z
  if (typeof dateStr === 'string') {
    if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
      dateStr = dateStr + 'Z';
    }
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function obtenerRolUsuarioActualSabana() {
  let userRole = null;

  if (window.AppState?.currentUser) {
    userRole =
      window.AppState.currentUser.role ||
      window.AppState.currentUser.rol ||
      window.AppState.currentUser.rol_nombre;
  }

  if (!userRole) {
    const storedUser = JSON.parse(
      localStorage.getItem('currentUser') ||
      sessionStorage.getItem('currentUser') ||
      'null'
    );
    if (storedUser) {
      userRole = storedUser.role || storedUser.rol || storedUser.rol_nombre;
    }
  }

  if (!userRole) return null;

  const roleMap = {
    admin: 'admin',
    ADMIN: 'admin',
    Administrador: 'admin',
    supervisor: 'supervisor',
    SUPERVISOR: 'supervisor',
    Supervisor: 'supervisor',
    tecnico: 'tecnico',
    TECNICO: 'tecnico',
    Técnico: 'tecnico',
  };

  if (roleMap[userRole]) return roleMap[userRole];
  if (typeof userRole === 'string') {
    const normalized = userRole.toLowerCase();
    return roleMap[normalized] || normalized;
  }

  return null;
}

function esAdminUsuarioActualSabana() {
  return obtenerRolUsuarioActualSabana() === 'admin';
}

function lockBodyScroll() {
  document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
  document.body.classList.remove('modal-open');
}

function unlockBodyScrollIfNoModal() {
  // Pequeño delay para asegurar que el modal ya se ocultó
  setTimeout(() => {
    const modalVisible = Array.from(
      document.querySelectorAll('.modal-detalles')
    ).some((modal) => window.getComputedStyle(modal).display !== 'none');

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
        spanTexto.textContent = currentSabanaArchivada
          ? `La sábana actual "${currentSabanaNombre}" ya está archivada en el historial.`
          : `La sábana actual "${currentSabanaNombre}" se moverá al historial en automático.`;
      }
    }
  }
}

async function cargarListaSabanas() {
  try {
    console.log('📥 Cargando lista de sábanas desde BD...');
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas?includeArchivadas=true`
    );

    if (!response.ok) {
      throw new Error('Error al cargar sábanas');
    }

    const sabanas = await response.json();
    console.log('✅ Sábanas cargadas:', sabanas.length);

    sabanasCache = sabanas;

    const selectServicio = document.getElementById('filtroServicioActual');
    if (selectServicio) {
      selectServicio.innerHTML =
        '<option value="">-- Seleccionar sábana --</option>';

      // Filtrar solo sábanas NO archivadas para el select
      const sabanasActivas = sabanas.filter((s) => !s.archivada);
      console.log(
        `📋 Sábanas activas para select: ${sabanasActivas.length}/${sabanas.length}`
      );

      sabanasActivas.forEach((sabana) => {
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

function parseSabanaIdInput(inputValue) {
  if (!inputValue) return null;

  const normalized = inputValue.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.startsWith('sab-')) {
    const hexPart = normalized.slice(4);
    if (!/^[0-9a-f]+$/.test(hexPart)) return null;
    return Number.parseInt(hexPart, 16);
  }

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  return null;
}

function configurarSabanaIdTab(sabanaIdHex, archivada = false) {
  const tab = document.getElementById('sabanaIdTab');
  const valueEl = document.getElementById('sabanaIdValue');
  if (!tab || !valueEl) return;

  if (!sabanaIdHex) {
    tab.classList.remove('is-visible');
    tab.classList.remove('is-archived');
    tab.dataset.sabanaId = '';
    valueEl.textContent = '';
    return;
  }

  valueEl.textContent = sabanaIdHex;
  tab.dataset.sabanaId = sabanaIdHex;
  tab.classList.toggle('is-archived', archivada);
  tab.classList.add('is-visible');
  tab.onclick = () => copiarSabanaId(sabanaIdHex);
}

/**
 * Agrega las pestañas de archivado al header de la sábana
 * @param {number} sabanaId - ID de la sábana
 * @param {string} nombreSabana - Nombre de la sábana
 */
function agregarPestanasArchivado(sabanaId, nombreSabana) {
  // Remover pestañas existentes si las hay
  removerPestanasArchivado();

  const header = document.querySelector('.filtros-bitacora-header');
  if (!header) return;

  // Escapar comillas simples en el nombre
  const nombreEscapado = nombreSabana.replace(/'/g, "\\'");

  const puedeDesarchivar = esAdminUsuarioActualSabana();

  // Crear botón de "Archivada" (siempre visible)
  const btnArchivada = document.createElement('button');
  btnArchivada.type = 'button';
  btnArchivada.className = 'sabana-id-tab is-visible';
  btnArchivada.id = 'sabanaArchivadaTab';
  btnArchivada.disabled = true;
  btnArchivada.title = 'Sábana Archivada';
  btnArchivada.innerHTML = `
    <i class="fas fa-folder sabana-id-icon" aria-hidden="true"></i>
    <span>Archivada</span>
  `;

  header.appendChild(btnArchivada);

  // Crear botón de "Desarchivar" (solo si es admin)
  if (puedeDesarchivar) {
    const btnDesarchivar = document.createElement('button');
    btnDesarchivar.type = 'button';
    btnDesarchivar.className = 'sabana-id-tab is-visible';
    btnDesarchivar.id = 'sabanaDesarchivarTab';
    btnDesarchivar.title = 'Desarchivar Sábana';
    btnDesarchivar.onclick = () => desarchivarSabana(sabanaId, nombreEscapado);
    btnDesarchivar.innerHTML = `
      <i class="fas fa-folder-open sabana-id-icon" aria-hidden="true"></i>
      <span>Desarchivar</span>
    `;

    header.appendChild(btnDesarchivar);
  }
}

/**
 * Remueve las pestañas de archivado del header
 */
function removerPestanasArchivado() {
  const btnArchivada = document.getElementById('sabanaArchivadaTab');
  if (btnArchivada) {
    btnArchivada.remove();
  }

  const btnDesarchivar = document.getElementById('sabanaDesarchivarTab');
  if (btnDesarchivar) {
    btnDesarchivar.remove();
  }
}

async function copiarSabanaId(sabanaIdHex) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(sabanaIdHex);
    } else {
      throw new Error('Clipboard API no disponible');
    }
  } catch (error) {
    const tempInput = document.createElement('input');
    tempInput.value = sabanaIdHex;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
  }

  mostrarMensajeSabana(`ID copiado: ${sabanaIdHex}`, 'success');
}

function seleccionarSabanaPorId(inputValue) {
  const sabanaId = parseSabanaIdInput(inputValue);
  if (!sabanaId) return;

  const sabana = sabanasCache.find((item) => Number(item.id) === sabanaId);
  if (!sabana) {
    mostrarMensajeSabana('No se encontró una sábana con ese ID', 'error');
    return;
  }

  const selectServicio = document.getElementById('filtroServicioActual');
  if (selectServicio) {
    selectServicio.value = sabana.id;
  }

  cambiarServicioActual(sabana.id);
}

async function cambiarServicioActual(sabanaId) {
  try {
    console.log('🔄 Cambiando a sábana:', sabanaId);

    if (!sabanaId) {
      const wrapper = document.querySelector('.filtros-table-wrapper');
      if (wrapper) {
        wrapper.innerHTML = `
          <table class="filtros-table">
            <thead>
              <tr>
                <th><i class="fas fa-building"></i> Edificio</th>
                <th><i class="fas fa-door-closed"></i> Habitación</th>
                <th><i class="fas fa-calendar"></i> Fecha Límite</th>
                <th><i class="fas fa-calendar-check"></i> Fecha Realizado</th>
                <th><i class="fas fa-user"></i> Responsable</th>
                <th style="text-align: center"><i class="fas fa-comment"></i> Observaciones</th>
                <th><i class="fas fa-check-circle"></i> Realizado</th>
              </tr>
            </thead>
            <tbody id="sabanaTableBody">
              <tr><td colspan="7" class="sabana-placeholder">Selecciona o crea una sábana para comenzar.</td></tr>
            </tbody>
          </table>
        `;
      }

      currentSabanaId = null;
      currentSabanaArchivada = false;
      currentSabanaNombre = '';
      currentSabanaItems = [];

      const tituloEl = document.getElementById('tituloServicioActual');
      if (tituloEl) {
        tituloEl.textContent = 'Sábana de Servicios';
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

      const creadorNombre = document.getElementById('sabanaCreadorNombre');
      if (creadorNombre) {
        creadorNombre.textContent = '-';
      }

      const creadorContainer = document.getElementById('sabanaCreadorInfo');
      if (creadorContainer) {
        creadorContainer.style.display = 'none';
      }

      const notasContainer = document.getElementById('sabanaNotasContainer');
      if (notasContainer) {
        notasContainer.classList.remove(
          'sabana-notas-editable-container',
          'is-empty'
        );
        notasContainer.style.display = 'none';
      }

      const notasTexto = document.getElementById('sabanaNotasTexto');
      if (notasTexto) {
        notasTexto.textContent = '';
        notasTexto.className = 'sabana-notas-editable';
      }

      configurarSabanaIdTab(null);
      return;
    }

    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas/${sabanaId}`
    );

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
      const optionExistente = Array.from(selectServicio.options).find(
        (opt) => opt.value === String(sabana.id)
      );
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
      // Formatear ID a Hexadecimal (sab-XXX)
      const sabanaIdHex = `sab-${parseInt(sabana.id)
        .toString(16)
        .toUpperCase()
        .padStart(3, '0')}`;

      if (sabana.archivada) {
        tituloEl.innerHTML = `
                    <span class="sabana-placeholder-title"><span class="sabana-nombre-display">${sabana.nombre}</span></span>
                `;
        // Agregar pestañas de archivado al header
        agregarPestanasArchivado(sabana.id, sabana.nombre);
      } else {
        tituloEl.innerHTML = `
                    <span class="sabana-placeholder-title"><span class="sabana-nombre-editable" onclick="iniciarEdicionNombreSabana(${sabana.id}, '${sabana.nombre.replace(/'/g, "\\'")}')" title="Click para editar">${sabana.nombre}</span></span>
                `;
        // Remover pestañas de archivado si existen
        removerPestanasArchivado();
      }

      configurarSabanaIdTab(sabanaIdHex, sabana.archivada);
    }

    // Mostrar fecha límite (tomando la fecha_programada del primer item)
    const fechaLimiteContainer = document.getElementById('sabanaFechaLimiteInfo');
    const fechaLimiteEl = document.getElementById('sabanaFechaLimite');
    if (fechaLimiteContainer && fechaLimiteEl && sabana.items && sabana.items.length > 0) {
      const fechaLimite = sabana.items[0]?.fecha_programada;
      if (fechaLimite) {
        fechaLimiteEl.textContent = formatFechaLocal(fechaLimite);
        fechaLimiteContainer.style.display = 'block';
      } else {
        fechaLimiteContainer.style.display = 'none';
      }
    } else if (fechaLimiteContainer) {
      fechaLimiteContainer.style.display = 'none';
    }

    const periodoEl = document.getElementById('periodoActual');
    if (periodoEl && sabana.fecha_creacion) {
      periodoEl.textContent = `Creación: ${formatFechaLocal(sabana.fecha_creacion)}`;
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
      const notasActuales = (sabana.notas || '').trim();
      const tieneNotas = notasActuales.length > 0;

      // Mostrar texto o placeholder según si hay notas
      if (tieneNotas) {
        notasTexto.textContent = notasActuales;
        notasTexto.className = 'sabana-notas-editable';
        notasContainer.classList.remove('is-empty');
      } else {
        notasTexto.textContent = 'Agregar nota...';
        notasTexto.className = 'sabana-notas-editable sabana-notas-placeholder';
        notasContainer.classList.add('is-empty');
      }
      notasTexto.title = 'Click para editar notas';

      const notasIcon = notasContainer.querySelector('i');
      if (!sabana.archivada) {
        const obtenerNotasActuales = () => {
          const spanActual = document.getElementById('sabanaNotasTexto');
          if (!spanActual) return '';
          if (spanActual.classList.contains('sabana-notas-placeholder'))
            return '';
          return spanActual.textContent.trim();
        };

        notasContainer.classList.remove('is-readonly');
        notasContainer.classList.add('sabana-notas-editable-container');
        notasTexto.onclick = () =>
          iniciarEdicionNotasSabana(sabana.id, obtenerNotasActuales());
        if (notasIcon) {
          notasIcon.onclick = () =>
            iniciarEdicionNotasSabana(sabana.id, obtenerNotasActuales());
        }

        notasContainer.onclick = () => {
          const inputActual = notasContainer.querySelector(
            '.sabana-notas-input'
          );
          if (inputActual) {
            inputActual.focus();
            inputActual.select();
            return;
          }
          iniciarEdicionNotasSabana(sabana.id, obtenerNotasActuales());
        };
      } else {
        notasContainer.classList.remove('sabana-notas-editable-container');
        notasContainer.classList.add('is-readonly');
        notasTexto.onclick = null;
        notasTexto.style.cursor = 'text';
        if (notasIcon) {
          notasIcon.onclick = null;
        }
        notasContainer.onclick = null;
      }

      notasContainer.style.display = 'flex';
    }

    renderSabanaTable(currentSabanaItems, sabana.archivada);

    // Poblar el select de edificios
    poblarEdificiosSabana(currentSabanaItems);

    // Poblar el select de personal
    poblarPersonalSabana(currentSabanaItems);

    if (sabana.archivada) {
      console.log('🔒 Sábana archivada cargada - modo solo lectura');
      mostrarMensajeSabana(
        'Esta sábana está archivada. No se pueden realizar cambios.',
        'warning'
      );
    }
  } catch (error) {
    console.error('❌ Error cambiando sábana:', error);
    mostrarMensajeSabana('Error al cargar la sábana', 'error');
  }
}

function renderSabanaTable(items, archivada = false) {
  const wrapper = document.querySelector('.filtros-table-wrapper');
  const tbody = document.getElementById('sabanaTableBody');

  // Detectar si es desktop (> 768px)
  const isDesktop = window.innerWidth > 768;

  console.log(
    '📊 Renderizando tabla con',
    items?.length || 0,
    'items',
    isDesktop ? '(columnas)' : '(tabla)'
  );

  if (isDesktop) {
    // En desktop, usar layout de columnas
    renderSabanaColumns(items, archivada);
    return;
  }

  // En móvil, restaurar la tabla si se cambió a columnas previamente
  if (wrapper && !wrapper.querySelector('table')) {
    wrapper.innerHTML = `
      <table class="filtros-table">
        <thead>
          <tr>
            <th><i class="fas fa-building"></i> Edificio</th>
            <th><i class="fas fa-door-closed"></i> Habitación</th>
            <th><i class="fas fa-calendar"></i> Fecha Límite</th>
            <th><i class="fas fa-calendar-check"></i> Fecha Realizado</th>
            <th><i class="fas fa-user"></i> Responsable</th>
            <th style="text-align: center"><i class="fas fa-comment"></i> Observaciones</th>
            <th><i class="fas fa-check-circle"></i> Realizado</th>
          </tr>
        </thead>
        <tbody id="sabanaTableBody"></tbody>
      </table>
    `;
  }

  const tbodyActual = document.getElementById('sabanaTableBody');
  if (!tbodyActual) {
    console.error('⚠️ No se encontró elemento sabanaTableBody');
    return;
  }

  tbodyActual.innerHTML = '';

  if (!items || items.length === 0) {
    tbodyActual.innerHTML =
      '<tr><td colspan="7" class="sabana-placeholder">No hay registros en esta sábana.</td></tr>';
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
      tr.dataset.itemId = item.id;

      tr.addEventListener('click', (event) => {
        if (archivada) return;
        if (event.target.closest('input, textarea, button, select, label, a'))
          return;
        const checkbox = tr.querySelector('input.checkbox-sabana');
        if (!checkbox || checkbox.checked) {
          tbodyActual.dataset.pendingSabanaClick = '';
          tr.classList.remove('sabana-pending');
          return;
        }
        const pendingId = tbodyActual.dataset.pendingSabanaClick || '';
        if (pendingId === String(item.id)) {
          tbodyActual.dataset.pendingSabanaClick = '';
          tr.classList.remove('sabana-pending');
          checkbox.checked = true;
          toggleRealizadoSabana(item.id, true);
          return;
        }
        const previousPending = tbodyActual.querySelector('tr.sabana-pending');
        if (previousPending) {
          previousPending.classList.remove('sabana-pending');
        }
        tbodyActual.dataset.pendingSabanaClick = String(item.id);
        tr.classList.add('sabana-pending');
      });

      const readonly = archivada ? 'disabled' : '';
      const readonlyClass = archivada ? 'readonly' : '';

      // Formatear fecha programada con función de timezone
      const fechaProgramada = formatFechaCorta(item.fecha_programada);

      tr.innerHTML = `
                <td data-label="Edificio">${item.edificio || 'Sin edificio'}</td>
                <td data-label="Habitación"><strong>${item.habitacion}</strong></td>
                <td data-label="Límite">${fechaProgramada}</td>
                <td data-label="Realizada">
                    ${item.fecha_realizado
          ? `<span class="fecha-realizado">${formatFechaHora(item.fecha_realizado)}</span>`
          : '<span style="color: #999;">-</span>'
        }
                </td>
                <td data-label="Responsable">
                    ${item.responsable_nombre || item.responsable
          ? `<span class="responsable-nombre">${item.responsable_nombre || item.responsable}</span>`
          : '<span style="color: #999;">-</span>'
        }
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

    tbodyActual.appendChild(fragment);
    currentIndex = endIndex;

    console.log(`📦 Renderizados ${endIndex}/${items.length} items`);

    // Si quedan más filas, preparar el sentinel para lazy loading
    if (currentIndex < items.length) {
      const sentinel = document.createElement('tr');
      sentinel.className = 'lazy-sentinel';
      sentinel.innerHTML =
        '<td colspan="7" style="height: 1px; padding: 0;"></td>';
      tbodyActual.appendChild(sentinel);

      // Observer para cargar siguiente lote
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              observer.unobserve(entry.target);
              entry.target.remove();
              renderBatch();
            }
          });
        },
        {
          rootMargin: '100px', // Cargar cuando esté a 100px de ser visible
        }
      );

      observer.observe(sentinel);
    } else {
      console.log('✅ Todas las filas renderizadas');
    }
  };

  // Iniciar el primer lote
  renderBatch();

  actualizarContadoresSabana(items);
}

function toggleEdificioVisibilidad(headerElement, edificio) {
  const column = headerElement.closest('.sabana-edificio-column');
  if (!column) return;

  const isShowingNoChecked = column.classList.toggle('showing-no-checked');
  headerElement.classList.toggle('active', isShowingNoChecked);

  if (isShowingNoChecked) {
    // Mostrar solo items NO checked de este edificio
    // Obtener items no realizados de currentSabanaItems para este edificio
    const itemsNoChecked = currentSabanaItems.filter(
      (item) =>
        (item.edificio || 'Sin edificio') === edificio && !item.realizado
    );

    // Ordenar por número de habitación
    itemsNoChecked.sort((a, b) => {
      const numA = parseInt(a.habitacion.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.habitacion.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    console.log(
      `🔍 Edificio ${edificio}: mostrando ${itemsNoChecked.length} items no checked`
    );

    // Limpiar cards existentes pero mantener el header
    const existingCards = column.querySelectorAll('.sabana-habitacion-card');
    existingCards.forEach((card) => card.remove());

    // Remover sentinel existente si hay uno
    const existingSentinel = column.querySelector('.lazy-sentinel-edificio');
    if (existingSentinel) existingSentinel.remove();

    // Guardar referencia a los items originales del edificio para restaurar después
    column.dataset.showingNoChecked = 'true';

    // Renderizar items no checked con lazy loading
    renderCardsInColumnLazy(column, itemsNoChecked, 0);

    // Actualizar texto del header para indicar filtro activo
    headerElement.textContent = `${edificio} (${itemsNoChecked.length})`;
  } else {
    // Restaurar vista completa: mostrar todos los items del edificio
    column.dataset.showingNoChecked = 'false';

    // Obtener TODOS los items de este edificio
    const todosItems = currentSabanaItems.filter(
      (item) => (item.edificio || 'Sin edificio') === edificio
    );

    // Ordenar por número de habitación
    todosItems.sort((a, b) => {
      const numA = parseInt(a.habitacion.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.habitacion.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    console.log(
      `🔄 Edificio ${edificio}: restaurando vista completa (${todosItems.length} items)`
    );

    // Limpiar cards existentes
    const existingCards = column.querySelectorAll('.sabana-habitacion-card');
    existingCards.forEach((card) => card.remove());

    // Remover sentinel existente
    const existingSentinel = column.querySelector('.lazy-sentinel-edificio');
    if (existingSentinel) existingSentinel.remove();

    // Renderizar todos los items con lazy loading
    renderCardsInColumnLazy(column, todosItems, 0);

    // Restaurar texto del header
    headerElement.textContent = edificio;
  }
}

function getEdificioHeader(edificio) {
  const headers = document.querySelectorAll('.sabana-edificio-header');
  for (const header of headers) {
    if (header.dataset.edificio === edificio) return header;
  }
  return null;
}

function getEdificioColumn(edificio) {
  const columns = document.querySelectorAll('.sabana-edificio-column');
  for (const column of columns) {
    if (column.dataset.edificio === edificio) return column;
  }
  return null;
}

function updateEdificioNoCheckedCount(edificio) {
  const column = getEdificioColumn(edificio);
  if (!column || !column.classList.contains('showing-no-checked')) return;

  const header = getEdificioHeader(edificio);
  if (!header) return;

  const totalNoChecked = currentSabanaItems.filter(
    (item) => (item.edificio || 'Sin edificio') === edificio && !item.realizado
  ).length;

  header.textContent = `${edificio} (${totalNoChecked})`;
}

/**
 * Renderiza cards en una columna específica con lazy loading
 * @param {HTMLElement} column - Columna donde renderizar
 * @param {Array} items - Items a renderizar
 * @param {number} startIndex - Índice desde donde empezar
 */
function renderCardsInColumnLazy(column, items, startIndex) {
  const CARDS_PER_BATCH = 8;
  const archivada = currentSabanaArchivada;

  let currentIndex = startIndex;

  const renderBatch = () => {
    const endIndex = Math.min(currentIndex + CARDS_PER_BATCH, items.length);

    for (let i = currentIndex; i < endIndex; i++) {
      const item = items[i];
      const card = createSabanaCard(item, archivada);
      column.appendChild(card);
    }

    currentIndex = endIndex;

    console.log(
      `📦 Columna: renderizadas ${currentIndex}/${items.length} cards`
    );

    // Si quedan más cards, crear sentinel para lazy loading
    if (currentIndex < items.length) {
      const sentinel = document.createElement('div');
      sentinel.className = 'lazy-sentinel-edificio';
      sentinel.style.cssText = 'height: 1px; width: 100%; opacity: 0;';
      column.appendChild(sentinel);

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              observer.unobserve(entry.target);
              entry.target.remove();
              renderBatch();
            }
          });
        },
        {
          rootMargin: '200px',
        }
      );

      observer.observe(sentinel);
    } else {
      console.log(`✅ Columna: todas las cards renderizadas`);
    }
  };

  // Iniciar primer lote
  renderBatch();
}

/**
 * Crea un elemento card para un item de sábana
 * @param {Object} item - Item de la sábana
 * @param {boolean} archivada - Si la sábana está archivada
 * @returns {HTMLElement} Elemento card
 */
function createSabanaCard(item, archivada) {
  const readonly = archivada ? 'disabled' : '';
  const readonlyClass = archivada ? 'readonly' : '';
  const estadoClass = item.realizado ? 'realizada' : 'pendiente';

  const fechaRealizado = item.fecha_realizado
    ? formatFechaHora(item.fecha_realizado)
    : null;
  const responsable = item.responsable_nombre || item.responsable || '';

  const card = document.createElement('div');
  card.className = `sabana-habitacion-card ${estadoClass}`;
  card.dataset.itemId = item.id;
  card.onclick = (e) => handleCardClick(e, item.id, archivada);

  card.innerHTML = `
    <div class="sabana-habitacion-numero">
      <span>${item.habitacion}</span>
      <input 
        type="checkbox" 
        class="sabana-habitacion-checkbox" 
        data-item-id="${item.id}"
        ${item.realizado ? 'checked' : ''}
        ${readonly}
        onchange="toggleRealizadoSabana(${item.id}, this.checked)"
      />
    </div>
    ${responsable
      ? `<div class="sabana-habitacion-responsable">
          <i class="fas fa-user"></i>
          ${responsable}
        </div>`
      : ''
    }
    ${fechaRealizado
      ? `<div class="sabana-habitacion-fecha-realizado">
          <i class="fas fa-check"></i>
          ${fechaRealizado}
        </div>`
      : ''
    }
    <textarea 
      class="sabana-habitacion-observaciones ${readonlyClass}" 
      data-item-id="${item.id}"
      placeholder="${archivada ? 'Sin observaciones' : 'Observaciones...'}"
      ${readonly}
      onchange="guardarObservacionSabana(${item.id}, this.value)"
    >${item.observaciones || ''}</textarea>
  `;

  return card;
}

function handleCardClick(event, itemId, archivada) {
  if (archivada) return;

  // Ignorar clicks en inputs, textareas, checkboxes
  if (
    event.target.closest(
      'input[type="checkbox"], textarea, input, button, select, label, a'
    )
  ) {
    return;
  }

  const card = document.querySelector(
    `.sabana-habitacion-card[data-item-id="${itemId}"]`
  );
  const checkbox = card?.querySelector('.sabana-habitacion-checkbox');

  if (!card || !checkbox || checkbox.checked) {
    // Si ya está checked, remover pending state
    if (card) {
      card.classList.remove('sabana-pending');
    }
    return;
  }

  // Verificar si ya está en estado pending
  const isPending = card.classList.contains('sabana-pending');

  if (isPending) {
    // Segundo click: marcar como realizado
    card.classList.remove('sabana-pending');
    checkbox.checked = true;
    toggleRealizadoSabana(itemId, true);
  } else {
    // Primer click: marcar como pending (gris)
    // Remover pending de otras cards
    document
      .querySelectorAll('.sabana-habitacion-card.sabana-pending')
      .forEach((c) => {
        c.classList.remove('sabana-pending');
      });
    card.classList.add('sabana-pending');
  }
}

function renderSabanaColumns(items, archivada = false) {
  const wrapper = document.querySelector('.filtros-table-wrapper');
  if (!wrapper) return;

  // Agrupar items por edificio
  const itemsPorEdificio = {};
  items.forEach((item) => {
    const edificio = item.edificio || 'Sin edificio';
    if (!itemsPorEdificio[edificio]) {
      itemsPorEdificio[edificio] = [];
    }
    itemsPorEdificio[edificio].push(item);
  });

  // Ordenar edificios alfabéticamente
  const edificiosOrdenados = Object.keys(itemsPorEdificio).sort();

  // Ordenar habitaciones dentro de cada edificio
  edificiosOrdenados.forEach((edificio) => {
    itemsPorEdificio[edificio].sort((a, b) => {
      const numA = parseInt(a.habitacion.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.habitacion.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  });

  // Crear el contenedor principal
  const layoutContainer = document.createElement('div');
  layoutContainer.className = 'sabana-layout-columns';

  // Crear columnas por edificio
  const columnsByEdificio = {};
  const indexByEdificio = {};
  edificiosOrdenados.forEach((edificio) => {
    const column = document.createElement('div');
    column.className = 'sabana-edificio-column';

    const header = document.createElement('div');
    header.className = 'sabana-edificio-header';
    header.textContent = edificio;
    header.title = 'Click para mostrar/ocultar habitaciones';
    header.dataset.edificio = edificio;
    header.onclick = (e) => toggleEdificioVisibilidad(e.target, edificio);

    column.dataset.edificio = edificio;
    column.appendChild(header);
    columnsByEdificio[edificio] = column;
    indexByEdificio[edificio] = 0;
    layoutContainer.appendChild(column);
  });

  // Calcular total de cards
  const totalCards = items.length;
  let renderedCards = 0;

  // Renderizar cards por fila (una de cada edificio a la vez)
  const ROWS_PER_BATCH = 8;

  const renderBatch = () => {
    let rowsRendered = 0;
    let hasMoreCards = true;

    while (rowsRendered < ROWS_PER_BATCH && hasMoreCards) {
      hasMoreCards = false;

      // Renderizar una card de cada edificio
      edificiosOrdenados.forEach((edificio) => {
        const habitaciones = itemsPorEdificio[edificio];
        const idx = indexByEdificio[edificio];

        if (idx < habitaciones.length) {
          hasMoreCards = true;
          const item = habitaciones[idx];
          const column = columnsByEdificio[edificio];

          const readonly = archivada ? 'disabled' : '';
          const readonlyClass = archivada ? 'readonly' : '';
          const estadoClass = item.realizado ? 'realizada' : 'pendiente';

          const fechaRealizado = item.fecha_realizado
            ? formatFechaHora(item.fecha_realizado)
            : null;
          const responsable = item.responsable_nombre || item.responsable || '';

          const card = document.createElement('div');
          card.className = `sabana-habitacion-card ${estadoClass} ${readonlyClass}`;
          card.dataset.itemId = item.id;
          card.onclick = (e) => handleCardClick(e, item.id, archivada);

          card.innerHTML = `
            <div class="sabana-habitacion-numero">
              <span>${item.habitacion}</span>
              <input 
                type="checkbox" 
                class="sabana-habitacion-checkbox" 
                data-item-id="${item.id}"
                ${item.realizado ? 'checked' : ''}
                ${readonly}
                onchange="toggleRealizadoSabana(${item.id}, this.checked)"
              />
            </div>
            ${responsable
              ? `<div class="sabana-habitacion-responsable">
                  <i class="fas fa-user"></i>
                  ${responsable}
                </div>`
              : ''
            }
            ${fechaRealizado
              ? `<div class="sabana-habitacion-fecha-realizado">
                  <i class="fas fa-check"></i>
                  ${fechaRealizado}
                </div>`
              : ''
            }
            <textarea 
              class="sabana-habitacion-observaciones ${readonlyClass}" 
              data-item-id="${item.id}"
              placeholder="${archivada ? 'Sin observaciones' : 'Observaciones...'}"
              ${readonly}
              onchange="guardarObservacionSabana(${item.id}, this.value)"
            >${item.observaciones || ''}</textarea>
          `;

          column.appendChild(card);
          indexByEdificio[edificio]++;
          renderedCards++;
        }
      });

      rowsRendered++;
    }

    console.log(
      `📦 Renderizadas ${renderedCards}/${totalCards} cards en columnas`
    );

    // Si quedan más cards, crear sentinel para lazy loading
    if (hasMoreCards) {
      const sentinel = document.createElement('div');
      sentinel.className = 'lazy-sentinel-columns';
      sentinel.style.cssText =
        'height: 1px; width: 100%; grid-column: 1 / -1; opacity: 0;';
      layoutContainer.appendChild(sentinel);

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              observer.unobserve(entry.target);
              entry.target.remove();
              renderBatch();
            }
          });
        },
        {
          rootMargin: '200px',
        }
      );

      observer.observe(sentinel);
    } else {
      console.log('✅ Todas las cards renderizadas en columnas');
    }
  };

  // Reemplazar el contenido del wrapper
  wrapper.innerHTML = '';
  wrapper.appendChild(layoutContainer);

  // Iniciar el primer lote
  renderBatch();

  actualizarContadoresSabana(items);
}

function actualizarContadoresSabana(items) {
  const completados = items.filter((item) => item.realizado).length;
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
  const edificios = [
    ...new Set(items.map((item) => item.edificio).filter(Boolean)),
  ].sort();

  selectEdificio.innerHTML = '<option value="">Todos los edificios</option>';
  edificios.forEach((edificio) => {
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
  items.forEach((item) => {
    const responsable = item.responsable_nombre || item.responsable;
    if (responsable && responsable.trim()) {
      personalSet.add(responsable.trim());
    }
  });

  const personalUnico = Array.from(personalSet).sort();

  selectPersonal.innerHTML = '<option value="">Todo el personal</option>';
  personalUnico.forEach((personal) => {
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

    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ realizado }),
      }
    );

    if (!response.ok) {
      throw new Error('Error al actualizar item');
    }

    const data = await response.json();
    console.log('✅ Item actualizado:', data);

    if (data.success && data.item) {
      const localItem = currentSabanaItems.find((i) => i.id === itemId);
      if (localItem) {
        localItem.realizado = realizado;
        localItem.fecha_realizado = data.item.fecha_realizado;
        if (data.item.responsable) {
          localItem.responsable = data.item.responsable;
          localItem.responsable_nombre = data.item.responsable;
          localItem.usuario_responsable_id = data.item.usuario_responsable_id;
        } else {
          localItem.responsable = null;
          localItem.responsable_nombre = null;
          localItem.usuario_responsable_id = null;
        }

        updateEdificioNoCheckedCount(localItem.edificio || 'Sin edificio');
      }

      // Actualizar UI en layout de columnas (desktop)
      const card = document.querySelector(
        `.sabana-habitacion-card[data-item-id="${itemId}"]`
      );
      if (card) {
        card.classList.toggle('realizada', realizado);
        card.classList.toggle('pendiente', !realizado);

        // Actualizar responsable
        const responsableDiv = card.querySelector(
          '.sabana-habitacion-responsable'
        );
        if (data.item.responsable) {
          if (responsableDiv) {
            responsableDiv.innerHTML = `<i class="fas fa-user"></i> ${data.item.responsable}`;
          } else {
            // Insertar después del div de número de habitación
            const numeroDiv = card.querySelector('.sabana-habitacion-numero');
            if (numeroDiv) {
              numeroDiv.insertAdjacentHTML(
                'afterend',
                `<div class="sabana-habitacion-responsable"><i class="fas fa-user"></i> ${data.item.responsable}</div>`
              );
            }
          }
        } else if (responsableDiv) {
          responsableDiv.remove();
        }

        // Actualizar fecha realizado
        const fechaRealizadoDiv = card.querySelector(
          '.sabana-habitacion-fecha-realizado'
        );
        if (data.item.fecha_realizado) {
          const fechaRealizado = formatFechaHora(data.item.fecha_realizado);
          if (fechaRealizadoDiv) {
            fechaRealizadoDiv.innerHTML = `<i class="fas fa-check"></i> ${fechaRealizado}`;
          } else {
            const textarea = card.querySelector(
              '.sabana-habitacion-observaciones'
            );
            if (textarea) {
              textarea.insertAdjacentHTML(
                'beforebegin',
                `<div class="sabana-habitacion-fecha-realizado"><i class="fas fa-check"></i> ${fechaRealizado}</div>`
              );
            }
          }
        } else if (fechaRealizadoDiv) {
          fechaRealizadoDiv.remove();
        }

        poblarPersonalSabana(currentSabanaItems);
      }

      // Actualizar UI en tabla (mobile)
      const checkbox = document.querySelector(
        `input.checkbox-sabana[data-item-id="${itemId}"]`
      );
      if (checkbox) {
        const row = checkbox.closest('tr');
        if (row) {
          const fechaRealizadoCell = row.cells[3];
          if (fechaRealizadoCell) {
            const fechaRealizado = data.item.fecha_realizado
              ? new Date(data.item.fecha_realizado).toLocaleString('es-MX', {
                dateStyle: 'short',
                timeStyle: 'short',
              })
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
          } else {
            const responsableCell = row.cells[4];
            if (responsableCell) {
              responsableCell.innerHTML = '<span style="color: #999;">-</span>';
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

    mostrarMensajeSabana(
      realizado ? 'Marcado como realizado' : 'Marcado como pendiente',
      'success'
    );
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

    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ observaciones }),
      }
    );

    if (!response.ok) {
      throw new Error('Error al guardar observación');
    }

    const data = await response.json();
    console.log('✅ Observación guardada:', data);

    if (data.success && data.item) {
      const localItem = currentSabanaItems.find((i) => i.id === itemId);
      if (localItem) {
        localItem.observaciones = observaciones;
        if (data.item.responsable) {
          localItem.responsable = data.item.responsable;
          localItem.usuario_responsable_id = data.item.usuario_responsable_id;
        }
      }

      // Actualizar UI en layout de columnas (desktop)
      const card = document.querySelector(
        `.sabana-habitacion-card[data-item-id="${itemId}"]`
      );
      if (card) {
        const responsableDiv = card.querySelector(
          '.sabana-habitacion-responsable'
        );
        if (data.item.responsable) {
          if (responsableDiv) {
            responsableDiv.innerHTML = `<i class="fas fa-user"></i> ${data.item.responsable}`;
          } else {
            // Insertar después del div de número de habitación
            const numeroDiv = card.querySelector('.sabana-habitacion-numero');
            if (numeroDiv) {
              numeroDiv.insertAdjacentHTML(
                'afterend',
                `<div class="sabana-habitacion-responsable"><i class="fas fa-user"></i> ${data.item.responsable}</div>`
              );
            }
          }
        } else if (responsableDiv) {
          responsableDiv.remove();
        }
        poblarPersonalSabana(currentSabanaItems);
      }

      // Actualizar UI en tabla (mobile)
      const inputObservacion = document.querySelector(
        `input[data-item-id="${itemId}"]`
      );
      if (inputObservacion) {
        const row = inputObservacion.closest('tr');
        if (row) {
          const responsableCell = row.cells[4];
          if (responsableCell) {
            if (data.item.responsable) {
              responsableCell.innerHTML = `<span class="responsable-nombre">${data.item.responsable}</span>`;
            } else {
              responsableCell.innerHTML = '<span style="color: #999;">-</span>';
            }
            responsableCell.style.backgroundColor = 'rgba(76, 84, 76, 0.12)';
            setTimeout(() => {
              responsableCell.style.backgroundColor = '';
            }, 1000);
          }
        }
      }

      poblarPersonalSabana(currentSabanaItems);
    }
  } catch (error) {
    console.error('❌ Error guardando observación:', error);
    mostrarMensajeSabana('Error al guardar observación', 'error');
  }
}

function filterSabana() {
  const searchTerm =
    document.getElementById('buscarSabana')?.value.toLowerCase() || '';
  const edificioFiltro =
    document.getElementById('filtroEdificioSabana')?.value || '';
  const estadoFiltro =
    document.getElementById('filtroEstadoServicio')?.value || '';
  const personalFiltro =
    document.getElementById('filtroPersonalSabana')?.value || '';
  const observacionesFiltro =
    document.getElementById('filtroObservacionesSabana')?.value.toLowerCase() ||
    '';

  if (!currentSabanaItems || currentSabanaItems.length === 0) return;

  let itemsFiltrados = currentSabanaItems;

  // Filtrar por edificio
  if (edificioFiltro) {
    itemsFiltrados = itemsFiltrados.filter(
      (item) => item.edificio === edificioFiltro
    );
  }

  // Filtrar por estado
  if (estadoFiltro === 'realizado') {
    itemsFiltrados = itemsFiltrados.filter((item) => item.realizado);
  } else if (estadoFiltro === 'pendiente') {
    itemsFiltrados = itemsFiltrados.filter((item) => !item.realizado);
  }

  // Filtrar por personal
  if (personalFiltro) {
    itemsFiltrados = itemsFiltrados.filter((item) => {
      const responsable = item.responsable_nombre || item.responsable;
      return responsable && responsable.trim() === personalFiltro;
    });
  }

  // Filtrar por observaciones
  if (observacionesFiltro) {
    itemsFiltrados = itemsFiltrados.filter((item) =>
      item.observaciones?.toLowerCase().includes(observacionesFiltro)
    );
  }

  // Filtrar por búsqueda de texto
  if (searchTerm) {
    itemsFiltrados = itemsFiltrados.filter(
      (item) =>
        item.habitacion?.toLowerCase().includes(searchTerm) ||
        item.edificio?.toLowerCase().includes(searchTerm) ||
        item.observaciones?.toLowerCase().includes(searchTerm) ||
        item.responsable?.toLowerCase().includes(searchTerm) ||
        item.responsable_nombre?.toLowerCase().includes(searchTerm)
    );
  }

  renderSabanaTable(itemsFiltrados, currentSabanaArchivada);

  console.log(
    `🔍 Filtro aplicado: ${itemsFiltrados.length}/${currentSabanaItems.length} items mostrados`
  );
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
          const tipoExistente = document.querySelector(
            'input[name="tipoServicio"][value="existente"]'
          );
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

  // Inicializar date picker con fecha de hoy en formato local
  const inputFechaProgramada = document.getElementById(
    'inputFechaProgramadaSabana'
  );
  if (inputFechaProgramada) {
    const hoy = new Date();
    const fechaLocal = hoy.toISOString().split('T')[0]; // YYYY-MM-DD format
    inputFechaProgramada.value = fechaLocal;
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

  // Auto-focus en el campo de nombre
  setTimeout(() => {
    const inputNombre = document.getElementById('inputNombreServicio');
    if (inputNombre) {
      inputNombre.focus();
    }
  }, 100);
}

async function cargarServiciosExistentes() {
  try {
    console.log('📋 Cargando servicios existentes para el select...');

    const selectServicio = document.getElementById('selectServicioNuevaSabana');
    console.log(
      `🔍 Buscando elemento selectServicioNuevaSabana: ${selectServicio ? 'ENCONTRADO' : 'NO ENCONTRADO'}`
    );

    if (!selectServicio) {
      console.error(
        '❌ NO SE ENCONTRÓ el elemento selectServicioNuevaSabana en el DOM'
      );
      console.error(
        '📝 Elementos SELECT en la página:',
        document.querySelectorAll('select').length
      );
      document.querySelectorAll('select').forEach((sel, idx) => {
        console.log(
          `   Select ${idx}: id="${sel.id}", class="${sel.className}"`
        );
      });
      return;
    }

    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas?includeArchivadas=false`
    );

    if (!response.ok) {
      throw new Error('Error al cargar servicios');
    }

    const sabanas = await response.json();
    console.log('📦 Sábanas obtenidas:', sabanas.length);
    console.log(
      '📝 Muestra de sábanas:',
      sabanas.slice(0, 3).map((s) => ({
        id: s.id,
        nombre: s.nombre,
        servicio_nombre: s.servicio_nombre,
        archivada: s.archivada,
      }))
    );

    // Extraer nombres únicos de servicios (sin fechas)
    const nombresSet = new Set();
    sabanas.forEach((s) => {
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
    console.log(
      `✅ Servicios únicos encontrados: ${nombresUnicos.length}`,
      nombresUnicos
    );

    selectServicio.innerHTML =
      '<option value="">-- Selecciona un servicio --</option>';

    nombresUnicos.forEach((nombre) => {
      const option = document.createElement('option');
      option.value = nombre; // Usar el nombre como valor
      option.textContent = nombre;
      selectServicio.appendChild(option);
    });

    console.log(
      `✅ Select actualizado: ${selectServicio.options.length} opciones totales (incluyendo placeholder)`
    );
    console.log(
      '📊 Contenido del select:',
      Array.from(selectServicio.options).map((o) => `"${o.textContent}"`)
    );
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
  const tipoNuevo = document.querySelector(
    'input[name="tipoServicio"][value="nuevo"]'
  );
  const contenedorNuevo = document.getElementById('contenedorNuevoServicio');
  const contenedorExistente = document.getElementById(
    'contenedorServicioExistente'
  );

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

  const btnConfirmarNuevaSabana = document.getElementById(
    'btn-confirmar-nueva-sabana'
  );
  const originalText = btnConfirmarNuevaSabana?.textContent || 'Confirmar';

  // Verificar qué tipo de servicio está seleccionado ANTES de cambiar el botón
  const tipoServicioRadio = document.querySelector(
    'input[name="tipoServicio"]:checked'
  );
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
  const inputFechaProgramada = document.getElementById(
    'inputFechaProgramadaSabana'
  );
  const fechaProgramada = inputFechaProgramada?.value || null; // YYYY-MM-DD
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
        const archivarResponse = await fetchWithAuth(
          `${API_BASE_URL}/api/sabanas/${currentSabanaId}/archivar`,
          {
            method: 'POST',
          }
        );

        if (!archivarResponse.ok) {
          const errorData = await archivarResponse.json().catch(() => ({}));
          console.error('❌ Error archivando:', errorData);
          throw new Error(
            'Error al archivar sábana actual: ' +
            (errorData.error || 'desconocido')
          );
        }

        const archivarResultado = await archivarResponse.json();
        console.log(
          '✅ Sábana actual archivada exitosamente:',
          archivarResultado
        );
      } catch (archivarError) {
        console.error('❌ Error en proceso de archivado:', archivarError);
        // Preguntar si desea continuar
        if (
          !window.electronSafeConfirm(
            'Error al archivar la sábana actual. ¿Desea continuar creando la nueva sábana?'
          )
        ) {
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
        console.log(
          'ℹ️ Switch de archivar desactivado - no se archivará la actual'
        );
      }
    }

    // 2. Crear nueva sábana
    console.log('📝 Creando nueva sábana:', nombreServicio);

    const servicioId =
      'servicio_' +
      nombreServicio
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .substring(0, 30) +
      '_' +
      Date.now();

    const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas`, {
      method: 'POST',
      body: JSON.stringify({
        nombre: nombreServicio,
        servicio_id: servicioId,
        servicio_nombre: nombreServicio,
        notas: notas,
        fecha_programada: fechaProgramada,
      }),
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

    const mensajeArchivado = debeArchivarActual
      ? ' (sábana anterior archivada)'
      : '';
    mostrarMensajeSabana(
      `Sábana "${nombreServicio}" creada exitosamente${mensajeArchivado}`,
      'success'
    );
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

  // Mostrar modal inmediatamente con skeleton loading
  listaContainer.innerHTML = `
    <div class="historial-skeleton">
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-short"></div>
        <div class="skeleton-line skeleton-medium"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-short"></div>
        <div class="skeleton-line skeleton-medium"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-short"></div>
        <div class="skeleton-line skeleton-medium"></div>
      </div>
    </div>
  `;

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

  try {
    console.log('📚 Cargando historial de sábanas archivadas...');
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas/archivadas`
    );

    if (!response.ok) {
      throw new Error('Error al cargar historial');
    }

    const historial = await response.json();
    console.log('📚 Sábanas archivadas recibidas:', historial.length);

    if (historial.length === 0) {
      listaContainer.innerHTML = `
        <div class="historial-vacio">
          <i class="fas fa-archive"></i>
          <p>Aún no hay sábanas archivadas.</p>
        </div>
      `;
    } else {
      const puedeDesarchivar = esAdminUsuarioActualSabana();
      listaContainer.innerHTML = historial
        .map((entry) => {
          const fechaArchivado = formatFechaCorta(
            entry.fecha_archivado || entry.fecha_creacion
          );
          const porcentaje = parseFloat(entry.progreso_porcentaje) || 0;
          const creadorInfo = entry.creador_nombre
            ? `<span class="historial-creador"><i class="fas fa-user"></i> ${Object.assign(document.createElement('div'), { textContent: entry.creador_nombre }).innerHTML}</span>`
            : '';
          const notasInfo = entry.notas
            ? `<div class="historial-notas"><i class="fas fa-sticky-note"></i> ${Object.assign(document.createElement('div'), { textContent: entry.notas.substring(0, 60) + (entry.notas.length > 60 ? '...' : '') }).innerHTML}</div>`
            : '';
          const actionButton = puedeDesarchivar
            ? `<button class="historial-item-action" onclick="event.stopPropagation(); desarchivarSabana(${entry.id}, '${entry.nombre.replace(/'/g, "\\'")}');" title="Desarchivar sábana">
                <i class="fas fa-box-open"></i>
              </button>`
            : '';

          const fechaLimiteInfo = entry.fecha_limite
            ? `<span class="historial-fecha-limite"><i class="fas fa-clock"></i> Límite: ${formatFechaCorta(entry.fecha_limite)}</span>`
            : '';

          return `
            <div class="historial-item">
              <div class="historial-item-content" onclick="cargarSabanaDesdeHistorial(${entry.id})">
                <div class="historial-item-header">
                  <h3>${Object.assign(document.createElement('div'), { textContent: entry.nombre }).innerHTML}</h3>
                  <span class="historial-fecha">${fechaArchivado}</span>
                </div>
                ${creadorInfo}
                ${fechaLimiteInfo}
                ${notasInfo}
                <div class="historial-stats">
                  <span class="stat">
                    <i class="fas fa-check-circle"></i> ${entry.items_completados || 0}/${entry.total_items || 0} completados
                  </span>
                  <span class="stat-progreso">${porcentaje.toFixed(0)}%</span>
                </div>
              </div>
              ${actionButton}
            </div>
          `;
        })
        .join('');
    }
  } catch (error) {
    console.error('❌ Error cargando historial:', error);
    listaContainer.innerHTML = `
      <div class="historial-vacio historial-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error al cargar el historial.</p>
      </div>
    `;
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

  if (
    !window.electronSafeConfirm(
      '¿Archivar esta sábana? Ya no podrá ser editada.'
    )
  ) {
    return;
  }

  try {
    console.log('📦 Iniciando archivado de sábana ID:', currentSabanaId);

    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas/${currentSabanaId}/archivar`,
      {
        method: 'POST',
      }
    );

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
    console.log(
      '🔍 Verificando estado: currentSabanaArchivada =',
      currentSabanaArchivada
    );

    mostrarMensajeSabana(
      'Sábana archivada exitosamente - Solo lectura. Puedes verla en el historial.',
      'success'
    );
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
  const nombreSabanaOriginal =
    selectServicio?.options[selectServicio.selectedIndex]?.text ||
    'esta sábana';

  // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
  const nombreSabana = nombreSabanaOriginal
    .replace(/\s*\(archivada\)\s*/gi, '')
    .trim();

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
    document.addEventListener(
      'keydown',
      cerrarModalConfirmarEliminarEscHandler
    );
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
    document.removeEventListener(
      'keydown',
      cerrarModalConfirmarEliminarEscHandler
    );
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
  const placeholderConfirmar = document.getElementById(
    'placeholderConfirmarEliminar'
  );
  const placeholderNombre = document.getElementById('placeholderNombreSabana');
  const btnConfirmar = document.getElementById('btnConfirmarEliminar');

  const selectServicio = document.getElementById('filtroServicioActual');
  const nombreSabanaOriginal =
    selectServicio?.options[selectServicio.selectedIndex]?.text ||
    'esta sábana';

  // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
  const nombreSabana = nombreSabanaOriginal
    .replace(/\s*\(archivada\)\s*/gi, '')
    .trim();

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
    btnConfirmar.innerHTML =
      '<i class="fas fa-trash-alt"></i> Eliminar permanentemente';
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
    placeholder.style.color = ''; // Restaurar color normal
  } else if (inputValue.length === 0) {
    // Si está vacío, mostrar el texto completo desde el inicio
    placeholder.textContent = targetText;
    placeholder.style.left = '12px';
    placeholder.style.color = ''; // Color normal
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
    document.removeEventListener(
      'keydown',
      cerrarModalValidarEliminarEscHandler
    );
    cerrarModalValidarEliminarEscHandler = null;
  }
}

function validarCamposEliminar() {
  const inputConfirmar = document.getElementById('inputConfirmarEliminar');
  const inputNombre = document.getElementById('inputNombreSabanaEliminar');
  const btnConfirmar = document.getElementById('btnConfirmarEliminar');
  const hintNombre = document.getElementById('hintNombreSabana');

  const selectServicio = document.getElementById('filtroServicioActual');
  const nombreSabanaOriginal =
    selectServicio?.options[selectServicio.selectedIndex]?.text || '';

  // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
  const nombreSabanaReal = nombreSabanaOriginal
    .replace(/\s*\(archivada\)\s*/gi, '')
    .trim();

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
      hintNombre.textContent = 'Debe coincidir exactamente (Sensible a mayúsculas y minúsculas)';
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
  const nombreSabanaOriginal =
    selectServicio?.options[selectServicio.selectedIndex]?.text ||
    'esta sábana';

  // Limpiar el nombre de la sábana (quitar "(archivada)" y espacios extra)
  const nombreSabana = nombreSabanaOriginal
    .replace(/\s*\(archivada\)\s*/gi, '')
    .trim();

  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
  }

  try {
    console.log('🗑️ Iniciando eliminación de sábana ID:', currentSabanaId);

    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas/${currentSabanaId}`,
      {
        method: 'DELETE',
      }
    );

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

    const wrapper = document.querySelector('.filtros-table-wrapper');
    if (wrapper) {
      wrapper.innerHTML = `
        <table class="filtros-table">
          <thead>
            <tr>
              <th><i class="fas fa-building"></i> Edificio</th>
              <th><i class="fas fa-door-closed"></i> Habitación</th>
              <th><i class="fas fa-calendar"></i> Fecha Límite</th>
              <th><i class="fas fa-calendar-check"></i> Fecha Realizado</th>
              <th><i class="fas fa-user"></i> Responsable</th>
              <th style="text-align: center"><i class="fas fa-comment"></i> Observaciones</th>
              <th><i class="fas fa-check-circle"></i> Realizado</th>
            </tr>
          </thead>
          <tbody id="sabanaTableBody">
            <tr><td colspan="7" class="sabana-placeholder">Selecciona o crea una sábana para comenzar.</td></tr>
          </tbody>
        </table>
      `;
    }

    const tituloEl = document.getElementById('tituloServicioActual');
    if (tituloEl) {
      tituloEl.innerHTML =
        '<span class="sabana-placeholder-title">Selecciona una sábana</span>';
    }
    configurarSabanaIdTab(null);

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

    const notasContainer = document.getElementById('sabanaNotasContainer');
    if (notasContainer) notasContainer.style.display = 'none';
    const creadorContainer = document.getElementById('sabanaCreadorInfo');
    if (creadorContainer) creadorContainer.style.display = 'none';

    // Cerrar modal y restaurar botón
    cerrarModalValidarEliminar();

    // Restaurar botón
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.innerHTML =
        '<i class="fas fa-trash-alt"></i> Eliminar permanentemente';
    }

    mostrarMensajeSabana(
      `Sábana "${nombreSabana}" eliminada exitosamente`,
      'success'
    );
  } catch (error) {
    console.error('❌ Error eliminando sábana:', error);

    // Restaurar botón
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.innerHTML =
        '<i class="fas fa-trash-alt"></i> Eliminar permanentemente';
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
    electronSafeAlert(
      'No tienes permisos para exportar. Esta función es solo para supervisores y administradores.'
    );
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
  console.log(
    '📦 Items disponibles en currentSabanaItems:',
    currentSabanaItems.length
  );

  // Usar los datos que ya están cargados en memoria
  if (!currentSabanaItems || currentSabanaItems.length === 0) {
    console.warn('⚠️ Sin datos para exportar');
    electronSafeAlert(
      'No hay datos para exportar. Por favor, carga una sábana primero.'
    );
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
      const tituloText = document.getElementById(
        'tituloServicioActual'
      ).innerText;
      // Extraer el nombre entre "de" y posibles etiquetas de estado
      const match = tituloText.match(/de\s+(.+?)(?:\s+Archivada|$)/i);
      nombreSabana = match ? match[1].trim() : 'sabana';
    }

    console.log('📝 Generando CSV con', currentSabanaItems.length, 'items');

    let csv =
      'Edificio,Habitación,Fecha Límite,Fecha Realizado,Responsable,Observaciones,Realizado\n';

    currentSabanaItems.forEach((item, index) => {
      const fechaProgramada = item.fecha_programada
        ? new Date(item.fecha_programada).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        : '-';

      const fechaRealizado = item.fecha_realizado
        ? new Date(item.fecha_realizado).toLocaleString('es-MX', {
          dateStyle: 'short',
          timeStyle: 'short',
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
          observaciones: item.observaciones?.substring(0, 20),
        });
      }
    });

    console.log(
      '✅ CSV generado:',
      csv.split('\n').length - 1,
      'líneas (incluyendo header)'
    );
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
    mostrarMensajeSabana(
      `Sábana exportada: ${currentSabanaItems.length} registros`,
      'success'
    );
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

  const btnConfirmarNuevaSabana = document.getElementById(
    'btn-confirmar-nueva-sabana'
  );
  const originalText = btnConfirmarNuevaSabana?.textContent || 'Confirmar';

  // Desactivar botón y mostrar spinner
  if (btnConfirmarNuevaSabana) {
    btnConfirmarNuevaSabana.disabled = true;
    btnConfirmarNuevaSabana.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creando...`;
  }

  try {
    console.log('📝 Creando sábana para servicio:', servicioId);

    // Extraer el nombre del servicio del ID (remover prefijos y sufijos timestamp)
    let servicioNombre = servicioId
      .replace(/^(servicio_|custom_)/, '')
      .replace(/_\d+$/, '');
    servicioNombre = servicioNombre.replace(/_/g, ' ');
    servicioNombre =
      servicioNombre.charAt(0).toUpperCase() + servicioNombre.slice(1);

    const nombreSabana = `${servicioNombre}`;

    const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas`, {
      method: 'POST',
      body: JSON.stringify({
        servicio_id: servicioId,
        servicio_nombre: servicioNombre,
        nombre: nombreSabana,
      }),
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
      console.log(
        '🔄 Agregando nueva opción al select con ID:',
        nuevaSabana.id
      );
      const option = document.createElement('option');
      option.value = nuevaSabana.id;
      option.textContent = `${nuevaSabana.nombre}`;
      option.dataset.archivada = nuevaSabana.archivada || false;
      selectServicio.appendChild(option);

      // Seleccionar la nueva opción
      selectServicio.value = nuevaSabana.id;
      console.log(
        '✅ Select actualizado, valor seleccionado:',
        selectServicio.value
      );
    } else {
      console.error('⚠️ No se encontró el select filtroServicioActual');
    }

    // Delay para asegurar que el DOM se actualice
    await new Promise((resolve) => setTimeout(resolve, 100));

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

  const btnConfirmarNuevaSabana = document.getElementById(
    'btn-confirmar-nueva-sabana'
  );
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
        const archivarResponse = await fetchWithAuth(
          `${API_BASE_URL}/api/sabanas/${currentSabanaId}/archivar`,
          {
            method: 'POST',
          }
        );

        if (!archivarResponse.ok) {
          const errorData = await archivarResponse.json().catch(() => ({}));
          console.error('❌ Error archivando:', errorData);
          throw new Error(
            'Error al archivar sábana actual: ' +
            (errorData.error || 'desconocido')
          );
        }

        const archivarResultado = await archivarResponse.json();
        console.log(
          '✅ Sábana actual archivada exitosamente:',
          archivarResultado
        );
      } catch (archivarError) {
        console.error('❌ Error en proceso de archivado:', archivarError);
        // Preguntar si desea continuar
        if (
          !window.electronSafeConfirm(
            'Error al archivar la sábana actual. ¿Desea continuar creando la nueva sábana?'
          )
        ) {
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
        console.log(
          'ℹ️ Switch de archivar desactivado - no se archivará la actual'
        );
      }
    }

    // 2. Crear nueva sábana
    const inputNotas = document.getElementById('inputNotasSabana');
    const notas = inputNotas?.value.trim() || null;
    const inputFechaProgramada = document.getElementById(
      'inputFechaProgramadaSabana'
    );
    const fechaProgramada = inputFechaProgramada?.value || null; // YYYY-MM-DD

    const servicioId =
      'servicio_' +
      nombreServicio
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .substring(0, 30) +
      '_' +
      Date.now();

    const response = await fetchWithAuth(`${API_BASE_URL}/api/sabanas`, {
      method: 'POST',
      body: JSON.stringify({
        nombre: nombreServicio,
        servicio_id: servicioId,
        servicio_nombre: nombreServicio,
        notas: notas,
        fecha_programada: fechaProgramada,
      }),
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
      console.log(
        '✅ Select actualizado, valor seleccionado:',
        selectServicio.value
      );
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

    const mensajeArchivado =
      debeArchivarActual && currentSabanaId
        ? ' (sábana anterior archivada)'
        : '';
    mostrarMensajeSabana(
      `Sábana "${nombreServicio}" creada exitosamente${mensajeArchivado}`,
      'success'
    );
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

// Listener para cambiar layout al redimensionar
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (currentSabanaItems && currentSabanaItems.length > 0) {
      renderSabanaTable(currentSabanaItems, currentSabanaArchivada);
    }
  }, 300);
});

async function desarchivarSabana(sabanaId, nombreSabana) {
  if (!esAdminUsuarioActualSabana()) {
    electronSafeAlert('Solo los administradores pueden desarchivar sábanas');
    return;
  }

  if (
    !window.electronSafeConfirm(
      `¿Desarchivar la sábana "${nombreSabana}"? Volverá a estar disponible para edición.`
    )
  ) {
    return;
  }

  try {
    console.log('📦 Desarchivando sábana ID:', sabanaId);

    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/sabanas/${sabanaId}/desarchivar`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error del servidor:', errorData);
      throw new Error(errorData.error || 'Error al desarchivar sábana');
    }

    const resultado = await response.json();
    console.log('Sábana desarchivada:', resultado);

    await cargarListaSabanas();

    cerrarModalHistorial();

    const selectServicio = document.getElementById('filtroServicioActual');
    if (selectServicio) {
      selectServicio.value = sabanaId;
      await cambiarServicioActual(sabanaId);
    }

    mostrarMensajeSabana(
      `Sábana "${nombreSabana}" desarchivada exitosamente. Ahora puedes editarla.`,
      'success'
    );
  } catch (error) {
    console.error('Error desarchivando sábana:', error);
    electronSafeAlert('Error al desarchivar la sábana: ' + error.message);
  }
}

function iniciarEdicionNombreSabana(sabanaId, nombreActual) {
  if (currentSabanaArchivada) {
    mostrarMensajeSabana('No se puede editar una sábana archivada', 'error');
    return;
  }

  const spanNombre = document.querySelector('.sabana-nombre-editable');
  if (!spanNombre) return;

  const inputEdit = document.createElement('input');
  inputEdit.type = 'text';
  inputEdit.value = nombreActual;
  inputEdit.className = 'sabana-nombre-input';
  inputEdit.dataset.sabanaId = sabanaId;
  inputEdit.dataset.nombreOriginal = nombreActual;

  spanNombre.replaceWith(inputEdit);
  inputEdit.focus();
  inputEdit.select();

  let guardandoNombre = false;
  const guardarNombre = async () => {
    if (guardandoNombre) return;
    const nuevoNombre = inputEdit.value.trim();
    if (!nuevoNombre || nuevoNombre === nombreActual) {
      const spanRestore = document.createElement('span');
      spanRestore.className = 'sabana-nombre-editable';
      spanRestore.textContent = nombreActual;
      spanRestore.onclick = () =>
        iniciarEdicionNombreSabana(sabanaId, nombreActual);
      spanRestore.title = 'Click para editar';
      inputEdit.replaceWith(spanRestore);
      return;
    }

    guardandoNombre = true;
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/sabanas/${sabanaId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nombre: nuevoNombre }),
        }
      );

      if (!response.ok) throw new Error('Error al actualizar nombre');

      const resultado = await response.json();
      currentSabanaNombre = nuevoNombre;

      const spanNew = document.createElement('span');
      spanNew.className = 'sabana-nombre-editable';
      spanNew.textContent = nuevoNombre;
      spanNew.onclick = () => iniciarEdicionNombreSabana(sabanaId, nuevoNombre);
      spanNew.title = 'Click para editar';
      inputEdit.replaceWith(spanNew);

      await cargarListaSabanas();

      const selectServicio = document.getElementById('filtroServicioActual');
      if (selectServicio) {
        const optionActual = Array.from(selectServicio.options).find(
          (opt) => opt.value === String(sabanaId)
        );
        if (optionActual) {
          optionActual.textContent = nuevoNombre;
        }
        selectServicio.value = sabanaId;
      }

      mostrarMensajeSabana('Nombre actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error actualizando nombre:', error);
      mostrarMensajeSabana('Error al actualizar el nombre', 'error');
      const spanRestore = document.createElement('span');
      spanRestore.className = 'sabana-nombre-editable';
      spanRestore.textContent = nombreActual;
      spanRestore.onclick = () =>
        iniciarEdicionNombreSabana(sabanaId, nombreActual);
      spanRestore.title = 'Click para editar';
      inputEdit.replaceWith(spanRestore);
    } finally {
      guardandoNombre = false;
    }
  };

  inputEdit.addEventListener('blur', guardarNombre);
  inputEdit.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardarNombre();
    }
  });
  inputEdit.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const spanRestore = document.createElement('span');
      spanRestore.className = 'sabana-nombre-editable';
      spanRestore.textContent = nombreActual;
      spanRestore.onclick = () =>
        iniciarEdicionNombreSabana(sabanaId, nombreActual);
      spanRestore.title = 'Click para editar';
      inputEdit.replaceWith(spanRestore);
    }
  });
}

function iniciarEdicionNotasSabana(sabanaId, notasActuales) {
  if (currentSabanaArchivada) {
    mostrarMensajeSabana('No se puede editar una sábana archivada', 'error');
    return;
  }

  const spanNotas = document.getElementById('sabanaNotasTexto');
  if (!spanNotas) return;

  const inputEdit = document.createElement('input');
  inputEdit.type = 'text';
  inputEdit.value = notasActuales;
  inputEdit.className = 'sabana-notas-input';
  inputEdit.dataset.sabanaId = sabanaId;
  inputEdit.dataset.notasOriginal = notasActuales;
  inputEdit.placeholder = 'Escribe una nota...';

  spanNotas.replaceWith(inputEdit);
  inputEdit.focus();
  inputEdit.select();

  // Helper para restaurar el span con el estado visual correcto
  const restaurarSpanNotas = (texto) => {
    const tieneNotas = texto.length > 0;
    const spanRestore = document.createElement('span');
    spanRestore.id = 'sabanaNotasTexto';
    spanRestore.title = 'Click para editar notas';
    spanRestore.onclick = () => iniciarEdicionNotasSabana(sabanaId, texto);

    const notasContainer = document.getElementById('sabanaNotasContainer');

    if (tieneNotas) {
      spanRestore.className = 'sabana-notas-editable';
      spanRestore.textContent = texto;
      if (notasContainer) notasContainer.classList.remove('is-empty');
    } else {
      spanRestore.className = 'sabana-notas-editable sabana-notas-placeholder';
      spanRestore.textContent = 'Agregar nota...';
      if (notasContainer) notasContainer.classList.add('is-empty');
    }

    inputEdit.replaceWith(spanRestore);

    const notasIcon = document.querySelector('#sabanaNotasContainer i');
    if (notasIcon) {
      notasIcon.onclick = () => iniciarEdicionNotasSabana(sabanaId, texto);
    }

    if (notasContainer) {
      notasContainer.onclick = () => {
        const inputActual = notasContainer.querySelector('.sabana-notas-input');
        if (inputActual) {
          inputActual.focus();
          inputActual.select();
          return;
        }
        iniciarEdicionNotasSabana(sabanaId, texto);
      };
    }
  };

  let guardandoNotas = false;
  const guardarNotas = async () => {
    if (guardandoNotas) return;
    const nuevasNotas = inputEdit.value.trim();

    // Si no cambió, restaurar
    if (nuevasNotas === notasActuales) {
      restaurarSpanNotas(notasActuales);
      return;
    }

    guardandoNotas = true;
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/sabanas/${sabanaId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notas: nuevasNotas }),
        }
      );

      if (!response.ok) throw new Error('Error al actualizar notas');

      restaurarSpanNotas(nuevasNotas);
      mostrarMensajeSabana('Notas actualizadas correctamente', 'success');
    } catch (error) {
      console.error('Error actualizando notas:', error);
      mostrarMensajeSabana('Error al actualizar las notas', 'error');
      restaurarSpanNotas(notasActuales);
    } finally {
      guardandoNotas = false;
    }
  };

  inputEdit.addEventListener('blur', guardarNotas);
  inputEdit.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardarNotas();
    }
  });
  inputEdit.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      restaurarSpanNotas(notasActuales);
    }
  });
}

window.desarchivarSabana = desarchivarSabana;
window.iniciarEdicionNombreSabana = iniciarEdicionNombreSabana;
window.iniciarEdicionNotasSabana = iniciarEdicionNotasSabana;
window.toggleEdificioVisibilidad = toggleEdificioVisibilidad;
window.handleCardClick = handleCardClick;
window.cargarListaSabanas = cargarListaSabanas;
window.cambiarServicioActual = cambiarServicioActual;
window.seleccionarSabanaPorId = seleccionarSabanaPorId;
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
  eliminarSabana: typeof window.eliminarSabana,
});
