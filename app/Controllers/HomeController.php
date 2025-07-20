<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Edificio;
use App\Models\Cuarto;
use App\Models\Mantenimiento;

/**
 * Controlador Home
 * Maneja la página principal del sistema
 */
class HomeController extends Controller
{
    private $edificioModel;
    private $cuartoModel;
    private $mantenimientoModel;

    public function __construct()
    {
        parent::__construct();
        $this->edificioModel = new Edificio();
        $this->cuartoModel = new Cuarto();
        $this->mantenimientoModel = new Mantenimiento();
    }

    /**
     * Mostrar la página principal
     */
    public function index()
    {
        try {
            // Obtener datos necesarios para la vista
            $edificios = $this->edificioModel->getAllOrdered();
            $cuartos = $this->cuartoModel->getAllWithEdificio();
            $alertas = $this->mantenimientoModel->getAlertas();
            $mantenimientosRecientes = $this->mantenimientoModel->getRecientes(20);
            $estadisticas = $this->mantenimientoModel->getEstadisticas();

            // Procesar alertas para el formato requerido por el frontend
            $alertasProcesadas = [];
            foreach ($alertas as $alerta) {
                $alertasProcesadas[] = [
                    'id' => $alerta['id'],
                    'descripcion' => $alerta['descripcion'],
                    'hora' => $alerta['hora'],
                    'dia' => $alerta['dia_alerta'],
                    'cuarto_nombre' => $alerta['cuarto_nombre'],
                    'cuarto_id' => $alerta['cuarto_id']
                ];
            }

            // Obtener mensajes flash
            $success = $this->getFlash('success');
            $error = $this->getFlash('error');

            // Datos para la vista
            $data = [
                'title' => 'Sistema de Mantenimiento - JW Marriott',
                'edificios' => $edificios,
                'cuartos' => $cuartos,
                'alertas' => $alertasProcesadas,
                'mantenimientosRecientes' => $mantenimientosRecientes,
                'estadisticas' => $estadisticas,
                'success' => $success,
                'error' => $error,
                'totalCuartos' => count($cuartos),
                'totalEdificios' => count($edificios)
            ];

            // Renderizar la vista principal
            $this->render('home.index', $data);

        } catch (\Exception $e) {
            error_log("Error en HomeController::index: " . $e->getMessage());
            $this->handleError('Error al cargar la página principal');
        }
    }

    /**
     * Buscar/filtrar cuartos (AJAX)
     */
    public function search()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $searchTerm = $this->input('search', '');
            $averiaSearch = $this->input('averia_search', '');
            $edificioId = $this->input('edificio_id', null);

            // Filtrar cuartos según los criterios
            $cuartos = $this->cuartoModel->getFiltered($searchTerm, $averiaSearch, $edificioId);

            $this->json([
                'success' => true,
                'cuartos' => $cuartos,
                'total' => count($cuartos)
            ]);

        } catch (\Exception $e) {
            error_log("Error en HomeController::search: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error en la búsqueda'], 500);
        }
    }

    /**
     * Obtener mantenimientos de un cuarto específico (AJAX)
     */
    public function getCuartoMantenimientos()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $cuartoId = $this->input('cuarto_id');
            
            if (!$cuartoId) {
                $this->json(['success' => false, 'message' => 'ID de cuarto requerido'], 400);
            }

            $mantenimientos = $this->mantenimientoModel->getByCuarto($cuartoId);
            $cuarto = $this->cuartoModel->getWithEdificio($cuartoId);

            if (!$cuarto) {
                $this->json(['success' => false, 'message' => 'Cuarto no encontrado'], 404);
            }

            $this->json([
                'success' => true,
                'cuarto' => $cuarto,
                'mantenimientos' => $mantenimientos
            ]);

        } catch (\Exception $e) {
            error_log("Error en HomeController::getCuartoMantenimientos: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error al obtener mantenimientos'], 500);
        }
    }

    /**
     * Obtener estadísticas del dashboard (AJAX)
     */
    public function getEstadisticas()
    {
        if (!$this->isAjax()) {
            $this->redirect('/');
        }

        try {
            $estadisticas = $this->mantenimientoModel->getEstadisticas();
            $totalCuartos = $this->cuartoModel->count();
            $totalEdificios = $this->edificioModel->count();

            $data = array_merge($estadisticas, [
                'total_cuartos' => $totalCuartos,
                'total_edificios' => $totalEdificios
            ]);

            $this->json([
                'success' => true,
                'estadisticas' => $data
            ]);

        } catch (\Exception $e) {
            error_log("Error en HomeController::getEstadisticas: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Error al obtener estadísticas'], 500);
        }
    }

    /**
     * Página de error 404
     */
    public function notFound()
    {
        http_response_code(404);
        $this->render('errors.404', [
            'title' => 'Página no encontrada - JW Marriott'
        ]);
    }

    /**
     * Página de error 500
     */
    public function serverError()
    {
        http_response_code(500);
        $this->render('errors.500', [
            'title' => 'Error del servidor - JW Marriott'
        ]);
    }

    /**
     * Método para mostrar información del sistema (debug)
     */
    public function info()
    {
        // Solo mostrar en modo debug
        if (!$this->input('debug')) {
            $this->redirect('/');
        }

        $info = [
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Desconocido',
            'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Desconocido',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'Desconocido',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'Desconocido',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Desconocido',
            'database_config' => require __DIR__ . '/../../config/database.php',
            'app_config' => require __DIR__ . '/../../config/app.php'
        ];

        $this->render('debug.info', [
            'title' => 'Información del Sistema',
            'info' => $info
        ]);
    }
}
?> 