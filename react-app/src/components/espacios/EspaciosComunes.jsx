import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { espaciosComunesService, usuariosService } from '../../services/api';
import { useEdificios } from '../../hooks/useHabitaciones';
import { Search, Filter, Building, Plus, RefreshCw, Wrench, Edit, Trash2, X, Save, Clock, Calendar, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import './EspaciosComunes.css';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'mantenimiento', label: 'En mantenimiento' },
  { value: 'fuera_servicio', label: 'Fuera de servicio' },
];

const TIPOS = [
  { value: 'normal', label: 'Normal' },
  { value: 'rutina', label: 'Rutina' },
];

const PRIORIDADES = [
  { value: 'alta', label: 'Alta', color: 'danger' },
  { value: 'media', label: 'Media', color: 'warning' },
  { value: 'baja', label: 'Baja', color: 'success' },
];

export default function EspaciosComunes() {
  const [filtroEdificio, setFiltroEdificio] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [selectedEspacio, setSelectedEspacio] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedMantenimiento, setSelectedMantenimiento] = useState(null);

  const queryClient = useQueryClient();
  const { data: edificios = [] } = useEdificios();
  
  const { data: espacios = [], isLoading, refetch } = useQuery({
    queryKey: ['espacios-comunes'],
    queryFn: async () => {
      const response = await espaciosComunesService.getAll();
      return response.data;
    },
  });

  const { data: mantenimientos = [] } = useQuery({
    queryKey: ['mantenimientos-espacios'],
    queryFn: async () => {
      const response = await espaciosComunesService.getMantenimientos();
      return response.data;
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-activos'],
    queryFn: async () => {
      const response = await usuariosService.getActivos();
      return response.data;
    },
  });

  const createMantenimiento = useMutation({
    mutationFn: (data) => espaciosComunesService.createMantenimiento(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimientos-espacios'] });
      queryClient.invalidateQueries({ queryKey: ['espacios-comunes'] });
      setShowModal(false);
      setSelectedMantenimiento(null);
    },
  });

  const espaciosFiltrados = useMemo(() => {
    return espacios.filter(e => {
      const matchEdificio = !filtroEdificio || e.edificio_id === parseInt(filtroEdificio);
      const matchEstado = !filtroEstado || e.estado === filtroEstado;
      const matchBusqueda = !busqueda || e.nombre?.toLowerCase().includes(busqueda.toLowerCase());
      return matchEdificio && matchEstado && matchBusqueda;
    });
  }, [espacios, filtroEdificio, filtroEstado, busqueda]);

  const espaciosAgrupados = useMemo(() => {
    const grupos = {};
    espaciosFiltrados.forEach(e => {
      const edificio = e.edificio_nombre || 'Sin edificio';
      if (!grupos[edificio]) grupos[edificio] = [];
      grupos[edificio].push(e);
    });
    return grupos;
  }, [espaciosFiltrados]);

  const mantenimientosPorEspacio = useMemo(() => {
    const mapa = {};
    mantenimientos.forEach(m => {
      if (!mapa[m.espacio_comun_id]) mapa[m.espacio_comun_id] = [];
      mapa[m.espacio_comun_id].push(m);
    });
    return mapa;
  }, [mantenimientos]);

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    try {
      return format(parseISO(fecha), "d MMM yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleOpenModal = (espacio, mantenimiento = null) => {
    setSelectedEspacio(espacio);
    setSelectedMantenimiento(mantenimiento);
    setShowModal(true);
  };

  const handleSaveMantenimiento = (formData) => {
    createMantenimiento.mutate({
      ...formData,
      espacio_comun_id: selectedEspacio.id,
    });
  };

  return (
    <div className="espacios-container">
      <div className="espacios-header">
        <div className="header-title">
          <h1>Espacios Comunes</h1>
          <span className="badge">{espaciosFiltrados.length} espacios</span>
        </div>
        <button className="btn-refresh" onClick={() => refetch()}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="espacios-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar espacio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Building size={18} />
          <select value={filtroEdificio} onChange={(e) => setFiltroEdificio(e.target.value)}>
            <option value="">Todos los edificios</option>
            {edificios.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <Filter size={18} />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            {ESTADOS.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="skeleton-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="edificios-container">
          {Object.entries(espaciosAgrupados).map(([edificio, espaciosEdificio]) => (
            <div key={edificio} className="edificio-section">
              <h2 className="edificio-title">
                <Building size={20} />
                {edificio}
                <span className="espacios-count">{espaciosEdificio.length} espacios</span>
              </h2>
              <div className="espacios-grid">
                {espaciosEdificio.map(espacio => {
                  const mantPendientes = (mantenimientosPorEspacio[espacio.id] || [])
                    .filter(m => m.estado === 'pendiente' || m.estado === 'en_proceso');
                  
                  return (
                    <div key={espacio.id} className={clsx('espacio-card', `estado-${espacio.estado}`)}>
                      <div className="espacio-header">
                        <h3>{espacio.nombre}</h3>
                        <span className={clsx('estado-badge', espacio.estado)}>
                          {ESTADOS.find(e => e.value === espacio.estado)?.label || espacio.estado}
                        </span>
                      </div>
                      
                      {espacio.tipo && <span className="tipo-badge">{espacio.tipo}</span>}
                      
                      {mantPendientes.length > 0 && (
                        <div className="mantenimientos-count">
                          <Wrench size={14} />
                          {mantPendientes.length} mantenimiento(s)
                        </div>
                      )}

                      <button 
                        className="btn-add"
                        onClick={() => handleOpenModal(espacio)}
                      >
                        <Plus size={16} />
                        Agregar mantenimiento
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {Object.keys(espaciosAgrupados).length === 0 && (
            <div className="empty-state">
              <Building size={48} />
              <h3>No se encontraron espacios</h3>
              <p>Intenta ajustar los filtros de busqueda</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <MantenimientoEspacioModal
          espacio={selectedEspacio}
          mantenimiento={selectedMantenimiento}
          usuarios={usuarios}
          onSave={handleSaveMantenimiento}
          onClose={() => {
            setShowModal(false);
            setSelectedMantenimiento(null);
          }}
          isLoading={createMantenimiento.isPending}
        />
      )}
    </div>
  );
}

function MantenimientoEspacioModal({ espacio, mantenimiento, usuarios, onSave, onClose, isLoading }) {
  const [formData, setFormData] = useState({
    descripcion: mantenimiento?.descripcion || '',
    tipo: mantenimiento?.tipo || 'normal',
    prioridad: mantenimiento?.prioridad || 'media',
    estado: mantenimiento?.estado || 'pendiente',
    dia_alerta: mantenimiento?.dia_alerta ? mantenimiento.dia_alerta.split('T')[0] : '',
    hora: mantenimiento?.hora ? mantenimiento.hora.slice(0, 5) : '',
    usuario_asignado_id: mantenimiento?.usuario_asignado_id || '',
    notas: mantenimiento?.notas || '',
    estado_espacio: '',
  });

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
            Nuevo Mantenimiento
            <span className="espacio-badge">{espacio?.nombre}</span>
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
              <select name="tipo" value={formData.tipo} onChange={handleChange}>
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
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
              <label>Asignar a</label>
              <select name="usuario_asignado_id" value={formData.usuario_asignado_id} onChange={handleChange}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>

            {formData.tipo === 'rutina' && (
              <>
                <div className="form-group">
                  <label>Fecha alerta</label>
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
              </>
            )}
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              placeholder="Notas adicionales..."
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
                  Crear mantenimiento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
