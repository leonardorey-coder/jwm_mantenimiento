-- ============================================
-- Migración: Schema para fotos de Checklist
-- Fecha: 2025-12-11
-- Descripción: Tabla para almacenar fotos de inspecciones de checklist
-- ============================================

-- Tabla para fotos de checklist
CREATE TABLE IF NOT EXISTS checklist_fotos (
    id SERIAL PRIMARY KEY,
    cuarto_id INTEGER REFERENCES cuartos(id) ON DELETE CASCADE,
    catalog_item_id INTEGER REFERENCES checklist_catalog_items(id) ON DELETE SET NULL,
    foto_url TEXT NOT NULL,
    uploadthing_key TEXT,
    notas TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_tomada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_checklist_fotos_cuarto ON checklist_fotos(cuarto_id);
CREATE INDEX IF NOT EXISTS idx_checklist_fotos_item ON checklist_fotos(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_checklist_fotos_usuario ON checklist_fotos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_checklist_fotos_fecha ON checklist_fotos(created_at DESC);

-- Comentarios descriptivos
COMMENT ON TABLE checklist_fotos IS 'Almacena fotos de inspección de checklist vinculadas a cuartos e ítems';
COMMENT ON COLUMN checklist_fotos.cuarto_id IS 'Cuarto/habitación donde se tomó la foto';
COMMENT ON COLUMN checklist_fotos.catalog_item_id IS 'Ítem del catálogo de checklist al que se vincula la foto (opcional)';
COMMENT ON COLUMN checklist_fotos.foto_url IS 'URL de la foto almacenada en UploadThing';
COMMENT ON COLUMN checklist_fotos.uploadthing_key IS 'Key de UploadThing para gestionar el archivo';
COMMENT ON COLUMN checklist_fotos.notas IS 'Notas u observaciones sobre la foto';
COMMENT ON COLUMN checklist_fotos.usuario_id IS 'Usuario que tomó/registró la foto';
COMMENT ON COLUMN checklist_fotos.fecha_tomada IS 'Fecha/hora en que se tomó la foto';
