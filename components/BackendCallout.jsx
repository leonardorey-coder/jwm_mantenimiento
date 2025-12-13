export default function BackendCallout() {
  return (
    <div className="alert">
      <div className="dot success" />
      <div>
        <strong>Backend JS vanilla listo</strong>
        <p className="text-muted text-sm">
          Las rutas Express existentes siguen operativas con los scripts{' '}
          <code>npm run backend</code> y <code>npm run backend:prod</code>. El
          frontend Next.js consume estos servicios vía fetch estándar.
        </p>
      </div>
    </div>
  );
}
