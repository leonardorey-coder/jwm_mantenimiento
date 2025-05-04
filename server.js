const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Configuración mejorada de CORS para la URL de ngrok
app.use((req, res, next) => {
    // Permitir solicitudes desde cualquier origen (incluido ngrok)
    res.header('Access-Control-Allow-Origin', '*');
    // Permitir métodos específicos
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // Permitir encabezados específicos
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Manejar solicitudes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json()); // Para manejar JSON en las peticiones

// Inicializar archivo de datos si no existe
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ cuartos: [] }));
} else {
    // Archivo existente - sin mensaje de depuración
}

// Rutas de la API
// Obtener todos los cuartos
app.get('/api/cuartos', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        res.json(data.cuartos);
    } catch (error) {
        console.error("Error al leer cuartos:", error);
        res.status(500).json({ error: "Error al leer los datos" });
    }
});

// Agregar un cuarto nuevo
app.post('/api/cuartos', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const nuevoCuarto = req.body;
        
        // Validar campos obligatorios
        if (!nuevoCuarto.nombre || !nuevoCuarto.edificio) {
            return res.status(400).json({ error: "El nombre del cuarto y el edificio son obligatorios" });
        }
        
        // Validar que la combinación de nombre y edificio no exista
        const existeCombinacion = data.cuartos.some(c => 
            c.nombre.toLowerCase() === nuevoCuarto.nombre.toLowerCase() &&
            c.edificio.toLowerCase() === nuevoCuarto.edificio.toLowerCase());
            
        if (existeCombinacion) {
            return res.status(400).json({ error: "Ya existe un cuarto con ese nombre en el mismo edificio" });
        }
        
        // Agregar el nuevo cuarto
        data.cuartos.push(nuevoCuarto);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        res.status(201).json(nuevoCuarto);
    } catch (error) {
        console.error("Error al agregar cuarto:", error);
        res.status(500).json({ error: "Error al guardar los datos" });
    }
});

// Actualizar un cuarto existente
app.put('/api/cuartos/:id', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const id = parseInt(req.params.id);
        const cuartoActualizado = req.body;
        
        // Verificar que el cuarto existe
        const index = data.cuartos.findIndex(c => c.id === id);
        if (index === -1) {
            return res.status(404).json({ error: "Cuarto no encontrado" });
        }
        
        // Validar campos obligatorios
        if (!cuartoActualizado.nombre || !cuartoActualizado.edificio) {
            return res.status(400).json({ error: "El nombre del cuarto y el edificio son obligatorios" });
        }
        
        // Validar que la combinación de nombre y edificio no exista en otro cuarto
        const existeCombinacion = data.cuartos.some(c => 
            c.nombre.toLowerCase() === cuartoActualizado.nombre.toLowerCase() &&
            c.edificio.toLowerCase() === cuartoActualizado.edificio.toLowerCase() &&
            c.id !== id);
            
        if (existeCombinacion) {
            return res.status(400).json({ error: "Ya existe otro cuarto con ese nombre en el mismo edificio" });
        }
        
        // Actualizar el cuarto
        data.cuartos[index] = cuartoActualizado;
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        res.json(cuartoActualizado);
    } catch (error) {
        console.error("Error al actualizar cuarto:", error);
        res.status(500).json({ error: "Error al actualizar los datos" });
    }
});

// Eliminar un cuarto
app.delete('/api/cuartos/:id', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const id = parseInt(req.params.id);
        
        // Filtrar el cuarto a eliminar
        data.cuartos = data.cuartos.filter(c => c.id !== id);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        res.json({ mensaje: "Cuarto eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar cuarto:", error);
        res.status(500).json({ error: "Error al eliminar el cuarto" });
    }
});

// Agregar mantenimiento a un cuarto
app.post('/api/cuartos/:id/mantenimientos', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const id = parseInt(req.params.id);
        const nuevosMantenimientos = req.body;
        
        // Verificar que el cuarto existe
        const index = data.cuartos.findIndex(c => c.id === id);
        if (index === -1) {
            return res.status(404).json({ error: "Cuarto no encontrado" });
        }
        
        // Agregar los mantenimientos
        data.cuartos[index].mantenimientos = data.cuartos[index].mantenimientos.concat(nuevosMantenimientos);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        res.json(data.cuartos[index]);
    } catch (error) {
        console.error("Error al agregar mantenimientos:", error);
        res.status(500).json({ error: "Error al guardar los mantenimientos" });
    }
});

// Actualizar un mantenimiento
app.put('/api/cuartos/:idCuarto/mantenimientos/:idMantenimiento', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const idCuarto = parseInt(req.params.idCuarto);
        const idMantenimiento = parseInt(req.params.idMantenimiento);
        const mantenimientoActualizado = req.body;
        
        // Verificar que el cuarto existe
        const indexCuarto = data.cuartos.findIndex(c => c.id === idCuarto);
        if (indexCuarto === -1) {
            return res.status(404).json({ error: "Cuarto no encontrado" });
        }
        
        // Verificar que el mantenimiento existe
        const indexMantenimiento = data.cuartos[indexCuarto].mantenimientos.findIndex(m => m.id === idMantenimiento);
        if (indexMantenimiento === -1) {
            return res.status(404).json({ error: "Mantenimiento no encontrado" });
        }
        
        // Validar campos específicos según el tipo
        if (mantenimientoActualizado.tipo === 'rutina' && !mantenimientoActualizado.hora) {
            return res.status(400).json({ error: "Las rutinas requieren una hora programada" });
        }
        
        // Actualizar el mantenimiento
        data.cuartos[indexCuarto].mantenimientos[indexMantenimiento] = mantenimientoActualizado;
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        res.json(mantenimientoActualizado);
    } catch (error) {
        console.error("Error al actualizar mantenimiento:", error);
        res.status(500).json({ error: "Error al actualizar el mantenimiento" });
    }
});

// Eliminar un mantenimiento
app.delete('/api/cuartos/:idCuarto/mantenimientos/:idMantenimiento', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const idCuarto = parseInt(req.params.idCuarto);
        const idMantenimiento = parseInt(req.params.idMantenimiento);
        
        // Verificar que el cuarto existe
        const indexCuarto = data.cuartos.findIndex(c => c.id === idCuarto);
        if (indexCuarto === -1) {
            return res.status(404).json({ error: "Cuarto no encontrado" });
        }
        
        // Filtrar el mantenimiento a eliminar
        data.cuartos[indexCuarto].mantenimientos = data.cuartos[indexCuarto].mantenimientos.filter(m => m.id !== idMantenimiento);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        res.json({ mensaje: "Mantenimiento eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar mantenimiento:", error);
        res.status(500).json({ error: "Error al eliminar el mantenimiento" });
    }
});

// Obtener lista de edificios
app.get('/api/edificios', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const edificios = [...new Set(data.cuartos.map(c => c.edificio).filter(Boolean))];
        res.json(edificios);
    } catch (error) {
        console.error("Error al obtener edificios:", error);
        res.status(500).json({ error: "Error al leer los datos" });
    }
});

// Ruta para la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'hotel_mant.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
