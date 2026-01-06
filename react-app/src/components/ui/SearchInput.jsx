import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';
import './SearchInput.css';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  debounce = 300,
  className = '',
}) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounce);

    return () => clearTimeout(timer);
  }, [localValue, debounce, onChange, value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={clsx('search-input-wrapper', className)}>
      <Search size={18} className="search-icon" />
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
      />
      {localValue && (
        <button className="search-clear" onClick={handleClear} type="button">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function useSearch(initialValue = '') {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  const filterItems = useCallback((items, fields) => {
    if (!searchTerm) return items;
    
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      fields.some(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item);
        return value?.toString().toLowerCase().includes(term);
      })
    );
  }, [searchTerm]);

  return { searchTerm, setSearchTerm, filterItems };
}
