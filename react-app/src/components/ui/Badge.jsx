import clsx from 'clsx';
import './Badge.css';

export default function Badge({ 
  children, 
  variant = 'default',
  size = 'default',
  icon: Icon,
  className = '' 
}) {
  return (
    <span className={clsx('badge', `badge-${variant}`, `badge-${size}`, className)}>
      {Icon && <Icon size={size === 'small' ? 10 : 12} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, labels = {}, colors = {} }) {
  const defaultLabels = {
    disponible: 'Disponible',
    ocupado: 'Ocupado',
    mantenimiento: 'Mantenimiento',
    fuera_servicio: 'Fuera de servicio',
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    completado: 'Completado',
    cancelado: 'Cancelado',
    activo: 'Activo',
    inactivo: 'Inactivo',
    bloqueado: 'Bloqueado',
  };

  const defaultColors = {
    disponible: 'success',
    ocupado: 'info',
    mantenimiento: 'warning',
    fuera_servicio: 'danger',
    pendiente: 'default',
    en_proceso: 'info',
    completado: 'success',
    cancelado: 'danger',
    activo: 'success',
    inactivo: 'default',
    bloqueado: 'danger',
  };

  const label = labels[status] || defaultLabels[status] || status;
  const color = colors[status] || defaultColors[status] || 'default';

  return <Badge variant={color}>{label}</Badge>;
}

export function PriorityBadge({ priority }) {
  const config = {
    alta: { label: 'Alta', variant: 'danger' },
    media: { label: 'Media', variant: 'warning' },
    baja: { label: 'Baja', variant: 'success' },
  };

  const { label, variant } = config[priority] || config.media;

  return <Badge variant={variant}>{label}</Badge>;
}

export function RoleBadge({ role }) {
  const config = {
    admin: { label: 'Admin', variant: 'primary' },
    supervisor: { label: 'Supervisor', variant: 'info' },
    tecnico: { label: 'Tecnico', variant: 'default' },
  };

  const { label, variant } = config[role?.toLowerCase()] || { label: role, variant: 'default' };

  return <Badge variant={variant}>{label}</Badge>;
}
