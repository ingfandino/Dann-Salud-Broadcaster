#!/bin/bash
# Script para detener el backend

echo "🛑 Deteniendo backend..."

# Detener PM2
pm2 stop dann-salud-backend

# Detener procesos en puerto 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo "✅ Puerto 5000 liberado" || echo "ℹ️  Puerto 5000 ya estaba libre"

echo ""
echo "📊 Estado actual:"
pm2 list
