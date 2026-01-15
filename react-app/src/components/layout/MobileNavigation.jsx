import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bed, Building, ListTodo, Table, ClipboardCheck, Users } from 'lucide-react';

const navItems = [
  { path: '/habitaciones', label: 'Habitaciones', icon: Bed },
  { path: '/espacios', label: 'Espacios', icon: Building },
  { path: '/tareas', label: 'Tareas', icon: ListTodo },
  { path: '/sabana', label: 'Sabana', icon: Table },
  { path: '/checklist', label: 'Checklist', icon: ClipboardCheck },
  { path: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
];

export default function MobileNavigation() {
  const { isAdmin } = useAuth();

  return (
    <nav className="premium-nav-mobile">
      <div className="menu">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `link ${isActive ? 'active' : ''} ${item.adminOnly ? 'admin-only' : ''}`}
            >
              <div className="link-icon">
                <Icon size={18} />
              </div>
              <div className="link-title">
                <span>{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
