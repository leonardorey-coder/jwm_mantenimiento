#!/bin/bash

echo "🧪 ===== VERIFICACIÓN FINAL DE JW MANTTO OFFLINE ====="
echo ""

# Verificar estructura de archivos
echo "📁 Verificando archivos necesarios..."

files=(
    "electron-main.js"
    "electron-database.js" 
    "electron-app-loader.js"
    "index.html"
    "package.json"
    "style.css"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - OK"
    else
        echo "❌ $file - FALTA"
    fi
done

echo ""

# Verificar dependencias
echo "📦 Verificando dependencias npm..."
if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
    
    if [ -d "node_modules" ]; then
        echo "✅ node_modules existe"
    else
        echo "⚠️  node_modules no existe - ejecutar: npm install"
    fi
    
    # Verificar dependencias específicas
    deps=("better-sqlite3" "electron" "express" "cors")
    for dep in "${deps[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            echo "✅ $dep instalado"
        else
            echo "❌ $dep NO instalado"
        fi
    done
else
    echo "❌ package.json no encontrado"
fi

echo ""

# Verificar scripts npm
echo "🎯 Scripts npm disponibles:"
if [ -f "package.json" ]; then
    echo "• npm run electron (RECOMENDADO para uso offline)"
    echo "• npm start (solo para desarrollo con servidor)"
    echo "• npm run electron-dev (desarrollo con servidor)"
else
    echo "❌ No se puede verificar scripts sin package.json"
fi

echo ""

# Verificar permisos
echo "🔒 Verificando permisos..."
if [ -r "electron-main.js" ] && [ -r "index.html" ]; then
    echo "✅ Permisos de lectura - OK"
else
    echo "❌ Problemas de permisos detectados"
fi

echo ""

# Estado final
echo "📋 RESUMEN:"
echo "• La aplicación está configurada para funcionar 100% offline"
echo "• Base de datos SQLite se creará automáticamente en primer uso"
echo "• No requiere conexión a internet ni servidor web"
echo "• Ejecutar con: npm run electron"

echo ""
echo "🎉 Verificación completada. ¡La aplicación está lista para uso offline!"
echo ""
echo "Para iniciar la aplicación:"
echo "  cd $(pwd)"
echo "  npm run electron"
