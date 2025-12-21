import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sabanasService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Plus, RefreshCw, Archive, Check, X, Save, Table, Calendar, User, Building, FileText, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import './Sabana.css';

const SERVICIOS = [
  { id: 'mantenimiento', nombre: 'Mantenimiento' },
  { id: 'ama_de_llaves', nombre: 'Ama de Llaves' },
  { id: 'limpieza', nombre: 'Limpieza' },
  { id: 'inspeccion', nombre: 'Inspeccion' },
];

export default function Sabana() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroServicio, setFiltroServicio] = useState('');
  const [showArchivadas, setShowArchivadas] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedSabana, setSelectedSabana] = useState(null);
  const [expandedSabana, setExpandedSabana] = useState(null);

  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: sabanas = [], isLoading, refetch } = useQuery({
    queryKey: ['sabanas', showArchivadas],
    queryFn: async () => {
      const response = await sabanasService.getAll(showArchivadas);
      return response.data;
    },
  });

  const { data: archivadas = [] } = useQuery({
    queryKey: ['sabanas-archivadas'],
    queryFn: async () => {
      const response = await sabanasService.getArchivadas();
      return response.data;
    },
    enabled: showArchivadas,
  });

  const createSabana = useMutation({
    mutationFn: (data) => sabanasService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sabanas'] });
      setShowModal(false);
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, data }) => sabanasService.updateItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sabanas'] });
    },
  });

  const archivarSabana = useMutation({
    mutationFn: (id) => sabanasService.archivar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sabanas'] });
      queryClient.invalidateQueries({ queryKey: ['sabanas-archivadas'] });
    },
  });

  const sabanasFiltradas = useMemo(() => {
    const lista = showArchivadas ? archivadas : sabanas;
    return lista.filter(s => {
      const matchBusqueda = !busqueda || s.nombre?.toLowerCase().includes(busqueda.toLowerCase());
      const matchServicio = !filtroServicio || s.servicio_id === filtroServicio;
      return matchBusqueda && matchServicio;
    });
  }, [sabanas, archivadas, showArchivadas, busqueda, filtroServicio]);

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    try {
      return format(parseISO(fecha), "d MMM yyyy HH:mm", { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleToggleItem = async (itemId, realizado) => {
    await updateItem.mutateAsync({ itemId, data: { realizado: !realizado } });
  };

  const handleUpdateObservacion = async (itemId, observaciones) => {
    await updateItem.mutateAsync({ itemId, data: { observaciones } });
  };

  const handleArchivar = async (id) => {
    if (confirm('Estas seguro de archivar esta sabana?')) {
      await archivarSabana.mutateAsync(id);
    }
  };

  const handleCreateSabana = (formData) => {
    createSabana.mutate(formData);
  };

  return (
    <div className="sabana-container">
      <div className="sabana-header">
        <div className="header-title">
          <h1>Sabanas de Control</h1>
          <span className="badge">{sabanasFiltradas.length} sabanas</span>
        </div>
        <div className="header-actions">
          <button 
            className={clsx('btn-toggle', { active: showArchivadas })}
            onClick={() => setShowArchivadas(!showArchivadas)}
          >
            <Archive size={18} />
            {showArchivadas ? 'Ver activas' : 'Ver archivadas'}
          </button>
          <button className="btn-refresh" onClick={() => refetch()}>
            <RefreshCw size={18} />
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Nueva Sabana
          </button>
        </div>
      </div>

      <div className="sabana-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar sabana..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Table size={18} />
          <select value={filtroServicio} onChange={(e) => setFiltroServicio(e.target.value)}>
            <option value="">Todos los servicios</option>
            {SERVICIOS.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="skeleton-list">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-card large"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="sabanas-list">
          {sabanasFiltradas.map(sabana => {
            const totalItems = sabana.items?.length || 0;
            const completados = sabana.items?.filter(i => i.realizado).length || 0;
            const progreso = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;
            const isExpanded = expandedSabana === sabana.id;

            return (
              <div key={sabana.id} className={clsx('sabana-card', { archivada: sabana.archivada })}>
                <div className="sabana-card-header" onClick={() => setExpandedSabana(isExpanded ? null : sabana.id)}>
                  <div className="sabana-info">
                    <h3>{sabana.nombre}</h3>
                    <div className="sabana-meta">
                      <span className="meta-item">
                        <FileText size={14} />
                        {SERVICIOS.find(s => s.id === sabana.servicio_id)?.nombre || sabana.servicio_nombre}
                      </span>
                      <span className="meta-item">
                        <Calendar size={14} />
                        {formatFecha(sabana.fecha_creacion)}
                      </span>
                      {sabana.usuario_creador_nombre && (
                        <span className="meta-item">
                          <User size={14} />
                          {sabana.usuario_creador_nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sabana-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progreso}%` }}></div>
                    </div>
                    <span className="progress-text">{completados}/{totalItems} ({progreso}%)</span>
                  </div>

                  <div className="sabana-actions">
                    {isAdmin && !sabana.archivada && (
                      <button 
                        className="btn-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchivar(sabana.id);
                        }}
                        title="Archivar"
                      >
                        <Archive size={16} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && sabana.items && (
                  <div className="sabana-items">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Habitacion</th>
                          <th>Edificio</th>
                          <th>Estado</th>
                          <th>Responsable</th>
                          <th>Observaciones</th>
                          <th>Realizado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sabana.items.map(item => (
                          <tr key={item.id} className={clsx({ realizado: item.realizado })}>
                            <td className="habitacion">{item.habitacion}</td>
                            <td>{item.edificio}</td>
                            <td>
                              <span className={clsx('estado-badge', item.realizado ? 'completado' : 'pendiente')}>
                                {item.realizado ? 'Completado' : 'Pendiente'}
                              </span>
                            </td>
                            <td>{item.responsable || '-'}</td>
                            <td>
                              <input
                                type="text"
                                className="observacion-input"
                                defaultValue={item.observaciones || ''}
                                placeholder="Agregar observacion..."
                                onBlur={(e) => {
                                  if (e.target.value !== (item.observaciones || '')) {
                                    handleUpdateObservacion(item.id, e.target.value);
                                  }
                                }}
                                disabled={sabana.archivada}
                              />
                            </td>
                            <td>
                              <button
                                className={clsx('btn-check', { checked: item.realizado })}
                                onClick={() => handleToggleItem(item.id, item.realizado)}
                                disabled={sabana.archivada}
                              >
                                <Check size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {sabanasFiltradas.length === 0 && (
            <div className="empty-state">
              <Table size={48} />
              <h3>No hay sabanas</h3>
              <p>{showArchivadas ? 'No hay sabanas archivadas' : 'Crea una nueva sabana para comenzar'}</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CrearSabanaModal
          servicios={SERVICIOS}
          onSave={handleCreateSabana}
          onClose={() => setShowModal(false)}
          isLoading={createSabana.isPending}
        />
      )}
    </div>
  );
}

function CrearSabanaModal({ servicios, onSave, onClose, isLoading }) {
  const [formData, setFormData] = useState({
    nombre: '',
    servicio_id: '',
    servicio_nombre: '',
    notas: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'servicio_id') {
      const servicio = servicios.find(s => s.id === value);
      setFormData(prev => ({
        ...prev,
        servicio_id: value,
        servicio_nombre: servicio?.nombre || '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }
    if (!formData.servicio_id) {
      alert('El servicio es requerido');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva Sabana de Control</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nombre de la sabana *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Inspeccion Mensual Enero 2025"
              required
            />
          </div>

          <div className="form-group">
            <label>Servicio *</label>
            <select name="servicio_id" value={formData.servicio_id} onChange={handleChange} required>
              <option value="">Selecciona un servicio</option>
              {servicios.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <div className="form-info">
            <p>Se creara una sabana con todas las habitaciones registradas en el sistema.</p>
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
                  Crear sabana
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
