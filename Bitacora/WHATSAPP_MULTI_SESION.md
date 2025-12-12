# 📱 WhatsApp Multi-Sesión - Guía de Mejores Prácticas

## ⚠️ Problema: Desconexiones con LOGOUT

WhatsApp detecta y cierra sesiones cuando identifica comportamiento "sospechoso" o múltiples conexiones que parecen automatizadas.

### Causas Comunes de LOGOUT:

1. **Fingerprint de navegador idéntico** - Todos los clientes usan el mismo User-Agent
2. **Conexiones simultáneas desde la misma IP** - WhatsApp ve múltiples conexiones al mismo tiempo
3. **Mismo número vinculado múltiples veces** - Intentar vincular el mismo teléfono en varias cuentas
4. **Cambios de IP frecuentes** - El servidor cambia de IP constantemente

---

## ✅ Correcciones Implementadas

### 1. **User-Agent Único por Usuario** ✅
Cada usuario tiene un User-Agent diferente pero consistente:
- Usuario A → Chrome 120.0
- Usuario B → Chrome 119.0  
- Usuario C → Chrome 121.0

Esto hace que WhatsApp vea cada sesión como un navegador diferente.

### 2. **Delays Entre Inicializaciones** ✅
- Delay aleatorio de 1-3 segundos antes de inicializar cada cliente
- Delay de 2 segundos entre procesar usuarios en cola
- Evita que WhatsApp detecte múltiples conexiones "sospechosas"

### 3. **Límite de Concurrencia** ✅
- Máximo 3 conexiones procesándose simultáneamente
- Control de cola para gestionar múltiples usuarios

### 4. **LocalAuth con clientId Único** ✅
Cada usuario tiene su propia carpeta de sesión:
```
/home/dann-salud/.wwebjs_auth_multi/
├── 68e3f605f2d61bb5556b7b20/  (Usuario A)
├── 68f65c8b97693bd9803fd67c/  (Usuario B)
└── 68f8fdde8938d54c31b97fc6/  (Usuario C)
```

---

## 🔧 Configuración Recomendada

### Variables de Entorno (.env)

```bash
# Multisesión habilitado
USE_MULTI_SESSION=true

# Máximo 3-5 usuarios conectados simultáneamente
MAX_CONCURRENT_CONNECTIONS=5

# Máximo 2-3 trabajos concurrentes para no sobrecargar
MAX_CONCURRENT_JOBS=2
```

### Límites Recomendados

| Configuración | Valor Recomendado | Notas |
|--------------|-------------------|-------|
| **Usuarios simultáneos** | 3-5 | WhatsApp puede detectar más de 5 como sospechoso |
| **Delay entre conexiones** | 1-3 segundos | Aleatorio para parecer natural |
| **Reconexiones automáticas** | Deshabilitadas para LOGOUT | Evita loops infinitos |

---

## 📋 Procedimiento Correcto para Vincular Múltiples Usuarios

### ✅ Hacer (CORRECTO):

1. **Vincular usuarios de forma escalonada**
   ```
   Tiempo 0:00 - Usuario A escanea QR
   Tiempo 0:30 - Usuario B escanea QR
   Tiempo 1:00 - Usuario C escanea QR
   ```

2. **Usar números diferentes para cada cuenta**
   - Usuario A → Teléfono +57 300 123 4567
   - Usuario B → Teléfono +57 301 234 5678
   - Usuario C → Teléfono +57 302 345 6789

3. **Esperar que cada usuario esté completamente conectado** antes de vincular el siguiente
   - Ver log: `[WA][userId] Ready`
   - Ver log: `[WA][userId] Timeout de QR cancelado`

4. **No forzar nueva sesión si ya está conectado**
   - El sistema ahora ignora `forceNewSession` si el cliente ya está listo

### ❌ NO Hacer (INCORRECTO):

1. **NO vincular el mismo número múltiples veces**
   - WhatsApp cerrará todas las sesiones excepto la más reciente

2. **NO conectar todos los usuarios al mismo tiempo**
   - WhatsApp detecta el patrón como bot/automatización

3. **NO hacer logout y re-login frecuentemente**
   - Genera sesiones corruptas y conflictos

4. **NO reiniciar el servidor constantemente**
   - Destruye sesiones activas

---

## 🐛 Troubleshooting

### Problema: "Disconnected: LOGOUT" después de conectarse

**Síntoma:** El usuario se conecta correctamente pero 10-30 segundos después se desconecta con LOGOUT.

**Causa:** WhatsApp detectó comportamiento sospechoso.

**Solución:**
```bash
# 1. Detener el servidor
pkill -f "node.*server.js"

# 2. Limpiar TODAS las sesiones
rm -rf /home/dann-salud/.wwebjs_auth_multi/*

# 3. Esperar 5 minutos (WhatsApp tiene cooldown)
sleep 300

# 4. Reiniciar servidor
cd backend && npm start

# 5. Vincular usuarios UNO POR UNO con 1-2 minutos entre cada uno
```

### Problema: Usuario A funciona, pero al conectar B se desvincula A

**Causa:** Mismo número de WhatsApp o conflicto de sesión.

**Solución:**
1. Verificar que son números diferentes:
   ```bash
   # Ver los números vinculados en los logs
   grep "Ready" backend/logs/combined.log
   ```

2. Si es el mismo número → **No es posible tener múltiples sesiones del mismo número**
3. Si son números diferentes → Limpiar sesiones y vincular con delays más largos

### Problema: "QR expirado" repetidamente

**Causa:** El QR no se escanea dentro de 60 segundos.

**Solución:**
1. El QR ahora se regenera automáticamente
2. Si persiste, puede ser un problema de red:
   ```bash
   # Verificar conectividad
   ping -c 4 web.whatsapp.com
   curl -I https://web.whatsapp.com
   ```

---

## 📊 Monitoreo de Sesiones

### Ver Sesiones Activas

```bash
# Ver logs en tiempo real
tail -f backend/logs/combined.log | grep -E "Ready|Disconnected|LOGOUT"

# Contar usuarios conectados
grep -c "Ready" backend/logs/combined.log

# Ver desconexiones recientes
grep "Disconnected" backend/logs/combined.log | tail -20
```

### Health Check

El sistema tiene health checks automáticos cada 30 segundos:
```
💊 Health Check - Jobs activos: 0/3, Jobs atascados: 0, Memoria: 58MB
```

### Métricas Socket.IO

Cada minuto se emiten métricas de conexión:
```
📊 Métricas emitidas
```

---

## 🔒 Seguridad y Límites

### Límites de WhatsApp (No Oficiales, Observados)

- **Máximo ~5 sesiones simultáneas** desde la misma IP antes de levantar sospechas
- **Cooldown de 5-10 minutos** después de LOGOUT antes de poder reconectar
- **Rate limiting** en mensajes: ~20-30 mensajes por minuto

### Recomendaciones de Seguridad

1. **No exceder 5 usuarios** conectados simultáneamente
2. **Implementar delays** entre mensajes (ya implementado: 2 segundos mínimo)
3. **Monitorear logs** para detectar patrones de desconexión
4. **Backup regular** de la base de datos
5. **No compartir** credenciales de sesión entre servidores

---

## 📝 Logs Importantes

### Conexión Exitosa
```
[WA][userId] Usando Chromium de Puppeteer
[WA][userId] QR recibido
[WA][userId] Cliente inicializado exitosamente
[WA][userId] Ready
[WA][userId] Timeout de QR cancelado (conexión exitosa)
```

### Desconexión por LOGOUT (Problema)
```
[WA][userId] Disconnected: LOGOUT
[WA][userId] Desconexión por LOGOUT, no se reintentará automáticamente
```

### Inicialización Bloqueada (Correcto)
```
[WA][userId] Ya hay una inicialización en progreso, esperando...
```

---

## 🚀 Comando de Reinicio Limpio

```bash
#!/bin/bash
# Script de reinicio completo con limpieza de sesiones

echo "🛑 Deteniendo servidor..."
pkill -f "node.*server.js"

echo "🧹 Limpiando sesiones..."
rm -rf /home/dann-salud/.wwebjs_auth_multi/*
rm -rf /home/dann-salud/.wwebjs_cache/*

echo "⏳ Esperando cooldown de WhatsApp (30 segundos)..."
sleep 30

echo "🚀 Iniciando servidor..."
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
npm start

echo "✅ Servidor reiniciado. Espera 1 minuto antes de vincular usuarios."
```

---

## 📞 Contacto y Soporte

Si los problemas persisten después de seguir esta guía:

1. Revisar logs completos: `backend/logs/combined.log`
2. Verificar versión de Node.js: `node --version` (debe ser 20.x)
3. Verificar memoria disponible: `free -h`
4. Verificar conectividad: `ping web.whatsapp.com`

---

**Última actualización:** 30 de Octubre, 2025  
**Versión del Sistema:** Producción 1.0.0 con Multi-Sesión
