# Diagrama de Base de Datos Completo - JW Mantto

**Fecha:** 2025-11-11  
**Versión:** 2.0.0

## 🗂️ Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA JW MANTTO - SGSOM                           │
│                  Sistema de Gestión de Servicios y Operaciones              │
│                           de Mantenimiento                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ configuracion_estados│
├──────────────────────┤
│ • id (PK)           │
│ • valor (UNIQUE)    │◄──────────┐
│ • label             │           │
│ • color             │           │
│ • color_secundario  │           │
│ • icono             │           │
│ • prioridad         │           │
└──────────────────────┘           │
                                   │
┌──────────────────────┐           │
│ roles                │           │
├──────────────────────┤           │
│ • id (PK)           │           │
│ • nombre (UNIQUE)   │◄──┐       │
│ • descripcion       │   │       │
│ • permisos (JSON)   │   │       │
└──────────────────────┘   │       │
                           │       │
┌──────────────────────┐   │       │
│ usuarios             │   │       │
├──────────────────────┤   │       │
│ • id (PK)           │   │       │
│ • nombre            │   │       │
│ • email (UNIQUE)    │   │       │
│ • password_hash     │   │       │
│ • rol_id (FK) ──────┼───┘       │
│ • activo            │           │
│ • ultimo_acceso     │           │
└──────────────────────┘           │
         │                         │
         │ ┌─────────────────────────────────────┐
         │ │                                     │
         │ │                                     │
         ▼ ▼                                     │
┌──────────────────────┐                         │
│ edificios            │                         │
├──────────────────────┤                         │
│ • id (PK)           │                         │
│ • nombre (UNIQUE)   │                         │
│ • descripcion       │                         │
│ • direccion         │                         │
│ • total_pisos       │                         │
│ • activo            │                         │
└──────────────────────┘                         │
         │                                       │
         ├───────────────┬─────────────────┐     │
         │               │                 │     │
         ▼               ▼                 │     │
┌──────────────────────┐ ┌──────────────────────┐│
│ cuartos              │ │ espacios_comunes     ││
├──────────────────────┤ ├──────────────────────┤│
│ • id (PK)           │ │ • id (PK)           ││
│ • numero            │ │ • nombre            ││
│ • edificio_id (FK) ─┼─┤ • edificio_id (FK) ─┼┘
│ • descripcion       │ │ • tipo              │
│ • estado (FK) ──────┼─┼─• estado (FK) ──────┼──┘
│ • piso              │ │ • descripcion       │
│ • capacidad         │ │ • capacidad         │
│ • tipo_habitacion   │ │ • horario_apertura  │
│ • precio_noche      │ │ • horario_cierre    │
│ • activo            │ │ • activo            │
└──────────────────────┘ └──────────────────────┘
         │                        │
         │                        │
         └────────┬───────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────┐
│ mantenimientos                                 │
├────────────────────────────────────────────────┤
│ • id (PK)                                     │
│ • cuarto_id (FK, nullable)                    │
│ • espacio_comun_id (FK, nullable)             │
│ • descripcion                                 │
│ • tipo (normal/rutina/preventivo/...)         │
│ • estado (pendiente/en_proceso/...)           │
│ • prioridad (baja/media/alta/urgente)         │
│ • fecha_creacion                              │
│ • fecha_programada                            │
│ • fecha_inicio                                │
│ • fecha_finalizacion                          │
│ • hora                                        │
│ • dia_alerta                                  │
│ • alerta_emitida                              │
│ • usuario_creador_id (FK) ────────────────────┼──┐
│ • usuario_asignado_id (FK) ────────────────────┼─┐│
│ • costo_estimado                              │ ││
│ • costo_real                                  │ ││
│ • notas                                       │ ││
└────────────────────────────────────────────────┘ ││
         │                                         ││
         │                                         ││
         ▼                                         ││
┌────────────────────────────────────────────────┐││
│ inspecciones                                   │││
├────────────────────────────────────────────────┤││
│ • id (PK)                                     │││
│ • mantenimiento_id (FK)                       │││
│ • tecnico_id (FK) ─────────────────────────────┼┘│
│ • fecha_inspeccion                            │ │
│ • resultado (aprobado/rechazado/...)          │ │
│ • observaciones                               │ │
│ • firma_capturada                             │ │
│ • duracion_minutos                            │ │
└────────────────────────────────────────────────┘ │
         │                                         │
         ├──────────┬──────────┬──────────────┐    │
         │          │          │              │    │
         ▼          ▼          ▼              ▼    │
┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ checklists  │ │evidencias│ │ firmas   │ │              │
├─────────────┤ ├──────────┤ │ digitales│ │              │
│• id (PK)   │ │• id (PK) │ ├──────────┤ │              │
│• inspeccion│ │• inspecc.│ │• id (PK) │ │              │
│  _id (FK)  │ │  _id (FK)│ │• inspecc.│ │              │
│• titulo    │ │• tipo    │ │  _id (FK)│ │              │
│• completado│ │• url     │ │• firma   │ │              │
│• progreso_%│ │• nombre  │ │  _url    │ │              │
└─────────────┘ │• tamaño  │ │• nombre  │ │              │
      │         │• mime    │ │  tecnico │ │              │
      │         │• usuario │ │• cargo   │ │              │
      │         │  _id (FK)│ │• fecha   │ │              │
      │         └──────────┘ │  _firma  │ │              │
      │                 │    │• ip      │ │              │
      │                 └────┼──────────┼─┘              │
      ▼                      └──────────┘                │
┌─────────────────────┐                                 │
│ checklist_items     │                                 │
├─────────────────────┤                                 │
│ • id (PK)          │                                 │
│ • checklist_id (FK)│                                 │
│ • descripcion      │                                 │
│ • obligatorio      │                                 │
│ • completado       │                                 │
│ • orden            │                                 │
│ • fecha_completado │                                 │
│ • usuario_completo │                                 │
│   _id (FK) ────────┼─────────────────────────────────┘
│ • observaciones    │
└─────────────────────┘
```

## 📊 Resumen de Tablas

### Tablas de Configuración (2)

- `configuracion_estados` - Estados con colores (4 registros)
- `roles` - Roles del sistema (3 registros)

### Tablas de Usuarios (1)

- `usuarios` - Usuarios del sistema

### Tablas de Estructura (3)

- `edificios` - Edificios del hotel
- `cuartos` - Habitaciones
- `espacios_comunes` - Áreas comunes (gimnasio, piscina, etc.)

### Tablas de Mantenimiento (1)

- `mantenimientos` - Registros de mantenimiento

### Tablas de Inspecciones (5)

- `inspecciones` - Inspecciones realizadas
- `checklists` - Listas de verificación
- `checklist_items` - Items de checklists
- `evidencias` - Fotos, videos, archivos
- `firmas_digitales` - Firmas de validación

**Total: 12 tablas**

## 🔗 Tipos de Relaciones

### Relaciones 1:N (Uno a Muchos)

```
roles (1) ──────< (N) usuarios
edificios (1) ──< (N) cuartos
edificios (1) ──< (N) espacios_comunes
cuartos (1) ────< (N) mantenimientos
espacios_comunes (1) ──< (N) mantenimientos
usuarios (1) ────< (N) mantenimientos (creador)
usuarios (1) ────< (N) mantenimientos (asignado)
mantenimientos (1) ──< (N) inspecciones
usuarios (1) ────< (N) inspecciones (técnico)
inspecciones (1) ──< (N) checklists
inspecciones (1) ──< (N) evidencias
checklists (1) ──< (N) checklist_items
usuarios (1) ────< (N) checklist_items (quien completó)
usuarios (1) ────< (N) evidencias (quien subió)
```

### Relaciones 1:1 (Uno a Uno)

```
inspecciones (1) ──── (1) firmas_digitales
```

### Relaciones con Configuración

```
configuracion_estados (1) ──< (N) cuartos
configuracion_estados (1) ──< (N) espacios_comunes
```

## 🎨 Código de Colores por Módulo

```
┌─────────────────────────────────────────┐
│ 🔵 CONFIGURACIÓN                        │
│ configuracion_estados, roles            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🟢 USUARIOS Y ACCESO                    │
│ usuarios                                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🟡 ESTRUCTURA DEL HOTEL                 │
│ edificios, cuartos, espacios_comunes    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🟠 OPERACIONES                          │
│ mantenimientos                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🟣 CALIDAD Y VALIDACIÓN                 │
│ inspecciones, checklists,               │
│ checklist_items, evidencias,            │
│ firmas_digitales                        │
└─────────────────────────────────────────┘
```

## 📈 Cardinalidades Detalladas

### Edificios → Cuartos

- Un edificio **debe tener** al menos 1 cuarto
- Un edificio **puede tener** muchos cuartos
- Un cuarto **pertenece a** exactamente 1 edificio

```
edificios (1,1) ──────< (1,N) cuartos
```

### Edificios → Espacios Comunes

- Un edificio **puede tener** 0 o más espacios comunes
- Un espacio común **pertenece a** exactamente 1 edificio

```
edificios (1,1) ──────< (0,N) espacios_comunes
```

### Cuartos/Espacios → Mantenimientos

- Un cuarto **puede tener** 0 o más mantenimientos
- Un espacio común **puede tener** 0 o más mantenimientos
- Un mantenimiento **es para** 1 cuarto O 1 espacio común (XOR)

```
cuartos (1,1) ──────< (0,N) mantenimientos
espacios_comunes (1,1) ──< (0,N) mantenimientos
```

### Mantenimientos → Inspecciones

- Un mantenimiento **puede tener** 0 o más inspecciones
- Una inspección **es de** exactamente 1 mantenimiento

```
mantenimientos (1,1) ──< (0,N) inspecciones
```

### Inspecciones → Checklists

- Una inspección **puede tener** 0 o más checklists
- Un checklist **pertenece a** exactamente 1 inspección

```
inspecciones (1,1) ──< (0,N) checklists
```

### Checklists → Items

- Un checklist **debe tener** al menos 1 item
- Un item **pertenece a** exactamente 1 checklist

```
checklists (1,1) ──< (1,N) checklist_items
```

### Inspecciones → Evidencias

- Una inspección **puede tener** 0 o más evidencias
- Una evidencia **pertenece a** exactamente 1 inspección

```
inspecciones (1,1) ──< (0,N) evidencias
```

### Inspecciones → Firmas

- Una inspección **puede tener** 0 o 1 firma
- Una firma **pertenece a** exactamente 1 inspección

```
inspecciones (1,1) ──── (0,1) firmas_digitales
```

## 🔑 Claves e Índices

### Claves Primarias (PK)

Todas las tablas tienen un `id` SERIAL como clave primaria.

### Claves Foráneas (FK)

| Tabla            | Campo FK            | Referencia                   | Acción ON DELETE |
| ---------------- | ------------------- | ---------------------------- | ---------------- |
| usuarios         | rol_id              | roles(id)                    | RESTRICT         |
| cuartos          | edificio_id         | edificios(id)                | CASCADE          |
| cuartos          | estado              | configuracion_estados(valor) | RESTRICT         |
| espacios_comunes | edificio_id         | edificios(id)                | CASCADE          |
| espacios_comunes | estado              | configuracion_estados(valor) | RESTRICT         |
| mantenimientos   | cuarto_id           | cuartos(id)                  | CASCADE          |
| mantenimientos   | espacio_comun_id    | espacios_comunes(id)         | CASCADE          |
| mantenimientos   | usuario_creador_id  | usuarios(id)                 | SET NULL         |
| mantenimientos   | usuario_asignado_id | usuarios(id)                 | SET NULL         |
| inspecciones     | mantenimiento_id    | mantenimientos(id)           | CASCADE          |
| inspecciones     | tecnico_id          | usuarios(id)                 | RESTRICT         |
| checklists       | inspeccion_id       | inspecciones(id)             | CASCADE          |
| checklist_items  | checklist_id        | checklists(id)               | CASCADE          |
| checklist_items  | usuario_completo_id | usuarios(id)                 | SET NULL         |
| evidencias       | inspeccion_id       | inspecciones(id)             | CASCADE          |
| evidencias       | usuario_subida_id   | usuarios(id)                 | SET NULL         |
| firmas_digitales | inspeccion_id       | inspecciones(id)             | CASCADE          |

### Claves Únicas (UNIQUE)

- `configuracion_estados.valor`
- `roles.nombre`
- `usuarios.email`
- `edificios.nombre`
- `cuartos(numero, edificio_id)` - Compuesta
- `espacios_comunes(nombre, edificio_id)` - Compuesta

### Índices de Rendimiento

**Total de índices:** 35+

Principales índices por tabla:

- `cuartos`: 5 índices (edificio, estado, numero, piso, activo)
- `espacios_comunes`: 4 índices (edificio, estado, tipo, activo)
- `mantenimientos`: 8 índices (cuarto, espacio, tipo, estado, prioridad, fechas, usuario)
- `inspecciones`: 4 índices (mantenimiento, tecnico, fecha, resultado)
- Y más...

## 🔄 Triggers Automáticos

### 1. Actualización de `updated_at`

Actualiza automáticamente el timestamp cuando se modifica un registro.

**Tablas afectadas:**

- edificios
- cuartos
- espacios_comunes
- usuarios
- checklists

### 2. Actualización de Progreso de Checklist

Recalcula automáticamente el porcentaje de progreso cuando se completa un item.

**Tabla afectada:**

- checklist_items → checklists

## 📊 Vistas Disponibles

### 1. `vista_cuartos_completa`

Cuartos con información del edificio y configuración de colores.

**Campos adicionales:**

- edificio_nombre
- estado_label
- estado_color
- estado_color_secundario
- estado_icono

### 2. `vista_espacios_comunes_completa`

Espacios comunes con información del edificio y colores.

**Campos adicionales:**

- edificio_nombre
- estado_label
- estado_color
- estado_color_secundario
- estado_icono

### 3. `vista_mantenimientos_completa`

Mantenimientos con toda la información relacionada.

**Campos adicionales:**

- cuarto_numero
- cuarto_estado
- espacio_comun_nombre
- espacio_comun_tipo
- edificio_nombre
- usuario_creador_nombre
- usuario_asignado_nombre

### 4. `vista_inspecciones_completa`

Inspecciones con información del técnico y contadores.

**Campos adicionales:**

- tecnico_nombre
- tecnico_email
- mantenimiento_descripcion
- mantenimiento_tipo
- mantenimiento_estado
- total_checklists
- total_evidencias
- tiene_firma

## 🎯 Funciones SQL

### 1. `calcular_progreso_checklist(checklist_id)`

Calcula el porcentaje de progreso de un checklist.

**Parámetros:**

- `checklist_id` (INTEGER)

**Retorna:**

- DECIMAL(5,2) - Porcentaje de 0.00 a 100.00

**Ejemplo:**

```sql
SELECT calcular_progreso_checklist(1);
-- Resultado: 75.00
```

### 2. `obtener_estadisticas_cuartos()`

Obtiene estadísticas de estados de cuartos con colores.

**Retorna tabla con:**

- estado (VARCHAR)
- cantidad (BIGINT)
- porcentaje (DECIMAL)
- color (VARCHAR)
- label (VARCHAR)

**Ejemplo:**

```sql
SELECT * FROM obtener_estadisticas_cuartos();
```

### 3. `obtener_estadisticas_espacios_comunes()`

Obtiene estadísticas de estados de espacios comunes.

**Retorna tabla con:**

- estado (VARCHAR)
- cantidad (BIGINT)
- porcentaje (DECIMAL)
- color (VARCHAR)
- label (VARCHAR)

**Ejemplo:**

```sql
SELECT * FROM obtener_estadisticas_espacios_comunes();
```

## 📝 Restricciones CHECK

### Estados

- `cuartos.estado` → Debe existir en `configuracion_estados`
- `espacios_comunes.estado` → Debe existir en `configuracion_estados`

### Mantenimientos

- `tipo` → 'normal', 'rutina', 'preventivo', 'correctivo', 'emergencia'
- `estado` → 'pendiente', 'en_proceso', 'completado', 'cancelado'
- `prioridad` → 'baja', 'media', 'alta', 'urgente'
- `dia_alerta` → Entre 1 y 31
- Debe tener `cuarto_id` O `espacio_comun_id` (no ambos, no ninguno)

### Inspecciones

- `resultado` → 'aprobado', 'rechazado', 'requiere_seguimiento'

### Evidencias

- `tipo` → 'foto', 'video', 'archivo', 'audio'

## 🔐 Consideraciones de Seguridad

1. **Contraseñas**: Almacenadas como hash bcrypt en `usuarios.password_hash`
2. **Roles**: Sistema de permisos basado en roles (RBAC)
3. **Auditoría**: Campos `created_at` y `updated_at` en tablas principales
4. **Integridad**: Claves foráneas con acciones CASCADE/RESTRICT/SET NULL apropiadas
5. **Validación**: Restricciones CHECK en campos críticos

---

**Última actualización:** 2025-11-11  
**Versión:** 2.0.0  
**Base de datos:** PostgreSQL 12+
