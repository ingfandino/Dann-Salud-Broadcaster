# 🌐 Configuración de Proxies - Solución Definitiva para Multisesión

## 🎯 Problema Confirmado

**WhatsApp detecta múltiples sesiones desde la misma IP (VPN compartida) y las desvincula.**

```
20 usuarios → Todos con VPN → Misma IP (100.65.25.95)
6 usuarios necesitan WhatsApp → Todos escanean QR
WhatsApp ve: 6 sesiones desde 100.65.25.95 → 🚨 SPAM/BOT → LOGOUT
```

## ✅ Solución: Proxy Único por Usuario

El sistema **ya tiene el código implementado**. Solo necesitas configurar un proxy diferente para cada uno de los 6 usuarios que usarán WhatsApp.

---

## 📋 Paso 1: Obtener IDs de Usuario

Primero necesitas los IDs de MongoDB de los 6 usuarios que usarán WhatsApp.

```bash
# Conectar a MongoDB
mongosh

# Seleccionar base de datos
use dannsalud

# Ver usuarios
db.users.find({}, {_id: 1, username: 1, email: 1}).pretty()
```

**Salida ejemplo:**
```javascript
{
  _id: ObjectId("68e3f605f2d61bb5556b7b20"),
  username: "gerencia",
  email: "gerencia@dannsalud.com"
}
{
  _id: ObjectId("68f65c8b97693bd9803fd67c"),
  username: "supervisor1",
  email: "supervisor1@dannsalud.com"
}
{
  _id: ObjectId("68f8fdde8938d54c31b97fc6"),
  username: "supervisor2",
  email: "supervisor2@dannsalud.com"
}
// ... etc
```

**Copia los `_id` (solo la parte hexadecimal):**
- Usuario 1: `68e3f605f2d61bb5556b7b20`
- Usuario 2: `68f65c8b97693bd9803fd67c`
- Usuario 3: `68f8fdde8938d54c31b97fc6`
- ... (6 usuarios en total)

---

## 📋 Paso 2: Obtener Proxies

Necesitas **6 proxies HTTP/HTTPS diferentes** con IPs únicas.

### Opción A: Servicios de Proxy Residenciales (Recomendado) ⭐⭐⭐⭐⭐

**1. Bright Data (ex-Luminati)**
- URL: https://brightdata.com/proxy-types/residential-proxies
- Costo: ~$500/mes por 20GB (6 usuarios usan ~10-15GB/mes)
- Ventaja: IPs residenciales reales (difícil de detectar)

**2. SmartProxy**
- URL: https://smartproxy.com/
- Costo: ~$75/mes por 8GB
- Ventaja: Buen balance precio/calidad

**3. Oxylabs**
- URL: https://oxylabs.io/products/residential-proxy-pool
- Costo: ~$300/mes por 20GB

### Opción B: Proxies Dedicados (Más Económico) ⭐⭐⭐⭐

**1. Webshare.io**
- URL: https://www.webshare.io/
- Costo: ~$50/mes por 10 proxies dedicados
- Ventaja: IP fija, buen precio

**2. ProxyScrape**
- URL: https://proxyscrape.com/premium-residential-proxies
- Costo: ~$60/mes por 10 proxies

**3. MyPrivateProxy**
- URL: https://www.myprivateproxy.net/
- Costo: ~$36/mes por 10 proxies HTTP

### Opción C: Servidores VPS con IPs Diferentes (DIY) ⭐⭐⭐

**Contratar 6 VPS pequeños en diferentes ubicaciones:**

**DigitalOcean / Linode / Vultr:**
```
VPS 1 (Nueva York):    IP 45.55.123.10
VPS 2 (San Francisco): IP 159.89.45.20
VPS 3 (Toronto):       IP 167.99.78.30
VPS 4 (Londres):       IP 178.62.90.40
VPS 5 (Amsterdam):     IP 188.166.12.50
VPS 6 (Singapur):      IP 192.241.34.60

Costo: ~$30/mes (6 VPS × $5/mes)
```

**Instalar Squid Proxy en cada VPS:**
```bash
# En cada VPS, ejecutar:
sudo apt update
sudo apt install squid -y

# Configurar autenticación básica
sudo htpasswd -c /etc/squid/passwd usuario1

# Editar configuración
sudo nano /etc/squid/squid.conf
```

**Configuración básica de Squid:**
```bash
# /etc/squid/squid.conf
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm proxy
acl authenticated proxy_auth REQUIRED
http_access allow authenticated

# Puerto
http_port 3128

# Restart
sudo systemctl restart squid
```

**Resultado:**
```
http://usuario1:password@45.55.123.10:3128
http://usuario2:password@159.89.45.20:3128
http://usuario3:password@178.62.90.40:3128
...
```

---

## 📋 Paso 3: Configurar Proxies en el Sistema

### Editar `.env` del Backend

```bash
nano /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/.env
```

### Agregar Variables de Proxy por Usuario

**Formato:** `PROXY_USER_<userId>=<proxy_url>`

```bash
# ===================================
# PROXIES POR USUARIO (Multisesión WhatsApp)
# ===================================

# Usuario 1: gerencia
PROXY_USER_68e3f605f2d61bb5556b7b20=http://usuario1:password@proxy1.example.com:8080

# Usuario 2: supervisor1
PROXY_USER_68f65c8b97693bd9803fd67c=http://usuario2:password@proxy2.example.com:8080

# Usuario 3: supervisor2
PROXY_USER_68f8fdde8938d54c31b97fc6=http://usuario3:password@proxy3.example.com:8080

# Usuario 4: asesor_senior1
PROXY_USER_68f9abc1234567890abcdef0=http://usuario4:password@proxy4.example.com:8080

# Usuario 5: asesor_senior2
PROXY_USER_68fadef9876543210fedcba0=http://usuario5:password@proxy5.example.com:8080

# Usuario 6: marketing
PROXY_USER_68fb123456789abcdef01234=http://usuario6:password@proxy6.example.com:8080
```

**Ejemplo con Webshare.io:**
```bash
PROXY_USER_68e3f605f2d61bb5556b7b20=http://username-rotate:password@p.webshare.io:80
PROXY_USER_68f65c8b97693bd9803fd67c=http://username-rotate:password@p.webshare.io:80
# ... (Webshare rota IPs automáticamente)
```

**Ejemplo con VPS propios:**
```bash
PROXY_USER_68e3f605f2d61bb5556b7b20=http://dann:S3cr3t@45.55.123.10:3128
PROXY_USER_68f65c8b97693bd9803fd67c=http://dann:S3cr3t@159.89.45.20:3128
PROXY_USER_68f8fdde8938d54c31b97fc6=http://dann:S3cr3t@167.99.78.30:3128
PROXY_USER_68f9abc1234567890abcdef0=http://dann:S3cr3t@178.62.90.40:3128
PROXY_USER_68fadef9876543210fedcba0=http://dann:S3cr3t@188.166.12.50:3128
PROXY_USER_68fb123456789abcdef01234=http://dann:S3cr3t@192.241.34.60:3128
```

### Guardar y Reiniciar Servidor

```bash
# Detener servidor
pkill -f "node.*server.js"

# Limpiar sesiones antiguas
rm -rf /home/dann-salud/.wwebjs_auth_multi/*

# Reiniciar servidor
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
npm start
```

---

## 📋 Paso 4: Verificar Configuración

### Ver Logs al Inicializar

```bash
tail -f /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/logs/combined.log
```

**Deberías ver:**
```
[WA][68e3f605f2d61bb5556b7b20] Usando proxy: http://***@proxy1.example.com:8080
[WA][68f65c8b97693bd9803fd67c] Usando proxy: http://***@proxy2.example.com:8080
[WA][68f8fdde8938d54c31b97fc6] Usando proxy: http://***@proxy3.example.com:8080
...
```

### Vincular WhatsApp (Uno por Uno)

```
⏰ 00:00 → Usuario 1 escanea QR → Espera "Ready" (2 minutos)
⏰ 02:00 → Usuario 2 escanea QR → Espera "Ready" (2 minutos)
⏰ 04:00 → Usuario 3 escanea QR → Espera "Ready" (2 minutos)
⏰ 06:00 → Usuario 4 escanea QR → Espera "Ready" (2 minutos)
⏰ 08:00 → Usuario 5 escanea QR → Espera "Ready" (2 minutos)
⏰ 10:00 → Usuario 6 escanea QR → Espera "Ready"
```

**Resultado Esperado:**
```
[WA][user1] Ready ✅
[WA][user2] Ready ✅
[WA][user3] Ready ✅
[WA][user4] Ready ✅
[WA][user5] Ready ✅
[WA][user6] Ready ✅
```

**SIN mensajes de LOGOUT.**

---

## 🔍 Verificar IPs Únicas

### Verificar que Cada Usuario Usa IP Diferente

Cada proxy debe mostrar una IP pública diferente. Puedes verificar:

```bash
# Instalar curl si no está
sudo apt install curl -y

# Probar cada proxy
curl -x http://usuario1:password@proxy1.example.com:8080 http://ifconfig.me
curl -x http://usuario2:password@proxy2.example.com:8080 http://ifconfig.me
curl -x http://usuario3:password@proxy3.example.com:8080 http://ifconfig.me
# ... deben mostrar IPs DIFERENTES
```

**Resultado esperado:**
```
45.55.123.10    ← Proxy 1
159.89.45.20    ← Proxy 2
167.99.78.30    ← Proxy 3
178.62.90.40    ← Proxy 4
188.166.12.50   ← Proxy 5
192.241.34.60   ← Proxy 6
```

---

## 🛠️ Script de Ayuda: Configuración Automática

Voy a crear un script que facilite la configuración:

```bash
# Guardar en: /home/dann-salud/Documentos/Dann-Salud-Broadcaster/scripts/setup-proxies.sh
```

---

## 💰 Comparación de Costos

| Opción | Costo/Mes | Configuración | Mantenimiento | Calidad IP |
|--------|-----------|---------------|---------------|------------|
| **Bright Data** | ~$500 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **SmartProxy** | ~$75 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Webshare** | ~$50 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **VPS Propios** | ~$30 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

**Recomendación para 6 usuarios:** **Webshare** (mejor balance precio/calidad/facilidad)

---

## ⚠️ Alternativa TEMPORAL Sin Proxies

Si no puedes usar proxies inmediatamente, una **solución temporal** es vincular sin VPN:

```bash
# SOLO DURANTE LA VINCULACIÓN (5 minutos por usuario)

Usuario 1:
1. Desconectar VPN
2. Conectarse con WiFi local o datos móviles
3. Abrir http://192.168.1.94:5000
4. Escanear QR y esperar "Ready"
5. Reconectar VPN

(Esperar 2 minutos)

Usuario 2:
1. Desconectar VPN
2. Conectarse con WiFi local o datos móviles
3. Abrir http://192.168.1.94:5000
4. Escanear QR y esperar "Ready"
5. Reconectar VPN

... repetir con los 6 usuarios
```

**¿Por qué funciona?**
- WhatsApp registra la vinculación con IPs diferentes (cada WiFi/red móvil tiene IP única)
- Después de vincular, pueden usar VPN normalmente
- **Solo la vinculación inicial necesita IPs diferentes**

**Desventaja:**
- Puede no ser estable a largo plazo
- WhatsApp puede pedir revinculación aleatoriamente

---

## 🚨 Importante: Espaciar Vinculaciones

**Siempre vincular usuarios de uno en uno con 1-2 minutos entre cada uno**, incluso con proxies.

```
❌ MAL: Todos vinculan al mismo tiempo → WhatsApp detecta patrón sospechoso
✅ BIEN: Uno cada 2 minutos → Comportamiento humano natural
```

---

## ✅ Checklist de Configuración

### Antes de Empezar:
- [ ] ¿Obtuviste los 6 IDs de usuario de MongoDB?
- [ ] ¿Contrataste/configuraste 6 proxies con IPs diferentes?
- [ ] ¿Verificaste que cada proxy funciona? (`curl -x`)
- [ ] ¿Agregaste las variables `PROXY_USER_<id>` en `.env`?
- [ ] ¿Limpiaste las sesiones antiguas? (`rm -rf .wwebjs_auth_multi/*`)
- [ ] ¿Reiniciaste el servidor?

### Durante la Vinculación:
- [ ] ¿Los logs muestran "Usando proxy" para cada usuario?
- [ ] ¿Esperas 1-2 minutos entre cada vinculación?
- [ ] ¿El primer usuario se conectó exitosamente ("Ready")?
- [ ] ¿No hay mensajes de LOGOUT en los logs?

### Después de Vincular:
- [ ] ¿Los 6 usuarios siguen conectados después de 5 minutos?
- [ ] ¿Pueden enviar mensajes de prueba?
- [ ] ¿Los otros 14 usuarios pueden acceder al sistema sin problemas?

---

## 🆘 Troubleshooting

### Error: "Proxy connection failed"

**Causa:** Proxy no responde o credenciales incorrectas

**Solución:**
```bash
# Verificar proxy manualmente
curl -x http://usuario:password@proxy.com:8080 http://ifconfig.me

# Si no funciona, verificar:
# 1. URL del proxy correcta
# 2. Puerto correcto
# 3. Credenciales correctas
# 4. Firewall del servidor permite conexiones al proxy
```

### Sigue habiendo LOGOUT con proxies

**Posibles causas:**
1. **Proxies comparten la misma IP de salida**
   - Verificar con `curl -x ... ifconfig.me`
   - Cambiar a proxies con IPs garantizadas únicas

2. **Vinculaciones demasiado rápidas**
   - Espaciar más (3-5 minutos en lugar de 2)

3. **Cooldown de WhatsApp activo**
   - Esperar 1 hora después del último LOGOUT
   - Limpiar sesiones: `rm -rf .wwebjs_auth_multi/*`

---

## 📞 Comandos Útiles

```bash
# Ver configuración de proxies
grep "PROXY_USER" /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/.env

# Verificar que servidor cargó proxies
grep "Usando proxy" /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/logs/combined.log

# Probar proxy manualmente
curl -x http://user:pass@proxy.com:8080 http://ifconfig.me

# Ver usuarios conectados
grep "Ready" backend/logs/combined.log | tail -10

# Ver desconexiones
grep "LOGOUT" backend/logs/combined.log | tail -10

# Limpiar sesiones
rm -rf /home/dann-salud/.wwebjs_auth_multi/*

# Reiniciar servidor
pkill -f "node.*server.js" && cd backend && npm start
```

---

## ✅ Resumen

### El Problema
WhatsApp detecta 6 sesiones desde la misma IP (VPN compartida) y las desvincula.

### La Solución
Configurar **proxy único por usuario** para que WhatsApp vea cada sesión desde una IP diferente.

### Pasos
1. Obtener IDs de usuario de MongoDB
2. Contratar/configurar 6 proxies con IPs únicas
3. Agregar `PROXY_USER_<id>=<proxy_url>` en `.env`
4. Reiniciar servidor
5. Vincular usuarios de uno en uno (1-2 min entre cada uno)

### Resultado Esperado
```
✅ 6 usuarios con WhatsApp activo simultáneamente
✅ 14 usuarios sin WhatsApp accediendo sin problemas
✅ 20 usuarios totales trabajando sin latencia
✅ Mensajería Masiva funcional para 6 usuarios
```

---

**Última actualización:** 30 de Octubre, 2025  
**Problema:** Múltiples sesiones desde misma IP (VPN) → LOGOUT  
**Solución:** Proxy único por usuario  
**Estado:** ✅ Sistema listo, requiere configuración de proxies
