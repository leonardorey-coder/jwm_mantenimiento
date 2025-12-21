import { Inbox, Search, AlertCircle } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Sin datos',
  description,
  action,
  actionLabel = 'Agregar',
  variant = 'default',
}) {
  const icons = {
    default: Inbox,
    search: Search,
    error: AlertCircle,
  };

  const IconComponent = Icon || icons[variant];

  return (
    <div className={`empty-state empty-state-${variant}`}>
      <div className="empty-icon">
        <IconComponent size={48} />
      </div>
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-description">{description}</p>}
      {action && (
        <button className="btn-primary empty-action" onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function NoResults({ searchTerm, onClear }) {
  return (
    <EmptyState
      variant="search"
      title="Sin resultados"
      description={searchTerm ? `No se encontraron resultados para "${searchTerm}"` : 'No se encontraron resultados con los filtros aplicados'}
      action={onClear}
      actionLabel="Limpiar filtros"
    />
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      variant="error"
      title="Error"
      description={message || 'Ocurrio un error al cargar los datos'}
      action={onRetry}
      actionLabel="Reintentar"
    />
  );
}
