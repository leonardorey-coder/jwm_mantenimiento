import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tareasService, usuariosService } from '../../services/api';
import { Search, Filter, Plus, RefreshCw, Edit, Trash2, Paperclip, X, Save, Calendar, User, Tag, MapPin, Clock, CheckCircle, AlertCircle, Circle } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import './Tareas.css';

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente', icon: Circle, color: 'default' },
  { value: 'en_proceso', label: 'En proceso', icon: Clock, color: 'info' },
  { value: 'completado', label: 'Completado', icon: CheckCircle, color: 'success' },
  { value: 'cancelado', label: 'Cancelado', icon: AlertCircle, color: 'danger' },
];

const PRIORIDADES = [
  { value: '', label: 'Todas' },
  { value: 'alta', label: 'Alta', color: 'danger' },
  { value: 'media', label: 'Media', color: 'warning' },
  { value: 'baja', label: 'Baja', color: 'success' },
];

export default function Tareas() {
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState(null);

  const queryClient = useQueryClient();

  const { data: tareas = [], isLoading, refetch } = useQuery({
    queryKey: ['tareas', { estado: filtroEstado, prioridad: filtroPrioridad }],
    queryFn: async () => {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroPrioridad) params.prioridad = filtroPrioridad;
      const response = await tareasService.getAll(params);
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

  const createTarea = useMutation({
    mutationFn: (data) => tareasService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      setShowModal(false);
      setSelectedTarea(null);
    },
  });

  const updateTarea = useMutation({
    mutationFn: ({ id, data }) => tareasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      setShowModal(false);
      setSelectedTarea(null);
    },
  });

  const deleteTarea = useMutation({
    mutationFn: (id) => tareasService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
    },
  });

  const tareasFiltradas = useMemo(() => {
    return tareas.filter(t => {
      const matchBusqueda = !busqueda || 
        t.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
      return matchBusqueda;
    });
  }, [tareas, busqueda]);

  const tareasAgrupadas = useMemo(() => {
    const grupos = {
      vencidas: [],
      hoy: [],
      proximamente: [],
      sinFecha: [],
      completadas: [],
    };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = addDays(hoy, 1);
    const enUnaSemana = addDays(hoy, 7);

    tareasFiltradas.forEach(t => {
      if (t.estado === 'completado' || t.estado === 'cancelado') {
        grupos.completadas.push(t);
      } else if (!t.fecha_vencimiento) {
        grupos.sinFecha.push(t);
      } else {
        const fechaVenc = parseISO(t.fecha_vencimiento);
        if (isBefore(fechaVenc, hoy)) {
          grupos.vencidas.push(t);
        } else if (isBefore(fechaVenc, manana)) {
          grupos.hoy.push(t);
        } else if (isBefore(fechaVenc, enUnaSemana)) {
          grupos.proximamente.push(t);
        } else {
          grupos.sinFecha.push(t);
        }
      }
    });

    return grupos;
  }, [tareasFiltradas]);

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    try {
      return format(parseISO(fecha), "d MMM yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleOpenModal = (tarea = null) => {
    setSelectedTarea(tarea);
    setShowModal(true);
  };

  const handleSaveTarea = (formData) => {
    if (selectedTarea) {
      updateTarea.mutate({ id: selectedTarea.id, data: formData });
    } else {
      createTarea.mutate(formData);
    }
  };

  const handleDeleteTarea = (id) => {
    if (confirm('Estas seguro de eliminar esta tarea?')) {
      deleteTarea.mutate(id);
    }
  };

  const handleToggleEstado = (tarea) => {
    const nuevoEstado = tarea.estado === 'completado' ? 'pendiente' : 'completado';
    updateTarea.mutate({ id: tarea.id, data: { estado: nuevoEstado } });
  };

  return (
    <div className="tareas-container">
      <div className="tareas-header">
        <div className="header-title">
          <h1>Tareas</h1>
          <span className="badge">{tareasFiltradas.length} tareas</span>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={() => refetch()}>
            <RefreshCw size={18} />
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            Nueva Tarea
          </button>
        </div>
      </div>

      <div className="tareas-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={18} />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            {ESTADOS.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <Tag size={18} />
          <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
            {PRIORIDADES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="skeleton-list">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-item"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="tareas-timeline">
          {tareasAgrupadas.vencidas.length > 0 && (
            <TareaGroup
              title="Vencidas"
              tareas={tareasAgrupadas.vencidas}
              className="vencidas"
              onEdit={handleOpenModal}
              onDelete={handleDeleteTarea}
              onToggle={handleToggleEstado}
              formatFecha={formatFecha}
            />
          )}

          {tareasAgrupadas.hoy.length > 0 && (
            <TareaGroup
              title="Hoy"
              tareas={tareasAgrupadas.hoy}
              className="hoy"
              onEdit={handleOpenModal}
              onDelete={handleDeleteTarea}
              onToggle={handleToggleEstado}
              formatFecha={formatFecha}
            />
          )}

          {tareasAgrupadas.proximamente.length > 0 && (
            <TareaGroup
              title="Proximamente"
              tareas={tareasAgrupadas.proximamente}
              className="proximamente"
              onEdit={handleOpenModal}
              onDelete={handleDeleteTarea}
              onToggle={handleToggleEstado}
              formatFecha={formatFecha}
            />
          )}

          {tareasAgrupadas.sinFecha.length > 0 && (
            <TareaGroup
              title="Sin fecha"
              tareas={tareasAgrupadas.sinFecha}
              className="sin-fecha"
              onEdit={handleOpenModal}
              onDelete={handleDeleteTarea}
              onToggle={handleToggleEstado}
              formatFecha={formatFecha}
            />
          )}

          {tareasAgrupadas.completadas.length > 0 && (
            <TareaGroup
              title="Completadas"
              tareas={tareasAgrupadas.completadas}
              className="completadas"
              onEdit={handleOpenModal}
              onDelete={handleDeleteTarea}
              onToggle={handleToggleEstado}
              formatFecha={formatFecha}
              collapsed
            />
          )}

          {tareasFiltradas.length === 0 && (
            <div className="empty-state">
              <CheckCircle size={48} />
              <h3>No hay tareas</h3>
              <p>Crea una nueva tarea para comenzar</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <TareaModal
          tarea={selectedTarea}
          usuarios={usuarios}
          onSave={handleSaveTarea}
          onClose={() => {
            setShowModal(false);
            setSelectedTarea(null);
          }}
          isLoading={createTarea.isPending || updateTarea.isPending}
        />
      )}
    </div>
  );
}

function TareaGroup({ title, tareas, className, onEdit, onDelete, onToggle, formatFecha, collapsed = false }) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  return (
    <div className={clsx('tarea-group', className)}>
      <button className="group-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>{title}</h3>
        <span className="count">{tareas.length}</span>
      </button>

      {!isCollapsed && (
        <div className="tareas-list">
          {tareas.map(tarea => {
            const estadoConfig = ESTADOS.find(e => e.value === tarea.estado) || ESTADOS[1];
            const prioridadConfig = PRIORIDADES.find(p => p.value === tarea.prioridad) || PRIORIDADES[2];
            const EstadoIcon = estadoConfig.icon || Circle;

            return (
              <div key={tarea.id} className={clsx('tarea-card', `estado-${tarea.estado}`)}>
                <button 
                  className="tarea-checkbox"
                  onClick={() => onToggle(tarea)}
                >
                  <EstadoIcon size={20} className={estadoConfig.color} />
                </button>

                <div className="tarea-content">
                  <h4 className={clsx({ completada: tarea.estado === 'completado' })}>
                    {tarea.titulo}
                  </h4>
                  {tarea.descripcion && (
                    <p className="tarea-descripcion">{tarea.descripcion}</p>
                  )}
                  <div className="tarea-meta">
                    {tarea.fecha_vencimiento && (
                      <span className="meta-item">
                        <Calendar size={12} />
                        {formatFecha(tarea.fecha_vencimiento)}
                      </span>
                    )}
                    {tarea.asignado_nombre && (
                      <span className="meta-item">
                        <User size={12} />
                        {tarea.asignado_nombre}
                      </span>
                    )}
                    {tarea.ubicacion && (
                      <span className="meta-item">
                        <MapPin size={12} />
                        {tarea.ubicacion}
                      </span>
                    )}
                    <span className={clsx('prioridad-badge', prioridadConfig.color)}>
                      {prioridadConfig.label}
                    </span>
                  </div>
                </div>

                <div className="tarea-actions">
                  <button className="btn-action" onClick={() => onEdit(tarea)}>
                    <Edit size={16} />
                  </button>
                  <button className="btn-action delete" onClick={() => onDelete(tarea.id)}>
                    <Trash2 size={16} />
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

function TareaModal({ tarea, usuarios, onSave, onClose, isLoading }) {
  const [formData, setFormData] = useState({
    titulo: tarea?.titulo || '',
    descripcion: tarea?.descripcion || '',
    estado: tarea?.estado || 'pendiente',
    prioridad: tarea?.prioridad || 'media',
    fecha_limite: tarea?.fecha_vencimiento ? tarea.fecha_vencimiento.split('T')[0] : '',
    responsable_id: tarea?.asignado_a || '',
    ubicacion: tarea?.ubicacion || '',
    tags: tarea?.tags || [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo.trim()) {
      alert('El titulo es requerido');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{tarea ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Titulo *</label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Nombre de la tarea"
              required
            />
          </div>

          <div className="form-group">
            <label>Descripcion</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Descripcion detallada..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Estado</label>
              <select name="estado" value={formData.estado} onChange={handleChange}>
                {ESTADOS.filter(e => e.value).map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Prioridad</label>
              <div className="prioridad-selector">
                {PRIORIDADES.filter(p => p.value).map(p => (
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
              <label>Fecha limite</label>
              <input
                type="date"
                name="fecha_limite"
                value={formData.fecha_limite}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Responsable</label>
              <select name="responsable_id" value={formData.responsable_id} onChange={handleChange}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Ubicacion</label>
            <input
              type="text"
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
              placeholder="Ubicacion de la tarea"
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
                  {tarea ? 'Guardar cambios' : 'Crear tarea'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
