# 🏢 Arquitectura Multi-Usuario - Dann Salud Broadcaster

## 📊 Escenario Real

- **20 usuarios totales** (empleados de oficina + 4 remotos)
- **5-6 usuarios necesitan enviar mensajes** (Mensajería Automática)
- **14-15 usuarios solo consultan** (reportes, contactos, logs)
- **1 servidor centralizado** con base de datos MongoDB
- **Usuarios en oficina + remotos** (red local + VPN)

---

## ✅ Arquitectura Correcta

### 🔑 Concepto Clave

**NO todos los usuarios necesitan vincular WhatsApp.**

```
┌─────────────────────────────────────────────────────────────┐
│                    20 USUARIOS TOTALES                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  👥 5-6 Usuarios con WhatsApp Vinculado                      │
│  ├── Gerencia                                                │
│  ├── Supervisor 1                                            │
│  ├── Supervisor 2                                            │
│  ├── Asesor Senior 1                                         │
│  ├── Asesor Senior 2                                         │
│  └── Marketing                                               │
│                                                               │
│  👤 14-15 Usuarios SIN WhatsApp (Solo Lectura)              │
│  ├── Asesores Junior (10 usuarios)                          │
│  ├── Recepción (2 usuarios)                                 │
│  ├── Administración (2 usuarios)                            │
│  └── Contabilidad (1 usuario)                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Sistema de Roles

### Rol: **Gerencia** (1 usuario)
- ✅ Puede vincular WhatsApp
- ✅ Puede crear/editar contactos
- ✅ Puede enviar campañas masivas
- ✅ Puede ver todos los reportes
- ✅ Puede gestionar usuarios
- ✅ Acceso completo

### Rol: **Supervisor** (2-3 usuarios)
- ✅ Puede vincular WhatsApp
- ✅ Puede crear/editar contactos
- ✅ Puede enviar campañas masivas
- ✅ Puede ver reportes de su área
- ❌ NO puede gestionar usuarios

### Rol: **Asesor** (10-15 usuarios)
- 🟡 **Solo algunos asesores** vinculan WhatsApp (2-3 asesores senior)
- ✅ Pueden ver contactos
- ✅ Pueden ver reportes básicos
- ✅ Pueden importar contactos
- ❌ NO pueden enviar campañas masivas (solo los senior con WhatsApp)
- ❌ NO pueden gestionar usuarios

### Rol: **Lectura** (2-3 usuarios)
- ❌ NO pueden vincular WhatsApp
- ✅ Solo consultan reportes
- ✅ Solo ven contactos existentes
- ❌ NO pueden modificar nada

---

## 🎯 Beneficios de Esta Arquitectura

### 1. **Menos Sesiones de WhatsApp = Más Estabilidad**

❌ **MALO:** 20 usuarios = 20 sesiones de WhatsApp
- WhatsApp detecta como bot/spam
- Imposible de mantener
- Constantes LOGOUT

✅ **BUENO:** 5-6 usuarios = 5-6 sesiones de WhatsApp
- WhatsApp lo ve como uso normal
- Fácil de mantener
- Estable y confiable

### 2. **Menos Costos**

- Solo necesitas 5-6 números de WhatsApp Business
- Los demás usuarios usan la misma base de datos sin vincular teléfono

### 3. **Mejor Control**

- Solo usuarios autorizados pueden enviar mensajes
- Auditoría clara de quién envió qué
- Previene spam accidental

---

## 🔧 Configuración en el Sistema

### 1. CORS Flexible (Ya Configurado) ✅

```bash
# .env
ALLOWED_ORIGINS=http://192.168.*.*:5000,http://10.*.*.*:5000,http://100.*.*.*:5000,http://localhost:5000
```

**Esto permite:**
- ✅ Cualquier PC en la red local (192.168.x.x)
- ✅ Cualquier PC con VPN (100.x.x.x, 10.x.x.x)
- ✅ Localhost para desarrollo

**Ya NO necesitas actualizar el .env cada vez que un usuario nuevo se conecta.**

### 2. Límites de Conexiones WhatsApp

```bash
# .env
MAX_CONCURRENT_CONNECTIONS=6    # Máximo 6 sesiones WhatsApp simultáneas
MAX_CONCURRENT_JOBS=5            # Máximo 5 trabajos de envío simultáneos
```

### 3. Crear Usuarios en la Base de Datos

```javascript
// Ejemplo de creación de usuarios con diferentes roles

// Usuarios CON WhatsApp (5-6 usuarios)
db.users.insertMany([
  {
    username: "gerencia",
    email: "gerencia@dannsalud.com",
    role: "gerencia",
    needsWhatsApp: true  // ✅ Vincula WhatsApp
  },
  {
    username: "supervisor1",
    email: "supervisor1@dannsalud.com",
    role: "supervisor",
    needsWhatsApp: true  // ✅ Vincula WhatsApp
  },
  {
    username: "asesor_senior1",
    email: "senior1@dannsalud.com",
    role: "asesor",
    needsWhatsApp: true  // ✅ Vincula WhatsApp
  }
]);

// Usuarios SIN WhatsApp (14-15 usuarios)
db.users.insertMany([
  {
    username: "asesor_junior1",
    email: "junior1@dannsalud.com",
    role: "asesor",
    needsWhatsApp: false  // ❌ NO necesita WhatsApp
  },
  {
    username: "recepcion1",
    email: "recepcion1@dannsalud.com",
    role: "lectura",
    needsWhatsApp: false  // ❌ NO necesita WhatsApp
  }
]);
```

---

## 🌐 Flujo de Conexión

### Usuarios en la Oficina (Red Local)

```
Usuario en oficina (192.168.1.50)
  ↓
Abre navegador → http://192.168.1.94:5000
  ↓
CORS: ✅ Permitido (192.168.*.* coincide)
  ↓
Inicia sesión con credenciales
  ↓
¿Necesita WhatsApp?
  ├── SÍ → Ve botón "Vincular WhatsApp" → Escanea QR
  └── NO → No ve sección de WhatsApp, solo reportes/contactos
```

### Usuarios Remotos (VPN)

```
Usuario remoto (100.65.25.95)
  ↓
Conecta VPN → IP asignada: 100.65.25.95
  ↓
Abre navegador → http://100.65.25.95:5000
  ↓
CORS: ✅ Permitido (100.*.*.* coincide)
  ↓
Resto del flujo igual que usuarios de oficina
```

---

## 📋 Procedimiento de Despliegue

### Paso 1: Reiniciar Servidor con Nueva Configuración

```bash
# 1. Detener servidor actual
pkill -f "node.*server.js"

# 2. Verificar configuración .env
cat /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/.env

# Debe incluir:
# ALLOWED_ORIGINS=http://192.168.*.*:5000,http://10.*.*.*:5000,http://100.*.*.*:5000
# MAX_CONCURRENT_CONNECTIONS=6

# 3. Reiniciar servidor
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
npm start
```

### Paso 2: Verificar CORS Funciona

```bash
# Desde cualquier PC en la red, abrir navegador:
http://192.168.1.94:5000

# Si carga correctamente = ✅ CORS funcionando
# Si aparece error CORS = ❌ Verificar patrón en ALLOWED_ORIGINS
```

### Paso 3: Vincular WhatsApp (Solo 5-6 Usuarios)

**Importante: Espaciar las vinculaciones**

```
Hora 00:00 → Gerencia vincula WhatsApp
Hora 02:00 → Supervisor 1 vincula WhatsApp (2 minutos después)
Hora 04:00 → Supervisor 2 vincula WhatsApp
Hora 06:00 → Asesor Senior 1 vincula WhatsApp
Hora 08:00 → Asesor Senior 2 vincula WhatsApp
Hora 10:00 → Marketing vincula WhatsApp
```

**Reglas:**
- ⏰ 2 minutos entre cada vinculación
- 📱 Números de WhatsApp diferentes para cada usuario
- 🌐 **IMPORTANTE:** Cada usuario debe vincular desde su IP REAL (sin VPN)

### Paso 4: Usuarios Restantes Inician Sesión

Los otros 14-15 usuarios:
1. Abren navegador → `http://<IP_SERVIDOR>:5000`
2. Inician sesión con sus credenciales
3. ✅ Ya pueden trabajar (ver contactos, reportes, importar)
4. ❌ NO ven opción de vincular WhatsApp (no la necesitan)

---

## 🚨 Solución al Problema de VPN

### El Problema Confirmado

Si los 5-6 usuarios con WhatsApp se conectan **todos desde la misma IP** (VPN compartida):

```
Usuario A (Tel A, UserA) → VPN IP: 100.65.25.95 → Escanea QR ✅
Usuario B (Tel B, UserB) → VPN IP: 100.65.25.95 → Escanea QR ❌
                                                ↓
                        WhatsApp detecta: Misma IP, múltiples sesiones
                                                ↓
                              LOGOUT en AMBAS sesiones 🚨
```

**Resultado:** WhatsApp cierra todas las sesiones detectando comportamiento de spam/bot.

### Las Soluciones

**Opción 1: Proxies Únicos por Usuario** (DEFINITIVA) ⭐⭐⭐⭐⭐

Cada usuario conecta WhatsApp a través de un proxy diferente con IP única.

```bash
Usuario A → Proxy 1 (IP: 45.55.123.10) → WhatsApp ✅
Usuario B → Proxy 2 (IP: 159.89.45.20) → WhatsApp ✅
Usuario C → Proxy 3 (IP: 167.99.78.30) → WhatsApp ✅
...

WhatsApp ve 6 IPs diferentes → ✅ FUNCIONA PERMANENTEMENTE
```

**Sistema ya tiene soporte implementado:**
```bash
# En .env, configurar:
PROXY_USER_68e3f605f2d61bb5556b7b20=http://user:pass@proxy1.com:8080
PROXY_USER_68f65c8b97693bd9803fd67c=http://user:pass@proxy2.com:8080
# ... (un proxy por cada usuario con WhatsApp)
```

**Opciones de proxies:**
- **Webshare.io:** ~$50/mes (10 proxies, fácil configuración)
- **VPS propios:** ~$30/mes (6 VPS × $5/mes, requiere Squid)
- **SmartProxy:** ~$75/mes (proxies residenciales premium)

**Ver documento completo:** `CONFIGURACION_PROXIES.md`

---

**Opción 2: Vincular sin VPN** (TEMPORAL) ⭐⭐⭐

```bash
# Solo al VINCULAR WhatsApp, desconectar VPN temporalmente
# Cada usuario vincula desde su IP real (WiFi local/datos móviles)

Usuario A → Desconecta VPN → IP real: 181.50.20.10 → Vincula ✅ → Reconecta VPN
(Espera 2 minutos)
Usuario B → Desconecta VPN → IP real: 190.80.30.50 → Vincula ✅ → Reconecta VPN
...

# Después de vincular, pueden usar VPN normalmente
```

**Ventaja:** $0 costo, inmediato  
**Desventaja:** WhatsApp puede pedir revinculación aleatoriamente (70-80% estabilidad)

---

**Ver comparación completa de soluciones:** `RESUMEN_SOLUCIONES.md`

---

## 📊 Monitoreo y Métricas

### Ver Usuarios Conectados

```bash
# En el servidor, ver logs en tiempo real
tail -f /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/logs/combined.log

# Buscar conexiones Socket.IO
grep "Socket conectado" logs/combined.log | tail -20

# Ver sesiones WhatsApp activas
grep "Ready" logs/combined.log | tail -10
```

### Dashboard de Estado (Frontend)

En el navegador, la interfaz muestra:
- 📊 Usuarios conectados en tiempo real
- 📱 Estado de WhatsApp por usuario
- 📈 Trabajos de envío activos
- 🔔 Notificaciones en tiempo real

---

## 🔒 Seguridad y Mejores Prácticas

### 1. **Usuarios con WhatsApp Solo para Envíos**

- ✅ Supervisor envía campaña → Usa su WhatsApp
- ✅ Asesor senior envía campaña → Usa su WhatsApp
- ❌ Asesor junior NO puede enviar campañas → No necesita WhatsApp

### 2. **Auditoría Completa**

Todos los envíos quedan registrados:

```javascript
{
  "user": "supervisor1",
  "whatsappUsed": "5491155123456",
  "contactsSent": 150,
  "timestamp": "2025-10-30T15:00:00Z"
}
```

### 3. **Backups Automáticos**

```bash
# Crear cron job para backup diario
0 2 * * * mongodump --db dannsalud --out /backup/mongo-$(date +\%Y\%m\%d)
```

---

## 📞 Preguntas Frecuentes

### ¿Puedo agregar más usuarios sin reiniciar el servidor?

✅ **Sí.** Solo créalos en la base de datos:

```bash
mongosh
> use dannsalud
> db.users.insertOne({
    username: "nuevo_usuario",
    email: "nuevo@dannsalud.com",
    password: "<hash_bcrypt>",
    role: "asesor",
    needsWhatsApp: false
  })
```

El nuevo usuario puede iniciar sesión inmediatamente.

### ¿Qué pasa si un usuario con WhatsApp renuncia?

1. Hacer logout de su WhatsApp en el sistema
2. Desvincular el número de WhatsApp
3. Asignar ese número a otro usuario
4. El nuevo usuario vincula el WhatsApp

### ¿Cuántos usuarios pueden conectarse simultáneamente?

- **Sin límite** de usuarios totales conectados
- **Límite de 6** sesiones de WhatsApp simultáneas (configurable)
- MongoDB puede manejar cientos de conexiones concurrentes

### ¿Los usuarios remotos son más lentos?

Depende de la conexión VPN:
- **VPN rápida:** Sin diferencia notable
- **VPN lenta:** Puede haber latencia en la UI

**Solución:** Usar VPN con servidor cercano geográficamente.

---

## ✅ Resumen Ejecutivo

### Configuración Actual

```bash
# ✅ CORS flexible → Cualquier PC en la red puede conectarse
# ✅ 20 usuarios pueden iniciar sesión simultáneamente
# ✅ Solo 5-6 usuarios necesitan vincular WhatsApp
# ✅ Base de datos centralizada
# ✅ Usuarios remotos soportados con VPN
```

### Lo que NO necesitas hacer

- ❌ NO actualizar .env cada vez que se conecta un nuevo usuario
- ❌ NO vincular WhatsApp en los 20 usuarios
- ❌ NO tener 20 números de WhatsApp
- ❌ NO reiniciar servidor cuando cambian IPs

### Lo que SÍ debes hacer

- ✅ Vincular WhatsApp solo en 5-6 usuarios clave
- ✅ Espaciar las vinculaciones (2 minutos entre cada una)
- ✅ Vincular WhatsApp sin VPN (usar IP real)
- ✅ Monitorear logs para detectar problemas

---

**Última actualización:** 30 de Octubre, 2025  
**Configuración:** Producción con 20 usuarios y 5-6 sesiones WhatsApp  
**Estado:** ✅ Listo para despliegue
