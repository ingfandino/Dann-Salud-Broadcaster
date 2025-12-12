# 🔍 Sistema de Validación de Contactos Duplicados

**Última actualización:** 1 de Noviembre, 2025

---

## 🎯 Objetivo

Prevenir envíos duplicados al mismo contacto **SIN impedir recargas legítimas** de contactos que nunca recibieron mensajes.

---

## 📋 Flujo de Validación

### **1. Al Subir Archivo CSV/XLSX** (`contactController.js`)

```javascript
Para cada contacto en el archivo:

1. ✅ Validar teléfono (formato correcto)
2. ✅ Detectar duplicados DENTRO del archivo
   → Si el mismo número aparece 2+ veces en CSV → Rechazar repeticiones
   
3. ✅ Buscar si existe en Base de Datos
   
   SI EXISTE:
   ├─ 🔹 Verificar si tiene mensajes con status="enviado"
   │
   ├─ SI tiene mensajes exitosos:
   │  └─ ❌ RECHAZAR como duplicado legítimo
   │     └─ Tipo: "duplicado_con_mensajes"
   │     └─ Detalle: "El contacto ya recibió X mensaje(s) exitoso(s)"
   │
   └─ SI NO tiene mensajes exitosos:
      └─ ✅ ELIMINAR contacto viejo de BD
      └─ ✅ ELIMINAR mensajes fallidos asociados
      └─ ✅ PERMITIR inserción del nuevo contacto
      └─ Tipo: "reemplazado"
      └─ Detalle: "Contacto anterior sin mensajes exitosos fue eliminado y será reemplazado"
   
4. ✅ Insertar contacto nuevo en BD
```

---

### **2. Al Crear Campaña** (`sendJobController.js`)

```javascript
Al ejecutar startJob con lista de contactos:

1. ✅ Cargar documentos completos de contactos desde BD
2. ✅ Normalizar teléfonos (formato argentino 549...)
3. ✅ Usar Set para detectar duplicados POR TELÉFONO NORMALIZADO
4. ✅ Construir array únicamente con IDs de contactos únicos
5. ✅ Crear job solo con contactos únicos

Resultado:
└─ Un job NUNCA tendrá el mismo teléfono 2+ veces
└─ Aunque haya múltiples contactos con mismo teléfono en BD (no debería pasar)
```

---

## 🔄 Escenarios de Uso

### **Escenario 1: Primera Carga de Juana**
```
1. Subir CSV con "Juana - 3512345678"
2. Sistema: "Contacto no existe en BD"
3. ✅ Contacto creado con ID: abc123
4. Resultado: Juana está en BD sin mensajes
```

### **Escenario 2: Campaña Cancelada Antes de Enviar**
```
1. Crear campaña con Juana
2. Sistema asigna Juana al job
3. Campaña se CANCELA antes de enviarle el mensaje
4. Resultado: Juana en BD, 0 mensajes con status="enviado"
```

### **Escenario 3: Recargar Juana (Sin Mensajes)**
```
1. Subir CSV con "Juana - 3512345678" nuevamente
2. Sistema: "Contacto existe en BD con ID: abc123"
3. Sistema: "Verificando mensajes..."
4. Sistema: "0 mensajes con status='enviado'"
5. ✅ ELIMINAR contacto abc123
6. ✅ ELIMINAR mensajes fallidos de abc123
7. ✅ CREAR nuevo contacto con ID: def456
8. Warning: "reemplazado - Contacto anterior sin mensajes exitosos fue eliminado y será reemplazado"
9. Resultado: Juana tiene nuevo ID en BD, lista para recibir mensaje
```

### **Escenario 4: Recargar Juana (CON Mensajes)**
```
1. Juana recibió mensaje exitoso en campaña anterior
2. BD: Juana (ID: def456) tiene 1 mensaje con status="enviado"
3. Subir CSV con "Juana - 3512345678" nuevamente
4. Sistema: "Contacto existe en BD con ID: def456"
5. Sistema: "Verificando mensajes..."
6. Sistema: "1 mensaje(s) con status='enviado'"
7. ❌ RECHAZAR carga
8. Warning: "duplicado_con_mensajes - El contacto ya recibió 1 mensaje(s) exitoso(s)"
9. Resultado: Juana NO se recarga (ya recibió mensaje)
```

### **Escenario 5: Mensaje Fallido**
```
1. Campaña envía mensaje a Juana
2. Error: número inválido / sin WhatsApp
3. BD: Mensaje creado con status="fallido"
4. Sistema: Juana tiene 0 mensajes con status="enviado"
5. Subir CSV con Juana nuevamente
6. ✅ Sistema permite recarga (solo cuenta "enviado", no "fallido")
7. Resultado: Juana puede recibir otro intento
```

---

## 🛡️ Garantías del Sistema

### ✅ **Lo que SÍ previene:**
1. **Doble envío al mismo contacto** dentro de una campaña
2. **Reenvío a contactos que YA recibieron mensajes exitosos**
3. **Múltiples registros del mismo teléfono** en BD simultáneamente
4. **Duplicados dentro del mismo archivo CSV**

### ✅ **Lo que SÍ permite:**
1. **Recargar contactos** que nunca recibieron mensajes
2. **Recargar contactos** cuyos mensajes fallaron
3. **Recargar contactos** de campañas canceladas antes del envío
4. **Limpiar registros huérfanos** sin mensajes exitosos

---

## 📊 Tipos de Warnings en la Importación

| Tipo | Descripción | Acción |
|------|-------------|--------|
| `duplicado_en_archivo` | Mismo número aparece 2+ veces en CSV | ❌ Rechazar repeticiones |
| `duplicado_con_mensajes` | Contacto ya recibió mensajes exitosos | ❌ Rechazar recarga |
| `reemplazado` | Contacto sin mensajes fue eliminado | ✅ Permitir recarga |
| `faltan_campos` | Falta nombre/teléfono/CUIL | ❌ Rechazar |
| `telefono_invalido` | Formato de teléfono incorrecto | ❌ Rechazar |

---

## 🗄️ Limpieza de Base de Datos

### **Al Eliminar Contacto Sin Mensajes:**

```javascript
// 1. Eliminar contacto
await Contact.findByIdAndDelete(existingId);

// 2. Eliminar mensajes asociados (fallidos)
await Message.deleteMany({ contact: existingId });

// 3. Actualizar Map en memoria
existingByPhone.delete(phoneNumber);
```

**Beneficio:** No quedan registros huérfanos en la BD.

---

## 🧪 Pruebas de Validación

### **Test 1: Contacto Nuevo**
```bash
# Subir CSV con Juan (nuevo)
# Resultado esperado: ✅ Insertado
```

### **Test 2: Duplicado en Archivo**
```bash
# CSV con:
# Juan, 351111111
# María, 351222222
# Juan, 351111111  ← Duplicado

# Resultado esperado:
# Juan línea 1: ✅ Insertado
# María: ✅ Insertado
# Juan línea 3: ❌ Warning "duplicado_en_archivo"
```

### **Test 3: Campaña Cancelada**
```bash
# 1. Subir CSV con Pedro
# 2. Crear campaña con Pedro
# 3. Cancelar campaña ANTES de que llegue a Pedro
# 4. Subir CSV con Pedro nuevamente
# Resultado esperado: ✅ Warning "reemplazado", permite recarga
```

### **Test 4: Mensaje Enviado**
```bash
# 1. Subir CSV con Ana
# 2. Crear campaña y enviar mensaje exitoso a Ana
# 3. Subir CSV con Ana nuevamente
# Resultado esperado: ❌ Warning "duplicado_con_mensajes", rechaza
```

### **Test 5: Mensaje Fallido**
```bash
# 1. Subir CSV con Luis (número inválido)
# 2. Crear campaña, mensaje falla (status="fallido")
# 3. Subir CSV con Luis (número correcto)
# Resultado esperado: ✅ Warning "reemplazado", permite recarga
```

---

## 📝 Logs de Monitoreo

### **Ver reemplazos de contactos:**
```bash
grep "🔄 Eliminando contacto sin mensajes" backend/logs/app-*.log
```

### **Ver mensajes eliminados:**
```bash
grep "🗑️ Eliminados.*mensaje(s) fallido(s)" backend/logs/app-*.log
```

### **Ver duplicados detectados:**
```bash
grep "duplicado_con_mensajes\|duplicado_en_bd" backend/logs/app-*.log
```

---

## 🔧 Configuración

No requiere configuración adicional. El sistema funciona automáticamente con:

- **Criterio de duplicado:** Teléfono normalizado (sin espacios, guiones, etc.)
- **Criterio de envío exitoso:** `Message.status === "enviado"`
- **Criterio de limpieza:** Contacto sin mensajes con `status === "enviado"`

---

## ⚠️ Notas Importantes

1. **Solo se cuentan mensajes con `status="enviado"`**
   - `status="fallido"` NO bloquea recarga
   - `status="pendiente"` NO bloquea recarga

2. **La eliminación es definitiva**
   - Al reemplazar, el contacto viejo y sus mensajes fallidos se eliminan
   - No hay backup automático (se asume que el CSV es la fuente de verdad)

3. **Deduplicación en jobs es independiente**
   - Aunque haya duplicados en BD (no debería), el job los filtra
   - Garantía doble: validación en carga + validación en job

4. **Los mensajes exitosos son permanentes**
   - Una vez enviado un mensaje exitoso, el contacto no puede recargarse
   - Si necesitas reenviar, debes eliminar manualmente desde BD

---

## 🎯 Resumen

| Situación | Tiene Mensajes Enviados | Acción |
|-----------|-------------------------|---------|
| Contacto nuevo | No existe | ✅ Insertar |
| Contacto existe, campaña cancelada | NO | ✅ Eliminar viejo + Insertar nuevo |
| Contacto existe, mensaje fallido | NO | ✅ Eliminar viejo + Insertar nuevo |
| Contacto existe, mensaje enviado | SÍ | ❌ Rechazar como duplicado |
| Mismo número 2+ veces en CSV | N/A | ❌ Rechazar repeticiones |

---

**Implementado en:**
- `backend/src/controllers/contactController.js` (líneas 186-226)
- `backend/src/controllers/sendJobController.js` (líneas 25-63)

**Estado:** ✅ Funcional y testeado