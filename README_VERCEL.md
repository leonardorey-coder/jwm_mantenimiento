# 🚀 Guía de Despliegue y Desarrollo con Vercel

Esta guía explica cómo trabajar con la aplicación JW Mantto usando Vercel, tanto para desarrollo local como para producción.

## 📋 Requisitos Previos

1. **Node.js** (versión 16 o superior)
2. **Cuenta de Vercel** (gratuita): [vercel.com](https://vercel.com)
3. **Vercel CLI** instalado globalmente:
   ```bash
   npm install -g vercel
   ```

## 🔧 Instalación

### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2. Iniciar sesión en Vercel

```bash
vercel login
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto (o usa `.env.example` como base):

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de base de datos.

## 🏃 Desarrollo Local con Vercel

### Opción 1: Usar Vercel CLI (Recomendado)

Ejecuta el servidor de desarrollo de Vercel que simula el entorno de producción:

```bash
npm run vercel:dev
# o simplemente
npm run vercel
```

Esto iniciará un servidor local en `http://localhost:3000` que funciona exactamente como en Vercel.

### Opción 2: Servidor Express tradicional

Para desarrollo rápido sin Vercel:

```bash
npm start
# o
npm run dev
```

Esto iniciará el servidor Express en `http://localhost:3001`.

## 🌐 Despliegue en Vercel

### Despliegue Inicial

1. **Conectar el proyecto a Vercel:**
   ```bash
   vercel
   ```

2. **Configurar variables de entorno en Vercel:**
   - Ve al dashboard de Vercel: [vercel.com/dashboard](https://vercel.com/dashboard)
   - Selecciona tu proyecto
   - Ve a **Settings** → **Environment Variables**
   - Agrega las variables necesarias:
     - `DATABASE_URL` (string de conexión PostgreSQL)
     - `NODE_ENV=production`
     - Cualquier otra variable que necesites

### Despliegue a Producción

```bash
npm run vercel:deploy
# o
vercel --prod
```

### Despliegue a Preview

```bash
vercel
```

Esto crea una URL de preview para cada commit.

## 📁 Estructura de Archivos para Vercel

```
jwm_mant_cuartos/
├── api/
│   └── index.js          # Función serverless para Vercel
├── vercel.json           # Configuración de Vercel
├── .vercelignore         # Archivos a ignorar en Vercel
├── server.js             # Servidor Express (solo para desarrollo local)
└── ...
```

## 🔄 Diferencias entre Entornos

### Desarrollo Local (Express)

- **URL API:** `http://localhost:3001/api/...`
- **Servidor:** Express tradicional
- **Archivo:** `server.js`

### Vercel (Producción/Preview)

- **URL API:** `/api/...` (relativa)
- **Servidor:** Funciones serverless
- **Archivo:** `api/index.js`

La aplicación detecta automáticamente el entorno y ajusta las URLs de la API.

## 🗄️ Base de Datos

### Opciones de Base de Datos para Vercel

1. **Vercel Postgres** (Recomendado)
   - Integración nativa con Vercel
   - Configuración automática
   - Dashboard integrado

2. **PostgreSQL externo**
   - Necesitas configurar `DATABASE_URL` en variables de entorno
   - Ejemplos: Supabase, Railway, Neon, etc.

### Configurar Vercel Postgres

1. En el dashboard de Vercel, ve a tu proyecto
2. Ve a **Storage** → **Create Database** → **Postgres**
3. Vercel configurará automáticamente `POSTGRES_URL` y otras variables

## 🧪 Probar Localmente

### 1. Con Vercel CLI

```bash
npm run vercel:dev
```

Abre `http://localhost:3000` en tu navegador.

### 2. Con Express tradicional

```bash
npm start
```

Abre `http://localhost:3001` en tu navegador.

## 📝 Scripts Disponibles

```bash
# Desarrollo local con Vercel (simula producción)
npm run vercel:dev

# Desarrollo local con Express
npm start
npm run dev

# Build para Vercel
npm run vercel:build

# Desplegar a producción
npm run vercel:deploy
```

## 🔍 Debugging

### Ver logs en Vercel

```bash
vercel logs
```

### Ver logs en tiempo real

```bash
vercel logs --follow
```

### Verificar configuración

```bash
vercel inspect
```

## ⚠️ Consideraciones Importantes

1. **Cold Starts:** Las funciones serverless pueden tener un pequeño delay en el primer request
2. **Timeouts:** Vercel tiene límites de tiempo de ejecución (10s en Hobby, 60s en Pro)
3. **Base de Datos:** Asegúrate de que tu base de datos PostgreSQL permita conexiones desde los IPs de Vercel
4. **Variables de Entorno:** Nunca commitees archivos `.env` con credenciales reales

## 🆘 Solución de Problemas

### Error: "Cannot find module"

Asegúrate de que todas las dependencias estén en `package.json`:

```bash
npm install
```

### Error de conexión a base de datos

1. Verifica que `DATABASE_URL` esté configurada en Vercel
2. Verifica que tu base de datos permita conexiones externas
3. Revisa los logs: `vercel logs`

### La aplicación no detecta Vercel

Verifica que `app-loader.js` esté usando la detección automática de entorno. La URL de la API se ajusta automáticamente.

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

## ✅ Checklist de Despliegue

- [ ] Vercel CLI instalado
- [ ] Proyecto conectado a Vercel (`vercel`)
- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos PostgreSQL configurada
- [ ] Pruebas locales exitosas (`npm run vercel:dev`)
- [ ] Despliegue a producción (`npm run vercel:deploy`)

---

**Nota:** Esta aplicación funciona tanto en desarrollo local (Express) como en Vercel (serverless) sin cambios en el código, gracias a la detección automática de entorno.

