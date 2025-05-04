<?php
// Incluir la configuración de la base de datos
include 'db/config.php';

// Iniciar sesión y conexión a la base de datos
session_start();
$conexion = conectarDB();

// Verificar que se recibieron los parámetros necesarios
if (!isset($_GET['id']) || !isset($_GET['cuarto_id'])) {
    echo json_encode(['error' => 'Parámetros incompletos']);
    exit;
}

// Sanitizar y validar los parámetros
$id = (int)$_GET['id'];
$cuarto_id = (int)$_GET['cuarto_id'];

// Consultar el mantenimiento
$query = "SELECT id, cuarto_id, descripcion, tipo, hora, fecha_registro 
          FROM mantenimientos 
          WHERE id = ? AND cuarto_id = ?";
$stmt = $conexion->prepare($query);
$stmt->bind_param("ii", $id, $cuarto_id);
$stmt->execute();
$resultado = $stmt->get_result();

if ($resultado->num_rows === 0) {
    echo json_encode(['error' => 'Mantenimiento no encontrado']);
    exit;
}

// Obtener los datos del mantenimiento
$mantenimiento = $resultado->fetch_assoc();

// Devolver los datos en formato JSON
echo json_encode($mantenimiento);

// Cerrar la conexión
$conexion->close();
?>