import { createContext, useContext, useState } from 'react';
import clsx from 'clsx';
import './Tabs.css';

const TabsContext = createContext(null);

export default function Tabs({
  defaultValue,
  value,
  onChange,
  children,
  className = '',
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;

  const handleChange = (newValue) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onChange: handleChange }}>
      <div className={clsx('tabs', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }) {
  return (
    <div className={clsx('tabs-list', className)} role="tablist">
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  icon: Icon,
  disabled = false,
  className = '',
}) {
  const context = useContext(TabsContext);
  const isActive = context?.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      className={clsx('tabs-trigger', { active: isActive, disabled }, className)}
      onClick={() => context?.onChange(value)}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '' }) {
  const context = useContext(TabsContext);
  
  if (context?.value !== value) return null;

  return (
    <div role="tabpanel" className={clsx('tabs-content', className)}>
      {children}
    </div>
  );
}
