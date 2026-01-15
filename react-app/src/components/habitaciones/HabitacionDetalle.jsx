import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mantenimientosService, cuartosService } from '../../services/api';
import { useToast } from '../ui/Toast';
import Modal, { ModalFooter } from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import MantenimientoModal from './MantenimientoModal';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Bed, Wrench, Plus, Edit, Trash2, Calendar, User, 
  Clock, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import clsx from 'clsx';

const ESTADOS_CUARTO = {
  disponible: { label: 'Disponible', color: 'success', icon: Bed },
  ocupado: { label: 'Ocupado', color: 'info', icon: Bed },
  mantenimiento: { label: 'Mantenimiento', color: 'warning', icon: Wrench },
  fuera_servicio: { label: 'Fuera de servicio', color: 'danger', icon: AlertTriangle },
};

const ESTADOS_MANT = {
  pendiente: { label: 'Pendiente', icon: Clock },
  en_proceso: { label: 'En proceso', icon: Wrench },
  completado: { label: 'Completado', icon: CheckCircle },
  cancelado: { label: 'Cancelado', icon: XCircle },
};

const PRIORIDADES = {
  alta: { label: 'Alta', color: 'danger' },
  media: { label: 'Media', color: 'warning' },
  baja: { label: 'Baja', color: 'success' },
};

export default function HabitacionDetalle({ cuarto, isOpen, onClose, usuarios = [] }) {
  const [showMantModal, setShowMantModal] = useState(false);
  const [selectedMant, setSelectedMant] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');

  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: mantenimientos = [], isLoading } = useQuery({
    queryKey: ['mantenimientos', cuarto?.id],
    queryFn: async () => {
      const response = await mantenimientosService.getAll(cuarto.id);
      return response.data;
    },
    enabled: !!cuarto?.id,
  });

  const updateCuarto = useMutation({
    mutationFn: ({ id, data }) => cuartosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuartos'] });
      toast.success('Estado actualizado');
    },
  });

  const createMant = useMutation({
    mutationFn: (data) => mantenimientosService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimientos', cuarto.id] });
      queryClient.invalidateQueries({ queryKey: ['cuartos'] });
      setShowMantModal(false);
      setSelectedMant(null);
      toast.success('Mantenimiento creado');
    },
  });

  const updateMant = useMutation({
    mutationFn: ({ id, data }) => mantenimientosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimientos', cuarto.id] });
      setShowMantModal(false);
      setSelectedMant(null);
      toast.success('Mantenimiento actualizado');
    },
  });

  const deleteMant = useMutation({
    mutationFn: (id) => mantenimientosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimientos', cuarto.id] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      setConfirmDelete(null);
      toast.success('Mantenimiento eliminado');
    },
  });

  const handleSaveMant = (data) => {
    if (selectedMant) {
      updateMant.mutate({ id: selectedMant.id, data });
    } else {
      createMant.mutate({ ...data, cuarto_id: cuarto.id });
    }
  };

  const handleChangeEstado = (estado) => {
    setNuevoEstado(estado);
    updateCuarto.mutate({ id: cuarto.id, data: { estado } });
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    try {
      return format(parseISO(fecha), "d MMM yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  if (!cuarto) return null;

  const estadoConfig = ESTADOS_CUARTO[cuarto.estado] || ESTADOS_CUARTO.disponible;
  const EstadoIcon = estadoConfig.icon;

  const mantPendientes = mantenimientos.filter(m => m.estado === 'pendiente' || m.estado === 'en_proceso');
  const mantCompletados = mantenimientos.filter(m => m.estado === 'completado' || m.estado === 'cancelado');

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={`Habitacion ${cuarto.numero || cuarto.nombre}`}
        size="large"
      >
        <div className="habitacion-detalle">
          <div className="detalle-header">
            <div className="header-info">
              <span className={clsx('estado-badge', estadoConfig.color)}>
                <EstadoIcon size={14} />
                {estadoConfig.label}
              </span>
              <span className="edificio">{cuarto.edificio_nombre}</span>
            </div>

            <div className="cambiar-estado">
              <label>Cambiar estado:</label>
              <select 
                value={nuevoEstado || cuarto.estado} 
                onChange={(e) => handleChangeEstado(e.target.value)}
              >
                {Object.entries(ESTADOS_CUARTO).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mantenimientos-section">
            <div className="section-header">
              <h4>
                <Wrench size={18} />
                Mantenimientos ({mantPendientes.length} pendientes)
              </h4>
              <button 
                className="btn-add"
                onClick={() => { setSelectedMant(null); setShowMantModal(true); }}
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>

            {isLoading ? (
              <p className="loading-text">Cargando mantenimientos...</p>
            ) : mantPendientes.length === 0 && mantCompletados.length === 0 ? (
              <p className="empty-text">No hay mantenimientos registrados</p>
            ) : (
              <>
                {mantPendientes.length > 0 && (
                  <div className="mant-group">
                    <h5>Pendientes</h5>
                    <ul className="mant-list">
                      {mantPendientes.map(m => (
                        <MantenimientoItem 
                          key={m.id}
                          mant={m}
                          onEdit={() => { setSelectedMant(m); setShowMantModal(true); }}
                          onDelete={() => setConfirmDelete(m)}
                          formatFecha={formatFecha}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {mantCompletados.length > 0 && (
                  <div className="mant-group completados">
                    <h5>Completados ({mantCompletados.length})</h5>
                    <ul className="mant-list">
                      {mantCompletados.slice(0, 5).map(m => (
                        <MantenimientoItem 
                          key={m.id}
                          mant={m}
                          onEdit={() => { setSelectedMant(m); setShowMantModal(true); }}
                          onDelete={() => setConfirmDelete(m)}
                          formatFecha={formatFecha}
                        />
                      ))}
                    </ul>
                    {mantCompletados.length > 5 && (
                      <p className="more-text">Y {mantCompletados.length - 5} mas...</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <ModalFooter>
          <button className="btn-cancel" onClick={onClose}>
            Cerrar
          </button>
        </ModalFooter>

        <style>{`
          .habitacion-detalle {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }
          .detalle-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
          }
          .header-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .edificio {
            font-size: 0.875rem;
            color: var(--texto-secundario);
          }
          .cambiar-estado {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .cambiar-estado label {
            font-size: 0.8125rem;
            color: var(--texto-secundario);
          }
          .cambiar-estado select {
            padding: 0.375rem 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radio-md);
            font-size: 0.8125rem;
          }
          .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          }
          .section-header h4 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
          }
          .btn-add {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.5rem 0.75rem;
            background: var(--negro-carbon);
            color: white;
            border-radius: var(--radio-md);
            font-size: 0.8125rem;
          }
          .mant-group {
            margin-bottom: 1.25rem;
          }
          .mant-group h5 {
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--texto-secundario);
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          .mant-group.completados {
            opacity: 0.7;
          }
          .mant-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .loading-text, .empty-text, .more-text {
            text-align: center;
            color: var(--texto-secundario);
            font-size: 0.875rem;
            padding: 1rem 0;
          }
        `}</style>
      </Modal>

      {showMantModal && (
        <MantenimientoModal
          cuarto={cuarto}
          mantenimiento={selectedMant}
          usuarios={usuarios}
          onSave={handleSaveMant}
          onClose={() => { setShowMantModal(false); setSelectedMant(null); }}
          isLoading={createMant.isPending || updateMant.isPending}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteMant.mutate(confirmDelete.id)}
        title="Eliminar mantenimiento"
        message={`Eliminar "${confirmDelete?.descripcion?.slice(0, 50)}..."?`}
        confirmText="Eliminar"
        isLoading={deleteMant.isPending}
      />
    </>
  );
}

function MantenimientoItem({ mant, onEdit, onDelete, formatFecha }) {
  const estadoConfig = ESTADOS_MANT[mant.estado] || ESTADOS_MANT.pendiente;
  const prioridadConfig = PRIORIDADES[mant.prioridad] || PRIORIDADES.media;
  const EstadoIcon = estadoConfig.icon;

  return (
    <li className="mant-item">
      <div className="mant-icon">
        <EstadoIcon size={16} />
      </div>
      <div className="mant-content">
        <div className="mant-header">
          <span className={clsx('tipo-badge', mant.tipo)}>
            {mant.tipo === 'rutina' ? 'Rutina' : 'Normal'}
          </span>
          <span className={clsx('prioridad-badge', prioridadConfig.color)}>
            {prioridadConfig.label}
          </span>
        </div>
        <p className="mant-descripcion">{mant.descripcion}</p>
        <div className="mant-meta">
          {mant.dia_alerta && (
            <span>
              <Calendar size={12} />
              {formatFecha(mant.dia_alerta)}
              {mant.hora && ` ${mant.hora.slice(0, 5)}`}
            </span>
          )}
          {mant.usuario_asignado_nombre && (
            <span>
              <User size={12} />
              {mant.usuario_asignado_nombre}
            </span>
          )}
        </div>
      </div>
      <div className="mant-actions">
        <button className="btn-action" onClick={onEdit} title="Editar">
          <Edit size={14} />
        </button>
        <button className="btn-action delete" onClick={onDelete} title="Eliminar">
          <Trash2 size={14} />
        </button>
      </div>
      <style>{`
        .mant-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--gris-claro);
          border-radius: var(--radio-md);
        }
        .mant-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-principal);
          border-radius: var(--radio-full);
          color: var(--texto-secundario);
          flex-shrink: 0;
        }
        .mant-content {
          flex: 1;
          min-width: 0;
        }
        .mant-header {
          display: flex;
          gap: 0.375rem;
          margin-bottom: 0.375rem;
        }
        .mant-descripcion {
          font-size: 0.8125rem;
          line-height: 1.4;
          margin-bottom: 0.375rem;
        }
        .mant-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: var(--texto-secundario);
        }
        .mant-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .mant-actions {
          display: flex;
          gap: 0.25rem;
          flex-shrink: 0;
        }
      `}</style>
    </li>
  );
}
