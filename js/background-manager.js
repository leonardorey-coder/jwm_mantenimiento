/**
 * Gestor de Fondo de Pantalla Personalizado
 * Sistema: JW Marriott - Sistema de Mantenimiento
 * Permite a los usuarios configurar su imagen de fondo personalizada
 */

(function () {
  'use strict';

  // Cliente de UploadThing para uploads desde el navegador
  let uploadthingClient = null;

  /**
   * Inicializa el gestor de fondos
   */
  function initBackgroundManager() {
    console.log('🖼️ [BACKGROUND] Inicializando gestor de fondos');

    // Cargar UploadThing cliente si está disponible
    if (typeof window.uploadthing !== 'undefined') {
      try {
        uploadthingClient = window.uploadthing.createUploadThing();
        console.log('✅ [BACKGROUND] Cliente UploadThing inicializado');
      } catch (error) {
        console.error(
          '❌ [BACKGROUND] Error inicializando UploadThing:',
          error
        );
      }
    }

    // Intentar aplicar fondo desde localStorage primero (fallback rápido)
    const savedBackgroundUrl = localStorage.getItem('user_background_url');
    if (savedBackgroundUrl) {
      console.log('🖼️ [BACKGROUND] Fondo encontrado en localStorage, aplicando temporalmente');
      establecerFondo(savedBackgroundUrl);
    }

    // Aplicar fondo del usuario si existe (esto sobrescribirá el de localStorage si hay diferencia)
    aplicarFondoUsuario();

    // Escuchar cambios en el usuario
    document.addEventListener('user-updated', aplicarFondoUsuario);
  }

  /**
   * Aplica el fondo de pantalla del usuario actual
   */
  function aplicarFondoUsuario() {
    const usuario = window.AppState?.currentUser;

    if (!usuario) {
      console.log('🖼️ [BACKGROUND] No hay usuario autenticado');
      removerFondo();
      return;
    }

    const backgroundUrl = usuario.background_url;

    if (backgroundUrl) {
      console.log(
        '🖼️ [BACKGROUND] Aplicando fondo personalizado:',
        backgroundUrl
      );
      establecerFondo(backgroundUrl);
    } else {
      console.log('🖼️ [BACKGROUND] Usuario sin fondo personalizado');
      removerFondo();
    }
  }

  /**
   * Establece una imagen de fondo
   * @param {string} url - URL de la imagen
   */
  function establecerFondo(url) {
    const body = document.body;

    // Remover clase de fondo previo
    body.classList.remove('has-custom-background');

    // Crear elemento para el fondo
    let backgroundElement = document.querySelector('.app-custom-background');

    if (!backgroundElement) {
      backgroundElement = document.createElement('div');
      backgroundElement.className = 'app-custom-background';
      body.insertBefore(backgroundElement, body.firstChild);

      // Crear overlay
      const overlay = document.createElement('div');
      overlay.className = 'app-background-overlay';
      backgroundElement.appendChild(overlay);
    }

    // Establecer imagen de fondo
    backgroundElement.style.backgroundImage = `url(${url})`;

    // Agregar clase al body
    body.classList.add('has-custom-background');

    // Guardar en localStorage para persistencia
    try {
      localStorage.setItem('user_background_url', url);
    } catch (e) {
      console.warn('⚠️ [BACKGROUND] No se pudo guardar en localStorage:', e);
    }
  }

  /**
   * Remueve el fondo personalizado
   */
  function removerFondo() {
    const body = document.body;
    const backgroundElement = document.querySelector('.app-custom-background');

    if (backgroundElement) {
      backgroundElement.remove();
    }

    body.classList.remove('has-custom-background');

    // Limpiar localStorage
    try {
      localStorage.removeItem('user_background_url');
    } catch (e) {
      console.warn('⚠️ [BACKGROUND] No se pudo limpiar localStorage:', e);
    }
  }

  /**
   * Abre el modal para configurar el fondo
   */
  async function abrirModalConfigFondo() {
    console.log('🖼️ [BACKGROUND] Abriendo modal de configuración');

    const usuario = window.AppState?.currentUser;
    const accessToken =
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');

    console.log('🔍 [BACKGROUND] Estado de autenticación:', {
      tieneUsuario: !!usuario,
      tieneToken: !!accessToken,
      usuario: usuario ? usuario.nombre : 'ninguno',
    });

    if (!usuario || !accessToken) {
      mostrarNotificacion(
        'Debes iniciar sesión para personalizar el fondo',
        'error'
      );
      return;
    }

    // Crear modal si no existe
    let modal = document.getElementById('modalConfigFondo');
    if (!modal) {
      modal = crearModalConfigFondo();
      document.body.appendChild(modal);
    }

    // Mostrar preview del fondo actual si existe
    const previewImg = modal.querySelector('#fondoPreview');
    const noPreview = modal.querySelector('.no-preview-message');
    const btnEliminar = modal.querySelector('#btnEliminarFondo');

    if (usuario.background_url) {
      previewImg.src = usuario.background_url;
      previewImg.style.display = 'block';
      noPreview.style.display = 'none';
      btnEliminar.style.display = 'inline-flex';
    } else {
      previewImg.style.display = 'none';
      noPreview.style.display = 'flex';
      btnEliminar.style.display = 'none';
    }

    // Mostrar modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Bloquear scroll del body
    document.body.classList.add('modal-open');
    
    // Listener para cerrar con ESC (solo se agrega una vez)
    if (!modal.hasAttribute('data-esc-listener')) {
      modal.setAttribute('data-esc-listener', 'true');
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const modal = document.getElementById('modalConfigFondo');
          if (modal && modal.style.display === 'flex') {
            cerrarModalConfigFondo();
          }
        }
      });
    }
  }

  /**
   * Cierra el modal de configuración
   */
  function cerrarModalConfigFondo() {
    const modal = document.getElementById('modalConfigFondo');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
      
      // Restaurar scroll del body
      document.body.classList.remove('modal-open');
    }
  }

  /**
   * Crea el modal de configuración del fondo
   * @returns {HTMLElement} Elemento del modal
   */
  function crearModalConfigFondo() {
    const modal = document.createElement('div');
    modal.id = 'modalConfigFondo';
    modal.className = 'modal-detalles';
    modal.innerHTML = `
      <div class="modal-detalles-overlay" onclick="window.cerrarModalConfigFondo()"></div>
      <div class="modal-detalles-contenido modal-config-fondo">
        <div class="modal-detalles-header">
          <div>
            <p class="modal-detalles-subtitulo">Personalización</p>
            <h3>Configurar Fondo de Pantalla</h3>
          </div>
          <button class="modal-detalles-cerrar" onclick="window.cerrarModalConfigFondo()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-config-fondo-body">
          <!-- Preview del fondo -->
          <div class="fondo-preview-container">
            <div class="no-preview-message">
              <i class="fas fa-image"></i>
              <p>Sin fondo personalizado</p>
            </div>
            <img id="fondoPreview" class="fondo-preview-img" alt="Preview del fondo" />
          </div>

          <!-- Botones de acción -->
          <div class="fondo-actions">
            <label for="inputFondoFile" class="btn btn-primary btn-upload-fondo">
              <i class="fas fa-upload"></i>
              <span>Subir Nueva Imagen</span>
            </label>
            <input 
              type="file" 
              id="inputFondoFile" 
              accept="image/*" 
              style="display: none;"
              onchange="window.handleFondoFileSelect(event)"
            />
            
            <button 
              type="button" 
              id="btnEliminarFondo" 
              class="btn btn-secondary btn-eliminar-fondo"
              onclick="window.eliminarFondoUsuario()"
            >
              <i class="fas fa-trash"></i>
              <span>Eliminar Fondo</span>
            </button>
          </div>

          <!-- Información -->
          <div class="fondo-info">
            <i class="fas fa-info-circle"></i>
            <p>Formatos: JPG, PNG, WebP. Tamaño máximo: 5MB. Resolución recomendada: 1920x1080px o superior.</p>
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Maneja la selección de archivo de imagen
   * @param {Event} event - Evento del input file
   */
  async function handleFondoFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('🖼️ [BACKGROUND] Archivo seleccionado:', file.name);

    // Validar autenticación primero
    const accessToken =
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');
    const usuario = window.AppState?.currentUser;

    if (!accessToken || !usuario) {
      mostrarNotificacion(
        'Sesión expirada. Por favor inicia sesión nuevamente',
        'error'
      );
      event.target.value = ''; // Limpiar input
      cerrarModalConfigFondo();
      // Redirigir a login después de 2 segundos
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
      return;
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      mostrarNotificacion('Por favor selecciona una imagen válida', 'error');
      event.target.value = '';
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      mostrarNotificacion('La imagen es demasiado grande. Máximo 5MB', 'error');
      event.target.value = '';
      return;
    }

    // Mostrar indicador de carga
    mostrarCargandoFondo(true);

    try {
      // Subir archivo a UploadThing (el backend ahora actualiza la BD también)
      const fileUrl = await subirFondoUploadThing(file);

      // Aplicar fondo inmediatamente
      establecerFondo(fileUrl);

      // Actualizar usuario en AppState
      if (window.AppState?.currentUser) {
        window.AppState.currentUser.background_url = fileUrl;
      }

      // Actualizar preview en el modal
      const previewImg = document.querySelector('#fondoPreview');
      const noPreview = document.querySelector('.no-preview-message');
      const btnEliminar = document.querySelector('#btnEliminarFondo');

      if (previewImg) {
        previewImg.src = fileUrl;
        previewImg.style.display = 'block';
      }
      if (noPreview) noPreview.style.display = 'none';
      if (btnEliminar) btnEliminar.style.display = 'inline-flex';

      mostrarNotificacion('Fondo actualizado exitosamente', 'success');

      // Limpiar input
      event.target.value = '';
    } catch (error) {
      console.error('❌ [BACKGROUND] Error subiendo fondo:', error);
      mostrarNotificacion(
        'Error al subir la imagen: ' + error.message,
        'error'
      );
    } finally {
      mostrarCargandoFondo(false);
    }
  }

  /**
   * Sube una imagen a UploadThing a través del endpoint del backend
   * @param {File} file - Archivo de imagen
   * @returns {Promise<string>} URL de la imagen subida
   */
  async function subirFondoUploadThing(file) {
    console.log('📤 [BACKGROUND] Subiendo a UploadThing...');

    try {
      // Crear FormData con el archivo
      const formData = new FormData();
      formData.append('file', file);

      const accessToken =
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken');
      const tokenType =
        localStorage.getItem('tokenType') ||
        sessionStorage.getItem('tokenType') ||
        'Bearer';

      if (!accessToken) {
        throw new Error('No hay token de autenticación');
      }

      // Usar el endpoint del backend que maneja la subida a UploadThing
      const url = '/api/auth/subir-fondo';

      console.log('📤 [BACKGROUND] URL de subida:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `${tokenType} ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [BACKGROUND] Error response:', errorText);
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ [BACKGROUND] Respuesta del backend:', result);

      // El backend devuelve { success, mensaje, usuario, fileUrl, fileKey }
      if (!result.success || !result.fileUrl) {
        throw new Error(result.error || 'No se recibió URL del archivo subido');
      }

      console.log('✅ [BACKGROUND] URL del fondo:', result.fileUrl);
      return result.fileUrl;
    } catch (error) {
      console.error('❌ [BACKGROUND] Error en subirFondoUploadThing:', error);
      throw error;
    }
  }

  /**
   * Actualiza el fondo en el backend
   * @param {string} url - URL del fondo
   */
  async function actualizarFondoBackend(url) {
    console.log('🔄 [BACKGROUND] Actualizando fondo en backend...');

    const response = await window.fetchWithAuth('/api/auth/actualizar-fondo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        background_url: url,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.mensaje || 'Error actualizando fondo');
    }

    console.log('✅ [BACKGROUND] Fondo actualizado en backend');
    return data;
  }

  /**
   * Elimina el fondo del usuario
   */
  async function eliminarFondoUsuario() {
    if (!confirm('¿Estás seguro de eliminar tu fondo personalizado?')) {
      return;
    }

    console.log('🗑️ [BACKGROUND] Eliminando fondo...');
    mostrarCargandoFondo(true, 'Eliminando imagen...');

    try {
      // Actualizar en backend (enviar null)
      await actualizarFondoBackend(null);

      // Remover fondo del DOM
      removerFondo();

      // Actualizar AppState
      if (window.AppState?.currentUser) {
        window.AppState.currentUser.background_url = null;
      }

      // Actualizar modal
      const previewImg = document.querySelector('#fondoPreview');
      const noPreview = document.querySelector('.no-preview-message');
      const btnEliminar = document.querySelector('#btnEliminarFondo');

      if (previewImg) previewImg.style.display = 'none';
      if (noPreview) noPreview.style.display = 'flex';
      if (btnEliminar) btnEliminar.style.display = 'none';

      mostrarNotificacion('Fondo eliminado exitosamente', 'success');
    } catch (error) {
      console.error('❌ [BACKGROUND] Error eliminando fondo:', error);
      mostrarNotificacion(
        'Error al eliminar el fondo: ' + error.message,
        'error'
      );
    } finally {
      mostrarCargandoFondo(false);
    }
  }

  /**
   * Muestra/oculta indicador de carga
   * @param {boolean} mostrar - Si debe mostrar el indicador
   * @param {string} mensaje - Mensaje a mostrar (por defecto: 'Subiendo imagen...')
   */
  function mostrarCargandoFondo(mostrar, mensaje = 'Subiendo imagen...') {
    let loader = document.querySelector('.fondo-loader');

    if (mostrar) {
      if (!loader) {
        loader = document.createElement('div');
        loader.className = 'fondo-loader';
        loader.innerHTML = `
          <div class="fondo-loader-content">
            <div class="spinner"></div>
            <p>${mensaje}</p>
          </div>
        `;
        document.body.appendChild(loader);
      } else {
        // Actualizar mensaje si ya existe el loader
        const messageEl = loader.querySelector('p');
        if (messageEl) {
          messageEl.textContent = mensaje;
        }
      }
      loader.style.display = 'flex';
    } else {
      if (loader) {
        loader.style.display = 'none';
      }
    }
  }

  /**
   * Muestra una notificación
   * @param {string} mensaje - Mensaje a mostrar
   * @param {string} tipo - Tipo: 'success', 'error', 'info'
   */
  function mostrarNotificacion(mensaje, tipo = 'info') {
    // Usar el sistema de notificaciones existente si está disponible
    if (window.mostrarNotificacion) {
      window.mostrarNotificacion(mensaje, tipo);
    } else {
      // Fallback a alert
      alert(mensaje);
    }
  }

  /**
   * Función de debugging para verificar estado de autenticación
   */
  window.debugBackgroundAuth = function () {
    const accessToken =
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');

    console.log('🐛 [DEBUG] ========== Estado de Autenticación ==========');
    console.log('📍 URL actual:', window.location.href);
    console.log(
      '🔑 Token en localStorage:',
      accessToken ? 'SÍ (longitud: ' + accessToken.length + ')' : 'NO'
    );
    console.log(
      '👤 window.AppState:',
      window.AppState ? 'Existe' : 'No existe'
    );
    console.log(
      '👤 window.AppState.currentUser:',
      window.AppState?.currentUser ? 'Existe' : 'No existe'
    );

    if (window.AppState?.currentUser) {
      console.log('   - ID:', window.AppState.currentUser.id);
      console.log('   - Nombre:', window.AppState.currentUser.nombre);
      console.log('   - Email:', window.AppState.currentUser.email);
      console.log('   - Rol:', window.AppState.currentUser.rol);
      console.log(
        '   - Background URL:',
        window.AppState.currentUser.background_url || 'ninguno'
      );
    }

    console.log('📦 Todas las claves en localStorage:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const displayValue = value
        ? value.substring(0, 50) + (value.length > 50 ? '...' : '')
        : 'null';
      console.log(`   - ${key}: ${displayValue}`);
    }
    console.log('🐛 [DEBUG] ===============================================');
  };

  // Exponer funciones globalmente
  window.initBackgroundManager = initBackgroundManager;
  window.abrirModalConfigFondo = abrirModalConfigFondo;
  window.cerrarModalConfigFondo = cerrarModalConfigFondo;
  window.handleFondoFileSelect = handleFondoFileSelect;
  window.eliminarFondoUsuario = eliminarFondoUsuario;

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackgroundManager);
  } else {
    initBackgroundManager();
  }
})();
