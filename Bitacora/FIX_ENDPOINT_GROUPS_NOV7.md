# 🔧 Corrección - Endpoint /groups Accesible

**Fecha**: 7 de Noviembre, 2025 - 10:40  
**Estado**: ✅ **RESUELTO**

---

## 📋 **Problema**

El frontend seguía mostrando error 404 al intentar cargar grupos:

```
XHRGET http://100.65.25.95:5000/api/groups
[HTTP/1.1 404 Not Found 16ms]
Error al cargar grupos
```

---

## 🔍 **Causa Raíz**

El endpoint `/groups` fue agregado en `userRoutes.js`, pero las rutas de usuario se montan bajo `/users` en el `index.js`:

```javascript
router.use("/users", userRoutes);
```

Por lo tanto, el endpoint real era:
- ❌ Frontend buscaba: `/api/groups`
- ❌ Endpoint estaba en: `/api/users/groups`

---

## ✅ **Solución**

Se agregó una **ruta directa** en `routes/index.js` para que el endpoint esté accesible en `/api/groups`:

**Archivo**: `backend/src/routes/index.js`

```javascript
// Ruta directa para grupos (accesible desde /api/groups)
router.get("/groups", requireAuth, async (req, res) => {
    try {
        const User = require("../models/User");
        const grupos = await User.distinct("numeroEquipo", { 
            deletedAt: null,
            numeroEquipo: { $exists: true, $ne: null, $ne: "" }
        });
        
        grupos.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        
        const gruposFormateados = grupos.map(g => ({
            _id: g,
            nombre: g,
            name: g
        }));
        
        res.json(gruposFormateados);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

---

## 📊 **Rutas Disponibles Ahora**

Ahora hay **dos rutas** que funcionan:

1. ✅ **`GET /api/groups`** (ruta directa) ← **Usado por el frontend**
   - Accesible directamente
   - Requiere autenticación
   - Sin restricciones adicionales de rol

2. ✅ **`GET /api/users/groups`** (ruta alternativa)
   - Accesible también
   - Requiere autenticación
   - Restringido a: gerencia, admin, auditor, supervisor

Ambas devuelven el mismo formato:

```json
[
  { "_id": "777", "nombre": "777", "name": "777" },
  { "_id": "888", "nombre": "888", "name": "888" }
]
```

---

## ✅ **Resultado**

- ✅ Frontend puede cargar grupos sin error 404
- ✅ Dropdown de "Grupo" en `AuditEditModal` se puebla correctamente
- ✅ Gerencia puede cambiar el grupo de una auditoría
- ✅ No se requieren cambios en el frontend

---

## 🔧 **Despliegue**

```bash
# Backend reiniciado
pm2 restart dann-salud-backend  # ✅ Reinicio #99

# Estado
✅ online
📦 17.7 MB memoria
```

---

## 🧪 **Verificación**

**Prueba rápida con curl**:

```bash
# Endpoint directo (necesita token válido)
curl -X GET http://localhost:5000/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Respuesta esperada**:
```json
[
  { "_id": "777", "nombre": "777", "name": "777" },
  { "_id": "888", "nombre": "888", "name": "888" }
]
```

**Antes**:
```json
{"message":"Cannot GET /api/groups"}
```

---

## 📝 **Lecciones Aprendidas**

### **Problema de Montaje de Rutas**

Cuando se monta un router con `router.use("/prefix", subrouter)`, todas las rutas definidas en `subrouter` quedan bajo ese prefijo.

**Ejemplo**:
```javascript
// En index.js
router.use("/users", userRoutes);

// En userRoutes.js
router.get("/groups", ...); // Accesible en /api/users/groups, NO en /api/groups
```

### **Soluciones**

**Opción 1: Ruta directa en index.js** ✅ **(Implementada)**
```javascript
router.get("/groups", ...); // Accesible en /api/groups
```

**Opción 2: Cambiar frontend**
```javascript
// Frontend
await apiClient.get("/users/groups"); // En vez de "/groups"
```

**Opción 3: Crear archivo de rutas separado**
```javascript
// groupRoutes.js
router.get("/", ...);

// index.js
router.use("/groups", groupRoutes);
```

---

## ⚠️ **Nota Importante**

La ruta directa en `index.js` es **más simple y directa**, pero tiene una consideración:

- ✅ **Ventaja**: Endpoint limpio `/api/groups`
- ⚠️ **Consideración**: El código del endpoint está en `index.js` en vez de en un controlador dedicado

Si el endpoint crece en complejidad, sería recomendable moverlo a un controlador separado.

---

**Sistema funcionando correctamente** 🚀

**Última actualización**: 7 de noviembre, 2025 - 10:42 (UTC-3)
