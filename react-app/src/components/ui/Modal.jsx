import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import './Modal.css';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'default',
  showClose = true,
  className = ''
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      const firstInput = modalRef.current?.querySelector('input, select, textarea');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        ref={modalRef}
        className={clsx('modal-content', `modal-${size}`, className)}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {(title || showClose) && (
          <div className="modal-header">
            {title && <h2 id="modal-title">{title}</h2>}
            {showClose && (
              <button className="btn-close" onClick={onClose} aria-label="Cerrar">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={clsx('modal-footer', className)}>
      {children}
    </div>
  );
}
