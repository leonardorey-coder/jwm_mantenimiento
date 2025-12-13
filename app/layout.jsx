import './globals.css';

export const metadata = {
  title: 'JW Mantto | Next.js',
  description:
    'Migración de JW Mantto a Next.js con React y utilidades tailwind-like centralizadas.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-surface text-base text-body antialiased min-h-screen">
        <div className="min-h-screen flex flex-col">
          <header className="bg-primary text-onPrimary shadow-md">
            <div className="container flex items-center justify-between py-4 gap-6">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-onPrimary/10 flex items-center justify-center text-2xl font-semibold">
                  JW
                </div>
                <div>
                  <p className="text-sm font-medium opacity-80">
                    JW Marriott - Mantto
                  </p>
                  <h1 className="text-xl font-bold leading-tight">
                    Plataforma unificada Next.js
                  </h1>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <span className="badge badge-success">React + Next.js</span>
                <span className="badge badge-neutral">Backend JS vanilla</span>
                <span className="badge badge-info">
                  Estilos jwm-mantto-tailwind
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 container py-10">{children}</main>

          <footer className="bg-surface-muted border-t border-divider">
            <div className="container py-6 text-sm text-muted flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-body">JW Mantto</p>
                <p>
                  UI servida con Next.js + React. API Express/vanilla disponible
                  en scripts backend.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="pill">SSR listo</span>
                <span className="pill">Componentes reutilizables</span>
                <span className="pill">Diseño utilitario centralizado</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
