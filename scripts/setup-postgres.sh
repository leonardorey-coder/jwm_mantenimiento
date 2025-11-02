#!/bin/bash

# Script de configuración rápida para PostgreSQL
# Este script ayuda a configurar PostgreSQL para el proyecto JW Mantto

echo "╔════════════════════════════════════════════╗"
echo "║  JW Mantto - Configuración PostgreSQL     ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para imprimir mensajes de éxito
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para imprimir mensajes de error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para imprimir mensajes de advertencia
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Verificar si PostgreSQL está instalado
echo "🔍 Verificando instalación de PostgreSQL..."
if command_exists psql; then
    print_success "PostgreSQL está instalado"
    psql --version
else
    print_error "PostgreSQL no está instalado"
    echo ""
    echo "Por favor, instala PostgreSQL primero:"
    echo ""
    echo "macOS (Homebrew):"
    echo "  brew install postgresql@15"
    echo "  brew services start postgresql@15"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt update"
    echo "  sudo apt install postgresql postgresql-contrib"
    echo ""
    echo "Windows:"
    echo "  Descarga desde https://www.postgresql.org/download/windows/"
    echo ""
    exit 1
fi

echo ""

# 2. Verificar si Node.js está instalado
echo "🔍 Verificando instalación de Node.js..."
if command_exists node; then
    print_success "Node.js está instalado"
    node --version
else
    print_error "Node.js no está instalado"
    echo "Descarga desde https://nodejs.org/"
    exit 1
fi

echo ""

# 3. Verificar archivo .env
echo "🔍 Verificando archivo de configuración..."
if [ ! -f .env ]; then
    print_warning "Archivo .env no encontrado"
    echo "📝 Creando archivo .env desde .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Archivo .env creado"
        echo ""
        print_warning "IMPORTANTE: Edita el archivo .env con tus credenciales de PostgreSQL"
        echo "   Valores a configurar:"
        echo "   - DB_HOST (por defecto: localhost)"
        echo "   - DB_USER (por defecto: postgres)"
        echo "   - DB_PASSWORD (tu contraseña de PostgreSQL)"
        echo ""
    else
        print_error "Archivo .env.example no encontrado"
        exit 1
    fi
else
    print_success "Archivo .env existe"
fi

echo ""

# 4. Instalar dependencias de Node.js
echo "📦 Instalando dependencias de Node.js..."
npm install
if [ $? -eq 0 ]; then
    print_success "Dependencias instaladas correctamente"
else
    print_error "Error al instalar dependencias"
    exit 1
fi

echo ""

# 5. Preguntar credenciales de PostgreSQL
echo "🔧 Configuración de base de datos"
echo "Por favor, ingresa las credenciales de PostgreSQL:"
echo ""

read -p "Host (presiona Enter para 'localhost'): " db_host
db_host=${db_host:-localhost}

read -p "Puerto (presiona Enter para '5432'): " db_port
db_port=${db_port:-5432}

read -p "Nombre de la base de datos (presiona Enter para 'jwmantto'): " db_name
db_name=${db_name:-jwmantto}

read -p "Usuario de PostgreSQL (presiona Enter para 'postgres'): " db_user
db_user=${db_user:-postgres}

read -sp "Contraseña de PostgreSQL: " db_password
echo ""

# 6. Actualizar archivo .env
echo ""
echo "💾 Actualizando archivo .env..."
cat > .env << EOF
# Configuración PostgreSQL
DB_HOST=$db_host
DB_PORT=$db_port
DB_NAME=$db_name
DB_USER=$db_user
DB_PASSWORD=$db_password
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false

# Configuración de la Aplicación
PORT=3001
NODE_ENV=development

# Migración
SQLITE_DB_PATH=./db/jwmantto.db
EOF

print_success "Archivo .env actualizado"
echo ""

# 7. Crear la base de datos
echo "🗄️  Creando base de datos '$db_name'..."
PGPASSWORD=$db_password psql -h $db_host -p $db_port -U $db_user -d postgres -c "CREATE DATABASE $db_name;" 2>/dev/null

if [ $? -eq 0 ]; then
    print_success "Base de datos creada"
else
    print_warning "La base de datos ya existe o hubo un error (esto es normal si ya está creada)"
fi

echo ""

# 8. Ejecutar el esquema
echo "📋 Creando tablas en la base de datos..."
PGPASSWORD=$db_password psql -h $db_host -p $db_port -U $db_user -d $db_name -f db/schema-postgres.sql

if [ $? -eq 0 ]; then
    print_success "Esquema de base de datos creado"
else
    print_error "Error al crear el esquema"
    echo "Intenta ejecutar manualmente:"
    echo "  psql -U $db_user -d $db_name -f db/schema-postgres.sql"
    exit 1
fi

echo ""

# 9. Verificar la instalación
echo "🔍 Verificando tablas creadas..."
table_count=$(PGPASSWORD=$db_password psql -h $db_host -p $db_port -U $db_user -d $db_name -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ "$table_count" -ge 3 ]; then
    print_success "Tablas creadas correctamente ($table_count tablas encontradas)"
else
    print_warning "Se esperaban al menos 3 tablas, pero se encontraron $table_count"
fi

echo ""

# 10. Resumen final
echo "╔════════════════════════════════════════════╗"
echo "║  ✨ Configuración Completada              ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "📊 Resumen de la configuración:"
echo "   Host: $db_host"
echo "   Puerto: $db_port"
echo "   Base de datos: $db_name"
echo "   Usuario: $db_user"
echo "   Tablas creadas: $table_count"
echo ""
echo "🚀 Para iniciar la aplicación, ejecuta:"
echo "   npm start"
echo ""
echo "📖 Para más información, consulta:"
echo "   docs/README_POSTGRES.md"
echo ""

# Preguntar si desea migrar datos de SQLite
if [ -f "db/jwmantto.db" ]; then
    echo "📦 Se detectó una base de datos SQLite existente."
    read -p "¿Deseas migrar los datos a PostgreSQL? (s/n): " migrate
    
    if [ "$migrate" = "s" ] || [ "$migrate" = "S" ]; then
        echo ""
        echo "🔄 Iniciando migración de datos..."
        node scripts/migrate-sqlite-to-postgres.js
        
        if [ $? -eq 0 ]; then
            print_success "Migración completada"
        else
            print_error "Error en la migración"
        fi
    fi
fi

echo ""
print_success "¡Todo listo! 🎉"
echo ""
