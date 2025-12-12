# 🚀 Baileys - Instalación y Pruebas

**Estado:** ✅ Código implementado, listo para instalar dependencias y probar

---

## 📋 Resumen de Cambios

### Archivos Creados (7 nuevos)
1. `backend/src/services/baileys/baileysClient.js` - Cliente individual de Baileys
2. `backend/src/services/baileys/baileysManager.js` - Gestor multi-usuario
3. `backend/src/services/whatsappUnified.js` - Wrapper unificado (compatibilidad)

### Archivos Modificados (3)
1. `backend/src/controllers/whatsappMeController.js` - Usa wrapper unificado
2. `backend/src/services/sendMessageService.js` - Usa wrapper unificado
3. `backend/.env` - Agregada variable `USE_BAILEYS`

### Configuración
- `.baileys_auth/` - Carpeta para sesiones de Baileys (creada)
- `USE_BAILEYS=false` - Por defecto usa whatsapp-web.js (migración gradual)

---

## 🎯 Ventajas de Baileys

| Característica | whatsapp-web.js | Baileys |
|----------------|-----------------|---------|
| **Método** | Emula navegador Chrome | Conecta directo al protocolo |
| **Tamaño** | ~300MB por usuario (Chromium) | ~10MB por usuario |
| **Velocidad conexión** | 20-30 segundos | 2-5 segundos |
| **Recursos RAM** | ~200MB por usuario | ~30MB por usuario |
| **Detección WhatsApp** | Alta (fingerprint Puppeteer) | Baja (parece app móvil) |
| **Usuarios simultáneos** | 2-3 (con proxies) | 10+ (sin proxies) |
| **Mantenimiento** | Requiere updates de Puppeteer | Auto-actualizable |

---

## 🔧 Pasos de Instalación

### Paso 1: Instalar Dependencias de Baileys

```bash
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
npm install @whiskeysockets/baileys pino qrcode-terminal
```

**Dependencias:**
- `@whiskeysockets/baileys` - Cliente de WhatsApp (última versión)
- `pino` - Logger eficiente usado por Baileys
- `qrcode-terminal` - (Opcional) Para mostrar QR en consola

### Paso 2: Verificar Instalación

```bash
# Verificar que se instalaron correctamente
npm list @whiskeysockets/baileys pino
```

**Salida esperada:**
```
dann-salud-broadcaster-backend@1.0.0
├── @whiskeysockets/baileys@6.x.x
└── pino@8.x.x
```

---

## 🧪 Plan de Pruebas

### Test 1: Probar con whatsapp-web.js (Verificar que no rompimos nada)

```bash
# 1. Asegurar que USE_BAILEYS=false en .env
grep "USE_BAILEYS" backend/.env
# Debe mostrar: USE_BAILEYS=false

# 2. Reiniciar servidor
pkill -f "node.*server.js"
cd backend && npm start

# 3. Probar conexión normal con un usuario
# - Ir a http://IP:5000/bulk-messages
# - Click en "Conectar WhatsApp"
# - Escanear QR
# - Verificar que conecta OK
```

**Resultado esperado:** Todo funciona como antes (sin cambios)

---

### Test 2: Probar Baileys con 1 Usuario

```bash
# 1. Detener servidor
pkill -f "node.*server.js"

# 2. Habilitar Baileys
nano backend/.env
# Cambiar: USE_BAILEYS=false → USE_BAILEYS=true

# 3. Limpiar sesiones antiguas (IMPORTANTE)
rm -rf backend/.wwebjs_auth_multi/*
rm -rf /home/dann-salud/.wwebjs_auth_multi/*

# 4. Reiniciar servidor
cd backend && npm start
```

**Verificar en logs:**
```bash
tail -f backend/logs/combined.log
```

**Salida esperada:**
```
[WA:me] Usando Baileys, Multi: true
✅ Baileys cargado como implementación de WhatsApp
[BaileysManager] 🚀 Inicializando nuevo cliente para usuario 68e3f605f2d61bb5556b7b20
[Baileys][userId] 🚀 Inicializando cliente...
[Baileys][userId] Versión WhatsApp: 2.24.x
[Baileys][userId] 📱 Código QR generado
[Baileys][userId] ✅ Conexión establecida exitosamente
```

**Frontend:**
1. Ir a `/bulk-messages`
2. Click "Conectar WhatsApp"
3. **Debe aparecer QR inmediatamente** (2-5 segundos vs 20-30 segundos antes)
4. Escanear QR
5. Verificar "Conexión establecida" (más rápido que antes)

---

### Test 3: Enviar Mensaje de Prueba

```bash
# Con el usuario ya conectado:
```

**Frontend:**
1. Crear una campaña pequeña (3 contactos de prueba)
2. Enviar
3. Verificar en logs:

```bash
tail -f backend/logs/combined.log | grep "Enviado"
```

**Salida esperada:**
```
[Baileys][userId] ✅ Mensaje enviado a 573001234567@s.whatsapp.net
✅ Enviado a 3001234567
```

---

### Test 4: Probar 2 Usuarios Simultáneos

**IMPORTANTE:** Este es el test crítico que fallaba con whatsapp-web.js

```bash
# Con USE_BAILEYS=true y servidor corriendo
```

**Frontend:**
1. **Usuario 1:** Conectar WhatsApp → Escanear QR → Esperar "Ready"
2. **Esperar 1-2 minutos**
3. **Usuario 2:** Conectar WhatsApp → Escanear QR → Esperar "Ready"
4. **Verificar que Usuario 1 NO se desconecta** ← CLAVE

**Verificar logs:**
```bash
grep -E "Ready|LOGOUT|Disconnected" backend/logs/combined.log | tail -20
```

**Resultado esperado:**
```
[Baileys][user1] ✅ Conexión establecida exitosamente
[Baileys][user2] ✅ Conexión establecida exitosamente
```

**NO debe haber:**
```
❌ [Baileys][user1] Disconnected: LOGOUT  ← Esto NO debe aparecer
```

---

### Test 5: Probar 6 Usuarios Simultáneos (Test Final)

**Si el Test 4 fue exitoso, probar con 6 usuarios:**

```bash
# Vincular usuarios de 1 en 1 con 1-2 minutos entre cada uno
```

1. Usuario 1 → Conectar → Ready ✅
2. **Esperar 2 minutos**
3. Usuario 2 → Conectar → Ready ✅
4. **Esperar 2 minutos**
5. Usuario 3 → Conectar → Ready ✅
6. ... (hasta 6 usuarios)

**Verificar que todos siguen conectados:**
```bash
grep "Ready" backend/logs/combined.log | tail -10
```

**Resultado esperado:** 6 líneas de "Ready" sin ningún "LOGOUT"

---

### Test 6: Logout Completo

**Verificar que el logout funciona correctamente con Baileys:**

1. Con un usuario conectado
2. Click "Desconectar dispositivo"
3. Verificar en logs:

```bash
tail -f backend/logs/combined.log | grep -E "Logout|logout|Credenciales"
```

**Salida esperada:**
```
[Baileys][userId] 🚪 Cerrando sesión...
[Baileys][userId] 🧹 Credenciales eliminadas
```

4. Verificar que archivos fueron eliminados:
```bash
ls -la /home/dann-salud/.baileys_auth/
# No debe haber carpetas de ese usuario
```

5. **Verificar que NO se reconecta automáticamente**

---

## 📊 Comparación de Resultados

### Con whatsapp-web.js (Antes)
```
✅ Usuario 1 conecta: 30 segundos
✅ Usuario 2 intenta conectar: 30 segundos
❌ Usuario 1 se desconecta: LOGOUT
❌ Usuario 2 se desconecta: LOGOUT
🔄 Ciclo infinito de desconexiones
```

### Con Baileys (Esperado)
```
✅ Usuario 1 conecta: 5 segundos
✅ Usuario 2 conecta: 5 segundos
✅ Usuario 3 conecta: 5 segundos
✅ ... hasta 6+ usuarios
✅ Todos permanecen conectados
✅ Envío de mensajes funcional
```

---

## ⚠️ Troubleshooting

### Error: "Cannot find module '@whiskeysockets/baileys'"

**Causa:** No se instalaron las dependencias

**Solución:**
```bash
cd backend
npm install @whiskeysockets/baileys pino
```

---

### Error: "Boom is not defined"

**Causa:** Falta dependencia `@hapi/boom` (incluida con Baileys)

**Solución:**
```bash
npm install @hapi/boom
```

---

### QR no aparece en frontend

**Verificar:**
1. Logs del servidor:
```bash
tail -f backend/logs/combined.log | grep "QR generado"
```

2. Socket.IO conectado:
```bash
# En consola del navegador (F12)
# Debe mostrar: ✅ Socket conectado
```

3. Si persiste, reiniciar cliente:
```bash
pkill -f "node.*server.js"
npm start
```

---

### Error: "Cliente no está listo para enviar mensajes"

**Causa:** Cliente no terminó de conectar

**Verificar estado:**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/wa/me/status
```

**Resultado esperado:**
```json
{
  "connected": true,
  "phoneNumber": "573001234567",
  "implementation": "Baileys"
}
```

---

### Sigue habiendo LOGOUT con Baileys

**Posibles causas:**

1. **No se limpiaron sesiones antiguas:**
```bash
rm -rf /home/dann-salud/.wwebjs_auth_multi/*
rm -rf /home/dann-salud/.baileys_auth/*
pkill -f "node.*server.js"
npm start
```

2. **Vinculando usuarios demasiado rápido:**
   - Esperar 2-3 minutos entre cada usuario
   - Asegurar que el primero está "Ready" antes del segundo

3. **Mismo número de WhatsApp:**
   - Verificar que cada usuario usa un teléfono diferente
   - Imposible tener múltiples sesiones del mismo número

4. **Cooldown de WhatsApp activo:**
   - Si hubo LOGOUT reciente, esperar 30-60 minutos
   - Limpiar sesiones y reintentar

---

## 🔄 Rollback a whatsapp-web.js

Si Baileys tiene problemas, es fácil volver atrás:

```bash
# 1. Detener servidor
pkill -f "node.*server.js"

# 2. Cambiar a whatsapp-web.js
nano backend/.env
# Cambiar: USE_BAILEYS=true → USE_BAILEYS=false

# 3. Limpiar sesiones de Baileys
rm -rf /home/dann-salud/.baileys_auth/*

# 4. Reiniciar
cd backend && npm start
```

**Todo vuelve a funcionar como antes** (gracias al wrapper unificado)

---

## 📈 Métricas de Éxito

### Después de Test 5 (6 usuarios), verificar:

- [ ] 6 usuarios conectados simultáneamente ✅
- [ ] Ningún LOGOUT en logs ✅
- [ ] Envío de mensajes funciona para todos ✅
- [ ] Tiempo de conexión < 10 segundos ✅
- [ ] Uso de RAM < 500MB total ✅
- [ ] Logout funciona correctamente ✅

**Si todos están ✅, la migración fue exitosa**

---

## 🚀 Poner en Producción

Una vez que los tests son exitosos:

```bash
# 1. Hacer backup de .env actual
cp backend/.env backend/.env.backup

# 2. Configurar Baileys permanentemente
nano backend/.env
# USE_BAILEYS=true

# 3. Limpiar sesiones antiguas
rm -rf /home/dann-salud/.wwebjs_auth_multi/*

# 4. Reiniciar servicio en producción
sudo systemctl restart dann-broadcaster
# O: pm2 restart dann-broadcaster

# 5. Monitorear logs
tail -f backend/logs/combined.log

# 6. Vincular usuarios progresivamente (1 por día es seguro)
```

---

## 📞 Comandos Útiles

```bash
# Ver estado de conexiones
grep "Ready" backend/logs/combined.log | tail -10

# Ver desconexiones (debe estar vacío)
grep "LOGOUT" backend/logs/combined.log | tail -10

# Ver errores de Baileys
grep "\\[Baileys\\].*Error" backend/logs/combined.log | tail -20

# Verificar implementación actual
curl http://localhost:5000/api/wa/me/status | jq .implementation
# Debe mostrar: "Baileys" o "whatsapp-web.js"

# Limpiar todo y empezar de cero
rm -rf /home/dann-salud/.baileys_auth/*
rm -rf /home/dann-salud/.wwebjs_auth_multi/*
pkill -f "node.*server.js"
cd backend && npm start
```

---

## 📚 Recursos

- **Baileys GitHub:** https://github.com/WhiskeySockets/Baileys
- **Baileys Docs:** https://whiskeysockets.github.io/Baileys/
- **Evolution API** (ejemplo completo): https://github.com/EvolutionAPI/evolution-api
- **Soporte de Baileys:** https://github.com/WhiskeySockets/Baileys/issues

---

## ✅ Checklist Final

### Pre-instalación
- [ ] Backup del código actual creado
- [ ] Backup de base de datos creado
- [ ] `.env` configurado con `USE_BAILEYS=false`

### Instalación
- [ ] Dependencias instaladas (`npm install @whiskeysockets/baileys pino`)
- [ ] Servidor inicia sin errores
- [ ] Test 1 pasado (whatsapp-web.js sigue funcionando)

### Testing con Baileys
- [ ] `USE_BAILEYS=true` configurado
- [ ] Sesiones antiguas limpiadas
- [ ] Test 2 pasado (1 usuario con Baileys)
- [ ] Test 3 pasado (envío de mensajes)
- [ ] Test 4 pasado (2 usuarios sin LOGOUT) ← **CRÍTICO**
- [ ] Test 5 pasado (6 usuarios sin LOGOUT) ← **ÉXITO**
- [ ] Test 6 pasado (logout completo)

### Producción
- [ ] Monitoreo de logs por 24 horas
- [ ] Todos los usuarios migrados exitosamente
- [ ] Sin desconexiones inesperadas
- [ ] Envío masivo funcional
- [ ] Documentación actualizada

---

**Última actualización:** 31 de Octubre, 2025  
**Estado:** ✅ Código implementado, listo para pruebas  
**Próximo paso:** Instalar dependencias y ejecutar Test 1

---

## 🎉 Resultado Esperado

Después de la migración exitosa:

```
✅ 6-10 usuarios conectados simultáneamente
✅ Sin desconexiones por LOGOUT
✅ Conexión en 2-5 segundos (vs 20-30 segundos antes)
✅ Uso de RAM: ~200MB total (vs 1.2GB antes)
✅ Envío masivo: 20,000+ mensajes/mes sin problemas
✅ Plataforma estable para uso en producción
```

**Tu plataforma finalmente será escalable y confiable** 🚀
