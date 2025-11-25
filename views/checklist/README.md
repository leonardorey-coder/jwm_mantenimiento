# Checklist Tab - Módulo de Inspección de Habitaciones

Este módulo reemplaza la vista básica de checklist con una implementación completa que incluye filtros por categorías, búsqueda avanzada, paginación y paneles laterales.

## Estructura de Archivos

```
views/checklist/
├── checklist-styles.css  # Estilos específicos del checklist
├── checklist-tab.js      # Lógica JavaScript del módulo
└── README.md             # Esta documentación
```

## Características

### 1. Filtro de Categorías
- Toggle para móvil con botón expandible
- Categorías predefinidas: Climatización, Electrónica, Mobiliario, Sanitarios, Amenidades, Estructura
- Soporte para categorías personalizadas (almacenadas en localStorage)

### 2. Búsqueda Avanzada (Grid de 4 columnas)
- Buscar por nombre de ítem
- Filtrar por edificio
- Filtrar por estado (Bueno/Regular/Malo)
- Filtrar por último editor

### 3. Grid de Habitaciones
- Cards con información completa de cada habitación
- Semáforo visual para cada ítem (Bueno=Verde, Regular=Amarillo, Malo=Rojo)
- Contador de estados por habitación
- Búsqueda interna en cada card
- Información del último editor

### 4. Paginación
- 4 habitaciones por página
- Navegación con botones Anterior/Siguiente
- Selector de página con dropdown
- Contador total de habitaciones

### 5. Paneles Laterales
- **Nueva Sección (Admin)**: Formulario para agregar categorías e ítems personalizados
- **Inspecciones Recientes**: Lista de las últimas inspecciones con filtro
- **Acciones (Admin)**: Botones para exportar a Excel y generar PDF

### 6. Modal de Detalles
- Resumen de estados por habitación
- Historial de ediciones
- Exportación individual a Excel/PDF

## Funciones JavaScript Principales

| Función | Descripción |
|---------|-------------|
| `initChecklistTab()` | Inicializa el módulo |
| `loadChecklistData()` | Carga datos desde localStorage |
| `renderChecklistGrid(data)` | Renderiza las cards de habitaciones |
| `updateChecklistEstado(cuartoId, itemIndex, estado)` | Actualiza el estado de un ítem |
| `applyChecklistFilters()` | Aplica todos los filtros activos |
| `filtrarChecklistPorCategoria(categoriaId)` | Filtra por categoría |
| `openChecklistDetailsModal(cuartoId)` | Abre modal de detalles |
| `exportChecklistToExcel(cuartoId)` | Exporta a CSV/Excel |
| `exportChecklistToPDF(cuartoId)` | Genera ventana de impresión PDF |

## Almacenamiento (localStorage)

| Key | Descripción |
|-----|-------------|
| `checklistData` | Datos de checklist por habitación |
| `customChecklistCategorias` | Categorías personalizadas |
| `customChecklistItems` | Ítems personalizados |
| `inspeccionesRecientes` | Historial de inspecciones |

## Estados del Semáforo

- **Bueno** (`bueno`): Color verde `#10b981` - Ítem en buen estado
- **Regular** (`regular`): Color amarillo `#f59e0b` - Requiere atención
- **Malo** (`malo`): Color rojo `#ef4444` - Necesita reparación

## Responsive Design

- **Desktop (>960px)**: Grid de categorías horizontal, 2 cards por fila
- **Tablet (768px-960px)**: Toggle de categorías, 1-2 cards por fila
- **Mobile (<768px)**: Categorías colapsables, 1 card por fila, paneles apilados

## Integración con index.html

Los archivos se cargan en `index.html`:
```html
<!-- Al final del <body> -->
<script src="views/checklist/checklist-tab.js"></script>
```

## Dark Mode

El CSS incluye soporte completo para modo oscuro usando las variables CSS del sistema principal:
- `--fondo-principal-dark`
- `--texto-principal-dark`
- Etc.

---

**Desarrollado para:** Sistema de Mantenimiento JW Marriott Los Cabos  
**Versión:** 1.0  
**Fecha:** Enero 2025
