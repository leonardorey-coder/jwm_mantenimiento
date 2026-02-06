import { useState } from 'react';
import { Bed, Wrench, AlertTriangle, Clock, Plus, ChevronDown, ChevronUp, Edit, Trash2, Calendar, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const ESTADO_CONFIG = {
  disponible: { label: 'Disponible', color: 'success', icon: Bed },
  ocupado: { label: 'Ocupado', color: 'info', icon: Bed },
  mantenimiento: { label: 'Mantenimiento', color: 'warning', icon: Wrench },
  fuera_servicio: { label: 'Fuera de servicio', color: 'danger', icon: AlertTriangle },
};

const PRIORIDAD_CONFIG = {
  alta: { label: 'Alta', color: 'danger' },
  media: { label: 'Media', color: 'warning' },
  baja: { label: 'Baja', color: 'success' },
};

const TIPO_CONFIG = {
  normal: { label: 'Normal', icon: Wrench },
  rutina: { label: 'Rutina', icon: Clock },
};

export default function CuartoCard({ 
  cuarto, 
  mantenimientos = [], 
  onAddMantenimiento, 
  onEditMantenimiento,
  onDeleteMantenimiento 
}) {
  const [expanded, setExpanded] = useState(false);
  
  const estadoConfig = ESTADO_CONFIG[cuarto.estado] || ESTADO_CONFIG.disponible;
  const EstadoIcon = estadoConfig.icon;
  
  const mantenimientosPendientes = mantenimientos.filter(m => 
    m.estado === 'pendiente' || m.estado === 'en_proceso'
  );

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    try {
      return format(parseISO(fecha), "d MMM yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  return (
    <div className={clsx('cuarto-card', `estado-${cuarto.estado}`)}>
      <div className="cuarto-header">
        <div className="cuarto-numero">
          <span className="numero">{cuarto.numero || cuarto.nombre}</span>
          <span className={clsx('estado-badge', estadoConfig.color)}>
            <EstadoIcon size={14} />
            {estadoConfig.label}
          </span>
        </div>
        
        <button 
          className="btn-add-mantenimiento"
          onClick={onAddMantenimiento}
          title="Agregar mantenimiento"
        >
          <Plus size={16} />
        </button>
      </div>

      {mantenimientosPendientes.length > 0 && (
        <div className="mantenimientos-badge" onClick={() => setExpanded(!expanded)}>
          <Wrench size={14} />
          <span>{mantenimientosPendientes.length} mantenimiento(s) pendiente(s)</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      )}

      {expanded && mantenimientosPendientes.length > 0 && (
        <div className="mantenimientos-list">
          {mantenimientosPendientes.map(m => {
            const tipoConfig = TIPO_CONFIG[m.tipo] || TIPO_CONFIG.normal;
            const prioridadConfig = PRIORIDAD_CONFIG[m.prioridad] || PRIORIDAD_CONFIG.media;
            const TipoIcon = tipoConfig.icon;

            return (
              <div key={m.id} className="mantenimiento-item">
                <div className="mantenimiento-header">
                  <span className={clsx('tipo-badge', m.tipo)}>
                    <TipoIcon size={12} />
                    {tipoConfig.label}
                  </span>
                  <span className={clsx('prioridad-badge', prioridadConfig.color)}>
                    {prioridadConfig.label}
                  </span>
                </div>
                
                <p className="mantenimiento-descripcion">{m.descripcion}</p>
                
                <div className="mantenimiento-meta">
                  {m.dia_alerta && (
                    <span className="meta-item">
                      <Calendar size={12} />
                      {formatFecha(m.dia_alerta)}
                      {m.hora && ` ${m.hora.slice(0, 5)}`}
                    </span>
                  )}
                  {m.usuario_asignado_nombre && (
                    <span className="meta-item">
                      <User size={12} />
                      {m.usuario_asignado_nombre}
                    </span>
                  )}
                </div>

                <div className="mantenimiento-actions">
                  <button 
                    className="btn-action edit"
                    onClick={() => onEditMantenimiento(m)}
                    title="Editar"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    className="btn-action delete"
                    onClick={() => onDeleteMantenimiento(m.id)}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
