/**
 * Módulo de gestión de Espacios Comunes
 * Carga, muestra y gestiona la interacción con espacios comunes
 */

// Variables locales del módulo
let espaciosComunes = [];
let mantenimientosEspacios = [];
let espaciosComunesCargados = false; // Flag para controlar si ya se cargaron los datos
// Paginación local
const ESPACIOS_POR_PAGINA = 10;
let espaciosComunesFiltradosActual = [];
let paginaActualEspacios = 1;
let totalPaginasEspacios = 1;

/**
 * Mostrar skeletons instantáneos al cambiar al tab de espacios
 */
function mostrarSkeletonsEspacios() {
  const listaEspacios = document.getElementById('listaEspaciosComunes');
  if (!listaEspacios) return;

  listaEspacios.style.display = 'grid';
  listaEspacios.innerHTML = '';

  // Crear 4 skeletons iniciales para dar feedback inmediato
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 4; i++) {
    const li = document.createElement('li');
    li.className = 'cuarto cuarto-lazy';
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
    fragment.appendChild(li);
  }
  listaEspacios.appendChild(fragment);
}

/**
 * Cargar datos de espacios comunes desde API
 */
async function cargarEspaciosComunes() {
  try {
    console.log('📥 [ESPACIOS] Cargando datos de espacios comunes...');

    // Usar window.API_BASE_URL para asegurar acceso a la variable global
    const baseUrl = window.API_BASE_URL || '';

    const [espaciosResponse, mantenimientosResponse] = await Promise.all([
      fetch(`${baseUrl}/api/espacios-comunes`),
      fetch(`${baseUrl}/api/mantenimientos/espacios`),
    ]);

    if (espaciosResponse.ok && mantenimientosResponse.ok) {
      espaciosComunes = await espaciosResponse.json();
      mantenimientosEspacios = await mantenimientosResponse.json();
      console.log(
        `✅ [ESPACIOS] Datos cargados: ${espaciosComunes.length} espacios, ${mantenimientosEspacios.length} mantenimientos`
      );

      // Actualizar AppState global si existe
      if (window.appLoaderState) {
        window.appLoaderState.espaciosComunes = espaciosComunes;
        window.appLoaderState.mantenimientosEspacios = mantenimientosEspacios;
      }

      // Actualizar AppState global
      if (window.AppState) {
        window.AppState.espaciosComunes = espaciosComunes;
        window.AppState.mantenimientosEspacios = mantenimientosEspacios;
      }

      // Poblar filtro de edificios para espacios comunes
      if (window.poblarFiltroEdificiosEspacios) {
        window.poblarFiltroEdificiosEspacios();
      }

      // Sincronizar filtros y mostrar
      sincronizarEspaciosFiltrados();
      mostrarEspaciosComunes();

      // Marcar como cargados por primera vez
      espaciosComunesCargados = true;

      // Cargar alertas de espacios si la función existe
      if (window.cargarAlertasEspacios) {
        await window.cargarAlertasEspacios();
      }
    } else {
      console.error('❌ [ESPACIOS] Error cargando datos');
      espaciosComunes = [];
      mantenimientosEspacios = [];
      mostrarEspaciosComunes();
    }
  } catch (error) {
    console.error('❌ [ESPACIOS] Error:', error);
    espaciosComunes = [];
    mantenimientosEspacios = [];
    mostrarEspaciosComunes();
  }
}

/**
 * Sincronizar estado base de espacios filtrados y paginación
 */
function sincronizarEspaciosFiltrados(mantenerPagina = false) {
  espaciosComunesFiltradosActual = Array.isArray(espaciosComunes)
    ? [...espaciosComunes]
    : [];
  totalPaginasEspacios =
    espaciosComunesFiltradosActual.length > 0
      ? Math.ceil(espaciosComunesFiltradosActual.length / ESPACIOS_POR_PAGINA)
      : 1;

  if (!mantenerPagina || paginaActualEspacios > totalPaginasEspacios) {
    paginaActualEspacios = espaciosComunesFiltradosActual.length > 0 ? 1 : 1;
  }
}

/**
 * Actualizar estadísticas de espacios comunes
 */
function actualizarEstadisticasEspacios() {
  const total = espaciosComunes.length;
  const disponibles = espaciosComunes.filter(
    (e) => e.estado === 'disponible'
  ).length;
  const ocupados = espaciosComunes.filter((e) => e.estado === 'ocupado').length;
  const mantenimiento = espaciosComunes.filter(
    (e) => e.estado === 'mantenimiento'
  ).length;
  const fueraServicio = espaciosComunes.filter(
    (e) => e.estado === 'fuera_servicio'
  ).length;

  // Update DOM elements
  const elDisponibles = document.getElementById('espaciosStatsDisponibles');
  const elOcupados = document.getElementById('espaciosStatsOcupados');
  const elMantenimiento = document.getElementById('espaciosStatsMantenimiento');
  const elFuera = document.getElementById('espaciosStatsFuera');
  const elCaption = document.getElementById('espaciosStatsCaption');
  const elHighlight = document.getElementById('espaciosStatsHighlight');
  const elProgress = document.getElementById('espaciosStatsProgress');

  if (elDisponibles) elDisponibles.textContent = disponibles;
  if (elOcupados) elOcupados.textContent = ocupados;
  if (elMantenimiento) elMantenimiento.textContent = mantenimiento;
  if (elFuera) elFuera.textContent = fueraServicio;

  if (elCaption) elCaption.textContent = `Total de espacios: ${total}`;
  if (elHighlight)
    elHighlight.textContent = `Disponibles: ${disponibles} · Ocupados: ${ocupados} · En mantto.: ${mantenimiento}`;

  // Calculate progress percentage (e.g., available / total)
  if (elProgress && total > 0) {
    const percent = Math.round((disponibles / total) * 100);
    elProgress.style.setProperty('--progress-value', `${percent}%`);
    elProgress.setAttribute('data-percent', `${percent}%`);
  } else if (elProgress) {
    elProgress.style.setProperty('--progress-value', `0%`);
    elProgress.setAttribute('data-percent', `0%`);
  }
}

/**
 * Mostrar espacios comunes con paginación y lazy loading
 */
function mostrarEspaciosComunes() {
  actualizarEstadisticasEspacios();
  console.log('=== MOSTRANDO ESPACIOS COMUNES ===');

  const listaEspacios = document.getElementById('listaEspaciosComunes');
  const mensajeNoResultados = document.getElementById('mensajeNoEspacios');

  if (!listaEspacios) {
    console.error('Elemento listaEspaciosComunes no encontrado');
    return;
  }

  if (mensajeNoResultados) {
    mensajeNoResultados.style.display = 'none';
  }

  // Usar espacios filtrados si existen, sino todos
  const espaciosParaMostrar =
    espaciosComunesFiltradosActual.length > 0
      ? espaciosComunesFiltradosActual
      : espaciosComunes;
  const totalEspacios = espaciosParaMostrar.length;

  if (totalEspacios === 0) {
    console.warn('No hay espacios para mostrar');
    listaEspacios.style.display = 'grid';
    listaEspacios.innerHTML =
      '<li class="mensaje-no-cuartos">No hay espacios comunes registrados en el sistema.</li>';
    renderizarPaginacionEspacios(0);
    // Actualizar estadísticas incluso si no hay espacios
    actualizarEstadisticasEspacios();
    return;
  }

  totalPaginasEspacios = Math.max(
    1,
    Math.ceil(totalEspacios / ESPACIOS_POR_PAGINA)
  );

  if (paginaActualEspacios > totalPaginasEspacios) {
    paginaActualEspacios = totalPaginasEspacios;
  }
  if (paginaActualEspacios < 1) {
    paginaActualEspacios = 1;
  }

  const inicio = (paginaActualEspacios - 1) * ESPACIOS_POR_PAGINA;
  const fin = Math.min(inicio + ESPACIOS_POR_PAGINA, totalEspacios);
  const espaciosPagina = espaciosComunesFiltradosActual.slice(inicio, fin);

  console.log(
    `Espacios comunes: ${totalEspacios} | Página ${paginaActualEspacios}/${totalPaginasEspacios}`
  );

  listaEspacios.style.display = 'grid';
  listaEspacios.innerHTML = '';

  // Crear caché de mantenimientos por espacio
  window.mantenimientosPorEspacio = new Map();
  if (mantenimientosEspacios && mantenimientosEspacios.length > 0) {
    mantenimientosEspacios.forEach((m) => {
      if (!window.mantenimientosPorEspacio.has(m.espacio_comun_id)) {
        window.mantenimientosPorEspacio.set(m.espacio_comun_id, []);
      }
      window.mantenimientosPorEspacio.get(m.espacio_comun_id).push(m);
    });
    console.log(
      `📦 Caché de mantenimientos de espacios: ${window.mantenimientosPorEspacio.size} espacios con servicios`
    );
  }

  // Lazy loading: crear cards con skeletons
  espaciosPagina.forEach((espacio, index) => {
    try {
      const li = document.createElement('li');
      li.className = 'cuarto cuarto-lazy';
      li.id = `espacio-${espacio.id}`;
      li.setAttribute('loading', 'lazy');

      // Guardar datos en dataset
      li.dataset.espacioId = espacio.id;
      li.dataset.nombre = espacio.nombre || '';
      li.dataset.edificioNombre = espacio.edificio_nombre || '';
      li.dataset.estado = espacio.estado || 'disponible';
      li.dataset.tipo = espacio.tipo || '';

      // Card placeholder con skeleton
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

      listaEspacios.appendChild(li);
    } catch (error) {
      console.error(`Error procesando espacio ${index}:`, error, espacio);
    }
  });

  // IntersectionObserver para lazy loading
  if (window.espacioObserver) {
    window.espacioObserver.disconnect();
  }
  window.espacioObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const li = entry.target;
          if (!li.dataset.loaded) {
            li.dataset.loaded = 'true';
            const espacioId = parseInt(li.dataset.espacioId);
            const espacio = espaciosComunes.find((e) => e.id === espacioId);

            if (espacio) {
              cargarContenidoEspacio(li, espacio);
            }

            observer.unobserve(li);
          }
        }
      });
    },
    {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
    }
  );

  // Observar todas las cards
  document.querySelectorAll('.cuarto-lazy').forEach((card) => {
    window.espacioObserver.observe(card);
  });

  renderizarPaginacionEspacios(totalEspacios);

  // Actualizar estadísticas
  actualizarEstadisticasEspacios();

  console.log('=== FIN MOSTRANDO ESPACIOS COMUNES ===');
}

/**
 * Obtener icono según tipo y nombre del espacio
 */
function obtenerIconoEspacio(espacio) {
  const nombreLower = espacio.nombre.toLowerCase().trim();
  const tipo = espacio.tipo ? espacio.tipo.toLowerCase().trim() : '';

  // Mapeo de iconos por palabras clave específicas (orden de prioridad)
  // Las coincidencias más específicas deben ir primero
  const iconosPorPalabraClave = [
    // Piscinas y albercas (prioridad alta para evitar confusión con gimnasio)
    {
      keywords: ['alberca', 'piscina', 'pool', 'swimming'],
      icono: 'fa-swimming-pool',
    },

    // Spa y wellness
    {
      keywords: [
        'spa',
        'wellness',
        'masaje',
        'relajacion',
        'temazcal',
        'jacuzzi',
      ],
      icono: 'fa-spa',
    },

    // Gimnasio y fitness
    {
      keywords: ['gimnasio', 'gym', 'fitness', 'vitality'],
      icono: 'fa-dumbbell',
    },

    // Restaurantes y comida
    {
      keywords: [
        'restaurante',
        'cocina',
        'comedor',
        'buffet',
        'desayuno',
        'carniceria',
        'pasteleria',
        'chocolateria',
        'panaderia',
        'linea caliente',
        'linea fria',
        'cafe des artistes',
        'auka deli',
        'niparaya',
        'kaha',
      ],
      icono: 'fa-utensils',
    },

    // Bares y bebidas
    { keywords: ['bar', 'cocktail', 'lounge'], icono: 'fa-cocktail' },

    // Eventos y salones
    {
      keywords: [
        'salon',
        'conferencia',
        'banquete',
        'reunion',
        'junta',
        'kumat',
        'cine',
        'sala vip',
        'sala de juntas',
        'matku',
        'board room',
        'eventos',
      ],
      icono: 'fa-users',
    },

    // Lavandería
    {
      keywords: ['lavanderia', 'lavandería', 'roperia', 'vestidor', 'locker'],
      icono: 'fa-tshirt',
    },

    // Estacionamiento
    { keywords: ['estacionamiento', 'parking', 'parqueo'], icono: 'fa-car' },

    // Jardines y exteriores
    {
      keywords: [
        'jardin',
        'jardín',
        'jardines',
        'terraza',
        'huerto',
        'jardinera',
        'espejo de agua',
        'duela',
      ],
      icono: 'fa-tree',
    },

    // Playground y áreas de juego
    {
      keywords: ['playground', 'área de juegos', 'area de juegos', 'game room'],
      icono: 'fa-child',
    },

    // Business center y oficinas
    {
      keywords: [
        'business center',
        'centro de negocios',
        'oficina',
        'consultorio',
      ],
      icono: 'fa-laptop',
    },

    // Tiendas
    { keywords: ['tienda', 'gift shop', 'boutique'], icono: 'fa-shopping-bag' },

    // Biblioteca
    { keywords: ['biblioteca'], icono: 'fa-book' },

    // Baños y servicios sanitarios
    { keywords: ['bano', 'baño', 'sanitario', 'wc'], icono: 'fa-shower' },

    // Servicios técnicos
    {
      keywords: [
        'cuarto de filtro',
        'carcamo',
        'tanque',
        'cisterna',
        'sala de maquinas',
        'chiller',
        'calentador',
        'bomba',
        'osmos',
        'planta',
        'subestacion',
        'banco de baterias',
        'site sistemas',
      ],
      icono: 'fa-cog',
    },

    // Almacenes y bodegas
    { keywords: ['bodega', 'almacen', 'almacén'], icono: 'fa-archive' },

    // Lobby y recepción
    { keywords: ['lobby', 'recepcion', 'recepción'], icono: 'fa-building' },

    // Pasillos y áreas comunes
    { keywords: ['pasillo', 'corredor', 'hall'], icono: 'fa-door-open' },
  ];

  // Buscar coincidencia por palabra clave (prioridad a coincidencias más específicas)
  for (const { keywords, icono } of iconosPorPalabraClave) {
    for (const keyword of keywords) {
      if (nombreLower.includes(keyword)) {
        return icono;
      }
    }
  }

  // Mapeo por tipo si no se encontró por nombre (fallback)
  const iconosPorTipo = {
    recreativo: 'fa-swimming-pool', // Cambiado de dumbbell a swimming-pool como default
    restaurante: 'fa-utensils',
    servicio: 'fa-concierge-bell',
    eventos: 'fa-users',
    exterior: 'fa-tree',
    comun: 'fa-building',
  };

  return iconosPorTipo[tipo] || 'fa-building';
}

/**
 * Ajustar tamaño de título según longitud del texto
 */
function ajustarTamanoTitulo(elemento) {
  if (!elemento) return;

  const longitud = elemento.textContent.length;

  elemento.classList.remove(
    'titulo-largo',
    'titulo-muy-largo',
    'titulo-extra-largo'
  );

  if (longitud > 35) {
    elemento.classList.add('titulo-extra-largo');
  } else if (longitud > 25) {
    elemento.classList.add('titulo-muy-largo');
  } else if (longitud > 18) {
    elemento.classList.add('titulo-largo');
  }
}

/**
 * Cargar contenido de un espacio (llamado por IntersectionObserver)
 */
function cargarContenidoEspacio(li, espacio) {
  const mantenimientosEspacio =
    window.mantenimientosPorEspacio.get(espacio.id) || [];
  const { estadoBadgeClass, estadoIcon, estadoText } =
    getEstadoBadgeInfoEspacio(espacio.estado);
  const iconoEspacio = obtenerIconoEspacio(espacio);

  li.className = 'habitacion-card';
  li.innerHTML = `
        <div class="habitacion-header">
            <div class="habitacion-titulo">
                    <i class="habitacion-icon fas ${iconoEspacio}"></i>
                <div>
                    <div class="habitacion-nombre">${window.escapeHtml ? window.escapeHtml(espacio.nombre) : espacio.nombre}</div>
                    <div class="habitacion-edificio">
                        <i class="fas fa-building"></i> ${window.escapeHtml ? window.escapeHtml(espacio.edificio_nombre || 'Sin edificio') : espacio.edificio_nombre || 'Sin edificio'}
                    </div>
                </div>
            </div>
            <div class="habitacion-estado-badge estado-dropdown ${estadoBadgeClass}" 
                 data-espacio-id="${espacio.id}" 
                 data-estado="${espacio.estado}"
                 onclick="toggleEstadoDropdown(this, ${espacio.id}, true)">
                <i class="fas ${estadoIcon}"></i> ${estadoText}
                <div class="estado-dropdown-menu" style="display: none;">
                    <div class="estado-dropdown-item estado-disponible" data-estado="disponible" onclick="event.stopPropagation(); seleccionarEstadoDropdown(${espacio.id}, 'disponible', this, true)">
                        <i class="fas fa-check-circle"></i> Disponible
                    </div>
                    <div class="estado-dropdown-item estado-mantenimiento" data-estado="mantenimiento" onclick="event.stopPropagation(); seleccionarEstadoDropdown(${espacio.id}, 'mantenimiento', this, true)">
                        <i class="fas fa-tools"></i> Mantenimiento en curso
                    </div>
                    <div class="estado-dropdown-item estado-fuera-servicio" data-estado="fuera_servicio" onclick="event.stopPropagation(); seleccionarEstadoDropdown(${espacio.id}, 'fuera_servicio', this, true)">
                        <i class="fas fa-ban"></i> Fuera de Servicio
                    </div>
                </div>
            </div>
        </div>
        <div class="habitacion-servicios" id="servicios-espacio-${espacio.id}">
            ${window.generarServiciosHTML ? window.generarServiciosHTML(mantenimientosEspacio, espacio.id, false, true, window.AppState?.filtroServicioEspacios || null) : ''}
        </div>

        <div class="estado-selector-inline" style="display: none" id="estado-selector-inline-espacio-${espacio.id}">
            <label class="estado-label-inline">Estado del Espacio</label>
            <div class="estado-pills-inline">
                <button type="button" ${estadoText === 'Disponible' ? 'disabled' : ''} class="estado-pill-inline ${estadoText === 'Disponible' ? 'estado-pill-inline-activo' : ''} disponible" data-estado="disponible" onclick="seleccionarEstadoEspacioInline(${espacio.id}, 'disponible', this)">
                    <span class="pill-dot-inline"></span>
                    <span class="pill-text-inline">Disp.</span>
                </button>
                <button type="button" ${estadoText === 'Mantenimiento en curso' ? 'disabled' : ''} class="estado-pill-inline ${estadoText === 'Mantenimiento en curso' ? 'estado-pill-inline-activo' : ''} mantenimiento" data-estado="mantenimiento" onclick="seleccionarEstadoEspacioInline(${espacio.id}, 'mantenimiento', this)">
                    <span class="pill-dot-inline"></span>
                    <span class="pill-text-inline">Mant.</span>
                </button>
                <button type="button" ${estadoText === 'Fuera de Servicio' ? 'disabled' : ''} class="estado-pill-inline ${estadoText === 'Fuera de Servicio' ? 'estado-pill-inline-activo' : ''} fuera-servicio" data-estado="fuera_servicio" onclick="seleccionarEstadoEspacioInline(${espacio.id}, 'fuera_servicio', this)">
                    <span class="pill-dot-inline"></span>
                    <span class="pill-text-inline">Fuera</span>
                </button>
            </div>
        </div>

        <div class="habitacion-acciones">
            ${
              mantenimientosEspacio.length > 0
                ? `<button class="habitacion-boton boton-secundario" onclick="toggleModoEdicionEspacio(${espacio.id})" id="btn-editar-espacio-${espacio.id}">
                <i class="fas fa-edit"></i> Editar
            </button>`
                : ''
            }
            <button class="habitacion-boton boton-principal" onclick="seleccionarEspacioComun(${espacio.id})">
                <i class="fas fa-plus"></i> Agregar Servicio
            </button>
        </div>
    `;

  const nombreElemento = li.querySelector('.habitacion-nombre');
  if (nombreElemento) {
    ajustarTamanoTitulo(nombreElemento);
  }
}

/**
 * Obtener información de badge de estado para espacios
 */
function getEstadoBadgeInfoEspacio(estado) {
  const estadoMap = {
    disponible: {
      class: 'estado-disponible',
      icon: 'fa-check-circle',
      text: 'Disponible',
    },
    ocupado: { class: 'estado-ocupado', icon: 'fa-user', text: 'Ocupado' },
    mantenimiento: {
      class: 'estado-mantenimiento',
      icon: 'fa-tools',
      text: 'Mantenimiento en curso',
    },
    fuera_servicio: {
      class: 'estado-fuera-servicio',
      icon: 'fa-ban',
      text: 'Fuera de Servicio',
    },
  };

  const info = estadoMap[estado] || estadoMap['disponible'];
  return {
    estadoBadgeClass: info.class,
    estadoIcon: info.icon,
    estadoText: info.text,
  };
}

/**
 * Renderizar paginación de espacios comunes
 */
function renderizarPaginacionEspacios(totalEspacios) {
  const contenedorPaginacion = document.getElementById('espaciosPagination');
  if (!contenedorPaginacion) {
    return;
  }

  if (!totalEspacios || totalEspacios <= ESPACIOS_POR_PAGINA) {
    contenedorPaginacion.innerHTML = '';
    contenedorPaginacion.style.display = 'none';
    return;
  }

  const totalPaginasCalculadas = Math.max(
    1,
    Math.ceil(totalEspacios / ESPACIOS_POR_PAGINA)
  );
  totalPaginasEspacios = totalPaginasCalculadas;

  if (paginaActualEspacios > totalPaginasEspacios) {
    paginaActualEspacios = totalPaginasEspacios;
  }

  const opciones = Array.from({ length: totalPaginasCalculadas }, (_, idx) => {
    const pagina = idx + 1;
    const seleccionado = pagina === paginaActualEspacios ? ' selected' : '';
    return `<option value="${pagina}"${seleccionado}>${pagina}</option>`;
  }).join('');

  const totalLabel =
    totalEspacios === 1 ? '1 espacio' : `${totalEspacios} espacios`;

  contenedorPaginacion.style.display = 'flex';
  contenedorPaginacion.innerHTML = `
    <button class="pagination-btn" data-action="prev" ${paginaActualEspacios === 1 ? 'disabled' : ''} aria-label="Página anterior de espacios">
        <i class="fas fa-chevron-left"></i>
        <span>Anterior</span>
    </button>
    <div class="pagination-info">
        <span>Página</span>
        <select class="pagination-select" id="espaciosPaginationSelect" aria-label="Seleccionar página de espacios">
            ${opciones}
        </select>
        <span>de ${totalPaginasCalculadas}</span>
    </div>
    <button class="pagination-btn" data-action="next" ${paginaActualEspacios === totalPaginasEspacios ? 'disabled' : ''} aria-label="Página siguiente de espacios">
        <span>Siguiente</span>
        <i class="fas fa-chevron-right"></i>
    </button>
    <span class="pagination-total">${totalLabel}</span>
`;

  const prevBtn = contenedorPaginacion.querySelector('[data-action="prev"]');
  const nextBtn = contenedorPaginacion.querySelector('[data-action="next"]');
  const selectorPaginas = contenedorPaginacion.querySelector(
    '#espaciosPaginationSelect'
  );

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (paginaActualEspacios > 1) {
        paginaActualEspacios--;
        mostrarEspaciosComunes();
        setTimeout(() => desplazarListaEspaciosAlInicio(), 100);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (paginaActualEspacios < totalPaginasEspacios) {
        paginaActualEspacios++;
        mostrarEspaciosComunes();
        setTimeout(() => desplazarListaEspaciosAlInicio(), 100);
      }
    });
  }

  if (selectorPaginas) {
    selectorPaginas.addEventListener('change', (event) => {
      const nuevaPagina = parseInt(event.target.value, 10);
      if (
        !Number.isNaN(nuevaPagina) &&
        nuevaPagina >= 1 &&
        nuevaPagina <= totalPaginasEspacios
      ) {
        paginaActualEspacios = nuevaPagina;
        mostrarEspaciosComunes();
        setTimeout(() => desplazarListaEspaciosAlInicio(), 100);
      }
    });
  }
}

/**
 * Scroll al inicio de la lista de espacios
 */
function desplazarListaEspaciosAlInicio() {
  const tabEspacios = document.getElementById('tab-espacios');
  if (tabEspacios) {
    const rect = tabEspacios.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetY = rect.top + scrollTop;
    const headerOffset = window.innerWidth <= 768 ? 72 : 0;
    const finalY = Math.max(0, targetY - headerOffset);

    window.scrollTo({
      top: finalY,
      behavior: 'smooth',
    });
  }
}

/**
 * Toggle modo edición para espacio común
 */
function toggleModoEdicionEspacio(espacioId) {
  const contenedorServicios = document.getElementById(
    `servicios-espacio-${espacioId}`
  );
  const botonEditar = document.getElementById(
    `btn-editar-espacio-${espacioId}`
  );
  const contenedorEstadoSelector = document.getElementById(
    `estado-selector-inline-espacio-${espacioId}`
  );
  const liElement =
    document.querySelector(`li[data-espacio-id="${espacioId}"]`) ||
    document.getElementById(`servicios-espacio-${espacioId}`)?.closest('li');
  const badgeDropdown = liElement?.querySelector('.estado-dropdown');

  if (!contenedorServicios || !botonEditar) return;

  const enModoEdicion = botonEditar.classList.contains('modo-edicion-activo');

  if (enModoEdicion) {
    // Desactivar modo edición
    botonEditar.classList.remove('modo-edicion-activo');
    botonEditar.innerHTML = '<i class="fas fa-edit"></i> Editar';
    if (contenedorEstadoSelector)
      contenedorEstadoSelector.style.display = 'none';

    // Habilitar el badge dropdown
    if (badgeDropdown) {
      badgeDropdown.style.pointerEvents = 'auto';
      badgeDropdown.style.opacity = '1';
    }

    const serviciosEspacio = mantenimientosEspacios.filter(
      (m) => m.espacio_comun_id === espacioId
    );
    contenedorServicios.innerHTML = window.generarServiciosHTML(
      serviciosEspacio,
      espacioId,
      false,
      true,
      window.AppState?.filtroServicioEspacios || null
    );
  } else {
    // Activar modo edición
    botonEditar.classList.add('modo-edicion-activo');
    botonEditar.innerHTML = '<i class="fas fa-check"></i> Listo';
    if (contenedorEstadoSelector)
      contenedorEstadoSelector.style.display = 'block';

    // Deshabilitar el badge dropdown (para usar solo las pills)
    if (badgeDropdown) {
      badgeDropdown.style.pointerEvents = 'none';
      badgeDropdown.style.opacity = '0.7';
    }

    const serviciosEspacio = mantenimientosEspacios.filter(
      (m) => m.espacio_comun_id === espacioId
    );
    contenedorServicios.innerHTML = window.generarServiciosHTML(
      serviciosEspacio,
      espacioId,
      true,
      true,
      null // No aplicar filtro en modo edición
    );

    // Actualizar pills de estado con disabled correcto
    const espacio = espaciosComunes.find((e) => e.id === espacioId);
    if (espacio && contenedorEstadoSelector) {
      const estadoActual = espacio.estado || 'disponible';
      const pills = contenedorEstadoSelector.querySelectorAll(
        '.estado-pill-inline'
      );
      pills.forEach((pill) => {
        const estadoPill = pill.getAttribute('data-estado');
        const isActive = estadoPill === estadoActual;
        pill.classList.toggle('estado-pill-inline-activo', isActive);
        pill.classList.toggle('activo', isActive);
        pill.disabled = isActive;
      });
    }
  }
}

/**
 * Seleccionar espacio común y mostrar formulario inline
 */
function seleccionarEspacioComun(espacioId) {
  // Verificar si ya hay un formulario inline abierto
  const contenedorServicios = document.getElementById(
    `servicios-espacio-${espacioId}`
  );
  if (!contenedorServicios) return;

  const formExistente = contenedorServicios.querySelector(
    '.form-servicio-inline'
  );
  if (formExistente) {
    formExistente.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  // Mostrar formulario inline
  mostrarFormularioInlineEspacio(espacioId);
}

/**
 * Mostrar formulario inline para espacios comunes
 */
function mostrarFormularioInlineEspacio(espacioId) {
  const contenedorServicios = document.getElementById(
    `servicios-espacio-${espacioId}`
  );
  if (!contenedorServicios) return;

  const espacio = espaciosComunes.find((e) => e.id === espacioId);
  // eslint-disable-next-line no-unused-vars
  const estadoEspacio = espacio ? espacio.estado : '';

  // Generar opciones de usuarios (accediendo a usuarios globales si es necesario)
  const usuarios = window.appLoaderState ? window.appLoaderState.usuarios : [];
  const opcionesUsuarios = usuarios
    .map(
      (u) =>
        `<option value="${u.id}">${u.nombre}${u.departamento ? ` (${u.departamento})` : ''}</option>`
    )
    .join('');

  const formHTML = `
    <div class="form-servicio-inline" data-espacio-id="${espacioId}">
        <div class="form-inline-header">
            <i class="fas fa-plus-circle"></i>
            <span>Nuevo Servicio (Espacio)</span>
            <button type="button" class="btn-cerrar-inline" onclick="cerrarFormularioInlineEspacio(${espacioId})">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form onsubmit="guardarServicioEspacioInline(event, ${espacioId})">
            <div class="name-tipo-toggle-inline-container" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px;">
                <input type="text" 
                            class="input-inline" 
                            name="descripcion" 
                            placeholder="Descripción del servicio..." 
                            required 
                            autocomplete="off">
                    
                    <div class="tipo-toggle-inline">
                        <label class="toggle-label">
                            <input type="checkbox" 
                                    class="toggle-checkbox" 
                                    id="tipoToggleEspacio-${espacioId}"
                                    onchange="toggleTipoServicioEspacioInline(${espacioId})">
                            <span class="toggle-switch"></span>
                            <span class="toggle-text">
                                <span class="tipo-alerta">Alerta</span>
                            </span>
                        </label>
                    </div>
            </div>

            <div class="campos-alerta-inline" id="camposAlertaEspacio-${espacioId}" style="display: none;">
                <input type="time" class="input-inline" name="hora" placeholder="Hora">
                <input type="date" class="input-inline" name="dia_alerta" placeholder="Día">
            </div>
            
            <div class="estado-mantenimiento-selector-inline">
                <label class="estado-mant-label-inline">
                    <i class="fas fa-tasks"></i> Estado del Servicio
                </label>
                <select class="input-inline" name="estado_mantenimiento">
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                </select>
            </div>
            
            <div class="usuario-asignado-selector-inline">
                <label class="usuario-asignado-label-inline">
                    <i class="fas fa-user-check"></i> Asignar a (Opcional)
                </label>
                <select class="input-inline" name="usuario_asignado_id">
                    <option value="">-- Sin asignar --</option>
                    ${opcionesUsuarios}
                </select>
            </div>
            
            <textarea class="input-inline" 
                        name="notas" 
                        placeholder="Notas adicionales (opcional)" 
                        rows="2" 
                        style="resize: vertical; font-family: inherit;"></textarea>
            
            <div class="prioridad-selector-inline">
                <label class="prioridad-label-inline">
                    <i class="fas fa-traffic-light"></i> Prioridad
                </label>
                <div class="semaforo-edicion-inline">
                    <label class="semaforo-label-inline">
                        <input type="radio" name="prioridad-espacio-${espacioId}" value="baja" checked>
                        <span class="semaforo-circle green"></span>
                        <span class="semaforo-text">Baja</span>
                    </label>
                    <label class="semaforo-label-inline">
                        <input type="radio" name="prioridad-espacio-${espacioId}" value="media">
                        <span class="semaforo-circle yellow"></span>
                        <span class="semaforo-text">Media</span>
                    </label>
                    <label class="semaforo-label-inline">
                        <input type="radio" name="prioridad-espacio-${espacioId}" value="alta">
                        <span class="semaforo-circle red"></span>
                        <span class="semaforo-text">Alta</span>
                    </label>
                </div>
            </div>
            
            <!-- Botón de Crear Tarea (abre modal) y Selector de Tareas para asignar (opcional) -->
            <div class="tarea-asignada-selector-inline">
                <label class="tarea-asignada-label-inline">
                    <i class="fas fa-tasks"></i> Asignar Tarea (Opcional)
                </label>
                <div class="tarea-asignada-inputs-inline" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; margin-top: 10px;">
                <button style="font-size: 0.7rem; display: flex; align-items: center; gap: 5px; flex-direction: row; flex-wrap: nowrap;" type="button" class="btn-inline btn-crear-tarea" onclick="abrirModalCrearTarea(${espacioId})">
                    <i class="fas fa-plus"></i> Crear
                </button>
                <!-- Se deberá deshabilitar si el input "tareaAsignadaInline-espacio-${espacioId}" tiene un valor y el option pasará a estar vacío-->
                    <select id="tareaAsignadaInline-espacio-${espacioId}" class="input-inline selector-tarea-servicio" name="tarea_asignada_id">
                        <option value="">Sin tarea</option>
                    </select>
                </div>
            </div>
            
            <input type="hidden" name="tipo" value="normal">
            
            <div class="form-inline-actions">
                <button type="button" class="btn-inline btn-cancelar" onclick="cerrarFormularioInlineEspacio(${espacioId})">
                    Cancelar
                </button>
                <button id="btn-guardar-espacio-${espacioId}" class="btn-inline btn-guardar" onclick="deshabilitarBotonGuardarInline(${espacioId}, true)">
                    <i class="fas fa-check"></i> Guardar
                </button>
            </div>
        </form>
    </div>
    `;

  contenedorServicios.insertAdjacentHTML('afterbegin', formHTML);
  reorganizarServiciosEspacioConForm(espacioId);

  // Poblar selector de tareas con las tareas disponibles
  const selectorTareas = document.getElementById(
    `tareaAsignadaInline-espacio-${espacioId}`
  );
  if (selectorTareas && typeof window.cargarTareasEnSelector === 'function') {
    window.cargarTareasEnSelector(`tareaAsignadaInline-espacio-${espacioId}`);
  }

  setTimeout(() => {
    const input = contenedorServicios.querySelector(
      '.input-inline[name="descripcion"]'
    );
    if (input) input.focus();
  }, 100);
}

/**
 * Reorganizar servicios de espacio con formulario
 */
function reorganizarServiciosEspacioConForm(espacioId) {
  const contenedorServicios = document.getElementById(
    `servicios-espacio-${espacioId}`
  );
  if (!contenedorServicios) return;

  const servicios = contenedorServicios.querySelectorAll('.servicio-item');
  servicios.forEach((servicio, index) => {
    if (index === 0) {
      servicio.style.display = 'flex';
    } else {
      servicio.style.display = 'none';
    }
  });
}

/**
 * Cerrar formulario inline de espacio
 */
function cerrarFormularioInlineEspacio(espacioId) {
  const contenedorServicios = document.getElementById(
    `servicios-espacio-${espacioId}`
  );
  if (!contenedorServicios) return;

  const form = contenedorServicios.querySelector('.form-servicio-inline');
  if (form) {
    form.remove();
  }

  const servicios = contenedorServicios.querySelectorAll('.servicio-item');
  servicios.forEach((servicio, index) => {
    if (index < 2) {
      servicio.style.display = 'flex';
    }
  });
}

/**
 * Toggle tipo de servicio inline para espacio
 */
function toggleTipoServicioEspacioInline(espacioId) {
  const checkbox = document.getElementById(`tipoToggleEspacio-${espacioId}`);
  const camposAlerta = document.getElementById(
    `camposAlertaEspacio-${espacioId}`
  );
  const form = checkbox.closest('form');
  const inputTipo = form.querySelector('input[name="tipo"]');

  if (checkbox.checked) {
    camposAlerta.style.display = 'flex';
    inputTipo.value = 'rutina';
  } else {
    camposAlerta.style.display = 'none';
    inputTipo.value = 'normal';
  }
}

/**
 * Recargar datos de mantenimientos de espacios y sincronizar ambos arrays
 */
async function recargarMantenimientosEspacios() {
  try {
    const baseUrl = window.API_BASE_URL || '';
    const response = await fetch(`${baseUrl}/api/mantenimientos/espacios`);
    if (response.ok) {
      const nuevosMantenimientosEspacios = await response.json();

      // Actualizar mantenimientosEspacios locales
      mantenimientosEspacios = nuevosMantenimientosEspacios;

      // Actualizar appLoaderState
      if (window.appLoaderState) {
        window.appLoaderState.mantenimientosEspacios = mantenimientosEspacios;

        // Sincronizar también con el array general de mantenimientos del loader principal
        // Si mantenimientos es una referencia a appLoaderState.mantenimientos
        const mantenimientosGenerales = window.appLoaderState.mantenimientos;

        nuevosMantenimientosEspacios.forEach((servicioActualizado) => {
          const indexEnMantenimientos = mantenimientosGenerales.findIndex(
            (m) => m.id === servicioActualizado.id
          );
          if (indexEnMantenimientos !== -1) {
            mantenimientosGenerales[indexEnMantenimientos] =
              servicioActualizado;
          } else {
            mantenimientosGenerales.push(servicioActualizado);
          }
        });
      }

      // También sincronizar con AppState de app.js
      if (window.AppState) {
        window.AppState.mantenimientosEspacios = mantenimientosEspacios;
      }

      console.log('✅ Mantenimientos de espacios recargados y sincronizados');
      return true;
    }
  } catch (error) {
    console.error('Error recargando mantenimientos de espacios:', error);
  }
  return false;
}

/**
 * Renderizar servicios de un espacio común
 */
function renderizarServiciosEspacio(espacioId) {
  const contenedorServicios = document.getElementById(
    `servicios-espacio-${espacioId}`
  );
  if (!contenedorServicios) return;

  const serviciosEspacio = mantenimientosEspacios.filter(
    (m) => m.espacio_comun_id === espacioId
  );

  // Verificar si está en modo edición
  const btnEditar = document.getElementById(`btn-editar-espacio-${espacioId}`);
  const enModoEdicion =
    btnEditar && btnEditar.classList.contains('modo-edicion-activo');

  contenedorServicios.innerHTML = window.generarServiciosHTML(
    serviciosEspacio,
    espacioId,
    enModoEdicion,
    true,
    enModoEdicion ? null : window.AppState?.filtroServicioEspacios || null
  );

  // Mostrar/Ocultar botón editar según si hay servicios
  if (btnEditar) {
    if (serviciosEspacio.length > 0) {
      btnEditar.style.display = '';
    } else {
      if (!enModoEdicion) {
        btnEditar.style.display = 'none';
      } else {
        toggleModoEdicionEspacio(espacioId);
      }
    }
  }
}

/**
 * Guardar servicio inline para espacio
 */
async function guardarServicioEspacioInline(event, espacioId) {
  event.preventDefault();
  const form = event.target;
  const btnGuardar = document.getElementById(
    `btn-guardar-espacio-${espacioId}`
  );

  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  }

  const descripcion = form.descripcion.value;
  const tipo = form.tipo.value;
  const prioridad =
    form.querySelector(`input[name="prioridad-espacio-${espacioId}"]:checked`)
      ?.value || 'media';
  const estadoMantenimiento = form.estado_mantenimiento.value;
  const usuarioAsignadoId = form.usuario_asignado_id.value || null;
  const notas = form.notas.value;

  const tareaAsignadaId = form.tarea_asignada_id.value || null;

  const data = {
    espacio_comun_id: espacioId,
    tipo: tipo,
    descripcion: descripcion,
    prioridad: prioridad,
    estado: estadoMantenimiento,
    usuario_asignado_id: usuarioAsignadoId,
    tarea_id: tareaAsignadaId,
    notas: notas,
    fecha_registro: new Date().toISOString(),
  };

  if (tipo === 'rutina') {
    data.hora = form.hora.value;
    data.dia_alerta = form.dia_alerta.value;
  }

  try {
    const baseUrl = window.API_BASE_URL || '';

    // Usar fetchWithAuth para manejo automático de refresh de token
    const response = await window.fetchWithAuth(
      `${baseUrl}/api/mantenimientos/espacios`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) throw new Error('Error al guardar servicio');

    const nuevoServicio = await response.json();

    // Agregar el nombre del espacio al servicio (puede no venir de la API)
    const espacio = espaciosComunes.find((e) => e.id === espacioId);
    if (espacio && !nuevoServicio.espacio_nombre) {
      nuevoServicio.espacio_nombre = espacio.nombre;
    }

    // Actualizar localmente
    mantenimientosEspacios.unshift(nuevoServicio);

    // Actualizar estado global si existe
    if (window.appLoaderState && window.appLoaderState.mantenimientosEspacios) {
      window.appLoaderState.mantenimientosEspacios = mantenimientosEspacios;
    }

    // También sincronizar con AppState de app.js
    if (window.AppState && window.AppState.mantenimientosEspacios) {
      window.AppState.mantenimientosEspacios = mantenimientosEspacios;
    }

    // Actualizar UI de la card
    cerrarFormularioInlineEspacio(espacioId);
    renderizarServiciosEspacio(espacioId);

    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('Servicio agregado correctamente', 'success');
    actualizarEstadisticasEspacios();

    // Si es una alerta (rutina), verificar si debe mostrarse y emitirse inmediatamente
    if (tipo === 'rutina') {
      // Obtener fecha/hora actual
      const ahora = new Date();
      const fechaActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
      const horaActual = ahora.toTimeString().slice(0, 5); // HH:MM

      // Extraer fecha y hora de la alerta
      const fechaAlerta = data.dia_alerta;
      const horaAlerta = data.hora ? data.hora.slice(0, 5) : '';

      // Verificar si la alerta ya pasó (fecha anterior a hoy o misma fecha pero hora pasada)
      const fechaPasada = fechaAlerta < fechaActual;
      const mismaFechaHoraPasada =
        fechaAlerta === fechaActual && horaAlerta <= horaActual;
      const alertaYaPaso = fechaPasada || mismaFechaHoraPasada;

      if (alertaYaPaso) {
        console.log(
          '⏰ [ESPACIOS] La alerta ya pasó, emitiendo automáticamente...'
        );
        // Marcar alertas pasadas como emitidas (por si la nueva alerta ya pasó)
        if (window.marcarAlertasPasadasComoEmitidas) {
          await window.marcarAlertasPasadasComoEmitidas();
        }
      }

      // Forzar actualización del sistema de notificaciones
      console.log(
        '🔄 [ESPACIOS] Nueva alerta agregada, verificando sistema de notificaciones...'
      );
      setTimeout(() => {
        if (window.verificarYEmitirAlertas) {
          window.verificarYEmitirAlertas();
        }
      }, 1500);
    }

    // Actualizar paneles de alertas de espacios
    if (window.cargarAlertasEspacios) {
      await window.cargarAlertasEspacios();
    }

    // Actualizar también paneles de alertas emitidas y historial (comunes con habitaciones)
    if (window.mostrarAlertasEmitidas) {
      await window.mostrarAlertasEmitidas();
    }
    if (window.mostrarHistorialAlertas) {
      await window.mostrarHistorialAlertas();
    }
  } catch (error) {
    console.error('Error:', error);
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('Error al guardar servicio', 'error');
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = '<i class="fas fa-check"></i> Guardar';
    }
  }
}

/**
 * Seleccionar estado de espacio inline
 */
async function seleccionarEstadoEspacioInline(espacioId, nuevoEstado, boton) {
  try {
    const baseUrl = window.API_BASE_URL || '';
    // Usar fetchWithAuth para manejo automático de refresh de token
    const response = await window.fetchWithAuth(
      `${baseUrl}/api/espacios-comunes/${espacioId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevoEstado }),
      }
    );

    if (!response.ok) throw new Error('Error al actualizar estado');

    // Actualizar localmente
    const espacio = espaciosComunes.find((e) => e.id === espacioId);
    if (espacio) espacio.estado = nuevoEstado;

    // Actualizar UI pills
    const contenedor = boton.closest('.estado-pills-inline');
    contenedor.querySelectorAll('.estado-pill-inline').forEach((b) => {
      b.classList.remove('activo');
      b.removeAttribute('disabled');
    });
    boton.classList.add('activo');
    boton.setAttribute('disabled', 'disabled');

    // Actualizar badge del header usando actualizarBadgeDropdown
    const li =
      document.querySelector(`li[data-espacio-id="${espacioId}"]`) ||
      document.getElementById(`servicios-espacio-${espacioId}`).closest('li');

    if (li) {
      const badgeDropdown = li.querySelector('.estado-dropdown');
      if (badgeDropdown && window.actualizarBadgeDropdown) {
        window.actualizarBadgeDropdown(badgeDropdown, nuevoEstado);
      }
    }

    // Actualizar pills de estado (estilo activo)
    const pills = document.querySelectorAll('.estado-pill-inline');
    pills.forEach((pill) => {
      if (pill.dataset.estado === nuevoEstado) {
        pill.classList.add('estado-pill-inline-activo');
      } else {
        pill.classList.remove('estado-pill-inline-activo');
      }
    });

    actualizarEstadisticasEspacios();
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('Estado actualizado', 'success');
  } catch (error) {
    console.error('Error:', error);
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('Error al actualizar estado', 'error');
  }
}

/**
 * Cambiar estado del espacio desde el badge/select dropdown
 */
async function cambiarEstadoEspacioBadge(
  espacioId,
  nuevoEstado,
  selectElement
) {
  try {
    const baseUrl = window.API_BASE_URL || '';
    console.log(
      `🔄 [BADGE] Actualizando estado del espacio ${espacioId} a: ${nuevoEstado}`
    );

    const response = await window.fetchWithAuth(
      `${baseUrl}/api/espacios-comunes/${espacioId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevoEstado }),
      }
    );

    if (!response.ok) throw new Error('Error al actualizar estado');

    const resultado = await response.json();
    console.log('✅ Estado actualizado:', resultado);

    // Actualizar localmente
    const espacio = espaciosComunes.find((e) => e.id === espacioId);
    if (espacio) espacio.estado = nuevoEstado;

    // Actualizar el estilo del select para reflejar el nuevo estado
    if (window.actualizarEstiloSelectBadge) {
      window.actualizarEstiloSelectBadge(selectElement, nuevoEstado);
    } else {
      // Fallback manual
      selectElement.classList.remove(
        'estado-disponible',
        'estado-ocupado',
        'estado-mantenimiento',
        'estado-fuera-servicio',
        'estado-vacio'
      );
      switch (nuevoEstado) {
        case 'disponible':
          selectElement.classList.add('estado-disponible');
          break;
        case 'ocupado':
          selectElement.classList.add('estado-ocupado');
          break;
        case 'mantenimiento':
          selectElement.classList.add('estado-mantenimiento');
          break;
        case 'fuera_servicio':
          selectElement.classList.add('estado-fuera-servicio');
          break;
      }
    }

    // Actualizar pills del selector inline si está visible
    const estadoSelector = document.getElementById(
      `estado-selector-inline-espacio-${espacioId}`
    );
    if (estadoSelector) {
      const pills = estadoSelector.querySelectorAll('.estado-pill-inline');
      pills.forEach((pill) => {
        const estadoPill = pill.getAttribute('data-estado');
        const isActive = estadoPill === nuevoEstado;
        pill.classList.toggle('estado-pill-inline-activo', isActive);
        pill.disabled = isActive;
      });
    }

    actualizarEstadisticasEspacios();

    const estadoLabels = {
      disponible: 'Disponible',
      ocupado: 'Ocupado',
      mantenimiento: 'Mantenimiento en curso',
      fuera_servicio: 'Fuera de Servicio',
    };

    const label = estadoLabels[nuevoEstado] || nuevoEstado;

    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur(`Estado actualizado a: ${label}`, 'success');
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('Error al actualizar estado', 'error');

    // Revertir el select al estado anterior si hay error
    const espacio = espaciosComunes.find((e) => e.id === espacioId);
    if (espacio && selectElement) {
      selectElement.value = espacio.estado;
    }
  }
}
window.cambiarEstadoEspacioBadge = cambiarEstadoEspacioBadge;

/**
 * Cambiar estado de espacio común (Versión legacy/prompt)
 */
async function cambiarEstadoEspacio(espacioId) {
  const espacio = espaciosComunes.find((e) => e.id === espacioId);
  if (!espacio) return;

  const nuevoEstado = prompt(
    `Cambiar estado de ${espacio.nombre}:\n\nEstados:\n1 = 🟢 Disponible\n2 = 🔴 Ocupado\n3 = 🟡 Mantenimiento\n4 = ⚫ Fuera de Servicio\n\nIngrese número (1-4):`,
    '1'
  );

  if (!nuevoEstado) return;

  const estadoMap = {
    1: 'disponible',
    2: 'ocupado',
    3: 'mantenimiento',
    4: 'fuera_servicio',
  };

  const estado = estadoMap[nuevoEstado];
  if (!estado) {
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('Estado inválido', 'error');
    return;
  }

  try {
    const baseUrl = window.API_BASE_URL || '';

    // Usar fetchWithAuth para manejo automático de refresh de token
    const response = await window.fetchWithAuth(
      `${baseUrl}/api/espacios-comunes/${espacioId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ estado }),
      }
    );

    if (!response.ok) throw new Error(`Error ${response.status}`);

    espacio.estado = estado;
    mostrarEspaciosComunes();
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('Estado actualizado correctamente', 'success');
  } catch (error) {
    console.error('Error actualizando estado:', error);
    if (window.mostrarAlertaBlur)
      window.mostrarAlertaBlur('Error al actualizar estado', 'error');
  }
}

// Asignar funciones a window para compatibilidad con HTML onclick
window.mostrarSkeletonsEspacios = mostrarSkeletonsEspacios;
window.cargarEspaciosComunes = cargarEspaciosComunes;
window.mostrarEspaciosComunes = mostrarEspaciosComunes;
window.sincronizarEspaciosFiltrados = sincronizarEspaciosFiltrados;
window.actualizarEstadisticasEspacios = actualizarEstadisticasEspacios;
window.toggleModoEdicionEspacio = toggleModoEdicionEspacio;
window.seleccionarEspacioComun = seleccionarEspacioComun;
window.mostrarFormularioInlineEspacio = mostrarFormularioInlineEspacio;
window.cerrarFormularioInlineEspacio = cerrarFormularioInlineEspacio;
window.toggleTipoServicioEspacioInline = toggleTipoServicioEspacioInline;
window.guardarServicioEspacioInline = guardarServicioEspacioInline;
window.seleccionarEstadoEspacioInline = seleccionarEstadoEspacioInline;
window.cambiarEstadoEspacio = cambiarEstadoEspacio;
window.renderizarServiciosEspacio = renderizarServiciosEspacio;
window.recargarMantenimientosEspacios = recargarMantenimientosEspacios;
window.ajustarTamanoTitulo = ajustarTamanoTitulo;

// Exportar el flag de carga como getter/setter
Object.defineProperty(window, 'espaciosComunesCargados', {
  get: () => espaciosComunesCargados,
  set: (value) => {
    espaciosComunesCargados = value;
  },
});

/**
 * Setter para espacios comunes filtrados (usado por app.js filters)
 */
function setEspaciosComunesFiltrados(filtrados) {
  espaciosComunesFiltradosActual = Array.isArray(filtrados)
    ? [...filtrados]
    : [];
  paginaActualEspacios = 1; // Reset to page 1 when filtering
  totalPaginasEspacios =
    espaciosComunesFiltradosActual.length > 0
      ? Math.ceil(espaciosComunesFiltradosActual.length / ESPACIOS_POR_PAGINA)
      : 1;
}

/**
 * Getter para espacios comunes filtrados
 */
function getEspaciosComunesFiltrados() {
  return espaciosComunesFiltradosActual;
}

// Export setter/getter to window for external filter access
window.setEspaciosComunesFiltrados = setEspaciosComunesFiltrados;
window.getEspaciosComunesFiltrados = getEspaciosComunesFiltrados;

console.log('✅ [APP-LOADER-ESPACIOS] Funciones exportadas a window');

// Exportar funciones para uso modular
export {
  mostrarSkeletonsEspacios,
  cargarEspaciosComunes,
  mostrarEspaciosComunes,
  sincronizarEspaciosFiltrados,
  actualizarEstadisticasEspacios,
  toggleModoEdicionEspacio,
  seleccionarEspacioComun,
  mostrarFormularioInlineEspacio,
  cerrarFormularioInlineEspacio,
  toggleTipoServicioEspacioInline,
  guardarServicioEspacioInline,
  seleccionarEstadoEspacioInline,
  cambiarEstadoEspacio,
  renderizarServiciosEspacio,
  recargarMantenimientosEspacios,
  setEspaciosComunesFiltrados,
  getEspaciosComunesFiltrados,
};
