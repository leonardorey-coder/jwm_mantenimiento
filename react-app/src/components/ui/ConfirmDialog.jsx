import { AlertTriangle } from 'lucide-react';
import Modal, { ModalFooter } from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar accion',
  message = 'Esta seguro de realizar esta accion?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="small" showClose={false}>
      <div className="confirm-dialog">
        <div className={`confirm-icon ${variant}`}>
          <AlertTriangle size={32} />
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
      </div>
      <ModalFooter>
        <button className="btn-cancel" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </button>
        <button 
          className={`btn-confirm btn-${variant}`} 
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading-spinner-small"></span>
          ) : (
            confirmText
          )}
        </button>
      </ModalFooter>
      <style>{`
        .confirm-dialog {
          text-align: center;
          padding: 1rem 0;
        }
        .confirm-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .confirm-icon.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-peligro);
        }
        .confirm-icon.warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--color-advertencia);
        }
        .confirm-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .confirm-message {
          color: var(--texto-secundario);
          font-size: 0.875rem;
        }
        .btn-confirm {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: var(--radio-md);
          font-weight: 500;
          font-size: 0.875rem;
          color: white;
          min-width: 100px;
        }
        .btn-confirm.btn-danger {
          background: var(--color-peligro);
        }
        .btn-confirm.btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }
        .btn-confirm.btn-warning {
          background: var(--color-advertencia);
        }
        .btn-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </Modal>
  );
}
