-- =====================================================
-- Migración: Agregar columna background_url a usuarios
-- Sistema: JW Marriott - Sistema de Mantenimiento
-- Fecha: 2025-01-13
-- Descripción: Añade campo para imagen de fondo personalizada por usuario
-- =====================================================

-- Agregar columna background_url a tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS background_url VARCHAR(500);

-- Agregar índice para mejorar búsquedas por background_url
CREATE INDEX IF NOT EXISTS idx_usuarios_background_url 
ON usuarios(background_url) 
WHERE background_url IS NOT NULL;

-- Comentario descriptivo de la columna
COMMENT ON COLUMN usuarios.background_url IS 'URL de la imagen de fondo personalizada del usuario (UploadThing)';

-- Verificar la migración
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'background_url';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: columna background_url agregada a tabla usuarios';
END $$;
