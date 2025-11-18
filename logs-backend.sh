#!/bin/bash
# Script para ver logs del backend

echo "📋 Logs del backend (Ctrl+C para salir):"
echo ""
pm2 logs dann-salud-backend --lines 50
