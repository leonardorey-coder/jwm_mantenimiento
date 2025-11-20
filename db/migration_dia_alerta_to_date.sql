-- Migración: Cambiar dia_alerta de INTEGER a DATE
-- Fecha: 2025-11-13
-- Descripción: Convierte el campo dia_alerta de número del día (1-31) a fecha completa (DATE)

-- Paso 1: Agregar columna temporal de tipo DATE
ALTER TABLE mantenimientos ADD COLUMN dia_alerta_temp DATE;

-- Paso 2: Migrar datos existentes (convertir día del mes a fecha del mes actual)
-- Los registros con dia_alerta numérico se convertirán a fecha del mes actual
UPDATE mantenimientos 
SET dia_alerta_temp = MAKE_DATE(
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    dia_alerta::INTEGER
)
WHERE dia_alerta IS NOT NULL 
AND dia_alerta::TEXT ~ '^\d+$'  -- Solo si es un número
AND dia_alerta::INTEGER BETWEEN 1 AND 31;

-- Paso 3: Eliminar la columna antigua
ALTER TABLE mantenimientos DROP COLUMN dia_alerta;

-- Paso 4: Renombrar la columna temporal
ALTER TABLE mantenimientos RENAME COLUMN dia_alerta_temp TO dia_alerta;

-- Paso 5: Agregar columna prioridad si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mantenimientos' AND column_name = 'prioridad'
    ) THEN
        ALTER TABLE mantenimientos 
        ADD COLUMN prioridad VARCHAR(20) DEFAULT 'media' 
        CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente'));
    END IF;
END $$;

-- Verificar el cambio
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mantenimientos' 
AND column_name IN ('dia_alerta', 'prioridad');
