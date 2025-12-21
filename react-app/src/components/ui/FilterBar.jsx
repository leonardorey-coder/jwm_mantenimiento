import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import './FilterBar.css';

export default function FilterBar({
  children,
  collapsible = true,
  defaultOpen = true,
  title = 'Filtros',
  className = '',
  onClear,
  hasActiveFilters = false,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={clsx('filter-bar', className, { collapsed: !isOpen })}>
      {collapsible && (
        <button 
          className="filter-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter size={16} />
          <span>{title}</span>
          {hasActiveFilters && <span className="filter-badge" />}
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
      
      {isOpen && (
        <div className="filter-content">
          {children}
          {onClear && hasActiveFilters && (
            <button className="filter-clear" onClick={onClear}>
              <X size={14} />
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterGroup({ children, className = '' }) {
  return (
    <div className={clsx('filter-group', className)}>
      {children}
    </div>
  );
}
