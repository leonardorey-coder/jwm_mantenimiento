# Checklist de Testing - Migración IndexedDB

## 🎯 Objetivo

Verificar que la migración de localStorage a IndexedDB funciona correctamente en todos los escenarios.

## ✅ Tests de Inicialización

### 1. Primera Carga (Migración)

- [ ] Abrir aplicación en navegador limpio
- [ ] Verificar en consola: "Inicializando sistema de almacenamiento"
- [ ] Verificar en consola: "Migración completada exitosamente"
- [ ] Verificar flag: `localStorage.getItem('__indexeddb_migrated__')` === `'true'`
- [ ] Abrir DevTools → Application → IndexedDB → Ver `jwm_mant_cuartos_db`
- [ ] Verificar stores: auth, usuarios, edificios, cuartos, mantenimientos, cache, sync_queue

### 2. Carga Subsecuente

- [ ] Recargar página
- [ ] Verificar en consola: "Ya se realizó la migración anteriormente"
- [ ] Verificar que NO se ejecuta migración nuevamente
- [ ] Datos siguen disponibles en IndexedDB

## ✅ Tests de Autenticación

### 3. Login Exitoso

- [ ] Hacer login con credenciales válidas
- [ ] Marcar "Recordar sesión"
- [ ] Verificar en consola: "Tokens guardados en IndexedDB"
- [ ] Verificar en consola: "Usuario guardado en IndexedDB"
- [ ] Abrir DevTools → IndexedDB → auth store
- [ ] Verificar registros: accessToken, refreshToken, currentUser, usuarioActualId
- [ ] Cerrar y reabrir navegador
- [ ] Verificar que sigue autenticado

### 4. Login sin "Recordar"

- [ ] Hacer logout
- [ ] Hacer login SIN marcar "Recordar sesión"
- [ ] Verificar que tokens se guardan con `persistent: false`
- [ ] Cerrar navegador completamente
- [ ] Reabrir navegador
- [ ] Verificar que sesión NO persiste (pide login)

### 5. Logout

- [ ] Hacer login
- [ ] Hacer logout
- [ ] Verificar en consola: "Datos de autenticación limpiados"
- [ ] Verificar que store `auth` está vacía o solo tiene datos no sensibles
- [ ] Redirige a login.html

## ✅ Tests de Datos

### 6. Cargar Datos desde API

- [ ] Con conexión activa, navegar a dashboard
- [ ] Verificar en consola: "Datos principales cargados desde API"
- [ ] Verificar en consola: "Datos guardados en IndexedDB"
- [ ] Abrir DevTools → IndexedDB → Verificar stores pobladas:
  - [ ] cuartos (con registros)
  - [ ] edificios (con registros)
  - [ ] mantenimientos (con registros)
  - [ ] usuarios (con registros)

### 7. Modo Offline - Cargar desde IndexedDB

- [ ] Cargar datos online (paso anterior)
- [ ] DevTools → Network → Seleccionar "Offline"
- [ ] Recargar página
- [ ] Verificar en consola: "Cargando datos en modo offline"
- [ ] Verificar en consola: "Datos offline cargados desde IndexedDB"
- [ ] Verificar que interfaz se renderiza correctamente con datos
- [ ] Verificar banner/mensaje de "Modo offline"

### 8. Búsquedas por Índice

- [ ] En consola del navegador ejecutar:

```javascript
// Cuartos de edificio 1
const cuartos = await window.dbManager.getByIndex('cuartos', 'edificio_id', 1);
console.log('Cuartos edificio 1:', cuartos);

// Cuartos ocupados
const ocupados = await window.dbManager.getByIndex(
  'cuartos',
  'estado',
  'ocupado'
);
console.log('Cuartos ocupados:', ocupados);

// Mantenimientos pendientes
const pendientes = await window.dbManager.getByIndex(
  'mantenimientos',
  'estado',
  'pendiente'
);
console.log('Pendientes:', pendientes);
```

- [ ] Verificar que devuelve resultados correctos
- [ ] Verificar que es más rápido que filtrar array completo

## ✅ Tests de Cache

### 9. Cache con Expiración

- [ ] En consola ejecutar:

```javascript
// Guardar con TTL de 1 minuto
await window.dbManager.setCache('test_cache', { valor: 123 }, 1);

// Obtener inmediatamente
const val1 = await window.dbManager.getCache('test_cache');
console.log('Cache válido:', val1); // { valor: 123 }

// Esperar 61 segundos
setTimeout(async () => {
  const val2 = await window.dbManager.getCache('test_cache');
  console.log('Cache expirado:', val2); // null
}, 61000);
```

- [ ] Verificar comportamiento de expiración

### 10. Preferencias de Usuario

- [ ] Cambiar tema (light/dark)
- [ ] Recargar página
- [ ] Verificar que tema persiste
- [ ] En consola:

```javascript
const tema = await window.storageHelper.getTheme();
console.log('Tema guardado:', tema);
```

## ✅ Tests de Sincronización Offline

### 11. Crear Operación Offline

- [ ] DevTools → Network → "Offline"
- [ ] Intentar crear un mantenimiento
- [ ] Verificar mensaje: "Guardado localmente - Se sincronizará..."
- [ ] En consola:

```javascript
const pending = await window.dbManager.getPendingSyncOperations();
console.log('Operaciones pendientes:', pending);
```

- [ ] Verificar que operación está en cola con status: 'pending'

### 12. Sincronización al Recuperar Conexión

- [ ] Con operaciones pendientes (paso anterior)
- [ ] DevTools → Network → "Online"
- [ ] Esperar sincronización automática o ejecutar:

```javascript
await window.storageHelper.processSyncQueue('http://localhost:3001');
```

- [ ] Verificar en consola: "X operaciones sincronizadas"
- [ ] Verificar que status cambió a 'completed'
- [ ] Verificar en API que datos se guardaron

### 13. Múltiples Operaciones Offline

- [ ] Offline
- [ ] Crear 5 mantenimientos diferentes
- [ ] Editar 2 cuartos
- [ ] Online
- [ ] Verificar sincronización de todas las operaciones
- [ ] Verificar que no hay conflictos

## ✅ Tests de Rendimiento

### 14. Comparar localStorage vs IndexedDB

```javascript
// Test localStorage
console.time('localStorage-write');
for (let i = 0; i < 1000; i++) {
  localStorage.setItem(`test_${i}`, JSON.stringify({ id: i, data: 'test' }));
}
console.timeEnd('localStorage-write');

// Test IndexedDB
console.time('indexeddb-write');
const data = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  data: 'test',
}));
await window.dbManager.setMultiple('cache', data);
console.timeEnd('indexeddb-write');
```

- [ ] Verificar que IndexedDB es más rápido
- [ ] Verificar que localStorage bloquea UI
- [ ] Verificar que IndexedDB NO bloquea UI

### 15. Capacidad de Almacenamiento

```javascript
// Ver uso actual
const info = await window.storageHelper.showStorageInfo();
console.log('Uso:', info.estimate.usage);
console.log('Cuota:', info.estimate.quota);
```

- [ ] Verificar que IndexedDB tiene más espacio disponible

## ✅ Tests de Mantenimiento

### 16. Limpieza de Datos Expirados

```javascript
// Agregar datos con diferentes TTL
await window.dbManager.setCache('test1', 'valor1', 0.1); // 0.1 min
await window.dbManager.setCache('test2', 'valor2', 1); // 1 min
await window.dbManager.setCache('test3', 'valor3', 60); // 60 min

// Esperar 7 segundos
setTimeout(async () => {
  const result = await window.storageHelper.cleanExpiredData();
  console.log('Limpiados:', result);

  // test1 debe estar eliminado
  // test2 y test3 deben existir
}, 7000);
```

### 17. Exportar Backup

```javascript
await window.storageHelper.exportBackup();
```

- [ ] Se descarga archivo JSON
- [ ] Nombre: `jwm-backup-[fecha].json`
- [ ] Contiene todas las stores
- [ ] JSON válido

### 18. Estadísticas

```javascript
await window.storageHelper.showStorageInfo();
```

- [ ] Muestra conteo de registros por store
- [ ] Muestra uso de espacio
- [ ] Muestra cuota disponible

### 19. Reset Completo

```javascript
await window.storageHelper.clearAllData();
```

- [ ] Pide confirmación
- [ ] Elimina todos los datos de IndexedDB
- [ ] Redirige a login

## ✅ Tests de Compatibilidad

### 20. Fallback a localStorage

- [ ] Desactivar IndexedDB en navegador (si es posible)
- [ ] O simular error:

```javascript
window.storageHelper = null;
```

- [ ] Verificar que app sigue funcionando con localStorage
- [ ] Verificar logs de fallback

### 21. Navegadores

- [ ] Chrome/Edge (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Chrome (Android)
- [ ] Safari (iOS)

### 22. PWA Instalada

- [ ] Instalar app como PWA
- [ ] Verificar que IndexedDB funciona igual
- [ ] Cerrar y reabrir PWA
- [ ] Datos persisten correctamente

## ✅ Tests de Edge Cases

### 23. Múltiples Pestañas

- [ ] Abrir app en pestaña 1
- [ ] Login en pestaña 1
- [ ] Abrir app en pestaña 2
- [ ] Verificar que está autenticado en pestaña 2
- [ ] Logout en pestaña 1
- [ ] Verificar estado en pestaña 2

### 24. Datos Grandes

```javascript
// Crear array grande
const bigData = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  numero: `${1000 + i}`,
  estado: 'vacio',
  edificio_id: Math.floor(i / 100) + 1,
}));

// Guardar
await window.storageHelper.saveCuartos(bigData);

// Buscar
const cuartos = await window.dbManager.getByIndex('cuartos', 'edificio_id', 1);
console.log('Resultados:', cuartos.length);
```

- [ ] Guardado exitoso
- [ ] Búsqueda eficiente
- [ ] No bloquea UI

### 25. Quota Excedida

```javascript
// Intentar guardar más de la cuota permitida
// (difícil de probar, pero verificar manejo de error)
try {
  // Código que excedería quota
} catch (error) {
  console.log('Error manejado:', error.name);
}
```

- [ ] Error se maneja correctamente
- [ ] App no se rompe

## 📊 Reporte de Resultados

### Resumen

- Total de tests: 25
- Tests pasados: \_\_\_
- Tests fallados: \_\_\_
- Problemas encontrados: \_\_\_

### Problemas Identificados

1.
2.
3.

### Notas Adicionales

---

**Fecha de testing**: ******\_******
**Testeado por**: ******\_******
**Navegador**: ******\_******
**Versión**: ******\_******
**Sistema Operativo**: ******\_******

## 🔧 Comandos Útiles para Testing

```javascript
// Ver todo el contenido de IndexedDB
const data = await window.storageHelper.getAllData();
console.log('Todos los datos:', data);

// Ver estadísticas
await window.storageHelper.showStorageInfo();

// Ver operaciones pendientes
const pending = await window.dbManager.getPendingSyncOperations();
console.log('Pendientes:', pending);

// Forzar sincronización
await window.storageHelper.processSyncQueue('http://localhost:3001');

// Limpiar todo
await window.storageHelper.clearAllData();

// Ver un store específico
const cuartos = await window.dbManager.getAll('cuartos');
console.table(cuartos);

// Buscar por índice
const ocupados = await window.dbManager.getByIndex(
  'cuartos',
  'estado',
  'ocupado'
);
console.table(ocupados);
```

---

✅ **Migración completada cuando todos los tests pasan**
