import { useState, useMemo } from 'react';
import { useEdificios, useCuartos, useMantenimientos, useAlertasPendientes, useCreateMantenimiento, useUpdateMantenimiento, useDeleteMantenimiento, useMarcarAlertaEmitida } from '../../hooks/useHabitaciones';
import { usuariosService } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import CuartoCard from './CuartoCard';
import MantenimientoModal from './MantenimientoModal';
import AlertasPanel from './AlertasPanel';
import { Search, Filter, Plus, Bell, Building, RefreshCw } from 'lucide-react';
import './Habitaciones.css';

const ESTADOS_CUARTO = [
  { value: '', label: 'Todos los estados' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'mantenimiento', label: 'En mantenimiento' },
  { value: 'fuera_servicio', label: 'Fuera de servicio' },
];

export default function Habitaciones() {
  const [filtroEdificio, setFiltroEdificio] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCuarto, setSelectedCuarto] = useState(null);
  const [selectedMantenimiento, setSelectedMantenimiento] = useState(null);
  const [showAlertas, setShowAlertas] = useState(false);

  const { data: edificios = [], isLoading: loadingEdificios } = useEdificios();
  const { data: cuartos = [], isLoading: loadingCuartos, refetch: refetchCuartos } = useCuartos();
  const { data: mantenimientos = [], isLoading: loadingMantenimientos } = useMantenimientos();
  const { data: alertasPendientes = [] } = useAlertasPendientes();
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-activos'],
    queryFn: async () => {
      const response = await usuariosService.getActivos();
      return response.data;
    },
  });

  const createMantenimiento = useCreateMantenimiento();
  const updateMantenimiento = useUpdateMantenimiento();
  const deleteMantenimiento = useDeleteMantenimiento();
  const marcarAlertaEmitida = useMarcarAlertaEmitida();

  const cuartosFiltrados = useMemo(() => {
    return cuartos.filter(cuarto => {
      const matchEdificio = !filtroEdificio || cuarto.edificio_id === parseInt(filtroEdificio);
      const matchEstado = !filtroEstado || cuarto.estado === filtroEstado;
      const matchBusqueda = !busqueda || 
        cuarto.numero?.toString().toLowerCase().includes(busqueda.toLowerCase()) ||
        cuarto.nombre?.toLowerCase().includes(busqueda.toLowerCase());
      return matchEdificio && matchEstado && matchBusqueda;
    });
  }, [cuartos, filtroEdificio, filtroEstado, busqueda]);

  const cuartosAgrupados = useMemo(() => {
    const grupos = {};
    cuartosFiltrados.forEach(cuarto => {
      const edificio = cuarto.edificio_nombre || 'Sin edificio';
      if (!grupos[edificio]) {
        grupos[edificio] = [];
      }
      grupos[edificio].push(cuarto);
    });
    return grupos;
  }, [cuartosFiltrados]);

  const mantenimientosPorCuarto = useMemo(() => {
    const mapa = {};
    mantenimientos.forEach(m => {
      if (!mapa[m.cuarto_id]) {
        mapa[m.cuarto_id] = [];
      }
      mapa[m.cuarto_id].push(m);
    });
    return mapa;
  }, [mantenimientos]);

  const handleOpenModal = (cuarto, mantenimiento = null) => {
    setSelectedCuarto(cuarto);
    setSelectedMantenimiento(mantenimiento);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCuarto(null);
    setSelectedMantenimiento(null);
  };

  const handleSaveMantenimiento = async (data) => {
    try {
      if (selectedMantenimiento) {
        await updateMantenimiento.mutateAsync({ id: selectedMantenimiento.id, data });
      } else {
        await createMantenimiento.mutateAsync({
          ...data,
          cuarto_id: selectedCuarto.id,
        });
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar mantenimiento:', error);
      alert('Error al guardar el mantenimiento');
    }
  };

  const handleDeleteMantenimiento = async (id) => {
    if (!confirm('Estas seguro de eliminar este mantenimiento?')) return;
    
    try {
      await deleteMantenimiento.mutateAsync(id);
    } catch (error) {
      console.error('Error al eliminar mantenimiento:', error);
      alert('Error al eliminar el mantenimiento');
    }
  };

  const handleMarcarAlertaEmitida = async (id) => {
    try {
      await marcarAlertaEmitida.mutateAsync(id);
    } catch (error) {
      console.error('Error al marcar alerta:', error);
    }
  };

  const isLoading = loadingEdificios || loadingCuartos || loadingMantenimientos;

  return (
    <div className="habitaciones-container">
      <div className="habitaciones-header">
        <div className="header-title">
          <h1>Habitaciones</h1>
          <span className="badge">{cuartosFiltrados.length} cuartos</span>
        </div>
        
        <div className="header-actions">
          <button 
            className={`btn-alertas ${alertasPendientes.length > 0 ? 'has-alerts' : ''}`}
            onClick={() => setShowAlertas(!showAlertas)}
          >
            <Bell size={18} />
            {alertasPendientes.length > 0 && (
              <span className="alert-count">{alertasPendientes.length}</span>
            )}
          </button>
          <button className="btn-refresh" onClick={() => refetchCuartos()}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="habitaciones-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar habitacion..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Building size={18} />
          <select value={filtroEdificio} onChange={(e) => setFiltroEdificio(e.target.value)}>
            <option value="">Todos los edificios</option>
            {edificios.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <Filter size={18} />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            {ESTADOS_CUARTO.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      {showAlertas && alertasPendientes.length > 0 && (
        <AlertasPanel 
          alertas={alertasPendientes}
          onMarcarEmitida={handleMarcarAlertaEmitida}
          onClose={() => setShowAlertas(false)}
        />
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="skeleton-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="edificios-container">
          {Object.entries(cuartosAgrupados).map(([edificio, cuartosEdificio]) => (
            <div key={edificio} className="edificio-section">
              <h2 className="edificio-title">
                <Building size={20} />
                {edificio}
                <span className="cuartos-count">{cuartosEdificio.length} habitaciones</span>
              </h2>
              <div className="cuartos-grid">
                {cuartosEdificio.map(cuarto => (
                  <CuartoCard
                    key={cuarto.id}
                    cuarto={cuarto}
                    mantenimientos={mantenimientosPorCuarto[cuarto.id] || []}
                    onAddMantenimiento={() => handleOpenModal(cuarto)}
                    onEditMantenimiento={(m) => handleOpenModal(cuarto, m)}
                    onDeleteMantenimiento={handleDeleteMantenimiento}
                  />
                ))}
              </div>
            </div>
          ))}

          {Object.keys(cuartosAgrupados).length === 0 && (
            <div className="empty-state">
              <Building size={48} />
              <h3>No se encontraron habitaciones</h3>
              <p>Intenta ajustar los filtros de busqueda</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <MantenimientoModal
          cuarto={selectedCuarto}
          mantenimiento={selectedMantenimiento}
          usuarios={usuarios}
          onSave={handleSaveMantenimiento}
          onClose={handleCloseModal}
          isLoading={createMantenimiento.isPending || updateMantenimiento.isPending}
        />
      )}
    </div>
  );
}
