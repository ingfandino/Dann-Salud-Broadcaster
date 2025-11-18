#!/bin/bash
# Script para ver estado del backend

echo "📊 Estado del backend:"
echo ""
pm2 list

echo ""
echo "🔍 Procesos en puerto 5000:"
lsof -ti:5000 && lsof -i:5000 || echo "Puerto 5000 libre"

echo ""
echo "💾 Uso de memoria:"
pm2 show dann-salud-backend | grep -A 5 "Monitoring"
