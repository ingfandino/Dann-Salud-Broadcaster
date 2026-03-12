#!/bin/bash
# Script para iniciar el servidor limpiando procesos previos

echo "🧹 Limpiando procesos previos en puerto 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
sleep 1

echo "🚀 Iniciando servidor..."
npm start
