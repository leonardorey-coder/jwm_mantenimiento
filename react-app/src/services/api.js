import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') || sessionStorage.getItem('tokenType') || 'Bearer';
    
    if (accessToken) {
      config.headers.Authorization = `${tokenType} ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
        
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
          
          if (response.data.success) {
            const { accessToken } = response.data.tokens;
            const isRemembered = localStorage.getItem('refreshToken') !== null;
            
            if (isRemembered) {
              localStorage.setItem('accessToken', accessToken);
            } else {
              sessionStorage.setItem('accessToken', accessToken);
            }
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  refresh: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
  me: () => api.get('/api/auth/me'),
  getContactoAdmin: () => api.get('/api/auth/contacto-admin'),
  solicitarAcceso: (data) => api.post('/api/auth/solicitar-acceso', data),
  cambiarPasswordObligatorio: (data) => api.post('/api/auth/cambiar-password-obligatorio', data),
};

export const edificiosService = {
  getAll: () => api.get('/api/edificios'),
};

export const cuartosService = {
  getAll: () => api.get('/api/cuartos'),
  getById: (id) => api.get(`/api/cuartos/${id}`),
  update: (id, data) => api.put(`/api/cuartos/${id}`, data),
};

export const mantenimientosService = {
  getAll: (cuartoId) => api.get('/api/mantenimientos', { params: cuartoId ? { cuarto_id: cuartoId } : {} }),
  create: (data) => api.post('/api/mantenimientos', data),
  update: (id, data) => api.put(`/api/mantenimientos/${id}`, data),
  delete: (id) => api.delete(`/api/mantenimientos/${id}`),
  marcarEmitida: (id) => api.patch(`/api/mantenimientos/${id}/emitir`),
};

export const alertasService = {
  getEmitidas: (fecha) => api.get('/api/alertas/emitidas', { params: fecha ? { fecha } : {} }),
  getPendientes: () => api.get('/api/alertas/pendientes'),
  marcarPasadas: () => api.post('/api/alertas/marcar-pasadas'),
};

export const espaciosComunesService = {
  getAll: (params = {}) => api.get('/api/espacios-comunes', { params }),
  getById: (id) => api.get(`/api/espacios-comunes/${id}`),
  create: (data) => api.post('/api/espacios-comunes', data),
  update: (id, data) => api.put(`/api/espacios-comunes/${id}`, data),
  delete: (id) => api.delete(`/api/espacios-comunes/${id}`),
  getMantenimientos: (espacioId) => api.get('/api/mantenimientos/espacios', { params: espacioId ? { espacio_comun_id: espacioId } : {} }),
  createMantenimiento: (data) => api.post('/api/mantenimientos/espacios', data),
  updateMantenimiento: (id, data) => api.put(`/api/mantenimientos/espacios/${id}`, data),
  deleteMantenimiento: (id) => api.delete(`/api/mantenimientos/espacios/${id}`),
};

export const tareasService = {
  getAll: (filters) => api.get('/api/tareas', { params: filters }),
  getById: (id) => api.get(`/api/tareas/${id}`),
  create: (data) => api.post('/api/tareas', data),
  update: (id, data) => api.put(`/api/tareas/${id}`, data),
  delete: (id) => api.delete(`/api/tareas/${id}`),
  getAdjuntos: (tareaId) => api.get(`/api/tareas/${tareaId}/adjuntos`),
  uploadAdjunto: (tareaId, formData) => api.post(`/api/tareas/${tareaId}/adjuntos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteAdjunto: (adjuntoId) => api.delete(`/api/tareas/adjuntos/${adjuntoId}`),
};

export const sabanasService = {
  getAll: (params = {}) => api.get('/api/sabanas', { params }),
  getById: (id) => api.get(`/api/sabanas/${id}`),
  create: (data) => api.post('/api/sabanas', data),
  update: (id, data) => api.put(`/api/sabanas/${id}`, data),
  delete: (id) => api.delete(`/api/sabanas/${id}`),
  updateItem: (sabanaId, itemId, data) => api.patch(`/api/sabanas/${sabanaId}/items/${itemId}`, data),
  archivar: (id) => api.post(`/api/sabanas/${id}/archivar`),
  getArchivadas: () => api.get('/api/sabanas/archivadas'),
  getByServicio: (servicioId, params = {}) => api.get(`/api/sabanas/servicio/${servicioId}`, { params }),
};

export const checklistService = {
  getAll: (params = {}) => api.get('/api/checklist', { params }),
  getCategorias: () => api.get('/api/checklist/categorias'),
  createCategoria: (data) => api.post('/api/checklist/categorias', data),
  updateCategoria: (id, data) => api.put(`/api/checklist/categorias/${id}`, data),
  deleteCategoria: (id) => api.delete(`/api/checklist/categorias/${id}`),
  getItems: (categoriaId) => api.get('/api/checklist/items', { params: categoriaId ? { categoria_id: categoriaId } : {} }),
  createItem: (data) => api.post('/api/checklist/items', data),
  updateItem: (id, data) => api.put(`/api/checklist/items/${id}`, data),
  deleteItem: (id) => api.delete(`/api/checklist/items/${id}`),
  getByCuarto: (cuartoId) => api.get(`/api/checklist/cuartos/${cuartoId}`),
  getCuartos: (filters) => api.get('/api/checklist/cuartos', { params: filters }),
  getCuartoById: (id) => api.get(`/api/checklist/cuartos/${id}`),
  updateCuartoItem: (cuartoId, itemId, data) => api.put(`/api/checklist/cuartos/${cuartoId}/items/${itemId}`, data),
  updateItemsBulk: (cuartoId, items) => api.put(`/api/checklist/cuartos/${cuartoId}/items`, { items }),
  getResumen: (cuartoId) => api.get(`/api/checklist/cuartos/${cuartoId}/resumen`),
  getResumenGeneral: () => api.get('/api/checklist/resumen'),
  getFotos: (cuartoId) => api.get(`/api/checklist/cuartos/${cuartoId}/fotos`),
  uploadFoto: (cuartoId, formData) => api.post(`/api/checklist/cuartos/${cuartoId}/fotos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteFoto: (fotoId) => api.delete(`/api/checklist/fotos/${fotoId}`),
  getIconos: () => api.get('/api/checklist/iconos'),
};

export const usuariosService = {
  getAll: (params = {}) => api.get('/api/auth/usuarios', { params }),
  getById: (id) => api.get(`/api/usuarios/${id}`),
  getRoles: () => api.get('/api/usuarios/roles'),
  create: (data) => api.post('/api/usuarios', data),
  update: (id, data) => api.put(`/api/usuarios/${id}`, data),
  delete: (id) => api.delete(`/api/usuarios/${id}`),
  deactivate: (id, motivo) => api.post(`/api/usuarios/${id}/desactivar`, { motivo }),
  activate: (id) => api.post(`/api/usuarios/${id}/activar`),
  unlock: (id) => api.post(`/api/usuarios/${id}/desbloquear`),
  resetPassword: (id, password) => api.post(`/api/usuarios/${id}/reset-password`, { password }),
  getActivos: () => api.get('/api/usuarios'),
};

export default api;
