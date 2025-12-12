# 🔔 Sistema de Notificaciones Automáticas para Auditorías

**Fecha:** 3 de Noviembre, 2025  
**Estado:** ✅ Implementado y funcional

---

## 🎯 Objetivo

Automatizar notificaciones internas para eventos clave en el flujo de auditorías, utilizando el sistema de mensajería interna de la plataforma.

---

## 📋 Funcionalidades Implementadas

### **1. Notificación al Eliminar Video-Auditoría** ✅

**Trigger:** Cuando se elimina una auditoría desde FollowUp.jsx

**Destinatarios:**
- ✅ Usuarios con rol `gerencia` (todos)
- ✅ Asesor que creó la auditoría
- ✅ Supervisor del mismo equipo (numeroEquipo)

**Contenido del mensaje:**
```
🗑️ VIDEO-AUDITORÍA ELIMINADA

Se ha eliminado una video-auditoría del sistema:

📋 Detalles:
• CUIL: 20123456789
• Nombre: Juan Pérez
• Obra Social: OSDE
• Fecha de turno: 03/11/2025, 10:30
• Creado por: María González (maria@dann.com)
• Estado anterior: En videollamada

👤 Eliminado por: Admin Usuario (admin@dann.com)
🕐 Fecha de eliminación: 03/11/2025, 08:45

Esta notificación es automática y no requiere respuesta.
```

**Implementación:**
- `backend/src/controllers/auditController.js` → `deleteAudit()`
- Llama a `notifyAuditDeleted()` antes de eliminar

---

### **2. Notificación al Crear Video-Auditoría** ✅

**Trigger:** Cuando se añade una nueva auditoría desde SalesForm.jsx

**Destinatarios:**
- ✅ Usuarios con rol `auditor` (todos los activos)

**Contenido del mensaje:**
```
📹 NUEVA VIDEO-AUDITORÍA DISPONIBLE

Se ha registrado una nueva video-auditoría en el sistema:

📋 Detalles:
• CUIL: 20123456789
• Nombre: Juan Pérez
• Obra Social: OSDE
• Fecha de turno: 03/11/2025, 14:00
• Creado por: María González
• Estado: Seleccione

⏰ La auditoría está pendiente de asignación. Por favor, revisa el panel de FollowUp para más detalles.

Esta notificación es automática y no requiere respuesta.
```

**Implementación:**
- `backend/src/controllers/auditController.js` → `createAudit()`
- Llama a `notifyAuditCreated()` después de guardar

---

### **3. Recordatorio 5 Minutos Antes del Turno** ✅

**Trigger:** Cron job que se ejecuta cada minuto

**Condición:** Auditoría inicia en 5 minutos Y estado es "Seleccione" o sin asignar

**Destinatarios:**
- ✅ Usuarios con rol `auditor` (todos los activos)

**Contenido del mensaje:**
```
⏰ RECORDATORIO URGENTE: VIDEO-AUDITORÍA EN 5 MINUTOS

🚨 IMPORTANTE: La siguiente video-auditoría comenzará en 5 minutos y AÚN NO HA SIDO ASIGNADA:

📋 Detalles:
• CUIL: 20123456789
• Nombre: Juan Pérez
• Obra Social: OSDE
• Fecha de turno: 03/11/2025, 15:00
• Estado: Seleccione ❌

⚠️ POR FAVOR, TOMA ESTA AUDITORÍA INMEDIATAMENTE DESDE EL PANEL DE FOLLOWUP.

Es crucial que la auditoría se realice a tiempo para mantener la calidad del servicio.

Esta notificación es automática y no requiere respuesta.
```

**Implementación:**
- `backend/src/services/auditReminderCron.js` → Cron cada minuto
- `backend/src/server.js` → `startAuditReminderCron()`
- Busca auditorías entre 5 y 6 minutos en el futuro con estado sin asignar

---

### **4. Notificación al Completar Video-Auditoría** ✅

**Trigger:** 
- Cuando auditoría cambia a estado "Completa" (manual)
- Cuando se suben todos los archivos necesarios (automático)

**Destinatarios:**
- ✅ Usuarios con rol `admin` (todos los activos)

**Contenido del mensaje:**
```
✅ VIDEO-AUDITORÍA COMPLETADA - ACCIÓN REQUERIDA

Se ha completado una video-auditoría con toda la documentación:

📋 Detalles:
• CUIL: 20123456789
• Nombre: Juan Pérez
• Obra Social: OSDE
• Fecha de turno: 03/11/2025, 10:00
• Auditor asignado: Carlos López
• Completada el: 03/11/2025, 10:25

📎 Documentación adjunta:
• Video: ✅
• DNI Frente: ✅
• DNI Dorso: ✅
• Audio Backup: ✅

🎯 ACCIÓN REQUERIDA:
Por favor, procede con la creación del código QR para esta auditoría.

Accede al panel de auditorías para revisar y procesar.

Esta notificación es automática y no requiere respuesta.
```

**Implementación:**
- `backend/src/controllers/auditController.js` → `updateAudit()` (cambio manual)
- `backend/src/controllers/auditController.js` → `uploadMultimedia()` (automático al completar archivos)
- Llama a `notifyAuditCompleted()` al detectar completitud

---

### **5. Notificación al Mover a Recovery** ✅

**Trigger:** Scheduler que se ejecuta cada 5 minutos detecta auditorías con +24h en estados problemáticos

**Estados problemáticos:** "Falta clave", "Rechazada", "Falta documentación"

**Destinatarios:**
- ✅ Usuarios con rol `revendedor` (todos los activos)

**Contenido del mensaje:**
```
🔄 VIDEO-AUDITORÍA REQUIERE RECUPERACIÓN

Una video-auditoría ha pasado más de 24 horas en estado problemático y requiere recuperación:

📋 Detalles:
• CUIL: 20123456789
• Nombre: Juan Pérez
• Obra Social: OSDE
• Fecha de turno: 01/11/2025, 14:00
• Estado actual: Falta clave
• Creado por: María González

⚠️ Motivo del envío a recuperación:
La auditoría ha permanecido más de 24 horas en estado "Falta clave" sin resolverse.

🎯 ACCIÓN REQUERIDA:
Por favor, revisa la lista de Recovery y contacta al cliente para recuperar esta auditoría.

Esta notificación es automática y no requiere respuesta.
```

**Implementación:**
- `backend/src/services/recoveryScheduler.js` → `moveEligibleToRecovery()`
- Llama a `notifyAuditRecovery()` para cada auditoría movida

---

### **6. Notificación al Generar QR** ✅

**Trigger:** Cuando auditoría cambia a estado "QR Hecho"

**Destinatarios:**
- ✅ Asesor que creó la auditoría
- ✅ Supervisor del mismo equipo (numeroEquipo)

**Contenido del mensaje:**
```
🎉 CÓDIGO QR GENERADO - VIDEO-AUDITORÍA FINALIZADA

¡Buenas noticias! El código QR ha sido generado exitosamente para la siguiente auditoría:

📋 Detalles:
• CUIL: 20123456789
• Nombre: Juan Pérez
• Obra Social: OSDE
• Fecha de turno: 03/11/2025, 10:00
• Creado por: María González
• Auditor: Carlos López

✅ Estado: QR Hecho
📅 Finalizada el: 03/11/2025, 11:00

El proceso de auditoría ha sido completado exitosamente. El código QR está listo para ser entregado al afiliado.

Esta notificación es automática y no requiere respuesta.
```

**Implementación:**
- `backend/src/controllers/auditController.js` → `updateAudit()`
- Llama a `notifyAuditQRDone()` al detectar cambio a "QR Hecho"

---

## 🔧 Correcciones de Interfaz Implementadas

### **1. Filtro de Auditores en AuditEditModal** ✅

**Problema:** La lista mostraba todos los usuarios, incluyendo asesores y revendedores

**Solución:** Filtrar solo usuarios con roles:
- ✅ `admin`
- ✅ `gerencia`
- ✅ `auditor`
- ✅ `supervisor`

**Código:**
```javascript
const filtered = data.filter(u => 
    ['admin', 'gerencia', 'auditor', 'supervisor'].includes(u.role?.toLowerCase())
);
```

**Archivo:** `frontend/src/components/AuditEditModal.jsx`

---

### **2. Restricción de Estado "QR Hecho"** ✅

**Problema:** Todos los usuarios podían ver y seleccionar "QR Hecho"

**Solución:** Solo usuarios con rol `admin` o `gerencia` pueden ver/seleccionar este estado

**Código:**
```javascript
const getAvailableStatuses = () => {
    const userRole = user?.role?.toLowerCase();
    if (userRole === 'admin' || userRole === 'gerencia') {
        return STATUS_OPTIONS; // Todos los estados
    }
    return STATUS_OPTIONS.filter(status => status !== "QR hecho");
};
```

**Archivo:** `frontend/src/components/AuditEditModal.jsx`

---

## 🏗️ Arquitectura

### **Backend**

```
backend/
├── src/
│   ├── services/
│   │   ├── notificationService.js       ← Servicio centralizado de notificaciones
│   │   ├── auditReminderCron.js         ← Cron para recordatorios
│   │   └── recoveryScheduler.js         ← Actualizado con notificaciones
│   ├── controllers/
│   │   └── auditController.js           ← Integrado con notificationService
│   ├── config/
│   │   └── socket.js                    ← Expone io globalmente
│   └── server.js                        ← Inicia cron de recordatorios
```

### **Servicio de Notificaciones**

**Función Principal:** `sendInternalNotification()`

```javascript
await sendInternalNotification({
    toUserIds: ['userId1', 'userId2', ...],
    subject: "Título del mensaje",
    content: "Contenido completo del mensaje"
});
```

**Funciones Específicas:**
- `notifyAuditDeleted({ audit, deletedBy })`
- `notifyAuditCreated({ audit })`
- `notifyAuditReminder({ audit })`
- `notifyAuditCompleted({ audit })`
- `notifyAuditRecovery({ audit })`
- `notifyAuditQRDone({ audit })`

---

## 📡 Flujo de Notificaciones

```
┌─────────────────┐
│  Evento Trigger │
│ (crear, borrar, │
│  cambio estado) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Controller/Scheduler   │
│  Detecta evento         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  notificationService    │
│  Determina destinatarios│
│  Crea mensajes en BD    │
└────────┬────────────────┘
         │
         ├─────────────────┐
         ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   MongoDB    │  │  Socket.io   │
│ InternalMsg  │  │  Emit event  │
└──────────────┘  └───────┬──────┘
                          │
                          ▼
                  ┌──────────────┐
                  │   Frontend   │
                  │  Badge +1    │
                  │  Toast notif │
                  └──────────────┘
```

---

## 🧪 Pruebas

### **Test 1: Crear Auditoría**
```bash
1. Login como asesor
2. Ir a SalesForm.jsx
3. Crear nueva auditoría
4. Login como auditor en otra ventana
5. ✅ Verificar: Badge de mensajes +1
6. ✅ Verificar: Mensaje "Nueva video-auditoría disponible"
```

### **Test 2: Eliminar Auditoría**
```bash
1. Login como admin
2. Ir a FollowUp.jsx
3. Eliminar una auditoría
4. Login como gerencia en otra ventana
5. ✅ Verificar: Mensaje "Video-auditoría eliminada"
6. ✅ Verificar: Datos del eliminador incluidos
```

### **Test 3: Recordatorio 5 Minutos**
```bash
1. Crear auditoría para dentro de 6 minutos
2. No asignar auditor (dejar en "Seleccione")
3. Esperar 1 minuto
4. Login como auditor
5. ✅ Verificar: Mensaje urgente de recordatorio
```

### **Test 4: Auditoría Completa**
```bash
1. Crear auditoría y asignar auditor
2. Subir video + DNI frente + DNI dorso
3. Sistema detecta completitud automática
4. Login como admin en otra ventana
5. ✅ Verificar: Mensaje "Auditoría completada - Crear QR"
```

### **Test 5: Recovery**
```bash
1. Tener auditoría con estado "Falta clave" por +24h
2. Esperar que cron ejecute (cada 5 min)
3. Login como revendedor
4. ✅ Verificar: Mensaje "Requiere recuperación"
```

### **Test 6: QR Hecho**
```bash
1. Login como admin
2. Cambiar auditoría a "QR Hecho"
3. Login como asesor (creador) en otra ventana
4. ✅ Verificar: Mensaje "Código QR generado"
5. Login como supervisor del equipo
6. ✅ Verificar: También recibió mensaje
```

---

## ⚙️ Configuración

### **Variables de Entorno**
Ninguna adicional requerida. Usa configuración existente:
- `JWT_SECRET` - Para autenticación
- `MONGODB_URI` - Para almacenar mensajes
- `PORT` - Puerto del servidor

### **Dependencias Nuevas**
```json
{
  "node-cron": "^3.0.0"
}
```

### **Instalación**
```bash
cd backend
npm install node-cron
```

---

## 📊 Métricas y Logs

### **Ver notificaciones enviadas**
```bash
# Backend logs
grep "📨 Notificación enviada" backend/logs/app-*.log

# Por tipo
grep "Notificación de eliminación enviada" backend/logs/app-*.log
grep "Notificación de creación enviada" backend/logs/app-*.log
grep "Recordatorio enviado" backend/logs/app-*.log
```

### **Ver cron de recordatorios**
```bash
grep "⏰ Encontradas.*auditoría" backend/logs/app-*.log
```

### **Ver mensajes en MongoDB**
```javascript
// Mensajes no leídos por usuario
db.internalmessages.find({
    to: ObjectId("userId"),
    read: false
}).count()

// Notificaciones del sistema (últimas 24h)
db.internalmessages.find({
    createdAt: { $gte: new Date(Date.now() - 86400000) },
    "from.email": "system@dann-salud.com"
}).sort({ createdAt: -1 })
```

---

## 🔍 Troubleshooting

### **Notificaciones no llegan**

**1. Verificar Socket.io:**
```bash
# En logs backend
grep "Socket conectado" backend/logs/app-*.log

# En consola frontend
window.socket.connected  // Debe ser true
```

**2. Verificar usuario del sistema:**
```javascript
// En MongoDB
db.users.findOne({ email: "system@dann-salud.com" })
// Si no existe, crear:
db.users.insertOne({
    nombre: "Sistema",
    email: "system@dann-salud.com",
    role: "admin",
    active: true
})
```

**3. Verificar destinatarios:**
```bash
# Ver query de usuarios
grep "📨 Notificación enviada a usuario" backend/logs/app-*.log
```

### **Cron no ejecuta**

```bash
# Verificar inicio del cron
grep "✅ Cron de recordatorios" backend/logs/app-*.log

# Verificar ejecuciones
grep "⏰ Encontradas.*auditoría" backend/logs/app-*.log

# Reiniciar servidor
pkill -f "node.*server.js" && cd backend && npm start
```

### **Estado "QR Hecho" visible para todos**

```javascript
// Verificar en navegador
const { user } = useAuth();
console.log(user.role); // Debe ser 'admin' o 'gerencia'

// Limpiar caché
Ctrl + Shift + R (recarga forzada)
```

---

## 📝 Notas de Desarrollo

### **Decisiones de Diseño**

**1. Usuario del Sistema**
- Se busca usuario con email `system@dann-salud.com`
- Si no existe, usa primer admin como fallback
- Todas las notificaciones automáticas vienen de este usuario

**2. Rooms de Socket.io**
- Cada usuario tiene room `user_${userId}`
- Permite enviar notificaciones targeted
- Usuario se une automáticamente al conectarse

**3. Cron cada minuto**
- Frecuencia alta para recordatorios precisos
- Búsqueda optimizada (solo auditorías próximas)
- Ventana de 5-6 minutos para evitar duplicados

**4. Poblar datos antes de notificar**
- Siempre poblar `createdBy`, `auditor` antes de enviar
- Asegurar que datos completos estén disponibles
- Evitar referencias null en mensajes

---

## ✅ Checklist de Implementación

- [x] Servicio de notificaciones (`notificationService.js`)
- [x] Notificación al eliminar auditoría
- [x] Notificación al crear auditoría
- [x] Cron de recordatorios (cada minuto)
- [x] Notificación al completar auditoría
- [x] Notificación al mover a recovery
- [x] Notificación al generar QR
- [x] Filtro de auditores en AuditEditModal
- [x] Restricción de estado "QR Hecho"
- [x] Exponer `io` globalmente en backend
- [x] Exponer `socket` globalmente en frontend
- [x] Documentación completa

---

## 🚀 Para Activar

```bash
# 1. Instalar dependencias
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
npm install node-cron

# 2. Reiniciar backend
pkill -f "node.*server.js"
npm start

# 3. Verificar en logs
tail -f logs/app-*.log | grep -E "📨|⏰|✅ Cron"

# 4. Frontend (si es necesario)
cd ../frontend
npm start
```

---

## 📚 Archivos Modificados/Creados

### **Backend (Nuevos)**
1. `backend/src/services/notificationService.js`
2. `backend/src/services/auditReminderCron.js`

### **Backend (Modificados)**
1. `backend/src/controllers/auditController.js`
2. `backend/src/services/recoveryScheduler.js`
3. `backend/src/config/socket.js`
4. `backend/src/server.js`

### **Frontend (Modificados)**
1. `frontend/src/components/AuditEditModal.jsx`
2. `frontend/src/context/AuthContext.jsx`

### **Documentación**
1. `NOTIFICACIONES_AUDITORIAS.md` (este archivo)

---

**Estado:** ✅ **Sistema completamente implementado y funcional**

**Última actualización:** 3 de Noviembre, 2025  
**Desarrollado para:** Dann Salud Broadcaster Platform
