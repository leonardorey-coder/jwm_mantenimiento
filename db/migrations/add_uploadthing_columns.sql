-- =====================================================
-- Migración: Agregar columnas para UploadThing
-- Descripción: Agrega columnas uploadthing_key y url para 
--              almacenar archivos en la nube con UploadThing
-- =====================================================

-- Agregar columna para key de UploadThing
ALTER TABLE tareas_adjuntos 
ADD COLUMN IF NOT EXISTS uploadthing_key VARCHAR(255);

-- Agregar columna para URL pública de UploadThing
ALTER TABLE tareas_adjuntos 
ADD COLUMN IF NOT EXISTS url TEXT;

-- Crear índice para búsqueda por key de UploadThing
CREATE INDEX IF NOT EXISTS idx_tareas_adjuntos_ut_key ON tareas_adjuntos(uploadthing_key);

-- Comentarios de documentación
COMMENT ON COLUMN tareas_adjuntos.uploadthing_key IS 'Key único del archivo en UploadThing para eliminación';
COMMENT ON COLUMN tareas_adjuntos.url IS 'URL pública del archivo en UploadThing';
