# Sistema de Mantenimiento de Cuartos de Hotel

Sistema para registrar y gestionar el mantenimiento de cuartos en un hotel, con persistencia de datos y accesible desde múltiples dispositivos.

## Instalación

1. Asegúrate de tener Node.js instalado en tu sistema
2. Clona este repositorio o descarga los archivos
3. Abre una terminal en la carpeta del proyecto
4. Ejecuta `npm install` para instalar las dependencias

## Uso

1. Inicia el servidor ejecutando `npm start`
2. El servidor estará disponible localmente en: http://localhost:3000
3. Para acceder desde otros dispositivos en la misma red:
   - Obtén la dirección IP de tu equipo
   - Accede desde otro dispositivo usando: http://[TU-IP]:3000

## Uso con ngrok (para acceso desde internet)

Para hacer que la aplicación sea accesible desde Internet:

1. Instala ngrok desde https://ngrok.com/download
2. Con el servidor ejecutándose, abre otra terminal y ejecuta: `ngrok http 3000`
3. ngrok generará una URL pública (ejemplo: https://abcd1234.ngrok.io)
4. Comparte esta URL para que otros usuarios puedan acceder desde cualquier lugar

## Características

- Agregar, editar y eliminar cuartos
- Agregar, editar y eliminar mantenimientos para cada cuarto
- Persistencia de datos (los datos se guardan en el servidor)
- Acceso desde múltiples dispositivos simultáneamente
