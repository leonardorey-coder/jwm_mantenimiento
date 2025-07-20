<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Mantenimiento;
use App\Models\Cuarto;

/**
 * Controlador Mantenimiento
 * Maneja todas las operaciones CRUD de mantenimientos
 */
class MantenimientoController extends Controller
{
    private $mantenimientoModel;
    private $cuartoModel;

    public function __construct()
    {
        parent::__construct();
        $this->mantenimientoModel = new Mantenimiento();
        $this->cuartoModel = new Cuarto();
    }

    /**
     * Crear un nuevo mantenimiento
     */
    public function create()
    {
        try {
            $input = $this->getAllInput();

            // Validar datos requeridos
            $errors = $this->validate($input, [
                'cuarto_id' => 'required|numeric',
                'descripcion' => 'required|min:3|max:500',
                'tipo' => 'required'
            ]);

            if (!empty($errors)) {
                $this->handleError('Datos incompletos: ' . implode(', ', array_flatten($errors)));
                return;
            }

            // Sanitizar datos
            $data = $this->sanitize([
                'cuarto_id' => $input['cuarto_id'],
                'descripcion' => $input['descripcion'],
                'tipo' => $input['tipo']
            ]);

            // Validaciones específicas para alertas
            if ($data['tipo'] === 'rutina') {
                if (empty($input['hora']) || empty($input['dia_alerta'])) {
                    $this->handleError('La hora y el día son obligatorios para las alertas');
                    return;
                }
                
                $data['hora'] = $this->sanitize($input['hora']);
                $data['dia_alerta'] = $this->sanitize($input['dia_alerta']);

                // Verificar conflictos de horario
                $conflicto = $this->mantenimientoModel->checkConflictoHorario(
                    $data['cuarto_id'], 
                    $data['dia_alerta'], 
                    $data['hora']
                );

                if ($conflicto) {
                    $this->handleError('Ya existe una alerta programada para ese cuarto en la misma fecha y hora');
                    return;
                }
            }

            // Verificar que el cuarto existe
            if (!$this->cuartoModel->exists($data['cuarto_id'])) {
                $this->handleError('El cuarto especificado no existe');
                return;
            }

            // Crear mantenimiento
            $id = $this->mantenimientoModel->createMantenimiento($data);

            if ($id) {
                $mensaje = $data['tipo'] === 'rutina' ? 'Alerta creada exitosamente' : 'Avería registrada exitosamente';
                $this->handleSuccess($mensaje, ['id' => $id]);
            } else {
                $this->handleError('Error al crear el mantenimiento');
            }

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::create: " . $e->getMessage());
            $this->handleError('Error interno: ' . $e->getMessage());
        }
    }

    /**
     * Actualizar un mantenimiento
     */
    public function update()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $input = $this->getAllInput();

            // Validar datos requeridos
            if (empty($input['mantenimiento_id']) || empty($input['descripcion'])) {
                $this->json(['success' => false, 'message' => 'Datos incompletos'], 400);
                return;
            }

            $id = (int) $input['mantenimiento_id'];
            
            // Verificar que el mantenimiento existe
            $mantenimiento = $this->mantenimientoModel->find($id);
            if (!$mantenimiento) {
                $this->json(['success' => false, 'message' => 'Mantenimiento no encontrado'], 404);
                return;
            }

            // Sanitizar datos
            $data = $this->sanitize([
                'descripcion' => $input['descripcion']
            ]);

            // Si es rutina, validar y actualizar hora y día
            if ($mantenimiento['tipo'] === 'rutina') {
                if (empty($input['hora']) || empty($input['dia_alerta'])) {
                    $this->json(['success' => false, 'message' => 'La hora y el día son obligatorios para las alertas'], 400);
                    return;
                }

                $data['hora'] = $this->sanitize($input['hora']);
                $data['dia_alerta'] = $this->sanitize($input['dia_alerta']);

                // Verificar conflictos de horario (excluyendo el registro actual)
                $conflicto = $this->mantenimientoModel->checkConflictoHorario(
                    $mantenimiento['cuarto_id'], 
                    $data['dia_alerta'], 
                    $data['hora'],
                    $id
                );

                if ($conflicto) {
                    $this->json(['success' => false, 'message' => 'Ya existe una alerta programada para ese cuarto en la misma fecha y hora'], 409);
                    return;
                }
            }

            // Actualizar mantenimiento
            $updated = $this->mantenimientoModel->updateMantenimiento($id, $data);

            if ($updated) {
                $this->json([
                    'success' => true, 
                    'message' => 'Mantenimiento actualizado exitosamente',
                    'data' => array_merge($data, ['id' => $id])
                ]);
            } else {
                $this->json(['success' => false, 'message' => 'No se pudo actualizar el mantenimiento'], 500);
            }

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::update: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error interno: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Eliminar un mantenimiento
     */
    public function delete()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $input = $this->getAllInput();

            if (empty($input['mantenimiento_id'])) {
                $this->json(['success' => false, 'message' => 'ID de mantenimiento requerido'], 400);
                return;
            }

            $id = (int) $input['mantenimiento_id'];

            // Verificar que el mantenimiento existe
            if (!$this->mantenimientoModel->exists($id)) {
                $this->json(['success' => false, 'message' => 'Mantenimiento no encontrado'], 404);
                return;
            }

            // Eliminar mantenimiento
            $deleted = $this->mantenimientoModel->delete($id);

            if ($deleted) {
                $this->json([
                    'success' => true, 
                    'message' => 'Mantenimiento eliminado exitosamente'
                ]);
            } else {
                $this->json(['success' => false, 'message' => 'No se pudo eliminar el mantenimiento'], 500);
            }

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::delete: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error interno: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Obtener detalles de un mantenimiento
     */
    public function show()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $id = $this->input('id');

            if (!$id) {
                $this->json(['success' => false, 'message' => 'ID requerido'], 400);
                return;
            }

            $mantenimiento = $this->mantenimientoModel->getWithCuarto($id);

            if (!$mantenimiento) {
                $this->json(['success' => false, 'message' => 'Mantenimiento no encontrado'], 404);
                return;
            }

            $this->json([
                'success' => true,
                'mantenimiento' => $mantenimiento
            ]);

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::show: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error al obtener mantenimiento'], 500);
        }
    }

    /**
     * Obtener alertas programadas
     */
    public function getAlertas()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $alertas = $this->mantenimientoModel->getAlertas();

            $this->json([
                'success' => true,
                'alertas' => $alertas,
                'total' => count($alertas)
            ]);

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::getAlertas: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error al obtener alertas'], 500);
        }
    }

    /**
     * Obtener alertas de hoy
     */
    public function getAlertasHoy()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $alertas = $this->mantenimientoModel->getAlertasHoy();

            $this->json([
                'success' => true,
                'alertas' => $alertas,
                'total' => count($alertas)
            ]);

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::getAlertasHoy: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error al obtener alertas de hoy'], 500);
        }
    }

    /**
     * Obtener alertas vencidas
     */
    public function getAlertasVencidas()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $alertas = $this->mantenimientoModel->getAlertasVencidas();

            $this->json([
                'success' => true,
                'alertas' => $alertas,
                'total' => count($alertas)
            ]);

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::getAlertasVencidas: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error al obtener alertas vencidas'], 500);
        }
    }

    /**
     * Obtener mantenimientos recientes
     */
    public function getRecientes()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $limit = $this->input('limit', 50);
            $mantenimientos = $this->mantenimientoModel->getRecientes($limit);

            $this->json([
                'success' => true,
                'mantenimientos' => $mantenimientos,
                'total' => count($mantenimientos)
            ]);

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::getRecientes: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error al obtener mantenimientos recientes'], 500);
        }
    }

    /**
     * Buscar mantenimientos
     */
    public function search()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $searchTerm = $this->input('search', '');
            $tipo = $this->input('tipo', null);

            if (empty($searchTerm)) {
                $this->json(['success' => false, 'message' => 'Término de búsqueda requerido'], 400);
                return;
            }

            $mantenimientos = $this->mantenimientoModel->searchByDescripcion($searchTerm, $tipo);

            $this->json([
                'success' => true,
                'mantenimientos' => $mantenimientos,
                'total' => count($mantenimientos)
            ]);

        } catch (\Exception $e) {
            error_log("Error en MantenimientoController::search: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error en la búsqueda'], 500);
        }
    }
}

/**
 * Función auxiliar para aplanar arrays de errores
 */
function array_flatten($array) {
    $result = [];
    foreach ($array as $item) {
        if (is_array($item)) {
            $result = array_merge($result, array_flatten($item));
        } else {
            $result[] = $item;
        }
    }
    return $result;
}
?> 