#!/bin/bash

# Script para configurar Squid Proxy local como intermediario
# Evita problemas de autenticación de Chromium con proxies externos

set -e

echo "=========================================="
echo "  Configuración de Squid Proxy Local"
echo "=========================================="
echo ""

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
   echo "❌ Este script debe ejecutarse como root (usa sudo)"
   exit 1
fi

# Instalar Squid si no está instalado
echo "📦 Verificando instalación de Squid..."
if ! command -v squid &> /dev/null; then
    echo "Instalando Squid..."
    apt update
    apt install squid -y
    echo "✅ Squid instalado"
else
    echo "✅ Squid ya está instalado"
fi

# Detener Squid si está corriendo
systemctl stop squid 2>/dev/null || true

# Backup de configuración original
if [ -f /etc/squid/squid.conf ] && [ ! -f /etc/squid/squid.conf.backup ]; then
    cp /etc/squid/squid.conf /etc/squid/squid.conf.backup
    echo "✅ Backup de configuración original creado"
fi

echo ""
echo "=========================================="
echo "  Configurando Proxy 1 (Puerto 3128)"
echo "=========================================="
echo ""
echo "Proxy externo: 31.59.20.176:6754"
echo "Usuario: erylbmeo"
echo ""

# Crear configuración para primer proxy
cat > /etc/squid/squid.conf << 'EOF'
# ============================================
# Squid Proxy 1 - Reenvío a Webshare
# Puerto local: 3128
# ============================================

# Puerto de escucha local (sin autenticación)
http_port 3128

# Proxy padre (Webshare) con autenticación
cache_peer 31.59.20.176 parent 6754 0 no-query login=erylbmeo:lgfi3yxwe1zh

# Forzar uso del proxy padre
never_direct allow all

# Control de acceso
acl localnet src 127.0.0.1
acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12
acl localnet src 192.168.0.0/16
acl localnet src fc00::/7
acl localnet src fe80::/10

acl SSL_ports port 443
acl Safe_ports port 80
acl Safe_ports port 21
acl Safe_ports port 443
acl Safe_ports port 70
acl Safe_ports port 210
acl Safe_ports port 1025-65535
acl Safe_ports port 280
acl Safe_ports port 488
acl Safe_ports port 591
acl Safe_ports port 777
acl CONNECT method CONNECT

# Reglas de acceso
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localhost manager
http_access deny manager
http_access allow localnet
http_access allow localhost
http_access deny all

# Configuración de caché
cache_dir ufs /var/spool/squid 100 16 256
coredump_dir /var/spool/squid

# Logging
access_log /var/log/squid/access.log squid
cache_log /var/log/squid/cache.log

# No mostrar versión de Squid
httpd_suppress_version_string on

# Timeout
read_timeout 5 minutes
request_timeout 5 minutes

# Refresh patterns
refresh_pattern ^ftp:           1440    20%     10080
refresh_pattern ^gopher:        1440    0%      1440
refresh_pattern -i (/cgi-bin/|\?) 0     0%      0
refresh_pattern .               0       20%     4320
EOF

echo "✅ Configuración del Proxy 1 creada"

# Inicializar caché si es necesario
if [ ! -d /var/spool/squid/00 ]; then
    echo "Inicializando caché de Squid..."
    squid -z
    echo "✅ Caché inicializado"
fi

# Iniciar Squid
echo "Iniciando Squid..."
systemctl start squid
systemctl enable squid

# Esperar a que inicie
sleep 3

# Verificar que esté corriendo
if systemctl is-active --quiet squid; then
    echo "✅ Squid Proxy 1 está corriendo en puerto 3128"
else
    echo "❌ Error: Squid no pudo iniciar"
    echo "Ver logs con: sudo journalctl -xeu squid"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Configurando Proxy 2 (Puerto 3129)"
echo "=========================================="
echo ""
echo "Proxy externo: 142.111.48.253:7030"
echo "Usuario: erylbmeo"
echo ""

# Para el segundo proxy, necesitamos otra instancia de Squid
# Crear directorio para segunda instancia
mkdir -p /etc/squid2
mkdir -p /var/spool/squid2
mkdir -p /var/log/squid2

# Crear configuración para segundo proxy
cat > /etc/squid2/squid.conf << 'EOF'
# ============================================
# Squid Proxy 2 - Reenvío a Webshare
# Puerto local: 3129
# ============================================

# Puerto de escucha local (sin autenticación)
http_port 3129

# Proxy padre (Webshare) con autenticación
cache_peer 142.111.48.253 parent 7030 0 no-query login=erylbmeo:lgfi3yxwe1zh

# Forzar uso del proxy padre
never_direct allow all

# Control de acceso
acl localnet src 127.0.0.1
acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12
acl localnet src 192.168.0.0/16
acl localnet src fc00::/7
acl localnet src fe80::/10

acl SSL_ports port 443
acl Safe_ports port 80
acl Safe_ports port 21
acl Safe_ports port 443
acl Safe_ports port 70
acl Safe_ports port 210
acl Safe_ports port 1025-65535
acl Safe_ports port 280
acl Safe_ports port 488
acl Safe_ports port 591
acl Safe_ports port 777
acl CONNECT method CONNECT

# Reglas de acceso
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localhost manager
http_access deny manager
http_access allow localnet
http_access allow localhost
http_access deny all

# Configuración de caché
cache_dir ufs /var/spool/squid2 100 16 256
coredump_dir /var/spool/squid2

# Logging
access_log /var/log/squid2/access.log squid
cache_log /var/log/squid2/cache.log

# PID file diferente
pid_filename /var/run/squid2.pid

# No mostrar versión de Squid
httpd_suppress_version_string on

# Timeout
read_timeout 5 minutes
request_timeout 5 minutes

# Refresh patterns
refresh_pattern ^ftp:           1440    20%     10080
refresh_pattern ^gopher:        1440    0%      1440
refresh_pattern -i (/cgi-bin/|\?) 0     0%      0
refresh_pattern .               0       20%     4320
EOF

echo "✅ Configuración del Proxy 2 creada"

# Cambiar permisos
chown -R proxy:proxy /var/spool/squid2
chown -R proxy:proxy /var/log/squid2
chmod 755 /var/spool/squid2
chmod 755 /var/log/squid2

# Inicializar caché
if [ ! -d /var/spool/squid2/00 ]; then
    echo "Inicializando caché de Squid2..."
    squid -f /etc/squid2/squid.conf -z
    echo "✅ Caché inicializado"
fi

# Crear servicio systemd para segunda instancia
cat > /etc/systemd/system/squid2.service << 'EOF'
[Unit]
Description=Squid Proxy 2
After=network.target

[Service]
Type=forking
PIDFile=/var/run/squid2.pid
ExecStart=/usr/sbin/squid -f /etc/squid2/squid.conf -sYC
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd
systemctl daemon-reload

# Iniciar segunda instancia
echo "Iniciando Squid Proxy 2..."
systemctl start squid2
systemctl enable squid2

# Esperar a que inicie
sleep 3

# Verificar que esté corriendo
if systemctl is-active --quiet squid2; then
    echo "✅ Squid Proxy 2 está corriendo en puerto 3129"
else
    echo "❌ Error: Squid2 no pudo iniciar"
    echo "Ver logs con: sudo journalctl -xeu squid2"
    exit 1
fi

echo ""
echo "=========================================="
echo "  ✅ Configuración Completada"
echo "=========================================="
echo ""
echo "Proxies locales configurados:"
echo ""
echo "  Proxy 1 (Daniel): http://127.0.0.1:3128"
echo "  └─> Reenvía a: 31.59.20.176:6754"
echo ""
echo "  Proxy 2 (Mateo): http://127.0.0.1:3129"
echo "  └─> Reenvía a: 142.111.48.253:7030"
echo ""
echo "=========================================="
echo "  🧪 Probando Conexiones"
echo "=========================================="
echo ""

# Test Proxy 1
echo -n "Probando Proxy 1... "
if curl -s -x http://127.0.0.1:3128 --connect-timeout 10 http://ifconfig.me > /tmp/proxy1_test.txt 2>&1; then
    IP1=$(cat /tmp/proxy1_test.txt)
    echo "✅ OK (IP: $IP1)"
else
    echo "❌ FALLÓ"
fi

# Test Proxy 2
echo -n "Probando Proxy 2... "
if curl -s -x http://127.0.0.1:3129 --connect-timeout 10 http://ifconfig.me > /tmp/proxy2_test.txt 2>&1; then
    IP2=$(cat /tmp/proxy2_test.txt)
    echo "✅ OK (IP: $IP2)"
else
    echo "❌ FALLÓ"
fi

echo ""
echo "=========================================="
echo "  📝 Próximos Pasos"
echo "=========================================="
echo ""
echo "1. Actualizar backend/.env con:"
echo ""
echo "   PROXY_USER_68e3f605f2d61bb5556b7b20=http://127.0.0.1:3128"
echo "   PROXY_USER_68f65c8b97693bd9803fd67c=http://127.0.0.1:3129"
echo ""
echo "2. Reiniciar el servidor Node.js:"
echo ""
echo "   pkill -f 'node.*server.js'"
echo "   cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend"
echo "   npm start"
echo ""
echo "3. Probar generando QR en la plataforma"
echo ""
echo "=========================================="
echo "  📊 Comandos Útiles"
echo "=========================================="
echo ""
echo "Ver estado de proxies:"
echo "  sudo systemctl status squid"
echo "  sudo systemctl status squid2"
echo ""
echo "Ver logs:"
echo "  sudo tail -f /var/log/squid/access.log"
echo "  sudo tail -f /var/log/squid2/access.log"
echo ""
echo "Reiniciar proxies:"
echo "  sudo systemctl restart squid"
echo "  sudo systemctl restart squid2"
echo ""
echo "✅ Instalación completada exitosamente"
