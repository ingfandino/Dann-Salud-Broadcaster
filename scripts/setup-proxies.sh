#!/bin/bash

# Script de Configuración de Proxies - Dann Salud Broadcaster
# Facilita la configuración de proxies únicos por usuario

set -e

BACKEND_DIR="/home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend"
ENV_FILE="$BACKEND_DIR/.env"
SESSION_DIR="/home/dann-salud/.wwebjs_auth_multi"

echo "=========================================="
echo "  Configuración de Proxies Multi-Usuario"
echo "=========================================="
echo ""

# Función para obtener IDs de usuarios
function get_user_ids() {
    echo "📋 Obteniendo IDs de usuarios de MongoDB..."
    echo ""
    
    mongosh --quiet dannsalud --eval "
        db.users.find({}, {_id: 1, username: 1, email: 1}).forEach(u => {
            print(u._id.toString().replace('ObjectId(\"', '').replace('\")', '') + ' | ' + u.username + ' | ' + u.email);
        });
    " | grep -v "^$"
}

# Función para verificar proxy
function test_proxy() {
    local proxy_url=$1
    echo -n "Verificando proxy... "
    
    if curl -s -x "$proxy_url" --connect-timeout 5 http://ifconfig.me > /dev/null 2>&1; then
        local ip=$(curl -s -x "$proxy_url" --connect-timeout 5 http://ifconfig.me)
        echo "✅ OK (IP: $ip)"
        return 0
    else
        echo "❌ FALLÓ"
        return 1
    fi
}

# Función para agregar proxy al .env
function add_proxy_to_env() {
    local user_id=$1
    local proxy_url=$2
    
    # Verificar si ya existe
    if grep -q "PROXY_USER_$user_id" "$ENV_FILE"; then
        echo "⚠️  Ya existe configuración para usuario $user_id"
        read -p "¿Sobrescribir? (s/n): " confirm
        if [[ $confirm != "s" ]]; then
            return
        fi
        # Eliminar línea existente
        sed -i "/PROXY_USER_$user_id/d" "$ENV_FILE"
    fi
    
    # Agregar nueva línea
    echo "PROXY_USER_$user_id=$proxy_url" >> "$ENV_FILE"
    echo "✅ Configuración agregada"
}

# Menú principal
echo "Opciones:"
echo "1. Ver usuarios y sus IDs"
echo "2. Configurar proxy para usuario"
echo "3. Verificar configuración de proxies"
echo "4. Probar todos los proxies"
echo "5. Limpiar sesiones antiguas"
echo "6. Reiniciar servidor"
echo "0. Salir"
echo ""
read -p "Selecciona una opción: " option

case $option in
    1)
        echo ""
        echo "📋 Usuarios registrados:"
        echo "=================================================="
        echo "ID                        | Usuario     | Email"
        echo "=================================================="
        get_user_ids
        echo "=================================================="
        ;;
        
    2)
        echo ""
        echo "📝 Configurar proxy para usuario"
        echo ""
        
        # Mostrar usuarios
        echo "Usuarios disponibles:"
        echo "=================================================="
        get_user_ids
        echo "=================================================="
        echo ""
        
        read -p "ID del usuario: " user_id
        read -p "URL del proxy (http://user:pass@host:port): " proxy_url
        
        echo ""
        
        # Verificar proxy
        if test_proxy "$proxy_url"; then
            add_proxy_to_env "$user_id" "$proxy_url"
        else
            echo "❌ El proxy no funciona. No se agregará a la configuración."
            exit 1
        fi
        ;;
        
    3)
        echo ""
        echo "🔍 Configuración actual de proxies:"
        echo "=================================================="
        
        if grep -q "PROXY_USER_" "$ENV_FILE"; then
            grep "PROXY_USER_" "$ENV_FILE" | while read line; do
                user_id=$(echo "$line" | cut -d'=' -f1 | sed 's/PROXY_USER_//')
                proxy_url=$(echo "$line" | cut -d'=' -f2-)
                
                # Obtener username
                username=$(mongosh --quiet dannsalud --eval "
                    var ObjectId = require('mongodb').ObjectId;
                    var user = db.users.findOne({_id: ObjectId('$user_id')});
                    if (user) print(user.username); else print('(no encontrado)');
                " 2>/dev/null | tail -1)
                
                # Ocultar password en proxy
                safe_proxy=$(echo "$proxy_url" | sed 's/:\/\/.*@/:\/\/***@/')
                
                echo "Usuario: $username (ID: $user_id)"
                echo "Proxy:   $safe_proxy"
                echo ""
            done
        else
            echo "⚠️  No hay proxies configurados"
        fi
        
        echo "=================================================="
        ;;
        
    4)
        echo ""
        echo "🧪 Probando todos los proxies configurados..."
        echo "=================================================="
        
        if grep -q "PROXY_USER_" "$ENV_FILE"; then
            all_ok=true
            
            grep "PROXY_USER_" "$ENV_FILE" | while read line; do
                user_id=$(echo "$line" | cut -d'=' -f1 | sed 's/PROXY_USER_//')
                proxy_url=$(echo "$line" | cut -d'=' -f2-)
                
                # Obtener username
                username=$(mongosh --quiet dannsalud --eval "
                    var ObjectId = require('mongodb').ObjectId;
                    var user = db.users.findOne({_id: ObjectId('$user_id')});
                    if (user) print(user.username); else print('(desconocido)');
                " 2>/dev/null | tail -1)
                
                echo -n "Usuario $username: "
                
                if ! test_proxy "$proxy_url"; then
                    all_ok=false
                fi
            done
            
            echo "=================================================="
            
            if $all_ok; then
                echo "✅ Todos los proxies funcionan correctamente"
            else
                echo "❌ Algunos proxies tienen problemas"
            fi
        else
            echo "⚠️  No hay proxies configurados"
        fi
        ;;
        
    5)
        echo ""
        echo "🧹 Limpiando sesiones antiguas..."
        
        if [ -d "$SESSION_DIR" ]; then
            read -p "¿Estás seguro? Esto eliminará todas las sesiones de WhatsApp (s/n): " confirm
            if [[ $confirm == "s" ]]; then
                rm -rf "$SESSION_DIR"/*
                echo "✅ Sesiones eliminadas"
                echo ""
                echo "⚠️  Los usuarios deberán escanear QR nuevamente"
            else
                echo "Cancelado"
            fi
        else
            echo "⚠️  No hay sesiones guardadas"
        fi
        ;;
        
    6)
        echo ""
        echo "🔄 Reiniciando servidor..."
        
        # Detener servidor
        pkill -f "node.*server.js" 2>/dev/null && echo "✅ Servidor detenido" || echo "⚠️  Servidor no estaba corriendo"
        
        # Esperar un segundo
        sleep 1
        
        # Iniciar servidor en background
        cd "$BACKEND_DIR"
        nohup npm start > /dev/null 2>&1 &
        
        echo "✅ Servidor iniciado"
        echo ""
        echo "Ver logs con: tail -f $BACKEND_DIR/logs/combined.log"
        ;;
        
    0)
        echo "Saliendo..."
        exit 0
        ;;
        
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "✅ Operación completada"
