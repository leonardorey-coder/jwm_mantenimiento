# Sistema de Fondo de Pantalla Personalizado

## Descripción

Sistema que permite a los usuarios configurar una imagen de fondo personalizada para la aplicación JW Marriott Mantenimiento. Cada usuario puede subir su propia imagen que se aplicará en toda la interfaz con un overlay elegante que mantiene la legibilidad del contenido.

## Componentes Implementados

### 1. Base de Datos

**Migración SQL**: `db/migrations/add_background_url_to_usuarios.sql`

- Agrega columna `background_url` a la tabla `usuarios`
- Tipo: `VARCHAR(500)`
- Nullable: Sí (permite que los usuarios no tengan fondo)
- Índice: Parcial sobre `background_url` donde no es NULL

```sql
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS background_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_usuarios_background_url
ON usuarios(background_url)
WHERE background_url IS NOT NULL;
```

### 2. Backend (API)

#### UploadThing Configuration

**Archivo**: `api/uploadthing.js`

Nuevo router `fondoPantalla`:

- Acepta solo imágenes
- Tamaño máximo: 5MB
- Máximo 1 archivo a la vez

```javascript
fondoPantalla: f({
  image: {
    maxFileSize: '5MB',
    maxFileCount: 1,
  },
});
```

#### Endpoint de Actualización

**Archivo**: `api/auth-routes.js`

**Ruta**: `POST /api/auth/actualizar-fondo`

**Middleware**: `verificarAutenticacion`

**Body**:

```json
{
  "background_url": "https://utfs.io/f/xxx.jpg" // o null para eliminar
}
```

**Response (éxito)**:

```json
{
  "success": true,
  "mensaje": "Fondo actualizado exitosamente",
  "usuario": {
    "id": 1,
    "nombre": "Usuario",
    "background_url": "https://utfs.io/f/xxx.jpg"
  }
}
```

#### Endpoint /me Actualizado

Se agregó `background_url` al SELECT de información del usuario:

```javascript
SELECT
  u.id, u.nombre, u.email, u.numero_empleado,
  u.departamento, u.telefono, u.foto_perfil_url,
  u.background_url, // ← NUEVO
  u.activo, u.ultimo_acceso, u.created_at,
  u.requiere_cambio_password,
  r.nombre as rol_nombre, r.permisos
FROM usuarios u
```

### 3. Frontend

#### JavaScript Manager

**Archivo**: `js/background-manager.js`

**Funciones principales**:

1. **`initBackgroundManager()`**: Inicializa el sistema al cargar la página
2. **`aplicarFondoUsuario()`**: Aplica el fondo del usuario autenticado
3. **`establecerFondo(url)`**: Establece una imagen de fondo
4. **`removerFondo()`**: Remueve el fondo personalizado
5. **`abrirModalConfigFondo()`**: Abre modal de configuración
6. **`handleFondoFileSelect(event)`**: Maneja selección de archivo
7. **`subirFondoUploadThing(file)`**: Sube imagen a UploadThing
8. **`actualizarFondoBackend(url)`**: Actualiza URL en backend
9. **`eliminarFondoUsuario()`**: Elimina el fondo del usuario

**Características**:

- Validación de tipo de archivo (solo imágenes)
- Validación de tamaño (máximo 5MB)
- Preview en tiempo real
- Persistencia en localStorage
- Manejo de errores elegante
- Loader durante subida

#### Estilos CSS

**Archivo**: `css/style.css` (al final del archivo)

**Clases principales**:

- `.app-custom-background`: Contenedor del fondo
- `.app-background-overlay`: Overlay para legibilidad
- `.modal-config-fondo`: Modal de configuración
- `.fondo-preview-container`: Contenedor de preview
- `.fondo-loader`: Indicador de carga

**Características de diseño**:

- Fondo con `background-attachment: fixed` para efecto parallax
- Overlay con `backdrop-filter: blur(8px)` para efecto glassmorphism
- Transiciones suaves de opacidad
- Soporte para tema dark/light
- Completamente responsive

### 4. Interfaz de Usuario

#### Botón en Header

**Archivo**: `index.html` (línea ~136)

```html
<button
  onclick="abrirModalConfigFondo()"
  class="download-btn btn-config-fondo-header"
  title="Configurar fondo de pantalla"
>
  <i class="fas fa-image"></i>
</button>
```

#### Modal de Configuración

Creado dinámicamente por JavaScript, incluye:

- Preview de imagen actual
- Botón para subir nueva imagen
- Botón para eliminar fondo
- Información sobre formatos y tamaños
- Mensajes de estado

## Flujo de Uso

### Usuario Configura Fondo

1. Usuario hace clic en botón de imagen en header
2. Se abre modal con preview del fondo actual (si existe)
3. Usuario hace clic en "Subir Nueva Imagen"
4. Selecciona archivo desde su dispositivo
5. Sistema valida:
   - Tipo de archivo (imagen)
   - Tamaño (máximo 5MB)
6. Muestra loader "Subiendo imagen..."
7. Sube archivo a UploadThing
8. Recibe URL del archivo subido
9. Actualiza backend con nueva URL
10. Aplica fondo inmediatamente en la interfaz
11. Muestra notificación de éxito
12. Actualiza preview en modal

### Usuario Elimina Fondo

1. Usuario hace clic en "Eliminar Fondo"
2. Confirma acción
3. Sistema envía `null` al backend
4. Remueve fondo del DOM
5. Limpia localStorage
6. Actualiza preview en modal

### Aplicación Automática

- Al iniciar sesión, el fondo se aplica automáticamente
- Al recargar página, se lee desde usuario actual
- Si no hay fondo, la interfaz se muestra normal

## Persistencia

### LocalStorage

```javascript
localStorage.setItem('user_background_url', url);
localStorage.getItem('user_background_url');
localStorage.removeItem('user_background_url');
```

### Base de Datos

El campo `background_url` en la tabla `usuarios` persiste la URL de forma permanente.

## Seguridad

### Validaciones

1. **Backend**:
   - Requiere autenticación (JWT)
   - Valida que URL sea de UploadThing (`uploadthing` o `utfs.io`)
   - Registra cambios en auditoría

2. **Frontend**:
   - Valida tipo de archivo (solo imágenes)
   - Valida tamaño (máximo 5MB)
   - No permite URLs externas arbitrarias

3. **UploadThing**:
   - Límite de tamaño: 5MB
   - Solo acepta imágenes
   - Middleware de autenticación

## Compatibilidad

### Navegadores

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### Dispositivos

- Desktop (Windows, macOS, Linux)
- Mobile (iOS, Android)
- PWA instalada
- Electron app

### Responsive

- Mobile: Botones y modal adaptados
- Tablet: Layout optimizado
- Desktop: Vista completa

## Rendimiento

### Optimizaciones

1. **Lazy Loading**: Fondo solo se carga cuando existe
2. **Transiciones**: Fade-in suave para evitar flash
3. **Backdrop Filter**: Hardware-accelerated en navegadores modernos
4. **Índice Parcial**: Solo indexa usuarios con fondo
5. **CDN**: UploadThing sirve imágenes desde CDN global

### Métricas Esperadas

- Tiempo de carga de fondo: ~500ms (depende de red)
- Tiempo de subida: ~2-5s para imagen de 2MB
- Impacto en rendimiento: Mínimo (< 5% CPU)

## Troubleshooting

### Fondo no se aplica

1. Verificar que usuario tiene `background_url` en base de datos
2. Revisar consola de navegador para errores
3. Verificar que URL es accesible (CORS)
4. Limpiar localStorage y recargar

### Error al subir imagen

1. Verificar tamaño (máximo 5MB)
2. Verificar formato (JPG, PNG, WebP)
3. Verificar token de UploadThing
4. Revisar logs del servidor

### Overlay muy oscuro/claro

- Ajustar valores de `rgba()` en `.app-background-overlay`
- Modificar `backdrop-filter: blur()` según necesidad

## Ejemplo de Uso

```javascript
// Aplicar fondo manualmente
window.establecerFondo('https://utfs.io/f/xxx.jpg');

// Remover fondo manualmente
window.removerFondo();

// Abrir modal de configuración
window.abrirModalConfigFondo();

// Verificar si hay fondo activo
document.body.classList.contains('has-custom-background');
```

## Mantenimiento

### Limpiar fondos no utilizados

Script SQL para encontrar fondos huérfanos:

```sql
-- Usuarios sin fondo
SELECT COUNT(*)
FROM usuarios
WHERE background_url IS NULL;

-- URLs únicas de fondos
SELECT DISTINCT background_url
FROM usuarios
WHERE background_url IS NOT NULL;
```

### Migrar fondos a nuevo servicio

Si se cambia de UploadThing a otro servicio:

```sql
-- Actualizar URLs en masa
UPDATE usuarios
SET background_url = REPLACE(background_url, 'utfs.io', 'nuevo-cdn.com')
WHERE background_url LIKE '%utfs.io%';
```

## Referencias

- [UploadThing Docs](https://docs.uploadthing.com/)
- [Backdrop Filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [JWT Authentication](./README_JWT_AUTH.md)

## Changelog

### v1.0.0 (2025-01-13)

- ✅ Implementación inicial
- ✅ Migración de base de datos
- ✅ Endpoints de API
- ✅ Interfaz de usuario
- ✅ Estilos CSS
- ✅ Integración con UploadThing
- ✅ Documentación completa

---

**Autor**: Sistema de Mantenimiento JW Marriott  
**Fecha**: 13 de Enero, 2025  
**Versión**: 1.0.0
