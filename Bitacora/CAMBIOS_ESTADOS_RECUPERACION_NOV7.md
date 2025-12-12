# 🔧 Actualización - Nuevos Estados de Recuperación y Endpoint de Grupos

**Fecha**: 7 de Noviembre, 2025 - 10:30  
**Estado**: ✅ **COMPLETADO Y DESPLEGADO**

---

## 📋 **Resumen de Cambios**

Se implementaron 2 correcciones importantes:

1. ✅ **Creación de endpoint `/groups` para el frontend**
2. ✅ **Ampliación de estados que pasan a Recuperación después de 24 horas**

---

## 1️⃣ **Endpoint /groups - CREADO**

### **Problema Original**
El frontend intentaba cargar grupos desde `/api/groups` pero el endpoint no existía, generando error 404:

```
XHRGET http://100.65.25.95:5000/api/groups
[HTTP/1.1 404 Not Found 16ms]
Error al cargar grupos
```

### **Causa**
- No existía un modelo `Group` en la base de datos
- Los grupos se manejan mediante el campo `numeroEquipo` en el modelo `User`
- El único endpoint era `/admin/grupos` que devolvía un formato incompatible

### **Solución Implementada**

**Archivos**: 
- `backend/src/routes/index.js` (ruta principal)
- `backend/src/routes/userRoutes.js` (ruta alternativa en `/users/groups`)

Se agregó un nuevo endpoint en dos ubicaciones:
1. **Ruta directa**: `/api/groups` (en `routes/index.js`)
2. **Ruta alternativa**: `/api/users/groups` (en `routes/userRoutes.js`)

El endpoint que:
1. Consulta los `numeroEquipo` únicos de todos los usuarios
2. Los formatea como array de objetos compatibles con el frontend
3. Los ordena alfabéticamente

```javascript
// Endpoint compatible con frontend (devuelve grupos como array de objetos)
router.get(
    "/groups",
    requireAuth,
    permit("gerencia", "admin", "auditor", "supervisor"),
    async (req, res) => {
        try {
            const User = require("../models/User");
            const grupos = await User.distinct("numeroEquipo", { 
                deletedAt: null,
                numeroEquipo: { $exists: true, $ne: null, $ne: "" }
            });
            
            // Ordenar y formatear como array de objetos con _id y nombre
            grupos.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            
            const gruposFormateados = grupos.map(g => ({
                _id: g, // usar el numeroEquipo como _id
                nombre: g,
                name: g
            }));
            
            res.json(gruposFormateados);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);
```

### **Formato de Respuesta**

**Antes**: 404 Not Found

**Ahora**:
```json
[
  { "_id": "777", "nombre": "777", "name": "777" },
  { "_id": "888", "nombre": "888", "name": "888" },
  { "_id": "999", "nombre": "999", "name": "999" }
]
```

### **Resultado**
- ✅ El frontend puede cargar grupos correctamente
- ✅ Campo "Grupo" en `AuditEditModal` se puebla con opciones
- ✅ Gerencia puede cambiar el grupo de una auditoría
- ✅ Compatible con permisos existentes (gerencia, admin, auditor, supervisor)

---

## 2️⃣ **Nuevos Estados de Recuperación - IMPLEMENTADO**

### **Requerimiento**
Ampliar los estados que, después de **24 horas**, mueven una auditoría de "Seguimiento de Auditorías" (FollowUp.jsx) a "Recuperación y Reventas":

**Estados anteriores**:
- Falta clave
- Rechazada
- Falta documentación

**Estados nuevos agregados**:
- **No atendió**
- **Tiene dudas**
- **Falta clave y documentación**
- **No le llegan los mensajes**
- **Cortó**

### **Archivos Modificados**

#### **1. Recovery Scheduler**
**Archivo**: `backend/src/services/recoveryScheduler.js`

```javascript
const filter = {
    status: { 
      $in: [
        "Falta clave", 
        "Rechazada", 
        "Falta documentación",
        "No atendió",                    // ✅ NUEVO
        "Tiene dudas",                   // ✅ NUEVO
        "Falta clave y documentación",   // ✅ NUEVO
        "No le llegan los mensajes",     // ✅ NUEVO
        "Cortó"                          // ✅ NUEVO
      ] 
    },
    recoveryEligibleAt: { $ne: null, $lte: now },
    isRecovery: { $ne: true }
};
```

**Función**: Cada 5 minutos, busca auditorías con estos estados que hayan superado las 24 horas y las marca como `isRecovery: true`.

---

#### **2. Audit Controller - updateStatus**
**Archivo**: `backend/src/controllers/auditController.js`

```javascript
const recoveryStates = [
    "Falta clave", 
    "Rechazada", 
    "Falta documentación",
    "No atendió",                    // ✅ NUEVO
    "Tiene dudas",                   // ✅ NUEVO
    "Falta clave y documentación",   // ✅ NUEVO
    "No le llegan los mensajes",     // ✅ NUEVO
    "Cortó"                          // ✅ NUEVO
];

if (recoveryStates.includes(status)) {
    update.recoveryEligibleAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    update.followUpNotificationSent = false;
} else {
    update.recoveryEligibleAt = null;
    update.followUpNotificationSent = false;
}
```

**Función**: Cuando una auditoría cambia a uno de estos estados, establece `recoveryEligibleAt` a 24 horas en el futuro.

---

#### **3. Audit Controller - updateAudit**
**Archivo**: `backend/src/controllers/auditController.js` (líneas 400-416)

Se aplicó la misma lógica de `recoveryStates` al método `updateAudit` para mantener consistencia.

---

#### **4. Audit Controller - Filtro de Exclusión**
**Archivo**: `backend/src/controllers/auditController.js` (líneas 188-215)

```javascript
if (roleForRecovery !== 'supervisor') {
    const recoveryStates = [
        "Falta clave", 
        "Rechazada", 
        "Falta documentación",
        "No atendió",                    // ✅ NUEVO
        "Tiene dudas",                   // ✅ NUEVO
        "Falta clave y documentación",   // ✅ NUEVO
        "No le llegan los mensajes",     // ✅ NUEVO
        "Cortó"                          // ✅ NUEVO
    ];
    
    const recoveryAnd = [
        {
            $or: [
                { status: { $nin: recoveryStates } },
                { recoveryEligibleAt: { $exists: false } },
                { recoveryEligibleAt: null },
                { recoveryEligibleAt: { $gt: now } }
            ]
        },
        { isRecovery: { $ne: true } }
    ];
    filter.$and = (filter.$and || []).concat(recoveryAnd);
}
```

**Función**: Excluye auditorías elegibles para recuperación de la vista de FollowUp.jsx (excepto para supervisores).

---

#### **5. Follow-Up Scheduler (Notificaciones 12h)**
**Archivo**: `backend/src/services/auditFollowUpScheduler.js`

```javascript
const followUpStates = [
    'Falta documentación', 
    'Falta clave',
    'No atendió',                    // ✅ NUEVO
    'Tiene dudas',                   // ✅ NUEVO
    'Falta clave y documentación',   // ✅ NUEVO
    'No le llegan los mensajes',     // ✅ NUEVO
    'Cortó'                          // ✅ NUEVO
];

const auditsNeedingFollowUp = await Audit.find({
    status: { $in: followUpStates },
    statusUpdatedAt: { $lte: threshold },
    followUpNotificationSent: { $ne: true }
})
```

**Función**: Envía notificaciones de seguimiento después de 12 horas en estos estados (antes de pasar a recuperación).

---

## 📊 **Flujo Completo de Estados**

### **Timeline de una Auditoría Problemática**

```
T=0h: Auditoría cambia a "No atendió"
  ↓
  - Se establece recoveryEligibleAt = now + 24h
  - followUpNotificationSent = false
  ↓
T=12h: auditFollowUpScheduler detecta la auditoría
  ↓
  - Envía notificaciones a:
    * Asesor que hizo la venta
    * Supervisor del grupo
  ↓
  - Marca followUpNotificationSent = true
  ↓
T=24h: recoveryScheduler detecta la auditoría
  ↓
  - Marca isRecovery = true
  - Marca recoveryMovedAt = now
  ↓
  - Envía notificaciones a:
    * Asesor que hizo la venta
    * Supervisor del grupo
    * Usuarios con rol "revendedor"
  ↓
  - La auditoría desaparece de FollowUp.jsx
  - Aparece en la vista de "Recuperación y Reventas"
```

---

## 🔔 **Sistema de Notificaciones**

### **Notificación de Seguimiento (12 horas)**

**Destinatarios**:
- ✅ Asesor que realizó la venta
- ✅ Supervisor del grupo del asesor

**Mensaje**:
```
⚠️ Seguimiento requerido
Auditoría de [nombre] lleva más de 12 horas en estado "[estado]"
```

**Estados que disparan esta notificación**:
- Falta documentación
- Falta clave
- No atendió ← NUEVO
- Tiene dudas ← NUEVO
- Falta clave y documentación ← NUEVO
- No le llegan los mensajes ← NUEVO
- Cortó ← NUEVO

---

### **Notificación de Recuperación (24 horas)**

**Destinatarios**:
- ✅ Asesor que realizó la venta
- ✅ Supervisor del grupo del asesor
- ✅ **Todos los usuarios con rol "revendedor"**

**Función**: `notifyAuditRecovery()` en `notificationService.js`

**Mensaje**:
```
🔄 Auditoría movida a Recuperación
[Nombre del afiliado] - [CUIL]
Estado: [estado]
Disponible para reventa
```

**Estados que disparan esta notificación**:
- Falta clave
- Rechazada
- Falta documentación
- No atendió ← NUEVO
- Tiene dudas ← NUEVO
- Falta clave y documentación ← NUEVO
- No le llegan los mensajes ← NUEVO
- Cortó ← NUEVO

---

## 📁 **Archivos Modificados**

### **Backend (5 archivos)**

1. ✅ `routes/index.js`
   - Endpoint directo `/api/groups` agregado

2. ✅ `routes/userRoutes.js`
   - Endpoint alternativo `/api/users/groups` agregado

3. ✅ `services/recoveryScheduler.js`
   - Filtro ampliado con 5 nuevos estados

4. ✅ `controllers/auditController.js`
   - `updateStatus`: recoveryStates ampliado
   - `updateAudit`: recoveryStates ampliado
   - Filtro de exclusión: recoveryStates ampliado

5. ✅ `services/auditFollowUpScheduler.js`
   - followUpStates ampliado con 5 nuevos estados

---

## ✅ **Despliegue**

```bash
# Frontend compilado
npm run build  # ✅ Exitoso en 6.11s

# Backend reiniciado
pm2 restart dann-salud-backend  # ✅ Reinicio #99 (corregido endpoint)

# Estado
✅ online
📦 18.9 MB memoria
```

---

## 🧪 **Testing**

### **Test 1 - Endpoint /groups funciona**

**Pasos**:
1. ✅ Abrir DevTools → Network
2. ✅ Editar una auditoría como Gerencia
3. ✅ Verificar que aparece request a `/api/groups`
4. ✅ Verificar respuesta 200 con array de grupos

**Resultado Esperado**:
```json
[
  { "_id": "777", "nombre": "777", "name": "777" },
  { "_id": "888", "nombre": "888", "name": "888" }
]
```

**Antes**: ❌ 404 Not Found  
**Ahora**: ✅ 200 OK con datos

---

### **Test 2 - Nuevos estados establecen recoveryEligibleAt**

**Pasos**:
1. ✅ Cambiar estado de auditoría a "No atendió"
2. ✅ Verificar en MongoDB:
   ```javascript
   db.audits.findOne({ _id: ObjectId("...") })
   ```

**Resultado Esperado**:
```javascript
{
  status: "No atendió",
  statusUpdatedAt: ISODate("2025-11-07T13:30:00Z"),
  recoveryEligibleAt: ISODate("2025-11-08T13:30:00Z"), // +24h
  followUpNotificationSent: false
}
```

**Antes**: ❌ `recoveryEligibleAt: null`  
**Ahora**: ✅ `recoveryEligibleAt: now + 24h`

---

### **Test 3 - Auditoría pasa a Recuperación después de 24h**

**Pasos**:
1. ✅ Cambiar estado a "Cortó"
2. ✅ Modificar manualmente `recoveryEligibleAt` a hace 1 minuto (simular 24h):
   ```javascript
   db.audits.updateOne(
     { _id: ObjectId("...") },
     { $set: { recoveryEligibleAt: new Date(Date.now() - 60000) } }
   )
   ```
3. ✅ Esperar 5 minutos (intervalo del scheduler)
4. ✅ Verificar que `isRecovery: true`

**Resultado Esperado**:
```javascript
{
  status: "Cortó",
  isRecovery: true,  // ✅ Marcada para recuperación
  recoveryMovedAt: ISODate("2025-11-07T13:35:00Z")
}
```

**Visible en**:
- ❌ Ya NO aparece en FollowUp.jsx
- ✅ Ahora aparece en vista de Recuperación

---

### **Test 4 - Notificaciones de Seguimiento (12h)**

**Pasos**:
1. ✅ Cambiar estado a "Tiene dudas"
2. ✅ Modificar `statusUpdatedAt` a hace 13 horas:
   ```javascript
   db.audits.updateOne(
     { _id: ObjectId("...") },
     { $set: { 
       statusUpdatedAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
       followUpNotificationSent: false
     }}
   )
   ```
3. ✅ Esperar hasta que el scheduler se ejecute (~10 minutos)
4. ✅ Verificar logs: `pm2 logs dann-salud-backend`

**Resultado Esperado**:
```
📋 Encontradas 1 auditorías que necesitan seguimiento
📨 Notificación de seguimiento enviada para auditoría [ID]
✅ followUpNotificationSent actualizado para auditoría [ID]
```

**Notificaciones enviadas a**:
- ✅ Asesor
- ✅ Supervisor del grupo

---

### **Test 5 - Notificaciones de Recuperación (24h)**

**Resultado Esperado** (al pasar a recuperación):

**Logs del backend**:
```
RecoveryScheduler: marcadas 1 auditorías como isRecovery
```

**Notificaciones internas enviadas a**:
- ✅ Asesor que hizo la venta
- ✅ Supervisor del grupo
- ✅ **Todos los revendedores**

**Verificar en DB**:
```javascript
db.internalmessages.find({ 
  content: /Recuperación/,
  createdAt: { $gte: new Date("2025-11-07") }
})
```

---

## 📊 **Comparativa de Estados**

### **Estados de Recuperación - Antes vs Después**

| Estado | Antes | Después |
|--------|-------|---------|
| Falta clave | ✅ 24h → Recuperación | ✅ 24h → Recuperación |
| Rechazada | ✅ 24h → Recuperación | ✅ 24h → Recuperación |
| Falta documentación | ✅ 24h → Recuperación | ✅ 24h → Recuperación |
| **No atendió** | ❌ NO | ✅ **24h → Recuperación** |
| **Tiene dudas** | ❌ NO | ✅ **24h → Recuperación** |
| **Falta clave y documentación** | ❌ NO | ✅ **24h → Recuperación** |
| **No le llegan los mensajes** | ❌ NO | ✅ **24h → Recuperación** |
| **Cortó** | ❌ NO | ✅ **24h → Recuperación** |
| Completa | ❌ NO | ❌ NO |
| En videollamada | ❌ NO | ❌ NO |
| Mensaje enviado | ❌ NO | ❌ NO |

### **Total de Estados de Recuperación**

- **Antes**: 3 estados
- **Ahora**: 8 estados (+5 nuevos)

---

## ⚠️ **Notas Importantes**

### **1. Consistencia en Todos los Componentes**

Los nuevos estados fueron agregados en **5 lugares diferentes** para mantener consistencia:

1. ✅ `recoveryScheduler.js` - Mover a recuperación
2. ✅ `auditController.js` (updateStatus) - Establecer recoveryEligibleAt
3. ✅ `auditController.js` (updateAudit) - Establecer recoveryEligibleAt
4. ✅ `auditController.js` (filtro) - Excluir de FollowUp
5. ✅ `auditFollowUpScheduler.js` - Notificaciones 12h

### **2. Notificaciones a Revendedores**

**Importante**: Cuando una auditoría pasa a recuperación, los **revendedores** reciben notificación para que puedan intentar recuperar la venta.

**Función responsable**: `notifyAuditRecovery()` en `notificationService.js`

### **3. Supervisores Siempre Ven Todo**

Los supervisores **NO tienen el filtro de recuperación** aplicado, por lo que:
- ✅ Ven auditorías en estados de recuperación en FollowUp.jsx
- ✅ Ven auditorías que están en periodo de espera (< 24h)
- ✅ Ven auditorías que ya pasaron a recuperación (isRecovery: true)

**Otros roles**: Solo ven auditorías que NO están en periodo de recuperación.

### **4. Timeline Completa**

```
T=0h   → Estado cambia a problemático
T=12h  → Notificación de seguimiento (asesor + supervisor)
T=24h  → Pasa a recuperación (asesor + supervisor + revendedores)
T=24h+ → Visible solo en vista de Recuperación
```

---

## 🎯 **Beneficios**

### **Endpoint /groups**
- ✅ Frontend funciona correctamente sin errores 404
- ✅ Campo Grupo se puebla con opciones reales
- ✅ Gerencia puede reasignar auditorías a otros grupos

### **Nuevos Estados de Recuperación**
- ✅ Mayor cobertura de casos problemáticos
- ✅ Más oportunidades de recuperación
- ✅ Mejor seguimiento de auditorías incompletas
- ✅ Revendedores tienen más leads para trabajar

### **Notificaciones Mejoradas**
- ✅ Seguimiento proactivo después de 12 horas
- ✅ Alerta a revendedores para recuperación
- ✅ Múltiples destinatarios informados

---

## 🚀 **Casos de Uso Prácticos**

### **Caso 1: Cliente No Atiende la Llamada**

**Escenario**: Un asesor intenta contactar al cliente para la video-auditoría pero no atiende.

**Flujo**:
1. Asesor marca estado como "No atendió"
2. ✅ Sistema establece `recoveryEligibleAt = +24h`
3. A las 12 horas → Notificación al asesor y supervisor
4. A las 24 horas → Pasa a Recuperación
5. ✅ Revendedores reciben notificación
6. Revendedor puede intentar contactar al cliente

---

### **Caso 2: Cliente Tiene Dudas Sobre la Venta**

**Escenario**: Durante la video-auditoría, el cliente expresa dudas sobre cambiar de obra social.

**Flujo**:
1. Auditor marca estado como "Tiene dudas"
2. ✅ Sistema establece `recoveryEligibleAt = +24h`
3. A las 12 horas → Notificación al asesor original
4. Asesor puede contactar al cliente para resolver dudas
5. Si no se resuelve en 24h → Pasa a Recuperación
6. ✅ Otro asesor (revendedor) puede intentar cerrar la venta

---

### **Caso 3: Problemas Técnicos**

**Escenario**: El cliente no recibe los mensajes de WhatsApp para la video-auditoría.

**Flujo**:
1. Se marca como "No le llegan los mensajes"
2. ✅ Sistema establece `recoveryEligibleAt = +24h`
3. A las 12 horas → Notificación al supervisor
4. Supervisor puede intentar solución técnica
5. A las 24 horas → Pasa a Recuperación
6. ✅ Revendedores pueden usar métodos alternativos de contacto

---

## 📝 **Consultas MongoDB para Verificación**

### **Auditorías en Estados de Recuperación**
```javascript
db.audits.find({
  status: { 
    $in: [
      "No atendió", 
      "Tiene dudas", 
      "Falta clave y documentación", 
      "No le llegan los mensajes", 
      "Cortó"
    ]
  },
  isRecovery: false,
  recoveryEligibleAt: { $exists: true }
})
```

### **Auditorías que Pasaron a Recuperación Hoy**
```javascript
db.audits.find({
  isRecovery: true,
  recoveryMovedAt: {
    $gte: new Date(new Date().setHours(0,0,0,0))
  }
})
```

### **Auditorías Pendientes de Notificación de Seguimiento**
```javascript
db.audits.find({
  status: { 
    $in: [
      "No atendió", 
      "Tiene dudas", 
      "Falta clave y documentación", 
      "No le llegan los mensajes", 
      "Cortó"
    ]
  },
  statusUpdatedAt: { 
    $lte: new Date(Date.now() - 12 * 60 * 60 * 1000) 
  },
  followUpNotificationSent: false
})
```

---

## 🔐 **Seguridad y Permisos**

### **Endpoint /groups**
- ✅ Requiere autenticación (`requireAuth`)
- ✅ Solo accesible por: gerencia, admin, auditor, supervisor
- ✅ No expone información sensible (solo números de grupo)

### **Sistema de Recuperación**
- ✅ Automático, no requiere intervención manual
- ✅ Notificaciones solo a usuarios autorizados
- ✅ Logs detallados de todas las acciones

---

**Sistema listo para producción** 🚀

**Última actualización**: 7 de noviembre, 2025 - 10:35 (UTC-3)
