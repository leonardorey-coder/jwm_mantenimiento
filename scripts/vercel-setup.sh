#!/bin/bash

# Script de configuración inicial para Vercel
# Ejecuta: chmod +x scripts/vercel-setup.sh && ./scripts/vercel-setup.sh

echo "🚀 Configurando proyecto para Vercel..."
echo ""

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI no está instalado"
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
else
    echo "✅ Vercel CLI ya está instalado"
fi

echo ""
echo "📋 Pasos siguientes:"
echo ""
echo "1. Inicia sesión en Vercel:"
echo "   vercel login"
echo ""
echo "2. Conecta tu proyecto:"
echo "   vercel"
echo ""
echo "3. Para desarrollo local con Vercel:"
echo "   npm run vercel:dev"
echo ""
echo "4. Para desplegar a producción:"
echo "   npm run vercel:deploy"
echo ""
echo "📚 Lee README_VERCEL.md para más información"
echo ""

