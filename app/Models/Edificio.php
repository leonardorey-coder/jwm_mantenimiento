<?php

namespace App\Models;

use App\Core\Model;

/**
 * Modelo Edificio
 * Maneja todas las operaciones relacionadas con los edificios
 */
class Edificio extends Model
{
    protected $table = 'edificios';
    protected $fillable = ['nombre'];

    /**
     * Obtener todos los edificios ordenados por nombre
     */
    public function getAllOrdered()
    {
        return $this->where([], 'nombre ASC');
    }

    /**
     * Obtener edificio con sus cuartos
     */
    public function getWithCuartos($id)
    {
        $sql = "SELECT e.*, 
                       COUNT(c.id) as total_cuartos
                FROM edificios e
                LEFT JOIN cuartos c ON e.id = c.edificio_id
                WHERE e.id = :id
                GROUP BY e.id";
        
        return $this->fetch($sql, ['id' => $id]);
    }

    /**
     * Obtener todos los edificios con conteo de cuartos
     */
    public function getAllWithCuartosCount()
    {
        $sql = "SELECT e.*, 
                       COUNT(c.id) as total_cuartos
                FROM edificios e
                LEFT JOIN cuartos c ON e.id = c.edificio_id
                GROUP BY e.id
                ORDER BY e.nombre";
        
        return $this->fetchAll($sql);
    }

    /**
     * Verificar si un edificio se puede eliminar (no tiene cuartos asociados)
     */
    public function canDelete($id)
    {
        $sql = "SELECT COUNT(*) as count FROM cuartos WHERE edificio_id = :id";
        $result = $this->fetch($sql, ['id' => $id]);
        
        return $result['count'] == 0;
    }

    /**
     * Buscar edificios por nombre
     */
    public function searchByName($name)
    {
        $sql = "SELECT * FROM {$this->table} WHERE nombre LIKE :name ORDER BY nombre";
        return $this->fetchAll($sql, ['name' => "%{$name}%"]);
    }
}
?> 