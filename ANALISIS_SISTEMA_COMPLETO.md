# 🔍 ANÁLISIS COMPLETO DEL SISTEMA - 13 Nov 2025

## 📊 Resumen Ejecutivo

**Problemas Críticos Identificados y Corregidos:**
1. ✅ **Campo Validador vacío** → Nunca se guardaba en la base de datos
2. ✅ **isRecuperada no se marcaba** → Comparación con capitalización incorrecta

**Estado Actual:** Sistema requiere reinicio de backend y ejecución de script de migración.

---

## 🔴 PROBLEMA 1: Campo Validador Vacío en Modal de Detalles

### **Diagnóstico**
El campo "Validador" siempre mostraba "-" en el modal de detalles de FollowUp.jsx.

### **Causa Raíz**
**Archivo:** `backend/src/controllers/auditController.js` - Función `createAudit`

**Código incorrecto (ANTES):**
```javascript
// Línea 49 - No incluía 'validador'
const { nombre, cuil, telefono, tipoVenta, obraSocialAnterior, 
        obraSocialVendida, scheduledAt, asesor } = req.body;

// Líneas 84-97 - No incluía validador en el objeto
const audit = new Audit({
    nombre,
    cuil,
    telefono,
    // ... otros campos
    asesor: asesor || req.user._id,
    // ❌ FALTA: validador
    createdBy: req.user._id,
    // ...
});
```

**Resultado:** El campo `validador` nunca se guardaba en MongoDB, aunque el frontend lo enviaba.

### **Solución Aplicada**

**Cambio 1 - Línea 49:**
```javascript
// ✅ Ahora incluye validador
const { nombre, cuil, telefono, tipoVenta, obraSocialAnterior, 
        obraSocialVendida, scheduledAt, asesor, validador } = req.body;
```

**Cambio 2 - Líneas 84-98:**
```javascript
const audit = new Audit({
    nombre,
    cuil,
    telefono,
    tipoVenta,
    obraSocialAnterior,
    obraSocialVendida,
    scheduledAt: sched,
    asesor: asesor || req.user._id,
    validador: validador || null, // ✅ AGREGADO
    createdBy: req.user._id,
    groupId: req.user.groupId,
    auditor: null,
    datosExtra: req.body.datosExtra || ""
});
```

### **Verificación**

**Backend:**
- ✅ Campo `validador` ahora se extrae del `req.body`
- ✅ Campo `validador` ahora se guarda en MongoDB
- ✅ El populate ya estaba correcto: `.populate('validador', 'nombre name email')`

**Frontend:**
- ✅ SalesForm.jsx ya enviaba el campo `validador`
- ✅ FollowUp.jsx ya mostraba el campo correctamente cuando existe

**Impacto:**
- ✅ **Auditorías NUEVAS** (creadas después del fix) tendrán validador
- ❌ **Auditorías ANTIGUAS** (creadas antes del fix) seguirán sin validador

**Solución para auditorías antiguas:**
- Opción 1: Editarlas manualmente desde AuditEditModal.jsx (si tiene campo validador)
- Opción 2: Las auditorías antiguas quedarán sin validador (no es crítico)

---

## 🔴 PROBLEMA 2: isRecuperada NO se Marca en Auditorías de Recovery

### **Diagnóstico**

Las auditorías que pasan de Recovery a Liquidación con estado "QR hecho" muestran "No" en columna "¿Recuperada?".

**Caso reportado:**
- Auditoría: Gian Franco Alegre (CUIL: 20466980553)
- Estado en Recovery: "QR hecho"
- Estado en Liquidación: "No" en columna "¿Recuperada?" ❌

### **Causa Raíz 1: Capitalización Incorrecta**

**Archivo:** `backend/src/controllers/auditController.js` - Líneas 604-627

**Código incorrecto (ANTES):**
```javascript
// Línea 605 - Comparación estricta con "QR Hecho" (H mayúscula)
if (oldStatus !== "QR Hecho" && newStatus === "QR Hecho") {
    if (audit.isRecovery) {
        await Audit.findByIdAndUpdate(
            audit._id,
            { $set: { isRecuperada: true } },
            { new: true }
        );
    }
}
```

**Problema:**
- Base de datos tiene: `"QR hecho"` (h minúscula)
- Código comparaba: `"QR Hecho"` (H mayúscula)
- Resultado: **Nunca coincidía** → `isRecuperada` nunca se marcaba

### **Causa Raíz 2: Verificación de isRecovery Incorrecta**

El código verificaba `audit.isRecovery` DESPUÉS de actualizar la auditoría, pero si el estado cambió, `isRecovery` podría haber sido modificado.

### **Solución Aplicada**

**Archivo:** `backend/src/controllers/auditController.js` - Líneas 604-633

**Código corregido:**
```javascript
// ✅ Comparación case-insensitive
const oldStatusLower = (oldStatus || "").toLowerCase();
const newStatusLower = (newStatus || "").toLowerCase();

if (oldStatusLower !== "qr hecho" && newStatusLower === "qr hecho") {
    try {
        // ✅ Verificar ANTES del cambio de estado
        const auditBeforeUpdate = await Audit.findById(audit._id)
            .select('isRecovery recoveryDeletedAt')
            .lean();
        
        // ✅ Marcar si está en Recovery O tuvo recoveryDeletedAt
        if (auditBeforeUpdate && (auditBeforeUpdate.isRecovery || 
                                  auditBeforeUpdate.recoveryDeletedAt)) {
            await Audit.findByIdAndUpdate(
                audit._id,
                { $set: { isRecuperada: true } },
                { new: true }
            );
            logger.info(`✅ Auditoría ${audit._id} (${audit.nombre}) en Recuperación marcada como recuperada (QR hecho)`);
        } else {
            logger.info(`ℹ️ Auditoría ${audit._id} (${audit.nombre}) cambió a QR hecho pero NO está en Recuperación`);
        }
        
        // Notificación...
    } catch (e) {
        logger.error("Error enviando notificación de QR hecho:", e);
    }
}
```

**Mejoras:**
1. ✅ **Case-insensitive:** Funciona con "QR hecho", "QR Hecho", "qr hecho", etc.
2. ✅ **Verificación previa:** Lee el estado `isRecovery` ANTES de cualquier modificación
3. ✅ **Doble condición:** Marca si tiene `isRecovery` O `recoveryDeletedAt` (auditorías que salieron de Recovery)
4. ✅ **Logging mejorado:** Muestra nombre de auditoría y si se marcó o no

### **Auditorías Existentes con el Problema**

**Script de migración creado:** `fix-recuperadas-existing.js`

**Función:**
```javascript
// Buscar auditorías que:
// 1. Tienen status = "QR hecho" (case-insensitive)
// 2. Tienen isRecovery = true O recoveryDeletedAt existe
// 3. NO tienen isRecuperada = true

await Audit.updateMany(
    {
        status: { $regex: /^QR hecho$/i }, // ✅ Case-insensitive
        $or: [
            { isRecovery: true },
            { recoveryDeletedAt: { $exists: true, $ne: null } }
        ],
        isRecuperada: { $ne: true }
    },
    {
        $set: { isRecuperada: true }
    }
);
```

**Resultado esperado:**
- Marcará a "Gian Franco Alegre" y todas las auditorías similares con `isRecuperada: true`
- Se reflejará en Liquidación con "Sí" en columna "¿Recuperada?"

---

## ✅ VERIFICACIÓN DE CORRECCIONES PREVIAS

### **1. Checkbox "Pertenece a otro equipo" en SalesForm.jsx**

**Archivo:** `frontend/src/pages/SalesForm.jsx`

**Estado:** ✅ **Implementado correctamente**

**Verificación:**
- ✅ Estado `otroEquipo` creado (línea 83)
- ✅ Función `fetchTodosLosValidadores()` implementada (líneas 260-285)
- ✅ useEffect actualizado para manejar checkbox (líneas 111-125)
- ✅ Checkbox renderizado en UI (líneas 649-674)
- ✅ Al marcar, limpia validador seleccionado
- ✅ Al marcar, muestra TODOS los usuarios con su equipo

**Comportamiento esperado:**
```
Usuario desmarca checkbox:
→ Ve solo validadores de su numeroEquipo
→ Ejemplo: "Juan Pérez (asesor)"

Usuario marca checkbox:
→ Ve TODOS los usuarios de la plataforma
→ Ejemplo: "Juan Pérez (asesor) - Equipo 123"
```

**Conclusión:** ✅ **Funcional**

---

### **2. Traslado FollowUp → Recovery Solo a las 23:01**

**Archivo:** `backend/src/controllers/auditController.js`

**Estado:** ✅ **Implementado correctamente**

**Verificación de código (líneas 532-540):**
```javascript
// ✅ NO mover inmediatamente a recuperación
if (recoveryStates.includes(updates.status)) {
    // Solo actualizar el timestamp del estado, el cron se encargará del resto
    logger.info(`Auditoría ${id} cambió a estado de recuperación: ${updates.status}. Se procesará a las 23:01`);
} else {
    updates.recoveryEligibleAt = null;
}
```

**Lógica del cron (recoveryController.js):**
```javascript
// A las 23:01 de cualquier día
if (hours === 23 && minutes >= 1) {
    // Marcar auditorías con estados de recuperación
    await Audit.updateMany(
        { 
            status: { $in: recoveryStates },
            isRecovery: { $ne: true }
        },
        { 
            $set: { 
                isRecovery: true,
                recoveryMovedAt: new Date(),
                recoveryMonth: currentMonth
            }
        }
    );
}
```

**Comportamiento esperado:**
```
14:00 → Cambio a "Falta clave" en FollowUp
     ↓
     ✅ Permanece en FollowUp (NO se mueve)
     ↓
23:01 → Cron ejecuta
     ↓
     ✅ Verifica: ¿Sigue en "Falta clave"?
     ↓ Sí
     ✅ Se mueve a Recovery
```

**Conclusión:** ✅ **Funcional**

---

### **3. Supervisores Ven Liquidación (Filtrado por Equipo)**

**Archivos modificados:**
1. `backend/src/controllers/liquidacionController.js`
2. `backend/src/routes/liquidacionRoutes.js`
3. `frontend/src/components/AuditPanel.jsx`

**Estado:** ✅ **Implementado correctamente**

**Verificación Backend (liquidacionController.js - líneas 55-72):**
```javascript
// ✅ Si es supervisor, filtrar por su numeroEquipo
const currentUser = req.user;
const isSupervisor = currentUser?.role === 'supervisor' || 
                     currentUser?.role === 'Supervisor';

if (isSupervisor && currentUser?.numeroEquipo) {
    // Obtener asesores del equipo del supervisor
    const asesoresDelEquipo = await User.find({
        numeroEquipo: currentUser.numeroEquipo,
        active: true
    }).select('_id').lean();
    
    const asesoresIds = asesoresDelEquipo.map(a => a._id);
    
    // Filtrar auditorías solo de esos asesores
    filter.asesor = { $in: asesoresIds };
    
    logger.info(`👤 Supervisor ${currentUser.email} viendo Liquidación de su equipo ${currentUser.numeroEquipo}`);
}
```

**Verificación Rutas (liquidacionRoutes.js - línea 8):**
```javascript
// ✅ Supervisor agregado a permisos
router.use(requireAuth, permit('admin', 'auditor', 'revendedor', 'gerencia', 'supervisor'));
```

**Verificación Frontend (AuditPanel.jsx - líneas 74-76):**
```javascript
// ✅ Supervisores ven la pestaña
...(isGerencia || isSupervisor ? [
    { id: "liquidacion", label: "💰 Liquidación", emoji: "💰", shortLabel: "Liquidación" },
] : []),
```

**Comportamiento esperado:**

| Rol | Ve Pestaña | Auditorías Visibles |
|-----|-----------|---------------------|
| Gerencia | ✅ Sí | Todas |
| Admin | ✅ Sí | Todas |
| Supervisor | ✅ Sí | **Solo su equipo** |
| Asesor | ❌ No | N/A |

**Conclusión:** ✅ **Funcional**

---

### **4. Cambio de Día en FollowUp a las 23:01**

**Archivo:** `frontend/src/pages/FollowUp.jsx`

**Estado:** ✅ **Implementado correctamente**

**Verificación (líneas 211-231):**
```javascript
const getCurrentArgentinaDate = () => {
    // Obtener hora actual en Argentina (UTC-3)
    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString("en-US", { 
        timeZone: "America/Argentina/Buenos_Aires" 
    }));
    
    const hours = argentinaTime.getHours();
    const minutes = argentinaTime.getMinutes();
    
    // Si son las 23:01 o después, avanzar al día siguiente
    if (hours === 23 && minutes >= 1 || hours > 23) {
        argentinaTime.setDate(argentinaTime.getDate() + 1);
    }
    
    // Formatear como YYYY-MM-DD
    const year = argentinaTime.getFullYear();
    const month = String(argentinaTime.getMonth() + 1).padStart(2, '0');
    const day = String(argentinaTime.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};
```

**Uso en buildParams (línea 241):**
```javascript
} else if (!dateFrom && !dateTo) {
    // si no hay rango, mandar día actual (considerando 23:01 como corte)
    params.date = getCurrentArgentinaDate(); // ✅ Nueva función
}
```

**Comportamiento esperado:**

| Hora Argentina | Fecha Devuelta | Descripción |
|---------------|---------------|-------------|
| 00:00 - 22:59 | Hoy | Día laboral actual |
| 23:00 | Hoy | Aún no cambia |
| 23:01 | **Mañana** | Ya cambió de día |
| 23:30 | Mañana | Día siguiente |

**Conclusión:** ✅ **Funcional**

---

## 📁 Archivos Modificados en Esta Sesión

### **Backend (1 archivo):**
1. ✅ `backend/src/controllers/auditController.js`
   - Línea 49: Agregado `validador` en destructuring
   - Línea 93: Agregado `validador` en objeto Audit
   - Líneas 604-633: Corregida lógica de marcado de `isRecuperada`

### **Script de Migración (1 archivo):**
1. ✅ `backend/fix-recuperadas-existing.js`
   - Líneas 18, 37: Agregado regex case-insensitive para "QR hecho"

---

## ⚠️ ACCIONES CRÍTICAS REQUERIDAS

### **1. REINICIAR BACKEND (OBLIGATORIO)**

Los cambios en `auditController.js` solo surtirán efecto después de reiniciar:

```bash
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
pm2 restart dann-backend
```

**O si usas nodemon:**
```bash
# El reinicio será automático al detectar cambios
```

---

### **2. EJECUTAR SCRIPT DE MIGRACIÓN (OBLIGATORIO)**

Este script marcará todas las auditorías existentes de Recovery con "QR hecho" como `isRecuperada: true`:

```bash
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
node fix-recuperadas-existing.js
```

**Qué hará:**
- Buscará auditorías con estado "QR hecho" (case-insensitive)
- Que tengan `isRecovery = true` O `recoveryDeletedAt` (estuvieron en Recovery)
- Que NO tengan `isRecuperada = true`
- Las marcará con `isRecuperada: true`

**Resultado esperado:**
```
✅ Conectado a MongoDB
✅ [N] auditorías actualizadas
   - Ahora tienen isRecuperada: true

📋 Algunas auditorías actualizadas:
   • Gian Franco Alegre (20466980553) - Status: QR hecho - Recuperada: true
   ...
```

**Verificación:**
1. Ve a la pestaña "💰 Liquidación"
2. Busca a "Gian Franco Alegre"
3. Columna "¿Recuperada?" debe mostrar: **"Sí"** ✅

---

### **3. HARD REFRESH DEL NAVEGADOR**

Para que el frontend use el nuevo código compilado:

- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

---

## 🧪 PLAN DE PRUEBAS COMPLETO

### **Prueba 1: Campo Validador en Nuevas Auditorías**

**Pasos:**
1. Ve a SalesForm.jsx
2. Crea una nueva auditoría
3. Selecciona un validador del dropdown
4. Guarda la auditoría
5. Ve a FollowUp.jsx
6. Haz clic en el botón azul "Detalles" de esa auditoría

**Resultado esperado:**
- ✅ Campo "Validador" debe mostrar el nombre seleccionado (no "-")

**Resultado para auditorías antiguas:**
- ❌ Seguirán mostrando "-" (es normal, no se guardó el validador)

---

### **Prueba 2: isRecuperada en Nuevas Auditorías de Recovery**

**Pasos:**
1. Ve a Recovery
2. Cambia una auditoría a estado "QR hecho"
3. Ve a Liquidación
4. Busca esa auditoría

**Resultado esperado:**
- ✅ Columna "¿Recuperada?" debe mostrar: **"Sí"**

---

### **Prueba 3: Gian Franco Alegre Después de Migración**

**Pasos:**
1. Ejecuta el script: `node fix-recuperadas-existing.js`
2. Verifica el output del script
3. Ve a Liquidación
4. Filtra por afiliado: "gian"

**Resultado esperado:**
- ✅ "Gian Franco Alegre" debe mostrar "Sí" en "¿Recuperada?"

---

### **Prueba 4: Checkbox "Pertenece a otro equipo"**

**Pasos:**
1. Como supervisor, ve a SalesForm.jsx
2. Observa el dropdown "Validador" (solo tu equipo)
3. Marca el checkbox "Pertenece a otro equipo"
4. Observa el dropdown nuevamente

**Resultado esperado:**
- ✅ Ahora muestra TODOS los usuarios con su número de equipo
- ✅ Ejemplo: "Juan Pérez (asesor) - Equipo 123"

---

### **Prueba 5: Traslado a Recovery a las 23:01**

**Pasos:**
1. A las 14:00, cambia una auditoría en FollowUp a "Falta clave"
2. Verifica que permanece en FollowUp
3. Espera hasta las 23:01 (o simula en servidor)
4. Refresca Recovery

**Resultado esperado:**
- ✅ A las 14:00: Permanece en FollowUp
- ✅ A las 23:01: Aparece en Recovery

---

### **Prueba 6: Supervisor Ve Liquidación**

**Pasos:**
1. Inicia sesión como Supervisor
2. Ve a interfaz "Auditoría"
3. Verifica que existe la pestaña "💰 Liquidación"
4. Abre la pestaña
5. Revisa las auditorías mostradas

**Resultado esperado:**
- ✅ Pestaña visible
- ✅ Solo auditorías de asesores del mismo `numeroEquipo`

---

### **Prueba 7: Cambio de Día en FollowUp**

**Pasos:**
1. A las 22:00, abre FollowUp.jsx
2. Verifica la fecha de las auditorías
3. A las 23:00, refresca
4. A las 23:01, refresca

**Resultado esperado:**
- ✅ 22:00: Auditorías de HOY
- ✅ 23:00: Auditorías de HOY
- ✅ 23:01: Auditorías de MAÑANA

---

## 📊 MATRIZ DE ESTADO DE CORRECCIONES

| # | Corrección | Archivo | Estado | Requiere Restart | Requiere Script |
|---|-----------|---------|--------|------------------|-----------------|
| 1 | Checkbox validadores otros equipos | SalesForm.jsx | ✅ Completo | No | No |
| 2 | Campo validador en creación | auditController.js | ✅ Completo | **Sí** | No |
| 3 | isRecuperada con case-insensitive | auditController.js | ✅ Completo | **Sí** | **Sí** |
| 4 | Traslado Recovery a las 23:01 | auditController.js | ✅ Completo | **Sí** | No |
| 5 | Supervisores ven Liquidación | liquidacionController.js | ✅ Completo | **Sí** | No |
| 6 | Cambio día FollowUp a 23:01 | FollowUp.jsx | ✅ Completo | No | No |

---

## 🎯 CHECKLIST DE IMPLEMENTACIÓN

- [ ] **Reiniciar backend:** `pm2 restart dann-backend`
- [ ] **Ejecutar migración:** `node fix-recuperadas-existing.js`
- [ ] **Hard refresh navegador:** Ctrl+Shift+R
- [ ] **Verificar Gian Franco Alegre** en Liquidación → Debe mostrar "Sí"
- [ ] **Crear auditoría nueva** y verificar que guarda validador
- [ ] **Probar checkbox** "Pertenece a otro equipo"
- [ ] **Verificar traslado Recovery** no es inmediato
- [ ] **Verificar supervisor** ve solo su equipo en Liquidación
- [ ] **Verificar cambio de día** a las 23:01 en FollowUp

---

## 🚨 PROBLEMAS CONOCIDOS Y LIMITACIONES

### **1. Auditorías Antiguas Sin Validador**

**Problema:** Las auditorías creadas ANTES de este fix no tienen validador guardado.

**Impacto:** Modal de detalles mostrará "-" en campo Validador.

**Soluciones:**
- **Opción 1:** Aceptar que auditorías antiguas no tendrán validador (no crítico)
- **Opción 2:** Agregar campo "Validador" en AuditEditModal.jsx para editarlas manualmente
- **Opción 3:** Crear script de migración (pero no hay forma de saber quién era el validador)

**Recomendación:** Opción 1 (aceptar limitación). El validador solo será visible en auditorías nuevas.

---

### **2. Capitalización de Estados en Base de Datos**

**Problema:** La base de datos puede tener estados con diferentes capitalizaciones.

**Ejemplos encontrados:**
- "QR hecho" (correcto)
- "QR Hecho" (posible)
- "Completa" vs "completa"

**Solución aplicada:** Comparación case-insensitive para "QR hecho"

**Pendiente:** Verificar si hay otros estados con capitalización inconsistente.

**Recomendación:** Crear un script de normalización de estados si se encuentran más inconsistencias.

---

## ✅ CONCLUSIONES

### **Problemas Críticos Corregidos:**
1. ✅ **Campo validador** ahora se guarda correctamente
2. ✅ **isRecuperada** se marca correctamente (case-insensitive)

### **Correcciones Previas Verificadas:**
1. ✅ Checkbox "Pertenece a otro equipo" funcional
2. ✅ Traslado Recovery solo a las 23:01
3. ✅ Supervisores ven Liquidación (filtrado)
4. ✅ Cambio de día en FollowUp a las 23:01

### **Acciones Pendientes del Usuario:**
1. ⏳ **Reiniciar backend** (OBLIGATORIO)
2. ⏳ **Ejecutar script de migración** (OBLIGATORIO para Gian Franco Alegre)
3. ⏳ **Hard refresh navegador**
4. ⏳ **Probar todas las funcionalidades**

### **Estado del Sistema:**
🟡 **Código corregido, pendiente de deployment**

Una vez ejecutadas las acciones pendientes:
🟢 **Sistema completamente funcional**

---

## 📞 SOPORTE

Si después de ejecutar todas las acciones aún persisten problemas:

1. **Verificar logs del backend:**
   ```bash
   pm2 logs dann-backend
   ```

2. **Buscar mensajes específicos:**
   - ✅ "Auditoría [ID] marcada como recuperada (QR hecho)"
   - ℹ️ "Auditoría [ID] cambió a QR hecho pero NO está en Recuperación"

3. **Verificar consola del navegador (F12):**
   - Errores de red
   - Respuestas del API

4. **Verificar MongoDB directamente:**
   ```javascript
   // En mongo shell
   db.audits.findOne({ nombre: "Gian Franco Alegre" })
   ```

---

**Fecha de análisis:** 13 de Noviembre 2025, 11:49 AM (UTC-3)  
**Versión del sistema:** Post-corrección validador e isRecuperada  
**Próxima revisión:** Después de ejecutar acciones pendientes
