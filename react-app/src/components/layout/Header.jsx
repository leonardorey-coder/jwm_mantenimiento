import { useAuth } from '../../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="premium-header">
      <div className="header-content">
        <div className="header-left">
          <div className="user-info">
            <div>
              <span className="user-name">{user?.nombre || 'Usuario'}</span>
              <span className="user-role">{user?.rol_nombre || user?.rol || 'Rol'}</span>
            </div>
          </div>
        </div>

        <div className="header-center">
          <div className="logo">
            <img src="/logo_low.png" alt="JW Marriott Los Cabos" className="logo-high" />
          </div>
        </div>

        <div className="header-right">
          <button onClick={handleLogout} className="logout-btn" title="Cerrar sesion">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
