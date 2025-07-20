<?php

namespace App\Core;

use App\Core\Database;

/**
 * Clase base Model
 * Todas las clases de modelo heredan de esta clase
 */
abstract class Model
{
    protected $db;
    protected $table;
    protected $primaryKey = 'id';
    protected $fillable = [];
    protected $hidden = [];

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Obtener todos los registros
     */
    public function all()
    {
        $sql = "SELECT * FROM {$this->table}";
        return $this->db->fetchAll($sql);
    }

    /**
     * Buscar un registro por ID
     */
    public function find($id)
    {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id";
        return $this->db->fetch($sql, ['id' => $id]);
    }

    /**
     * Buscar registros con condiciones
     */
    public function where($conditions = [], $orderBy = null, $limit = null)
    {
        $sql = "SELECT * FROM {$this->table}";
        $params = [];

        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $field => $value) {
                $whereClause[] = "{$field} = :{$field}";
                $params[$field] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
        }

        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }

        if ($limit) {
            $sql .= " LIMIT {$limit}";
        }

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Crear un nuevo registro
     */
    public function create($data)
    {
        // Filtrar solo los campos permitidos
        $filteredData = $this->filterFillable($data);
        
        if (empty($filteredData)) {
            throw new \Exception("No hay datos válidos para insertar");
        }

        return $this->db->insert($this->table, $filteredData);
    }

    /**
     * Actualizar un registro
     */
    public function update($id, $data)
    {
        // Filtrar solo los campos permitidos
        $filteredData = $this->filterFillable($data);
        
        if (empty($filteredData)) {
            throw new \Exception("No hay datos válidos para actualizar");
        }

        $where = "{$this->primaryKey} = :id";
        $whereParams = ['id' => $id];

        return $this->db->update($this->table, $filteredData, $where, $whereParams);
    }

    /**
     * Eliminar un registro
     */
    public function delete($id)
    {
        $where = "{$this->primaryKey} = :id";
        $params = ['id' => $id];

        return $this->db->delete($this->table, $where, $params);
    }

    /**
     * Contar registros
     */
    public function count($conditions = [])
    {
        $sql = "SELECT COUNT(*) as total FROM {$this->table}";
        $params = [];

        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $field => $value) {
                $whereClause[] = "{$field} = :{$field}";
                $params[$field] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
        }

        $result = $this->db->fetch($sql, $params);
        return $result['total'] ?? 0;
    }

    /**
     * Verificar si existe un registro
     */
    public function exists($id)
    {
        $result = $this->find($id);
        return $result !== false && $result !== null;
    }

    /**
     * Filtrar datos permitidos según $fillable
     */
    protected function filterFillable($data)
    {
        if (empty($this->fillable)) {
            return $data;
        }

        $filtered = [];
        foreach ($this->fillable as $field) {
            if (array_key_exists($field, $data)) {
                $filtered[$field] = $data[$field];
            }
        }

        return $filtered;
    }

    /**
     * Ocultar campos sensibles según $hidden
     */
    protected function hideFields($data)
    {
        if (empty($this->hidden) || empty($data)) {
            return $data;
        }

        // Si es un array de registros
        if (isset($data[0]) && is_array($data[0])) {
            foreach ($data as &$record) {
                foreach ($this->hidden as $field) {
                    unset($record[$field]);
                }
            }
        } else {
            // Si es un solo registro
            foreach ($this->hidden as $field) {
                unset($data[$field]);
            }
        }

        return $data;
    }

    /**
     * Sanitizar datos de entrada
     */
    protected function sanitize($data)
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->sanitize($value);
            }
        } else {
            $data = htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
        }

        return $data;
    }

    /**
     * Ejecutar consulta SQL personalizada
     */
    public function query($sql, $params = [])
    {
        return $this->db->query($sql, $params);
    }

    /**
     * Ejecutar consulta SQL personalizada y obtener todos los resultados
     */
    public function fetchAll($sql, $params = [])
    {
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Ejecutar consulta SQL personalizada y obtener un resultado
     */
    public function fetch($sql, $params = [])
    {
        return $this->db->fetch($sql, $params);
    }
}
?> 