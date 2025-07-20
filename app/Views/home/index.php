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
            <?php if(empty($cuartos)): ?>
                <li class="mensaje-no-cuartos">No hay cuartos registrados en el sistema.</li>
            <?php else: ?>
                <?php foreach($cuartos as $cuarto): ?>
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
                            <!-- Los mantenimientos se cargarán dinámicamente -->
                        </ul>
                    </li>
                <?php endforeach; ?>
            <?php endif; ?>
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
            <form id="formAgregarMantenimientoLateral" action="/mantenimiento/create" method="POST">
                <div class="select-container" style="margin-bottom: 15px;">
                    <select id="cuartoMantenimientoLateral" name="cuarto_id" required>
                        <option value="">-- Seleccionar Cuarto --</option>
                        <?php 
                        $edificioActual = null;
                        foreach($cuartos as $cuarto):
                            if ($edificioActual !== $cuarto['edificio']):
                                if ($edificioActual !== null): ?>
                                    </optgroup>
                                <?php endif;
                                $edificioActual = $cuarto['edificio']; ?>
                                <optgroup label="<?php echo htmlspecialchars($edificioActual); ?>">
                            <?php endif; ?>
                            <option value="<?php echo $cuarto['id']; ?>"><?php echo htmlspecialchars($cuarto['nombre']); ?></option>
                        <?php endforeach;
                        if ($edificioActual !== null): ?>
                            </optgroup>
                        <?php endif; ?>
                    </select>
                    <i class="icono-select">▼</i>
                </div>

                <!-- Switch para tipo de mantenimiento -->
                <div class="switch-container" style="margin-bottom: 15px; display: flex; align-items: center;">
                    <label for="tipoMantenimientoSwitchLateral" class="switch-label-container">
                        <div class="switch">
                            <input type="checkbox" id="tipoMantenimientoSwitchLateral" onchange="handleTipoSwitchChange(this)">
                            <span class="slider round"></span>
                        </div>
                        <span id="switchLabelLateral" style="font-weight: bold;">Avería</span>
                    </label>
                    <input type="hidden" name="tipo" id="tipoHiddenLateral" value="normal">
                </div>

                <div class="input-flotante">
                    <input type="text" id="descripcionMantenimientoLateral" name="descripcion" placeholder=" " required>
                    <label for="descripcionMantenimientoLateral">Descripción</label>
                </div>

                <div class="input-flotante" id="horaRutinaLateralContainer" style="display: none; margin-top: 15px;">
                    <input type="time" id="horaRutinaLateral" name="hora" placeholder=" ">
                    <label for="horaRutinaLateral">Hora de la Alerta</label>
                </div>

                <div class="input-flotante" id="diaAlertaLateralContainer" style="display: none; margin-top: 15px;">
                    <input type="date" id="diaAlertaLateral" name="dia_alerta" placeholder=" ">
                    <label for="diaAlertaLateral">Día de la Alerta</label>
                </div>

                <button type="submit" id="btnRegistrarMantenimiento" style="margin-top: 15px;">Registrar</button>
            </form>
        </div>

        <!-- Panel de Vista Rápida de Alertas -->
        <div class="panel panel-vista-rutinas">
            <h2>Alertas</h2>
            <ul class="lista-vista-rutinas">
                <?php if(empty($alertas)): ?>
                    <li class="mensaje-no-rutinas">No hay alertas programadas.</li>
                <?php else: ?>
                    <?php foreach($alertas as $alerta): ?>
                        <li class="rutina-item" id="rutina-<?php echo $alerta['id']; ?>"
                            data-hora-raw="<?php echo $alerta['hora']; ?>"
                            data-dia-raw="<?php echo $alerta['dia']; ?>"
                            data-cuarto-id="<?php echo $alerta['cuarto_id']; ?>"
                            data-descripcion="<?php echo htmlspecialchars($alerta['descripcion']); ?>"
                            data-cuarto-nombre="<?php echo htmlspecialchars($alerta['cuarto_nombre']); ?>">
                            <span class="rutina-hora">
                                <?php 
                                if (!empty($alerta['dia'])) {
                                    echo (new DateTime($alerta['dia']))->format('d/m');
                                } else {
                                    echo '??/??';
                                }
                                echo ' ';
                                if (!empty($alerta['hora'])) {
                                    echo (new DateTime($alerta['hora']))->format('h:iA');
                                } else {
                                    echo '--:--';
                                }
                                ?>
                            </span>
                            <span class="rutina-info">
                                <span class="rutina-cuarto"><?php echo htmlspecialchars($alerta['cuarto_nombre']); ?></span>
                                <span class="rutina-descripcion"><?php echo htmlspecialchars($alerta['descripcion']); ?></span>
                            </span>
                            <button class="boton-ir-rutina" onclick="scrollToCuarto(<?php echo $alerta['cuarto_id']; ?>)" title="Ver detalles">&#10148;</button>
                        </li>
                    <?php endforeach; ?>
                <?php endif; ?>
            </ul>
        </div>

        <!-- Panel de Mantenimientos Recientes -->
        <div class="panel panel-vista-recientes">
            <h2>Mantenimientos Recientes</h2>
            <ul class="lista-vista-recientes">
                <?php if(empty($mantenimientosRecientes)): ?>
                    <li class="mensaje-no-recientes">No hay mantenimientos recientes.</li>
                <?php else: ?>
                    <?php foreach($mantenimientosRecientes as $mnt): ?>
                        <li class="reciente-item" id="reciente-<?php echo $mnt['id']; ?>">
                            <span class="reciente-tipo <?php echo $mnt['tipo'] === 'rutina' ? 'reciente-tipo-rutina' : 'reciente-tipo-normal'; ?>">
                                <?php echo $mnt['tipo'] === 'rutina' ? 'Alerta' : 'Avería'; ?>
                            </span>
                            <span class="reciente-info">
                                <span class="reciente-cuarto" title="<?php echo htmlspecialchars($mnt['edificio_nombre']); ?>">
                                    <?php echo htmlspecialchars($mnt['cuarto_nombre']); ?>
                                </span>
                                <span class="reciente-descripcion">
                                    <?php echo htmlspecialchars($mnt['descripcion']); ?>
                                </span>
                                <?php if ($mnt['tipo'] === 'rutina' && (!empty($mnt['hora']) || !empty($mnt['dia_alerta']))): ?>
                                    <span class="reciente-hora">
                                        <?php if (!empty($mnt['dia_alerta'])) echo (new DateTime($mnt['dia_alerta']))->format('d/m/Y') . ' '; ?>
                                        <?php if (!empty($mnt['hora'])) echo (new DateTime($mnt['hora']))->format('h:i A'); ?>
                                    </span>
                                <?php endif; ?>
                                <span class="reciente-fecha">
                                    <?php echo (new DateTime($mnt['fecha_registro']))->format('d/m/Y H:i'); ?>
                                </span>
                            </span>
                            <button class="boton-ir-rutina" onclick="scrollToCuarto(<?php echo $mnt['cuarto_id']; ?>)" title="Ir al cuarto">&#10148;</button>
                        </li>
                    <?php endforeach; ?>
                <?php endif; ?>
            </ul>
        </div>

        <!-- Panel de Alertas Emitidas -->
        <div class="panel panel-alertas-emitidas">
            <h2>Alertas Emitidas Hoy</h2>
            <ul class="lista-alertas-emitidas" id="listaAlertasEmitidas">
                <!-- Las alertas emitidas se cargarán dinámicamente -->
            </ul>
            <div id="mensaje-no-alertas-emitidas" class="mensaje-no-alertas-emitidas" style="display: block;">
                No hay alertas emitidas hoy.
            </div>
        </div>
    </div>
</div> 