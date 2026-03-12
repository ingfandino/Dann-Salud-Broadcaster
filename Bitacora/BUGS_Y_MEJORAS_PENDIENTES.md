# 🐛 Bugs y Mejoras Pendientes - Dann+Salud Broadcaster

## 📋 BUGS DETECTADOS

### ❌ BUG 1: Mensajes duplicados al mismo contacto
**Síntoma**: A veces se envían múltiples mensajes al mismo contacto a pesar de aparecer solo una vez en el archivo.

**Análisis**:
- El código tiene protección contra duplicados (`seenPhones` Set en línea 158)
- Detecta y omite duplicados (líneas 223-235)
- Posible causa: 
  1. Reinicio de jobs no reconstruye correctamente el Set
  2. Jobs paralelos procesando mismo contacto
  3. Archivo Excel con duplicados ocultos (diferentes formatos de número)

**Solución**:
- Agregar índice único en Message para (job + contact)
- Mejorar normalización de teléfonos antes de importar
- Agregar verificación de duplicados a nivel de base de datos

---

### ❌ BUG 2: No se envían auto-respuestas
**Síntoma**: Las auto-respuestas configuradas no se están enviando cuando los afiliados responden.

**Análisis**:
- Necesario verificar:
  1. Listener de mensajes entrantes
  2. Lógica de detección de palabras clave
  3. Logs de auto-respuestas

**Archivos a revisar**:
- `/backend/src/services/autoresponseHandler.js` (o similar)
- `/backend/src/services/whatsappUnified.js` (listener de mensajes)
- Modelo `AutoResponse`

**Solución pendiente**: Investigar listener de mensajes entrantes

---

### ✅ BUG 3: Ordenar Reports por fecha (recientes primero)
**Estado**: **YA ESTÁ CORREGIDO** ✅

Archivo: `/frontend/src/pages/Reports.jsx` líneas 96-98
```javascript
return out.sort((a, b) => 
    new Date(b.scheduledFor || b.createdAt) - new Date(a.scheduledFor || a.createdAt)
);
```

---

### ❌ BUG 4: Panel 'Campaña creada' debe mostrar solo campañas del día
**Síntoma**: El panel inferior de BulkMessage.jsx muestra todas las campañas en lugar de solo las del día.

**Solución**:
- Filtrar `jobs` por fecha actual
- Comparar `createdAt` con inicio y fin del día de hoy

**Implementación**:
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const todayJobs = jobs.filter(job => {
    const createdAt = new Date(job.createdAt);
    return createdAt >= today && createdAt < tomorrow;
});
```

---

### ❌ BUG 5: No se registran respuestas de afiliados
**Síntoma**: Afiliado "BETETA AGUSTIN LEONEL OSMAR" respondió pero aparece "No" en columna "Respondió" del Excel.

**Análisis**:
- Necesario verificar:
  1. Listener de mensajes entrantes (`onMessage`)
  2. Actualización de campo `replied` en modelo `Message`
  3. Exportación Excel incluye campo `replied`

**Archivos a revisar**:
- `/backend/src/services/whatsappUnified.js` (listener)
- `/backend/src/controllers/sendJobController.js` (exportJobResultsExcel)
- Modelo `Message`

**Solución pendiente**: Investigar listener y actualización de replied

---

### ❌ BUG 6: Campo 'Hora' se modifica automáticamente en AuditEditModal
**Síntoma**: El campo hora del turno cambia automáticamente sin activar el checkbox "Reprogramar".

**Archivo**: `/frontend/src/components/AuditEditModal.jsx`

**Análisis**:
```javascript
// Línea 47
hora: audit.scheduledAt ? audit.scheduledAt.split("T")[1]?.slice(0, 5) : "",
```

**Problema**: El estado inicial del form se establece con la hora actual del audit, pero al parecer se está re-renderizando o modificando.

**Solución**:
1. Solo permitir edición de hora si `reprogramar === true`
2. Deshabilitar input de hora cuando reprogramar esté en false
3. No actualizar hora en el submit si reprogramar es false

**Implementación**:
```jsx
<input
    type="time"
    value={form.hora}
    onChange={(e) => setForm({ ...form, hora: e.target.value })}
    disabled={!reprogramar} // ← Agregar esta línea
    className={`border p-2 rounded ${!reprogramar ? 'bg-gray-100' : ''}`}
/>
```

---

### ❌ BUG 7: Sin notificaciones cuando auditoría pasa a 'Completa' o 'QR Hecho'
**Síntoma**: No se notifica al Asesor y Supervisor cuando una auditoría cambia a estado 'Completa' o 'QR Hecho'.

**Archivos**:
- `/backend/src/controllers/auditController.js` (updateAudit o similar)

**Solución**:
Detectar cambio de estado a 'Completa' o 'QR Hecho' y:
1. Obtener asesor que creó el turno
2. Obtener supervisor del mismo `numeroEquipo`
3. Enviar notificación interna a ambos

**Implementación**:
```javascript
// En updateAudit
if (['Completa', 'QR hecho'].includes(newStatus) && oldStatus !== newStatus) {
    // Notificar asesor
    const asesor = audit.asesor;
    
    // Notificar supervisor del mismo equipo
    const supervisor = await User.findOne({
        role: 'supervisor',
        numeroEquipo: asesor.numeroEquipo
    });
    
    // Enviar notificaciones
    const message = `✅ Auditoría de ${audit.nombre} completada: ${newStatus}`;
    await NotificationService.send([asesor._id, supervisor._id], message);
}
```

---

## 🎯 MEJORAS SOLICITADAS

### ➕ MEJORA 1: Columna 'Respuestas' en Reports.jsx
**Descripción**: Agregar columna que muestre el total de respuestas recibidas en cada campaña.

**Implementación**:
1. Backend: Agregar campo `repliesCount` al endpoint `/send-jobs`
2. Calcular con: `Message.countDocuments({ job: jobId, direction: 'inbound' })`
3. Frontend: Agregar columna en tabla de Reports

**Código**:
```javascript
// Backend - sendJobController.js
const repliesCount = await Message.countDocuments({
    job: job._id,
    direction: 'inbound'
});

return {
    ...jobData,
    repliesCount
};
```

```jsx
// Frontend - Reports.jsx
<th>Respuestas</th>
// ...
<td>{campaign.repliesCount || 0}</td>
```

---

### ➕ MEJORA 2: Columna 'Hora de creación' en panel de campañas (BulkMessage.jsx)
**Descripción**: Incluir hora de creación en el panel inferior de campañas.

**Implementación**:
```jsx
<td>
    {new Date(job.createdAt).toLocaleString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
    })}
</td>
```

---

### ➕ MEJORA 3: Reporte Excel de auto-respuestas
**Descripción**: Nuevo reporte que recopile todas las auto-respuestas enviadas en una campaña.

**Formato del reporte**:
1. **Hoja 1 - Detalle**: 
   - Columnas: Afiliado | Teléfono | Palabra Clave Respondida | Auto-respuesta Enviada | Fecha/Hora

2. **Hoja 2 - Resumen**:
   - Columnas: Palabra Clave | Cantidad de Respuestas
   - Ejemplo: 
     - B: 24
     - D: 27
     - Comodín: 10

**Implementación**:
1. Crear modelo `AutoResponseLog` para guardar cada envío de auto-respuesta
2. Crear endpoint `/send-jobs/:id/autoresponse-report`
3. Generar Excel con las 2 hojas

**Modelo AutoResponseLog**:
```javascript
{
    job: ObjectId,
    contact: ObjectId,
    keyword: String,
    response: String,
    isFallback: Boolean,
    sentAt: Date
}
```

**Endpoint**:
```javascript
exports.exportAutoResponseReport = async (req, res) => {
    const jobId = req.params.id;
    
    // Obtener todos los logs de auto-respuestas
    const logs = await AutoResponseLog.find({ job: jobId })
        .populate('contact', 'nombre telefono')
        .sort({ sentAt: 1 });
    
    // Generar Excel con 2 hojas
    const workbook = new ExcelJS.Workbook();
    
    // Hoja 1: Detalle
    const detailSheet = workbook.addWorksheet('Detalle');
    detailSheet.columns = [
        { header: 'Afiliado', key: 'nombre', width: 30 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Palabra Clave', key: 'keyword', width: 20 },
        { header: 'Auto-respuesta', key: 'response', width: 50 },
        { header: 'Fecha/Hora', key: 'sentAt', width: 20 }
    ];
    
    logs.forEach(log => {
        detailSheet.addRow({
            nombre: log.contact.nombre,
            telefono: log.contact.telefono,
            keyword: log.isFallback ? 'Comodín' : log.keyword,
            response: log.response,
            sentAt: log.sentAt
        });
    });
    
    // Hoja 2: Resumen
    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.columns = [
        { header: 'Palabra Clave', key: 'keyword', width: 20 },
        { header: 'Cantidad', key: 'count', width: 15 }
    ];
    
    // Agrupar por keyword
    const grouped = logs.reduce((acc, log) => {
        const key = log.isFallback ? 'Comodín' : log.keyword;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    
    Object.entries(grouped).forEach(([keyword, count]) => {
        summarySheet.addRow({ keyword, count });
    });
    
    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=autorespuestas_${jobId}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
};
```

---

## 📊 PRIORIDADES

### 🔴 ALTA (Bugs críticos):
1. ❌ BUG 2: Auto-respuestas no se envían
2. ❌ BUG 5: No se registran respuestas de afiliados
3. ❌ BUG 7: Sin notificaciones en auditorías

### 🟡 MEDIA (Bugs menores):
4. ❌ BUG 1: Mensajes duplicados
5. ❌ BUG 4: Filtrar campañas del día
6. ❌ BUG 6: Hora se modifica automáticamente

### 🟢 BAJA (Mejoras):
7. ➕ MEJORA 1: Columna respuestas en Reports
8. ➕ MEJORA 2: Hora de creación en panel
9. ➕ MEJORA 3: Reporte Excel auto-respuestas

---

## 🔧 PLAN DE IMPLEMENTACIÓN

### Fase 1: Bugs Críticos (Inmediato)
- [ ] Investigar y corregir BUG 2 (auto-respuestas)
- [ ] Investigar y corregir BUG 5 (registro de respuestas)
- [ ] Implementar BUG 7 (notificaciones en auditorías)

### Fase 2: Bugs Menores (Corto plazo)
- [ ] Implementar BUG 4 (filtrar campañas del día)
- [ ] Implementar BUG 6 (bloquear hora en AuditEditModal)
- [ ] Revisar BUG 1 (mensajes duplicados)

### Fase 3: Mejoras (Mediano plazo)
- [ ] Implementar MEJORA 1 (columna respuestas)
- [ ] Implementar MEJORA 2 (hora de creación)
- [ ] Implementar MEJORA 3 (reporte auto-respuestas)

---

## 📝 NOTAS TÉCNICAS

### Archivos Clave a Modificar:
- `/backend/src/services/whatsappUnified.js` - Listener de mensajes
- `/backend/src/services/autoresponseHandler.js` - Lógica auto-respuestas
- `/backend/src/controllers/auditController.js` - Notificaciones auditorías
- `/backend/src/controllers/sendJobController.js` - Exportaciones y stats
- `/frontend/src/pages/BulkMessages.jsx` - Filtrado de campañas
- `/frontend/src/components/AuditEditModal.jsx` - Bloqueo de hora
- `/frontend/src/pages/Reports.jsx` - Columna de respuestas

### Testing Necesario:
1. Probar auto-respuestas con diferentes palabras clave
2. Verificar registro de respuestas en BD
3. Probar notificaciones de auditorías
4. Validar exportación Excel con nueva columna
5. Verificar filtrado de campañas por fecha

---

**Última actualización**: 5 de noviembre, 2025  
**Estado**: Pendiente de implementación
