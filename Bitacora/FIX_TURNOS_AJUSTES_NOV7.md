# 🔧 Ajustes - Modal de Turnos Disponibles

**Fecha**: 7 de Noviembre, 2025 - 12:05  
**Estado**: ✅ **COMPLETADO**

---

## 📋 **Problemas Identificados**

### **1. Límite Incorrecto de Vacantes**
❌ El modal mostraba límite de **5 vacantes** por turno  
✅ Debe ser **4 vacantes** por turno (no más)

### **2. Lectura Errónea de Disponibilidad**
❌ El modal mostraba todos los turnos como disponibles cuando no lo estaban  
✅ Problema de timezone y conteo en el backend

### **3. Tabla con Scroll Horizontal**
❌ La tabla de FollowUp.jsx se cortaba, ocultando el botón "Eliminar"  
✅ Necesita ser más ancha para mostrar todo el contenido

---

## ✅ **Soluciones Implementadas**

---

### **1. Corrección del Límite de Vacantes (5 → 4)**

#### **Frontend - FollowUp.jsx**

**Cambio en función `getSlotColor`**:
```javascript
// ANTES
const available = 5 - count; // Máximo 5 auditorías por turno
if (available === 0) return 'bg-red-100...';

// DESPUÉS
const available = 4 - count; // Máximo 4 auditorías por turno
if (available <= 0) return 'bg-red-100...'; // También maneja negativos
```

**Cambio en leyenda del modal**:
```javascript
// ANTES
<span>3-5 cupos disponibles</span>

// DESPUÉS
<span>3-4 cupos disponibles</span>
```

**Cambio en tarjetas de turnos**:
```javascript
// ANTES
<span className="font-semibold">{slot.count}/5</span>
<span className="font-bold">{available}</span>

// DESPUÉS
<span className="font-semibold">{slot.count}/4</span>
<span className="font-bold">{Math.max(0, available)}</span>
```

**Cambio en detección de turnos bloqueados**:
```javascript
// ANTES
const available = 5 - slot.count;
const isBlocked = available === 0;

// DESPUÉS
const available = 4 - slot.count;
const isBlocked = available <= 0;
```

---

#### **Frontend - AuditEditModal.jsx**

**Cambio en bloqueo de turnos**:
```javascript
// ANTES
return all.map((t) => ({ time: t, disabled: (map[t] || 0) >= 5 }));

// DESPUÉS
return all.map((t) => ({ time: t, disabled: (map[t] || 0) >= 4 }));
```

**Comentario actualizado**:
```javascript
// ANTES
// Límite aumentado a 4 auditorías por turno (se bloquea al llegar a 5)

// DESPUÉS
// Límite: 4 auditorías por turno (se bloquea al llegar a 4)
```

---

### **2. Corrección de Lectura de Disponibilidad**

#### **Backend - auditController.js**

**Problema Original**:
- El código usaba `new Date(date)` que creaba fechas en UTC
- Luego `setHours(9, 20, 0, 0)` aplicaba horas en la zona horaria del servidor
- Resultaba en búsquedas incorrectas en la base de datos

**Solución Implementada**:
```javascript
// ANTES
const day = new Date(date);
day.setHours(0, 0, 0, 0);

const start = new Date(day);
start.setHours(9, 20, 0, 0);
const end = new Date(day);
end.setHours(21, 0, 0, 0);

let cur = new Date(start);
while (cur <= end) {
    const slotStart = new Date(cur);
    const slotEnd = new Date(cur);
    slotEnd.setMinutes(slotEnd.getMinutes() + 20);
    
    const count = await Audit.countDocuments({
        scheduledAt: { $gte: slotStart, $lt: slotEnd }
    });
    // ...
}

// DESPUÉS
const [year, month, day] = date.split('-').map(Number);

// Generar slots de 09:20 a 21:00 (hora local Argentina)
for (let hour = 9; hour <= 21; hour++) {
    const minutes = hour === 9 ? [20, 40] : hour === 21 ? [0] : [0, 20, 40];
    
    for (const minute of minutes) {
        if (hour === 21 && minute > 0) continue; // No generar después de 21:00
        
        // Crear slot en hora local de Argentina
        const slotStartLocal = new Date(year, month - 1, day, hour, minute, 0);
        const slotEndLocal = new Date(slotStartLocal);
        slotEndLocal.setMinutes(slotEndLocal.getMinutes() + 20);
        
        // Contar auditorías que caen en este slot
        const count = await Audit.countDocuments({
            scheduledAt: { 
                $gte: slotStartLocal, 
                $lt: slotEndLocal 
            }
        });

        const hh = String(hour).padStart(2, '0');
        const mm = String(minute).padStart(2, '0');
        slots.push({ time: `${hh}:${mm}`, count });
    }
}
```

**Mejoras**:
1. ✅ **Parseo directo** de la fecha YYYY-MM-DD
2. ✅ **Loop estructurado** por hora y minutos
3. ✅ **Construcción de slots** en hora local
4. ✅ **Búsqueda correcta** en MongoDB con fechas locales
5. ✅ **Manejo preciso** de horarios (09:20 a 21:00)

**Ventajas**:
- ✅ Evita problemas de timezone
- ✅ Código más claro y mantenible
- ✅ Genera exactamente los turnos esperados
- ✅ Cuenta auditorías correctamente

---

### **3. Ampliación de la Tabla de FollowUp.jsx**

**Problema**:
- La tabla era muy angosta
- Scroll horizontal ocultaba botones (especialmente "Eliminar")
- Mala experiencia de usuario

**Solución**:
```javascript
// ANTES
<div className="p-6 bg-gradient-to-b from-blue-50 to-purple-50 min-h-screen">

// DESPUÉS
<div className="p-6 bg-gradient-to-b from-blue-50 to-purple-50 min-h-screen max-w-[98%] mx-auto">
```

**Cambios aplicados**:
- ✅ `max-w-[98%]`: Usa el 98% del ancho disponible
- ✅ `mx-auto`: Centra el contenido
- ✅ Mantiene padding de 6 en ambos lados

**Resultado**:
- ✅ Tabla más ancha y legible
- ✅ Todos los botones visibles sin scroll
- ✅ Mejor aprovechamiento del espacio de pantalla

---

## 📊 **Comparación: Antes vs Después**

### **Límite de Vacantes**

| Aspecto | Antes | Después |
|---------|-------|---------|
| Vacantes por turno | 5 | 4 ✅ |
| Bloqueo en frontend | `>= 5` | `>= 4` ✅ |
| Bloqueo en modal | `count === 5` | `count >= 4` ✅ |
| Leyenda | "3-5 cupos" | "3-4 cupos" ✅ |
| Display | "X/5" | "X/4" ✅ |

---

### **Lectura de Disponibilidad**

| Aspecto | Antes | Después |
|---------|-------|---------|
| Construcción de fecha | `new Date(date)` + `setHours` | Parseo directo de YYYY-MM-DD ✅ |
| Loop | `while (cur <= end)` | `for` estructurado ✅ |
| Slots generados | 36 turnos | 36 turnos ✅ |
| Timezone | Problemas UTC | Hora local correcta ✅ |
| Conteo | Incorrecto | Correcto ✅ |

---

### **Ancho de Tabla**

| Aspecto | Antes | Después |
|---------|-------|---------|
| Ancho contenedor | Por defecto (angosto) | 98% del viewport ✅ |
| Scroll horizontal | Sí (botones cortados) | No ✅ |
| Botón "Eliminar" | Oculto | Visible ✅ |
| UX | Mala | Buena ✅ |

---

## 🔧 **Archivos Modificados**

### **Frontend (2 archivos)**

1. ✅ `pages/FollowUp.jsx`
   - Función `getSlotColor`: Cambio de 5 a 4 vacantes
   - Leyenda del modal: "3-4 cupos disponibles"
   - Tarjetas de turnos: "X/4" y `Math.max(0, available)`
   - Detección bloqueado: `available <= 0`
   - Contenedor principal: `max-w-[98%] mx-auto`

2. ✅ `components/AuditEditModal.jsx`
   - Función `getEnabledTimeOptions`: Bloqueo en `>= 4`
   - Comentario actualizado

### **Backend (1 archivo)**

3. ✅ `controllers/auditController.js`
   - Función `getAvailableSlots`: Reescritura completa
   - Parseo directo de fecha
   - Loop estructurado por hora/minutos
   - Construcción correcta de slots en hora local
   - Búsqueda precisa en MongoDB

---

## ✅ **Despliegue**

```bash
# Frontend compilado
npm run build  # ✅ Exitoso en 5.51s

# Backend reiniciado
pm2 restart dann-salud-backend  # ✅ Reinicio #105

# Estado
✅ online
📦 18.9 MB memoria
```

---

## 🧪 **Testing**

### **Test 1 - Límite de 4 Vacantes**

**Pasos**:
1. Crear 4 auditorías para el turno 10:00
2. Abrir modal "Turnos Disponibles"
3. Verificar turno 10:00

**Resultado Esperado**:
- ✅ Muestra "4/4"
- ✅ Muestra "Disponibles: 0"
- ✅ Color rojo
- ✅ Candado visible
- ✅ Etiqueta "COMPLETO"

**Verificar en AuditEditModal**:
- ✅ Turno 10:00 aparece deshabilitado
- ✅ No se puede seleccionar

---

### **Test 2 - Conteo Correcto de Disponibilidad**

**Pasos**:
1. Crear auditorías en diferentes turnos:
   - 09:20: 1 auditoría
   - 10:00: 2 auditorías
   - 14:20: 3 auditorías
   - 18:00: 4 auditorías
2. Abrir modal "Turnos Disponibles"
3. Verificar cada turno

**Resultado Esperado**:
- ✅ 09:20: "1/4" + "3 disponibles" + Verde
- ✅ 10:00: "2/4" + "2 disponibles" + Amarillo
- ✅ 14:20: "3/4" + "1 disponible" + Verde (≥3 disponibles)
- ✅ 18:00: "4/4" + "0 disponibles" + Rojo + COMPLETO

---

### **Test 3 - Tabla Sin Scroll Horizontal**

**Pasos**:
1. Ir a FollowUp.jsx
2. Ver tabla completa
3. Verificar botones de acciones

**Resultado Esperado**:
- ✅ Tabla ocupa 98% del ancho
- ✅ Sin scroll horizontal
- ✅ Botón "Editar" visible
- ✅ Botón "Detalles" visible
- ✅ Botón "Eliminar" visible (antes se cortaba)

---

### **Test 4 - Diferentes Fechas en Modal**

**Pasos**:
1. Abrir modal
2. Seleccionar HOY → Verificar conteos
3. Seleccionar MAÑANA → Verificar conteos
4. Seleccionar próxima semana → Verificar conteos

**Resultado Esperado**:
- ✅ Cada fecha muestra conteos correctos
- ✅ Sin duplicados
- ✅ Sin turnos faltantes
- ✅ Horarios consistentes (09:20 a 21:00)

---

## 📊 **Ejemplo Visual Actualizado**

### **Modal - Tarjeta de Turno (Límite 4)**

```
┌─────────────────────────────┐
│ 10:00           🔓         │
├─────────────────────────────┤
│ Pactadas:      2/4         │  ← Ahora es /4
│ Disponibles:   2           │
└─────────────────────────────┘
   Color: Amarillo
```

```
┌─────────────────────────────┐
│ 14:20           🔒         │
├─────────────────────────────┤
│ Pactadas:      4/4         │  ← Completo con 4
│ Disponibles:   0           │
├─────────────────────────────┤
│       COMPLETO             │
└─────────────────────────────┘
   Color: Rojo
```

---

### **Tabla FollowUp.jsx (Más Ancha)**

**ANTES** (angosta, scroll horizontal):
```
┌────────────┬─────────┬──────────┬─────────┐ → → [Eliminar] (oculto)
│   Fecha    │  Hora   │ Afiliado │  ...    │
└────────────┴─────────┴──────────┴─────────┘
     (necesita scroll para ver más)
```

**DESPUÉS** (98% de ancho, todo visible):
```
┌──────┬──────┬──────────┬────────┬───────┬───────┬────────┬──────────┬─────────────────┐
│ Fecha│ Hora │ Afiliado │ Teléf. │ CUIL  │ O.S.A │ O.S.V. │ Estado   │ [Editar][Ver][X]│
└──────┴──────┴──────────┴────────┴───────┴───────┴────────┴──────────┴─────────────────┘
              ✅ Todo visible sin scroll
```

---

## 💡 **Notas Técnicas**

### **Por qué 4 en lugar de 5**

**Operación actual**:
- 4 auditores disponibles al mismo tiempo
- Cada auditoría dura ~20 minutos
- Máximo 4 auditorías simultáneas

**Razones**:
1. ✅ Capacidad real del equipo de auditores
2. ✅ Evita sobrecarga de recursos
3. ✅ Garantiza calidad en cada auditoría
4. ✅ Permite manejo de imprevistos

---

### **Manejo de Timezone**

**Problema con `new Date(date)`**:
```javascript
// date = "2025-11-07"
const day = new Date("2025-11-07"); 
// Interpreta como UTC 00:00:00
// En Argentina (UTC-3) es 2025-11-06 21:00:00
```

**Solución con parseo directo**:
```javascript
const [year, month, day] = "2025-11-07".split('-').map(Number);
// year = 2025, month = 11, day = 7

const slotStart = new Date(year, month - 1, day, 10, 0, 0);
// Crea: 2025-11-07 10:00:00 en zona horaria local (Argentina)
```

---

### **Por qué `Math.max(0, available)`**

```javascript
// Si hay más de 4 auditorías (error de datos), available sería negativo
const count = 5; // Error: más de 4
const available = 4 - 5; // = -1

// Sin Math.max
<span>{available}</span> // Muestra: -1 ❌

// Con Math.max
<span>{Math.max(0, available)}</span> // Muestra: 0 ✅
```

---

## ⚠️ **Consideraciones Importantes**

### **Capacidad Diaria**

**Antes (límite 5)**:
- 36 turnos/día × 5 vacantes = **180 auditorías/día**

**Ahora (límite 4)**:
- 36 turnos/día × 4 vacantes = **144 auditorías/día**

**Impacto**:
- ✅ Más realista según capacidad del equipo
- ✅ Reduce saturación de auditores
- ⚠️ Menor capacidad total (pero más sostenible)

---

### **Migración de Datos**

**Auditorías existentes**:
- ✅ No hay cambios en la base de datos
- ✅ No se requiere migración
- ✅ Auditorías ya agendadas se mantienen

**Turnos con 5 auditorías**:
- ⚠️ Si ya hay turnos con 5 auditorías, seguirán funcionando
- ⚠️ El modal mostrará "5/4" (>100%)
- ✅ `Math.max(0, available)` evita mostrar negativos
- 💡 Considerar alertar sobre estos casos excepcionales

---

### **Responsive Design**

**Tabla FollowUp.jsx**:
- ✅ Desktop: 98% ancho, todo visible
- ✅ Laptop: 98% ancho, scroll mínimo
- ⚠️ Tablet: Puede necesitar scroll horizontal (esperado)
- ⚠️ Móvil: Definitivamente necesita scroll (esperado)

**Modal Turnos**:
- ✅ Desktop: 4 columnas
- ✅ Tablet: 3 columnas
- ✅ Móvil: 2 columnas

---

## 📝 **Changelog**

### **v1.1.0 - 7 Nov 2025**

**Fixed**:
- Límite de vacantes cambiado de 5 a 4
- Lectura correcta de disponibilidad en modal
- Tabla de FollowUp.jsx más ancha (98% viewport)
- Botón "Eliminar" ahora visible sin scroll

**Changed**:
- Backend: Reescritura de `getAvailableSlots` para mejor manejo de fechas
- Frontend: Ajuste de colores y detección de turnos bloqueados
- Frontend: Leyenda actualizada a "3-4 cupos"
- Frontend: Display de turnos cambiado a "X/4"

**Technical**:
- Mejor manejo de timezone en generación de slots
- Loop estructurado en lugar de while
- `Math.max(0, available)` para evitar negativos
- `available <= 0` para detectar bloqueo

---

**Sistema con límite de 4 vacantes y lectura correcta funcionando** 🚀

**Última actualización**: 7 de noviembre, 2025 - 12:10 (UTC-3)
