# 🔍 DIAGNOSTICO: Error "No hay token de autenticación"

## El Problema

El sistema muestra el error "Debes iniciar sesión para personalizar el fondo" aunque ya hayas iniciado sesión.

## Causa Probable

El token de autenticación no está siendo guardado en localStorage, o se está perdiendo entre páginas.

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Abrir la Consola de Desarrollador

1. En la aplicación Electron que está abierta
2. Presiona: **Cmd + Option + I** (macOS) o **Ctrl + Shift + I** (Windows/Linux)
3. Ve a la pestaña **"Console"**

### Paso 2: Ejecutar Diagnóstico

En la consola, copia y pega este comando:

```javascript
debugBackgroundAuth();
```

Presiona Enter. Esto mostrará:

- ✅ Si tienes token o no
- ✅ Si window.AppState existe
- ✅ Si hay un usuario cargado
- ✅ Todas las claves en localStorage

### Paso 3: Interpretar Resultados

#### Escenario A: NO HAY TOKEN

```
🔑 Token en localStorage: NO
```

**Solución**: Necesitas iniciar sesión de nuevo:

1. En la consola, ejecuta:
   ```javascript
   window.location.href = '/login.html';
   ```
2. Inicia sesión con tus credenciales
3. Después del login, intenta subir el fondo de nuevo

#### Escenario B: HAY TOKEN PERO NO HAY USUARIO

```
🔑 Token en localStorage: SÍ (longitud: 150)
👤 window.AppState.currentUser: No existe
```

**Solución**: El AppState no se inicializó correctamente:

1. En la consola, ejecuta:
   ```javascript
   window.checkAuthentication();
   ```
2. Espera unos segundos
3. Ejecuta de nuevo:
   ```javascript
   debugBackgroundAuth();
   ```
4. Si ahora aparece el usuario, intenta subir el fondo

#### Escenario C: HAY TOKEN Y USUARIO

```
🔑 Token en localStorage: SÍ (longitud: 150)
👤 window.AppState.currentUser: Existe
   - Nombre: Tu Nombre
```

**Solución**: Esto es raro. Intenta:

1. En la consola, ejecuta:
   ```javascript
   localStorage.clear();
   ```
2. Recarga la página: Cmd+R (macOS) o Ctrl+R (Windows/Linux)
3. Inicia sesión de nuevo
4. Intenta subir el fondo

---

## 🎯 SOLUCIÓN RÁPIDA

Si no quieres hacer el diagnóstico, simplemente:

1. **Cierra la aplicación Electron completamente**
2. **Ábrela de nuevo** con:
   ```bash
   npm run electron:dev
   ```
3. **Inicia sesión** en `/login.html`
4. **Espera a ser redirigido** a la página principal
5. **Intenta subir el fondo de nuevo**

---

## 📝 NOTAS IMPORTANTES

### ¿Por qué pasa esto?

- Electron a veces tiene problemas con localStorage entre diferentes contextos
- Si cierras la app sin hacer logout, el token puede perderse
- Si navegas directamente a páginas sin pasar por login, el token no se carga

### ¿Cómo evitarlo?

- Siempre usa el flujo normal de login
- No navegues manualmente entre páginas usando la barra de direcciones
- Usa los botones de la aplicación para navegar

---

## 🆘 SI NADA FUNCIONA

Ejecuta en la terminal:

```bash
cd /Users/leonardocruz/Documents/proyectos/jwm_mant_cuartos_restored
node diagnostic-auth.js
```

Y comparte el output con el desarrollador.

---

## 📞 NECESITAS MÁS AYUDA?

Abre la consola (Cmd+Option+I) y ejecuta estos comandos uno por uno, compartiendo el resultado:

```javascript
// 1. Ver URL actual
console.log(window.location.href);

// 2. Ver token
console.log(localStorage.getItem('token'));

// 3. Ver usuario
console.log(window.AppState);

// 4. Diagnóstico completo
debugBackgroundAuth();
```

Comparte la captura de pantalla de los resultados.
