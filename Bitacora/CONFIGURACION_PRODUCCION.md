# 🚀 Guía de Configuración para Producción

## Servidor Dann-Salud-Broadcaster

Este documento detalla la configuración completa para desplegar el sistema en **modo PRODUCCIÓN**.

---

## 📋 Requisitos Previos

### 1. MongoDB con Autenticación

En producción, MongoDB **DEBE** tener autenticación habilitada.

#### Configurar MongoDB con Autenticación

```bash
# 1. Conectar a MongoDB sin autenticación (solo la primera vez)
sudo mongosh

# 2. Crear usuario administrador
use admin
db.createUser({
  user: "adminDannSalud",
  pwd: "TU_PASSWORD_SEGURO_AQUI",  // CAMBIAR ESTO
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})

# 3. Crear usuario específico para la base de datos
use dann-salud-broadcaster
db.createUser({
  user: "dann_app",
  pwd: "PASSWORD_APLICACION_SEGURO",  // CAMBIAR ESTO
  roles: [ { role: "readWrite", db: "dann-salud-broadcaster" } ]
})

# 4. Salir
exit
```

#### Habilitar Autenticación en MongoDB

```bash
# Editar configuración de MongoDB
sudo nano /etc/mongod.conf

# Agregar estas líneas:
security:
  authorization: enabled

# Reiniciar MongoDB
sudo systemctl restart mongod

# Verificar que funciona
mongosh -u adminDannSalud -p --authenticationDatabase admin
```

---

## ⚙️ Configuración del Archivo .env

Edita el archivo `.env` en el backend:

```bash
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
nano .env
```

### Configuración Mínima Obligatoria

```bash
# ===================================
# CONFIGURACIÓN DE PRODUCCIÓN
# ===================================

# --- BASE DE DATOS ---
# Usar el usuario creado anteriormente
MONGODB_URI=mongodb://dann_app:PASSWORD_APLICACION_SEGURO@localhost:27017/dann-salud-broadcaster?authSource=dann-salud-broadcaster

# --- SERVIDOR ---
PORT=5000
HOST=0.0.0.0
NODE_ENV=production

# --- SEGURIDAD ---
# ⚠️ IMPORTANTE: Generar un JWT_SECRET único y seguro
# Generar con: openssl rand -base64 64
JWT_SECRET=AQUI_TU_CLAVE_GENERADA_CON_OPENSSL

# Origenes permitidos (IPs y dominios de tu red/servidor)
ALLOWED_ORIGINS=http://192.168.1.94:5000,http://100.65.25.95:5000,http://tudominio.com

# --- WHATSAPP ---
USE_MULTI_SESSION=true
WHATSAPP_SESSION_BASE=/home/dann-salud/whatsapp-sessions
MAX_CONCURRENT_JOBS=2
MAX_CONCURRENT_CONNECTIONS=5

# --- RECUPERACIÓN ---
WA_RESET_MAX_ATTEMPTS=2
AUTORESPONSE_WINDOW_MINUTES=30

# --- FRONTEND ---
FRONTEND_BUILD_PATH=/home/dann-salud/Documentos/Dann-Salud-Broadcaster/frontend/dist
PROTECT_UPLOADS=true
```

---

## 🔐 Generar JWT_SECRET Seguro

```bash
# Generar clave segura de 64 caracteres
openssl rand -base64 64

# Copiar el resultado y pegarlo en .env como JWT_SECRET
```

---

## 📁 Preparar Directorios

```bash
# Crear directorio para sesiones de WhatsApp
sudo mkdir -p /home/dann-salud/whatsapp-sessions
sudo chown dann-salud:dann-salud /home/dann-salud/whatsapp-sessions
sudo chmod 750 /home/dann-salud/whatsapp-sessions

# Crear directorio para logs
sudo mkdir -p /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/logs
sudo chown dann-salud:dann-salud /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/logs

# Crear directorio para uploads
sudo mkdir -p /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/uploads
sudo chown dann-salud:dann-salud /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/uploads
```

---

## 🔒 Firewall y Seguridad

```bash
# Permitir solo puertos necesarios
sudo ufw allow 5000/tcp   # Backend
sudo ufw allow 27017/tcp  # MongoDB (solo si necesitas acceso externo)
sudo ufw enable

# Verificar estado
sudo ufw status
```

---

## 🚀 Despliegue con PM2 (Process Manager)

PM2 mantiene el servidor corriendo, reinicia automáticamente en caso de crash, y gestiona logs.

### Instalar PM2 globalmente

```bash
sudo npm install -g pm2
```

### Configurar PM2

Crea un archivo de configuración PM2:

```bash
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
nano ecosystem.config.js
```

Contenido:

```javascript
module.exports = {
  apps: [{
    name: 'dann-salud-broadcaster',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
```

### Iniciar la Aplicación

```bash
# Iniciar con PM2
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs dann-salud-broadcaster

# Reiniciar
pm2 restart dann-salud-broadcaster

# Detener
pm2 stop dann-salud-broadcaster
```

### Arranque Automático al Reiniciar el Servidor

```bash
# Configurar PM2 para iniciar al arrancar
pm2 startup systemd

# Guardar la configuración actual
pm2 save
```

---

## 🌐 Nginx como Proxy Inverso (Opcional pero Recomendado)

### Instalar Nginx

```bash
sudo apt install nginx -y
```

### Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/dann-salud-broadcaster
```

Contenido:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;  # O la IP del servidor

    # Logs
    access_log /var/log/nginx/dann-salud-broadcaster-access.log;
    error_log /var/log/nginx/dann-salud-broadcaster-error.log;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend estático
    location / {
        root /home/dann-salud/Documentos/Dann-Salud-Broadcaster/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Uploads
    location /uploads/ {
        alias /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/uploads/;
    }
}
```

### Habilitar Configuración

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/dann-salud-broadcaster /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 📊 Monitoreo

### Ver Logs del Sistema

```bash
# Logs de PM2
pm2 logs dann-salud-broadcaster

# Logs de la aplicación
tail -f /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/logs/combined.log

# Health checks
tail -f /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/logs/combined.log | grep "Health Check"

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Monitoreo con PM2

```bash
# Dashboard en tiempo real
pm2 monit

# Métricas
pm2 status
```

---

## 🔄 Actualización del Sistema

```bash
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster

# Hacer backup de .env
cp backend/.env backend/.env.backup

# Actualizar código
git pull origin main

# Actualizar dependencias backend
cd backend
npm install

# Actualizar dependencias frontend
cd ../frontend
npm install

# Reconstruir frontend
npm run build

# Reiniciar aplicación
pm2 restart dann-salud-broadcaster
```

---

## 🛡️ Backup de Base de Datos

```bash
# Crear backup manual
mongodump --uri="mongodb://dann_app:PASSWORD@localhost:27017/dann-salud-broadcaster" --out=/home/dann-salud/backups/$(date +%Y%m%d)

# Restaurar backup
mongorestore --uri="mongodb://dann_app:PASSWORD@localhost:27017/dann-salud-broadcaster" /home/dann-salud/backups/20251030/dann-salud-broadcaster/
```

### Backup Automático (Cron)

```bash
# Editar crontab
crontab -e

# Agregar backup diario a las 3 AM
0 3 * * * mongodump --uri="mongodb://dann_app:PASSWORD@localhost:27017/dann-salud-broadcaster" --out=/home/dann-salud/backups/$(date +\%Y\%m\%d) && find /home/dann-salud/backups/ -type d -mtime +7 -exec rm -rf {} +
```

---

## ✅ Checklist de Producción

- [ ] MongoDB con autenticación habilitada
- [ ] JWT_SECRET generado con `openssl rand -base64 64`
- [ ] NODE_ENV=production en .env
- [ ] MONGODB_URI con credenciales correctas
- [ ] ALLOWED_ORIGINS configurado con IPs/dominios reales
- [ ] PM2 instalado y configurado
- [ ] PM2 configurado para arranque automático
- [ ] Firewall (UFW) habilitado
- [ ] Nginx configurado (opcional)
- [ ] Backup automático de MongoDB configurado
- [ ] Logs siendo generados correctamente
- [ ] WhatsApp multi-sesión activo (USE_MULTI_SESSION=true)

---

## 🆘 Troubleshooting

### Error: "Cannot connect to MongoDB"

```bash
# Verificar que MongoDB está corriendo
sudo systemctl status mongod

# Ver logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Verificar credenciales
mongosh -u dann_app -p --authenticationDatabase dann-salud-broadcaster
```

### Error: "JWT_SECRET inseguro"

```bash
# Generar nuevo JWT_SECRET
openssl rand -base64 64

# Actualizar .env con el nuevo valor
nano backend/.env
```

### Servidor no arranca

```bash
# Ver logs de PM2
pm2 logs dann-salud-broadcaster --lines 50

# Verificar .env
cat backend/.env | grep -E "NODE_ENV|MONGODB_URI|JWT_SECRET"
```

---

## 📞 Soporte

Para problemas o dudas:
1. Revisar logs en `backend/logs/combined.log`
2. Ejecutar `pm2 logs dann-salud-broadcaster`
3. Verificar configuración con `./scripts/verify-fixes.sh`

---

**Fecha de actualización**: 30 de Octubre, 2025  
**Versión**: Producción 1.0.0
