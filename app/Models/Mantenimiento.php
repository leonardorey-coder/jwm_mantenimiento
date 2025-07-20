<?php

namespace App\Models;

use App\Core\Model;

/**
 * Modelo Mantenimiento
 * Maneja todas las operaciones relacionadas con los mantenimientos
 */
class Mantenimiento extends Model
{
    protected $table = 'mantenimientos';
    protected $fillable = ['cuarto_id', 'descripcion', 'tipo', 'hora', 'dia_alerta', 'fecha_registro'];

    /**
     * Obtener mantenimientos de un cuarto específico
     */
    public function getByCuarto($cuartoId)
    {
        $sql = "SELECT id, descripcion, tipo, hora, dia_alerta, fecha_registro
                FROM mantenimientos
                WHERE cuarto_id = :cuarto_id
                ORDER BY fecha_registro DESC";
        
        return $this->fetchAll($sql, ['cuarto_id' => $cuartoId]);
    }

    /**
     * Obtener mantenimientos con información del cuarto
     */
    public function getWithCuarto($id)
    {
        $sql = "SELECT m.*, c.nombre as cuarto_nombre, e.nombre as edificio_nombre
                FROM mantenimientos m
                JOIN cuartos c ON m.cuarto_id = c.id
                JOIN edificios e ON c.edificio_id = e.id
                WHERE m.id = :id";
        
        return $this->fetch($sql, ['id' => $id]);
    }

    /**
     * Obtener todas las alertas (rutinas) programadas
     */
    public function getAlertas()
    {
        $sql = "SELECT m.*, c.nombre as cuarto_nombre, c.id as cuarto_id
                FROM mantenimientos m
                JOIN cuartos c ON m.cuarto_id = c.id
                WHERE m.tipo = 'rutina'
                ORDER BY m.dia_alerta ASC, m.hora ASC";
        
        return $this->fetchAll($sql);
    }

    /**
     * Obtener mantenimientos recientes (últimos 30 días)
     */
    public function getRecientes($limit = 50)
    {
        $sql = "SELECT m.*, c.nombre as cuarto_nombre, e.nombre as edificio_nombre
                FROM mantenimientos m
                JOIN cuartos c ON m.cuarto_id = c.id
                JOIN edificios e ON c.edificio_id = e.id
                WHERE m.fecha_registro >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY m.fecha_registro DESC
                LIMIT :limit";
        
        return $this->fetchAll($sql, ['limit' => $limit]);
    }

    /**
     * Obtener alertas que deben sonar hoy
     */
    public function getAlertasHoy()
    {
        $today = date('Y-m-d');
        
        $sql = "SELECT m.*, c.nombre as cuarto_nombre, c.id as cuarto_id
                FROM mantenimientos m
                JOIN cuartos c ON m.cuarto_id = c.id
                WHERE m.tipo = 'rutina' 
                AND m.dia_alerta = :today
                ORDER BY m.hora ASC";
        
        return $this->fetchAll($sql, ['today' => $today]);
    }

    /**
     * Obtener alertas vencidas (que ya pasaron la fecha/hora)
     */
    public function getAlertasVencidas()
    {
        $now = date('Y-m-d H:i:s');
        
        $sql = "SELECT m.*, c.nombre as cuarto_nombre, c.id as cuarto_id
                FROM mantenimientos m
                JOIN cuartos c ON m.cuarto_id = c.id
                WHERE m.tipo = 'rutina' 
                AND CONCAT(m.dia_alerta, ' ', m.hora, ':00') <= :now
                ORDER BY m.dia_alerta DESC, m.hora DESC";
        
        return $this->fetchAll($sql, ['now' => $now]);
    }

    /**
     * Buscar mantenimientos por descripción
     */
    public function searchByDescripcion($searchTerm, $tipo = null)
    {
        $sql = "SELECT m.*, c.nombre as cuarto_nombre, e.nombre as edificio_nombre
                FROM mantenimientos m
                JOIN cuartos c ON m.cuarto_id = c.id
                JOIN edificios e ON c.edificio_id = e.id
                WHERE m.descripcion LIKE :search";
        
        $params = ['search' => "%{$searchTerm}%"];
        
        if ($tipo) {
            $sql .= " AND m.tipo = :tipo";
            $params['tipo'] = $tipo;
        }
        
        $sql .= " ORDER BY m.fecha_registro DESC";
        
        return $this->fetchAll($sql, $params);
    }

    /**
     * Obtener estadísticas generales de mantenimientos
     */
    public function getEstadisticas()
    {
        $sql = "SELECT 
                    COUNT(*) as total_mantenimientos,
                    COUNT(CASE WHEN tipo = 'rutina' THEN 1 END) as total_alertas,
                    COUNT(CASE WHEN tipo != 'rutina' THEN 1 END) as total_averias,
                    COUNT(CASE WHEN fecha_registro >= CURDATE() THEN 1 END) as mantenimientos_hoy,
                    COUNT(CASE WHEN fecha_registro >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as mantenimientos_semana,
                    COUNT(CASE WHEN fecha_registro >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as mantenimientos_mes
                FROM mantenimientos";
        
        return $this->fetch($sql);
    }

    /**
     * Obtener mantenimientos por edificio
     */
    public function getByEdificio($edificioId, $limit = null)
    {
        $sql = "SELECT m.*, c.nombre as cuarto_nombre
                FROM mantenimientos m
                JOIN cuartos c ON m.cuarto_id = c.id
                WHERE c.edificio_id = :edificio_id
                ORDER BY m.fecha_registro DESC";
        
        if ($limit) {
            $sql .= " LIMIT :limit";
        }
        
        $params = ['edificio_id' => $edificioId];
        if ($limit) {
            $params['limit'] = $limit;
        }
        
        return $this->fetchAll($sql, $params);
    }

    /**
     * Actualizar mantenimiento con validaciones específicas
     */
    public function updateMantenimiento($id, $data)
    {
        // Validaciones específicas para mantenimientos
        if (isset($data['tipo']) && $data['tipo'] === 'rutina') {
            if (empty($data['hora']) || empty($data['dia_alerta'])) {
                throw new \Exception("La hora y el día son obligatorios para las alertas");
            }
            
            // Validar formato de fecha
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['dia_alerta'])) {
                throw new \Exception("Formato de fecha inválido (usar YYYY-MM-DD)");
            }
            
            // Validar formato de hora
            if (!preg_match('/^\d{2}:\d{2}$/', $data['hora'])) {
                throw new \Exception("Formato de hora inválido (usar HH:MM)");
            }
        } else {
            // Para mantenimientos normales, limpiar hora y día
            $data['hora'] = null;
            $data['dia_alerta'] = null;
        }
        
        return $this->update($id, $data);
    }

    /**
     * Crear mantenimiento con validaciones específicas
     */
    public function createMantenimiento($data)
    {
        // Validaciones específicas para mantenimientos
        if ($data['tipo'] === 'rutina') {
            if (empty($data['hora']) || empty($data['dia_alerta'])) {
                throw new \Exception("La hora y el día son obligatorios para las alertas");
            }
            
            // Validar formato de fecha
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['dia_alerta'])) {
                throw new \Exception("Formato de fecha inválido (usar YYYY-MM-DD)");
            }
            
            // Validar formato de hora
            if (!preg_match('/^\d{2}:\d{2}$/', $data['hora'])) {
                throw new \Exception("Formato de hora inválido (usar HH:MM)");
            }
        } else {
            // Para mantenimientos normales, limpiar hora y día
            $data['hora'] = null;
            $data['dia_alerta'] = null;
        }
        
        // Agregar fecha de registro si no existe
        if (!isset($data['fecha_registro'])) {
            $data['fecha_registro'] = date('Y-m-d H:i:s');
        }
        
        return $this->create($data);
    }

    /**
     * Verificar si hay conflictos de horario para alertas
     */
    public function checkConflictoHorario($cuartoId, $dia, $hora, $excludeId = null)
    {
        $sql = "SELECT COUNT(*) as count 
                FROM mantenimientos 
                WHERE cuarto_id = :cuarto_id 
                AND tipo = 'rutina' 
                AND dia_alerta = :dia 
                AND hora = :hora";
        
        $params = [
            'cuarto_id' => $cuartoId,
            'dia' => $dia,
            'hora' => $hora
        ];
        
        if ($excludeId) {
            $sql .= " AND id != :exclude_id";
            $params['exclude_id'] = $excludeId;
        }
        
        $result = $this->fetch($sql, $params);
        return $result['count'] > 0;
    }
}
?> 