export const ESTADOS_CUARTO = {
  disponible: { label: 'Disponible', color: 'success' },
  ocupado: { label: 'Ocupado', color: 'info' },
  mantenimiento: { label: 'En Mantenimiento', color: 'warning' },
  fuera_servicio: { label: 'Fuera de Servicio', color: 'danger' },
};

export const ESTADOS_MANTENIMIENTO = {
  pendiente: { label: 'Pendiente', color: 'default' },
  en_proceso: { label: 'En Proceso', color: 'info' },
  completado: { label: 'Completado', color: 'success' },
  cancelado: { label: 'Cancelado', color: 'danger' },
};

export const ESTADOS_TAREA = {
  pendiente: { label: 'Pendiente', color: 'default' },
  en_proceso: { label: 'En Proceso', color: 'info' },
  completado: { label: 'Completado', color: 'success' },
  cancelado: { label: 'Cancelado', color: 'danger' },
};

export const PRIORIDADES = {
  alta: { label: 'Alta', color: 'danger' },
  media: { label: 'Media', color: 'warning' },
  baja: { label: 'Baja', color: 'success' },
};

export const ROLES = {
  admin: { label: 'Administrador', color: 'primary' },
  supervisor: { label: 'Supervisor', color: 'info' },
  tecnico: { label: 'Tecnico', color: 'default' },
};

export const TIPOS_ESPACIO = {
  comun: 'Areas Comunes',
  recreativo: 'Recreacion',
  eventos: 'Eventos',
  servicios: 'Servicios',
};

export const ESTADOS_CHECKLIST = {
  pendiente: { label: 'Pendiente', color: 'default' },
  ok: { label: 'OK', color: 'success' },
  reparacion: { label: 'Reparacion', color: 'warning' },
  requiere_atencion: { label: 'Requiere Atencion', color: 'danger' },
};

export const TIPOS_MANTENIMIENTO = {
  rutina: 'Rutina',
  normal: 'Normal',
  correctivo: 'Correctivo',
  preventivo: 'Preventivo',
};

export const FILE_TYPES = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  all: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const ITEMS_PER_PAGE = {
  default: 10,
  compact: 20,
  large: 50,
};

export const STORAGE_KEYS = {
  theme: 'theme',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  currentUser: 'currentUser',
  tokenType: 'tokenType',
  filterPrefs: 'filterPrefs',
};
