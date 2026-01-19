-- =============================================
-- MIGRACIÓN: Reestructuración Jerárquica de Espacios
-- Fecha: 2026-01-18
-- Descripción: Nueva tabla 'areas', modificaciones a 'edificios' y 'espacios_comunes'
-- =============================================

BEGIN;

-- =============================================
-- 1. CREAR TABLA AREAS (si no existe)
-- =============================================
CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    edificio_id INTEGER REFERENCES edificios(id) ON DELETE CASCADE,
    codigo_sap VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE areas IS 'Áreas/Niveles intermedios entre edificios y espacios';
CREATE INDEX IF NOT EXISTS idx_areas_edificio ON areas(edificio_id);

-- =============================================
-- 2. MODIFICAR TABLA EDIFICIOS
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edificios' AND column_name = 'codigo_sap') THEN
        ALTER TABLE edificios ADD COLUMN codigo_sap VARCHAR(50) UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edificios' AND column_name = 'es_zona_general') THEN
        ALTER TABLE edificios ADD COLUMN es_zona_general BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =============================================
-- 3. MODIFICAR TABLA ESPACIOS_COMUNES
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'espacios_comunes' AND column_name = 'area_id') THEN
        ALTER TABLE espacios_comunes ADD COLUMN area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'espacios_comunes' AND column_name = 'codigo_sap') THEN
        ALTER TABLE espacios_comunes ADD COLUMN codigo_sap VARCHAR(100) UNIQUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_espacios_area ON espacios_comunes(area_id);

-- =============================================
-- 4. LIMPIAR DATOS EXISTENTES
-- =============================================
-- Primero eliminar mantenimientos de espacios comunes (si hay)
DELETE FROM mantenimientos WHERE espacio_comun_id IS NOT NULL;

-- Luego eliminar espacios comunes
DELETE FROM espacios_comunes;

-- Eliminar áreas (tabla nueva, probablemente vacía)
DELETE FROM areas;

-- NO eliminar edificios existentes, solo actualizar

-- =============================================
-- 5. ACTUALIZAR EDIFICIOS EXISTENTES CON CÓDIGOS SAP
-- =============================================
UPDATE edificios SET codigo_sap = 'J-LO-EALF', es_zona_general = false WHERE nombre ILIKE '%Alfa%';
UPDATE edificios SET codigo_sap = 'J-LO-EBRA', es_zona_general = false WHERE nombre ILIKE '%Bravo%';
UPDATE edificios SET codigo_sap = 'J-LO-ECHA', es_zona_general = false WHERE nombre ILIKE '%Charly%' OR nombre ILIKE '%Charlie%';
UPDATE edificios SET codigo_sap = 'J-LO-EECO', es_zona_general = false WHERE nombre ILIKE '%Eco%';
UPDATE edificios SET codigo_sap = 'J-LO-EFOX', es_zona_general = false WHERE nombre ILIKE '%Fox%';
UPDATE edificios SET codigo_sap = 'J-LO-ECAM', es_zona_general = false WHERE nombre ILIKE '%Casa Maat%' OR nombre ILIKE '%Maat%';


-- =============================================
-- 6. INSERTAR NUEVOS EDIFICIOS/ZONAS GENERALES
-- =============================================

INSERT INTO edificios (nombre, descripcion, codigo_sap, es_zona_general, activo)
VALUES ('Áreas Generales Resort', 'Zona general - Áreas Generales Resort', 'J-LO-AGER', true, true)
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO edificios (nombre, descripcion, codigo_sap, es_zona_general, activo)
VALUES ('Áreas Generales Casa Maat', 'Zona general - Áreas Generales Casa Maat', 'J-LO-AGCM', true, true)
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO edificios (nombre, descripcion, codigo_sap, es_zona_general, activo)
VALUES ('Lobby', 'Zona general - Lobby', 'J-LO-MBBY', true, true)
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO edificios (nombre, descripcion, codigo_sap, es_zona_general, activo)
VALUES ('Restaurant UA', 'Zona general - Restaurant UA', 'J-LO-RTUA', true, true)
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO edificios (nombre, descripcion, codigo_sap, es_zona_general, activo)
VALUES ('SPA Jasha', 'Zona general - SPA Jasha', 'J-LO-SJAS', true, true)
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO edificios (nombre, descripcion, codigo_sap, es_zona_general, activo)
VALUES ('Cafe Des Artistes', 'Zona general - Cafe Des Artistes', 'J-LO-RTCA', true, true)
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

-- =============================================
-- 7. INSERTAR ÁREAS
-- =============================================

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EALF-FAEXA', 'FACHADA ALFA', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EALF'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EALF-AZALF', 'AZOTEA ALFA', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EALF'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EALF-NIV1A', 'NIVEL 1A', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EALF'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EALF-NIV2A', 'NIVEL 2A', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EALF'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EALF-NIV3A', 'NIVEL 3A', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EALF'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EALF-NIV4A', 'NIVEL 4A', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EALF'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EALF-NIV5A', 'NIVEL 5A', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EALF'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EBRA-FAEXB', 'FACHADA BRAVO', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EBRA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EBRA-AZBRA', 'AZOTEA BRAVO', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EBRA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EBRA-PBBRA', 'PLANTA BAJA B', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EBRA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EBRA-NIV1B', 'NIVEL 1B', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EBRA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EBRA-NIV2B', 'NIVEL 2B', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EBRA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EBRA-NIV3B', 'NIVEL 3B', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EBRA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EBRA-NIV4B', 'NIVEL 4B', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EBRA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECHA-FAEXC', 'FACHADA CHARLY', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECHA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECHA-AZCHA', 'AZOTEA CHARLY', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECHA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECHA-PBBOH', 'PLANTA BAJA BOH', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECHA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECHA-NIV1C', 'NIVEL 1C', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECHA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECHA-NIV2C', 'NIVEL 2C', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECHA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECHA-NIV3C', 'NIVEL 3C', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECHA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECHA-NIV4C', 'NIVEL 4C', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECHA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-MBBY-NIV1L', 'NIVEL 1 LOBBY', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-MBBY'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EECO-FAEXE', 'FACHADA ECO', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EECO'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EECO-AZECO', 'AZOTEA ECO', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EECO'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EECO-PBECO', 'PLANTA BAJA ECO', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EECO'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EECO-NIV1E', 'NIVEL 1E', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EECO'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EECO-NIV2E', 'NIVEL 2E', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EECO'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EECO-NIV3E', 'NIVEL 3E', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EECO'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EECO-NIV4E', 'NIVEL 4E', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EECO'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EFOX-FAEXF', 'FACHADA FOX', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EFOX'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EFOX-AZFOX', 'AZOTEA FOX', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EFOX'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EFOX-NIV1F', 'NIVEL 1F', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EFOX'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EFOX-NIV2F', 'NIVEL 2F', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EFOX'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EFOX-NIV3F', 'NIVEL 3F', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EFOX'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-EFOX-NIV4F', 'NIVEL 4F', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-EFOX'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-AGER-NIV01', 'NIVEL 01 AREAS RESORT', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-AGER'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-AGER-NIV0R', 'NIVEL 0 AREAS RESORT', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-AGER'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-AGER-NIV1R', 'NIVEL 1 AREAS RESORT', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-AGER'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-RTUA-NIV1U', 'NIVEL 1 RESTAURANT UA', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-RTUA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-SJAS-NIV1S', 'NIVEL 1 SPA', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-SJAS'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-RTCA-NIVCA', 'NIVEL 1 CDA', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-RTCA'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECAM-FAEXG', 'FACHADA CASA MAAT', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECAM'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECAM-AZCAM', 'AZOTEA CASA MAAT', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECAM'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECAM-NIV1G', 'NIVEL 1G', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECAM'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECAM-NIV2G', 'NIVEL 2G', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECAM'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECAM-NIV3G', 'NIVEL 3G', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECAM'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECAM-NIV4G', 'NIVEL 4G', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECAM'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-ECAM-NIV5G', 'NIVEL 5G', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-ECAM'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO areas (edificio_id, codigo_sap, nombre, activo)
SELECT e.id, 'J-LO-AGCM-NIV1M', 'NIVEL 1 AREAS CASA MAAT', true
FROM edificios e 
WHERE e.codigo_sap = 'J-LO-AGCM'
ON CONFLICT (codigo_sap) DO UPDATE SET nombre = EXCLUDED.nombre;

-- =============================================
-- 8. INSERTAR ESPACIOS COMUNES
-- =============================================

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDIN TRASERO ALFA', a.edificio_id, a.id, 'exterior', 'J-LO-EALF-NIV1A-JARALFA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV1A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'POZO AGUA SALADA', a.edificio_id, a.id, 'comun', 'J-LO-EALF-NIV1A-JARALFA-POZASA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV1A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMO ALFA', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV1A-CRCMALF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV1A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 1A', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV1A-ROP1ALF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV1A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA DE ELECTRICISTAS', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV1A-ROP1ALF-BODELE', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV1A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA DE BLANCOS', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV1A-BODBCOS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV1A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTROS A208-307', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV1A-CFLALFA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV1A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 2A', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV2A-ROP2ALF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV2A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 3A', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV3A-ROP3ALF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV3A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 4A', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV4A-ROP4ALF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV4A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 5A', a.edificio_id, a.id, 'servicios', 'J-LO-EALF-NIV5A-ROP5ALF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EALF-NIV5A';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PASILLO MANTENIMIENTO', a.edificio_id, a.id, 'comun', 'J-LO-EBRA-PBBRA-PASIMTT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-PBBRA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA JARDINEROS', a.edificio_id, a.id, 'exterior', 'J-LO-EBRA-PBBRA-PASIMTT-BODJAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-PBBRA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMO DESAGÜE MNTT', a.edificio_id, a.id, 'servicios', 'J-LO-EBRA-PBBRA-PASIMTT-CRCMMT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-PBBRA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE MAQUINAS AB', a.edificio_id, a.id, 'servicios', 'J-LO-EBRA-PBBRA-PASIMTT-CTOMAB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-PBBRA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA MANTENIMIENTO', a.edificio_id, a.id, 'servicios', 'J-LO-EBRA-PBBRA-PASIMTT-OFIMTT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-PBBRA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'TALLER MANTENIMIENTO', a.edificio_id, a.id, 'servicios', 'J-LO-EBRA-PBBRA-PASIMTT-TLLMTO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-PBBRA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDINES EDIF BRAVO', a.edificio_id, a.id, 'exterior', 'J-LO-EBRA-NIV1B-JARBRAV', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-NIV1B';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 1B', a.edificio_id, a.id, 'servicios', 'J-LO-EBRA-NIV1B-ROP1BRA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-NIV1B';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 2B', a.edificio_id, a.id, 'servicios', 'J-LO-EBRA-NIV2B-ROP2BRA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-NIV2B';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 3B', a.edificio_id, a.id, 'servicios', 'J-LO-EBRA-NIV3B-ROP3BRA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-NIV3B';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 4B', a.edificio_id, a.id, 'servicios', 'J-LO-EBRA-NIV4B-ROP4BRA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EBRA-NIV4B';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALMACEN GENERAL', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-ALMGRAL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARNICERIA ALMACEN ', a.edificio_id, a.id, 'restaurante', 'J-LO-ECHA-PBBOH-ALMGRAL-CARICA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MEZZANINE ALMACEN GRAL', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-ALMGRAL-MEZZAG', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DE LOCKERS', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-ARELOCK', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'VESTIDOR CABALLEROS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-VESTIDC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS COLABORADORES', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-VESTIDC-BCCOLA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'VESTIDOR DAMAS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-VESTIDD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS COLABORADORAS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-VESTIDD-BDCOLA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA AREAS PUBLICAS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-BODAPUB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'COCINA BANQUETES', a.edificio_id, a.id, 'restaurante', 'J-LO-ECHA-PBBOH-COCBANQ', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DESCAMOCHE BANQUETES', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-COCBANQ-AREDBQ', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA CHIEF', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-COCBANQ-OFICHI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PASILLO BANQUETES', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-COCBANQ-PASIBQ', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'COCINA GENERAL', a.edificio_id, a.id, 'restaurante', 'J-LO-ECHA-PBBOH-COCGRAL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CHOCOLATERIA', a.edificio_id, a.id, 'restaurante', 'J-LO-ECHA-PBBOH-COCGRAL-CHOCOL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA DE CAPITANES', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-COCGRAL-OFICAP', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA DE CHEF', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-COCGRAL-OFICHE', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PASTELERIA UA', a.edificio_id, a.id, 'restaurante', 'J-LO-ECHA-PBBOH-COCGRAL-PASTUA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROOM SERVICE', a.edificio_id, a.id, 'restaurante', 'J-LO-ECHA-PBBOH-COCGRAL-ROMSER', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'COMEDOR DE EMPLEADOS', a.edificio_id, a.id, 'restaurante', 'J-LO-ECHA-PBBOH-COMEDOR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CONSULTORIO MEDICO', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-CMEDICO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTOS DE FILTROS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-CUARFLT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMO RETROLAVADO 01', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-CUARFLT-CRCMR1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO ADOLESCENTES', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-CUARFLT-CFLADO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO ADULTOS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-CUARFLT-CFLADT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO CDA', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-CUARFLT-CFLCDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO FAM 3', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-CUARFLT-CFLFM3', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO SPA', a.edificio_id, a.id, 'recreativo', 'J-LO-ECHA-PBBOH-CUARFLT-CFLSPA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESTACIONAMIENTO', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-ESTACIO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA DE PINTORES', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-ESTACIO-BODPIN', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO CABINA 12', a.edificio_id, a.id, 'eventos', 'J-LO-ECHA-PBBOH-ESTACIO-CFLC12', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE MAQUINAS AGUA CALIENTE SPA', a.edificio_id, a.id, 'recreativo', 'J-LO-ECHA-PBBOH-ESTACIO-CTOMCS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'TALLER DE CARPINTERIA', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-ESTACIO-TLLCAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'LAVANDERIA', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-LAVANDE', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA LOST AND FOUND', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-LAVANDE-BODLAF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA AMA DE LLAVES', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-LAVANDE-OFIALL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA SASTRE', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-LAVANDE-OFISAS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SHUT PRINCIPAL LAVANDERIA', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-LAVANDE-SHUTLV', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DE VALET', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-LAVANDE-AREVAL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA PREVENCION', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-OFIPREV', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CASETA PREVENCION', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-OFIPREV-CASPRV', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CCTV PREVENCION', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-OFIPREV-CCTVPR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DE MANIOBRAS', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-AREMANI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA PAPELERIA ALMACEN GRAL', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREMANI-BODPAG', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA STEWARD', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREMANI-BODSTW', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA COMPRAS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREMANI-OFICOM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'RECEPCION DE MERCANCIA', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREMANI-RECMER', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS PROVEEDORES', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREMANI-BCPROV', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MEZZANINE RH', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-MEZZORH', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA RECURSOS HUMANOS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-OFIREHU', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DE TANQUES ESTACIONARIOS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-ARETANE', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESCALERAS ACCESO TANQUES LP', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-ARETANE-ESATLP', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DE PTAR', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREPTAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMO AMORTIGUAMIENTO PREAEREACION', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREPTAR-CRCMPA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMO DE DERRAME', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREPTAR-CRCMDR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMOS AGUAS CRUDAS PRINCIPAL', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREPTAR-CRCMAC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ESTABILIZACION DE LODOS', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-AREPTAR-AREEDL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA MINICELL-10 MNC-10', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-AREPTAR-AREMNC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA PLATAFORMA QUIMICOS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREPTAR-AREPDQ', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA REACTOR BIOLOGICO AEROBICO', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREPTAR-ARERBA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA REACTOR ZONA ANOXICA', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-AREPTAR-ARERZA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALA DE MAQUINAS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA BOMBAS DE CONDENSADO', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-AREBCD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA CALENTADORES', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-ARECAL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA CHILLERS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-ARECHI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA EQUIPO CONTRA INCENDIO', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-SMAQPPL-AREECI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA OSMOSIS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-AREOSM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA PLANTAS DE EMERGENCIA', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-SMAQPPL-AREPLE', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA SISTEMA HIDRONEUMATICO', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-SMAQPPL-ARESIH', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA TANQUES DE AGUA CALIENTE', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-ARETAC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA TREN DE FILTRADO', a.edificio_id, a.id, 'comun', 'J-LO-ECHA-PBBOH-SMAQPPL-ARETRF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 113 M3 AUX POTABLE 1', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISPO1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 113 M3 AUX POTABLE 2', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISPO2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 187 M3 AGUA SALADA', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISASL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 207 M3 PCI 1', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISCI1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 207 M3 PCI 2', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISCI2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 240 M3 TRATADA 1', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISTR1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 240 M3 TRATADA 2', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISTR2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 353 M3 AGUA POTABLE 1', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISAP1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CISTERNA 353 M3 AGUA POTABLE 2', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SMAQPPL-CISAP2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACIONES ELECTRICAS', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACION 1', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL-SUBES1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACION 2', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL-SUBES2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACION 3', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL-SUBES3', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACION 4', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL-SUBES4', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACION 5', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL-SUBES5', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACION 6', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL-SUBES6', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACION 7', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL-SUBES7', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SUBESTACION PRINCIPAL', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-PBBOH-SUBESEL-SUBESP', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-PBBOH';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDINES FRONTALES EDIF CHARLY', a.edificio_id, a.id, 'exterior', 'J-LO-ECHA-NIV1C-JARCHAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-NIV1C';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 1C', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-NIV1C-ROP1CHA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-NIV1C';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PANTRY DELY', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-NIV1C-PANTRYD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-NIV1C';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 2C', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-NIV2C-ROP2CHA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-NIV2C';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 3C', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-NIV3C-ROP3CHA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-NIV3C';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 4C', a.edificio_id, a.id, 'servicios', 'J-LO-ECHA-NIV4C-ROP4CHA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECHA-NIV4C';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ANDADOR DE ACCESO VEHICULOS', a.edificio_id, a.id, 'exterior', 'J-LO-MBBY-NIV1L-PASIVEH', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AUKA DELI', a.edificio_id, a.id, 'comun', 'J-LO-MBBY-NIV1L-AUKADEL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BAR NIPARAYA', a.edificio_id, a.id, 'restaurante', 'J-LO-MBBY-NIV1L-BARNIPA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BIBLIOTECA', a.edificio_id, a.id, 'comun', 'J-LO-MBBY-NIV1L-BIBLIOT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BOUTIQUE', a.edificio_id, a.id, 'comun', 'J-LO-MBBY-NIV1L-BOUTIQU', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'LOBBY DE GRUPOS', a.edificio_id, a.id, 'comun', 'J-LO-MBBY-NIV1L-LOBBYGP', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'LOBBY PRINCIPAL', a.edificio_id, a.id, 'comun', 'J-LO-MBBY-NIV1L-LOBBYPP', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS LOBBY', a.edificio_id, a.id, 'servicios', 'J-LO-MBBY-NIV1L-LOBBYPP-BCLOBB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS LOBBY', a.edificio_id, a.id, 'servicios', 'J-LO-MBBY-NIV1L-LOBBYPP-BDLOBB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MURO LOBBY PRINCIPAL', a.edificio_id, a.id, 'comun', 'J-LO-MBBY-NIV1L-MRLPPAL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA BELL BOY', a.edificio_id, a.id, 'servicios', 'J-LO-MBBY-NIV1L-OFIBBOY', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA RECEPCION', a.edificio_id, a.id, 'servicios', 'J-LO-MBBY-NIV1L-OFIRECE', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA TAXIS', a.edificio_id, a.id, 'servicios', 'J-LO-MBBY-NIV1L-OFITAXI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS TAXIS', a.edificio_id, a.id, 'servicios', 'J-LO-MBBY-NIV1L-OFITAXI-BCTAXI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'RECEPCION', a.edificio_id, a.id, 'servicios', 'J-LO-MBBY-NIV1L-RECEPCI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA TAMARAL', a.edificio_id, a.id, 'servicios', 'J-LO-MBBY-NIV1L-OFITAMA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-MBBY-NIV1L';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINAS ADMINISTRATIVAS', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA COMUN', a.edificio_id, a.id, 'comun', 'J-LO-EECO-PBECO-OFIADMS-ARECOM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA AT YOU SERVICE', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIAYS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA AUDITORIA GRUPOS', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIAUG', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA BODAS', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIBOD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA ROOM SERVICE', a.edificio_id, a.id, 'restaurante', 'J-LO-EECO-PBECO-OFIADMS-BODRMS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA C X P', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFICXP', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CAJA GENERAL', a.edificio_id, a.id, 'comun', 'J-LO-EECO-PBECO-OFIADMS-CAJGRA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA CONTRALORIA', a.edificio_id, a.id, 'comun', 'J-LO-EECO-PBECO-OFIADMS-ARECON', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA DIRECCION GENERAL', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIDIG', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA GERENTE AYB', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIGAB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA BANQUETES', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIBQT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA CONTRALOR', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFICTR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA RESERVACIONES', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIRES', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA REVENUE', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIREV', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA REVENUE MANAGER', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIREM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA SUBCONTRALOR', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFISUC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA VENTAS 1', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIVT1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA VENTAS 2', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIVT2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA VENTAS 3', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIVT3', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA VENTAS DIRECCION', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-OFIVTD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS ADMON', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-BCADMN', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS ADMON', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFIADMS-BDADMN', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA DE SISTEMAS', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFISIST', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA BANCO DE BATERIAS', a.edificio_id, a.id, 'comun', 'J-LO-EECO-PBECO-OFISIST-AREBDB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA TV', a.edificio_id, a.id, 'comun', 'J-LO-EECO-PBECO-OFISIST-ARETVS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA SITE SISTEMAS', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-PBECO-OFISIST-ARESIS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-PBECO';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ANDADOR ECO A FOX', a.edificio_id, a.id, 'exterior', 'J-LO-EECO-NIV1E-PASIECO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-NIV1E';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 1E', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-NIV1E-ROP1ECO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-NIV1E';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 2E', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-NIV2E-ROP2ECO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-NIV2E';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 3E', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-NIV3E-ROP3ECO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-NIV3E';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 4E', a.edificio_id, a.id, 'servicios', 'J-LO-EECO-NIV4E-ROP4ECO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EECO-NIV4E';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDINES FRONTALES FOX', a.edificio_id, a.id, 'exterior', 'J-LO-EFOX-NIV1F-JARFFOX', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EFOX-NIV1F';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 1F', a.edificio_id, a.id, 'servicios', 'J-LO-EFOX-NIV1F-ROP1FOX', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EFOX-NIV1F';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 2F', a.edificio_id, a.id, 'servicios', 'J-LO-EFOX-NIV2F-ROP2FOX', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EFOX-NIV2F';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 3F', a.edificio_id, a.id, 'servicios', 'J-LO-EFOX-NIV3F-ROP3FOX', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EFOX-NIV3F';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 4F', a.edificio_id, a.id, 'servicios', 'J-LO-EFOX-NIV4F-ROP4FOX', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-EFOX-NIV4F';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DE PLAYA', a.edificio_id, a.id, 'exterior', 'J-LO-AGER-NIV01-AREPLAY', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV01';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESCALERAS ACCESO PLAYA', a.edificio_id, a.id, 'exterior', 'J-LO-AGER-NIV01-ESACPLA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV01';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'DUELA PLAYA', a.edificio_id, a.id, 'exterior', 'J-LO-AGER-NIV01-DUELPLA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV01';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCAS', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-ALBERCS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA ADOLESCENTES', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREADOL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA ADOLESCENTES', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREADOL-ALBADO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESCALERAS DE ACCESO LADO UA ADOLESCENTES', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-AREADOL-ESADOL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA ADULTOS', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREADTO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA ADULTOS', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREADTO-ALBADT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'DUELA ADULTOS', a.edificio_id, a.id, 'exterior', 'J-LO-AGER-NIV0R-AREADTO-DUELAD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI ADULTOS', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREADTO-JACADT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA FAM 1', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREFAM1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA FAM 1', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREFAM1-ALBFM1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA FAM 2', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREFAM2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA FAM 2', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREFAM2-ALBFM2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA FAM 3', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREFAM3', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA FAM 3', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREFAM3-ALBFM3', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CANAL INFINITY', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-AREFAM3-CANINF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI FAM III', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREFAM3-JACFM3', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA KIDS 1', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREKID1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA KIDS 1', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREKID1-ALBKD1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA KIDS 2', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREKID2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA KIDS 2', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREKID2-ALBKD2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA MARHUMO', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREMARH', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA MARHUMO', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-AREMARH-ALBMAH', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BAR MARHUMO', a.edificio_id, a.id, 'restaurante', 'J-LO-AGER-NIV0R-AREMARH-BARMAH', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'RESTAURANT MARHUMO', a.edificio_id, a.id, 'restaurante', 'J-LO-AGER-NIV0R-AREMARH-RESTMH', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA ALBERCA SALADA', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-ARESALA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA SALADA', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-ARESALA-ALBSAL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMO PLUVIAL AREA SALADA', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-ARESALA-CRCMPS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO SALADA', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-ARESALA-CFLSAL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'DUELA SALADA', a.edificio_id, a.id, 'exterior', 'J-LO-AGER-NIV0R-ARESALA-DUELSA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESCALERAS ALBERCA SALADA', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-ARESALA-ESALBS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS SALADA', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-ARESALA-BCALBS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS SALADA', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-ARESALA-BDALBS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BAR KAHA', a.edificio_id, a.id, 'restaurante', 'J-LO-AGER-NIV0R-BARKAHA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PASILLO Y ESCALERAS KAHA', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-BARKAHA-PASIEK', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SITE KAHA BAR', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-BARKAHA-SITEKB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS KAHA', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-BARKAHA-BCKBAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS KAHA COLABORADORES', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-BARKAHA-BCKABC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS KAHA', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-BARKAHA-BDKBAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BUSINESS CENTER', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-BUSCENT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALA DE JUNTAS BOARD ROOM', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-BUSCENT-SALJUN', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA AYB BC', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-BUSCENT-BODABC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESPEJO MATKUS', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-BUSCENT-ESPMAT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MATKU I', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-BUSCENT-SLNMK1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MATKU II', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-BUSCENT-SLNMK2', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MATKU III', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-BUSCENT-SLNMK3', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MATKU IV', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-BUSCENT-SLNMK4', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'RECEPCION BUSINESS CENTER', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-BUSCENT-RECEPB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALA DE COMPUTADORAS BUSINESS CENTER', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-BUSCENT-SALCBC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS BUSINESS C', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-BUSCENT-BCBUSC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS BUSINESS C', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-BUSCENT-BDBUSC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CANCHA DE TENIS', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-CANDTEN', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS CANCHA DE TENIS', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-CANDTEN-BDTENI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESPEJO KAHA BAR', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-ESPKAHA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDIN HUNDIDO', a.edificio_id, a.id, 'exterior', 'J-LO-AGER-NIV0R-JARHUND', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'RESTAURANT TACOS EL LUCHADOR', a.edificio_id, a.id, 'restaurante', 'J-LO-AGER-NIV0R-JARHUND-RESTLU', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MIMAH FITNESS CENTER', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-GYMFITC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'GIMNASIO', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-GYMFITC-GYMNAC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDIN YOGA', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-GYMFITC-JARYOG', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA GYM', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-GYMFITC-OFICGY', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS GYM', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-GYMFITC-BCFITC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS GYM', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-GYMFITC-BDFITC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'NAYAA KOT KIDS CORNER', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-NYKKIDC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CINE KIDS', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-NYKKIDC-CINKID', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'KIDS CLUB', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-NYKKIDC-KIDCLB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'TEENS CLUB', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-NYKKIDC-TEENSC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS KIDS CORNER', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-NYKKIDC-BCKIDS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS KIDS CORNER', a.edificio_id, a.id, 'recreativo', 'J-LO-AGER-NIV0R-NYKKIDC-BDKIDS', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PATIO AMET', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-PATAMET', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PASILLO DERECHO AMET', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-PATAMET-PASIAD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PASILLO IZQUIERDO AMET', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV0R-PATAMET-PASIAI', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALONES MILA', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE MAQUINAS ECO', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-SLNMILA-CTOMEC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'FOYER NORTE', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-FOYRNT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'FOYER SUR', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-FOYRSR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MILA 1-2', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-SLNML1', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MILA 3', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-SLNML3', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MILA 4', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-SLNML4', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MILA 5-6', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-SLNML5', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MIMU', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-SLNMIM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON MITAT', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-SLNMIT', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA VENTAS BANQUETES', a.edificio_id, a.id, 'servicios', 'J-LO-AGER-NIV0R-SLNMILA-OFIVTB', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS FOYER', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-BCFOYR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS FOYER', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV0R-SLNMILA-BDFOYR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV0R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ANFITEATRO SUM SAN', a.edificio_id, a.id, 'eventos', 'J-LO-AGER-NIV1R-ANFITEA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV1R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BAR PEYOTE', a.edificio_id, a.id, 'restaurante', 'J-LO-AGER-NIV1R-BARPEYO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV1R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESPEJO PRINCIPAL', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV1R-ESPPPAL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV1R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'KEPE GAZEBO', a.edificio_id, a.id, 'comun', 'J-LO-AGER-NIV1R-KEPEGAZ', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGER-NIV1R';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA BUFFET DESAYUNO', a.edificio_id, a.id, 'restaurante', 'J-LO-RTUA-NIV1U-AREBUFD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CAJA UA', a.edificio_id, a.id, 'comun', 'J-LO-RTUA-NIV1U-CAJARUA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARNICERIA UA', a.edificio_id, a.id, 'restaurante', 'J-LO-RTUA-NIV1U-CARNRUA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'HUERTO ORGANICO', a.edificio_id, a.id, 'comun', 'J-LO-RTUA-NIV1U-HUERORG', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDINERA FRONTAL UA', a.edificio_id, a.id, 'exterior', 'J-LO-RTUA-NIV1U-JARFRUA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'LINEA CALIENTE', a.edificio_id, a.id, 'restaurante', 'J-LO-RTUA-NIV1U-LINEACA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'LINEA FRIA', a.edificio_id, a.id, 'restaurante', 'J-LO-RTUA-NIV1U-LINEAFR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'TERRAZA UA', a.edificio_id, a.id, 'exterior', 'J-LO-RTUA-NIV1U-TZAREUA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MEZZANINNE RESTAURANT UA', a.edificio_id, a.id, 'restaurante', 'J-LO-RTUA-NIV1U-MEZZAUA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTUA-NIV1U';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA VITALITY', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ALBVITA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DE SERVICIO', a.edificio_id, a.id, 'comun', 'J-LO-SJAS-NIV1S-ARESERV', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DESCANSO MASAJISTAS', a.edificio_id, a.id, 'comun', 'J-LO-SJAS-NIV1S-AREMASJ', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA RELAJACION CABALLEROS', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI HOMBRES CALIENTE', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELC-JACCAC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI HOMBRES FRIO', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELC-JACCAF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MURO LLORON CABALLEROS', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELC-MRLLOC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS SPA', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELC-BCJSPA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA RELAJACION DAMAS', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI MUJERES CALIENTE', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELD-JACDAC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI MUJERES FRIO', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELD-JACDAF', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MURO LLORON DAMAS', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELD-MRLLOD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS SPA', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-ARERELD-BDJSPA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA I', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN01', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA II', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN02', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA III', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN03', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA IV', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN04', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA IX', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN09', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA V', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN05', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA VI', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN06', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA VII', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN07', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA VIII', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN08', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA X', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN10', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA XI', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN11', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI CABINA XI', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN11-JACC11', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS XI', a.edificio_id, a.id, 'servicios', 'J-LO-SJAS-NIV1S-CABIN11-BCCB11', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CABINA XII', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN12', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI CABINA XII', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-CABIN12-JACC12', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS XII', a.edificio_id, a.id, 'servicios', 'J-LO-SJAS-NIV1S-CABIN12-BCCB12', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CANAL DE NADO', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-CANDNAD', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO MUROS LLORONES', a.edificio_id, a.id, 'servicios', 'J-LO-SJAS-NIV1S-CFLMLLO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA GERENTE SPA', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-OFIGSPA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON DE BELLEZA', a.edificio_id, a.id, 'eventos', 'J-LO-SJAS-NIV1S-SLNBELL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'TEMAZCAL', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-TEMAZCL', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'TIENDA SPA', a.edificio_id, a.id, 'recreativo', 'J-LO-SJAS-NIV1S-TIENSPA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-SJAS-NIV1S';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA PREPARACION CDA', a.edificio_id, a.id, 'comun', 'J-LO-RTCA-NIVCA-AREPCDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BAR CDA', a.edificio_id, a.id, 'restaurante', 'J-LO-RTCA-NIVCA-BARCDAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CAJA CDA', a.edificio_id, a.id, 'comun', 'J-LO-RTCA-NIVCA-CAJACDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMO CAFE DES ARTISTES', a.edificio_id, a.id, 'restaurante', 'J-LO-RTCA-NIVCA-CRCMCDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'AREA DE COCHAMBRE CDA', a.edificio_id, a.id, 'comun', 'J-LO-RTCA-NIVCA-ARECCDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'COCINA CDA', a.edificio_id, a.id, 'restaurante', 'J-LO-RTCA-NIVCA-COCICDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTOS DE SECOS CDA', a.edificio_id, a.id, 'comun', 'J-LO-RTCA-NIVCA-CTOSCDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESPEJO DE AGUA CDA', a.edificio_id, a.id, 'comun', 'J-LO-RTCA-NIVCA-ESPACDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'FACHADA LADO ESPEJO DE AGUA', a.edificio_id, a.id, 'exterior', 'J-LO-RTCA-NIVCA-FALESPA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDINERAS CDA LADO ADULTOS', a.edificio_id, a.id, 'exterior', 'J-LO-RTCA-NIVCA-JARDCDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA CDA', a.edificio_id, a.id, 'servicios', 'J-LO-RTCA-NIVCA-OFICDAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PANADERIA CDA', a.edificio_id, a.id, 'restaurante', 'J-LO-RTCA-NIVCA-PANADCA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PRIVADO MESA DEL CHEF CDA', a.edificio_id, a.id, 'eventos', 'J-LO-RTCA-NIVCA-PRIVCDA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALON CDA', a.edificio_id, a.id, 'eventos', 'J-LO-RTCA-NIVCA-SLNCDAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'TERRAZA CDA', a.edificio_id, a.id, 'exterior', 'J-LO-RTCA-NIVCA-TZACDAR', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS CDA', a.edificio_id, a.id, 'servicios', 'J-LO-RTCA-NIVCA-BCCDART', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS CDA', a.edificio_id, a.id, 'servicios', 'J-LO-RTCA-NIVCA-BDCDART', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MEZZANINE CDA', a.edificio_id, a.id, 'servicios', 'J-LO-RTCA-NIVCA-MEZZACA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-RTCA-NIVCA';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BODEGA AYB CASA MAAT', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV1G-BODABCM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CUARTO DE FILTRO CASA MAAT', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV1G-CFLCAMA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'GAME ROOM', a.edificio_id, a.id, 'recreativo', 'J-LO-ECAM-NIV1G-GAMEROM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS GAME ROOM', a.edificio_id, a.id, 'recreativo', 'J-LO-ECAM-NIV1G-GAMEROM-BCGARO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS GAME ROOM', a.edificio_id, a.id, 'recreativo', 'J-LO-ECAM-NIV1G-GAMEROM-BDGARO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'LOUNGE MAYMA', a.edificio_id, a.id, 'recreativo', 'J-LO-ECAM-NIV1G-LAUMAYM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESCALERAS TRASERAS MAYMA', a.edificio_id, a.id, 'comun', 'J-LO-ECAM-NIV1G-LAUMAYM-ESTMAY', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDIN MAGUEYES MAYMA', a.edificio_id, a.id, 'exterior', 'J-LO-ECAM-NIV1G-LAUMAYM-JARMAY', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS MAYMA', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV1G-LAUMAYM-BCMAYM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS MAYMA', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV1G-LAUMAYM-BDMAYM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PANTRY CASA MAAT', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV1G-PANTRYC', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 1G', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV1G-ROP1CAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV1G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALA DE JUNTAS KUMAT', a.edificio_id, a.id, 'eventos', 'J-LO-ECAM-NIV2G-SALJKUM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV2G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CINE KUMAT', a.edificio_id, a.id, 'eventos', 'J-LO-ECAM-NIV2G-SALJKUM-CINKUM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV2G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALA KUMAT', a.edificio_id, a.id, 'comun', 'J-LO-ECAM-NIV2G-SALJKUM-SALKUM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV2G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'SALA VIP KUMAT', a.edificio_id, a.id, 'comun', 'J-LO-ECAM-NIV2G-SALJKUM-SALVKU', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV2G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS KUMAT', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV2G-SALJKUM-BCKUMA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV2G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS KUMAT', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV2G-SALJKUM-BDKUMA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV2G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'OFICINA MAYORDOMOS', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV2G-OFIMAYO', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV2G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 2G', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV2G-ROP2CAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV2G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'LOBBY CASA MAAT', a.edificio_id, a.id, 'comun', 'J-LO-ECAM-NIV3G-LOBBYCM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV3G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ESPEJO GRIFFIN', a.edificio_id, a.id, 'comun', 'J-LO-ECAM-NIV3G-LOBBYCM-ESPCAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV3G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS LOBBY CASA MAAT', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV3G-LOBBYCM-BCLOCM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV3G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 3G', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV3G-ROP3CAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV3G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 4G', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV4G-ROP4CAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV4G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ROPERIA NIVEL 5G', a.edificio_id, a.id, 'servicios', 'J-LO-ECAM-NIV5G-ROP5CAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-ECAM-NIV5G';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'ALBERCA CASA MAAT', a.edificio_id, a.id, 'recreativo', 'J-LO-AGCM-NIV1M-ALBCAMA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'CARCAMO CASA MAAT', a.edificio_id, a.id, 'servicios', 'J-LO-AGCM-NIV1M-CRCMCAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'DUELA CASA MAAT', a.edificio_id, a.id, 'exterior', 'J-LO-AGCM-NIV1M-DUELCAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JACUZZI CASA MAAT', a.edificio_id, a.id, 'recreativo', 'J-LO-AGCM-NIV1M-JACCAMA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'JARDINES CASA MAAT', a.edificio_id, a.id, 'exterior', 'J-LO-AGCM-NIV1M-JARCAMA', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'MURO DIVISION CASA MAAT', a.edificio_id, a.id, 'exterior', 'J-LO-AGCM-NIV1M-MRDIVCM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PASILLO CONTRA CASA MAAT', a.edificio_id, a.id, 'comun', 'J-LO-AGCM-NIV1M-PASICAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'PASILLO MAAT ACCESO RAMPA', a.edificio_id, a.id, 'comun', 'J-LO-AGCM-NIV1M-PASIRAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO CABALLEROS POOL CASA MAAT', a.edificio_id, a.id, 'servicios', 'J-LO-AGCM-NIV1M-BCPOCAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';

INSERT INTO espacios_comunes (nombre, edificio_id, area_id, tipo, codigo_sap, estado, activo)
SELECT 'BANO DAMAS POOL CASA MAAT', a.edificio_id, a.id, 'servicios', 'J-LO-AGCM-NIV1M-BDPOCAM', 'disponible', true
FROM areas a 
WHERE a.codigo_sap = 'J-LO-AGCM-NIV1M';


-- =============================================
-- 9. VERIFICACIÓN
-- =============================================
DO $$
DECLARE
    v_edificios INTEGER;
    v_areas INTEGER;
    v_espacios INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_edificios FROM edificios WHERE activo = true;
    SELECT COUNT(*) INTO v_areas FROM areas WHERE activo = true;
    SELECT COUNT(*) INTO v_espacios FROM espacios_comunes WHERE activo = true;
    
    RAISE NOTICE '=== RESUMEN DE MIGRACIÓN ===';
    RAISE NOTICE 'Edificios/Zonas: %', v_edificios;
    RAISE NOTICE 'Áreas: %', v_areas;
    RAISE NOTICE 'Espacios Comunes: %', v_espacios;
END $$;

COMMIT;
