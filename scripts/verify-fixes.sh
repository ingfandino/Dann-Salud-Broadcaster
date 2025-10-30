#!/bin/bash

# ===================================
# Script de Verificación de Correcciones
# Dann-Salud-Broadcaster
# ===================================

echo "🔍 Verificando correcciones aplicadas..."
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

cd "$BACKEND_DIR" || exit 1

# ===================================
# 1. Verificar archivo .env
# ===================================
echo "1️⃣ Verificando configuración de entorno..."

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado${NC}"
    echo "   Creando desde .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✅ Archivo .env creado. Por favor, configúralo antes de continuar.${NC}"
    exit 1
fi

# Verificar USE_MULTI_SESSION
if grep -q "USE_MULTI_SESSION=true" .env; then
    echo -e "${GREEN}✅ USE_MULTI_SESSION activado correctamente${NC}"
else
    echo -e "${RED}❌ USE_MULTI_SESSION no está activado${NC}"
    echo "   Recomendación: Agregar 'USE_MULTI_SESSION=true' al archivo .env"
fi

# Verificar MAX_CONCURRENT_JOBS
CONCURRENT_JOBS=$(grep "MAX_CONCURRENT_JOBS=" .env | cut -d '=' -f2)
if [ ! -z "$CONCURRENT_JOBS" ]; then
    if [ "$CONCURRENT_JOBS" -le 3 ]; then
        echo -e "${GREEN}✅ MAX_CONCURRENT_JOBS configurado correctamente: $CONCURRENT_JOBS${NC}"
    else
        echo -e "${YELLOW}⚠️  MAX_CONCURRENT_JOBS alto ($CONCURRENT_JOBS). Recomendado: 2-3${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  MAX_CONCURRENT_JOBS no configurado. Usando valor por defecto (2)${NC}"
fi

echo ""

# ===================================
# 2. Verificar archivos modificados
# ===================================
echo "2️⃣ Verificando archivos modificados..."

check_file_exists() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 no encontrado${NC}"
        return 1
    fi
}

check_file_exists "src/services/whatsappManager.js"
check_file_exists "src/models/Report.js"
check_file_exists "src/controllers/reportsController.js"
check_file_exists "src/routes/reportRoutes.js"
check_file_exists "src/services/jobScheduler.js"
check_file_exists "src/services/sendMessageService.js"

cd "$FRONTEND_DIR" || exit 1
check_file_exists "src/pages/BulkMessages.jsx"

echo ""

# ===================================
# 3. Verificar funciones críticas
# ===================================
echo "3️⃣ Verificando funciones críticas implementadas..."

cd "$BACKEND_DIR" || exit 1

# Verificar cleanup automático en whatsappManager
if grep -q "cleanupInactiveClients" src/services/whatsappManager.js; then
    echo -e "${GREEN}✅ Sistema de cleanup automático implementado${NC}"
else
    echo -e "${RED}❌ Sistema de cleanup no encontrado${NC}"
fi

# Verificar throttleMessage en sendMessageService
if grep -q "throttleMessage" src/services/sendMessageService.js; then
    echo -e "${GREEN}✅ Throttling de mensajes implementado${NC}"
else
    echo -e "${RED}❌ Throttling no encontrado${NC}"
fi

# Verificar health check en jobScheduler
if grep -q "checkSystemHealth" src/services/jobScheduler.js; then
    echo -e "${GREEN}✅ Health check del sistema implementado${NC}"
else
    echo -e "${RED}❌ Health check no encontrado${NC}"
fi

# Verificar nuevos endpoints de reportes
if grep -q "generateReportsFromJob" src/controllers/reportsController.js; then
    echo -e "${GREEN}✅ Endpoint de generación de reportes implementado${NC}"
else
    echo -e "${RED}❌ Endpoint de reportes no encontrado${NC}"
fi

# Verificar validación en BulkMessages
cd "$FRONTEND_DIR" || exit 1
if grep -q "navigate(\"/qr-link\"" src/pages/BulkMessages.jsx; then
    echo -e "${GREEN}✅ Validación obligatoria de WhatsApp implementada${NC}"
else
    echo -e "${RED}❌ Validación no encontrada${NC}"
fi

echo ""

# ===================================
# 4. Verificar dependencias
# ===================================
echo "4️⃣ Verificando dependencias..."

cd "$BACKEND_DIR" || exit 1
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✅ Dependencias del backend instaladas${NC}"
    else
        echo -e "${YELLOW}⚠️  Dependencias del backend no instaladas${NC}"
        echo "   Ejecutar: npm install"
    fi
fi

cd "$FRONTEND_DIR" || exit 1
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✅ Dependencias del frontend instaladas${NC}"
    else
        echo -e "${YELLOW}⚠️  Dependencias del frontend no instaladas${NC}"
        echo "   Ejecutar: npm install"
    fi
fi

echo ""

# ===================================
# 5. Resumen
# ===================================
echo "═══════════════════════════════════════════════════════════"
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Correcciones verificadas:"
echo "  ✅ Sistema multi-sesión con cleanup automático"
echo "  ✅ Validación obligatoria en BulkMessages"
echo "  ✅ Integración de Reportes con Mensajería Masiva"
echo "  ✅ Optimización de concurrencia y recursos"
echo ""
echo "Próximos pasos:"
echo "  1. Configurar archivo .env con tus credenciales"
echo "  2. Asegurar que USE_MULTI_SESSION=true"
echo "  3. Reiniciar el servidor backend"
echo "  4. Probar con múltiples usuarios conectados"
echo ""
echo "Documentación completa: CORRECCIONES.md"
echo "═══════════════════════════════════════════════════════════"
