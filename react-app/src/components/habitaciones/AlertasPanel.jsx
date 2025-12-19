import { Bell, X, Clock, Bed, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AlertasPanel({ alertas, onMarcarEmitida, onClose }) {
  const formatFecha = (fecha) => {
    if (!fecha) return '';
    try {
      return format(parseISO(fecha), "d MMM yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  return (
    <div className="alertas-panel">
      <div className="alertas-header">
        <h3>
          <Bell size={20} />
          Alertas Pendientes
          <span className="count">{alertas.length}</span>
        </h3>
        <button className="btn-close-panel" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="alertas-list">
        {alertas.map(alerta => (
          <div key={alerta.id} className="alerta-item">
            <div className="alerta-icon">
              <Clock size={20} />
            </div>
            <div className="alerta-content">
              <div className="alerta-header">
                <span className="cuarto-info">
                  <Bed size={14} />
                  Hab. {alerta.cuarto_numero}
                </span>
                <span className="alerta-fecha">
                  {formatFecha(alerta.dia_alerta)}
                  {alerta.hora && ` - ${alerta.hora.slice(0, 5)}`}
                </span>
              </div>
              <p className="alerta-descripcion">{alerta.descripcion}</p>
              {alerta.edificio_nombre && (
                <span className="alerta-edificio">{alerta.edificio_nombre}</span>
              )}
            </div>
            <button 
              className="btn-marcar-emitida"
              onClick={() => onMarcarEmitida(alerta.id)}
              title="Marcar como atendida"
            >
              <CheckCircle size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
