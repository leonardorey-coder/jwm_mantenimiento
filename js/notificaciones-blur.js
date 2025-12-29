/**
 * Sistema de Notificaciones con Blur
 *
 * Sistema de alertas con efecto blur que se acumulan debajo del header.
 * Las alertas aparecen desde la derecha con animación de desplazamiento.
 */

function mostrarAlertaBlur(mensaje, tipo = 'info') {
  const header = document.querySelector('.premium-header');
  const headerHeight = header ? header.offsetHeight : 80;
  const topPosition = headerHeight + 10;
  const isMobile = window.innerWidth <= 768;
  const padding = isMobile ? '0.75rem 1rem' : '1rem 1.25rem';
  const gap = isMobile ? '0.5rem' : '0.75rem';

  let container = document.getElementById('alerta-blur-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'alerta-blur-container';
    container.style.cssText = `
            position: fixed;
            top: ${topPosition}px;
            right: 1rem;
            z-index: 999;
            display: flex;
            flex-direction: column;
            gap: ${gap};
            width: calc(100% - 2rem);
            max-width: 500px;
            pointer-events: none;
        `;
    document.body.appendChild(container);
  }

  const alerta = document.createElement('div');
  alerta.className = `alerta-blur alerta-blur-${tipo}`;

  const iconos = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle',
  };

  const colores = {
    success: {
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.4)',
      text: '#065f46',
      icon: '#10b981',
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
      text: '#991b1b',
      icon: '#ef4444',
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      text: '#92400e',
      icon: '#f59e0b',
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.4)',
      text: '#1e40af',
      icon: '#3b82f6',
    },
  };

  const color = colores[tipo] || colores.info;

  alerta.innerHTML = `
        <i class="fas fa-${iconos[tipo] || iconos.info}"></i>
        <span class="alerta-blur-text">${mensaje}</span>
        <button class="alerta-blur-close" aria-label="Cerrar">×</button>
    `;

  alerta.style.cssText = `
        position: relative;
        width: 100%;
        background: ${color.bg};
        border: 2px solid ${color.border};
        border-radius: 12px;
        padding: ${padding};
        display: flex;
        align-items: center;
        gap: ${gap};
        font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: ${isMobile ? '0.85rem' : '0.95rem'};
        font-weight: 600;
        color: ${color.text};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
    `;

  alerta.querySelector('i').style.cssText = `
        color: ${color.icon};
        font-size: ${isMobile ? '1rem' : '1.2rem'};
        flex-shrink: 0;
    `;

  alerta.querySelector('.alerta-blur-text').style.cssText = `
        flex: 1;
        line-height: 1.5;
    `;

  alerta.querySelector('.alerta-blur-close').style.cssText = `
        background: none;
        border: none;
        color: ${color.text};
        font-size: ${isMobile ? '1.25rem' : '1.5rem'};
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: ${isMobile ? '20px' : '24px'};
        height: ${isMobile ? '20px' : '24px'};
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
        flex-shrink: 0;
    `;

  container.appendChild(alerta);

  requestAnimationFrame(() => {
    alerta.style.opacity = '1';
    alerta.style.transform = 'translateX(0)';
  });

  const cerrar = () => {
    alerta.style.opacity = '0';
    alerta.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (alerta.parentNode) {
        alerta.remove();
      }
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 400);
  };

  alerta.querySelector('.alerta-blur-close').addEventListener('click', cerrar);
  alerta
    .querySelector('.alerta-blur-close')
    .addEventListener('mouseenter', function () {
      this.style.backgroundColor = color.bg;
    });
  alerta
    .querySelector('.alerta-blur-close')
    .addEventListener('mouseleave', function () {
      this.style.backgroundColor = 'transparent';
    });

  setTimeout(cerrar, 5000);
}

window.mostrarAlertaBlur = mostrarAlertaBlur;
