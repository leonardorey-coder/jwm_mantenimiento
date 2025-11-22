# Paquete "Espacios Comunes"

Este paquete contiene todo lo necesario para portar la pestaña **Espacios Comunes** a otra implementación del proyecto. Incluye:

- `tab-espacios.html`: marcado completo del tab.
- `espacios.css`: estilos específicos (bitácora, alertas, formularios inline, tarjeta Pixar, responsive).
- `espacios.js`: datos mock, estado, renderizado, filtros, alertas y formularios.

## Cómo usarlo

1. **Copiar HTML**: Inserta el contenido de `tab-espacios.html` dentro del contenedor principal de tabs (`<div class="tab-content" ...>`).
2. **Importar estilos**: Añade `espacios.css` al bundle principal o impórtalo después de tus variables globales (`<link rel="stylesheet" href="espacios.css">`).
3. **Incluir script**: Carga `espacios.js` después de tus utilidades globales (`escapeHtml`, `mostrarMensaje`, etc.). Ejemplo:
   ```html
   <script src="js/helpers.js"></script>
   <script src="espacios.js"></script>
   <script>
     EspaciosTab.init();
   </script>
   ```
4. **Inicializar**: Llama a `EspaciosTab.init()` una vez que el DOM esté listo. Usa las opciones de configuración para sobreescribir datos o helpers si es necesario.

## Configuración opcional

```javascript
EspaciosTab.init({
  helpers: {
    mostrarMensaje: (msg, type) => toast(msg, type)
  },
  data: {
    espacios: [...],
    servicios: [...]
  }
});
```

Consulta `espacios.js` para conocer todas las extensiones disponibles (paginación, alertas estáticas, persistencia en localStorage, etc.).
