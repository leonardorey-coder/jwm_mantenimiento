-- Base de datos para sistema de mantenimiento de cuartos
-- Finest Maintenance

-- Eliminar tablas si existen para evitar errores
DROP TABLE IF EXISTS mantenimientos;
DROP TABLE IF EXISTS cuartos;
DROP TABLE IF EXISTS edificios;

-- Tabla de edificios
CREATE TABLE edificios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    UNIQUE KEY (nombre)
);

-- Tabla de cuartos
CREATE TABLE cuartos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    edificio_id INT NOT NULL,
    descripcion TEXT,
    FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE CASCADE,
    UNIQUE KEY (nombre, edificio_id)
);

-- Tabla de mantenimientos
CREATE TABLE mantenimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuarto_id INT NOT NULL,
    descripcion TEXT NOT NULL,
    tipo ENUM('normal', 'rutina') NOT NULL DEFAULT 'normal',
    hora TIME DEFAULT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cuarto_id) REFERENCES cuartos(id) ON DELETE CASCADE
);

-- Inserta algunos datos de ejemplo
INSERT INTO edificios (nombre) VALUES 
('Torre A'),
('Torre B'),
('Edificio Principal');

-- Inserta algunos cuartos de ejemplo
INSERT INTO cuartos (nombre, edificio_id, descripcion) VALUES
('101', 1, 'Suite King'),
('102', 1, 'Suite Doble'),
('201', 2, 'Suite Queen'),
('301', 3, 'Suite Presidencial'),
('302', 3, 'Suite Ejecutiva');