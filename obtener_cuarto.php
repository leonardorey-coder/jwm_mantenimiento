<?php
// Incluir la configuración de la base de datos
include 'db/config.php';

// Iniciar sesión y conexión a la base de datos
session_start();
$conexion = conectarDB();

// Verificar que se recibió el ID del cuarto
if (!isset($_GET['id'])) {
    echo json_encode(['error' => 'ID de cuarto no especificado']);
    exit;
}

// Sanitizar y validar el ID
$id = (int)$_GET['id'];

// Consultar el cuarto
$query = "SELECT c.id, c.nombre, c.descripcion, c.edificio_id, e.nombre as edificio 
          FROM cuartos c 
          JOIN edificios e ON c.edificio_id = e.id 
          WHERE c.id = ?";
$stmt = $conexion->prepare($query);
$stmt->bind_param("i", $id);
$stmt->execute();
$resultado = $stmt->get_result();

if ($resultado->num_rows === 0) {
    echo json_encode(['error' => 'Cuarto no encontrado']);
    exit;
}

// Obtener los datos del cuarto
$cuarto = $resultado->fetch_assoc();

// Devolver los datos en formato JSON
echo json_encode($cuarto);

// Cerrar la conexión
$conexion->close();
?>