<?php

namespace App\Models;

use App\Core\Model;

/**
 * Modelo Cuarto
 * Maneja todas las operaciones relacionadas con los cuartos
 */
class Cuarto extends Model
{
    protected $table = 'cuartos';
    protected $fillable = ['nombre', 'descripcion', 'edificio_id'];

    /**
     * Obtener todos los cuartos con información del edificio
     */
    public function getAllWithEdificio()
    {
        $sql = "SELECT c.id, c.nombre, c.descripcion, 
                       e.nombre as edificio, e.id as edificio_id,
                       (SELECT COUNT(*) FROM mantenimientos WHERE cuarto_id = c.id) as num_mantenimientos
                FROM cuartos c 
                JOIN edificios e ON c.edificio_id = e.id
                ORDER BY e.nombre, c.nombre";
        
        return $this->fetchAll($sql);
    }

    /**
     * Obtener cuarto con información del edificio
     */
    public function getWithEdificio($id)
    {
        $sql = "SELECT c.*, e.nombre as edificio_nombre 
                FROM cuartos c 
                JOIN edificios e ON c.edificio_id = e.id 
                WHERE c.id = :id";
        
        return $this->fetch($sql, ['id' => $id]);
    }

    /**
     * Obtener cuartos de un edificio específico
     */
    public function getByEdificio($edificioId)
    {
        $sql = "SELECT c.*, 
                       (SELECT COUNT(*) FROM mantenimientos WHERE cuarto_id = c.id) as num_mantenimientos
                FROM cuartos c 
                WHERE c.edificio_id = :edificio_id
                ORDER BY c.nombre";
        
        return $this->fetchAll($sql, ['edificio_id' => $edificioId]);
    }

    /**
     * Buscar cuartos por nombre o nombre de edificio
     */
    public function search($searchTerm, $edificioId = null)
    {
        $sql = "SELECT c.id, c.nombre, c.descripcion, 
                       e.nombre as edificio, e.id as edificio_id,
                       (SELECT COUNT(*) FROM mantenimientos WHERE cuarto_id = c.id) as num_mantenimientos
                FROM cuartos c 
                JOIN edificios e ON c.edificio_id = e.id
                WHERE (c.nombre LIKE :search OR e.nombre LIKE :search)";
        
        $params = ['search' => "%{$searchTerm}%"];
        
        if ($edificioId) {
            $sql .= " AND c.edificio_id = :edificio_id";
            $params['edificio_id'] = $edificioId;
        }
        
        $sql .= " ORDER BY e.nombre, c.nombre";
        
        return $this->fetchAll($sql, $params);
    }

    /**
     * Buscar cuartos por averías
     */
    public function searchByAveria($searchTerm)
    {
        $sql = "SELECT DISTINCT c.id, c.nombre, c.descripcion, 
                       e.nombre as edificio, e.id as edificio_id,
                       (SELECT COUNT(*) FROM mantenimientos WHERE cuarto_id = c.id) as num_mantenimientos
                FROM cuartos c 
                JOIN edificios e ON c.edificio_id = e.id
                JOIN mantenimientos m ON c.id = m.cuarto_id
                WHERE m.tipo != 'rutina' AND m.descripcion LIKE :search
                ORDER BY e.nombre, c.nombre";
        
        return $this->fetchAll($sql, ['search' => "%{$searchTerm}%"]);
    }

    /**
     * Obtener cuartos con filtros combinados
     */
    public function getFiltered($searchTerm = null, $averiaSearch = null, $edificioId = null)
    {
        $sql = "SELECT DISTINCT c.id, c.nombre, c.descripcion, 
                       e.nombre as edificio, e.id as edificio_id,
                       (SELECT COUNT(*) FROM mantenimientos WHERE cuarto_id = c.id) as num_mantenimientos
                FROM cuartos c 
                JOIN edificios e ON c.edificio_id = e.id";
        
        $joins = [];
        $conditions = [];
        $params = [];
        
        // Filtro por avería
        if ($averiaSearch) {
            $joins[] = "LEFT JOIN mantenimientos m ON c.id = m.cuarto_id";
            $conditions[] = "(m.tipo != 'rutina' AND m.descripcion LIKE :averia_search)";
            $params['averia_search'] = "%{$averiaSearch}%";
        }
        
        // Agregar joins si existen
        if (!empty($joins)) {
            $sql .= " " . implode(" ", $joins);
        }
        
        // Filtro por edificio
        if ($edificioId) {
            $conditions[] = "c.edificio_id = :edificio_id";
            $params['edificio_id'] = $edificioId;
        }
        
        // Filtro por nombre de cuarto o edificio
        if ($searchTerm) {
            $conditions[] = "(c.nombre LIKE :search OR e.nombre LIKE :search)";
            $params['search'] = "%{$searchTerm}%";
        }
        
        // Agregar condiciones WHERE si existen
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }
        
        $sql .= " ORDER BY e.nombre, c.nombre";
        
        return $this->fetchAll($sql, $params);
    }

    /**
     * Verificar si un cuarto se puede eliminar (no tiene mantenimientos asociados)
     */
    public function canDelete($id)
    {
        $sql = "SELECT COUNT(*) as count FROM mantenimientos WHERE cuarto_id = :id";
        $result = $this->fetch($sql, ['id' => $id]);
        
        return $result['count'] == 0;
    }

    /**
     * Obtener estadísticas del cuarto
     */
    public function getStats($id)
    {
        $sql = "SELECT 
                    COUNT(*) as total_mantenimientos,
                    COUNT(CASE WHEN tipo = 'rutina' THEN 1 END) as total_alertas,
                    COUNT(CASE WHEN tipo != 'rutina' THEN 1 END) as total_averias,
                    MAX(fecha_registro) as ultimo_mantenimiento
                FROM mantenimientos 
                WHERE cuarto_id = :id";
        
        return $this->fetch($sql, ['id' => $id]);
    }
}
?> 