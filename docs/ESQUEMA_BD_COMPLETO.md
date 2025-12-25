# Esquema de Base de Datos Completo - JW Mantto

**Fecha:** 2025-11-11  
**Sistema:** SGSOM (Sistema de Gestión de Servicios y Operaciones de Mantenimiento)

## 📋 Índice

1. [Resumen General](#resumen-general)
2. [Nuevas Funcionalidades Implementadas](#nuevas-funcionalidades-implementadas)
3. [Estructura de Tablas](#estructura-de-tablas)
4. [Diagrama de Relaciones](#diagrama-de-relaciones)
5. [Vistas y Funciones](#vistas-y-funciones)
6. [Endpoints API Relacionados](#endpoints-api-relacionados)

---

## 🎯 Resumen General

El esquema completo de base de datos implementa todas las funcionalidades definidas en el **Diagrama de Clases** del sistema, incluyendo:

- ✅ **Gestión de estados con colores** para cuartos y espacios comunes
- ✅ **Espacios comunes** separados de los cuartos
- ✅ **Sistema de usuarios y roles** (ADMIN, SUPERVISOR, TECNICO)
- ✅ **Inspecciones y checklists** para mantenimientos
- ✅ **Evidencias** (fotos, videos, archivos)
- ✅ **Firmas digitales** para validación de trabajos
- ✅ **Sistema de alertas** programables
- ✅ **Gestión de prioridades** en mantenimientos

---

## 🆕 Nuevas Funcionalidades Implementadas

### 1. **Sistema de Estados con Colores**

#### Tabla: `configuracion_estados`

Almacena la configuración de estados con sus colores asociados:

| Campo                     | Tipo         | Descripción                                  |
| ------------------------- | ------------ | -------------------------------------------- |
| `valor`                   | VARCHAR(50)  | Valor del estado (disponible, ocupado, etc.) |
| `label`                   | VARCHAR(100) | Etiqueta legible                             |
| `color`                   | VARCHAR(7)   | Color principal en hexadecimal (#4CAF50)     |
| `color_secundario`        | VARCHAR(7)   | Color de fondo (#E8F5E9)                     |
| `icono`                   | VARCHAR(10)  | Emoji o código de icono (🟢)                 |
| `prioridad`               | INTEGER      | Orden de prioridad                           |
| `disponible_para_reserva` | BOOLEAN      | Si está disponible para reservas             |

**Estados predefinidos:**

- 🟢 **Disponible** - Verde (#4CAF50) - Listo para ocupar
- 🔵 **Ocupado** - Azul (#2196F3) - Huésped hospedado
- 🟠 **Mantenimiento** - Naranja (#FF9800) - En proceso de limpieza/reparación
- ⚫ **Fuera de Servicio** - Gris (#616161) - No disponible

### 2. **Espacios Comunes**

#### Tabla: `espacios_comunes`

Gestiona áreas compartidas del hotel separadas de los cuartos:

| Campo              | Tipo         | Descripción                                |
| ------------------ | ------------ | ------------------------------------------ |
| `nombre`           | VARCHAR(100) | Nombre del espacio                         |
| `tipo`             | VARCHAR(50)  | Gimnasio, Piscina, Salón, Restaurante, Spa |
| `estado`           | VARCHAR(50)  | Estado actual (usa configuración_estados)  |
| `capacidad`        | INTEGER      | Capacidad máxima de personas               |
| `horario_apertura` | TIME         | Hora de apertura                           |
| `horario_cierre`   | TIME         | Hora de cierre                             |

**Ejemplos de espacios comunes:**

- Gimnasio Principal
- Piscina Infinity
- Restaurante Gourmet
- Salón de Eventos
- Spa & Wellness

### 3. **Sistema de Usuarios y Roles**

#### Tabla: `roles`

Define los roles del sistema:

| Rol            | Descripción                 | Permisos                       |
| -------------- | --------------------------- | ------------------------------ |
| **ADMIN**      | Administrador del sistema   | Todos los permisos             |
| **SUPERVISOR** | Supervisor de mantenimiento | Lectura, escritura, aprobación |
| **TECNICO**    | Técnico de mantenimiento    | Lectura, escritura             |

#### Tabla: `usuarios`

Gestiona los usuarios del sistema:

| Campo           | Tipo         | Descripción                  |
| --------------- | ------------ | ---------------------------- |
| `nombre`        | VARCHAR(100) | Nombre completo              |
| `email`         | VARCHAR(100) | Email único                  |
| `password_hash` | VARCHAR(255) | Contraseña hasheada (bcrypt) |
| `rol_id`        | INTEGER      | Referencia al rol            |
| `activo`        | BOOLEAN      | Si el usuario está activo    |
| `ultimo_acceso` | TIMESTAMP    | Última vez que accedió       |

### 4. **Sistema de Inspecciones**

#### Tabla: `inspecciones`

Registra las inspecciones realizadas a los mantenimientos:

| Campo              | Tipo        | Descripción                               |
| ------------------ | ----------- | ----------------------------------------- |
| `mantenimiento_id` | INTEGER     | Mantenimiento inspeccionado               |
| `tecnico_id`       | INTEGER     | Técnico que realizó la inspección         |
| `resultado`        | VARCHAR(50) | aprobado, rechazado, requiere_seguimiento |
| `observaciones`    | TEXT        | Notas de la inspección                    |
| `firma_capturada`  | BOOLEAN     | Si se capturó la firma                    |
| `duracion_minutos` | INTEGER     | Duración de la inspección                 |

### 5. **Sistema de Checklists**

#### Tabla: `checklists`

Listas de verificación para inspecciones:

| Campo                 | Tipo         | Descripción                    |
| --------------------- | ------------ | ------------------------------ |
| `inspeccion_id`       | INTEGER      | Inspección asociada            |
| `titulo`              | VARCHAR(200) | Título del checklist           |
| `completado`          | BOOLEAN      | Si está completado             |
| `progreso_porcentaje` | DECIMAL(5,2) | Porcentaje de progreso (0-100) |

#### Tabla: `checklist_items`

Items individuales de cada checklist:

| Campo                 | Tipo      | Descripción                   |
| --------------------- | --------- | ----------------------------- |
| `checklist_id`        | INTEGER   | Checklist al que pertenece    |
| `descripcion`         | TEXT      | Descripción del item          |
| `obligatorio`         | BOOLEAN   | Si es obligatorio completarlo |
| `completado`          | BOOLEAN   | Si está completado            |
| `orden`               | INTEGER   | Orden de visualización        |
| `fecha_completado`    | TIMESTAMP | Cuándo se completó            |
| `usuario_completo_id` | INTEGER   | Quién lo completó             |

### 6. **Sistema de Evidencias**

#### Tabla: `evidencias`

Almacena evidencias multimedia de las inspecciones:

| Campo            | Tipo         | Descripción                 |
| ---------------- | ------------ | --------------------------- |
| `inspeccion_id`  | INTEGER      | Inspección asociada         |
| `tipo`           | VARCHAR(20)  | foto, video, archivo, audio |
| `url`            | TEXT         | URL del archivo             |
| `nombre_archivo` | VARCHAR(255) | Nombre original             |
| `tamano_bytes`   | BIGINT       | Tamaño del archivo          |
| `mime_type`      | VARCHAR(100) | Tipo MIME                   |
| `descripcion`    | TEXT         | Descripción de la evidencia |

### 7. **Sistema de Firmas Digitales**

#### Tabla: `firmas_digitales`

Captura firmas digitales para validación:

| Campo            | Tipo         | Descripción                  |
| ---------------- | ------------ | ---------------------------- |
| `inspeccion_id`  | INTEGER      | Inspección asociada          |
| `firma_url`      | TEXT         | URL de la imagen de la firma |
| `nombre_tecnico` | VARCHAR(100) | Nombre del técnico           |
| `cargo`          | VARCHAR(100) | Cargo del técnico            |
| `fecha_firma`    | TIMESTAMP    | Cuándo se firmó              |
| `ip_address`     | VARCHAR(45)  | IP desde donde se firmó      |
| `dispositivo`    | VARCHAR(200) | Información del dispositivo  |

### 8. **Mejoras en Mantenimientos**

#### Tabla: `mantenimientos` (mejorada)

Campos adicionales implementados:

| Campo                 | Tipo          | Descripción                                          |
| --------------------- | ------------- | ---------------------------------------------------- |
| `espacio_comun_id`    | INTEGER       | Referencia a espacio común (alternativo a cuarto_id) |
| `prioridad`           | VARCHAR(20)   | baja, media, alta, urgente                           |
| `fecha_inicio`        | TIMESTAMP     | Cuándo comenzó el trabajo                            |
| `fecha_finalizacion`  | TIMESTAMP     | Cuándo terminó el trabajo                            |
| `usuario_creador_id`  | INTEGER       | Quién creó el mantenimiento                          |
| `usuario_asignado_id` | INTEGER       | A quién se asignó                                    |
| `costo_estimado`      | DECIMAL(10,2) | Costo estimado                                       |
| `costo_real`          | DECIMAL(10,2) | Costo real                                           |

**Tipos de mantenimiento:**

- `normal` - Bajo demanda
- `rutina` - Programado recurrente
- `preventivo` - Preventivo
- `correctivo` - Correctivo
- `emergencia` - Urgente

**Estados de mantenimiento:**

- `pendiente` - Por realizar
- `en_proceso` - En ejecución
- `completado` - Finalizado
- `cancelado` - Cancelado

---

## 📊 Estructura de Tablas

### Tablas Principales

1. **configuracion_estados** - Configuración de estados con colores
2. **roles** - Roles del sistema
3. **usuarios** - Usuarios del sistema
4. **edificios** - Edificios del hotel
5. **cuartos** - Habitaciones
6. **espacios_comunes** - Áreas comunes
7. **mantenimientos** - Registros de mantenimiento
8. **inspecciones** - Inspecciones de mantenimientos
9. **checklists** - Listas de verificación
10. **checklist_items** - Items de checklists
11. **evidencias** - Evidencias multimedia
12. **firmas_digitales** - Firmas digitales

### Relaciones Principales

```
edificios (1) ──< (N) cuartos
edificios (1) ──< (N) espacios_comunes
cuartos (1) ──< (N) mantenimientos
espacios_comunes (1) ──< (N) mantenimientos
mantenimientos (1) ──< (N) inspecciones
inspecciones (1) ──< (N) checklists
checklists (1) ──< (N) checklist_items
inspecciones (1) ──< (N) evidencias
inspecciones (1) ──< (1) firmas_digitales
usuarios (1) ──< (N) inspecciones
roles (1) ──< (N) usuarios
```

---

## 🔍 Vistas y Funciones

### Vistas Creadas

#### 1. `vista_cuartos_completa`

Cuartos con información del edificio y configuración de estados (colores, iconos).

#### 2. `vista_espacios_comunes_completa`

Espacios comunes con información del edificio y configuración de estados.

#### 3. `vista_mantenimientos_completa`

Mantenimientos con toda la información relacionada (cuarto/espacio, edificio, usuarios).

#### 4. `vista_inspecciones_completa`

Inspecciones con información del técnico, mantenimiento y contadores de checklists/evidencias.

### Funciones Creadas

#### 1. `calcular_progreso_checklist(checklist_id)`

Calcula el porcentaje de progreso de un checklist basado en items completados.

**Retorna:** DECIMAL(5,2) - Porcentaje de 0.00 a 100.00

#### 2. `obtener_estadisticas_cuartos()`

Obtiene estadísticas de estados de cuartos con colores.

**Retorna:** Tabla con estado, cantidad, porcentaje, color, label

#### 3. `obtener_estadisticas_espacios_comunes()`

Obtiene estadísticas de estados de espacios comunes con colores.

**Retorna:** Tabla con estado, cantidad, porcentaje, color, label

### Triggers Implementados

1. **actualizar_updated_at** - Actualiza automáticamente el campo `updated_at` en:
   - edificios
   - cuartos
   - espacios_comunes
   - usuarios
   - checklists

2. **actualizar_progreso_checklist** - Actualiza automáticamente el progreso del checklist cuando se completa un item.

---

## 🌐 Endpoints API Relacionados

### API de Cuartos (`/api/cuartos`)

#### Gestión de Estados

- `PATCH /api/cuartos/:id/estado` - Cambiar estado de un cuarto
- `GET /api/cuartos/estado/:estado` - Filtrar cuartos por estado
- `GET /api/cuartos/estadisticas/estados` - Estadísticas de estados
- `GET /api/cuartos/configuracion/estados` - Configuración de estados con colores
- `GET /api/cuartos/dashboard/estados` - Dashboard completo con estadísticas y colores

#### CRUD Básico

- `GET /api/cuartos` - Listar todos los cuartos
- `GET /api/cuartos/:id` - Obtener un cuarto
- `POST /api/cuartos` - Crear cuarto
- `PUT /api/cuartos/:id` - Actualizar cuarto
- `DELETE /api/cuartos/:id` - Eliminar cuarto

### API de Espacios Comunes (Por implementar)

```javascript
// Endpoints sugeridos para espacios comunes
GET    /api/espacios-comunes
GET    /api/espacios-comunes/:id
POST   /api/espacios-comunes
PUT    /api/espacios-comunes/:id
DELETE /api/espacios-comunes/:id
PATCH  /api/espacios-comunes/:id/estado
GET    /api/espacios-comunes/tipo/:tipo
GET    /api/espacios-comunes/estadisticas/estados
```

### API de Mantenimientos (`/api/mantenimientos`)

- `GET /api/mantenimientos` - Listar mantenimientos
- `GET /api/mantenimientos/:id` - Obtener mantenimiento
- `POST /api/mantenimientos` - Crear mantenimiento
- `PUT /api/mantenimientos/:id` - Actualizar mantenimiento
- `DELETE /api/mantenimientos/:id` - Eliminar mantenimiento
- `PATCH /api/mantenimientos/:id/emitir` - Marcar alerta como emitida

### API de Inspecciones (Por implementar)

```javascript
// Endpoints sugeridos para inspecciones
GET    /api/inspecciones
GET    /api/inspecciones/:id
POST   /api/inspecciones
PUT    /api/inspecciones/:id
DELETE /api/inspecciones/:id
GET    /api/inspecciones/mantenimiento/:mantenimiento_id
POST   /api/inspecciones/:id/checklist
POST   /api/inspecciones/:id/evidencia
POST   /api/inspecciones/:id/firma
```

### API de Usuarios (Por implementar)

```javascript
// Endpoints sugeridos para usuarios
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/usuarios
GET    /api/usuarios/:id
POST   /api/usuarios
PUT    /api/usuarios/:id
DELETE /api/usuarios/:id
GET    /api/usuarios/rol/:rol_id
```

---

## 📈 Mejoras Implementadas vs. Esquema Anterior

| Característica     | Esquema Anterior | Esquema Nuevo                  |
| ------------------ | ---------------- | ------------------------------ |
| Estados de cuartos | ✅ Básico        | ✅ Con colores y configuración |
| Espacios comunes   | ❌ No            | ✅ Tabla completa              |
| Usuarios y roles   | ❌ No            | ✅ Sistema completo            |
| Inspecciones       | ❌ No            | ✅ Con checklists              |
| Evidencias         | ❌ No            | ✅ Multimedia completo         |
| Firmas digitales   | ❌ No            | ✅ Implementado                |
| Prioridades        | ❌ No            | ✅ baja/media/alta/urgente     |
| Costos             | ❌ No            | ✅ Estimado y real             |
| Vistas SQL         | ❌ No            | ✅ 4 vistas útiles             |
| Funciones SQL      | ❌ No            | ✅ 3 funciones                 |
| Triggers           | ❌ No            | ✅ 2 triggers                  |

---

## 🔧 Uso del Esquema

### Aplicar el Esquema

```bash
# Conectar a PostgreSQL
psql -U postgres -d jwmantto

# Aplicar el esquema
\i db/esquema_completo_2025-11-11.sql
```

### Verificar Instalación

```sql
-- Ver todas las tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver estadísticas de cuartos
SELECT * FROM obtener_estadisticas_cuartos();

-- Ver estadísticas de espacios comunes
SELECT * FROM obtener_estadisticas_espacios_comunes();

-- Ver cuartos con colores
SELECT * FROM vista_cuartos_completa;

-- Ver mantenimientos completos
SELECT * FROM vista_mantenimientos_completa;
```

---

## 📝 Notas de Implementación

### Pendientes de Desarrollo

1. **APIs Faltantes:**
   - API de Espacios Comunes
   - API de Inspecciones
   - API de Usuarios y Autenticación
   - API de Checklists
   - API de Evidencias

2. **Frontend:**
   - Interfaz para gestión de espacios comunes
   - Dashboard visual con colores de estados
   - Sistema de inspecciones con checklist
   - Captura de firmas digitales
   - Carga de evidencias multimedia

3. **Funcionalidades Adicionales:**
   - Sistema de notificaciones push
   - Reportes en PDF
   - Exportación de datos
   - Historial de cambios
   - Auditoría de acciones

### Consideraciones de Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Roles y permisos implementados
- ⚠️ Implementar autenticación JWT
- ⚠️ Validación de permisos en APIs
- ⚠️ Rate limiting en endpoints
- ⚠️ Sanitización de inputs

---

## 📚 Referencias

- [Diagrama de Clases](./DIAGRAMA_CLASES.md)
- [Arquitectura API](./ARQUITECTURA_API.md)
- [API Gestión Estados](./API_GESTION_ESTADOS.md)
- [Ejemplos Dashboard Colores](./EJEMPLOS_DASHBOARD_COLORES.md)

---

**Última actualización:** 2025-11-11  
**Versión del esquema:** 2.0.0  
**Autor:** Sistema JW Mantto
