# 📋 Plan: Sistema Avanzado de Exportaciones de Afiliados

## 📅 Fecha: 6 de Noviembre, 2025 - 14:40

---

## 🎯 **OBJETIVO**

Personalizar la construcción y envío de archivos Excel de afiliados con:
1. **Modo Masivo vs Avanzado**
2. **Distribución por obras sociales**
3. **Configuración individualizada por supervisor**
4. **Vista mejorada de exportaciones con supervisor asignado**

---

## 📊 **MODELO DE DATOS ACTUALIZADO**

### **AffiliateExportConfig**

```javascript
{
  configuredBy: ObjectId,  // Usuario que configuró
  sendType: "masivo" | "avanzado",  // Tipo de envío
  
  // ========== CONFIGURACIÓN MASIVA ==========
  affiliatesPerFile: Number,  // Cantidad por archivo (todos los supervisores igual)
  obraSocialDistribution: [   // Distribución de obras sociales (común para todos)
    {
      obraSocial: String,  // Ej: "OSDE", "Medifé", "Binimed"
      cantidad: Number     // Cantidad de afiliados de esta obra social
    }
  ],
  
  // ========== CONFIGURACIÓN AVANZADA ==========
  supervisorConfigs: [        // Configuración individual por supervisor
    {
      supervisorId: ObjectId,
      affiliatesPerFile: Number,
      obraSocialDistribution: [
        {
          obraSocial: String,
          cantidad: Number
        }
      ]
    }
  ],
  
  scheduledTime: String,      // Hora de envío (HH:mm)
  filters: {                  // Filtros globales
    localidad: String,
    minAge: Number,
    maxAge: Number
  },
  active: Boolean,
  lastExecuted: Date,
  nextExecution: Date
}
```

---

## 🔧 **CASOS DE USO**

### **Caso 1: Envío Masivo Simple**
```javascript
{
  sendType: "masivo",
  affiliatesPerFile: 500,
  obraSocialDistribution: [],  // Sin restricciones, aleatorio
  scheduledTime: "09:00"
}
```

**Resultado**: Todos los supervisores reciben 500 afiliados aleatorios cada uno.

---

### **Caso 2: Envío Masivo con Distribución de Obras Sociales**
```javascript
{
  sendType: "masivo",
  affiliatesPerFile: 500,
  obraSocialDistribution: [
    { obraSocial: "OSDE", cantidad: 100 },
    { obraSocial: "Medifé", cantidad: 50 },
    { obraSocial: "Binimed", cantidad: 75 },
    { obraSocial: "*", cantidad: 275 }  // Resto: aleatoria
  ],
  scheduledTime: "09:00"
}
```

**Resultado**: 
- Cada supervisor recibe 500 afiliados distribuidos:
  - 100 de OSDE
  - 50 de Medifé
  - 75 de Binimed
  - 275 de cualquier otra obra social

---

### **Caso 3: Envío Avanzado con Configuración Individual**
```javascript
{
  sendType: "avanzado",
  supervisorConfigs: [
    {
      supervisorId: "67890abc",  // Supervisor Juan
      affiliatesPerFile: 300,
      obraSocialDistribution: [
        { obraSocial: "OSDE", cantidad: 200 },
        { obraSocial: "*", cantidad: 100 }
      ]
    },
    {
      supervisorId: "12345def",  // Supervisor María
      affiliatesPerFile: 600,
      obraSocialDistribution: [
        { obraSocial: "Medifé", cantidad: 300 },
        { obraSocial: "Binimed", cantidad: 200 },
        { obraSocial: "*", cantidad: 100 }
      ]
    },
    {
      supervisorId: "98765ghi",  // Supervisor Carlos
      affiliatesPerFile: 150,
      obraSocialDistribution: []  // Aleatorio
    }
  ],
  scheduledTime: "09:00"
}
```

**Resultado**:
- **Juan** recibe 300 afiliados: 200 OSDE + 100 aleatorios
- **María** recibe 600 afiliados: 300 Medifé + 200 Binimed + 100 aleatorios
- **Carlos** recibe 150 afiliados aleatorios

---

## 🔄 **LÓGICA DE GENERACIÓN**

### **Algoritmo para Envío Masivo**

```javascript
async function generateMasivoExports(config, supervisors) {
  for (const supervisor of supervisors) {
    const affiliates = [];
    
    // 1. Obtener afiliados según distribución de obras sociales
    for (const dist of config.obraSocialDistribution) {
      if (dist.obraSocial === "*") {
        // Obtener afiliados de cualquier obra social (excluyendo las ya usadas)
        const usedObraSociales = config.obraSocialDistribution
          .filter(d => d.obraSocial !== "*")
          .map(d => d.obraSocial);
        
        const randomAffiliates = await Affiliate.find({
          exported: false,
          obraSocial: { $nin: usedObraSociales }
        })
        .limit(dist.cantidad)
        .lean();
        
        affiliates.push(...randomAffiliates);
      } else {
        // Obtener afiliados de obra social específica
        const specificAffiliates = await Affiliate.find({
          exported: false,
          obraSocial: dist.obraSocial
        })
        .limit(dist.cantidad)
        .lean();
        
        affiliates.push(...specificAffiliates);
      }
    }
    
    // 2. Si no hay distribución, obtener aleatorios hasta completar
    if (config.obraSocialDistribution.length === 0) {
      const randomAffiliates = await Affiliate.find({
        exported: false
      })
      .limit(config.affiliatesPerFile)
      .lean();
      
      affiliates.push(...randomAffiliates);
    }
    
    // 3. Generar archivo XLSX
    await generateXLSXFile(supervisor, affiliates);
  }
}
```

---

### **Algoritmo para Envío Avanzado**

```javascript
async function generateAvanzadoExports(config) {
  for (const supervisorConfig of config.supervisorConfigs) {
    const supervisor = await User.findById(supervisorConfig.supervisorId);
    const affiliates = [];
    
    // 1. Obtener afiliados según distribución de este supervisor
    for (const dist of supervisorConfig.obraSocialDistribution) {
      if (dist.obraSocial === "*") {
        const usedObraSociales = supervisorConfig.obraSocialDistribution
          .filter(d => d.obraSocial !== "*")
          .map(d => d.obraSocial);
        
        const randomAffiliates = await Affiliate.find({
          exported: false,
          obraSocial: { $nin: usedObraSociales }
        })
        .limit(dist.cantidad)
        .lean();
        
        affiliates.push(...randomAffiliates);
      } else {
        const specificAffiliates = await Affiliate.find({
          exported: false,
          obraSocial: dist.obraSocial
        })
        .limit(dist.cantidad)
        .lean();
        
        affiliates.push(...specificAffiliates);
      }
    }
    
    // 2. Si no hay distribución, obtener aleatorios
    if (supervisorConfig.obraSocialDistribution.length === 0) {
      const randomAffiliates = await Affiliate.find({
        exported: false
      })
      .limit(supervisorConfig.affiliatesPerFile)
      .lean();
      
      affiliates.push(...randomAffiliates);
    }
    
    // 3. Generar archivo XLSX
    await generateXLSXFile(supervisor, affiliates);
  }
}
```

---

## 🎨 **INTERFAZ DE USUARIO**

### **Configuración de Envíos (Tab: "Configuración de Envíos")**

```jsx
<div>
  {/* Selector de tipo */}
  <div>
    <label>Tipo de Envío:</label>
    <select value={sendType} onChange={e => setSendType(e.target.value)}>
      <option value="masivo">📤 Envío Masivo (misma config para todos)</option>
      <option value="avanzado">⚙️ Envío Avanzado (config individual)</option>
    </select>
  </div>
  
  {/* Si es MASIVO */}
  {sendType === "masivo" && (
    <>
      <div>
        <label>Cantidad de afiliados por archivo:</label>
        <input type="number" value={affiliatesPerFile} />
      </div>
      
      <div>
        <label>Distribución por Obra Social (opcional):</label>
        {obraSocialDistribution.map((dist, idx) => (
          <div key={idx}>
            <select value={dist.obraSocial}>
              <option value="OSDE">OSDE</option>
              <option value="Medifé">Medifé</option>
              <option value="Binimed">Binimed</option>
              <option value="*">Aleatorio (resto)</option>
            </select>
            <input type="number" value={dist.cantidad} placeholder="Cantidad" />
            <button onClick={() => removeDistribution(idx)}>❌</button>
          </div>
        ))}
        <button onClick={addDistribution}>➕ Agregar Obra Social</button>
      </div>
    </>
  )}
  
  {/* Si es AVANZADO */}
  {sendType === "avanzado" && (
    <div>
      <h3>Configuración por Supervisor:</h3>
      {supervisorConfigs.map((config, idx) => (
        <div key={idx} className="supervisor-config">
          <h4>{supervisors.find(s => s._id === config.supervisorId)?.nombre}</h4>
          
          <div>
            <label>Cantidad de afiliados:</label>
            <input type="number" value={config.affiliatesPerFile} />
          </div>
          
          <div>
            <label>Distribución por Obra Social:</label>
            {config.obraSocialDistribution.map((dist, distIdx) => (
              <div key={distIdx}>
                <select value={dist.obraSocial}>
                  <option value="OSDE">OSDE</option>
                  <option value="Medifé">Medifé</option>
                  <option value="Binimed">Binimed</option>
                  <option value="*">Aleatorio (resto)</option>
                </select>
                <input type="number" value={dist.cantidad} />
                <button onClick={() => removeSupDistribution(idx, distIdx)}>❌</button>
              </div>
            ))}
            <button onClick={() => addSupDistribution(idx)}>➕ Agregar Obra Social</button>
          </div>
        </div>
      ))}
    </div>
  )}
  
  {/* Hora de envío */}
  <div>
    <label>Hora de envío diario:</label>
    <input type="time" value={scheduledTime} />
  </div>
  
  <button onClick={saveConfig}>💾 Guardar Configuración</button>
</div>
```

---

### **Vista de Exportaciones (Tab: "Exportaciones")**

**Antes**:
```
Archivo: afiliados_67890abc_1762437600361.xlsx
Fecha: 06/11/2025 09:00
Tamaño: 45.2 KB
[Descargar]
```

**Después**:
```
Archivo: afiliados_67890abc_1762437600361.xlsx
Supervisor: Juan Pérez ← NUEVO
Fecha: 06/11/2025 09:00
Tamaño: 45.2 KB
Afiliados: 500 ← NUEVO
[Descargar]
```

---

## 📝 **ARCHIVOS A MODIFICAR**

### **Backend**

1. ✅ **`models/AffiliateExportConfig.js`**
   - Actualizado con sendType, obraSocialDistribution, supervisorConfigs

2. ⏳ **`services/affiliateExportService.js`**
   - Función `generateAndSendAffiliateCSVs()` reescrita
   - Soporte para envío masivo vs avanzado
   - Lógica de distribución por obra social
   - Marcar afiliados con supervisor asignado

3. ⏳ **`controllers/affiliateController.js`**
   - Actualizar `configureExport()` para validar nueva estructura
   - Actualizar `getExportConfig()` para retornar nueva estructura

4. ⏳ **`services/affiliateExportService.js - getAvailableExports()`**
   - Agregar información del supervisor en la lista de exports

### **Frontend**

5. ⏳ **`pages/AffiliateDatabase.jsx - Tab "Configuración"`**
   - Selector de tipo: Masivo vs Avanzado
   - UI para configuración masiva con distribución de OS
   - UI para configuración avanzada por supervisor
   - Validación de cantidades

6. ⏳ **`pages/AffiliateDatabase.jsx - Tab "Exportaciones"`**
   - Agregar columna "Supervisor"
   - Mostrar cantidad de afiliados por archivo
   - Mejorar diseño visual

---

## ⚠️ **CONSIDERACIONES IMPORTANTES**

### **Validación de Cantidades**

```javascript
// Validar que la suma de distribución coincida con el total
const totalDistribuido = obraSocialDistribution.reduce((sum, d) => sum + d.cantidad, 0);
if (totalDistribuido !== affiliatesPerFile) {
  return res.status(400).json({ 
    error: `La distribución (${totalDistribuido}) no coincide con el total (${affiliatesPerFile})` 
  });
}
```

### **Manejo de Afiliados Insuficientes**

Si no hay suficientes afiliados de una obra social:
- **Opción 1**: Completar con afiliados de otras obras sociales
- **Opción 2**: Generar archivo parcial y notificar
- **Opción 3**: No generar archivo y notificar error

**Decisión**: Opción 2 (generar parcial + notificar)

### **Evitar Duplicados**

Al generar múltiples archivos:
```javascript
const usedAffiliateIds = new Set();

for (const supervisor of supervisors) {
  const affiliates = await Affiliate.find({
    exported: false,
    _id: { $nin: Array.from(usedAffiliateIds) }
  });
  
  affiliates.forEach(aff => usedAffiliateIds.add(aff._id));
}
```

---

## 🧪 **TESTING**

### **Test 1: Envío Masivo Simple**
```
1. Configurar: Masivo, 100 afiliados, sin distribución
2. Tener 3 supervisores activos
3. Ejecutar generación
4. Verificar: 3 archivos generados de 100 afiliados cada uno
```

### **Test 2: Envío Masivo con Distribución**
```
1. Configurar: Masivo, 200 afiliados, [OSDE: 100, Medifé: 50, *: 50]
2. Ejecutar generación
3. Verificar: Cada archivo tiene 100 OSDE + 50 Medifé + 50 aleatorios
```

### **Test 3: Envío Avanzado**
```
1. Configurar 3 supervisores con cantidades diferentes
2. Ejecutar generación
3. Verificar: Cada supervisor recibe cantidad correcta
```

### **Test 4: Insuficiencia de Afiliados**
```
1. Configurar: Masivo, 1000 afiliados, pero solo hay 500 en BD
2. Ejecutar generación
3. Verificar: Solo 1 archivo de 500 (en lugar de 2 de 1000)
```

---

## 📊 **ESTIMACIÓN DE TIEMPO**

| Tarea | Tiempo estimado |
|-------|----------------|
| Backend - Servicio de exportación | 2-3 horas |
| Backend - Controlador y validaciones | 1 hora |
| Frontend - UI Configuración Masiva | 1-2 horas |
| Frontend - UI Configuración Avanzada | 2-3 horas |
| Frontend - Vista Exportaciones | 30 min |
| Testing completo | 1-2 horas |
| **Total** | **7-11 horas** |

---

## 🎯 **PRIORIDAD DE IMPLEMENTACIÓN**

1. **Alta**: Backend - Servicio de exportación (core funcional)
2. **Alta**: Frontend - UI Configuración Masiva
3. **Media**: Frontend - UI Configuración Avanzada
4. **Baja**: Frontend - Vista mejorada de Exportaciones

---

**Estado**: 📋 Plan definido - Listo para implementación  
**Fecha**: 6 de noviembre, 2025 - 14:45 (UTC-3)
