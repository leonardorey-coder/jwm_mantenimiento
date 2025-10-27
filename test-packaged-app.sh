#!/bin/bash

# Script para probar la app empaquetada

APP_PATH="/Volumes/SSD/jwm_mant_cuartos/dist/mac-arm64/JW Mantto.app"
BUILD_LOG="/tmp/build.log"

echo "🔍 Esperando a que el build termine..."

# Esperar a que el build termine
while pgrep -f "npm run dist" > /dev/null 2>&1; do
    sleep 2
    echo "⏳ Build en progreso..."
done

# Revisar si el build fue exitoso
if [ $? -ne 0 ]; then
    echo "❌ Build falló"
    echo "📋 Logs del build:"
    tail -200 "$BUILD_LOG"
    exit 1
fi

# Verificar que la app fue creada
if [ ! -d "$APP_PATH" ]; then
    echo "❌ App empaquetada no encontrada en: $APP_PATH"
    echo "📋 Buscando apps en dist/"
    find /Volumes/SSD/jwm_mant_cuartos/dist -name "*.app" -type d 2>/dev/null || echo "No .app encontrado"
    exit 1
fi

echo "✅ App empaquetada encontrada"
echo "🚀 Abriendo app..."

# Abrir la app
open "$APP_PATH"

echo "⏳ Esperando 5 segundos para que la app se inicie..."
sleep 5

echo "✅ App abierta - revisa los logs en DevTools (F12)"
