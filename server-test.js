const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/test', (req, res) => {
    res.json({ message: 'Servidor funcionando', timestamp: new Date().toISOString() });
});

// Ruta principal
app.get('/', (req, res) => {
    res.send('<h1>JW Mantto - Servidor Local</h1><p>El servidor está funcionando correctamente.</p>');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor Express funcionando en http://localhost:${PORT}`);
    console.log('JW Mantto - Sistema local iniciado correctamente');
});
