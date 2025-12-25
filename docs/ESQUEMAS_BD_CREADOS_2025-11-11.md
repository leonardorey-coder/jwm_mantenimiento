# Esquemas de Base de Datos Creados - 2025-11-11

## 📋 Resumen

Se han creado esquemas completos de base de datos para el sistema JW Mantto basados en:

- ✅ Diagrama de Clases del sistema
- ✅ Implementaciones actuales de las APIs
- ✅ Nuevas funcionalidades requeridas

## 📁 Archivos Creados

### 1. Esquemas SQL

#### `/db/esquema_postgres_2025-11-11.sql` (Básico)

- **Tamaño:** ~100 líneas
- **Contenido:** Esquema básico con tablas principales
- **Incluye:**
  - Edificios, Cuartos, Mantenimientos
  - Estados con colores
  - Índices básicos
  - Datos de ejemplo

#### `/db/esquema_completo_2025-11-11.sql` (Completo) ⭐

- **Tamaño:** ~800 líneas
- **Contenido:** Esquema completo según diagrama de clases
- **Incluye:**
  - ✅ 12 tablas completas
  - ✅ Configuración de estados con colores
  - ✅ Sistema de usuarios y roles (ADMIN, SUPERVISOR, TECNICO)
  - ✅ Espacios comunes (gimnasio, piscina, restaurante, etc.)
  - ✅ Inspecciones con checklists
  - ✅ Evidencias multimedia (fotos, videos, archivos)
  - ✅ Firmas digitales
  - ✅ 4 vistas SQL útiles
  - ✅ 3 funciones SQL
  - ✅ 2 triggers automáticos
  - ✅ 35+ índices de rendimiento
  - ✅ Datos de ejemplo completos

#### `/db/migracion_esquema_completo_2025-11-11.sql` (Migración)

- **Tamaño:** ~600 líneas
- **Contenido:** Script de migración para BD existente
- **Incluye:**
  - ✅ Preserva datos existentes
  - ✅ Agrega nuevas tablas
  - ✅ Agrega nuevos campos a tablas existentes
  - ✅ Crea índices faltantes
  - ✅ Crea vistas y funciones
  - ✅ Manejo de errores
  - ✅ Transacciones seguras

### 2. Documentación

#### `/docs/ESQUEMA_BD_COMPLETO.md`

- **Tamaño:** ~500 líneas
- **Contenido:** Documentación detallada del esquema
- **Secciones:**
  - Resumen general
  - Nuevas funcionalidades implementadas
  - Estructura de tablas
  - Diagrama de relaciones
  - Vistas y funciones
  - Endpoints API relacionados
  - Mejoras vs. esquema anterior
  - Uso del esquema
  - Notas de implementación

#### `/docs/DIAGRAMA_BD_COMPLETO.md`

- **Tamaño:** ~700 líneas
- **Contenido:** Diagrama visual de la base de datos
- **Secciones:**
  - Diagrama ASCII de relaciones
  - Resumen de tablas
  - Tipos de relaciones
  - Código de colores por módulo
  - Cardinalidades detalladas
  - Claves e índices
  - Triggers automáticos
  - Vistas disponibles
  - Funciones SQL
  - Restricciones CHECK
  - Consideraciones de seguridad

#### `/db/README_ESQUEMAS.md`

- **Tamaño:** ~400 líneas
- **Contenido:** Guía de instalación y uso
- **Secciones:**
  - Archivos disponibles
  - Instalación (3 opciones)
  - Verificación de instalación
  - Estructura del esquema
  - Configuración de la aplicación
  - Datos de ejemplo
  - Actualización del esquema
  - Mantenimiento (backup/restore)
  - Limpieza de datos
  - Solución de problemas

#### `/README.md` (Actualizado)

- Agregada sección de documentación de base de datos
- Enlaces a todos los documentos nuevos

## 🎯 Nuevas Funcionalidades Implementadas

### 1. Sistema de Estados con Colores ✅

**Tabla:** `configuracion_estados`

Estados predefinidos:

- 🟢 **Disponible** - Verde (#4CAF50)
- 🔵 **Ocupado** - Azul (#2196F3)
- 🟠 **Mantenimiento** - Naranja (#FF9800)
- ⚫ **Fuera de Servicio** - Gris (#616161)

**Características:**

- Colores hexadecimales
- Colores secundarios para fondos
- Iconos emoji
- Prioridades
- Disponibilidad para reservas

### 2. Espacios Comunes ✅

**Tabla:** `espacios_comunes`

**Tipos de espacios:**

- Gimnasio
- Piscina
- Restaurante
- Salón de Eventos
- Spa

**Características:**

- Estados con colores (igual que cuartos)
- Capacidad
- Horarios de apertura/cierre
- Relación con edificios
- Mantenimientos específicos

### 3. Sistema de Usuarios y Roles ✅

**Tablas:** `roles`, `usuarios`

**Roles predefinidos:**

- **ADMIN** - Administrador (todos los permisos)
- **SUPERVISOR** - Supervisor (lectura, escritura, aprobación)
- **TECNICO** - Técnico (lectura, escritura)

**Características:**

- Autenticación con contraseña hasheada (bcrypt)
- Permisos en formato JSON
- Control de acceso
- Historial de último acceso

### 4. Sistema de Inspecciones ✅

**Tabla:** `inspecciones`

**Características:**

- Asignación de técnico
- Resultado (aprobado/rechazado/requiere_seguimiento)
- Observaciones
- Duración en minutos
- Captura de firma

### 5. Sistema de Checklists ✅

**Tablas:** `checklists`, `checklist_items`

**Características:**

- Listas de verificación por inspección
- Items obligatorios y opcionales
- Cálculo automático de progreso
- Orden de items
- Registro de quién completó cada item

### 6. Sistema de Evidencias ✅

**Tabla:** `evidencias`

**Tipos soportados:**

- Fotos
- Videos
- Archivos
- Audio

**Características:**

- URL de almacenamiento
- Metadata (nombre, tamaño, MIME type)
- Descripción
- Usuario que subió

### 7. Sistema de Firmas Digitales ✅

**Tabla:** `firmas_digitales`

**Características:**

- Captura de firma como imagen
- Nombre y cargo del técnico
- Timestamp de firma
- IP y dispositivo (auditoría)

### 8. Mejoras en Mantenimientos ✅

**Campos adicionales:**

- `espacio_comun_id` - Soporte para espacios comunes
- `prioridad` - baja/media/alta/urgente
- `fecha_inicio` / `fecha_finalizacion` - Control de tiempos
- `usuario_creador_id` / `usuario_asignado_id` - Trazabilidad
- `costo_estimado` / `costo_real` - Control de costos

**Tipos expandidos:**

- normal
- rutina
- preventivo
- correctivo
- emergencia

## 📊 Estructura Completa

### Tablas (12 total)

#### Configuración (2)

1. `configuracion_estados` - Estados con colores
2. `roles` - Roles del sistema

#### Usuarios (1)

3. `usuarios` - Usuarios del sistema

#### Estructura (3)

4. `edificios` - Edificios del hotel
5. `cuartos` - Habitaciones
6. `espacios_comunes` - Áreas comunes

#### Operaciones (1)

7. `mantenimientos` - Registros de mantenimiento

#### Calidad (5)

8. `inspecciones` - Inspecciones realizadas
9. `checklists` - Listas de verificación
10. `checklist_items` - Items de checklists
11. `evidencias` - Evidencias multimedia
12. `firmas_digitales` - Firmas digitales

### Vistas (4)

1. `vista_cuartos_completa` - Cuartos con colores y edificio
2. `vista_espacios_comunes_completa` - Espacios con colores y edificio
3. `vista_mantenimientos_completa` - Mantenimientos con toda la info
4. `vista_inspecciones_completa` - Inspecciones con contadores

### Funciones (3)

1. `calcular_progreso_checklist(checklist_id)` - Calcula % de progreso
2. `obtener_estadisticas_cuartos()` - Estadísticas de estados
3. `obtener_estadisticas_espacios_comunes()` - Estadísticas de espacios

### Triggers (2)

1. `actualizar_updated_at()` - Actualiza timestamp automáticamente
2. `actualizar_progreso_checklist()` - Recalcula progreso de checklist

### Índices (35+)

Índices optimizados para:

- Búsquedas por estado
- Búsquedas por edificio
- Búsquedas por usuario
- Búsquedas por fecha
- Joins frecuentes

## 🚀 Cómo Usar

### Instalación Nueva

```bash
# 1. Crear base de datos
createdb jwmantto

# 2. Aplicar esquema completo
psql -U postgres -d jwmantto -f db/esquema_completo_2025-11-11.sql
```

### Migración desde BD Existente

```bash
# 1. Backup
pg_dump -U postgres jwmantto > backup_$(date +%Y%m%d).sql

# 2. Aplicar migración
psql -U postgres -d jwmantto -f db/migracion_esquema_completo_2025-11-11.sql
```

### Verificación

```sql
-- Ver todas las tablas
\dt

-- Ver estadísticas de cuartos
SELECT * FROM obtener_estadisticas_cuartos();

-- Ver cuartos con colores
SELECT * FROM vista_cuartos_completa LIMIT 5;
```

## 📈 Comparación con Esquema Anterior

| Característica      | Antes | Ahora |
| ------------------- | ----- | ----- |
| Tablas              | 3     | 12    |
| Estados con colores | ❌    | ✅    |
| Espacios comunes    | ❌    | ✅    |
| Usuarios y roles    | ❌    | ✅    |
| Inspecciones        | ❌    | ✅    |
| Checklists          | ❌    | ✅    |
| Evidencias          | ❌    | ✅    |
| Firmas digitales    | ❌    | ✅    |
| Vistas SQL          | 0     | 4     |
| Funciones SQL       | 0     | 3     |
| Triggers            | 0     | 2     |
| Índices             | ~5    | 35+   |
| Prioridades         | ❌    | ✅    |
| Control de costos   | ❌    | ✅    |

## 🎨 Endpoints API a Implementar

### Ya Implementados ✅

- `GET /api/cuartos` - Listar cuartos
- `PATCH /api/cuartos/:id/estado` - Cambiar estado
- `GET /api/cuartos/dashboard/estados` - Dashboard con colores
- `GET /api/mantenimientos` - Listar mantenimientos
- `POST /api/mantenimientos` - Crear mantenimiento

### Por Implementar 📝

#### Espacios Comunes

- `GET /api/espacios-comunes`
- `POST /api/espacios-comunes`
- `PATCH /api/espacios-comunes/:id/estado`
- `GET /api/espacios-comunes/dashboard/estados`

#### Usuarios

- `POST /api/auth/login`
- `GET /api/usuarios`
- `POST /api/usuarios`

#### Inspecciones

- `GET /api/inspecciones`
- `POST /api/inspecciones`
- `POST /api/inspecciones/:id/checklist`
- `POST /api/inspecciones/:id/evidencia`
- `POST /api/inspecciones/:id/firma`

## 📝 Próximos Pasos

### Backend

1. ✅ Esquema de BD completo
2. ⏳ APIs de Espacios Comunes
3. ⏳ APIs de Usuarios y Autenticación
4. ⏳ APIs de Inspecciones
5. ⏳ APIs de Checklists
6. ⏳ APIs de Evidencias

### Frontend

1. ⏳ Interfaz de Espacios Comunes
2. ⏳ Dashboard visual con colores
3. ⏳ Sistema de login
4. ⏳ Interfaz de inspecciones
5. ⏳ Captura de firmas digitales
6. ⏳ Carga de evidencias

### Infraestructura

1. ⏳ Sistema de autenticación JWT
2. ⏳ Middleware de permisos
3. ⏳ Almacenamiento de archivos (S3/local)
4. ⏳ Sistema de notificaciones
5. ⏳ Reportes en PDF

## 📚 Documentación Relacionada

- [Esquema BD Completo](./docs/ESQUEMA_BD_COMPLETO.md)
- [Diagrama BD Completo](./docs/DIAGRAMA_BD_COMPLETO.md)
- [Diagrama de Clases](./docs/DIAGRAMA_CLASES.md)
- [README Esquemas](./db/README_ESQUEMAS.md)
- [Arquitectura API](./docs/ARQUITECTURA_API.md)
- [API Gestión Estados](./docs/API_GESTION_ESTADOS.md)

## ✅ Checklist de Implementación

### Base de Datos

- [x] Crear esquema básico
- [x] Crear esquema completo
- [x] Crear script de migración
- [x] Documentar esquema
- [x] Crear diagrama visual
- [x] Crear guía de instalación

### APIs (Pendiente)

- [ ] API de Espacios Comunes
- [ ] API de Usuarios
- [ ] API de Autenticación
- [ ] API de Inspecciones
- [ ] API de Checklists
- [ ] API de Evidencias
- [ ] API de Firmas

### Frontend (Pendiente)

- [ ] Gestión de Espacios Comunes
- [ ] Dashboard con colores
- [ ] Sistema de login
- [ ] Gestión de inspecciones
- [ ] Captura de firmas
- [ ] Carga de evidencias

---

**Fecha de creación:** 2025-11-11  
**Versión del esquema:** 2.0.0  
**Estado:** ✅ Completo y listo para usar
