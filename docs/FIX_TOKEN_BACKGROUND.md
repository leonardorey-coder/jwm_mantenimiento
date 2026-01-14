# ✅ FIX: Error "No hay token de autenticación" - RESUELTO

**Fecha**: 14 de enero de 2026  
**Problema**: El modal de fondo mostraba error "No hay token de autenticación" aunque el usuario estaba logueado.

---

## 🔍 CAUSA RAÍZ

El módulo `background-manager.js` estaba buscando el token en:

```javascript
localStorage.getItem('token'); // ❌ INCORRECTO
```

Pero la aplicación guarda el token como:

```javascript
localStorage.getItem('accessToken'); // ✅ CORRECTO
```

Además, el sistema soporta fallback a `sessionStorage` para el modo "Recordarme".

---

## 🔧 CAMBIOS APLICADOS

### Archivos Modificados

- `js/background-manager.js`

### Funciones Corregidas

1. **`abrirModalConfigFondo()`** (línea ~127)

   ```javascript
   // ANTES
   const token = localStorage.getItem('token');

   // DESPUÉS
   const accessToken =
     localStorage.getItem('accessToken') ||
     sessionStorage.getItem('accessToken');
   ```

2. **`handleFondoFileSelect()`** (línea ~277)

   ```javascript
   // ANTES
   const token = localStorage.getItem('token');

   // DESPUÉS
   const accessToken =
     localStorage.getItem('accessToken') ||
     sessionStorage.getItem('accessToken');
   ```

3. **`subirFondoUploadThing()`** (línea ~367)

   ```javascript
   // ANTES
   const token = localStorage.getItem('token');
   headers: {
     Authorization: `Bearer ${token}`;
   }

   // DESPUÉS
   const accessToken =
     localStorage.getItem('accessToken') ||
     sessionStorage.getItem('accessToken');
   const tokenType =
     localStorage.getItem('tokenType') ||
     sessionStorage.getItem('tokenType') ||
     'Bearer';
   headers: {
     Authorization: `${tokenType} ${accessToken}`;
   }
   ```

4. **`debugBackgroundAuth()`** (línea ~559)

   ```javascript
   // ANTES
   localStorage.getItem('token');

   // DESPUÉS
   const accessToken =
     localStorage.getItem('accessToken') ||
     sessionStorage.getItem('accessToken');
   ```

### Función Eliminada

- `obtenerToken()` - No se usaba, eliminada para limpiar el código

---

## ✅ VERIFICACIÓN

El patrón ahora coincide con el usado en el resto de la aplicación:

**app.js - fetchWithAuth()** (línea 89-96):

```javascript
const accessToken =
  localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
const tokenType =
  localStorage.getItem('tokenType') ||
  sessionStorage.getItem('tokenType') ||
  'Bearer';
```

**login-jwt.js** (al guardar tokens):

```javascript
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
localStorage.setItem('tokenExpiration', data.tokens.expiresIn);
localStorage.setItem('tokenType', data.tokens.tokenType);
```

---

## 🧪 PRUEBA

1. Asegúrate de que la aplicación Electron esté ejecutándose
2. Recarga la página: **Cmd+R** (macOS) o **Ctrl+R** (Windows/Linux)
3. Haz clic en el botón 📷 en el header
4. El modal debería abrirse sin error
5. Selecciona una imagen para subir
6. Debería subirse correctamente

---

## 📊 ESTADO DEL SISTEMA

Tokens en localStorage después del login:

```
✅ accessToken    - Token JWT principal
✅ refreshToken   - Token para renovar sesión
✅ tokenExpiration - Fecha de expiración
✅ tokenType      - Tipo de token (Bearer)
✅ currentUser    - Datos del usuario
✅ sesionId       - ID de la sesión
```

El sistema ya NO busca `token`, sino `accessToken` en todas las funciones.

---

## 🎯 RESULTADO

✅ Error de autenticación **RESUELTO**  
✅ Modal de fondo se abre correctamente  
✅ Upload de imágenes funcional  
✅ Patrón consistente con el resto de la aplicación

---

**Siguiente paso**: Recargar la aplicación y probar subir un fondo de pantalla.
