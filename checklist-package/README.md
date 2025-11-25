Paquete: Checklist tab
======================

Contenido del paquete:

- `checklist-tab.html` — HTML independiente que contiene la pestaña `#tab-checklist` lista para insertar.
- `checklist-styles.css` — CSS mínimo necesario para que la pestaña mantenga su aspecto y estructura.
- `checklist-scripts.js` — JS de integración: expone eventos y hooks para que el integrador (tu compañero) conecte los filtros y acciones con la lógica de la aplicación.

Dependencias externas (referencias en HTML):
- Font Awesome (CDN) para iconos.

Instrucciones rápidas de integración
-----------------------------------
1. Descomprimir el ZIP y copiar los archivos dentro del proyecto del compañero (por ejemplo en `includes/checklist/`).
2. Insertar el contenido de `checklist-tab.html` dentro del lugar correspondiente en su página (por ejemplo, pegar el `<div id="tab-checklist">...</div>` donde debe ir la pestaña).
3. Incluir `checklist-styles.css` en el `head` del proyecto o copiar las reglas al archivo CSS global.
   - `<link rel="stylesheet" href="ruta/a/checklist-styles.css">`
4. Incluir `checklist-scripts.js` al final del `body` o en el bundle de JS.
   - `<script src="ruta/a/checklist-scripts.js"></script>`
5. Conectar la lógica de filtrado / renderizado:
   - El paquete dispara los siguientes eventos en `#tab-checklist`:
     - `checklistFiltersChanged` — detail: { q, edificio, estado, editor }
     - `checklistExportRequested` — cuando el usuario pide exportar
     - `checklistReportRequested` — cuando el usuario pide reporte
   - Ejemplo de escucha:
     ```js
     document.getElementById('tab-checklist').addEventListener('checklistFiltersChanged', (e)=>{
       // e.detail contiene los filtros seleccionados
       renderFilteredChecklist(e.detail);
     });
     ```
6. Si el proyecto ya tiene estilos globales (recomendado), puedes omitir o fusionar `checklist-styles.css`.

Notas
-----
- El paquete está pensado para facilitar la copia exacta de la estructura y comportamiento visual del tab. No incluye toda la lógica del backend ni las funciones auxiliares del proyecto principal.
- Si quieres que incluya la renderización completa del grid (con datos de `localStorage`/`AppState`) también lo puedo añadir.

Contacto
-------
Si quieres que adapte el paquete para otro framework (React/Vue) o incluya más dependencias, dime y lo preparo.