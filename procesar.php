<?php
// Habilitar reporte de errores detallado (SOLO PARA DESARROLLO)
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores al usuario final
ini_set('log_errors', 1); // Habilitar log de errores
// ini_set('error_log', '/ruta/a/tu/php-error.log'); // Opcional: Especificar archivo de log

// Incluir la configuración de la base de datos
include 'db/config.php';

// Iniciar sesión
session_start();

// --- INICIO: Manejo de Peticiones y Datos de Entrada ---
// Detectar si es AJAX
$is_ajax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
$input_data = [];

// Leer datos JSON si es AJAX con Content-Type correcto
if ($is_ajax && isset($_SERVER['CONTENT_TYPE']) && stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    $json_data = file_get_contents('php://input');
    $input_data = json_decode($json_data, true);
    // Verificar si json_decode falló
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Loggear el error y los datos recibidos
        error_log("Error al decodificar JSON: " . json_last_error_msg() . " | Datos recibidos: " . $json_data);
        // No podemos usar responderJson si el header ya podría estar enviado por el error, pero intentamos
        http_response_code(400); // Bad Request
        echo json_encode(['success' => false, 'message' => 'Error en el formato JSON recibido.']);
        exit;
    }
}
// Si no es AJAX JSON, usar $_POST
elseif (!empty($_POST)) {
    $input_data = $_POST;
}
// Si no hay datos ni por JSON ni por POST, podría ser un GET u otra cosa
else {
    // Manejar caso sin datos si es necesario, por ahora asumimos POST o JSON
}


// Función para enviar respuesta JSON y salir
function responderJson($data, $http_code = 200) {
    // Asegurarse de que no se haya enviado salida antes
    if (!headers_sent()) {
        http_response_code($http_code);
        header('Content-Type: application/json; charset=utf-8');
    } else {
        // Loggear si los headers ya fueron enviados
        error_log("Advertencia: Headers ya enviados al intentar responder JSON.");
    }
    echo json_encode($data);
    exit;
}

// Función para redirigir y salir (para peticiones no-AJAX)
function redirigir($url) {
    if (!headers_sent()) {
        header('Location: ' . $url);
    } else {
        // Loggear si los headers ya fueron enviados
        error_log("Advertencia: Headers ya enviados al intentar redirigir a " . $url);
        // Como fallback, podríamos intentar una redirección JS, aunque no es ideal
        echo "<script>window.location.href='" . addslashes($url) . "';</script>";
    }
    exit;
}
// --- FIN: Manejo de Peticiones y Datos de Entrada ---


// Establecer conexión a la base de datos DESPUÉS de definir funciones
$conexion = conectarDB();
// Verificar conexión después de obtenerla
if (!$conexion) {
     $error_msg = "Error crítico: No se pudo conectar a la base de datos.";
     error_log($error_msg); // Loggear el error
     if ($is_ajax) {
         responderJson(['success' => false, 'message' => $error_msg], 500);
     } else {
         // Mostrar un mensaje genérico o redirigir a una página de error
         die($error_msg); // O redirigir('error_db.php');
     }
}


// Verificar que se recibió una acción
if (!isset($input_data['accion'])) {
    $error_msg = 'Acción no especificada';
    if ($is_ajax) {
        responderJson(['success' => false, 'message' => $error_msg], 400);
    } else {
        redirigir('index.php?error=no_accion');
    }
}

// Procesar según la acción solicitada
$accion = $input_data['accion'];

// --- INICIO: Bloques de Acciones Refactorizados ---

// Agregar un mantenimiento (Puede ser AJAX o normal)
if ($accion === 'agregar_mantenimiento') {
    // Validar datos
    if (empty($input_data['cuarto_id']) || !isset($input_data['descripcion']) || empty($input_data['tipo'])) {
        $error_msg = 'Datos incompletos para agregar mantenimiento';
        if ($is_ajax) responderJson(['success' => false, 'message' => $error_msg], 400);
        else redirigir('index.php?error=datos_incompletos');
    }

    // Sanitizar datos
    $cuarto_id = (int)$input_data['cuarto_id'];
    $descripcion = sanitizar($conexion, $input_data['descripcion']);
    $tipo = sanitizar($conexion, $input_data['tipo']);
    $hora = null;
    $dia_alerta = null; // NUEVO

    if (empty($descripcion)) {
        $error_msg = 'La descripción no puede estar vacía.';
        if ($is_ajax) responderJson(['success' => false, 'message' => $error_msg], 400);
        else redirigir('index.php?error=descripcion_vacia');
    }

    if ($tipo === 'rutina') { // La lógica interna sigue usando 'rutina'
        if (empty($input_data['hora'])) {
            $error_msg = 'Hora obligatoria para alerta'; // Cambiado
            if ($is_ajax) responderJson(['success' => false, 'message' => $error_msg], 400);
            else redirigir('index.php?error=hora_obligatoria'); // Clave de error no cambia
        }
        $hora = sanitizar($conexion, $input_data['hora']);

        // Validar día (obligatorio) - NUEVO
        if (empty($input_data['dia_alerta'])) {
            $error_msg = 'Día obligatorio para alerta';
            if ($is_ajax) responderJson(['success' => false, 'message' => $error_msg], 400);
            else redirigir('index.php?error=dia_obligatorio'); // Nuevo error
        }
        // Validar formato de fecha YYYY-MM-DD
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $input_data['dia_alerta'])) {
             $error_msg = 'Formato de día inválido (usar AAAA-MM-DD)';
             if ($is_ajax) responderJson(['success' => false, 'message' => $error_msg], 400);
             else redirigir('index.php?error=dia_formato_invalido'); // Nuevo error
        }
        $dia_alerta = sanitizar($conexion, $input_data['dia_alerta']);
    }

    // Insertar nuevo mantenimiento
    // Añadir dia_alerta a la consulta
    $query = "INSERT INTO mantenimientos (cuarto_id, descripcion, tipo, hora, dia_alerta) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conexion->prepare($query);
    if ($stmt === false) {
        error_log("Error al preparar (agregar_mantenimiento): " . $conexion->error);
        $error_msg = 'Error interno del servidor.';
        if ($is_ajax) responderJson(['success' => false, 'message' => $error_msg], 500);
        else redirigir('index.php?error=error_sql');
    }

    $hora_param = ($tipo === 'rutina' && !empty($hora)) ? $hora : null;
    $dia_param = ($tipo === 'rutina' && !empty($dia_alerta)) ? $dia_alerta : null; // NUEVO
    // Ajustar bind_param: issss (integer, string, string, string, string)
    $stmt->bind_param("issss", $cuarto_id, $descripcion, $tipo, $hora_param, $dia_param);

    if ($stmt->execute()) {
        $nuevo_id = $stmt->insert_id; // Obtener ID del nuevo registro
        $stmt->close();
        // Devolver más datos si es AJAX para actualizar UI
        if ($is_ajax) {
             // Podríamos consultar el registro recién insertado para devolverlo completo
             responderJson([
                 'success' => true,
                 'message' => 'Mantenimiento agregado',
                 'id' => $nuevo_id,
                 // Añadir más datos si son necesarios para la UI
             ]);
        } else {
            redirigir('index.php?mensaje=mantenimiento_agregado&id=' . $nuevo_id); // Pasar ID si se quiere resaltar
        }
    } else {
        error_log("Error al ejecutar (agregar_mantenimiento): " . $stmt->error);
        $stmt->close();
        $error_msg = 'Error de base de datos al agregar.';
        if ($is_ajax) responderJson(['success' => false, 'message' => $error_msg], 500);
        else redirigir('index.php?error=error_sql');
    }
}

// Editar un mantenimiento (AJAX Inline)
elseif ($accion === 'editar_mantenimiento_inline') {
    // Asegurarse de que sea AJAX
    if (!$is_ajax) {
        redirigir('index.php?error=metodo_invalido');
    }

    // Validar datos recibidos (desde $input_data)
    if (empty($input_data['mantenimiento_id']) || empty($input_data['cuarto_id']) || !isset($input_data['descripcion']) || empty($input_data['tipo'])) {
         responderJson(['success' => false, 'message' => 'Datos incompletos para editar'], 400);
    }

    // Sanitizar datos
    $id = (int)$input_data['mantenimiento_id'];
    $cuarto_id = (int)$input_data['cuarto_id'];
    $descripcion = sanitizar($conexion, $input_data['descripcion']);
    $tipo = sanitizar($conexion, $input_data['tipo']);
    $hora = null;
    $dia_alerta = null; // NUEVO

    // Validar descripción no vacía después de sanitizar
    if (empty($descripcion)) {
        responderJson(['success' => false, 'message' => 'La descripción no puede estar vacía'], 400);
    }

    // Para rutinas, validar y sanitizar hora
    if ($tipo === 'rutina') { // Lógica interna usa 'rutina'
        if (!isset($input_data['hora'])) { // Permitir hora vacía si se envía explícitamente null? No, la hora es obligatoria.
             responderJson(['success' => false, 'message' => 'Falta el campo hora para la alerta'], 400); // Cambiado
        }
        if (empty($input_data['hora'])) {
             responderJson(['success' => false, 'message' => 'Hora obligatoria para alerta'], 400); // Cambiado
        }
        // Validar formato de hora si es necesario antes de sanitizar
        $hora = sanitizar($conexion, $input_data['hora']);

        // Validar y sanitizar día - NUEVO
        if (!isset($input_data['dia_alerta']) || empty($input_data['dia_alerta'])) {
             responderJson(['success' => false, 'message' => 'Día obligatorio para alerta'], 400);
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $input_data['dia_alerta'])) {
             responderJson(['success' => false, 'message' => 'Formato de día inválido (usar AAAA-MM-DD)'], 400);
        }
        $dia_alerta = sanitizar($conexion, $input_data['dia_alerta']);
    }

    // Actualizar mantenimiento
    // Añadir dia_alerta a la consulta
    $query = "UPDATE mantenimientos SET descripcion = ?, tipo = ?, hora = ?, dia_alerta = ? WHERE id = ? AND cuarto_id = ?";
    $stmt = $conexion->prepare($query);

    if ($stmt === false) {
        error_log("Error al preparar (editar_mantenimiento_inline): " . $conexion->error);
        responderJson(['success' => false, 'message' => 'Error interno del servidor al preparar la consulta.'], 500);
    }

    $hora_param = ($tipo === 'rutina' && !empty($hora)) ? $hora : null;
    $dia_param = ($tipo === 'rutina' && !empty($dia_alerta)) ? $dia_alerta : null; // NUEVO
    // Ajustar bind_param: ssssii (string, string, string, string, integer, integer)
    $stmt->bind_param("ssssii", $descripcion, $tipo, $hora_param, $dia_param, $id, $cuarto_id);

    if ($stmt->execute()) {
        $affected_rows = $stmt->affected_rows;
        $stmt_error = $stmt->error;
        $stmt->close(); // Cerrar antes de responder

        if ($affected_rows > 0) {
            responderJson(['success' => true, 'message' => 'Mantenimiento actualizado']);
        } else {
            if ($stmt_error) {
                 error_log("Error al ejecutar (editar_mantenimiento_inline): " . $stmt_error);
                 responderJson(['success' => false, 'message' => 'Error de base de datos al actualizar.'], 500);
            } else {
                 // Podría ser que no se encontró el registro o no hubo cambios reales
                 // Para diferenciar, podríamos hacer un SELECT previo, pero por ahora es aceptable
                 responderJson(['success' => true, 'message' => 'No hubo cambios o el registro no se modificó.']); // Considerar success true si no hubo error
            }
        }
    } else {
        $stmt_error = $stmt->error;
        $stmt->close(); // Cerrar antes de responder
        error_log("Error al ejecutar (editar_mantenimiento_inline): " . $stmt_error);
        responderJson(['success' => false, 'message' => 'Error de base de datos al ejecutar la actualización.'], 500);
    }
}

// Eliminar un mantenimiento (AJAX Inline)
elseif ($accion === 'eliminar_mantenimiento_inline') {
     // Asegurarse de que sea AJAX
    if (!$is_ajax) {
        redirigir('index.php?error=metodo_invalido');
    }

    // Validar datos
    if (empty($input_data['mantenimiento_id']) || empty($input_data['cuarto_id'])) {
         responderJson(['success' => false, 'message' => 'Datos incompletos para eliminar'], 400);
    }

    $id = (int)$input_data['mantenimiento_id'];
    $cuarto_id = (int)$input_data['cuarto_id']; // Útil para verificar o devolver info

    // Eliminar el mantenimiento
    $query = "DELETE FROM mantenimientos WHERE id = ?";
    $stmt = $conexion->prepare($query);

    if ($stmt === false) {
        error_log("Error al preparar (eliminar_mantenimiento_inline): " . $conexion->error);
        responderJson(['success' => false, 'message' => 'Error interno del servidor al preparar la consulta.'], 500);
    }

    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        $affected_rows = $stmt->affected_rows;
        $stmt_error = $stmt->error;
        $stmt->close(); // Cerrar antes de responder

         if ($affected_rows > 0) {
            responderJson(['success' => true, 'message' => 'Mantenimiento eliminado']);
        } else {
            if ($stmt_error) {
                 error_log("Error al ejecutar (eliminar_mantenimiento_inline): " . $stmt_error);
                 responderJson(['success' => false, 'message' => 'Error de base de datos al eliminar.'], 500);
            } else {
                responderJson(['success' => false, 'message' => 'Mantenimiento no encontrado para eliminar.'], 404); // Not Found
            }
        }
    } else {
        $stmt_error = $stmt->error;
        $stmt->close(); // Cerrar antes de responder
        error_log("Error al ejecutar (eliminar_mantenimiento_inline): " . $stmt_error);
        responderJson(['success' => false, 'message' => 'Error de base de datos al ejecutar la eliminación.'], 500);
    }
}

// --- FIN: Bloques de Acciones Refactorizados ---

// --- INICIO: Mantener otras acciones (Edificios, Cuartos) ---
// Adaptar estos bloques de forma similar si se necesita que soporten AJAX,
// por ahora se dejan con la lógica original de redirección (asumiendo que no son AJAX).

elseif ($accion === 'agregar_edificio') {
    // ... lógica original con header() ...
    if ($stmt->execute()) redirigir('index.php?mensaje=edificio_agregado');
    else redirigir('index.php?error=error_sql');
}
elseif ($accion === 'editar_edificio') {
    // ... lógica original con header() ...
    if ($stmt->execute()) redirigir('index.php?mensaje=edificio_actualizado');
    else redirigir('index.php?error=error_sql');
}
elseif ($accion === 'eliminar_edificio') {
    // ... lógica original con header() ...
    if ($stmt->execute()) redirigir('index.php?mensaje=edificio_eliminado');
    else redirigir('index.php?error=error_sql');
}
elseif ($accion === 'agregar_cuarto') {
    // ... lógica original con header() ...
    if ($stmt->execute()) redirigir('index.php?mensaje=cuarto_agregado');
    else redirigir('index.php?error=error_sql');
}
elseif ($accion === 'editar_cuarto') {
    // ... lógica original con header() ...
    if ($stmt->execute()) redirigir('index.php?mensaje=cuarto_actualizado');
    else redirigir('index.php?error=error_sql');
}
elseif ($accion === 'eliminar_cuarto') {
    // ... lógica original con header() ...
    if ($stmt->execute()) redirigir('index.php?mensaje=cuarto_eliminado');
    else redirigir('index.php?error=error_sql');
}

// --- FIN: Mantener otras acciones ---


// Si llegamos aquí, la acción no es reconocida
else {
    $error_msg = 'Acción desconocida: ' . htmlspecialchars($accion);
    error_log($error_msg); // Loggear la acción desconocida
    if ($is_ajax) {
        responderJson(['success' => false, 'message' => $error_msg], 400);
    } else {
        redirigir('index.php?error=accion_desconocida');
    }
}

// Cerrar conexión al final del script si sigue abierta y no se cerró antes
if ($conexion && $conexion->ping()) {
    $conexion->close();
}
?>