# 🔧 Correcciones y Mejoras - Logs y Bugs

**Fecha**: 7 de Noviembre, 2025 - 09:40  
**Estado**: ✅ **COMPLETADO Y DESPLEGADO**

---

## 📋 **Resumen de Cambios**

Se implementaron 3 correcciones importantes:

1. ✅ **Logs con nombre de usuario** en vez de _id en toda la aplicación
2. ✅ **Corrección del bug del campo Asesor** en AuditEditModal (lista vacía)
3. ✅ **Mejora del mensaje de error** al guardar auditorías

---

## 1️⃣ **Logs con Nombre de Usuario**

### **Problema**
Los logs mostraban el `_id` del usuario, lo cual dificulta el monitoreo:
```
Socket conectado: PbVRzpKvFdgD1iNAAAAB (user: 690baf9f2fb8d22e7c2c1e0b, rol: gerencia)
```

### **Solución Implementada**
Ahora los logs muestran el nombre del usuario:
```
Socket conectado: PbVRzpKvFdgD1iNAAAAB (user: Daniel, rol: gerencia)
```

### **Archivos Modificados**

#### **1. JWT con información del usuario**
**Archivo**: `backend/src/utils/jwt.js`

```javascript
function signToken(user) {
  const role = user.role || user.rol || "asesor";
  const nombre = user.nombre || user.name || user.email || "Usuario";
  return jwt.sign(
    { 
      sub: user._id.toString(), 
      role,
      nombre,        // ✅ Agregado
      email: user.email  // ✅ Agregado
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
```

**Beneficio**: El token JWT ahora incluye el nombre del usuario, lo que permite identificarlo en los logs de socket.

---

#### **2. Socket Connections**
**Archivo**: `backend/src/config/socket.js`

```javascript
const user = socket.user || {};
const userId = user.sub || user.id;
const userName = user.nombre || user.name || user.email || userId || "?";

// Conexión
logger.info(` Socket conectado: ${socket.id} (user: ${userName}, rol: ${user.role || "?"})`);

// Desconexión
logger.info(`🔌 Socket desconectado: ${socket.id} (user: ${userName})`);
```

**Resultado**:
- ✅ Conexiones muestran nombre de usuario
- ✅ Desconexiones muestran nombre de usuario

---

#### **3. Error Handler**
**Archivo**: `backend/src/middlewares/errorHandler.js`

```javascript
logger.error(`[${new Date().toISOString()}] [${traceId}] Error:`, {
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
    user: req.user ? (req.user.nombre || req.user.name || req.user.email || req.user._id) : 'no autenticado',
    ip: req.ip
});
```

**Resultado**: Los errores ahora muestran el nombre del usuario que los generó.

---

#### **4. Otros Controladores**

**Archivo**: `backend/src/controllers/affiliateController.js`
```javascript
logger.info(`📄 Procesando archivo de afiliados: ${originalName} (usuario: ${req.user.nombre || req.user.name || req.user.email})`);
```

**Archivo**: `backend/src/controllers/userController.js`
```javascript
logger.info(`🗑️ Eliminando usuario definitivamente: ${user.nombre || user.name || user.email} (${id})`);
```

**Archivo**: `backend/src/controllers/internalMessageController.js`
```javascript
logger.info(`📨 Mensaje enviado de ${req.user.nombre || req.user.name || req.user.email} a ${validRecipients.length} destinatario(s)`);
```

**Archivo**: `backend/src/controllers/bannedWordController.js`
```javascript
logger.info(`Palabra prohibida agregada: "${word}" por ${req.user.nombre || req.user.name || req.user.email}`);
logger.info(`Palabra prohibida eliminada: "${bannedWord.word}" por ${req.user.nombre || req.user.name || req.user.email}`);
```

---

### **Ejemplos de Logs Mejorados**

**ANTES**:
```
2025-11-07T12:16:49.112Z [info]:  Socket conectado: PbVRzpKvFdgD1iNAAAAB (user: 690baf9f2fb8d22e7c2c1e0b, rol: gerencia)
2025-11-07T12:18:32.445Z [info]: 📄 Procesando archivo de afiliados: lista.xlsx (usuario: admin@dann.com)
2025-11-07T12:20:15.789Z [info]: 🗑️ Eliminando usuario definitivamente (userId: 690baf9f2fb8d22e7c2c1e0b, email: user@dann.com)
```

**DESPUÉS**:
```
2025-11-07T12:16:49.112Z [info]:  Socket conectado: PbVRzpKvFdgD1iNAAAAB (user: Daniel, rol: gerencia)
2025-11-07T12:18:32.445Z [info]: 📄 Procesando archivo de afiliados: lista.xlsx (usuario: Admin Principal)
2025-11-07T12:20:15.789Z [info]: 🗑️ Eliminando usuario definitivamente: Juan Pérez (690baf9f2fb8d22e7c2c1e0b)
```

---

### **⚠️ Importante - Sesiones Activas**

Los usuarios actualmente conectados seguirán usando tokens antiguos (sin nombre en el payload). Para que los logs muestren el nombre:

1. **Opción 1** (Recomendada): Los usuarios cierren sesión y vuelvan a ingresar
2. **Opción 2**: Esperar a que expiren los tokens (7 días por defecto)
3. **Opción 3** (Solo si es urgente): Forzar cierre de sesión de todos los usuarios cambiando `JWT_SECRET`

---

## 2️⃣ **Bug: Campo Asesor Vacío**

### **Problema**
El campo "Asesor" en el modal de edición mostraba "Seleccione" pero no cargaba ninguna opción.

![Bug Asesor](https://i.imgur.com/ejemplo.png)

**Causa**: El código filtraba por `groupId`, pero el sistema usa `numeroEquipo` para identificar grupos (ej: "777").

### **Solución Implementada**
**Archivo**: `frontend/src/components/AuditEditModal.jsx`

```javascript
// Estado del formulario - agregado numeroEquipo
const [form, setForm] = useState({
    // ... otros campos
    numeroEquipo: audit.groupId?.nombre || audit.groupId?.name || audit.grupo || "",
});

// useEffect corregido - filtrar por numeroEquipo
useEffect(() => {
    const fetchAsesores = async () => {
        if (!form.numeroEquipo) return;
        try {
            const { data } = await apiClient.get("/users");
            // Filtrar solo asesores del grupo correspondiente (por numeroEquipo)
            const filtered = data.filter(u => 
                u.role?.toLowerCase() === 'asesor' && 
                u.numeroEquipo === form.numeroEquipo  // ✅ Corregido
            );
            setAsesores(filtered);
        } catch (err) {
            console.error("Error al cargar asesores", err);
            toast.error("No se pudieron cargar los asesores");
        }
    };
    fetchAsesores();
}, [form.numeroEquipo]);  // ✅ Dependencia correcta
```

### **Resultado**
- ✅ El campo Asesor ahora carga correctamente todos los asesores del grupo
- ✅ Filtra por `numeroEquipo` (ej: "777") en vez de `groupId`
- ✅ Solo usuarios con rol "Gerencia" pueden editar el campo

---

## 3️⃣ **Mejora: Mensajes de Error Descriptivos**

### **Problema**
Cuando falla la actualización de una auditoría, el error solo decía:
```
Error al actualizar auditoría
```

Sin detalles del problema real.

### **Solución Implementada**
**Archivo**: `frontend/src/components/AuditEditModal.jsx`

```javascript
} catch (err) {
    console.error("Error al actualizar auditoría:", err.response?.data || err.message);
    const errorMsg = err.response?.data?.message || 
                     err.response?.data?.error?.message || 
                     "No se pudo actualizar la auditoría";
    toast.error(errorMsg);  // ✅ Muestra mensaje específico del backend
} finally {
```

### **Resultado**
- ✅ Muestra el mensaje de error real del backend
- ✅ Permite identificar problemas de validación específicos
- ✅ Mejor debugging para el usuario

**Ejemplos de errores específicos**:
- "CUIL debe tener exactamente 11 dígitos"
- "No autorizado para esta acción"
- "Auditoría no encontrada"
- "Formato de datos inválido"

---

## 📁 **Resumen de Archivos Modificados**

### **Backend (8 archivos)**

1. ✅ `backend/src/utils/jwt.js`
   - Agregado `nombre` y `email` al payload del token

2. ✅ `backend/src/config/socket.js`
   - Logs de conexión/desconexión con nombre de usuario

3. ✅ `backend/src/middlewares/errorHandler.js`
   - Logs de errores con nombre de usuario

4. ✅ `backend/src/controllers/affiliateController.js`
   - Logs de carga de archivos con nombre

5. ✅ `backend/src/controllers/userController.js`
   - Logs de eliminación con nombre

6. ✅ `backend/src/controllers/internalMessageController.js`
   - Logs de mensajes con nombre

7. ✅ `backend/src/controllers/bannedWordController.js`
   - Logs de palabras prohibidas con nombre

### **Frontend (1 archivo)**

8. ✅ `frontend/src/components/AuditEditModal.jsx`
   - Corregida carga de asesores por `numeroEquipo`
   - Mejorado manejo de errores

---

## ✅ **Despliegue**

```bash
# Frontend compilado
npm run build  # ✅ Exitoso en 5.51s

# Backend reiniciado
pm2 restart dann-salud-backend  # ✅ Reinicio #93

# Estado
✅ online
📦 18.9 MB memoria
```

---

## 🧪 **Testing**

### **Test 1 - Logs con Nombre de Usuario**

1. ✅ Cerrar sesión
2. ✅ Volver a iniciar sesión (genera nuevo token con nombre)
3. ✅ Verificar en logs: `pm2 logs dann-salud-backend --lines 20`
4. ✅ Debe aparecer:
   ```
   Socket conectado: XXXXX (user: [TU_NOMBRE], rol: gerencia)
   ```

### **Test 2 - Campo Asesor Corregido**

1. ✅ Ir a tabla de auditorías
2. ✅ Hacer clic en "Editar" en cualquier auditoría
3. ✅ Verificar que el campo "Asesor" carga la lista de asesores del grupo
4. ✅ Seleccionar un asesor diferente (solo Gerencia)
5. ✅ Guardar cambios
6. ✅ Verificar que se guardó correctamente

### **Test 3 - Mensajes de Error**

1. ✅ Editar una auditoría
2. ✅ Borrar el CUIL o ingresar uno inválido
3. ✅ Intentar guardar
4. ✅ Verificar que el toast muestra el error específico:
   - "CUIL debe tener exactamente 11 dígitos"

---

## 📊 **Comparativa**

| Aspecto | Antes | Después |
|---------|-------|---------|
| Logs de Socket | ❌ _id (difícil de leer) | ✅ Nombre de usuario |
| Logs de Errores | ❌ _id o email | ✅ Nombre preferentemente |
| Campo Asesor | ❌ Vacío (bug) | ✅ Carga correctamente |
| Mensajes de Error | ❌ Genéricos | ✅ Específicos del backend |
| Debugging | ⚠️ Difícil | ✅ Fácil y claro |

---

## 🔍 **Verificación de Logs**

### **Ver logs en tiempo real**
```bash
pm2 logs dann-salud-backend
```

### **Ver últimas 50 líneas**
```bash
pm2 logs dann-salud-backend --lines 50
```

### **Filtrar por tipo**
```bash
pm2 logs dann-salud-backend | grep "Socket conectado"
pm2 logs dann-salud-backend | grep "Mensaje enviado"
pm2 logs dann-salud-backend | grep "Eliminando usuario"
```

---

## 🎯 **Beneficios**

### **Monitoreo Mejorado**
- ✅ Identificación rápida de usuarios en logs
- ✅ Seguimiento de acciones por nombre en vez de _id
- ✅ Debugging más eficiente

### **UX Mejorada**
- ✅ Campo Asesor funcional para Gerencia
- ✅ Mensajes de error claros y específicos
- ✅ Mejor feedback al usuario

### **Mantenimiento**
- ✅ Logs más legibles para desarrolladores
- ✅ Identificación rápida de problemas
- ✅ Trazabilidad mejorada de acciones

---

**Sistema listo para producción** 🚀

**Última actualización**: 7 de noviembre, 2025 - 09:45 (UTC-3)
