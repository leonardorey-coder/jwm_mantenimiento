/**
 * GitHub Direct Downloads
 * Maneja las descargas directas desde GitHub Releases
 */

const GITHUB_REPO = 'leonardorey-coder/jwm_mantenimiento';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const IPHONE_GUIDE_URL =
  'https://zlnkrtkxj3.ufs.sh/f/54ULqUm6Ozd0ZQ62jUcg5xYjaqmvAcCIg97TbFVlo3rpnMHy';
const IPHONE_GUIDE_FILENAME = 'tutorial-instalacion-pwa-iphone.jpeg';

/**
 * Obtener información de la última versión
 */
async function getLatestRelease() {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo release:', error);
    throw error;
  }
}

/**
 * Descargar un archivo automáticamente
 */
function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Manejar descarga de versión portable
 */
async function downloadPortable(button) {
  const originalHTML = button.innerHTML;

  try {
    // Mostrar estado de carga
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;

    const release = await getLatestRelease();

    // Buscar el archivo portable (el que NO tiene "Setup" en el nombre)
    const portableAsset = release.assets.find(
      (asset) =>
        asset.name.endsWith('.exe') &&
        !asset.name.toLowerCase().includes('setup')
    );

    if (!portableAsset) {
      throw new Error('No se encontró la versión portable');
    }

    // Iniciar descarga
    triggerDownload(portableAsset.browser_download_url, portableAsset.name);

    // Restaurar botón después de un momento
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Error descargando portable:', error);

    // Mostrar error y restaurar botón
    if (window.mostrarAlertaBlur) {
      window.mostrarAlertaBlur(
        'Error al descargar. Por favor intenta desde GitHub.',
        'error'
      );
    }

    button.innerHTML = originalHTML;
    button.disabled = false;

    // Fallback: abrir GitHub
    window.open(`https://github.com/${GITHUB_REPO}/releases/latest`, '_blank');
  }
}

/**
 * Manejar descarga de instalador
 */
async function downloadInstaller(button) {
  const originalHTML = button.innerHTML;

  try {
    // Mostrar estado de carga
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;

    const release = await getLatestRelease();

    // Buscar el instalador (el que tiene "Setup" en el nombre)
    const installerAsset = release.assets.find(
      (asset) =>
        asset.name.endsWith('.exe') &&
        asset.name.toLowerCase().includes('setup')
    );

    if (!installerAsset) {
      throw new Error('No se encontró el instalador');
    }

    // Iniciar descarga
    triggerDownload(installerAsset.browser_download_url, installerAsset.name);

    // Restaurar botón después de un momento
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Error descargando instalador:', error);

    // Mostrar error y restaurar botón
    if (window.mostrarAlertaBlur) {
      window.mostrarAlertaBlur(
        'Error al descargar. Por favor intenta desde GitHub.',
        'error'
      );
    }

    button.innerHTML = originalHTML;
    button.disabled = false;

    // Fallback: abrir página de releases
    window.open(`https://github.com/${GITHUB_REPO}/releases`, '_blank');
  }
}

function openIphoneGuide() {
  let modal = document.getElementById('modalIphoneGuide');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalIphoneGuide';
    modal.className = 'modal-detalles iphone-guide-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
        <div class="modal-detalles-overlay" onclick="cerrarIphoneGuideModal()"></div>
        <div class="modal-detalles-contenido iphone-guide-content">
            <div class="modal-detalles-header">
                <div class="checklist-foto-header-info">
                    <h3><i class="fas fa-mobile-alt"></i> Guía de instalación en iPhone</h3>
                    <span class="checklist-foto-timestamp">
                        <i class="fas fa-image"></i> ${IPHONE_GUIDE_FILENAME}
                    </span>
                </div>
                <button class="modal-detalles-cerrar" onclick="cerrarIphoneGuideModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-detalles-body iphone-guide-body">
                <div class="iphone-guide-image-container">
                    <img src="${IPHONE_GUIDE_URL}" alt="Guía de instalación en iPhone" class="iphone-guide-image" onclick="openIphoneGuideFullScreen()">
                </div>
            </div>
        </div>
    `;

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  if (window.iphoneGuideEscHandler) {
    document.removeEventListener('keydown', window.iphoneGuideEscHandler, true);
  }
  window.iphoneGuideEscHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      cerrarIphoneGuideModal();
    }
  };
  document.addEventListener('keydown', window.iphoneGuideEscHandler, true);
}

function cerrarIphoneGuideModal() {
  const modal = document.getElementById('modalIphoneGuide');
  if (modal) {
    modal.style.display = 'none';
  }

  const modalVisible = Array.from(
    document.querySelectorAll('.modal-detalles')
  ).some((modalItem) => window.getComputedStyle(modalItem).display !== 'none');
  if (!modalVisible) {
    document.body.classList.remove('modal-open');
  }

  if (window.iphoneGuideEscHandler) {
    document.removeEventListener('keydown', window.iphoneGuideEscHandler, true);
    window.iphoneGuideEscHandler = null;
  }
}

function openIphoneGuideFullScreen() {
  let modal = document.getElementById('modalIphoneGuideFullScreen');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalIphoneGuideFullScreen';
    modal.className = 'modal-detalles iphone-guide-fullscreen-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
        <div class="modal-detalles-overlay" onclick="cerrarIphoneGuideFullScreen()"></div>
        <div class="modal-detalles-contenido iphone-guide-fullscreen-content">
            <div class="iphone-guide-fullscreen-header">
                <button class="iphone-guide-fullscreen-back" onclick="cerrarIphoneGuideFullScreen()" aria-label="Volver">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <span>Guía de instalación en iPhone</span>
            </div>
            <div class="iphone-guide-fullscreen-body">
                <img src="${IPHONE_GUIDE_URL}" alt="Guía de instalación en iPhone" class="iphone-guide-fullscreen-image">
            </div>
        </div>
    `;

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  const fullscreenBody = modal.querySelector('.iphone-guide-fullscreen-body');
  const resetDragStyles = () => {
    fullscreenBody.style.transition =
      'transform 180ms ease, opacity 180ms ease';
    fullscreenBody.style.transform = 'translateY(0)';
    fullscreenBody.style.opacity = '1';
  };

  if (modal._iphoneGuideDragHandlers) {
    fullscreenBody.removeEventListener(
      'pointerdown',
      modal._iphoneGuideDragHandlers.onPointerDown
    );
    window.removeEventListener(
      'pointermove',
      modal._iphoneGuideDragHandlers.onPointerMove
    );
    window.removeEventListener(
      'pointerup',
      modal._iphoneGuideDragHandlers.onPointerUp
    );
    window.removeEventListener(
      'pointercancel',
      modal._iphoneGuideDragHandlers.onPointerUp
    );
  }

  let dragStartX = 0;
  let dragStartY = 0;
  let dragDeltaX = 0;
  let dragDeltaY = 0;
  let dragging = false;
  const activePointers = new Set();

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    activePointers.add(e.pointerId);
    if (activePointers.size > 1) {
      dragging = false;
      resetDragStyles();
      return;
    }
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragDeltaX = 0;
    dragDeltaY = 0;
    fullscreenBody.style.transition = 'none';
    fullscreenBody.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging || activePointers.size > 1) return;
    dragDeltaX = e.clientX - dragStartX;
    dragDeltaY = e.clientY - dragStartY;

    if (dragDeltaY >= 0 && Math.abs(dragDeltaY) >= Math.abs(dragDeltaX)) {
      fullscreenBody.style.transform = `translateY(${dragDeltaY}px)`;
      fullscreenBody.style.opacity = String(
        Math.max(0.2, 1 - dragDeltaY / 400)
      );
      return;
    }

    fullscreenBody.style.transform = `translateX(${dragDeltaX}px)`;
    fullscreenBody.style.opacity = String(
      Math.max(0.2, 1 - Math.abs(dragDeltaX) / 400)
    );
  };

  const onPointerUp = (e) => {
    activePointers.delete(e.pointerId);
    if (!dragging || activePointers.size > 0) return;
    dragging = false;
    if (dragDeltaY > 120 || Math.abs(dragDeltaX) > 120) {
      cerrarIphoneGuideFullScreen();
      return;
    }
    resetDragStyles();
  };

  fullscreenBody.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  modal._iphoneGuideDragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };

  resetDragStyles();

  if (window.iphoneGuideFullScreenEscHandler) {
    document.removeEventListener(
      'keydown',
      window.iphoneGuideFullScreenEscHandler,
      true
    );
  }
  window.iphoneGuideFullScreenEscHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      cerrarIphoneGuideFullScreen();
    }
  };
  document.addEventListener(
    'keydown',
    window.iphoneGuideFullScreenEscHandler,
    true
  );
}

function cerrarIphoneGuideFullScreen() {
  const modal = document.getElementById('modalIphoneGuideFullScreen');
  if (modal) {
    modal.style.display = 'none';

    if (modal._iphoneGuideDragHandlers) {
      const fullscreenBody = modal.querySelector(
        '.iphone-guide-fullscreen-body'
      );
      if (fullscreenBody) {
        fullscreenBody.removeEventListener(
          'pointerdown',
          modal._iphoneGuideDragHandlers.onPointerDown
        );
      }
      window.removeEventListener(
        'pointermove',
        modal._iphoneGuideDragHandlers.onPointerMove
      );
      window.removeEventListener(
        'pointerup',
        modal._iphoneGuideDragHandlers.onPointerUp
      );
      window.removeEventListener(
        'pointercancel',
        modal._iphoneGuideDragHandlers.onPointerUp
      );
      modal._iphoneGuideDragHandlers = null;
    }
  }

  const modalVisible = Array.from(
    document.querySelectorAll('.modal-detalles')
  ).some((modalItem) => window.getComputedStyle(modalItem).display !== 'none');
  if (!modalVisible) {
    document.body.classList.remove('modal-open');
  }

  if (window.iphoneGuideFullScreenEscHandler) {
    document.removeEventListener(
      'keydown',
      window.iphoneGuideFullScreenEscHandler,
      true
    );
    window.iphoneGuideFullScreenEscHandler = null;
  }
}

// Exponer funciones globalmente
window.downloadPortable = downloadPortable;
window.downloadInstaller = downloadInstaller;
window.openIphoneGuide = openIphoneGuide;
window.cerrarIphoneGuideModal = cerrarIphoneGuideModal;
window.openIphoneGuideFullScreen = openIphoneGuideFullScreen;
window.cerrarIphoneGuideFullScreen = cerrarIphoneGuideFullScreen;
