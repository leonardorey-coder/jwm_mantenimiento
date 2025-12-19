import { useState, useRef, useEffect } from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import './Dropdown.css';

export default function Dropdown({
  trigger,
  children,
  align = 'left',
  variant = 'default',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={clsx('dropdown', className)} ref={dropdownRef}>
      <button
        type="button"
        className={clsx('dropdown-trigger', `trigger-${variant}`)}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {trigger || <MoreVertical size={18} />}
      </button>

      {isOpen && (
        <div className={clsx('dropdown-menu', `align-${align}`)}>
          {typeof children === 'function' ? children(() => setIsOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  icon: Icon,
  onClick,
  variant = 'default',
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={clsx('dropdown-item', `item-${variant}`, { disabled })}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="dropdown-divider" />;
}

export function DropdownHeader({ children }) {
  return <div className="dropdown-header">{children}</div>;
}
