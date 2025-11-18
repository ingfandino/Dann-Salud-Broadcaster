# 🔧 Mejora - Supervisores Ven Todos los Auditores

**Fecha**: 7 de Noviembre, 2025 - 11:35  
**Estado**: ✅ **COMPLETADO**

---

## 📋 **Requerimiento**

Los usuarios con rol **Supervisor** deben poder ver **todas las opciones posibles** en la lista desplegable "Auditor" de `AuditEditModal.jsx`, tal como lo ven Gerencia y Auditor.

**Restricción**: Este cambio **SOLO aplica al campo "Auditor"**. Todos los demás campos (como "Asesor") deben continuar con la restricción por `numeroEquipo`.

---

## 🔍 **Problema Original**

### **Comportamiento Anterior**

Cuando un Supervisor abría `AuditEditModal.jsx`:

```
Dropdown "Auditor" mostraba:
- ✅ Auditores de su mismo numeroEquipo
- ✅ Él mismo
- ❌ NO mostraba auditores de otros equipos
```

**Consecuencia**: Un supervisor no podía asignar auditorías a auditores de otros equipos, limitando la flexibilidad operativa.

---

### **Causa Raíz**

**Backend**: `controllers/userController.js`

```javascript
// Código anterior
else if (role === "supervisor") {
    // Por defecto: su equipo directo + él mismo
    const teamIds = await getTeamUserIds(_id);
    queryFilter = { _id: { $in: [...teamIds, _id] }, deletedAt: null };
}
```

Cuando un supervisor hacía `GET /users`, el backend solo devolvía:
- Su equipo directo (basado en `supervisor` y `numeroEquipo`)
- Él mismo

**Frontend**: `AuditEditModal.jsx`

```javascript
// Código anterior
const { data } = await apiClient.get("/users");
const filtered = data.filter(u => 
    u.role?.toLowerCase() === 'auditor' ||
    u.role?.toLowerCase() === 'admin' ||
    u.role?.toLowerCase() === 'supervisor'
);
```

El frontend filtraba correctamente por roles, pero ya recibía un conjunto limitado del backend.

---

## ✅ **Solución Implementada**

### **1. Backend - Query Parameter `includeAllAuditors`**

**Archivo**: `backend/src/controllers/userController.js`

**Cambio**:
```javascript
async function getUsers(req, res) {
    try {
        let queryFilter = {};
        const { _id, role } = req.user;
        const { scope, includeAllAuditors } = req.query;

        // ✅ NUEVO: Permitir a supervisores ver todos los auditores
        if (role === "supervisor" && includeAllAuditors === "true") {
            // Devolver todos los usuarios sin restricción de equipo
            // El frontend filtrará solo auditores/admins/supervisors
            queryFilter = { deletedAt: null };
        } else if (role === "supervisor" && scope === "group") {
            // Supervisores: devolver asesores de su mismo numeroEquipo
            let myGroup = req.user.numeroEquipo;
            if (!myGroup) {
                const me = await User.findById(_id).select("numeroEquipo");
                myGroup = me?.numeroEquipo || null;
            }
            queryFilter = { role: "asesor", deletedAt: null };
            if (myGroup !== null) queryFilter.numeroEquipo = myGroup;
        } else if (role === "supervisor") {
            // Por defecto: su equipo directo + él mismo
            const teamIds = await getTeamUserIds(_id);
            queryFilter = { _id: { $in: [...teamIds, _id] }, deletedAt: null };
        }
        // ...resto del código
    }
}
```

**Lógica**:
- Si el usuario es **Supervisor** Y el query param `includeAllAuditors=true`:
  - ✅ Devolver **TODOS** los usuarios (sin restricción de equipo)
  - El frontend filtrará solo auditores/admins/supervisors
- Si el usuario es **Supervisor** Y el query param `scope=group`:
  - ✅ Devolver solo asesores de su `numeroEquipo` (sin cambios)
- Si el usuario es **Supervisor** (sin query params):
  - ✅ Devolver su equipo directo + él mismo (sin cambios)

---

### **2. Frontend - Uso del Query Parameter**

**Archivo**: `frontend/src/components/AuditEditModal.jsx`

**Cambio**:
```javascript
useEffect(() => {
    const fetchAuditores = async () => {
        try {
            // ✅ NUEVO: Agregar query param para que supervisores vean todos los auditores
            // (no solo los de su equipo)
            const { data } = await apiClient.get("/users?includeAllAuditors=true");
            const filtered = data.filter(u => 
                u.role?.toLowerCase() === 'auditor' ||
                u.role?.toLowerCase() === 'admin' ||
                u.role?.toLowerCase() === 'supervisor'
            );
            setAuditores(filtered);
        } catch (err) {
            console.error("Error al cargar auditores", err);
            toast.error("No se pudieron cargar los auditores");
        }
    };
    
    // ... resto del código (fetchGrupos sin cambios)
    
    fetchAuditores();
    fetchGrupos();
}, []);
```

**Resultado**: El dropdown de "Auditor" ahora se llena con **todos los auditores** disponibles, sin importar su `numeroEquipo`.

---

## 📊 **Comparación: Antes vs Después**

### **Para Supervisor del Equipo "777"**

**Antes**:
```
Dropdown "Auditor" muestra:
┌─────────────────────┐
│  Seleccione        │
├─────────────────────┤
│  Carlos (777)      │  ← Auditor del equipo 777
│  María (777)       │  ← Auditora del equipo 777
│  Supervisor (777)  │  ← Él mismo
└─────────────────────┘

❌ No puede asignar a Juan (888) o Pedro (999)
```

**Después**:
```
Dropdown "Auditor" muestra:
┌─────────────────────┐
│  Seleccione        │
├─────────────────────┤
│  Carlos (777)      │  ← Auditor del equipo 777
│  María (777)       │  ← Auditora del equipo 777
│  Juan (888)        │  ✅ Auditor del equipo 888
│  Pedro (999)       │  ✅ Auditor del equipo 999
│  Supervisor (777)  │  ← Él mismo
│  Admin             │  ✅ Admin (sin equipo)
└─────────────────────┘

✅ Puede asignar a cualquier auditor de cualquier equipo
```

---

## 🔒 **Otros Campos Sin Cambios**

### **Campo "Asesor" (solo Gerencia)**

**Comportamiento**: Sigue filtrando por `numeroEquipo` (SIN CAMBIOS)

```javascript
// Este useEffect NO fue modificado
useEffect(() => {
    const fetchAsesores = async () => {
        if (!form.numeroEquipo) return;
        try {
            const { data } = await apiClient.get("/users");
            // Filtrar solo asesores del grupo correspondiente (por numeroEquipo)
            const filtered = data.filter(u => 
                u.role?.toLowerCase() === 'asesor' && 
                u.numeroEquipo === form.numeroEquipo
            );
            setAsesores(filtered);
        } catch (err) {
            console.error("Error al cargar asesores", err);
            toast.error("No se pudieron cargar los asesores");
        }
    };
    
    fetchAsesores();
}, [form.numeroEquipo]);
```

**Resultado**: El dropdown de "Asesor" sigue mostrando solo asesores del mismo `numeroEquipo` que el grupo seleccionado.

---

## 🎯 **Casos de Uso**

### **Caso 1: Reasignación Entre Equipos**

**Situación**: Un supervisor del equipo 777 necesita reasignar una auditoría a un auditor del equipo 888 porque todos los auditores de 777 están ocupados.

**Acción**:
1. Supervisor abre `AuditEditModal`
2. Ve lista completa de auditores (incluye equipo 888)
3. Selecciona auditor del equipo 888
4. Guarda

**Resultado**: 
- ✅ Auditoría reasignada exitosamente
- ✅ Flexibilidad operativa mejorada

---

### **Caso 2: Auditor Ausente**

**Situación**: Un auditor del equipo 999 se enferma. El supervisor del equipo 777 necesita tomar sus auditorías temporalmente.

**Acción**:
1. Supervisor 777 filtra auditorías del auditor enfermo (equipo 999)
2. Para cada auditoría, cambia el auditor a sí mismo o a otro auditor disponible
3. Guarda cambios

**Resultado**:
- ✅ Continuidad operativa sin esperar a Gerencia
- ✅ Reasignación rápida entre equipos

---

### **Caso 3: Especialización por Tipo de Auditoría**

**Situación**: Algunos auditores son especialistas en ciertos tipos de obra social. Un supervisor necesita asignar auditorías a especialistas de otros equipos.

**Acción**:
1. Supervisor ve auditoría de Binimed
2. Sabe que Juan (equipo 888) es especialista en Binimed
3. Asigna a Juan aunque esté en otro equipo

**Resultado**:
- ✅ Mayor eficiencia en auditorías
- ✅ Uso óptimo de experticia disponible

---

## 📁 **Archivos Modificados**

### **Backend (1 archivo)**

1. ✅ `controllers/userController.js`
   - Agregado query param `includeAllAuditors`
   - Nueva condición para supervisores con este parámetro
   - Devuelve todos los usuarios sin restricción de equipo

### **Frontend (1 archivo)**

2. ✅ `components/AuditEditModal.jsx`
   - Modificado fetch de auditores
   - Agregado query param `?includeAllAuditors=true`
   - Comentarios aclaratorios

---

## ✅ **Despliegue**

```bash
# Frontend compilado
npm run build  # ✅ Exitoso en 5.66s

# Backend reiniciado
pm2 restart dann-salud-backend  # ✅ Reinicio #102

# Estado
✅ online
📦 18.7 MB memoria
```

---

## 🧪 **Testing**

### **Test 1 - Supervisor Ve Todos los Auditores**

**Pasos**:
1. Login como **Supervisor** (cualquier equipo)
2. Ir a FollowUp.jsx
3. Editar una auditoría
4. Verificar dropdown "Auditor"

**Resultado Esperado**:
- ✅ Muestra auditores de **todos los equipos**
- ✅ Muestra admins
- ✅ Muestra otros supervisores
- ✅ No limitado a su `numeroEquipo`

---

### **Test 2 - Supervisor Asigna Auditor de Otro Equipo**

**Pasos**:
1. Login como Supervisor del equipo 777
2. Editar auditoría
3. Seleccionar auditor del equipo 888
4. Guardar

**Resultado Esperado**:
- ✅ Toast: "Auditoría actualizada"
- ✅ FollowUp.jsx muestra el nuevo auditor (equipo 888)
- ✅ Sin errores de permisos

**Verificar en MongoDB**:
```javascript
db.audits.findOne({ _id: ObjectId("...") })
// Resultado: { auditor: ObjectId("...") } // ID del auditor del equipo 888
```

---

### **Test 3 - Campo Asesor Sigue Filtrado (Gerencia)**

**Pasos**:
1. Login como **Gerencia**
2. Editar auditoría
3. Cambiar campo "Grupo" a "888"
4. Verificar dropdown "Asesor"

**Resultado Esperado**:
- ✅ Solo muestra asesores del equipo 888
- ✅ No muestra asesores de otros equipos
- ✅ Restricción por `numeroEquipo` se mantiene

---

### **Test 4 - Otros Roles Sin Cambios**

**Pasos para Gerencia**:
1. Login como **Gerencia**
2. Editar auditoría
3. Verificar dropdown "Auditor"

**Resultado Esperado**:
- ✅ Muestra todos los auditores (sin cambios, ya los veía antes)

**Pasos para Auditor**:
1. Login como **Auditor**
2. Editar auditoría
3. Verificar dropdown "Auditor"

**Resultado Esperado**:
- ✅ Muestra todos los auditores (sin cambios, ya los veía antes)

**Pasos para Asesor**:
1. Login como **Asesor**
2. Intentar editar auditoría

**Resultado Esperado**:
- ✅ No tiene acceso a editar (sin cambios)

---

## 🎯 **Beneficios**

### **Para Supervisores**
- ✅ **Mayor autonomía** para reasignar auditorías
- ✅ **Flexibilidad operativa** entre equipos
- ✅ **Respuesta rápida** a ausencias o sobrecargas

### **Para la Operación**
- ✅ **Mejor distribución** de carga de trabajo
- ✅ **Continuidad** ante ausencias sin esperar Gerencia
- ✅ **Uso óptimo** de recursos disponibles

### **Para el Sistema**
- ✅ **Código limpio** con query param específico
- ✅ **Separación de responsabilidades** (backend filtra, frontend selecciona)
- ✅ **Backwards compatible** (no rompe funcionalidad existente)

---

## 🔄 **Flujo de Datos**

### **Carga del Dropdown "Auditor"**

```
1. Frontend: AuditEditModal se monta
   ↓
2. useEffect ejecuta fetchAuditores()
   ↓
3. Frontend: GET /users?includeAllAuditors=true
   ↓
4. Backend: userController.getUsers()
   ↓
5. Backend detecta: role=supervisor && includeAllAuditors=true
   ↓
6. Backend: queryFilter = { deletedAt: null }  ← SIN restricción de equipo
   ↓
7. MongoDB: User.find({ deletedAt: null })
   ↓
8. Backend devuelve: TODOS los usuarios activos
   ↓
9. Frontend filtra:
   - role === 'auditor' ✅
   - role === 'admin' ✅
   - role === 'supervisor' ✅
   - otros roles ❌
   ↓
10. Frontend: setAuditores(filtered)
   ↓
11. Dropdown "Auditor" muestra todos los auditores
```

---

### **Carga del Dropdown "Asesor" (sin cambios)**

```
1. Frontend: Usuario (Gerencia) cambia campo "Grupo"
   ↓
2. useEffect detecta cambio en form.numeroEquipo
   ↓
3. Frontend: GET /users  ← SIN query param includeAllAuditors
   ↓
4. Backend: userController.getUsers()
   ↓
5. Backend detecta: role=gerencia (admin/auditor comportamiento similar)
   ↓
6. Backend: queryFilter = { deletedAt: null }
   ↓
7. MongoDB: User.find({ deletedAt: null })
   ↓
8. Backend devuelve: TODOS los usuarios activos
   ↓
9. Frontend filtra:
   - role === 'asesor' ✅
   - numeroEquipo === form.numeroEquipo ✅  ← Filtro adicional
   ↓
10. Frontend: setAsesores(filtered)
   ↓
11. Dropdown "Asesor" muestra solo asesores del grupo seleccionado
```

---

## 📊 **Matriz de Permisos**

| Rol | Campo "Auditor" (AuditEditModal) | Campo "Asesor" (AuditEditModal) | Notas |
|-----|----------------------------------|----------------------------------|-------|
| **Admin** | ✅ Todos los auditores | ✅ Asesores del grupo seleccionado | Sin cambios |
| **Gerencia** | ✅ Todos los auditores | ✅ Asesores del grupo seleccionado | Sin cambios |
| **Auditor** | ✅ Todos los auditores | ❌ No ve/edita campo Asesor | Sin cambios |
| **Supervisor** | ✅ **TODOS los auditores** 🆕 | ❌ No ve/edita campo Asesor | **CAMBIO** |
| **Asesor** | ❌ No puede editar auditorías | ❌ No puede editar auditorías | Sin cambios |

---

## 💡 **Notas Técnicas**

### **Query Parameter `includeAllAuditors`**

**Por qué usar un query param**:
- ✅ Explícito: Indica claramente la intención
- ✅ Específico: Solo afecta este caso de uso
- ✅ Flexible: Se puede usar en otros componentes si es necesario
- ✅ Backwards compatible: Requests sin el parámetro funcionan como antes

**Alternativas consideradas**:
1. ❌ Modificar lógica general de supervisores
   - Problema: Afectaría otros lugares donde se usa `/users`
2. ❌ Crear endpoint separado `/users/all-auditors`
   - Problema: Duplicación de código
3. ✅ Query parameter (elegida)
   - Ventaja: Limpio, explícito, reutilizable

---

### **Separación de Responsabilidades**

**Backend**:
- ✅ Determina QUÉ usuarios devolver basado en permisos y query params
- ✅ Aplica filtros a nivel de base de datos

**Frontend**:
- ✅ Filtra por rol específico (auditor/admin/supervisor)
- ✅ Presenta los datos en el dropdown
- ✅ NO toma decisiones de permisos (eso es del backend)

---

## ⚠️ **Consideraciones Importantes**

### **Seguridad**

- ✅ Solo supervisores autenticados pueden usar `includeAllAuditors=true`
- ✅ El backend valida el rol antes de aplicar el filtro
- ✅ Otros roles siguen sus restricciones normales

### **Performance**

- ✅ Consulta sigue siendo simple: `{ deletedAt: null }`
- ✅ Sin joins complejos
- ✅ Resultado se filtra en frontend (bajo volumen de usuarios)

### **Mantenibilidad**

- ✅ Código auto-documentado con comentarios
- ✅ Query param explícito en su propósito
- ✅ No rompe funcionalidad existente

---

## 📝 **Changelog**

### **v1.0.0 - 7 Nov 2025**

**Added**:
- Query parameter `includeAllAuditors` en endpoint `/users`
- Supervisores pueden ver todos los auditores en dropdown de Auditor

**Changed**:
- Lógica de filtrado en `userController.getUsers()` para supervisores

**Not Changed**:
- Campo "Asesor" sigue con restricción por `numeroEquipo`
- Permisos de otros roles sin modificación
- Otros dropdowns sin cambios

---

**Sistema con supervisores viendo todos los auditores** 🚀

**Última actualización**: 7 de noviembre, 2025 - 11:37 (UTC-3)
