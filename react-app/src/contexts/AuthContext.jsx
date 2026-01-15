import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiration');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('sesionId');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('tokenExpiration');
    sessionStorage.removeItem('tokenType');
    sessionStorage.removeItem('sesionId');
    sessionStorage.removeItem('currentUser');
    setUser(null);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');

      if (!accessToken || !storedUser) {
        setLoading(false);
        return false;
      }

      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error checking auth:', err);
      clearAuthData();
      setLoading(false);
      return false;
    }
  }, [clearAuthData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await authService.login({ email, password });
      const data = response.data;

      if (!data.success) {
        throw new Error(data.mensaje || 'Error al iniciar sesion');
      }

      const storage = rememberMe ? localStorage : sessionStorage;
      
      storage.setItem('accessToken', data.tokens.accessToken);
      storage.setItem('refreshToken', data.tokens.refreshToken);
      storage.setItem('tokenExpiration', data.tokens.expiresIn);
      storage.setItem('tokenType', data.tokens.tokenType || 'Bearer');
      storage.setItem('sesionId', data.sesion.id);
      storage.setItem('currentUser', JSON.stringify(data.usuario));

      if (rememberMe) {
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
      }

      setUser(data.usuario);
      setLoading(false);
      
      return { success: true, user: data.usuario, requirePasswordChange: data.usuario.requiere_cambio_password };
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || err.message || 'Error al iniciar sesion';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg, bloqueado: err.response?.data?.bloqueado };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      clearAuthData();
    }
  };

  const updateUser = (userData) => {
    const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
    storage.setItem('currentUser', JSON.stringify(userData));
    setUser(userData);
  };

  const isAdmin = user?.rol === 'ADMIN' || user?.rol_nombre === 'ADMIN';
  const isSupervisor = isAdmin || user?.rol === 'SUPERVISOR' || user?.rol_nombre === 'SUPERVISOR';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      updateUser,
      isAuthenticated: !!user,
      isAdmin,
      isSupervisor,
      clearError: () => setError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
