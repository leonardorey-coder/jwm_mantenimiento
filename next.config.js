/**
 * Configuración básica para la migración a Next.js.
 * Mantiene el modo estricto de React y permite el directorio `app`.
 */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Omite el linting durante los builds en Vercel para evitar warnings del plugin
    // cuando se usan configuraciones personalizadas.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
