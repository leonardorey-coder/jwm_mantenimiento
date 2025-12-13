export default function StatusCard({ title, description, status, highlight }) {
  const color = {
    success: 'badge-success',
    warning: 'badge-warning',
    info: 'badge-info',
    neutral: 'badge-neutral',
  }[status || 'neutral'];

  return (
    <article className="surface-card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{description}</p>
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
        </div>
        <span className={`badge ${color}`}>{status}</span>
      </div>
      <div className="divider" />
      <div className="kpi">
        <h4>Backlog activo</h4>
        <strong>{highlight}</strong>
      </div>
    </article>
  );
}
