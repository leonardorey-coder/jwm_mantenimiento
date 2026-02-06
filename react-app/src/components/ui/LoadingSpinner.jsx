import clsx from 'clsx';
import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'default', className = '' }) {
  return (
    <div className={clsx('loading-spinner', `spinner-${size}`, className)}>
      <div className="spinner"></div>
    </div>
  );
}

export function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <LoadingSpinner size="large" />
        <p>{message}</p>
      </div>
    </div>
  );
}

export function LoadingOverlay({ message = 'Procesando...' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <LoadingSpinner />
        <p>{message}</p>
      </div>
    </div>
  );
}
