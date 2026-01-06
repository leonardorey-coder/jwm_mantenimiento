import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistService } from '../../services/api';
import { useEdificios } from '../../hooks/useHabitaciones';
import { Search, Filter, Building, RefreshCw, Check, X, ChevronDown, ChevronUp, Camera, Plus, Save, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import './Checklist.css';

const ESTADOS_ITEM = [
  { value: 'bueno', label: 'Bueno', color: 'success' },
  { value: 'regular', label: 'Regular', color: 'warning' },
  { value: 'malo', label: 'Malo', color: 'danger' },
  { value: 'no_aplica', label: 'N/A', color: 'default' },
];

export default function Checklist() {
  const [filtroEdificio, setFiltroEdificio] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [expandedCuarto, setExpandedCuarto] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const queryClient = useQueryClient();
  const { data: edificios = [] } = useEdificios();

  const { data: categorias = [] } = useQuery({
    queryKey: ['checklist-categorias'],
    queryFn: async () => {
      const response = await checklistService.getCategorias();
      return response.data;
    },
  });

  const { data: checklistData = [], isLoading, refetch } = useQuery({
    queryKey: ['checklist-cuartos', { edificio_id: filtroEdificio, categoria_id: filtroCategoria }],
    queryFn: async () => {
      const params = {};
      if (filtroEdificio) params.edificio_id = filtroEdificio;
      if (filtroCategoria) params.categoria_id = filtroCategoria;
      const response = await checklistService.getCuartos(params);
      return response.data;
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ cuartoId, itemId, data }) => checklistService.updateItem(cuartoId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-cuartos'] });
    },
  });

  const cuartosFiltrados = useMemo(() => {
    return checklistData.filter(c => {
      const matchBusqueda = !busqueda || 
        c.numero?.toString().toLowerCase().includes(busqueda.toLowerCase());
      return matchBusqueda;
    });
  }, [checklistData, busqueda]);

  const cuartosPaginados = useMemo(() => {
    const start = (page - 1) * perPage;
    return cuartosFiltrados.slice(start, start + perPage);
  }, [cuartosFiltrados, page, perPage]);

  const totalPages = Math.ceil(cuartosFiltrados.length / perPage);

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    try {
      return format(parseISO(fecha), "d MMM yyyy HH:mm", { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleUpdateEstado = async (cuartoId, itemId, estado, observacion = '') => {
    await updateItem.mutateAsync({
      cuartoId,
      itemId,
      data: { estado, observacion },
    });
  };

  const getResumenCuarto = (items) => {
    const resumen = { bueno: 0, regular: 0, malo: 0, no_aplica: 0, total: items?.length || 0 };
    items?.forEach(item => {
      if (resumen[item.estado] !== undefined) {
        resumen[item.estado]++;
      }
    });
    return resumen;
  };

  return (
    <div className="checklist-container">
      <div className="checklist-header">
        <div className="header-title">
          <h1>Checklist de Habitaciones</h1>
          <span className="badge">{cuartosFiltrados.length} habitaciones</span>
        </div>
        <button className="btn-refresh" onClick={() => refetch()}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="checklist-filters">
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
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas las categorias</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="skeleton-list">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="checklist-list">
            {cuartosPaginados.map(cuarto => {
              const isExpanded = expandedCuarto === cuarto.cuarto_id;
              const resumen = getResumenCuarto(cuarto.items);
              const itemsPorCategoria = {};
              
              cuarto.items?.forEach(item => {
                const cat = item.categoria_nombre || 'Sin categoria';
                if (!itemsPorCategoria[cat]) itemsPorCategoria[cat] = [];
                itemsPorCategoria[cat].push(item);
              });

              return (
                <div key={cuarto.cuarto_id} className="checklist-card">
                  <div 
                    className="card-header"
                    onClick={() => setExpandedCuarto(isExpanded ? null : cuarto.cuarto_id)}
                  >
                    <div className="cuarto-info">
                      <h3>Habitacion {cuarto.numero}</h3>
                      <span className="edificio">{cuarto.edificio_nombre}</span>
                    </div>

                    <div className="resumen-estados">
                      {resumen.bueno > 0 && (
                        <span className="estado-count success">{resumen.bueno}</span>
                      )}
                      {resumen.regular > 0 && (
                        <span className="estado-count warning">{resumen.regular}</span>
                      )}
                      {resumen.malo > 0 && (
                        <span className="estado-count danger">{resumen.malo}</span>
                      )}
                    </div>

                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>

                  {isExpanded && (
                    <div className="card-content">
                      {Object.entries(itemsPorCategoria).map(([categoria, items]) => (
                        <div key={categoria} className="categoria-section">
                          <h4 className="categoria-title">{categoria}</h4>
                          <div className="items-grid">
                            {items.map(item => (
                              <div key={item.id} className="checklist-item">
                                <span className="item-nombre">{item.nombre}</span>
                                <div className="estado-buttons">
                                  {ESTADOS_ITEM.map(estado => (
                                    <button
                                      key={estado.value}
                                      className={clsx(
                                        'estado-btn',
                                        estado.color,
                                        { active: item.estado === estado.value }
                                      )}
                                      onClick={() => handleUpdateEstado(
                                        cuarto.cuarto_id,
                                        item.id,
                                        estado.value
                                      )}
                                      title={estado.label}
                                    >
                                      {estado.value === 'bueno' && <Check size={14} />}
                                      {estado.value === 'regular' && '~'}
                                      {estado.value === 'malo' && <X size={14} />}
                                      {estado.value === 'no_aplica' && 'N/A'}
                                    </button>
                                  ))}
                                </div>
                                {item.observacion && (
                                  <span className="item-observacion">{item.observacion}</span>
                                )}
                                {item.ultimo_editor && (
                                  <span className="item-editor">
                                    {item.ultimo_editor} - {formatFecha(item.fecha_ultima_edicion)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {cuartosFiltrados.length === 0 && (
              <div className="empty-state">
                <Building size={48} />
                <h3>No hay habitaciones</h3>
                <p>No se encontraron habitaciones con los filtros seleccionados</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="btn-page"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span className="page-info">
                Pagina {page} de {totalPages}
              </span>
              <button 
                className="btn-page"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
