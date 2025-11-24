-- Crear tabla de tareas
CREATE TABLE IF NOT EXISTS tareas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, en_proceso, completada
    prioridad VARCHAR(50) DEFAULT 'media', -- baja, media, alta
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE,
    creado_por INTEGER REFERENCES usuarios(id),
    asignado_a INTEGER REFERENCES usuarios(id),
    ubicacion VARCHAR(255),
    tags TEXT[], -- Array de tags
    archivos TEXT[] -- Array de URLs de archivos
);

-- Agregar columna tarea_id a mantenimientos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mantenimientos' AND column_name = 'tarea_id') THEN
        ALTER TABLE mantenimientos ADD COLUMN tarea_id INTEGER REFERENCES tareas(id) ON DELETE SET NULL;
    END IF;
END $$;
