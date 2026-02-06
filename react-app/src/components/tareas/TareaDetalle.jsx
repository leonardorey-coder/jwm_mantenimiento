import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tareasService } from '../../services/api';
import { useToast } from '../ui/Toast';
import Modal, { ModalFooter } from '../ui/Modal';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, User, MapPin, Tag, Clock, CheckCircle, 
  Paperclip, Upload, Trash2, Download, FileText, 
  Image, File, X
} from 'lucide-react';
import clsx from 'clsx';

const ESTADOS = {
  pendiente: { label: 'Pendiente', color: 'default' },
  en_proceso: { label: 'En proceso', color: 'info' },
  completado: { label: 'Completado', color: 'success' },
  cancelado: { label: 'Cancelado', color: 'danger' },
};

const PRIORIDADES = {
  alta: { label: 'Alta', color: 'danger' },
  media: { label: 'Media', color: 'warning' },
  baja: { label: 'Baja', color: 'success' },
};

const FILE_ICONS = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileText,
  xlsx: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  default: File,
};

export default function TareaDetalle({ tarea, isOpen, onClose, onUpdate }) {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: adjuntos = [], isLoading: loadingAdjuntos } = useQuery({
    queryKey: ['tarea-adjuntos', tarea?.id],
    queryFn: async () => {
      const response = await tareasService.getAdjuntos(tarea.id);
      return response.data;
    },
    enabled: !!tarea?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('archivo', file);
      return tareasService.uploadAdjunto(tarea.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarea-adjuntos', tarea.id] });
      setSelectedFile(null);
      setShowUpload(false);
      toast.success('Archivo subido correctamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Error al subir archivo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (adjuntoId) => tareasService.deleteAdjunto(adjuntoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarea-adjuntos', tarea.id] });
      toast.success('Archivo eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar archivo');
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('El archivo no puede superar 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    await uploadMutation.mutateAsync(selectedFile);
    setUploading(false);
  };

  const handleDelete = (adjuntoId, nombre) => {
    if (confirm(`Eliminar ${nombre}?`)) {
      deleteMutation.mutate(adjuntoId);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    try {
      return format(parseISO(fecha), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (extension) => {
    const Icon = FILE_ICONS[extension?.toLowerCase()] || FILE_ICONS.default;
    return Icon;
  };

  if (!tarea) return null;

  const estadoConfig = ESTADOS[tarea.estado] || ESTADOS.pendiente;
  const prioridadConfig = PRIORIDADES[tarea.prioridad] || PRIORIDADES.media;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={tarea.titulo}
      size="large"
    >
      <div className="tarea-detalle">
        <div className="tarea-detalle-header">
          <span className={clsx('estado-badge', estadoConfig.color)}>
            {estadoConfig.label}
          </span>
          <span className={clsx('prioridad-badge', prioridadConfig.color)}>
            {prioridadConfig.label}
          </span>
        </div>

        {tarea.descripcion && (
          <div className="tarea-detalle-section">
            <p className="descripcion">{tarea.descripcion}</p>
          </div>
        )}

        <div className="tarea-detalle-info">
          <div className="info-item">
            <Calendar size={16} />
            <span>Fecha limite: {formatFecha(tarea.fecha_vencimiento)}</span>
          </div>
          {tarea.asignado_nombre && (
            <div className="info-item">
              <User size={16} />
              <span>Asignado a: {tarea.asignado_nombre}</span>
            </div>
          )}
          {tarea.ubicacion && (
            <div className="info-item">
              <MapPin size={16} />
              <span>Ubicacion: {tarea.ubicacion}</span>
            </div>
          )}
          {tarea.creado_por_nombre && (
            <div className="info-item">
              <User size={16} />
              <span>Creado por: {tarea.creado_por_nombre}</span>
            </div>
          )}
          {tarea.tags && tarea.tags.length > 0 && (
            <div className="info-item">
              <Tag size={16} />
              <div className="tags-list">
                {tarea.tags.map((tag, i) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="tarea-detalle-adjuntos">
          <div className="adjuntos-header">
            <h4>
              <Paperclip size={18} />
              Adjuntos ({adjuntos.length})
            </h4>
            <button 
              className="btn-upload"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload size={16} />
              Subir archivo
            </button>
          </div>

          {showUpload && (
            <div className="upload-zone">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className="upload-label">
                {selectedFile ? (
                  <div className="selected-file">
                    <File size={20} />
                    <span>{selectedFile.name}</span>
                    <span className="file-size">({formatBytes(selectedFile.size)})</span>
                    <button onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} />
                    <span>Arrastra un archivo o haz clic para seleccionar</span>
                    <span className="upload-hint">Maximo 50MB</span>
                  </>
                )}
              </label>
              {selectedFile && (
                <button 
                  className="btn-primary btn-sm"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? 'Subiendo...' : 'Subir archivo'}
                </button>
              )}
            </div>
          )}

          {loadingAdjuntos ? (
            <p className="loading-text">Cargando adjuntos...</p>
          ) : adjuntos.length === 0 ? (
            <p className="empty-text">No hay archivos adjuntos</p>
          ) : (
            <ul className="adjuntos-list">
              {adjuntos.map(adjunto => {
                const FileIcon = getFileIcon(adjunto.extension);
                return (
                  <li key={adjunto.id} className="adjunto-item">
                    <FileIcon size={20} className="adjunto-icon" />
                    <div className="adjunto-info">
                      <span className="adjunto-nombre">{adjunto.nombre_original}</span>
                      <span className="adjunto-meta">
                        {formatBytes(adjunto.tamano_bytes)}
                        {adjunto.subido_por_nombre && ` - ${adjunto.subido_por_nombre}`}
                      </span>
                    </div>
                    <div className="adjunto-actions">
                      <a 
                        href={adjunto.url || `/api/tareas/adjuntos/${adjunto.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-action"
                        title="Descargar"
                      >
                        <Download size={16} />
                      </a>
                      <button 
                        className="btn-action delete"
                        onClick={() => handleDelete(adjunto.id, adjunto.nombre_original)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ModalFooter>
        <button className="btn-cancel" onClick={onClose}>
          Cerrar
        </button>
        <button className="btn-primary" onClick={() => onUpdate(tarea)}>
          Editar tarea
        </button>
      </ModalFooter>

      <style>{`
        .tarea-detalle {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .tarea-detalle-header {
          display: flex;
          gap: 0.5rem;
        }
        .tarea-detalle-section .descripcion {
          color: var(--texto-secundario);
          line-height: 1.6;
        }
        .tarea-detalle-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--gris-claro);
          border-radius: var(--radio-md);
        }
        .info-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
        .info-item svg {
          color: var(--texto-secundario);
        }
        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        .tag {
          padding: 0.125rem 0.5rem;
          background: var(--bg-principal);
          border-radius: var(--radio-sm);
          font-size: 0.75rem;
        }
        .adjuntos-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .adjuntos-header h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
        }
        .btn-upload {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: var(--gris-claro);
          border-radius: var(--radio-md);
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .btn-upload:hover {
          background: var(--negro-carbon);
          color: white;
        }
        .upload-zone {
          padding: 1rem;
          border: 2px dashed var(--border-color);
          border-radius: var(--radio-md);
          text-align: center;
          margin-top: 0.75rem;
        }
        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          cursor: pointer;
          color: var(--texto-secundario);
        }
        .upload-hint {
          font-size: 0.75rem;
        }
        .selected-file {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--texto-principal);
        }
        .file-size {
          font-size: 0.75rem;
          color: var(--texto-secundario);
        }
        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.8125rem;
          margin-top: 0.75rem;
        }
        .loading-text, .empty-text {
          text-align: center;
          color: var(--texto-secundario);
          font-size: 0.875rem;
          padding: 1rem 0;
        }
        .adjuntos-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
        .adjunto-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--gris-claro);
          border-radius: var(--radio-md);
        }
        .adjunto-icon {
          color: var(--texto-secundario);
        }
        .adjunto-info {
          flex: 1;
          min-width: 0;
        }
        .adjunto-nombre {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .adjunto-meta {
          font-size: 0.75rem;
          color: var(--texto-secundario);
        }
        .adjunto-actions {
          display: flex;
          gap: 0.25rem;
        }
        .adjunto-actions .btn-action {
          text-decoration: none;
        }
      `}</style>
    </Modal>
  );
}
