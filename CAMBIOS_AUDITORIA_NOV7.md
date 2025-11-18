# 🔧 Cambios Implementados - Sistema de Auditorías

**Fecha**: 7 de Noviembre, 2025 - 09:05  
**Estado**: ✅ **COMPLETADO Y DESPLEGADO**

---

## 📋 **Resumen de Cambios**

Se implementaron 3 mejoras importantes al sistema de auditorías:

1. ✅ Campo Asesor editable solo por Gerencia con lista del grupo
2. ✅ CUIL obligatorio con validación anti-duplicados (excepto rechazadas)
3. ✅ Notificaciones automáticas después de 12 horas en estados problemáticos

---

## 1️⃣ **Campo Asesor Editable (Solo Gerencia)**

### **Cambio Implementado**
El campo "Asesor" en el modal de edición de auditorías ahora:
- ✅ Es un **select desplegable** que muestra solo asesores del grupo correspondiente
- ✅ **Solo editable por usuarios con rol Gerencia**
- ✅ Para otros roles (admin, auditor, supervisor) permanece como campo de solo lectura

### **Archivos Modificados**

**Frontend: `AuditEditModal.jsx`**
```javascript
// Nuevo estado para asesores
const [asesores, setAsesores] = useState([]);

// useEffect que carga asesores del grupo
useEffect(() => {
    const fetchAsesores = async () => {
        if (!form.grupoId) return;
        const { data } = await apiClient.get("/users");
        const filtered = data.filter(u => 
            u.role?.toLowerCase() === 'asesor' && 
            (u.groupId?._id === form.grupoId || u.groupId === form.grupoId)
        );
        setAsesores(filtered);
    };
    fetchAsesores();
}, [form.grupoId]);

// Renderizado condicional según rol
{user?.role?.toLowerCase() === 'gerencia' ? (
    <select name="asesor" value={form.asesor} onChange={handleChange}>
        <option value="">Seleccione</option>
        {asesores.map((u) => (
            <option key={u._id} value={u._id}>
                {u.nombre || u.email}
            </option>
        ))}
    </select>
) : (
    <input value={audit.asesor?.nombre} readOnly />
)}
```

### **Comportamiento**
| Rol | Comportamiento |
|-----|----------------|
| Gerencia | ✅ Puede seleccionar cualquier asesor del grupo |
| Admin/Auditor/Supervisor | 🔒 Campo de solo lectura |

---

## 2️⃣ **CUIL Obligatorio con Validación**

### **Cambios Implementados**

1. **Campo CUIL obligatorio** en `SalesForm.jsx`
2. **Validación anti-duplicados mejorada**:
   - ✅ No permite usar CUIL ya registrado
   - ✅ EXCEPCIÓN: Se puede reutilizar si la auditoría anterior está en estado "Rechazada"

### **Archivos Modificados**

**Frontend: `SalesForm.jsx`**
```javascript
function validate(existingAudits = []) {
    // CUIL es obligatorio
    if (!form.cuil.trim()) return 'CUIL es requerido';
    
    if (!/^\d{11}$/.test(form.cuil)) return 'CUIL debe tener exactamente 11 dígitos';
    
    // Validar que el CUIL no se haya usado antes, excepto si está "Rechazada"
    const cuilConflict = existingAudits.find(a => a.cuil?.trim() === form.cuil.trim());
    if (cuilConflict && cuilConflict.status !== 'Rechazada') {
        return 'Ya existe una auditoría con ese CUIL. El CUIL solo puede reutilizarse si la auditoría anterior fue rechazada.';
    }
    
    // ... resto de validaciones
}
```

**HTML: Campo con asterisco rojo**
```jsx
<label className="block text-sm">
    CUIL <span className="text-red-500">*</span>
</label>
<input 
    value={form.cuil} 
    onChange={...}
    required
/>
```

### **Casos de Uso**

| Escenario | Resultado |
|-----------|-----------|
| Crear auditoría sin CUIL | ❌ Error: "CUIL es requerido" |
| CUIL con menos de 11 dígitos | ❌ Error: "CUIL debe tener exactamente 11 dígitos" |
| CUIL ya usado (estado: Completa) | ❌ Error: "Ya existe una auditoría con ese CUIL..." |
| CUIL ya usado (estado: Rechazada) | ✅ Permite crear nueva auditoría |
| CUIL nuevo | ✅ Crea auditoría correctamente |

### **Beneficios**
- ✅ Previene robo de ventas
- ✅ Evita ventas cruzadas
- ✅ Permite recuperación de ventas rechazadas

---

## 3️⃣ **Notificaciones Automáticas Después de 12 Horas**

### **Funcionalidad Implementada**

Sistema automático que monitorea auditorías en estados:
- **"Falta documentación"**
- **"Falta clave"**

Si una auditoría permanece **más de 12 horas** en uno de estos estados:
1. ✅ Envía notificación al **asesor** que realizó la venta
2. ✅ Envía notificación al **supervisor** del asesor (según grupo/numeroEquipo)
3. ✅ Marca la auditoría para no volver a notificar
4. ✅ Si el estado cambia, resetea el flag para poder notificar de nuevo

### **Nuevo Servicio: `auditFollowUpScheduler.js`**

```javascript
// Verifica cada 1 hora
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Umbral de 12 horas
const FOLLOW_UP_THRESHOLD_MS = 12 * 60 * 60 * 1000;

// Función principal
async function checkAuditsForFollowUp() {
    const threshold = new Date(now.getTime() - FOLLOW_UP_THRESHOLD_MS);
    
    const auditsNeedingFollowUp = await Audit.find({
        status: { $in: ['Falta documentación', 'Falta clave'] },
        statusUpdatedAt: { $lte: threshold },
        followUpNotificationSent: { $ne: true }
    })
    .populate('asesor', 'nombre email numeroEquipo')
    .populate('groupId', 'nombre');
    
    // Para cada auditoría encontrada:
    // 1. Buscar supervisor del grupo
    // 2. Enviar mensaje interno al asesor
    // 3. Enviar mensaje interno al supervisor
    // 4. Marcar como notificada
}
```

### **Contenido del Mensaje**

```
🔔 RECORDATORIO DE SEGUIMIENTO

📋 Auditoría: [Nombre del Afiliado]
📞 Teléfono: [Teléfono]
📝 CUIL: [CUIL]
🏥 Obra Social: [Obra Social]

⚠️ Estado actual: Falta documentación
⏰ Tiempo en este estado: 15 horas

Esta auditoría lleva más de 12 horas en estado "falta de documentación". 

Por favor, contacta al afiliado lo antes posible para:
• Solicitar y recibir la documentación faltante
• Actualizar el estado a "Completa" una vez recibida

💡 Recuerda: Un seguimiento ágil mejora la tasa de conversión.

---
Este es un mensaje automático del sistema.
```

### **Archivos Creados/Modificados**

**Nuevo archivo: `backend/src/services/auditFollowUpScheduler.js`**
- Scheduler principal
- Función `checkAuditsForFollowUp()`
- Función `sendFollowUpNotification()`
- Inicialización: `startAuditFollowUpScheduler()`

**Modelo actualizado: `backend/src/models/Audit.js`**
```javascript
followUpNotificationSent: { type: Boolean, default: false }
```

**Controlador actualizado: `backend/src/controllers/auditController.js`**
- `updateStatus()`: Resetea flag cuando el estado cambia
- `updateAudit()`: Resetea flag cuando se edita el estado

**Servidor: `backend/src/server.js`**
```javascript
const { startAuditFollowUpScheduler } = require("./services/auditFollowUpScheduler");

// En la inicialización:
startAuditFollowUpScheduler(); // Verifica cada 1 hora
```

### **Flujo de Funcionamiento**

```
Estado cambia a "Falta documentación"
    ↓
statusUpdatedAt se actualiza
followUpNotificationSent = false
    ↓
[Pasan 12 horas]
    ↓
Scheduler detecta la auditoría
    ↓
Busca asesor y supervisor
    ↓
Envía mensajes internos
    ↓
followUpNotificationSent = true
    ↓
[Estado cambia a "Completa"]
    ↓
followUpNotificationSent = false (reseteo)
    ↓
Si vuelve a "Falta documentación":
puede notificar de nuevo después de 12h
```

### **Logs del Sistema**

```bash
# Inicio del scheduler
2025-11-07T12:09:39.346Z [info]: ⏰ AuditFollowUpScheduler iniciado (verificando cada 60 minutos)

# Verificación (si no hay auditorías)
ℹ️ No hay auditorías que necesiten seguimiento en este momento

# Cuando detecta auditorías
📋 Encontradas 2 auditorías que necesitan seguimiento
✅ Notificación de seguimiento enviada al asesor Juan Pérez (507f1f77bcf86cd799439011)
✅ Notificación de seguimiento enviada al supervisor María García (507f1f77bcf86cd799439012)
✅ Proceso de seguimiento completado: 2 notificaciones enviadas
```

---

## 📁 **Resumen de Archivos Modificados**

### **Frontend (3 archivos)**
1. ✅ `frontend/src/components/AuditEditModal.jsx`
   - Campo asesor como select para Gerencia
   - Carga de asesores del grupo

2. ✅ `frontend/src/pages/SalesForm.jsx`
   - CUIL obligatorio
   - Validación anti-duplicados mejorada
   - Límite de turnos actualizado (4 auditorías)

### **Backend (4 archivos)**
3. ✅ `backend/src/models/Audit.js`
   - Campo `followUpNotificationSent` agregado

4. ✅ `backend/src/controllers/auditController.js`
   - Reseteo de flag en `updateStatus()`
   - Reseteo de flag en `updateAudit()`

5. ✅ `backend/src/services/auditFollowUpScheduler.js` **(NUEVO)**
   - Scheduler completo de seguimiento

6. ✅ `backend/src/server.js`
   - Import y activación del nuevo scheduler

---

## ✅ **Despliegue**

```bash
# Frontend compilado
npm run build  # ✅ Exitoso en 5.89s

# Backend reiniciado
pm2 restart dann-salud-backend  # ✅ Reinicio #85

# Estado
✅ online
📦 18.6 MB memoria
🔄 Schedulers activos: 5
```

---

## 🧪 **Testing Recomendado**

### **Test 1 - Campo Asesor Editable**
```
1. Login como Gerencia
2. Ir a tabla de auditorías
3. Editar una auditoría
4. ✅ Verificar que campo Asesor es un select
5. ✅ Cambiar asesor y guardar
6. ✅ Verificar que se guardó el cambio

7. Login como Auditor
8. Editar misma auditoría
9. ✅ Verificar que campo Asesor es solo lectura
```

### **Test 2 - CUIL Obligatorio**
```
1. Ir a Pautar Auditoría/Venta
2. Intentar enviar formulario sin CUIL
3. ✅ Debe mostrar error: "CUIL es requerido"

4. Ingresar CUIL con 10 dígitos
5. ✅ Debe mostrar error: "CUIL debe tener exactamente 11 dígitos"

6. Ingresar CUIL ya usado (auditoría en estado Completa)
7. ✅ Debe mostrar error: "Ya existe una auditoría con ese CUIL..."

8. Ingresar CUIL ya usado (auditoría en estado Rechazada)
9. ✅ Debe permitir crear la nueva auditoría
```

### **Test 3 - Notificaciones Automáticas**
```
# Test manual (simulado)
1. Crear auditoría en estado "Falta documentación"
2. En MongoDB, actualizar statusUpdatedAt a hace 13 horas:
   db.audits.updateOne(
     { _id: ObjectId("...") },
     { $set: { statusUpdatedAt: new Date(Date.now() - 13 * 60 * 60 * 1000) }}
   )
3. Esperar hasta la próxima hora en punto
4. ✅ Verificar logs: "Encontradas X auditorías que necesitan seguimiento"
5. ✅ Verificar que asesor recibió mensaje interno
6. ✅ Verificar que supervisor recibió mensaje interno

# Test de reseteo
7. Cambiar estado de la auditoría a "Completa"
8. ✅ Verificar en MongoDB que followUpNotificationSent = false
9. Cambiar estado de vuelta a "Falta documentación"
10. Esperar 12+ horas
11. ✅ Debe enviar notificación de nuevo
```

---

## 📊 **Métricas de Cambio**

| Métrica | Antes | Después |
|---------|-------|---------|
| Campo Asesor editable | ❌ Solo lectura | ✅ Select para Gerencia |
| CUIL obligatorio | ❌ Opcional | ✅ Obligatorio |
| Validación anti-duplicados | ⚠️ Básica | ✅ Completa con excepción |
| Seguimiento automático | ❌ Manual | ✅ Automático cada 12h |
| Notificaciones supervisor | ❌ No | ✅ Sí |
| Schedulers activos | 4 | 5 |

---

## ⚙️ **Configuración del Scheduler**

El scheduler se ejecuta automáticamente con los siguientes parámetros:

```javascript
CHECK_INTERVAL_MS = 60 * 60 * 1000;        // Verifica cada 1 hora
FOLLOW_UP_THRESHOLD_MS = 12 * 60 * 60 * 1000;  // Umbral de 12 horas
```

Para cambiar estos valores, editar:
`backend/src/services/auditFollowUpScheduler.js`

---

## 🔍 **Monitoreo**

### **Ver logs del scheduler**
```bash
pm2 logs dann-salud-backend | grep "AuditFollowUp"
```

### **Ver auditorías pendientes de notificación**
```javascript
// En MongoDB
db.audits.find({
  status: { $in: ['Falta documentación', 'Falta clave'] },
  statusUpdatedAt: { $lte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
  followUpNotificationSent: { $ne: true }
}).count()
```

### **Resetear flag manualmente (si es necesario)**
```javascript
// En MongoDB - para volver a enviar notificación
db.audits.updateMany(
  { followUpNotificationSent: true },
  { $set: { followUpNotificationSent: false }}
)
```

---

## ⚠️ **Importante**

1. ✅ El scheduler inicia automáticamente con el backend
2. ✅ Primera ejecución después de 1 minuto del inicio (para no sobrecargar)
3. ✅ Verificaciones subsecuentes cada 1 hora
4. ✅ No se ejecuta en modo test
5. ✅ Los mensajes se envían a través de Sistema interno
6. ✅ Las notificaciones también usan Socket.io para notificación en tiempo real

---

**Sistema listo para producción** 🚀

**Última actualización**: 7 de noviembre, 2025 - 09:10 (UTC-3)
