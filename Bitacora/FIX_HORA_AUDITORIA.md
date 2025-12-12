# 🔧 Fix: Hora de Turnos + Límite de Auditorías

**Fecha**: 7 Noviembre 2025  
**Estado**: ✅ COMPLETADO

---

## 🐛 Problema 1: Hora Incorrecta en Modal

**Síntoma**: Auditoría programada a las 10:00 mostraba 13:00 en el modal de edición.

**Causa**: La hora UTC (13:00) se mostraba sin convertir a hora local Argentina (UTC-3).

**Solución**: Agregada función `getLocalDateTime()` que convierte UTC a hora local.

```javascript
// Nueva función en AuditEditModal.jsx (línea 31-46)
const getLocalDateTime = (utcDateString) => {
    if (!utcDateString) return { fecha: "", hora: "" };
    const date = new Date(utcDateString);
    // ... conversión a hora local
    return { fecha: "YYYY-MM-DD", hora: "HH:MM" };
};
```

✅ Ahora 10:00 se muestra correctamente como 10:00

---

## 📊 Problema 2: Límite de Auditorías

**Cambio**: Límite aumentado de 3 a 4 auditorías por turno.

**Modificación**:
- Frontend: `>= 4` → `>= 5` (línea 118)
- Backend: Comentario actualizado

✅ Ahora se permiten 4 auditorías por turno

---

## 📁 Archivos Modificados

1. `frontend/src/components/AuditEditModal.jsx`
   - Función getLocalDateTime()
   - Límite de turnos actualizado

2. `backend/src/controllers/auditController.js`
   - Comentario actualizado

---

## ✅ Despliegue

- Frontend compilado: 5.69s
- Backend reiniciado: PM2 restart #84
- Estado: online

---

## 🧪 Testing

**Test 1 - Hora Local**:
1. Crear auditoría a las 10:00
2. Editar → debe mostrar 10:00 (NO 13:00) ✅

**Test 2 - Límite**:
1. Crear 4 auditorías en mismo turno → OK ✅
2. Intentar 5ta → turno bloqueado ✅

**Test 3 - Reprogramar**:
1. Sin marcar "Reprogramar" → hora no cambia ✅
2. Con "Reprogramar" → permite cambiar ✅
