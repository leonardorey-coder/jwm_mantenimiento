-- ============================================================================
-- INSERTAR ESPACIO COMÚN: RESTAURANTE
-- Base de datos: jwmantto
-- Usuario: leonardocruz
-- Fecha: 2025-11-20
-- ============================================================================

-- Insertar el restaurante en el edificio principal (Alfa)
-- Puedes cambiar el edificio_id según tus necesidades:
-- 1 = Alfa, 2 = Bravo, 3 = Charly, 4 = Eco, 5 = Fox, 6 = Casa Maat

INSERT INTO espacios_comunes (
    nombre, 
    edificio_id, 
    tipo, 
    descripcion, 
    estado, 
    capacidad, 
    horario_apertura, 
    horario_cierre,
    activo
) VALUES (
    'Restaurante',                          -- nombre
    1,                                       -- edificio_id (Alfa)
    'Restaurante',                          -- tipo
    'Restaurante principal del hotel',      -- descripcion
    'disponible',                           -- estado
    100,                                    -- capacidad (personas)
    '07:00',                                -- horario_apertura
    '23:00',                                -- horario_cierre
    true                                    -- activo
);

-- Verificar que se insertó correctamente
SELECT 
    id,
    nombre,
    tipo,
    edificio_id,
    (SELECT nombre FROM edificios WHERE id = espacios_comunes.edificio_id) as edificio_nombre,
    estado,
    capacidad,
    horario_apertura,
    horario_cierre,
    activo,
    created_at
FROM espacios_comunes
WHERE nombre = 'Restaurante';
