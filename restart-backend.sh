#!/bin/bash
# Script para reiniciar el backend de Dann Salud

echo "🔄 Reiniciando backend..."

# Detener cualquier proceso en puerto 5000
echo "🔍 Buscando procesos en puerto 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo "✅ Procesos en puerto 5000 detenidos" || echo "ℹ️  Puerto 5000 libre"

# Reiniciar PM2
echo "🔄 Reiniciando PM2..."
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
pm2 restart dann-salud-backend

# Esperar un momento
sleep 2

# Mostrar estado
echo ""
echo "📊 Estado actual:"
pm2 list

echo ""
echo "📋 Últimos logs (Ctrl+C para salir):"
sleep 1
pm2 logs dann-salud-backend --lines 30
