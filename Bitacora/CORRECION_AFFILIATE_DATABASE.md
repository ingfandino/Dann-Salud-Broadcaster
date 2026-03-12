# ✅ Corrección de Bugs - Base de Afiliados

## 📅 Fecha: 5 de Noviembre, 2025 - 16:30

---

## 🎯 **BUGS CORREGIDOS (4)**

### **✅ BUG 1: Error 401 en descarga de archivos**
**Problema**: Al intentar descargar archivos exportados, aparecía error 401 Unauthorized.

**Causa**: El endpoint `/download-export/:filename` no tenía middleware de autenticación.

**Solución implementada**:
```javascript
// backend/src/routes/affiliates.js
router.get("/download-export/:filename", requireAuth, async (req, res) => {
    // Verificar rol (gerencia, supervisor, admin)
    if (!["gerencia", "supervisor", "admin"].includes(userRole)) {
        return res.status(403).json({ error: "No autorizado" });
    }
    
    // Supervisores solo pueden descargar sus propios archivos
    if (userRole === "supervisor") {
        if (!filename.includes(userId)) {
            return res.status(403).json({ error: "No autorizado" });
        }
    }
    
    res.download(filePath, filename);
});
```

**Archivos modificados**:
- ✅ `backend/src/routes/affiliates.js`

---

### **✅ BUG 2: Supervisores sin acceso a exportaciones**
**Problema**: Los supervisores no podían acceder a la interfaz de Base de Afiliados.

**Solución implementada**:
1. **Acceso a la ruta**:
```javascript
// frontend/src/App.jsx
<Route path="/affiliates" element={
    <RoleRoute roles={["gerencia", "supervisor"]}>
        <AffiliateDatabase />
    </RoleRoute>
} />
```

2. **Filtrado de pestañas**:
```javascript
// frontend/src/pages/AffiliateDatabase.jsx
const isSupervisor = userRole === "supervisor";

// Solo mostrar pestaña "Exportaciones" a supervisores
{[
    { id: "upload", roles: ["gerencia", "admin"] },
    { id: "search", roles: ["gerencia", "admin"] },
    { id: "config", roles: ["gerencia", "admin"] },
    { id: "exports", roles: ["gerencia", "admin", "supervisor"] },
    { id: "stats", roles: ["gerencia", "admin"] }
]
.filter(tab => !tab.roles || tab.roles.includes(userRole))
.map(tab => ...)}
```

3. **Botón en Dashboard**:
```javascript
// frontend/src/pages/Dashboard.jsx
supervisor: [
    { to: "/affiliates", icon: <Database />, label: "Mis Exportaciones" },
    ...
]
```

**Archivos modificados**:
- ✅ `frontend/src/App.jsx`
- ✅ `frontend/src/pages/AffiliateDatabase.jsx`
- ✅ `frontend/src/pages/Dashboard.jsx`

---

### **✅ BUG 3: Generación masiva de archivos**
**Problema**: El sistema generaba archivos hasta agotar TODOS los afiliados, sin límite.

**Solución implementada**:

**Flujo correcto**:
1. Contar supervisores activos
2. Calcular total necesario = `supervisores × afiliados_por_archivo`
3. Seleccionar SOLO afiliados no exportados (`exported: false`)
4. Generar 1 archivo por supervisor
5. Marcar afiliados como exportados

```javascript
// backend/src/services/affiliateExportService.js

// 1. Contar supervisores
const supervisors = await User.find({ role: "supervisor", active: true });
const totalNeeded = supervisors.length * affiliatesPerFile;

// 2. Obtener solo afiliados NO exportados
const availableAffiliates = await Affiliate.find({ 
    active: true, 
    exported: false 
})
.limit(totalNeeded)
.sort({ uploadDate: 1 });

// 3. Generar 1 archivo por supervisor
for (let i = 0; i < supervisors.length; i++) {
    const supervisor = supervisors[i];
    const chunk = availableAffiliates.slice(
        i * affiliatesPerFile,
        (i + 1) * affiliatesPerFile
    );
    
    // Generar XLSX...
}

// 4. Marcar como exportados
await Affiliate.updateMany(
    { _id: { $in: affiliateIds } },
    { 
        $set: { 
            exported: true,
            exportedAt: new Date(),
            exportedTo: supervisor._id,
            exportBatchId: batchId
        }
    }
);
```

**Ejemplo**:
- 10,000 afiliados registrados
- 10 supervisores activos
- 100 afiliados por archivo

**Resultado**:
- **Se usan**: 1,000 afiliados (100 × 10)
- **Se generan**: 10 archivos (1 por supervisor)
- **Duración**: 10 días para agotar los 10,000

**Modelo actualizado**:
```javascript
// backend/src/models/Affiliate.js
{
    exported: { type: Boolean, default: false, index: true },
    exportedAt: { type: Date },
    exportedTo: { type: ObjectId, ref: "User" },
    exportBatchId: { type: String }
}
```

**Archivos modificados**:
- ✅ `backend/src/models/Affiliate.js`
- ✅ `backend/src/services/affiliateExportService.js`

---

### **✅ BUG 4: Formato CSV en lugar de XLSX**
**Problema**: Los archivos se generaban en formato CSV, difícil de leer para usuarios.

**Solución implementada**:

**Antes (CSV)**:
```javascript
const { Parser } = require("json2csv");
const parser = new Parser(opts);
const csv = parser.parse(formattedData);
await fs.writeFile(filePath, csv, "utf-8");
```

**Después (XLSX)**:
```javascript
const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Afiliados');

worksheet.columns = [
    { header: 'nombre', key: 'nombre', width: 30 },
    { header: 'telefono', key: 'telefono', width: 15 },
    { header: 'obra_social', key: 'obra_social', width: 25 },
    { header: 'localidad', key: 'localidad', width: 20 },
    { header: 'edad', key: 'edad', width: 10 },
    { header: 'cuil', key: 'cuil', width: 15 }
];

formattedData.forEach(row => worksheet.addRow(row));

// Estilo del header
worksheet.getRow(1).font = { bold: true };
worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
};

await workbook.xlsx.writeFile(filePath);
```

**Formato de archivo**: `afiliados_SUPERVISORID_TIMESTAMP.xlsx`

**Archivos modificados**:
- ✅ `backend/src/services/affiliateExportService.js`

---

## 🔐 **PRIVACIDAD Y SEGURIDAD**

### **Filtrado de archivos por supervisor**:
```javascript
// backend/src/services/affiliateExportService.js
async function getAvailableExports(user = null) {
    // ... obtener archivos
    
    // Extraer supervisorId del filename
    const match = filename.match(/afiliados_([a-f0-9]+)_\d+\.xlsx/);
    const supervisorId = match ? match[1] : null;
    
    // Filtrar si es supervisor
    if (user && user.role === 'supervisor') {
        filtered = filesInfo.filter(f => 
            f.supervisorId === user._id.toString()
        );
    }
    
    return filtered;
}
```

### **Permisos de descarga**:
- ✅ **Gerencia**: Ve y descarga TODOS los archivos
- ✅ **Supervisor**: Ve y descarga SOLO sus archivos
- ✅ **Otros roles**: Sin acceso

---

## 📊 **NOTIFICACIONES INDIVIDUALES**

**Antes**: Todos recibían el mismo mensaje genérico.

**Después**: Cada supervisor recibe su notificación personalizada:

```javascript
const content = `¡Hola ${supervisor.nombre}!

Se ha generado tu listado de afiliados programado para hoy.

📋 Tu archivo: ${fileInfo.filename}
👥 Afiliados en tu archivo: ${fileInfo.count}
📅 Fecha: ${new Date().toLocaleDateString("es-AR")}

El archivo está listo para usar en campañas de mensajería masiva.

🔹 Para usar:
1. Ve a: Base de Afiliados → Exportaciones
2. Descarga tu archivo
3. Ve a Mensajería Masiva
4. Carga el archivo XLSX y crea tu campaña

⚠️ Este archivo es exclusivo para ti. Cada supervisor recibe su propio listado.

Att. Sistema Dann Salud`;
```

---

## 📁 **ARCHIVOS MODIFICADOS**

### **Backend (3 archivos)**:
1. ✅ `models/Affiliate.js` - Campos exported, exportedAt, exportedTo, exportBatchId
2. ✅ `services/affiliateExportService.js` - Reescritura completa del servicio
3. ✅ `routes/affiliates.js` - Autenticación y permisos

### **Frontend (3 archivos)**:
1. ✅ `App.jsx` - Acceso de supervisores a /affiliates
2. ✅ `pages/AffiliateDatabase.jsx` - Filtrado de pestañas por rol
3. ✅ `pages/Dashboard.jsx` - Botón "Mis Exportaciones" para supervisores

---

## 🚀 **DEPLOY**

### **Frontend**:
```bash
✓ Build completado (5.88s)
✓ Sin errores
```

### **Backend**:
⚠️ **REQUIERE REINICIO**:
```bash
cd backend
pm2 restart dann-salud-broadcaster
```

### **Base de datos**:
⚠️ **Migración requerida**: Los afiliados existentes tienen `exported: false` por defecto.

Para resetear exportaciones si es necesario:
```javascript
db.affiliates.updateMany({}, { 
    $set: { 
        exported: false,
        exportedAt: null,
        exportedTo: null,
        exportBatchId: null
    }
})
```

---

## 🧪 **TESTING**

### **1. Testing BUG 1 - Descarga de archivos**:
```
✓ Login como supervisor
✓ Ir a Base de Afiliados → Exportaciones
✓ Click en descargar archivo
✓ Verificar descarga exitosa (no error 401)
```

### **2. Testing BUG 2 - Acceso supervisores**:
```
✓ Login como supervisor
✓ Dashboard debe mostrar botón "Mis Exportaciones"
✓ Click en botón
✓ Ver solo pestaña "Exportaciones" (ocultar otras)
✓ No poder acceder a /affiliates?tab=upload manualmente
```

### **3. Testing BUG 3 - Límite de generación**:
```
✓ Cargar 1000 afiliados
✓ Configurar 100 afiliados por archivo
✓ Tener 5 supervisores activos
✓ Ejecutar generación programada
✓ Verificar: Se usan 500 afiliados (no 1000)
✓ Verificar: Se generan 5 archivos (no 10)
✓ Verificar BD: 500 marcados con exported: true
✓ Ejecutar nuevamente al día siguiente
✓ Verificar: Se usan los siguientes 500
```

### **4. Testing BUG 4 - Formato XLSX**:
```
✓ Descargar archivo generado
✓ Verificar extensión: .xlsx
✓ Abrir en Excel/LibreOffice
✓ Verificar columnas: nombre, telefono, obra_social, etc.
✓ Verificar formato legible
✓ Usar en BulkMessages.jsx
✓ Verificar carga exitosa
```

### **5. Testing Privacidad**:
```
✓ Login como Supervisor 1
✓ Ver solo archivos asignados a Supervisor 1
✓ Intentar descargar archivo de Supervisor 2 (debe fallar 403)
✓ Login como Gerencia
✓ Ver TODOS los archivos de todos los supervisores
✓ Poder descargar cualquiera
```

---

## 📈 **ESTRUCTURA DE BASE DE DATOS**

### **Antes**:
```javascript
{
    nombre: "Juan Pérez",
    cuil: "20123456789",
    telefono1: "1234567890",
    active: true
}
```

### **Después**:
```javascript
{
    nombre: "Juan Pérez",
    cuil: "20123456789",
    telefono1: "1234567890",
    active: true,
    // ✅ Nuevos campos
    exported: false,
    exportedAt: null,
    exportedTo: null,
    exportBatchId: null
}
```

### **Después de exportación**:
```javascript
{
    nombre: "Juan Pérez",
    cuil: "20123456789",
    telefono1: "1234567890",
    active: true,
    exported: true,
    exportedAt: ISODate("2025-11-05T19:00:00.000Z"),
    exportedTo: ObjectId("supervisor_id_123"),
    exportBatchId: "batch_1730836800000"
}
```

---

## 🎯 **FLUJO COMPLETO**

### **1. Configuración (Gerencia)**:
```
Gerencia → Base de Afiliados → Configuración de Envíos
- Afiliados por archivo: 100
- Hora de envío: 16:00
- Guardar
```

### **2. Ejecución automática (16:00)**:
```
Sistema:
1. Cuenta supervisores activos: 10
2. Calcula necesarios: 10 × 100 = 1000
3. Busca afiliados no exportados: encuentra 5000
4. Selecciona primeros 1000
5. Divide en 10 grupos de 100
6. Genera 10 archivos XLSX
7. Marca 1000 como exported
8. Envía notificación a cada supervisor
```

### **3. Uso (Supervisor)**:
```
Supervisor:
1. Recibe notificación interna
2. Dashboard → Mis Exportaciones
3. Ve su archivo (100 afiliados)
4. Descarga XLSX
5. Mensajería Masiva → Cargar archivo
6. Crea campaña
```

### **4. Día siguiente (16:00)**:
```
Sistema:
1. Busca afiliados no exportados: encuentra 4000 (restantes)
2. Selecciona primeros 1000
3. Repite proceso
...hasta agotar los 5000 afiliados
```

---

## ⚙️ **CONFIGURACIÓN**

### **Variables de entorno** (no requiere cambios):
```env
# Ya existentes
MONGODB_URI=...
PORT=5000
```

### **Cron job** (ya existe):
```javascript
// backend/src/server.js o donde esté el cron
// Se ejecuta cada minuto y verifica si es la hora configurada
cron.schedule('* * * * *', async () => {
    await generateAndSendAffiliateCSVs();
});
```

---

## 📝 **NOTAS IMPORTANTES**

### **Formato de archivos**:
- **Nombre**: `afiliados_{SUPERVISOR_ID}_{TIMESTAMP}.xlsx`
- **Ejemplo**: `afiliados_507f1f77bcf86cd799439011_1730836800000.xlsx`
- **Columnas**: nombre, telefono, obra_social, localidad, edad, cuil

### **Compatibilidad**:
- ✅ Compatible con BulkMessages.jsx
- ✅ Acepta tanto CSV como XLSX
- ✅ Mismo formato de columnas

### **Escalabilidad**:
- ✅ Índice en campo `exported` para queries rápidas
- ✅ Limit en query para evitar cargar millones de registros
- ✅ Archivos generados de forma eficiente con ExcelJS

---

## 🎉 **RESULTADO FINAL**

### **Antes**:
- ❌ Error 401 al descargar
- ❌ Supervisores sin acceso
- ❌ Generaba archivos sin control
- ❌ Formato CSV difícil de leer

### **Después**:
- ✅ Descarga protegida con autenticación
- ✅ Supervisores con acceso a sus exportaciones
- ✅ Generación controlada por supervisores activos
- ✅ Formato XLSX profesional
- ✅ Privacidad garantizada (cada uno ve lo suyo)
- ✅ Notificaciones individualizadas
- ✅ Rastreo completo de exportaciones

---

**Última actualización**: 5 de noviembre, 2025 - 16:35 (UTC-3)  
**Versión**: 1.0  
**Estado**: ✅ **COMPLETO - LISTO PARA TESTING**
