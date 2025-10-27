#!/bin/bash

# Definir la ruta de tu proyecto
PROJECT_DIR="/Applications/XAMPP/xamppfiles/htdocs/finest_mant_cuartos"
PORT=3000

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR"

# Verificar si ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "Error: ngrok no está instalado o no está en el PATH."
    echo "Por favor, descarga e instala ngrok desde https://ngrok.com/download"
    exit 1
fi

# Verificar si node está instalado
if ! command -v node &> /dev/null; then
    echo "Error: Node.js no está instalado o no está en el PATH."
    echo "Por favor, instala Node.js desde https://nodejs.org/"
    exit 1
fi

# Verificar que el archivo data.json exista y tenga permisos
if [ ! -f "$PROJECT_DIR/data.json" ]; then
    echo "Creando archivo data.json inicial..."
    echo '{"cuartos":[]}' > data.json
fi

# Asegurar permisos correctos
chmod 666 data.json 2>/dev/null

echo "Iniciando servidor Node.js en puerto $PORT..."
# Iniciar el servidor en segundo plano
node server.js &
SERVER_PID=$!

# Esperar unos segundos para que el servidor inicie
sleep 2

# Mensaje informativo
echo "Iniciando ngrok con tu URL personalizada..."
echo "Tu aplicación será accesible en: https://ace-living-mallard.ngrok-free.app"

# Iniciar ngrok con la URL personalizada (puerto 80 para XAMPP)
ngrok http --url=ace-living-mallard.ngrok-free.app 80

# Capturar Ctrl+C para cerrar todo correctamente
trap "echo 'Deteniendo servidor...'; kill $SERVER_PID; exit" INT
