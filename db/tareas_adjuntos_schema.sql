-- =====================================================
-- Schema: Documentos Adjuntos para Tareas
-- Descripción: Tabla para gestionar archivos adjuntos
--              a las tareas del sistema
-- =====================================================

-- Tabla de metadatos de archivos adjuntos
CREATE TABLE IF NOT EXISTS tareas_adjuntos (
    id SERIAL PRIMARY KEY,
    tarea_id INTEGER NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,             -- nombre único en storage
    extension VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    ruta_archivo TEXT NOT NULL,
    subido_por INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints de tamaño
    -- Documentos e imágenes: max 10MB (10485760 bytes)
    -- Archivos comprimidos: max 50MB (52428800 bytes)
    CONSTRAINT ck_tamano_adjuntos CHECK (
        (extension IN ('pdf','docx','doc','md','txt','csv','xls','xlsx','xlsm','png','jpg','jpeg','gif','webp') 
         AND tamano_bytes <= 10485760)
        OR
        (extension IN ('zip','rar','7z','tar','gz') 
         AND tamano_bytes <= 52428800)
    ),
    
    -- Constraint para validar extensiones permitidas
    CONSTRAINT ck_extension_permitida CHECK (
        extension IN (
            'pdf','docx','doc','md','txt',
            'csv','xls','xlsx','xlsm',
            'png','jpg','jpeg','gif','webp',
            'zip','rar','7z','tar','gz'
        )
    )
);

-- Índice para búsqueda por tarea
CREATE INDEX IF NOT EXISTS idx_tareas_adjuntos_tarea ON tareas_adjuntos(tarea_id);

-- Índice para búsqueda por fecha
CREATE INDEX IF NOT EXISTS idx_tareas_adjuntos_fecha ON tareas_adjuntos(created_at);

-- Comentarios de documentación
COMMENT ON TABLE tareas_adjuntos IS 'Archivos adjuntos a las tareas del sistema';
COMMENT ON COLUMN tareas_adjuntos.nombre_original IS 'Nombre original del archivo como lo subió el usuario';
COMMENT ON COLUMN tareas_adjuntos.nombre_archivo IS 'Nombre único generado para almacenamiento';
COMMENT ON COLUMN tareas_adjuntos.tamano_bytes IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN tareas_adjuntos.ruta_archivo IS 'Ruta relativa al directorio storage';
