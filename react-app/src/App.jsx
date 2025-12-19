import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './components/auth/Login';
import Habitaciones from './components/habitaciones/Habitaciones';
import EspaciosComunes from './components/espacios/EspaciosComunes';
import Tareas from './components/tareas/Tareas';
import Sabana from './components/sabana/Sabana';
import Checklist from './components/checklist/Checklist';
import Usuarios from './components/usuarios/Usuarios';
import './styles/main.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/habitaciones" replace />} />
                <Route path="habitaciones" element={<Habitaciones />} />
                <Route path="espacios" element={<EspaciosComunes />} />
                <Route path="tareas" element={<Tareas />} />
                <Route path="sabana" element={<Sabana />} />
                <Route path="checklist" element={<Checklist />} />
                <Route path="usuarios" element={
                  <AdminRoute>
                    <Usuarios />
                  </AdminRoute>
                } />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
