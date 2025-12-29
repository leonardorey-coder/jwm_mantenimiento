# AGENTS.md - Guidelines for AI Coding Agents

This document provides guidelines for AI agents working on the JW Marriott Maintenance System (JW Mantto).

## Build, Lint, and Format Commands

### Development & Production

- `npm start` - Start Express server locally (port 3001)
- `npm run dev` - Start in development mode
- `npm run prod` - Start in production mode
- `npm run vercel:dev` - Run Vercel local environment

### Code Quality

- `npm run lint:js` - Run ESLint on JavaScript files
- `npm run lint:css` - Run Stylelint on CSS files
- `npm run check:duplication` - Check for code duplication using JSCPD
- `npm run format` - Format code with Prettier

### Important Notes

- **No test suite exists** - The codebase does not have automated tests. Test files are ignored in .gitignore.
- Always run `npm run lint:js` and `npm run format` before committing changes.
- Check the ESLint output and fix all warnings before pushing.

## Code Style Guidelines

### Formatting (Prettier)

- **Semicolons**: Required (true)
- **Quotes**: Single quotes only
- **Indentation**: 2 spaces
- **Trailing commas**: ES5 style (trailing in objects/arrays)
- Run `npm run format` to auto-format all files

### Naming Conventions

- **Variables and functions**: camelCase (e.g., `fetchWithAuth`, `AppState.currentUser`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`, `CHECKLIST_ESTADOS`)
- **Classes**: PascalCase (e.g., `PostgresManager`)
- **Files**: kebab-case for CSS (e.g., `style-users.css`), lowercase for JS modules (e.g., `postgres-manager.js`)
- **Database tables and columns**: lowercase with underscores (e.g., `mantenimientos`, `dia_alerta`)

### Import Style

- **Backend (api/, db/)**: Use CommonJS (`require`) - `const express = require('express')`
- **Frontend (js/)**: Native ES modules or global scope - no framework imports
- No `import` statements in backend files - use `require` consistently

### Error Handling

- Always use `try/catch` blocks for async operations
- Log errors with `console.error()` and include context
- API responses should follow this pattern:

  ```javascript
  // Success
  res.status(200).json({ success: true, data: result });

  // Error
  res
    .status(500)
    .json({ success: false, error: 'Error message', details: error.message });
  ```

- For database errors, map error codes to appropriate HTTP status codes (404, 409, 400, 500)

### Documentation Style

- Use JSDoc-style comments for all functions:
  ```javascript
  /**
   * Descripción breve de la función
   * @param {Type} paramName - Descripción del parámetro
   * @returns {Type} Descripción del retorno
   */
  function myFunction(paramName) {}
  ```
- Comments should be in **Spanish** to match the codebase style
- Include inline comments for complex logic

### Logging Patterns

- Use emoji indicators for consistent logging:
  - `✅` for success/completion
  - `❌` for errors
  - `⚠️` for warnings
  - `🔄` for operations in progress
  - `📥` for incoming data
  - `📤` for outgoing data
  - `🔐` for authentication operations
- Format: `[MODULE] Action description` - e.g., `📥 [FETCH-AUTH] Haciendo petición a: /api/auth/login`

### API Design Patterns

- RESTful endpoints under `/api` prefix
- Authentication middleware: `verificarAutenticacion`, `verificarAdmin`, `verificarSupervisor`
- Response format:
  ```javascript
  {
    success: true|false,
    data: {...} || null,
    error: "string" || null,
    message: "string" || null
  }
  ```
- JWT tokens in `Authorization: Bearer <token>` header
- Include error details in development, omit in production

### Frontend Patterns

- Global state: `window.AppState` object for application state
- API calls: Use `window.fetchWithAuth()` for authenticated requests
- Auth functions: `window.checkAuthentication()`, `window.logout()`
- Tab navigation: `switchTab(tabId)` function
- Use `localStorage` for persistence, fallback to `sessionStorage` for non-persistent data

### Database (PostgreSQL)

- Use parameterized queries with `$1, $2, ...` to prevent SQL injection
- Connection pooling via `pg` library's `Pool`
- Migrations in `db/migrations/` directory
- Schema files: `db/schema-postgres-completo.sql` is the primary schema

### Code Organization

- **api/** - Express routes and serverless functions
- **js/** - Frontend JavaScript modules
- **db/** - Database schema, migrations, and manager
- **css/** - Stylesheets (kebab-case naming)
- **views/** - Modular UI components
- **docs/** - Technical documentation (Markdown)

### CSS Guidelines

- Follow BEM-like naming: `.component-name`, `.component-name--modifier`, `.component-name__element`
- Use semantic class names
- Responsive design with mobile-first approach
- Dark mode support via `data-theme="dark"` attribute

### When to Use console.log

- Extensive logging is encouraged for debugging
- Log async operations start and completion
- Include relevant data in logs (IDs, counts, status)
- Production logging can be filtered at deployment time

### Security Best Practices

- Never commit `.env` files or secrets
- Use environment variables for configuration (process.env.VAR_NAME)
- Validate and sanitize all user inputs
- Use parameterized queries for database operations
- Implement proper CORS configuration
- JWT tokens should have reasonable expiration times

### Common Anti-Patterns to Avoid

- Mixing CommonJS and ES modules in the same file
- Hardcoded credentials or configuration values
- Global variables other than `window.AppState` and module exports
- Silent error swallowing (always log errors)
- Using `var` - use `const` or `let` instead
- Nested ternary operators - use if/else for clarity

### ESLint Rules to Note

- `no-unused-vars` is set to 'warn' - clean up unused variables
- `no-console` is 'off' - console.log is encouraged for this codebase
- Prettier rules are enforced as errors

## Database Schema Details

### Core Tables

**usuarios**

- Primary key: `id`
- Fields: `nombre`, `email`, `password` (hashed), `rol` (admin/supervisor/staff), `estado`
- Relationships: One-to-many to `mantenimientos`, `sesiones`, `notificaciones`

**habitaciones**

- Primary key: `id`
- Fields: `numero`, `tipo`, `piso`, `estado`, `ultima_limpieza`, `dia_alerta`
- Relationships: One-to-many to `mantenimientos`, `checklists`

**mantenimientos** (tasks)

- Primary key: `id`
- Fields: `titulo`, `descripcion`, `prioridad`, `estado`, `fecha_creacion`, `fecha_limite`, `asignado_a`, `habitacion_id`
- Enums: `estado` (pendiente/en_progreso/completada/cancelada)
- Relationships: Many-to-one to `usuarios` (creator, assignee), `habitaciones`

**checklists**

- Primary key: `id`
- Fields: `habitacion_id`, `fecha`, `realizado_por`, `estado`, `comentario`
- Relationships: Many-to-many to `checklist_items`, one-to-many to `checklist_fotos`

**checklist_items**

- Primary key: `id`
- Fields: `nombre`, `categoria`, `orden`, `activo`, `estado_default`
- Template items used across all checklists

**checklist_respuestas**

- Junction table linking checklists to items
- Fields: `checklist_id`, `item_id`, `estado`, `observaciones`, `foto_url`
- Composite key: (`checklist_id`, `item_id`)

**espacios_comunes**

- Primary key: `id`
- Fields: `nombre`, `tipo`, `ubicacion`, `estado`, `ultimo_mantenimiento`

**sabanas** (linen management)

- Primary key: `id`
- Fields: `habitacion_id`, `tipo`, `cantidad`, `estado`, `fecha_lavado`

**tareas_adjuntos**

- Primary key: `id`
- Fields: `tarea_id`, `file_url`, `file_name`, `file_type`, `uploaded_at`
- Stores file attachments for tasks via UploadThing

**notificaciones**

- Primary key: `id`
- Fields: `usuario_id`, `titulo`, `mensaje`, `tipo`, `leida`, `fecha_creacion`
- Types: `tarea_asignada`, `tarea_completada`, `checklist_vencido`

### Common Queries

```javascript
// Get user with role
const getUserById = async (id) => {
  const result = await pool.query(
    'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1 AND estado = $2',
    [id, 'activo']
  );
  return result.rows[0];
};

// Get tasks for a room
const getTasksByRoom = async (roomId) => {
  const result = await pool.query(
    `SELECT m.*, u.nombre as asignado_nombre
     FROM mantenimientos m
     LEFT JOIN usuarios u ON m.asignado_a = u.id
     WHERE m.habitacion_id = $1
     ORDER BY m.fecha_creacion DESC`,
    [roomId]
  );
  return result.rows;
};

// Get checklist with items
const getChecklist = async (checklistId) => {
  const checklist = await pool.query('SELECT * FROM checklists WHERE id = $1', [
    checklistId,
  ]);
  const items = await pool.query(
    `SELECT ci.*, cr.estado, cr.observaciones, cr.foto_url
     FROM checklist_items ci
     LEFT JOIN checklist_respuestas cr ON cr.item_id = ci.id AND cr.checklist_id = $1
     WHERE ci.activo = true
     ORDER BY ci.orden`,
    [checklistId]
  );
  return { checklist: checklist.rows[0], items: items.rows };
};
```

## Specific Feature Patterns

### Checklists

**Creating a new checklist**:

```javascript
async function createChecklist(roomId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checklistResult = await client.query(
      'INSERT INTO checklists (habitacion_id, realizado_por, fecha, estado) VALUES ($1, $2, NOW(), $3) RETURNING id',
      [roomId, userId, 'pendiente']
    );
    const checklistId = checklistResult.rows[0].id;

    // Get all active checklist items
    const items = await client.query(
      'SELECT id FROM checklist_items WHERE activivo = true ORDER BY orden'
    );

    // Create responses for each item
    for (const item of items.rows) {
      await client.query(
        'INSERT INTO checklist_respuestas (checklist_id, item_id, estado) VALUES ($1, $2, $3)',
        [checklistId, item.id, 'pendiente']
      );
    }

    await client.query('COMMIT');
    return checklistId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Updating checklist item**:

```javascript
async function updateChecklistItem(
  checklistId,
  itemId,
  estado,
  fotoUrl,
  observaciones
) {
  await pool.query(
    `UPDATE checklist_respuestas
     SET estado = $1, foto_url = $2, observaciones = $3
     WHERE checklist_id = $4 AND item_id = $5`,
    [estado, fotoUrl, observaciones, checklistId, itemId]
  );

  const allCompleted = await pool.query(
    `SELECT COUNT(*) = 0 as pending
     FROM checklist_respuestas
     WHERE checklist_id = $1 AND estado != 'completado'`,
    [checklistId]
  );

  if (allCompleted.rows[0].pending) {
    await pool.query('UPDATE checklists SET estado = $1 WHERE id = $2', [
      'completado',
      checklistId,
    ]);
  }
}
```

### File Uploads (UploadThing)

**Upload configuration**:

```javascript
// api/uploadthing.js
import { createUploadthing } from 'uploadthing/server';

const f = createUploadthing();

export const uploadRouter = {
  checkListPhotos: f({ image: { maxFileSize: '4MB', maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      const user = await verifyToken(token);
      if (!user) throw new Error('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await pool.query(
        'INSERT INTO checklist_fotos (checklist_id, item_id, file_url, uploaded_by) VALUES ($1, $2, $3, $4)',
        [metadata.checklistId, metadata.itemId, file.url, metadata.userId]
      );
      return { uploadedBy: metadata.userId };
    }),
};
```

**Frontend upload**:

```javascript
async function uploadChecklistPhoto(file, checklistId, itemId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('checklistId', checklistId);
  formData.append('itemId', itemId);

  const response = await fetch('/api/upload/uploadthing', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}
```

### Offline Sync (IndexedDB)

**Saving data offline**:

````javascript
async function saveTaskOffline(task) {
  const db = await openIndexedDB();
  const tx = db.transaction('offline_tasks', 'readwrite');
  const store = tx.objectStore('offline_tasks');
  await store.add({
    ...task,
    sync_status: 'pending',
    created_at: Date.now()
  });
}

**Syncing on reconnection**:
```javascript
async function syncOfflineData() {
  const db = await openIndexedDB();
  const tx = db.transaction('offline_tasks', 'readwrite');
  const store = tx.objectStore('offline_tasks');
  const tasks = await store.getAll();

  for (const task of tasks) {
    try {
      const response = await fetch('/api/tareas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
      });

      if (response.ok) {
        await store.delete(task.id);
        console.log('✅ [SYNC] Task synced:', task.id);
      }
    } catch (error) {
      console.error('❌ [SYNC] Failed to sync task:', task.id);
    }
  }
}
````

## Git Workflow

### Branch Naming

```
feature/add-checklist-photos
fix/task-assignment-error
refactor/user-authentication
update/db-migration-2025-12-29
docs/API-documentation
```

### Commit Message Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `style`: Formatting/style changes
- `docs`: Documentation updates
- `test`: Test updates (though no automated tests exist)
- `chore`: Maintenance tasks

**Examples**:

```
feat(checklist): Add photo attachments via UploadThing

Implements file upload for checklist items with size validation
and user authentication middleware.

Closes #42
```

```
fix(api): Fix 404 on task deletion when user is not admin

Added proper role verification before allowing task deletion.
Previously any authenticated user could delete tasks.
```

### Pre-Commit Checklist

Before creating a commit:

1. ✅ Run `npm run lint:js` and fix all warnings
2. ✅ Run `npm run format` to ensure consistent formatting
3. ✅ Verify code follows naming conventions
4. ✅ Test changes locally with `npm run dev`
5. ✅ Review diff with `git diff` to confirm only intended changes
6. ✅ Never commit `.env` files or sensitive data

## Environment Configuration

### Required Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jwm_mantto
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# UploadThing
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-uploadthing-app-id

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Environment-Specific Settings

**Development**:

- Detailed error logging
- CORS allows localhost
- Hot reload via nodemon
- SQL query logging

**Production**:

- Minimal error details in responses
- CORS restricted to domain
- Connection pooling optimized
- Compression enabled

## Testing & Validation

### Manual Testing Checklist

**Authentication Flow**:

- [ ] User can login with valid credentials
- [ ] Invalid credentials return 401
- [ ] JWT token is stored in localStorage
- [ ] Protected routes reject requests without token
- [ ] Token refresh works before expiration
- [ ] Logout clears token and session

**Task Management**:

- [ ] Admin can create tasks
- [ ] Supervisors can assign tasks
- [ ] Staff can view their assigned tasks
- [ ] Task status updates persist to DB
- [ ] Task deletion only by admin/supervisor

**Checklists**:

- [ ] Create new checklist for room
- [ ] All default items are initialized
- [ ] Mark items as completed with photos
- [ ] Checklist auto-completes when all items done
- [ ] Photos upload successfully via UploadThing

**Offline Mode**:

- [ ] Data saved to IndexedDB when offline
- [ ] UI shows "Offline mode" indicator
- [ ] Changes sync automatically on reconnection
- [ ] Conflicts are handled appropriately

**Database**:

- [ ] Schema migrations run successfully
- [ ] Foreign key constraints prevent invalid data
- [ ] Unique constraints prevent duplicates
- [ ] Connection pool handles concurrent requests

### Debugging Common Issues

**Database Connection Errors**:

```bash
# Check PostgreSQL is running
brew services list  # macOS
systemctl status postgresql  # Linux

# Test connection
psql -h localhost -U your_user -d jwm_mantto

# Check pool status in logs
grep "pool" logs/server.log
```

**JWT Token Issues**:

```javascript
// Verify token contents
const token = localStorage.getItem('token');
const decoded = jwt.decode(token);
console.log(decoded); // Check exp, iat, userId

// Check secret mismatch
console.log('Secret length:', process.env.JWT_SECRET.length); // Should be >= 32 chars
```

**UploadThing Upload Fails**:

- Check file size (max 4MB for images)
- Verify `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` are set
- Check CORS configuration
- Verify token middleware is allowing requests

**IndexedDB Errors**:

```javascript
// Clear IndexedDB and reload
indexedDB.deleteDatabase('JWManttoDB');
location.reload();

// Check database version
const request = indexedDB.open('JWManttoDB');
console.log('DB version:', request.version);
```

## API Endpoint Reference

### Authentication

```
POST   /api/auth/login          # Login, returns JWT
POST   /api/auth/register       # Register new user
POST   /api/auth/refresh        # Refresh JWT token
POST   /api/auth/logout         # Logout (client-side)
GET    /api/auth/me             # Get current user info
```

### Users

```
GET    /api/usuarios            # List all users (admin only)
GET    /api/usuarios/:id        # Get user by ID
POST   /api/usuarios            # Create user (admin only)
PUT    /api/usuarios/:id        # Update user
DELETE /api/usuarios/:id        # Delete user (admin only)
PUT    /api/usuarios/:id/estado # Change user status (activate/deactivate)
```

### Rooms (Habitaciones)

```
GET    /api/habitaciones        # List all rooms
GET    /api/habitaciones/:id    # Get room details
GET    /api/habitaciones/:id/tareas  # Get tasks for room
POST   /api/habitaciones        # Create room (admin only)
PUT    /api/habitaciones/:id    # Update room
PUT    /api/habitaciones/:id/dia-alerta  # Update alert day
```

### Tasks (Tareas)

```
GET    /api/tareas              # List tasks (with filters: estado, usuario, fecha)
GET    /api/tareas/:id          # Get task detail
POST   /api/tareas              # Create task (supervisor/admin)
PUT    /api/tareas/:id          # Update task
DELETE /api/tareas/:id          # Delete task
PUT    /api/tareas/:id/estado   # Update task status
POST   /api/tareas/:id/adjuntos # Upload attachment
```

### Checklists

```
GET    /api/checklist           # List checklists
GET    /api/checklist/:id       # Get checklist with items
POST   /api/checklist           # Create checklist
PUT    /api/checklist/:id       # Update checklist
PUT    /api/checklist/:id/estado  # Update checklist status
POST   /api/checklist/:id/items  # Add item response
PUT    /api/checklist/:id/items/:itemId  # Update item
POST   /api/checklist/:id/fotos  # Upload photo
```

### Common Areas (Espacios Comunes)

```
GET    /api/espacios-comunes    # List common areas
GET    /api/espacios-comunes/:id  # Get area details
POST   /api/espacios-comunes    # Create area (admin only)
PUT    /api/espacios-comunes/:id  # Update area
```

### Linen Management (Sábanas)

```
GET    /api/sabanas             # List linen inventory
GET    /api/sabanas/habitacion/:id  # Get linen for room
POST   /api/sabanas             # Add linen record
PUT    /api/sabanas/:id         # Update linen status
POST   /api/sabanas/:id/lavado  # Record wash cycle
```

### Notifications

```
GET    /api/notificaciones      # Get user notifications
PUT    /api/notificaciones/:id  # Mark as read
DELETE /api/notificaciones/:id  # Delete notification
PUT    /api/notificaciones/todos  # Mark all as read
```

### File Uploads

```
POST   /api/upload/checklist    # Upload checklist photo
POST   /api/upload/tarea        # Upload task attachment
```

## Performance Guidelines

### Database Optimization

```javascript
// Always use SELECT specific columns, never SELECT *
const result = await pool.query(
  'SELECT id, nombre, email FROM usuarios WHERE rol = $1',
  ['admin']
);

// Add indexes for frequently queried columns
CREATE INDEX idx_tareas_estado ON mantenimientos(estado);
CREATE INDEX idx_tareas_asignado ON mantenimientos(asignado_a);
CREATE INDEX idx_checklists_fecha ON checklists(fecha DESC);

// Use LIMIT for pagination
const result = await pool.query(
  'SELECT * FROM tareas ORDER BY fecha_creacion DESC LIMIT $1 OFFSET $2',
  [limit, offset]
);

// Use EXISTS instead of IN for subqueries
const result = await pool.query(
  `SELECT * FROM habitaciones h
   WHERE EXISTS (
     SELECT 1 FROM mantenimientos m
     WHERE m.habitacion_id = h.id AND m.estado = $1
   )`,
  ['pendiente']
);
```

### Frontend Optimization

```javascript
// Debounce search inputs
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// Lazy load images
<img src="placeholder.jpg" data-src="actual-image.jpg" loading="lazy" class="lazy">

// Batch IndexedDB operations
const db = await openIndexedDB();
const tx = db.transaction('offline_tasks', 'readwrite');
const store = tx.objectStore('offline_tasks');
tasks.forEach(task => store.add(task)); // Single transaction

// Cache API responses
const cache = new Map();
async function fetchWithCache(url) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url);
  const data = await response.json();
  cache.set(url, data);
  return data;
}
```

## Security Checklist

- [ ] Never expose DB credentials in client-side code
- [ ] Hash passwords with bcrypt (not plain text)
- [ ] Validate all user inputs before DB operations
- [ ] Use HTTPS in production (never HTTP)
- [ ] Implement rate limiting on authentication endpoints
- [ ] Set CORS headers to only allow your domain
- [ ] Use environment variables for all secrets
- [ ] Never log sensitive data (passwords, tokens, PII)
- [ ] Implement JWT expiration and refresh
- [ ] Sanitize user-generated content before rendering
- [ ] Validate file uploads (size, type, content)
- [ ] Use parameterized queries (always, no exceptions)
- [ ] Log security events (failed logins, unauthorized access)
- [ ] Regularly audit user permissions
- [ ] Implement CSRF protection for state-changing operations

## Troubleshooting Guide

### Common Errors

**Error: "Connection refused"**

- Check PostgreSQL is running: `psql -h localhost`
- Verify DB_HOST and DB_PORT in .env
- Check firewall settings

**Error: "Invalid token"**

- Verify JWT_SECRET is set correctly
- Check token hasn't expired (decode it)
- Verify Authorization header format: `Bearer <token>`

**Error: "Upload failed: File too large"**

- Check file size limits in UploadThing config
- Max size is 4MB for images
- Compress images before upload if needed

**Error: "Offline sync failed"**

- Check IndexedDB quota limits (typically 50MB)
- Clear old offline data
- Verify network connectivity

**Error: "Foreign key violation"**

- Check referenced records exist before creating relationships
- Verify correct ID values
- Use transactions for multi-table operations

### Logging Strategy

```javascript
// Development - detailed logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 [DEBUG] Query:', query);
  console.log('🔍 [DEBUG] Params:', params);
  console.log('🔍 [DEBUG] Result:', result);
}

// Production - error logging only
if (process.env.NODE_ENV === 'production') {
  console.error('❌ [ERROR]', error.message);
  // Send to external logging service (e.g., Sentry)
}
```

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Environment variables in Vercel dashboard:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - JWT_SECRET, JWT_EXPIRES_IN
# - UPLOADTHING_SECRET, UPLOADTHING_APP_ID
```

### Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Configure SSL/HTTPS
- [ ] Set appropriate CORS origins
- [ ] Enable compression
- [ ] Set up database backups
- [ ] Configure monitoring/logging
- [ ] Test all API endpoints
- [ ] Verify file uploads work
- [ ] Test offline functionality
- [ ] Update documentation if needed

---

**Last Updated**: December 29, 2025  
**Version**: 2.0  
**Maintainer**: Development Team
