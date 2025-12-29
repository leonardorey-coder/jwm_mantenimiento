/**
 * GitHub Direct Downloads
 * Maneja las descargas directas desde GitHub Releases
 */

const GITHUB_REPO = 'leonardorey-coder/jwm_mantenimiento';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

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

// Exponer funciones globalmente
window.downloadPortable = downloadPortable;
window.downloadInstaller = downloadInstaller;
