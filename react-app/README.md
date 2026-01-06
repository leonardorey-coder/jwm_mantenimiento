# JW Mantto - React App

Sistema de Gestion de Servicios, Mantenimiento, Habitaciones y Espacios Comunes para JW Marriott.

## Tecnologias

- **React 18** - Framework UI
- **Vite** - Build tool
- **React Router** - Navegacion
- **TanStack Query** - Cache y estado del servidor
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos
- **date-fns** - Manejo de fechas

## Estructura del proyecto

```
src/
  components/
    auth/           # Login, rutas protegidas
    layout/         # Header, Navigation
    habitaciones/   # Modulo de habitaciones
    espacios/       # Modulo de espacios comunes
    tareas/         # Modulo de tareas
    sabana/         # Modulo de sabanas de control
    checklist/      # Modulo de checklist
    usuarios/       # Modulo de usuarios (admin)
  contexts/
    AuthContext.jsx # Contexto de autenticacion
    ThemeContext.jsx # Contexto de tema
  hooks/
    useHabitaciones.js # Hooks para habitaciones
  services/
    api.js          # Cliente API y servicios
  styles/
    main.css        # Estilos globales
```

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicacion estara disponible en `http://localhost:3000`.

## Configuracion

Copia `.env.example` a `.env` y configura las variables:

```
VITE_API_URL=http://localhost:3001
```

## Build

```bash
npm run build
```

## Notas

- El backend Express existente sirve la API en `/api`
- La configuracion de Vite incluye un proxy para desarrollo
- Los estilos siguen el sistema de diseno JW Marriott
