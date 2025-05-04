<?php
// Iniciar sesión si es necesario para control de acceso
session_start();

// Incluir la configuración de la base de datos
include 'db/config.php';

// Establecer conexión a la base de datos
$conexion = conectarDB();

// Obtener lista de edificios para el selector
$queryEdificios = "SELECT id, nombre FROM edificios ORDER BY id ASC";
$resultadoEdificios = $conexion->query($queryEdificios);
$edificios = [];
while ($edificio = $resultadoEdificios->fetch_assoc()) {
    $edificios[] = $edificio;
}

// Cerrar la conexión (la abriremos de nuevo cuando sea necesario)
$conexion->close();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Registro de Mantenimiento - JW Marriott</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    
    <!-- Favicon para navegadores -->
    <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="icons/icon-512x512.png">
    <link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="icons/favicon-16x16.png">
    <link rel="shortcut icon" href="icons/favicon.ico">
    
    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" sizes="192x192" href="icons/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">
    <link rel="mask-icon" href="icons/safari-pinned-tab.svg" color="#3498db">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json" crossorigin="use-credentials">
    <meta name="theme-color" content="#3498db">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="JWM Mant.">
    <meta name="application-name" content="JWM Mant.">
</head>
<body>
    <header>
        <div class="logo logo-high">
            <img src="logo_high.png" alt="Logo grande del Hotel">
        </div>
        <div class="logo logo-low">
            <img src="logo_low.png" alt="Logo pequeño del Hotel">
        </div>
    </header>
    
    <div class="contenedor">
        <h1 class="titulos t-principal">Registro de Mantenimiento Habitaciones</h1>
        <h1 class="titulos t-secundario">Gerencia de Mantenimiento</h1>

        <!-- Estructura de vista duo -->
        <div class="vista-duo">
            <!-- Columna izquierda (3/4) - Lista de cuartos -->
            <div class="columna columna-principal">
                <!-- Panel de búsqueda y filtros -->
                <div class="panel panel-filtros">
                    <div class="busqueda-filtros">
                        <div class="campo-busqueda">
                            <i class="icono-busqueda">🔍</i>
                            <input type="text" id="buscarCuarto" placeholder="Buscar cuarto...">
                        </div>
                        <div class="campo-busqueda">
                            <i class="icono-busqueda">🔧</i>
                            <input type="text" id="buscarAveria" placeholder="Buscar por avería...">
                        </div>
                        <div class="select-container">
                            <select id="filtroEdificio" name="edificio">
                                <option value="">Todos los edificios</option>
                                <?php foreach($edificios as $edificio): ?>
                                <option value="<?php echo $edificio['id']; ?>">
                                    <?php echo htmlspecialchars($edificio['nombre']); ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                            <i class="icono-select">▼</i>
                        </div>
                    </div>
                </div>
                
                <ul class="lista-cuartos" id="listaCuartos">
                    <?php
                    // Volver a abrir la conexión para obtener TODOS los cuartos
                    $conexion = conectarDB();
                    
                    // Consulta para obtener TODOS los cuartos con información del edificio
                    $queryCuartos = "SELECT c.id, c.nombre, c.descripcion, e.nombre as edificio, e.id as edificio_id, 
                                    (SELECT COUNT(*) FROM mantenimientos WHERE cuarto_id = c.id) as num_mantenimientos 
                                    FROM cuartos c 
                                    JOIN edificios e ON c.edificio_id = e.id
                                    ORDER BY e.nombre, c.nombre"; // Ordenar sigue siendo útil
                    
                    // Ya no se aplican filtros WHERE aquí
                    $resultadoCuartos = $conexion->query($queryCuartos);
                    
                    // Verificar si hay cuartos para mostrar inicialmente
                    if($resultadoCuartos->num_rows === 0) {
                        echo '<li class="mensaje-no-cuartos">No hay cuartos registrados en el sistema.</li>';
                    } else {
                        while ($cuarto = $resultadoCuartos->fetch_assoc()) {
                    ?>
                    <!-- Añadir atributos data-* y clase para lazy load -->
                    <li class="cuarto cuarto-lazy" id="cuarto-<?php echo $cuarto['id']; ?>"
                        data-nombre="<?php echo htmlspecialchars(strtolower($cuarto['nombre'])); ?>"
                        data-edificio-nombre="<?php echo htmlspecialchars(strtolower($cuarto['edificio'])); ?>"
                        data-edificio-id="<?php echo $cuarto['edificio_id']; ?>">
                        <h2><?php echo htmlspecialchars($cuarto['nombre']); ?></h2>
                        <p class="edificio-cuarto">Edificio: <?php echo htmlspecialchars($cuarto['edificio']); ?></p>
                        <?php if(!empty($cuarto['descripcion'])): ?>
                            <p><?php echo htmlspecialchars($cuarto['descripcion']); ?></p>
                        <?php endif; ?>
                        <p>Número de averías: <span id="contador-mantenimientos-<?php echo $cuarto['id']; ?>"><?php echo $cuarto['num_mantenimientos']; ?></span></p>

                        <button class="boton-toggle-mantenimientos" onclick="toggleMantenimientos(<?php echo $cuarto['id']; ?>, this)">Mostrar Mantenimientos</button>

                        <!-- Lista de mantenimientos para este cuarto -->
                        <ul class="lista-mantenimientos" id="mantenimientos-<?php echo $cuarto['id']; ?>" style="display: none;">
                            <?php
                            $idCuarto = $cuarto['id'];
                            // Añadir dia_alerta a la consulta
                            $queryMantenimientos = "SELECT id, descripcion, tipo, hora, dia_alerta, fecha_registro
                                                   FROM mantenimientos
                                                   WHERE cuarto_id = $idCuarto
                                                   ORDER BY fecha_registro DESC";
                            $resultadoMantenimientos = $conexion->query($queryMantenimientos);

                            if($resultadoMantenimientos->num_rows === 0) {
                                echo '<li class="mensaje-no-mantenimientos">No hay mantenimientos registrados para este cuarto.</li>';
                            } else {
                                while ($mantenimiento = $resultadoMantenimientos->fetch_assoc()) {
                                    $claseMantenimiento = $mantenimiento['tipo'] === 'rutina' ? 'mantenimiento mantenimiento-alerta' : 'mantenimiento';
                                    $horaFormato = !empty($mantenimiento['hora']) ? (new DateTime($mantenimiento['hora']))->format('H:i') : '';
                                    $diaAlertaFormato = !empty($mantenimiento['dia_alerta']) ? $mantenimiento['dia_alerta'] : ''; // YYYY-MM-DD
                                    ?>
                                    <li class="<?php echo $claseMantenimiento; ?>" id="mantenimiento-<?php echo $mantenimiento['id']; ?>"
                                        data-id="<?php echo $mantenimiento['id']; ?>"
                                        data-cuarto-id="<?php echo $cuarto['id']; ?>"
                                        data-tipo="<?php echo $mantenimiento['tipo']; ?>"
                                        data-hora="<?php echo $horaFormato; ?>"
                                        data-dia="<?php echo $diaAlertaFormato; ?>"
                                        data-descripcion="<?php echo htmlspecialchars($mantenimiento['descripcion']); ?>">

                                        <div class="vista-mantenimiento">
                                            <span class="mantenimiento-descripcion">
                                                <?php echo htmlspecialchars($mantenimiento['descripcion']); ?>
                                                <?php if($mantenimiento['tipo'] === 'rutina' && (!empty($mantenimiento['hora']) || !empty($mantenimiento['dia_alerta']))): ?>
                                                    <span class="tiempo-rutina"> <!-- Contenedor para fecha y hora -->
                                                        <?php if (!empty($mantenimiento['dia_alerta'])) echo (new DateTime($mantenimiento['dia_alerta']))->format('d/m/Y') . ' '; ?>
                                                        <?php if (!empty($mantenimiento['hora'])) echo (new DateTime($mantenimiento['hora']))->format('h:i A'); ?>
                                                    </span>
                                                <?php endif; ?>
                                                <span class="tiempo-registro">
                                                    Registrado: <?php echo (new DateTime($mantenimiento['fecha_registro']))->format('d/m/Y h:i A'); ?>
                                                </span>
                                            </span>
                                            <div class="acciones-mantenimiento">
                                                <button class="boton-accion-inline editar" onclick="mostrarEdicionInline(<?php echo $mantenimiento['id']; ?>)" title="Editar">✏️</button>
                                                <button class="boton-accion-inline eliminar" onclick="eliminarMantenimientoInline(<?php echo $mantenimiento['id']; ?>, <?php echo $cuarto['id']; ?>)" title="Eliminar">🗑️</button>
                                            </div>
                                        </div>

                                        <div class="edicion-inline-mantenimiento" style="display: none;">
                                            <input type="text" class="input-editar-descripcion" value="<?php echo htmlspecialchars($mantenimiento['descripcion']); ?>" placeholder="Descripción">
                                            <?php if ($mantenimiento['tipo'] === 'rutina'): ?>
                                                <input type="date" class="input-editar-dia" value="<?php echo $diaAlertaFormato; ?>">
                                                <input type="time" class="input-editar-hora" value="<?php echo $horaFormato; ?>">
                                            <?php endif; ?>
                                            <div class="botones-edicion-inline">
                                                <button class="boton-guardar-inline" onclick="guardarMantenimientoInline(<?php echo $mantenimiento['id']; ?>)">Guardar</button>
                                                <button class="boton-cancelar-inline" onclick="ocultarEdicionInline(<?php echo $mantenimiento['id']; ?>)">Cancelar</button>
                                            </div>
                                        </div>
                                    </li>
                                <?php
                                }
                            }
                            ?>
                        </ul>
                    </li>
                    <?php
                        }
                    }
                    // Cerrar la conexión
                    $conexion->close();
                    ?>
                </ul>
                <!-- Mensaje para cuando no hay resultados de búsqueda/filtro -->
                <div id="mensajeNoResultados" class="mensaje-no-cuartos" style="display: none; margin-top: 20px;">
                    No se encontraron cuartos que coincidan con los criterios de búsqueda o filtro.
                </div>
            </div>

            <!-- Columna derecha (1/4) - Formulario para agregar mantenimientos -->
            <div class="columna columna-lateral">
                <!-- Panel para registrar nuevo mantenimiento -->
                <div class="panel formulario-mantenimiento-lateral">
                    <h2>Registrar Mantenimiento</h2>
                    <form id="formAgregarMantenimientoLateral" action="procesar.php" method="POST">
                        <input type="hidden" name="accion" value="agregar_mantenimiento">

                        <div class="select-container" style="margin-bottom: 15px;">
                            <select id="cuartoMantenimientoLateral" name="cuarto_id" required>
                                <option value="">-- Seleccionar Cuarto --</option>
                                <?php
                                // Volver a abrir conexión para obtener todos los cuartos
                                $conexion = conectarDB();
                                $queryTodosCuartos = "SELECT c.id, c.nombre, e.nombre as edificio_nombre 
                                                      FROM cuartos c 
                                                      JOIN edificios e ON c.edificio_id = e.id 
                                                      ORDER BY e.nombre, c.nombre ASC";
                                $resultadoTodosCuartos = $conexion->query($queryTodosCuartos);

                                $edificioActual = null;
                                while ($cuarto = $resultadoTodosCuartos->fetch_assoc()) {
                                    if ($edificioActual !== $cuarto['edificio_nombre']) {
                                        if ($edificioActual !== null) {
                                            echo '</optgroup>';
                                        }
                                        $edificioActual = $cuarto['edificio_nombre'];
                                        echo '<optgroup label="' . htmlspecialchars($edificioActual) . '">';
                                    }
                                    echo '<option value="' . $cuarto['id'] . '">' . htmlspecialchars($cuarto['nombre']) . '</option>';
                                }
                                if ($edificioActual !== null) {
                                    echo '</optgroup>';
                                }
                                $conexion->close();
                                ?>
                            </select>
                            <i class="icono-select">▼</i>
                        </div>

                        <!-- Reemplazo de Radio Buttons por Switch -->
                        <div class="switch-container" style="margin-bottom: 15px; display: flex; align-items: center;">
                            <label for="tipoMantenimientoSwitchLateral" class="switch-label-container">
                                <div class="switch">
                                    <input type="checkbox" id="tipoMantenimientoSwitchLateral" onchange="handleTipoSwitchChange(this)">
                                    <span class="slider round"></span>
                                </div>
                                <span id="switchLabelLateral" style="font-weight: bold;">Normal</span>
                            </label>
                            <!-- Campo oculto para enviar el valor 'normal' o 'rutina' -->
                            <input type="hidden" name="tipo" id="tipoHiddenLateral" value="normal"> <!-- El valor sigue siendo 'rutina' -->
                        </div>
                        <!-- Fin del reemplazo -->

                        <div class="input-flotante">
                            <input type="text" id="descripcionMantenimientoLateral" name="descripcion" placeholder=" " required>
                            <label for="descripcionMantenimientoLateral">Descripción</label>
                        </div>

                        <div class="input-flotante" id="horaRutinaLateralContainer" style="display: none; margin-top: 15px;">
                            <input type="time" id="horaRutinaLateral" name="hora" placeholder=" ">
                            <label for="horaRutinaLateral">Hora de la Alerta</label> <!-- Cambiado -->
                        </div>

                        <!-- NUEVO: Campo para Día de la Alerta -->
                        <div class="input-flotante" id="diaAlertaLateralContainer" style="display: none; margin-top: 15px;">
                            <input type="date" id="diaAlertaLateral" name="dia_alerta" placeholder=" ">
                            <label for="diaAlertaLateral">Día de la Alerta</label>
                        </div>
                        <!-- FIN NUEVO -->

                        <button type="submit" id="btnRegistrarMantenimiento" style="margin-top: 15px;">Registrar</button>
                    </form>
                </div>

                <!-- INICIO: Nuevo Panel de Vista Rápida de Alertas -->
                <div class="panel panel-vista-rutinas"> <!-- Mantenemos clase CSS -->
                    <h2>Alertas</h2> <!-- Cambiado -->
                    <ul class="lista-vista-rutinas"> <!-- Mantenemos clase CSS -->
                        <?php
                        $conexion = conectarDB();
                        // Añadir dia_alerta a la consulta
                        $queryRutinas = "SELECT m.id, m.descripcion, m.hora, m.dia_alerta, m.cuarto_id,
                                         c.nombre as cuarto_nombre, e.nombre as edificio_nombre
                                         FROM mantenimientos m
                                         JOIN cuartos c ON m.cuarto_id = c.id
                                         JOIN edificios e ON c.edificio_id = e.id
                                         WHERE m.tipo = 'rutina'
                                         ORDER BY m.dia_alerta ASC, m.hora ASC, e.nombre ASC, c.nombre ASC"; // Ordenar también por día
                        $resultadoRutinas = $conexion->query($queryRutinas);

                        if ($resultadoRutinas->num_rows === 0) {
                            echo '<li class="mensaje-no-rutinas">No hay alertas programadas.</li>'; // Cambiado
                        } else {
                            while ($rutina = $resultadoRutinas->fetch_assoc()) {
                                ?>
                                <li class="rutina-item" id="rutina-<?php echo $rutina['id']; ?>"
                                    data-hora-raw="<?php echo !empty($rutina['hora']) ? (new DateTime($rutina['hora']))->format('H:i') : ''; ?>"
                                    data-dia-raw="<?php echo $rutina['dia_alerta']; ?>"
                                    data-cuarto-id="<?php echo $rutina['cuarto_id']; ?>"
                                    data-descripcion="<?php echo htmlspecialchars($rutina['descripcion']); ?>"
                                    data-cuarto-nombre="<?php echo htmlspecialchars($rutina['cuarto_nombre']); ?>">
                                    <span class="rutina-hora">
                                        <?php
                                        if (!empty($rutina['dia_alerta'])) {
                                            echo (new DateTime($rutina['dia_alerta']))->format('d/m'); // Formato corto día/mes
                                        } else {
                                            echo '??/??'; // Indicar si no hay día
                                        }
                                        echo ' '; // Espacio
                                        if (!empty($rutina['hora'])) {
                                            echo (new DateTime($rutina['hora']))->format('h:iA');
                                        } else {
                                            echo '--:--';
                                        }
                                        ?>
                                    </span>
                                    <span class="rutina-info">
                                        <span class="rutina-cuarto" title="<?php echo htmlspecialchars($rutina['edificio_nombre']); ?>">
                                            <?php echo htmlspecialchars($rutina['cuarto_nombre']); ?>
                                        </span>
                                        <span class="rutina-descripcion">
                                            <?php echo htmlspecialchars($rutina['descripcion']); ?>
                                        </span>
                                    </span>
                                    <!-- Opcional: Botón para ir al cuarto o editar la alerta -->
                                    <button class="boton-ir-rutina" onclick="scrollToCuarto(<?php echo $rutina['cuarto_id']; ?>)" title="Ver detalles">&#10148;</button> <!-- Mantenemos clase CSS -->
                                </li>
                                <?php
                            }
                        }
                        $conexion->close();
                        ?>
                    </ul>
                </div>
                <!-- FIN: Nuevo Panel de Vista Rápida de Alertas -->

                <!-- INICIO: Panel de Mantenimientos Recientes -->
                <div class="panel panel-vista-recientes">
                    <h2>Mantenimientos Recientes</h2>
                    <ul class="lista-vista-recientes">
                        <?php
                        $conexion = conectarDB();
                        // Añadir dia_alerta a la consulta
                        $queryRecientes = "SELECT m.id, m.descripcion, m.tipo, m.hora, m.dia_alerta, m.cuarto_id, m.fecha_registro,
                                            c.nombre as cuarto_nombre, e.nombre as edificio_nombre
                                            FROM mantenimientos m
                                            JOIN cuartos c ON m.cuarto_id = c.id
                                            JOIN edificios e ON c.edificio_id = e.id
                                            ORDER BY m.fecha_registro DESC
                                            LIMIT 10";
                        $resultadoRecientes = $conexion->query($queryRecientes);

                        if ($resultadoRecientes->num_rows === 0) {
                            echo '<li class="mensaje-no-recientes">No hay mantenimientos recientes.</li>';
                        } else {
                            while ($mnt = $resultadoRecientes->fetch_assoc()) {
                                ?>
                                <li class="reciente-item" id="reciente-<?php echo $mnt['id']; ?>">
                                    <span class="reciente-tipo <?php echo $mnt['tipo'] === 'rutina' ? 'reciente-tipo-rutina' : 'reciente-tipo-normal'; ?>"> <!-- Mantenemos clases CSS -->
                                        <?php echo $mnt['tipo'] === 'rutina' ? 'Alerta' : 'Avería'; ?> <!-- Cambiado de "Normal" a "Avería" -->
                                    </span>
                                    <span class="reciente-info">
                                        <span class="reciente-cuarto" title="<?php echo htmlspecialchars($mnt['edificio_nombre']); ?>">
                                            <?php echo htmlspecialchars($mnt['cuarto_nombre']); ?>
                                        </span>
                                        <span class="reciente-descripcion">
                                            <?php echo htmlspecialchars($mnt['descripcion']); ?>
                                        </span>
                                        <?php if ($mnt['tipo'] === 'rutina' && (!empty($mnt['hora']) || !empty($mnt['dia_alerta']))): ?>
                                            <span class="reciente-hora"> <!-- Ahora contendrá día y hora -->
                                                <?php if (!empty($mnt['dia_alerta'])) echo (new DateTime($mnt['dia_alerta']))->format('d/m/Y') . ' '; ?>
                                                <?php if (!empty($mnt['hora'])) echo (new DateTime($mnt['hora']))->format('h:i A'); ?>
                                            </span>
                                        <?php endif; ?>
                                        <span class="reciente-fecha">
                                            <?php
                                            $fecha = new DateTime($mnt['fecha_registro']);
                                            echo $fecha->format('d/m/Y H:i');
                                            ?>
                                        </span>
                                    </span>
                                    <button class="boton-ir-rutina" onclick="scrollToCuarto(<?php echo $mnt['cuarto_id']; ?>)" title="Ir al cuarto">&#10148;</button> <!-- Mantenemos clase CSS -->
                                </li>
                                <?php
                            }
                        }
                        $conexion->close();
                        ?>
                    </ul>
                </div>
                <!-- FIN: Panel de Mantenimientos Recientes -->

                <!-- INICIO: Nuevo Panel de Alertas Emitidas -->
                <div class="panel panel-alertas-emitidas">
                    <h2>Alertas Emitidas Hoy</h2>
                    <ul class="lista-alertas-emitidas" id="listaAlertasEmitidas">
                        <!-- Las alertas emitidas se cargarán aquí por JavaScript -->
                    </ul>
                    <p id="mensaje-no-alertas-emitidas" class="mensaje-no-items" style="display: none; text-align: center; margin-top: 10px; font-style: italic; color: #888;">
                        No hay alertas emitidas por revisar hoy.
                    </p>
                </div>
                <!-- FIN: Nuevo Panel de Alertas Emitidas -->

            </div>
        </div>
    </div>

    <script src="script.js"></script>
    <script src="script_index.js"></script>
</body>
</html>