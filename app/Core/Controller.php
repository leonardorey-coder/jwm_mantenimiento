<?php

namespace App\Core;

/**
 * Clase base Controller
 * Todas las clases de controlador heredan de esta clase
 */
abstract class Controller
{
    protected $request;
    protected $response;

    public function __construct()
    {
        $this->request = $_REQUEST;
        $this->response = [];
    }

    /**
     * Cargar una vista
     */
    protected function view($viewName, $data = [])
    {
        // Extraer variables para la vista
        extract($data);
        
        // Construir la ruta del archivo de vista
        $viewPath = __DIR__ . '/../Views/' . str_replace('.', '/', $viewName) . '.php';
        
        if (file_exists($viewPath)) {
            require_once $viewPath;
        } else {
            throw new \Exception("Vista no encontrada: {$viewName}");
        }
    }

    /**
     * Renderizar una vista con layout
     */
    protected function render($viewName, $data = [], $layout = 'layout')
    {
        // Capturar el contenido de la vista
        ob_start();
        $this->view($viewName, $data);
        $content = ob_get_clean();
        
        // Pasar el contenido al layout
        $data['content'] = $content;
        $this->view($layout, $data);
    }

    /**
     * Enviar respuesta JSON
     */
    protected function json($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
        exit;
    }

    /**
     * Redirigir a otra URL
     */
    protected function redirect($url, $statusCode = 302)
    {
        http_response_code($statusCode);
        header("Location: {$url}");
        exit;
    }

    /**
     * Obtener datos de la petición
     */
    protected function input($key = null, $default = null)
    {
        if ($key === null) {
            return $this->getAllInput();
        }
        
        return $_REQUEST[$key] ?? $default;
    }

    /**
     * Obtener todos los datos de entrada
     */
    protected function getAllInput()
    {
        $input = $_REQUEST;
        
        // Si es una petición JSON, obtener datos del body
        if ($this->isJson()) {
            $jsonData = json_decode(file_get_contents('php://input'), true);
            if ($jsonData) {
                $input = array_merge($input, $jsonData);
            }
        }
        
        return $input;
    }

    /**
     * Verificar si la petición es AJAX
     */
    protected function isAjax()
    {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }

    /**
     * Verificar si la petición es JSON
     */
    protected function isJson()
    {
        return isset($_SERVER['CONTENT_TYPE']) && 
               stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== false;
    }

    /**
     * Validar datos de entrada
     */
    protected function validate($data, $rules)
    {
        $errors = [];
        
        foreach ($rules as $field => $rule) {
            $value = $data[$field] ?? null;
            $ruleArray = explode('|', $rule);
            
            foreach ($ruleArray as $singleRule) {
                $error = $this->validateField($field, $value, $singleRule);
                if ($error) {
                    $errors[$field][] = $error;
                }
            }
        }
        
        return $errors;
    }

    /**
     * Validar un campo específico
     */
    private function validateField($field, $value, $rule)
    {
        if ($rule === 'required') {
            if (empty($value)) {
                return "El campo {$field} es obligatorio";
            }
        }
        
        if ($rule === 'numeric') {
            if (!is_numeric($value)) {
                return "El campo {$field} debe ser numérico";
            }
        }
        
        if (strpos($rule, 'min:') === 0) {
            $minLength = (int) substr($rule, 4);
            if (strlen($value) < $minLength) {
                return "El campo {$field} debe tener al menos {$minLength} caracteres";
            }
        }
        
        if (strpos($rule, 'max:') === 0) {
            $maxLength = (int) substr($rule, 4);
            if (strlen($value) > $maxLength) {
                return "El campo {$field} no debe tener más de {$maxLength} caracteres";
            }
        }
        
        if ($rule === 'email') {
            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                return "El campo {$field} debe ser un email válido";
            }
        }
        
        return null;
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
     * Establecer mensaje flash
     */
    protected function setFlash($type, $message)
    {
        if (!isset($_SESSION)) {
            session_start();
        }
        
        $_SESSION['flash'][$type] = $message;
    }

    /**
     * Obtener mensaje flash
     */
    protected function getFlash($type)
    {
        if (!isset($_SESSION)) {
            session_start();
        }
        
        $message = $_SESSION['flash'][$type] ?? null;
        unset($_SESSION['flash'][$type]);
        
        return $message;
    }

    /**
     * Manejar errores y responder apropiadamente
     */
    protected function handleError($message, $statusCode = 500)
    {
        if ($this->isAjax()) {
            $this->json(['success' => false, 'message' => $message], $statusCode);
        } else {
            $this->setFlash('error', $message);
            $this->redirect('/?error=1');
        }
    }

    /**
     * Manejar éxito y responder apropiadamente
     */
    protected function handleSuccess($message, $data = [])
    {
        if ($this->isAjax()) {
            $response = ['success' => true, 'message' => $message];
            if (!empty($data)) {
                $response['data'] = $data;
            }
            $this->json($response);
        } else {
            $this->setFlash('success', $message);
            $this->redirect('/');
        }
    }
}
?> 