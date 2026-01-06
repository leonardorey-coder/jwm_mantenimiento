import { useState, useEffect } from 'react';
import { X, Save, Wrench, Clock, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const TIPOS = [
  { value: 'normal', label: 'Normal', icon: Wrench },
  { value: 'rutina', label: 'Rutina programada', icon: Clock },
];

const PRIORIDADES = [
  { value: 'alta', label: 'Alta', color: 'danger' },
  { value: 'media', label: 'Media', color: 'warning' },
  { value: 'baja', label: 'Baja', color: 'success' },
];

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const ESTADOS_CUARTO = [
  { value: '', label: 'Sin cambio' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'mantenimiento', label: 'En mantenimiento' },
  { value: 'fuera_servicio', label: 'Fuera de servicio' },
];

export default function MantenimientoModal({ 
  cuarto, 
  mantenimiento, 
  usuarios = [], 
  onSave, 
  onClose,
  isLoading 
}) {
  const [formData, setFormData] = useState({
    descripcion: '',
    tipo: 'normal',
    prioridad: 'media',
    estado: 'pendiente',
    dia_alerta: '',
    hora: '',
    usuario_asignado_id: '',
    notas: '',
    estado_cuarto: '',
  });

  useEffect(() => {
    if (mantenimiento) {
      setFormData({
        descripcion: mantenimiento.descripcion || '',
        tipo: mantenimiento.tipo || 'normal',
        prioridad: mantenimiento.prioridad || 'media',
        estado: mantenimiento.estado || 'pendiente',
        dia_alerta: mantenimiento.dia_alerta ? mantenimiento.dia_alerta.split('T')[0] : '',
        hora: mantenimiento.hora ? mantenimiento.hora.slice(0, 5) : '',
        usuario_asignado_id: mantenimiento.usuario_asignado_id || '',
        notas: mantenimiento.notas || '',
        estado_cuarto: '',
      });
    }
  }, [mantenimiento]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) {
      alert('La descripcion es requerida');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mantenimiento ? 'Editar' : 'Nuevo'} Mantenimiento
            <span className="cuarto-badge">Hab. {cuarto?.numero || cuarto?.nombre}</span>
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Descripcion *</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe el problema o tarea..."
              rows={3}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <div className="tipo-selector">
                {TIPOS.map(tipo => {
                  const Icon = tipo.icon;
                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      className={clsx('tipo-btn', { active: formData.tipo === tipo.value })}
                      onClick={() => setFormData(prev => ({ ...prev, tipo: tipo.value }))}
                    >
                      <Icon size={16} />
                      {tipo.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Prioridad</label>
              <div className="prioridad-selector">
                {PRIORIDADES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    className={clsx('prioridad-btn', p.color, { active: formData.prioridad === p.value })}
                    onClick={() => setFormData(prev => ({ ...prev, prioridad: p.value }))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Estado</label>
              <select name="estado" value={formData.estado} onChange={handleChange}>
                {ESTADOS.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Asignar a</label>
              <select name="usuario_asignado_id" value={formData.usuario_asignado_id} onChange={handleChange}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.tipo === 'rutina' && (
            <div className="form-row alerta-section">
              <div className="form-group">
                <label>
                  <Clock size={16} />
                  Fecha de alerta
                </label>
                <input
                  type="date"
                  name="dia_alerta"
                  value={formData.dia_alerta}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Hora</label>
                <input
                  type="time"
                  name="hora"
                  value={formData.hora}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Cambiar estado de habitacion</label>
            <select name="estado_cuarto" value={formData.estado_cuarto} onChange={handleChange}>
              {ESTADOS_CUARTO.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Notas adicionales</label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              placeholder="Notas o comentarios adicionales..."
              rows={2}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save" disabled={isLoading}>
              {isLoading ? (
                <span className="loading-spinner-small"></span>
              ) : (
                <>
                  <Save size={18} />
                  {mantenimiento ? 'Guardar cambios' : 'Crear mantenimiento'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
