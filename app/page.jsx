import BackendCallout from '../components/BackendCallout';
import StatusCard from '../components/StatusCard';

const mockRooms = [
  {
    id: 1,
    numero: '101',
    estado: 'Ocupado',
    prioridad: 'Alta',
    color: 'warning',
  },
  {
    id: 2,
    numero: '102',
    estado: 'Libre',
    prioridad: 'Media',
    color: 'success',
  },
  {
    id: 3,
    numero: '201',
    estado: 'Mantenimiento',
    prioridad: 'Crítica',
    color: 'danger',
  },
];

export default function HomePage() {
  return (
    <div className="section-shell">
      <section className="hero">
        <div className="panel">
          <p className="badge badge-info">Migración Next.js activa</p>
          <h2 className="hero-title">
            Experiencia JW Mantto reconstruida con React + Next.js
          </h2>
          <p className="hero-subtitle">
            Interfaces componetizadas, utilidades <strong>tailwind-like</strong>{' '}
            centralizadas en
            <code>styles/jwm-mantto-tailwind.css</code> y backend Express/JS
            vanilla para mantener la consistencia operativa.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a className="btn btn-primary" href="#frontend">
              Ver front Next
            </a>
            <a className="btn btn-ghost" href="#backend">
              Backend JS vanilla
            </a>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi">
            <h4>Rutas en React</h4>
            <strong>App Router Next</strong>
          </div>
          <div className="kpi">
            <h4>Estilos unificados</h4>
            <strong>jwm-mantto-tailwind</strong>
          </div>
          <div className="kpi">
            <h4>Backend</h4>
            <strong>Express vanilla</strong>
          </div>
        </div>
      </section>

      <section id="frontend" className="section-shell">
        <div className="section-title">
          <span className="dot info" /> Frontend Next.js
          <small>Componentes reutilizables & SSR listo</small>
        </div>
        <div className="panel-grid">
          <StatusCard
            title="Dashboard en React"
            description="Shell básica para habitaciones y mantenimientos"
            status="success"
            highlight="SSR + Client Components"
          />
          <StatusCard
            title="Utilidades centralizadas"
            description="Clases tailwind-like en jwm-mantto-tailwind"
            status="info"
            highlight=">40 utilidades listas"
          />
          <StatusCard
            title="Lista viva"
            description="Ejemplo de rooms renderizados en Next"
            status="warning"
            highlight={`${mockRooms.length} habitaciones demo`}
          />
        </div>

        <div className="surface-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Habitaciones y estado</p>
              <h3 className="text-lg font-bold">Render dinámico con React</h3>
            </div>
            <a className="link" href="/api/rooms">
              Ejemplo de endpoint
            </a>
          </div>
          <div className="divider" />
          <div className="list">
            {mockRooms.map((room) => (
              <div key={room.id} className="list-item">
                <div>
                  <strong>Hab. {room.numero}</strong>
                  <span>{room.estado}</span>
                </div>
                <div className="chip-row">
                  <span className="chip">Prioridad: {room.prioridad}</span>
                  <span className="chip">{room.estado}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="backend" className="section-shell">
        <div className="section-title">
          <span className="dot success" /> Backend JS vanilla
          <small>Express + PostgreSQL listo para consumir</small>
        </div>
        <BackendCallout />
        <div className="surface-card">
          <h3 className="text-lg font-bold">Estrategia de integración</h3>
          <p className="text-muted">
            El servidor Express existente permanece en <code>js/server.js</code>{' '}
            y puede ejecutarse en paralelo al frontend Next.js. Usa fetch/axios
            desde React para consumir <code>/api</code> o las rutas mock cuando
            no haya base de datos.
          </p>
          <div className="divider" />
          <table className="table-lite">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Comando</th>
                <th>Propósito</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Frontend Next.js</td>
                <td>
                  <code>npm run dev</code>
                </td>
                <td>SSR/CSR con React y utilidades jwm-mantto-tailwind.</td>
              </tr>
              <tr>
                <td>Backend vanilla</td>
                <td>
                  <code>npm run backend</code>
                </td>
                <td>API Express existente (mock + PostgreSQL).</td>
              </tr>
              <tr>
                <td>Producción</td>
                <td>
                  <code>npm run backend:prod</code>
                </td>
                <td>Levanta backend con variables de entorno productivas.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
