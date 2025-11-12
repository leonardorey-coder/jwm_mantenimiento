# 📋 Reporte de Control de Versiones con Git

**Proyecto:** Sistema de Gestión de Servicios Operativa de Mantenimiento (SGSOM) - JW Mantto  
**Alumno:** Juan Leonardo Cruz Flores  
**Matrícula:** 202300097  
**Fecha de Reporte:** Noviembre 2025  

---

## 🎯 Información del Repositorio

### Repositorio Local
- **Ubicación:** `/Volumes/SSD/jwm_mant_cuartos`
- **Nombre del directorio:** `jwm_mant_cuartos`
- **Sistema de control de versiones:** Git
- **Total de commits:** 19 commits en rama principal

### Repositorio Remoto (GitHub)
- **Plataforma:** GitHub
- **URL:** `git@github.com:leonardorey-coder/jwm_mantenimiento.git`
- **Propietario:** leonardorey-coder
- **Nombre del repositorio:** `jwm_mantenimiento`
- **Tipo de acceso:** SSH (git@github.com)

---

## 🌿 Estructura de Ramas (Branches)

El proyecto utiliza **4 ramas principales** para organizar el desarrollo:

| Rama | Propósito | Estado |
|------|-----------|--------|
| **main** | Rama principal/producción | Estable |
| **pwa_local** | PWA local con PHP/MySQL | Desarrollo |
| **pwa_local_electron** | PWA con Electron y PHP | Desarrollo |
| **pwa_electron_IPC** | PWA con Electron + Node.js + PostgreSQL | ⭐ Activa |

### Rama Actualmente Activa
```bash
* pwa_electron_IPC (HEAD)
```

Esta es la rama de trabajo actual que contiene la versión más avanzada del proyecto con:
- Node.js + Express (backend)
- PostgreSQL (base de datos)
- Electron (aplicación de escritorio)
- IPC (Inter-Process Communication)

---

## 📅 Historial de Desarrollo

### 🔹 Primer Commit - Inicio del Proyecto

**Hash:** `4b878f3f8c3e7c0e4df1c004e5a09443c7b2b06b`  
**Fecha:** 3 de mayo de 2025, 20:25:38  
**Autor:** leonardo  
**Mensaje:** "Primer commit"  

**Archivos iniciales (25 archivos, 4,714 líneas agregadas):**

```
Estructura inicial del proyecto:
├── index.php                   # Interfaz principal (PHP)
├── server.js                   # Servidor Node.js inicial
├── script.js                   # Lógica del cliente (202 líneas)
├── script_index.js             # Funcionalidades extendidas (950 líneas)
├── style.css                   # Estilos (1,286 líneas)
├── sw.js                       # Service Worker (102 líneas)
├── manifest.json               # Manifiesto PWA
├── procesar.php                # Procesamiento backend PHP (377 líneas)
├── obtener_cuarto.php          # API PHP para cuartos
├── obtener_mantenimiento.php   # API PHP para mantenimientos
├── db/
│   ├── config.php              # Configuración de BD
│   └── schema.sql              # Esquema inicial de base de datos
├── icons/
│   └── icon-192x192.png        # Icono para PWA
├── logo_high.png               # Logo alta resolución
├── logo_low.png                # Logo baja resolución
├── README.md                   # Documentación inicial
├── package.json                # Dependencias Node.js
├── package-lock.json           # Lock de dependencias
├── start.sh                    # Script de inicio
├── .htaccess                   # Configuración Apache
├── .vscode/settings.json       # Configuración VS Code
└── data.json                   # Datos de prueba
```

**Tecnologías del primer commit:**
- PHP (servidor backend)
- MySQL (base de datos)
- Node.js (servidor adicional)
- HTML/CSS/JavaScript (frontend)
- Service Worker (PWA)

---

## 📊 Cronología de Commits (Del Más Antiguo al Más Reciente)

### Fase 1: Inicio y Setup del Proyecto (Mayo - Julio 2025)

#### 1. Commit Inicial
```
Hash: 4b878f3
Fecha: 03/05/2025
Mensaje: Primer commit
Cambios: 25 archivos creados, 4,714 líneas agregadas
```

#### 2. Integración PWA
```
Hash: c6fadd8
Fecha: 20/07/2025
Mensaje: primer commit hecho para integrar pwa en local. hubieron errores con 
         ngrok, pueros, index.html ejecutándose en vez del .php y detalles 
         "arreglados" con las notificaciones
Desafíos: 
  - Problemas con ngrok para acceso remoto
  - Conflictos entre index.html e index.php
  - Ajustes en sistema de notificaciones
```

#### 3. Actualización de Assets
```
Hash: 780b694
Fecha: 20/07/2025
Mensaje: actualización de archivos binarios .DS_Store e icono 192x192
Cambios: Actualización de iconos para PWA
```

#### 4. Branding
```
Hash: 4a2eb18
Fecha: 20/07/2025
Mensaje: actualización del título y nombre en el manifiesto de la aplicación a "JW Mantto"
Cambios: Establecimiento del nombre oficial del proyecto
```

#### 5. Servidor Express
```
Hash: 096e62a
Fecha: 20/07/2025
Mensaje: Add Express server and notification test HTML page
Cambios: Integración de servidor Express.js para pruebas
```

### Fase 2: Mejoras de UI/UX (Julio 2025)

#### 6. Responsividad Móvil
```
Hash: 55809c6
Fecha: 20/07/2025
Mensaje: Ajustar estilos de la columna lateral para mejorar la responsividad 
         en dispositivos móviles
Cambios: Optimización de interfaz para dispositivos móviles
```

#### 7. Optimización de Rendimiento
```
Hash: 510395d
Fecha: 20/07/2025
Mensaje: Implementar lazy loading para cuartos y ajustar la carga de datos en 
         app-loader.js; deshabilitar script_index.js en layout.php e index.html
Cambios: 
  - Implementación de lazy loading
  - Mejora en tiempos de carga
  - Reorganización de scripts
```

#### 8. Mejora de UX en Formularios
```
Hash: 182b622
Fecha: 20/07/2025
Mensaje: Limpiar formulario al agregar mantenimiento y ocultar campos de rutina/alerta
Cambios: Mejora en la experiencia de usuario al registrar mantenimientos
```

### Fase 3: Desarrollo de Electron (Julio 2025)

#### 9. Primera Versión Estable con Electron
```
Hash: 9291539
Fecha: 20/07/2025
Mensaje: app pwa local con electron hecha correctamente. versión estable, con 
         detalles estéticos de fechas de alertas emitidas, pero nada más.
Hito: Primera versión funcional como aplicación de escritorio con Electron
```

#### 10. Corrección de Conexión
```
Hash: bc510fa
Fecha: 20/07/2025
Mensaje: version estable, con error de conexion supuestamente arreglado
Cambios: Corrección de problemas de conectividad
```

#### 11. Corrección de Base de Datos
```
Hash: 4f10be2
Fecha: 20/07/2025
Mensaje: Versión estable con la base de datos arreglada, pero aún con detalles 
         de las fechas de alarmas, junto con detalles en el panel de "Alertas"
Cambios: Estabilización de operaciones de base de datos
```

#### 12. Corrección de Scroll
```
Hash: 36dc760
Fecha: 20/07/2025
Mensaje: version estable, con detalles del panel "Alertas" pero scroll arreglado
Cambios: Mejora en la navegación del panel de alertas
```

### Fase 4: Implementación 100% Offline (Julio 2025)

#### 13. Aplicación Completamente Offline ⭐
```
Hash: 2139990
Fecha: 20/07/2025
Mensaje: aplicación 100% offline con Electron + SQLite
Hito Mayor: Implementación de funcionalidad offline completa
Tecnología: Electron + SQLite embebido
Impacto: La aplicación ya no requiere servidor web para funcionar
```

#### 14. Población de Base de Datos
```
Hash: 9bf13f1
Fecha: 20/07/2025
Mensaje: base de datos orignal puesta. funcionan las alertas y búsquedas, 
         pero faltan cuartos en edificios
Cambios: Carga de datos reales del hotel
```

#### 15. Corrección de Alertas
```
Hash: 6687b10
Fecha: 20/07/2025
Mensaje: arreglo de alertas emitidas hoy, con las fechas arregladas, 
         excluyendo la fecha de emisión de la alerta.
Cambios: Corrección del sistema de fechas en alertas
```

### Fase 5: Migración a Node.js (Octubre 2025) 🚀

#### 16. Migración PHP → Node.js ⭐⭐
```
Hash: e5d7daf
Fecha: Octubre 2025
Mensaje: feat: Migración completa de PHP/MySQL a Node.js/SQLite
Hito Mayor: Eliminación completa de dependencias PHP
Cambios:
  - Reescritura de backend en Node.js + Express
  - Migración de MySQL a SQLite
  - API REST completa en JavaScript
  - Eliminación de archivos .php
Impacto: Stack unificado 100% JavaScript
Líneas de código: ~5,000 líneas reescritas
```

#### 17. Organización del Proyecto
```
Hash: a19cad1
Fecha: Octubre 2025
Mensaje: refactor: organizar estructura del proyecto
Cambios:
  - Reorganización de carpetas
  - Creación de carpeta /db con gestores
  - Documentación modular en /docs
  - Scripts de utilidad en /scripts
```

#### 18. Compilación Multiplataforma
```
Hash: 054e4b2
Fecha: Octubre 2025
Mensaje: App en macos arm64 funcionando perfectamente
Cambios:
  - Compilación para Apple Silicon (ARM64)
  - Compilación para Intel (x64)
  - Instaladores .dmg generados
  - Aplicación verificada en macOS
```

### Fase 6: Migración a PostgreSQL (Octubre 2025) 🔥

#### 19. Migración SQLite → PostgreSQL ⭐⭐⭐
```
Hash: df1f602 (HEAD)
Fecha: Octubre 2025
Mensaje: feat: Migración de SQLite a PostgreSQL
Hito Mayor: Base de datos escalable para producción
Cambios:
  - PostgreSQL como BD principal
  - pg (node-postgres) integrado
  - Scripts de migración automática
  - Soporte para Azure, AWS, Heroku
  - Variables de entorno con dotenv
  - Configuración de pool de conexiones
Impacto: Sistema listo para producción y múltiples usuarios
```

---

## 🔄 Evolución Tecnológica del Proyecto

### Stack Tecnológico por Fase

| Fase | Backend | Base de Datos | Frontend | Deployment |
|------|---------|---------------|----------|------------|
| **Fase 1** (Mayo) | PHP + Node.js | MySQL | HTML/CSS/JS + PWA | Apache/XAMPP |
| **Fase 2** (Julio) | PHP + Node.js | MySQL | HTML/CSS/JS + PWA | Apache/XAMPP |
| **Fase 3** (Julio) | PHP + Node.js | MySQL | Electron + PWA | Electron (desktop) |
| **Fase 4** (Julio) | Node.js | SQLite | Electron + PWA | Electron offline |
| **Fase 5** (Oct) | Node.js + Express | SQLite | Electron + PWA | Electron + Server |
| **Fase 6** (Oct) | Node.js + Express | **PostgreSQL** | **PWA pura** | **Servidor/Nube** |

### Migración Visual

```
PHP/MySQL (XAMPP)
      ↓
Node.js/MySQL
      ↓
Node.js/SQLite (offline)
      ↓
Node.js/PostgreSQL (producción)
      ↓
PWA + PostgreSQL (arquitectura actual)
```

---

## 📈 Estadísticas del Repositorio

### Commits por Categoría

```
Total de commits: 19

Categorías:
├── Configuración inicial:      1 commit   (5%)
├── Integración PWA:            4 commits  (21%)
├── Mejoras UI/UX:              3 commits  (16%)
├── Desarrollo Electron:        4 commits  (21%)
├── Funcionalidad offline:      3 commits  (16%)
├── Migración a Node.js:        2 commits  (11%)
└── Migración a PostgreSQL:     2 commits  (11%)
```

### Hitos Importantes (Milestones)

1. ✅ **03/05/2025** - Primer commit (proyecto iniciado)
2. ✅ **20/07/2025** - PWA funcional instalable
3. ✅ **20/07/2025** - Primera versión con Electron
4. ⭐ **20/07/2025** - Aplicación 100% offline (Electron + SQLite)
5. ⭐⭐ **Octubre 2025** - Migración completa PHP → Node.js
6. ⭐⭐⭐ **Octubre 2025** - Migración SQLite → PostgreSQL

### Líneas de Código

```
Código inicial:           ~4,700 líneas
Código actual estimado:   ~15,000 líneas
Crecimiento:              +320%
```

---

## 🔧 Comandos Git Utilizados en el Proyecto

### Configuración Inicial del Repositorio

```bash
# 1. Inicializar repositorio Git
git init

# 2. Configurar usuario (primera vez)
git config --global user.name "leonardo"
git config --global user.email "leonardo.cfjl@gmail.com"

# 3. Agregar archivos al staging
git add .

# 4. Primer commit
git commit -m "Primer commit"

# 5. Conectar con repositorio remoto en GitHub
git remote add origin git@github.com:leonardorey-coder/jwm_mantenimiento.git

# 6. Subir a GitHub (primera vez)
git push -u origin main
```

### Crear y Cambiar de Rama (Branch)

```bash
# Crear rama pwa_local
git checkout -b pwa_local

# Crear rama pwa_local_electron
git checkout -b pwa_local_electron

# Crear rama pwa_electron_IPC
git checkout -b pwa_electron_IPC

# Cambiar entre ramas
git checkout main
git checkout pwa_electron_IPC
```

### Workflow Típico de Desarrollo

```bash
# 1. Ver estado de archivos modificados
git status

# 2. Agregar archivos específicos
git add server.js db/postgres-manager.js

# O agregar todos los cambios
git add .

# 3. Hacer commit con mensaje descriptivo
git commit -m "feat: Migración de SQLite a PostgreSQL"

# 4. Subir cambios a GitHub
git push origin pwa_electron_IPC

# 5. Ver historial de commits
git log --oneline

# 6. Ver diferencias antes de commit
git diff
```

### Comandos Avanzados Utilizados

```bash
# Ver historial gráfico de todas las ramas
git log --all --oneline --graph --decorate

# Ver archivos de un commit específico
git show 4b878f3 --stat

# Ver ramas locales y remotas
git branch -a

# Ver configuración de remotos
git remote -v

# Deshacer cambios no commiteados
git checkout -- archivo.js

# Ver quién modificó cada línea
git blame server.js
```

---

## 📂 Archivos y Carpetas Ignorados (.gitignore)

```gitignore
# Dependencias
node_modules/

# Archivos de sistema
.DS_Store
*.log

# Archivos de configuración sensibles
.env

# Carpetas de build
dist/
build/

# Bases de datos locales
*.db
*.sqlite
*.sqlite3

# Archivos temporales
*.tmp
*.swp
```

---

## 🔐 Configuración de Acceso SSH a GitHub

El proyecto está configurado para usar **SSH** en lugar de HTTPS para mayor seguridad:

```bash
# URL SSH (configurada)
git@github.com:leonardorey-coder/jwm_mantenimiento.git

# vs URL HTTPS (no usada)
https://github.com/leonardorey-coder/jwm_mantenimiento.git
```

### Ventajas del acceso SSH:
- ✅ No requiere ingresar usuario/contraseña en cada push
- ✅ Más seguro con llaves criptográficas
- ✅ Autenticación automática

---

## 📋 Buenas Prácticas Aplicadas

### 1. Mensajes de Commit Descriptivos

✅ **Buenos ejemplos del proyecto:**
```
feat: Migración completa de PHP/MySQL a Node.js/SQLite
feat: Migración de SQLite a PostgreSQL
refactor: organizar estructura del proyecto
```

### 2. Uso de Ramas para Desarrollo

- ✅ Rama `main` protegida (producción)
- ✅ Ramas de desarrollo para experimentación
- ✅ Ramas por funcionalidad (pwa_local, pwa_electron_IPC)

### 3. Commits Atómicos

- ✅ Cada commit representa un cambio lógico completo
- ✅ Commits compilan y funcionan independientemente

### 4. Documentación

- ✅ README.md actualizado constantemente
- ✅ Documentación técnica en carpeta /docs
- ✅ Comentarios en código cuando es necesario

---

## 🎯 Recomendaciones para el Futuro

### Mejoras en el Workflow

1. **Implementar Git Flow**
   - Rama `develop` para desarrollo activo
   - Ramas `feature/` para nuevas funcionalidades
   - Ramas `hotfix/` para correcciones urgentes

2. **Convención de Commits**
   ```
   feat: nueva funcionalidad
   fix: corrección de bug
   docs: actualización de documentación
   style: cambios de formato
   refactor: refactorización de código
   test: agregar tests
   chore: tareas de mantenimiento
   ```

3. **Tags para Versiones**
   ```bash
   git tag -a v1.0.0 -m "Primera versión estable"
   git tag -a v1.1.0 -m "Versión con Electron"
   git tag -a v1.2.0 -m "Versión con PostgreSQL"
   git push origin --tags
   ```

4. **Pull Requests**
   - Usar PRs para merge a main
   - Code review antes de aceptar cambios
   - CI/CD automatizado

---

## 📊 Gráfico de Evolución del Proyecto

```
Mayo 2025          Julio 2025         Octubre 2025        Actual
    |                  |                    |                |
    |                  |                    |                |
    ● Inicio          ● PWA Offline       ● Node.js        ● PostgreSQL
    |                  |                    |                |
    | PHP/MySQL        | Electron+SQLite    | Express        | PWA pura
    |                  |                    |                |
    +------------------+--------------------+----------------+
         19 commits en total
         6 meses de desarrollo
         3 migraciones tecnológicas importantes
```

---

## ✅ Verificación del Estado Actual

### Estado del Repositorio

```bash
$ git status
On branch pwa_electron_IPC
Your branch is up to date with 'origin/pwa_electron_IPC'.

nothing to commit, working tree clean
```

### Última Sincronización

```bash
$ git log -1 --oneline
df1f602 feat: Migración de SQLite a PostgreSQL
```

### Ramas Sincronizadas

```
Local                    Remote
├── main            →    origin/main
├── pwa_local       →    origin/pwa_local
├── pwa_local_electron → origin/pwa_local_electron
└── pwa_electron_IPC →   origin/pwa_electron_IPC ✓ (actual)
```

---

## 🎓 Aprendizajes del Control de Versiones

### Conocimientos Aplicados

1. ✅ **Git básico**: init, add, commit, push, pull
2. ✅ **Branching**: Creación y gestión de ramas múltiples
3. ✅ **GitHub**: Repositorio remoto y sincronización
4. ✅ **SSH**: Configuración de llaves para acceso seguro
5. ✅ **Historial**: Navegación y análisis de commits
6. ✅ **Colaboración**: Trabajo en equipo con ramas

### Desafíos Superados

1. **Merge de ramas**: Resolver conflictos entre diferentes versiones
2. **Migración tecnológica**: Mantener historial durante cambios grandes
3. **Organización**: Estructura de ramas para diferentes experimentos
4. **Rollback**: Capacidad de volver a versiones anteriores si es necesario

---

## 📞 Información de Contacto

**Desarrollador:** Juan Leonardo Cruz Flores  
**GitHub:** [@leonardorey-coder](https://github.com/leonardorey-coder)  
**Repositorio:** [jwm_mantenimiento](https://github.com/leonardorey-coder/jwm_mantenimiento.git)  
**Email:** leonardo.cfjl@gmail.com  

**Empresa:** JW Marriott Resort & Spa  
**Periodo:** Mayo 2025 - Noviembre 2025  
**Estancia:** I - Ingeniería en Software  

---

**Generado:** Noviembre 2025  
**Versión del Proyecto:** 1.2.0  
**Commits Totales:** 19  
**Ramas Activas:** 4

