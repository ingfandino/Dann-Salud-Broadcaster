#!/bin/bash
# Gestor interactivo del backend de Dann Salud

clear
echo "╔════════════════════════════════════════╗"
echo "║   🚀 Dann Salud Backend Manager       ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Selecciona una opción:"
echo ""
echo "  1) 🔄 Reiniciar backend"
echo "  2) 📋 Ver logs (tiempo real)"
echo "  3) 📊 Ver estado"
echo "  4) 🛑 Detener backend"
echo "  5) 🧹 Limpiar logs antiguos"
echo "  6) ❌ Salir"
echo ""
read -p "Opción [1-6]: " option

case $option in
    1)
        echo ""
        echo "🔄 Reiniciando backend..."
        ./restart-backend.sh
        ;;
    2)
        echo ""
        ./logs-backend.sh
        ;;
    3)
        echo ""
        ./status-backend.sh
        echo ""
        read -p "Presiona Enter para continuar..."
        ;;
    4)
        echo ""
        ./stop-backend.sh
        echo ""
        read -p "Presiona Enter para continuar..."
        ;;
    5)
        echo ""
        echo "🧹 Limpiando logs..."
        pm2 flush dann-salud-backend
        echo "✅ Logs limpiados"
        echo ""
        read -p "Presiona Enter para continuar..."
        ;;
    6)
        echo ""
        echo "👋 ¡Hasta luego!"
        exit 0
        ;;
    *)
        echo ""
        echo "❌ Opción inválida"
        exit 1
        ;;
esac
