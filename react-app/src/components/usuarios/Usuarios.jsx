import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuariosService } from '../../services/api';
import { Search, Plus, RefreshCw, Edit, UserX, UserCheck, Unlock, X, Save, User, Mail, Shield, Building, Eye, EyeOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import './Usuarios.css';

export default function Usuarios() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [showInactivos, setShowInactivos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);

  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading, refetch } = useQuery({
    queryKey: ['usuarios-admin', showInactivos],
    queryFn: async () => {
      const response = await usuariosService.getAll(showInactivos);
      return response.data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await usuariosService.getRoles();
      return response.data;
    },
  });

  const createUsuario = useMutation({
    mutationFn: (data) => usuariosService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
      setShowModal(false);
      setSelectedUsuario(null);
    },
  });

  const updateUsuario = useMutation({
    mutationFn: ({ id, data }) => usuariosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
      setShowModal(false);
      setSelectedUsuario(null);
    },
  });

  const desactivarUsuario = useMutation({
    mutationFn: ({ id, motivo }) => usuariosService.desactivar(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
    },
  });

  const activarUsuario = useMutation({
    mutationFn: (id) => usuariosService.activar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
    },
  });

  const desbloquearUsuario = useMutation({
    mutationFn: (id) => usuariosService.desbloquear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
    },
  });

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const matchBusqueda = !busqueda || 
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase());
      const matchRol = !filtroRol || u.rol_id === parseInt(filtroRol);
      return matchBusqueda && matchRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  const formatFecha = (fecha) => {
    if (!fecha) return 'Nunca';
    try {
      return format(parseISO(fecha), "d MMM yyyy HH:mm", { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleOpenModal = (usuario = null) => {
    setSelectedUsuario(usuario);
    setShowModal(true);
  };

  const handleSaveUsuario = (formData) => {
    if (selectedUsuario) {
      updateUsuario.mutate({ id: selectedUsuario.id, data: formData });
    } else {
      createUsuario.mutate(formData);
    }
  };

  const handleDesactivar = (usuario) => {
    const motivo = prompt('Motivo de desactivacion:');
    if (motivo !== null) {
      desactivarUsuario.mutate({ id: usuario.id, motivo });
    }
  };

  const handleActivar = (usuario) => {
    if (confirm(`Activar usuario ${usuario.nombre}?`)) {
      activarUsuario.mutate(usuario.id);
    }
  };

  const handleDesbloquear = (usuario) => {
    if (confirm(`Desbloquear usuario ${usuario.nombre}?`)) {
      desbloquearUsuario.mutate(usuario.id);
    }
  };

  return (
    <div className="usuarios-container">
      <div className="usuarios-header">
        <div className="header-title">
          <h1>Gestion de Usuarios</h1>
          <span className="badge">{usuariosFiltrados.length} usuarios</span>
        </div>
        <div className="header-actions">
          <button 
            className={clsx('btn-toggle', { active: showInactivos })}
            onClick={() => setShowInactivos(!showInactivos)}
          >
            {showInactivos ? 'Ocultar inactivos' : 'Mostrar inactivos'}
          </button>
          <button className="btn-refresh" onClick={() => refetch()}>
            <RefreshCw size={18} />
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="usuarios-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Shield size={18} />
          <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="skeleton-list">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="usuarios-table-container">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Departamento</th>
                <th>Estado</th>
                <th>Ultimo acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map(usuario => (
                <tr key={usuario.id} className={clsx({ inactivo: !usuario.activo, bloqueado: usuario.bloqueado })}>
                  <td>
                    <div className="usuario-info">
                      <div className="avatar">
                        <User size={20} />
                      </div>
                      <span>{usuario.nombre}</span>
                    </div>
                  </td>
                  <td>{usuario.email}</td>
                  <td>
                    <span className={clsx('rol-badge', usuario.rol_nombre?.toLowerCase())}>
                      {usuario.rol_nombre}
                    </span>
                  </td>
                  <td>{usuario.departamento || '-'}</td>
                  <td>
                    {usuario.bloqueado ? (
                      <span className="estado-badge bloqueado">Bloqueado</span>
                    ) : usuario.activo ? (
                      <span className="estado-badge activo">Activo</span>
                    ) : (
                      <span className="estado-badge inactivo">Inactivo</span>
                    )}
                  </td>
                  <td>{formatFecha(usuario.ultimo_login)}</td>
                  <td>
                    <div className="acciones">
                      <button 
                        className="btn-action"
                        onClick={() => handleOpenModal(usuario)}
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      
                      {usuario.bloqueado && (
                        <button 
                          className="btn-action unlock"
                          onClick={() => handleDesbloquear(usuario)}
                          title="Desbloquear"
                        >
                          <Unlock size={16} />
                        </button>
                      )}
                      
                      {usuario.activo ? (
                        <button 
                          className="btn-action deactivate"
                          onClick={() => handleDesactivar(usuario)}
                          title="Desactivar"
                        >
                          <UserX size={16} />
                        </button>
                      ) : (
                        <button 
                          className="btn-action activate"
                          onClick={() => handleActivar(usuario)}
                          title="Activar"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {usuariosFiltrados.length === 0 && (
            <div className="empty-state">
              <User size={48} />
              <h3>No hay usuarios</h3>
              <p>No se encontraron usuarios con los filtros seleccionados</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <UsuarioModal
          usuario={selectedUsuario}
          roles={roles}
          onSave={handleSaveUsuario}
          onClose={() => {
            setShowModal(false);
            setSelectedUsuario(null);
          }}
          isLoading={createUsuario.isPending || updateUsuario.isPending}
        />
      )}
    </div>
  );
}

function UsuarioModal({ usuario, roles, onSave, onClose, isLoading }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    password: '',
    rol_id: usuario?.rol_id || '',
    departamento: usuario?.departamento || '',
    requiere_cambio_password: usuario ? usuario.requiere_cambio_password : true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }
    if (!formData.email.trim()) {
      alert('El email es requerido');
      return;
    }
    if (!usuario && !formData.password) {
      alert('La contrasena es requerida para nuevos usuarios');
      return;
    }
    if (!formData.rol_id) {
      alert('El rol es requerido');
      return;
    }

    const dataToSave = { ...formData };
    if (!dataToSave.password) {
      delete dataToSave.password;
    }
    
    onSave(dataToSave);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{usuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>
              <User size={16} />
              Nombre completo *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre del usuario"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Mail size={16} />
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="form-group">
            <label>
              Contrasena {usuario ? '(dejar vacio para no cambiar)' : '*'}
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={usuario ? '********' : 'Contrasena'}
                required={!usuario}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <Shield size={16} />
                Rol *
              </label>
              <select name="rol_id" value={formData.rol_id} onChange={handleChange} required>
                <option value="">Selecciona un rol</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <Building size={16} />
                Departamento
              </label>
              <input
                type="text"
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                placeholder="Departamento"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="requiere_cambio_password"
                checked={formData.requiere_cambio_password}
                onChange={handleChange}
              />
              <span>Requerir cambio de contrasena en primer inicio</span>
            </label>
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
                  {usuario ? 'Guardar cambios' : 'Crear usuario'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
