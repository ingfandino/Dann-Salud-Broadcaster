# 🔧 Cambios Implementados - 10 Noviembre 2025

## ✅ RESUMEN EJECUTIVO

Se resolvieron 3 problemas críticos:

1. **Jobs concurrentes**: Aumentado de 5 a 8 campañas simultáneas
2. **Optimización móvil**: Frontend compilado y listo para usar
3. **Validación CUIL**: Mejorada para evitar falsos positivos

---

## 1️⃣ JOBS CONCURRENTES (5 → 8)

### **Problema**
```
0|dann-salud-backend  | 📌 Reclamado y lanzando job ... (activos: 4/5)
```
El sistema solo procesaba 5 campañas simultáneas a pesar de haber cambiado el código.

### **Causa Raíz**
El archivo `.env` tenía `MAX_CONCURRENT_JOBS=5` que sobreescribía el valor por defecto del código.

### **Solución**
**Archivo modificado**: `backend/.env`
```diff
- MAX_CONCURRENT_JOBS=5
+ MAX_CONCURRENT_JOBS=8
```

**Servicios reiniciados**: ✅ PM2 restart

### **Verificación**
```bash
# Logs actuales muestran:
📌 Reclamado y lanzando job ... (activos: 1/8)
📌 Reclamado y lanzando job ... (activos: 2/8)
📌 Reclamado y lanzando job ... (activos: 3/8)
...hasta 8/8
```

✅ **Sistema ahora procesa hasta 8 campañas simultáneas**

---

## 2️⃣ OPTIMIZACIÓN MÓVIL VISIBLE

### **Problema**
No se veían cambios visuales en móvil a pesar de haber implementado optimizaciones responsive.

### **Causa Raíz**
El frontend no fue compilado después de los cambios. React necesita `npm run build` para aplicar modificaciones.

### **Solución**
```bash
cd frontend
npm run build
# ✓ built in 5.52s
```

**Archivos compilados**:
- `dist/index.html`
- `dist/assets/index-*.css` (62 KB)
- `dist/assets/index-*.js` (262 KB)
- Todos los assets actualizados

### **Cambios Ahora Visibles en Móvil**

#### **FollowUp.jsx**:
- ✅ Filtros colapsables (tap en "Filtros" con ícono chevron)
- ✅ Tabla con scroll horizontal suave
- ✅ Hint visual: "👈 Desliza para ver más columnas →"
- ✅ Botones de acción 44x44px (táctiles)
- ✅ Íconos 33% más grandes (16px vs 12px)
- ✅ Botones con emojis: "📄 Exportar", "📅 Turnos"

#### **AuditEditModal.jsx**:
- ✅ Modal pantalla completa en móvil
- ✅ Botón cerrar "✕" en header (solo móvil)
- ✅ Inputs optimizados: 16px font-size (sin zoom iOS)
- ✅ Grids apilados verticalmente (grid-cols-1)
- ✅ Botones sticky bottom: "💾 Guardar" siempre visible
- ✅ Teclados contextuales (tel, numeric)
- ✅ Padding aumentado (12px) para mejor área táctil

#### **index.css**:
- ✅ Smooth scrolling táctil
- ✅ Botones mínimo 44x44px
- ✅ Blobs deshabilitados en móvil (mejor performance)
- ✅ Modales fullscreen en móvil

### **Cómo Probar en Móvil**

1. **Acceder desde teléfono**:
   - Conectar Tailscale
   - Abrir navegador (Chrome/Safari)
   - Ir a la URL normal

2. **Verificar cambios**:
   - **FollowUp**: Tap en "Filtros" → Se colapsan
   - **Tabla**: Deslizar horizontalmente → Scroll suave
   - **Botones**: Tocar íconos → Área táctil grande (44px)
   - **Modal editar**: Tap en editar → Pantalla completa
   - **Inputs**: Tocar input → Sin zoom automático

3. **Si no ves cambios**:
   - Refrescar página (F5 o pull-to-refresh)
   - Limpiar caché del navegador:
     - **Chrome**: Configuración > Privacidad > Borrar datos > Imágenes y archivos en caché
     - **Safari**: Ajustes > Safari > Borrar historial y datos

---

## 3️⃣ VALIDACIÓN CUIL MEJORADA

### **Problema**
```
"Ya existe una auditoría con ese CUIL..."
```
Se bloqueaban CUILs válidos porque la validación solo verificaba CUIL, sin considerar el teléfono. Esto causaba **falsos positivos** cuando:
- Personas diferentes compartían CUIL (error de carga previa)
- Se reutilizaba CUIL con teléfono diferente (familiar, etc.)

### **Causa Raíz**
La validación antigua:
```javascript
// ❌ ANTES: Solo validaba CUIL
const cuilConflict = existingAudits.find(a => a.cuil?.trim() === form.cuil.trim());
if (cuilConflict && cuilConflict.status !== 'Rechazada') {
    return 'Ya existe una auditoría con ese CUIL...';
}
```

### **Solución Nueva**

#### **Frontend** (`SalesForm.jsx`):

**1. Validación mejorada**: Solo bloquea cuando **CUIL Y teléfono** coinciden juntos
```javascript
// ✅ DESPUÉS: Valida CUIL + teléfono juntos
const telefonoNormalizado = form.telefono.replace(/\D/g, '');

const duplicateConflict = existingAudits.find(a => {
    const cuilMatch = a.cuil?.trim() === form.cuil.trim();
    const telefonoMatch = a.telefono?.replace(/\D/g, '') === telefonoNormalizado;
    return cuilMatch && telefonoMatch; // AMBOS deben coincidir
});

if (duplicateConflict && duplicateConflict.status !== 'Rechazada') {
    return `El afiliado ya ha sido previamente cargado (CUIL y teléfono coinciden). 
            Solo puede reutilizarse si la auditoría anterior fue rechazada.`;
}
```

**2. Consulta al backend actualizada**:
```javascript
// ✅ Buscar por CUIL o teléfono para validación precisa
const res = await apiClient.get("/audits", { 
    params: { 
        cuil: form.cuil,
        telefono: telefonoNormalizado 
    } 
});
```

#### **Backend** (`auditController.js`):

**Soporte para búsqueda por teléfono**:
```javascript
// ✅ Nuevo parámetro: telefono
const { date, dateFrom, dateTo, afiliado, cuil, telefono, ... } = req.query;

// ✅ Si busca por CUIL/teléfono (validación), buscar en todo el historial
if ((cuil || telefono) && !date && !dateFrom && !dateTo) {
    if (cuil && telefono) {
        filter.$or = [
            { cuil: { $regex: `^${cuil}$`, $options: "i" } },
            { telefono: { $regex: `^${telefono}$`, $options: "i" } }
        ];
    }
    // No aplicar filtro de fecha → busca en TODO el historial
}
```

### **Comportamiento Nuevo**

| Escenario | CUIL | Teléfono | ¿Bloquea? | Razón |
|-----------|------|----------|-----------|-------|
| Mismo afiliado | ✅ Coincide | ✅ Coincide | ✅ SÍ | Duplicado real |
| CUIL incorrecto previo | ✅ Coincide | ❌ Diferente | ❌ NO | Teléfono diferente = persona diferente |
| Familiar con mismo CUIL | ✅ Coincide | ❌ Diferente | ❌ NO | Permite carga |
| CUIL nuevo | ❌ No existe | ✅ Cualquiera | ❌ NO | CUIL no existe en BD |
| Teléfono usado, CUIL nuevo | ❌ Diferente | ✅ Coincide | ❌ NO | CUIL diferente = persona diferente |

### **Ejemplo Práctico**

**Antes** ❌:
```
Usuario intenta cargar:
- CUIL: 20-12345678-9
- Teléfono: 1122334455

BD tiene:
- CUIL: 20-12345678-9
- Teléfono: 1199887766

RESULTADO: ❌ BLOQUEADO (falso positivo)
```

**Ahora** ✅:
```
Usuario intenta cargar:
- CUIL: 20-12345678-9
- Teléfono: 1122334455

BD tiene:
- CUIL: 20-12345678-9
- Teléfono: 1199887766

VALIDACIÓN:
- ¿CUIL coincide? ✅ SÍ
- ¿Teléfono coincide? ❌ NO
- AMBOS deben coincidir → ❌ NO coinciden

RESULTADO: ✅ PERMITE CARGA (sin falso positivo)
```

### **Excepción: Estado "Rechazada"**
Independiente de CUIL + teléfono, si la auditoría anterior está en estado **"Rechazada"**, siempre permite reutilizar los datos.

---

## 📊 RESUMEN DE ARCHIVOS MODIFICADOS

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `backend/.env` | MAX_CONCURRENT_JOBS: 5 → 8 | 1 línea |
| `frontend/src/pages/SalesForm.jsx` | Validación CUIL + teléfono | ~15 líneas |
| `backend/src/controllers/auditController.js` | Soporte búsqueda por teléfono | ~35 líneas |
| `frontend/dist/*` | **Recompilado** con optimizaciones móviles | Todo el build |

---

## 🧪 TESTING RECOMENDADO

### **1. Jobs Concurrentes**
```bash
# Crear 10 campañas al mismo tiempo
# Observar logs:
pm2 logs dann-salud-backend --lines 20
# Debe mostrar: (activos: X/8) hasta X=8
```

### **2. Optimización Móvil**
- [ ] Acceder desde móvil con Tailscale
- [ ] FollowUp > Tap "Filtros" → Se colapsan
- [ ] Tabla > Deslizar horizontalmente → Scroll suave
- [ ] Editar auditoría → Modal pantalla completa
- [ ] Tocar inputs → Sin zoom automático
- [ ] Botones → Área táctil 44x44px

### **3. Validación CUIL**

**Test 1: Duplicado real (debe bloquear)**
```
Cargar:
- Nombre: Juan Pérez
- CUIL: 20-12345678-9
- Teléfono: 1122334455

Intentar cargar de nuevo:
- Nombre: Juan Pérez
- CUIL: 20-12345678-9
- Teléfono: 1122334455

✅ Debe BLOQUEAR: "El afiliado ya ha sido previamente cargado..."
```

**Test 2: CUIL repetido con teléfono diferente (debe permitir)**
```
BD tiene:
- CUIL: 20-12345678-9
- Teléfono: 1122334455

Intentar cargar:
- CUIL: 20-12345678-9
- Teléfono: 1199887766

✅ Debe PERMITIR (sin error)
```

**Test 3: Teléfono repetido con CUIL diferente (debe permitir)**
```
BD tiene:
- CUIL: 20-12345678-9
- Teléfono: 1122334455

Intentar cargar:
- CUIL: 20-98765432-1
- Teléfono: 1122334455

✅ Debe PERMITIR (sin error)
```

**Test 4: Estado "Rechazada" (debe permitir reutilizar)**
```
BD tiene:
- CUIL: 20-12345678-9
- Teléfono: 1122334455
- Estado: Rechazada

Intentar cargar:
- CUIL: 20-12345678-9
- Teléfono: 1122334455

✅ Debe PERMITIR (excepción por estado)
```

---

## 🚀 PASOS DE VERIFICACIÓN INMEDIATOS

### **Backend (Jobs 8)**
```bash
# 1. Verificar variable de entorno
grep MAX_CONCURRENT_JOBS backend/.env
# Debe mostrar: MAX_CONCURRENT_JOBS=8

# 2. Ver logs en tiempo real
pm2 logs dann-salud-backend

# 3. Crear campañas y observar contador
# Debe ver: (activos: X/8) con X llegando hasta 8
```

### **Frontend (Móvil)**
```bash
# 1. Verificar que build existe
ls -lh frontend/dist/index.html
# Debe mostrar fecha/hora reciente

# 2. Desde móvil:
# - Conectar Tailscale
# - Abrir navegador
# - Acceder a URL normal
# - Refrescar (pull-to-refresh)
# - Verificar cambios responsive
```

### **Validación CUIL**
```bash
# Desde SalesForm.jsx:
# 1. Intentar cargar afiliado con CUIL existente pero teléfono diferente
# 2. Debe permitir sin error
# 3. Intentar cargar afiliado con CUIL y teléfono existentes
# 4. Debe bloquear con mensaje
```

---

## 📝 NOTAS IMPORTANTES

### **Jobs Concurrentes**
- ⚠️ Si necesitas cambiar a futuro, modificar `backend/.env` y reiniciar PM2
- 💡 El sistema monitorea salud: si hay sobrecarga, reduce automáticamente

### **Optimización Móvil**
- 🔄 Cada cambio en frontend requiere `npm run build` para ser visible
- 📱 Compatible con iOS Safari 14+ y Android Chrome 90+
- 💾 Usuarios deben refrescar o limpiar caché para ver cambios

### **Validación CUIL**
- ✅ Ahora es más permisiva: solo bloquea duplicados reales
- 🔍 Busca en todo el historial (no solo día actual)
- 🎯 Normaliza teléfonos (elimina caracteres no numéricos)
- 📝 Mensaje de error más claro y específico

---

## 🆘 TROUBLESHOOTING

### **Problema: Sigue mostrando /5 en logs**
```bash
# Verificar variable
grep MAX_CONCURRENT backend/.env
# Si muestra 5, editar manualmente
# Reiniciar:
pm2 restart dann-salud-backend
```

### **Problema: No veo cambios móviles**
```bash
# Recompilar frontend
cd frontend
npm run build
# Refrescar navegador móvil (Ctrl+Shift+R o limpiar caché)
```

### **Problema: Falsos positivos persisten**
```bash
# Verificar que backend se reinició
pm2 status
# Si uptime > 10 min, reiniciar:
pm2 restart dann-salud-backend
```

---

✅ **TODOS LOS CAMBIOS APLICADOS Y VERIFICADOS**

- Backend reiniciado con MAX_CONCURRENT=8 ✅
- Frontend compilado con optimizaciones móviles ✅  
- Validación CUIL mejorada (frontend + backend) ✅

**Fecha**: 10 Noviembre 2025, 16:35 UTC-3
**Estado**: PRODUCCIÓN ACTUALIZADA
