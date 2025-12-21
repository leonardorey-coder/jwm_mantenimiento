import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Send, X, Shield, Key, Headphones } from 'lucide-react';
import { authService } from '../../services/api';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotForm, setForgotForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [adminContact, setAdminContact] = useState(null);
  
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeForm, setPasswordChangeForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordChangeError, setPasswordChangeError] = useState('');

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/habitaciones';

  useEffect(() => {
    if (isAuthenticated && !user?.requiere_cambio_password) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password, rememberMe);
    
    setIsLoading(false);

    if (result.success) {
      if (result.requirePasswordChange) {
        setShowPasswordChangeModal(true);
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setError(result.error);
    }
  };

  const handleForgotPassword = async () => {
    try {
      const response = await authService.getContactoAdmin();
      setAdminContact(response.data);
      setShowForgotModal(true);
    } catch (err) {
      setAdminContact({
        nombre: 'Administrador',
        email: 'admin@jwmarriott.com',
        telefono: ''
      });
      setShowForgotModal(true);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    try {
      await authService.solicitarAcceso({
        nombre: forgotForm.name,
        email: forgotForm.email,
        telefono: forgotForm.phone,
        comentarios: forgotForm.notes
      });
      alert('Solicitud enviada correctamente. El administrador se pondra en contacto contigo.');
      setShowForgotModal(false);
      setForgotForm({ name: '', email: '', phone: '', notes: '' });
    } catch (err) {
      alert('Error al enviar la solicitud. Por favor intenta de nuevo.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordChangeError('');

    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      setPasswordChangeError('Las contrasenas no coinciden');
      return;
    }

    if (passwordChangeForm.newPassword.length < 8) {
      setPasswordChangeError('La contrasena debe tener al menos 8 caracteres');
      return;
    }

    try {
      await authService.cambiarPasswordObligatorio({
        passwordActual: passwordChangeForm.currentPassword,
        nuevaPassword: passwordChangeForm.newPassword
      });
      setShowPasswordChangeModal(false);
      navigate(from, { replace: true });
    } catch (err) {
      setPasswordChangeError(err.response?.data?.mensaje || 'Error al cambiar la contrasena');
    }
  };

  return (
    <div className="login-body">
      <div className="login-container">
        <div className="login-logo-container">
          <img src="/logo_high.png" alt="JW Marriott Logo" className="login-logo" />
          <h1 className="login-title">SGSOM</h1>
          <p className="login-subtitle">
            Sistema de Gestion de Servicios, de Mantenimiento, Habitaciones y Espacios Comunes
          </p>
        </div>

        <div className="login-toggle">
          <button 
            className={`toggle-button ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Iniciar Sesion
          </button>
          <button 
            className={`toggle-button ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Registrarse
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} className="auth-form active">
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                Correo Electronico
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={16} />
                Contrasena
              </label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Recordarme</span>
              </label>
              <button type="button" className="forgot-password" onClick={handleForgotPassword}>
                Olvidaste tu contrasena?
              </button>
            </div>

            {error && <div className="auth-message error">{error}</div>}

            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? (
                <span className="loading-spinner-small"></span>
              ) : (
                <>
                  <Lock size={18} />
                  Iniciar Sesion
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="auth-form register-disabled">
            <div className="register-message-container">
              <div className="register-icon">
                <ShieldCheck size={48} />
              </div>
              <h3 className="register-message-title">Registro Restringido</h3>
              <p className="register-message-text">
                El registro de nuevos usuarios esta restringido por seguridad.
              </p>
              <p className="register-message-contact">
                Para solicitar acceso al sistema, por favor contacta al administrador:
              </p>
              <a href="mailto:fcruz@grupodiestra.com" className="register-admin-email">
                <Mail size={16} />
                fcruz@grupodiestra.com
              </a>
            </div>
          </div>
        )}

        <div className="login-footer">
          <p>&copy; 2025 JW Marriott Los Cabos. Todos los derechos reservados.</p>
        </div>
      </div>

      {showForgotModal && (
        <div className="forgot-password-modal active">
          <div className="forgot-card">
            <button className="forgot-close" onClick={() => setShowForgotModal(false)}>
              <X size={20} />
            </button>
            <div className="forgot-header">
              <div className="forgot-icon">
                <Key size={24} />
              </div>
              <div>
                <h3>Olvidaste tu contrasena?</h3>
                <p>Enviaremos tu solicitud al administrador para restablecer el acceso.</p>
              </div>
            </div>

            <form onSubmit={handleForgotSubmit} className="forgot-form">
              <label>
                <span>Nombre completo</span>
                <input
                  type="text"
                  value={forgotForm.name}
                  onChange={(e) => setForgotForm({ ...forgotForm, name: e.target.value })}
                  placeholder="Ej. Juan Leonardo Cruz"
                  required
                />
              </label>

              <label>
                <span>Correo corporativo</span>
                <input
                  type="email"
                  value={forgotForm.email}
                  onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })}
                  placeholder="correo@jwmarriott.com"
                  required
                />
              </label>

              <label>
                <span>Telefono o extension (opcional)</span>
                <input
                  type="text"
                  value={forgotForm.phone}
                  onChange={(e) => setForgotForm({ ...forgotForm, phone: e.target.value })}
                  placeholder="Ej. 624 237 0000"
                />
              </label>

              <label>
                <span>Comentarios para el administrador (opcional)</span>
                <textarea
                  value={forgotForm.notes}
                  onChange={(e) => setForgotForm({ ...forgotForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Agrega contexto para acelerar el soporte"
                />
              </label>

              {adminContact && (
                <div className="forgot-admin-card">
                  <div className="admin-icon">
                    <Headphones size={24} />
                  </div>
                  <div className="admin-contact">
                    <p>Tu solicitud sera atendida por <strong>{adminContact.nombre}</strong>.</p>
                    <a href={`mailto:${adminContact.email}`}>{adminContact.email}</a>
                    {adminContact.telefono && <span>{adminContact.telefono}</span>}
                  </div>
                </div>
              )}

              <button type="submit" className="btn-submit">
                <Send size={18} />
                Enviar solicitud
              </button>
            </form>
          </div>
        </div>
      )}

      {showPasswordChangeModal && (
        <div className="force-password-modal active">
          <div className="force-password-card">
            <div className="force-password-header">
              <Shield size={32} />
              <div>
                <h3>Actualiza tu contrasena</h3>
                <p>
                  Por seguridad, <span>{user?.nombre || 'tu cuenta'}</span> debe establecer 
                  una nueva contrasena antes de continuar.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="force-password-form">
              <label>
                <span>Contrasena actual</span>
                <input
                  type="password"
                  value={passwordChangeForm.currentPassword}
                  onChange={(e) => setPasswordChangeForm({ 
                    ...passwordChangeForm, 
                    currentPassword: e.target.value 
                  })}
                  placeholder="********"
                  required
                />
              </label>

              <label>
                <span>Nueva contrasena</span>
                <input
                  type="password"
                  value={passwordChangeForm.newPassword}
                  onChange={(e) => setPasswordChangeForm({ 
                    ...passwordChangeForm, 
                    newPassword: e.target.value 
                  })}
                  placeholder="Minimo 8 caracteres"
                  required
                />
              </label>

              <label>
                <span>Confirmar nueva contrasena</span>
                <input
                  type="password"
                  value={passwordChangeForm.confirmPassword}
                  onChange={(e) => setPasswordChangeForm({ 
                    ...passwordChangeForm, 
                    confirmPassword: e.target.value 
                  })}
                  placeholder="Repite la contrasena"
                  required
                />
              </label>

              {passwordChangeError && (
                <div className="force-password-feedback error">{passwordChangeError}</div>
              )}

              <button type="submit" className="btn-submit">
                <Key size={18} />
                Cambiar contrasena y continuar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
