# 🔍 DEBUG: Mensajes con campos vacíos

## Problema reportado
Usuario ID: `690ca947b2e8d80541703d9f`
Los mensajes se envían con placeholders vacíos:
- `** con cuil **` → Debería ser "Juan con cuil 20123456789"
- `**` → Debería mostrar el nombre de obra social

## Pasos para debuggear

### 1. Verificar contactos del usuario

Ejecuta en MongoDB:

```javascript
// Conectar a MongoDB
use dann_salud_broadcaster

// Ver contactos de ese usuario
db.contacts.find({ 
    createdBy: ObjectId("690ca947b2e8d80541703d9f") 
}).limit(5).pretty()

// Ejemplo de lo que deberías ver:
{
  "_id": ObjectId("..."),
  "nombre": "Juan Pérez",
  "telefono": "1123456789",
  "cuil": "20123456789",
  "createdBy": ObjectId("690ca947b2e8d80541703d9f"),
  "extraData": {
    "obra_social": "OSDE",
    "localidad": "Buenos Aires",
    ...
  }
}
```

### 2. Verificar logs del servidor

Después de aplicar el fix, reinicia el backend:

```bash
pm2 restart dann-salud-broadcaster
pm2 logs dann-salud-broadcaster --lines 100
```

Busca en los logs:
```
🔎 Placeholder debug
```

Verás algo como:
```json
{
  "jobId": "...",
  "contactId": "...",
  "telefono": "1123456789",
  "placeholders": ["nombre", "cuil", "obra_social"],
  "placeholdersNormalized": ["nombre", "cuil", "obrasocial"],
  "dataKeys": ["nombre", "telefono", "cuil", "obrasocial", "localidad"],
  "dataMapSample": {
    "nombre": "Juan Pérez",
    "telefono": "1123456789",
    "cuil": "20123456789",
    "obrasocial": "OSDE",
    "localidad": "Buenos Aires"
  }
}
```

### 3. Si los placeholders no se encuentran:

Verás warnings como:
```
⚠️ Placeholder no encontrado: "obra_social" (normalizado: "obrasocial")
availableKeys: ["nombre", "telefono", "cuil"]
```

Esto significa que el archivo subido **NO tenía** esa columna.

### 4. Causas posibles

#### A) El archivo no tiene las columnas esperadas

Si el usuario subió un archivo con columnas:
- `Nombre` ✓
- `Teléfono` ✓
- `CUIL` ✓

Pero el template usa:
- `{{nombre}}` ✓ Funciona
- `{{cuil}}` ✓ Funciona
- `{{obra_social}}` ❌ NO existe en archivo → Aparece vacío

**Solución**: Subir archivo con columna "Obra Social" o "obra_social".

#### B) Normalización de claves no coincide

Archivo tiene columna: `Obra Social`
Template usa: `{{obra_social}}`

Normalización:
- "Obra Social" → "obrasocial"
- "obra_social" → "obrasocial"
- ✓ **Coincide** → Debería funcionar

Archivo tiene columna: `OS`
Template usa: `{{obra_social}}`

Normalización:
- "OS" → "os"
- "obra_social" → "obrasocial"
- ❌ **NO coincide** → No funcionará

**Solución**: Usar `{{OS}}` en el template o renombrar columna a "Obra Social".

#### C) Contactos se guardaron sin extraData

Si ejecutas la query de MongoDB y ves:
```javascript
{
  "nombre": "Juan Pérez",
  "telefono": "1123456789",
  "cuil": "20123456789",
  "extraData": {}  // ← VACÍO!
}
```

El problema es que el archivo no tenía columnas adicionales o no se procesaron correctamente.

**Solución**: Volver a subir el archivo con todas las columnas.

### 5. Fix temporal aplicado

Ahora cuando no se encuentra un placeholder, el mensaje mostrará:

```
Buenas tardes {{nombre}} con cuil {{cuil}} de {{obra_social}}
```

En lugar de:
```
Buenas tardes ** con cuil ** de **
```

Esto facilita identificar qué placeholders faltan.

## Verificación recomendada

1. **Revisar archivo Excel/CSV original**:
   - ¿Qué columnas tiene?
   - ¿Tienen datos en todas las filas?

2. **Revisar template del mensaje**:
   - ¿Qué placeholders usa?
   - ¿Coinciden con las columnas del archivo?

3. **Revisar BD**:
   ```bash
   # Ver un contacto específico
   db.contacts.findOne({ 
       createdBy: ObjectId("690ca947b2e8d80541703d9f") 
   })
   ```

4. **Crear campaña de prueba**:
   - Subir archivo con columnas: nombre, telefono, cuil, obra_social
   - Usar template: "Hola {{nombre}} con CUIL {{cuil}} de {{obra_social}}"
   - Verificar que se reemplacen correctamente

## Solución definitiva

Si confirmas que el archivo **SÍ** tiene las columnas pero no se están guardando:

1. Verificar que las columnas tengan nombres válidos:
   - ✓ "Obra Social", "obra_social", "OBRA_SOCIAL"
   - ✓ "Localidad", "localidad", "LOCALIDAD"
   - ✗ Caracteres especiales raros

2. Revisar que no haya espacios extra en los headers del Excel

3. Volver a importar el archivo después del reinicio

---

## Comando rápido de verificación

```bash
# En el servidor
pm2 restart dann-salud-broadcaster
pm2 logs dann-salud-broadcaster --lines 50 | grep "Placeholder debug"
```

Esto mostrará el debug de los últimos 50 mensajes enviados.
