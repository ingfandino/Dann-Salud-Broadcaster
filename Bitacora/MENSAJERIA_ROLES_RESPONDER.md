# 🏷️ Mensajería por Roles + Responder/Reenviar

**Fecha:** 3 de Noviembre, 2025  
**Estado:** ✅ Implementado y funcional

---

## 🎯 Objetivo

Ampliar el sistema de mensajería interna para permitir:
1. **Envío por roles/grupos:** Enviar mensajes a todos los usuarios de un rol específico (admin, gerencia, supervisor, auditor, asesor, revendedor)
2. **Responder mensajes:** Reply a mensajes recibidos
3. **Reenviar mensajes:** Forward de mensajes a otros destinatarios

---

## ✨ Nuevas Funcionalidades

### **1. Envío por Roles/Grupos** ✅

**Roles disponibles:**
- 👑 **Administradores** (admin)
- 💼 **Gerencia** (gerencia)
- 👔 **Supervisores** (supervisor)
- 🔍 **Auditores** (auditor)
- 📞 **Asesores** (asesor)
- 🔄 **Revendedores** (revendedor)

**Características:**
- ✅ Selección de uno o múltiples roles
- ✅ Envío automático a todos los usuarios activos del rol
- ✅ Excluye al remitente automáticamente
- ✅ Chips visuales morados para roles seleccionados
- ✅ Contador de destinatarios en respuesta

---

### **2. Responder Mensajes** ✅

**Características:**
- ✅ Botón "↩️ Responder" en vista de mensaje
- ✅ Autocompletado de destinatario (remitente original)
- ✅ Asunto con prefijo "Re:"
- ✅ Citación del mensaje original
- ✅ Relación con mensaje original (replyTo)

**Formato de respuesta:**
```
Asunto: Re: Reunión de equipo
Para: [Usuario original]

[Tu respuesta aquí]

---
Respuesta a mensaje de Juan Pérez:
"Mensaje original truncado a 200 caracteres..."
```

---

### **3. Reenviar Mensajes** ✅

**Características:**
- ✅ Botón "➡️ Reenviar" en vista de mensaje
- ✅ Asunto con prefijo "Fwd:"
- ✅ Contenido completo del mensaje original
- ✅ Indicación de quién envió originalmente
- ✅ Selector libre de destinatarios (usuarios o roles)

**Formato de reenvío:**
```
Asunto: Fwd: Reunión de equipo
Para: [Seleccionar nuevos destinatarios]

[Mensaje adicional opcional]

---
Mensaje reenviado de Juan Pérez:

[Contenido completo del mensaje original]
```

---

## 🏗️ Arquitectura

### **Backend**

#### **Modelo InternalMessage**
```javascript
{
    from: ObjectId,          // Remitente
    to: ObjectId,            // Destinatario individual
    subject: String,
    content: String,
    attachments: Array,
    replyTo: ObjectId,       // 🆕 Referencia al mensaje original
    isForward: Boolean,      // 🆕 Indica si es reenvío
    forwardedFrom: ObjectId, // 🆕 Usuario que reenvió
    // ... otros campos
}
```

#### **Controlador sendMessage()**
```javascript
exports.sendMessage = async (req, res) => {
    let { to, roles, subject, content, replyTo, isForward } = req.body;
    
    // OPCIÓN 1: Envío por ROLES
    if (roles && roles.length > 0) {
        validRecipients = await User.find({
            role: { $in: roles },
            active: true,
            _id: { $ne: fromUserId } // Excluir remitente
        });
    }
    // OPCIÓN 2: Envío por USUARIOS
    else if (to) {
        validRecipients = await User.find({
            _id: { $in: to },
            active: true
        });
    }
    
    // Crear mensaje para cada destinatario
    for (const recipient of validRecipients) {
        const messageData = {
            from: fromUserId,
            to: recipient._id,
            subject,
            content,
            attachments,
            replyTo: replyTo || null
        };
        
        if (isForward) {
            messageData.isForward = true;
            messageData.forwardedFrom = fromUserId;
        }
        
        await new InternalMessage(messageData).save();
        // Emitir Socket.io...
    }
};
```

---

### **Frontend**

#### **Estados del Compositor**
```javascript
const [composeForm, setComposeForm] = useState({
    to: [],           // Array de IDs usuarios
    roles: [],        // Array de roles
    subject: "",
    content: "",
    attachments: [],
    replyTo: null,    // ID del mensaje original (reply)
    isForward: false  // Indica si es reenvío
});

const [recipientMode, setRecipientMode] = useState("users"); 
// "users" o "roles"
```

#### **Roles Disponibles**
```javascript
const availableRoles = [
    { value: "admin", label: "Administradores", icon: "👑" },
    { value: "gerencia", label: "Gerencia", icon: "💼" },
    { value: "supervisor", label: "Supervisores", icon: "👔" },
    { value: "auditor", label: "Auditores", icon: "🔍" },
    { value: "asesor", label: "Asesores", icon: "📞" },
    { value: "revendedor", label: "Revendedores", icon: "🔄" }
];
```

#### **Funciones Clave**

**Agregar/Remover Roles:**
```javascript
const addRole = (role) => {
    if (composeForm.roles.includes(role)) {
        toast.warning("Este rol ya está agregado");
        return;
    }
    setComposeForm(prev => ({
        ...prev,
        roles: [...prev.roles, role]
    }));
};

const removeRole = (role) => {
    setComposeForm(prev => ({
        ...prev,
        roles: prev.roles.filter(r => r !== role)
    }));
};
```

**Responder:**
```javascript
const handleReply = (message) => {
    setComposing(true);
    setComposeForm({
        to: [message.from._id],
        roles: [],
        subject: `Re: ${message.subject}`,
        content: `\n\n---\nRespuesta a ${message.from.nombre}:\n"${message.content.substring(0, 200)}..."`,
        replyTo: message._id,
        isForward: false
    });
    setRecipientMode("users");
};
```

**Reenviar:**
```javascript
const handleForward = (message) => {
    setComposing(true);
    setComposeForm({
        to: [],
        roles: [],
        subject: `Fwd: ${message.subject}`,
        content: `\n\n---\nMensaje reenviado de ${message.from.nombre}:\n\n${message.content}`,
        isForward: true
    });
    setRecipientMode("users");
};
```

---

## 🎨 Interfaz de Usuario

### **Compositor - Tabs de Destinatarios**

```
┌──────────────────────────────────────────────┐
│  ✉️ Nuevo Mensaje                       [×]  │
├──────────────────────────────────────────────┤
│  Para:                                       │
│                                              │
│  [👥 Usuarios] [🏷️ Roles/Grupos]     ← Tabs│
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │ Modo: Roles/Grupos                  │    │
│  │                                     │    │
│  │ [👑 Administradores ×]              │    │ ← Chips morados
│  │ [🔍 Auditores ×]                    │    │
│  │                                     │    │
│  │ Selecciona roles:                   │    │
│  │ ┌──────────────┬──────────────┐    │    │
│  │ │ 👑 Admins    │ 💼 Gerencia  │    │    │ ← Grid de roles
│  │ │ ✓ Seleccionado│              │    │    │
│  │ ├──────────────┼──────────────┤    │    │
│  │ │ 👔 Supervisor│ 🔍 Auditores │    │    │
│  │ │              │ ✓ Seleccionado│    │    │
│  │ ├──────────────┼──────────────┤    │    │
│  │ │ 📞 Asesores  │ 🔄 Revendedor│    │    │
│  │ └──────────────┴──────────────┘    │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  Asunto: [Reunión urgente]                  │
│  Mensaje: [Texto del mensaje...]            │
│                                              │
│             [Cancelar]  [📤 Enviar a 15]    │ ← Muestra cantidad
└──────────────────────────────────────────────┘
```

### **Vista de Mensaje - Botones de Acción**

```
┌──────────────────────────────────────────────┐
│  Reunión de equipo                           │
│  De: Juan Pérez (juan@dann.com)              │
│  Para: María López (maria@dann.com)          │
│  Fecha: 03/11/2025, 10:30                    │
│                                     [⭐] [🗑️]│
├──────────────────────────────────────────────┤
│                                              │
│  Hola equipo, les recuerdo que...           │
│                                              │
├──────────────────────────────────────────────┤
│  [↩️ Responder]  [➡️ Reenviar]         ← Botones nuevos│
├──────────────────────────────────────────────┤
│  📎 Archivos adjuntos:                       │
│  • documento.pdf              [📥 Descargar] │
└──────────────────────────────────────────────┘
```

---

## 🔄 Flujos de Uso

### **Flujo 1: Envío por Rol**

```bash
1. Admin: Click "✉️ Nuevo Mensaje"
2. Click tab "🏷️ Roles/Grupos"
3. Click en "🔍 Auditores" → Aparece chip morado
4. Click en "👔 Supervisores" → Aparece otro chip
5. Escribir asunto: "Actualización de procedimientos"
6. Escribir mensaje
7. Click "📤 Enviar"
8. ✅ Backend encuentra 8 auditores + 3 supervisores activos
9. ✅ Crea 11 mensajes individuales
10. ✅ Cada usuario recibe notificación en tiempo real
11. Toast: "✅ Mensaje enviado a 11 destinatario(s)"
```

### **Flujo 2: Responder a Mensaje**

```bash
1. Usuario: Abre mensaje recibido
2. Lee contenido
3. Click "↩️ Responder"
4. ✅ Modal se abre con:
   - Destinatario: remitente original (autocompletado)
   - Asunto: "Re: [asunto original]"
   - Contenido: citación del mensaje original
5. Escribir respuesta arriba de la citación
6. Click "📤 Enviar"
7. ✅ Mensaje enviado con replyTo = ID mensaje original
8. Toast: "✅ Mensaje respondido a 1 destinatario(s)"
```

### **Flujo 3: Reenviar Mensaje**

```bash
1. Usuario: Abre mensaje recibido
2. Click "➡️ Reenviar"
3. ✅ Modal se abre con:
   - Destinatario: vacío (para seleccionar)
   - Asunto: "Fwd: [asunto original]"
   - Contenido: mensaje completo del original
4. Seleccionar nuevos destinatarios (usuarios o roles)
5. Agregar comentario opcional
6. Click "📤 Enviar"
7. ✅ Mensaje enviado con isForward = true
8. Toast: "✅ Mensaje reenviado a X destinatario(s)"
```

### **Flujo 4: Envío Mixto (Usuarios + Roles)**

```bash
Nota: Actualmente el sistema prioriza roles sobre usuarios.
Si seleccionas roles, se ignoran los usuarios individuales.

Opción A: Enviar a usuarios específicos
- Tab "👥 Usuarios" → Seleccionar usuarios
- Los roles se ignoran

Opción B: Enviar a roles
- Tab "🏷️ Roles/Grupos" → Seleccionar roles
- Todos los usuarios del rol reciben el mensaje
```

---

## 📊 Base de Datos

### **Estructura de Mensajes**

**Mensaje Simple:**
```javascript
{
    _id: "msg_001",
    from: "user_admin",
    to: "user_juan",
    subject: "Actualización",
    content: "Mensaje simple",
    replyTo: null,
    isForward: false
}
```

**Mensaje de Respuesta:**
```javascript
{
    _id: "msg_002",
    from: "user_juan",
    to: "user_admin",
    subject: "Re: Actualización",
    content: "Gracias por la info\n\n---\nRespuesta a...",
    replyTo: "msg_001",  // 🆕 Relación con original
    isForward: false
}
```

**Mensaje Reenviado:**
```javascript
{
    _id: "msg_003",
    from: "user_admin",
    to: "user_maria",
    subject: "Fwd: Actualización",
    content: "---\nMensaje reenviado de...",
    replyTo: null,
    isForward: true,           // 🆕 Marcado como reenvío
    forwardedFrom: "user_admin" // 🆕 Quién reenvió
}
```

---

## 🧪 Pruebas

### **Test 1: Envío a Rol Único**
```bash
1. Login como Admin
2. Nuevo mensaje → Tab "Roles/Grupos"
3. Seleccionar "🔍 Auditores"
4. Escribir mensaje
5. Enviar
6. ✅ Verificar: Todos los auditores activos reciben mensaje
7. ✅ Verificar: Admin NO recibe copia (se excluye)
8. ✅ Verificar: Usuarios inactivos NO reciben
```

### **Test 2: Envío a Múltiples Roles**
```bash
1. Login como Gerencia
2. Nuevo mensaje → Tab "Roles/Grupos"
3. Seleccionar "👔 Supervisores" y "📞 Asesores"
4. Enviar
5. ✅ Verificar: Todos supervisores + asesores reciben
6. ✅ Verificar: Toast muestra cantidad correcta
7. ✅ Verificar: Logs backend: "Enviando mensaje a roles: supervisor, asesor"
```

### **Test 3: Responder a Mensaje**
```bash
1. Usuario A envía mensaje a Usuario B
2. Usuario B: Abre mensaje
3. Usuario B: Click "↩️ Responder"
4. ✅ Verificar: Destinatario = Usuario A
5. ✅ Verificar: Asunto = "Re: [original]"
6. ✅ Verificar: Contenido tiene citación
7. Usuario B: Enviar respuesta
8. Usuario A: ✅ Recibe respuesta con replyTo
```

### **Test 4: Reenviar a Rol**
```bash
1. Usuario A recibe mensaje importante
2. Usuario A: Click "➡️ Reenviar"
3. Tab "Roles/Grupos"
4. Seleccionar "💼 Gerencia"
5. Enviar
6. ✅ Verificar: Todos gerencia reciben reenvío
7. ✅ Verificar: Mensaje tiene isForward = true
8. ✅ Verificar: Contenido incluye "Mensaje reenviado de..."
```

### **Test 5: Prevención de Duplicados en Roles**
```bash
1. Intentar agregar "admin" dos veces
2. ✅ Verificar: Toast warning "Este rol ya está agregado"
3. ✅ Verificar: No se duplica el chip
```

---

## 🔍 Queries de MongoDB

### **Ver mensajes enviados a rol**
```javascript
// Buscar mensajes relacionados con envío por rol
// (no hay campo directo, pero podemos inferir por cantidad)

// Ver envíos masivos del último día
db.internalmessages.aggregate([
    {
        $match: {
            createdAt: { $gte: new Date(Date.now() - 86400000) }
        }
    },
    {
        $group: {
            _id: { from: "$from", subject: "$subject", createdAt: "$createdAt" },
            count: { $sum: 1 }
        }
    },
    {
        $match: { count: { $gte: 5 } } // Probablemente por rol
    },
    { $sort: { count: -1 } }
]);
```

### **Ver cadena de respuestas**
```javascript
// Encontrar todas las respuestas a un mensaje
db.internalmessages.find({
    replyTo: ObjectId("mensaje_original_id")
});

// Encontrar mensaje original + todas las respuestas
const originalId = ObjectId("mensaje_original_id");
db.internalmessages.find({
    $or: [
        { _id: originalId },
        { replyTo: originalId }
    ]
}).sort({ createdAt: 1 });
```

### **Ver mensajes reenviados**
```javascript
// Todos los mensajes reenviados
db.internalmessages.find({
    isForward: true
});

// Mensajes reenviados por usuario específico
db.internalmessages.find({
    forwardedFrom: ObjectId("user_id"),
    isForward: true
});
```

### **Estadísticas de roles más contactados**
```javascript
// Top roles que reciben más mensajes masivos
db.users.aggregate([
    {
        $lookup: {
            from: "internalmessages",
            localField: "_id",
            foreignField: "to",
            as: "messages"
        }
    },
    {
        $group: {
            _id: "$role",
            messageCount: { $sum: { $size: "$messages" } }
        }
    },
    { $sort: { messageCount: -1 } }
]);
```

---

## 📈 Métricas y Logs

### **Logs Backend**

**Envío por roles:**
```bash
grep "📨 Enviando mensaje a roles" backend/logs/app-*.log
# Salida:
# 📨 Enviando mensaje a roles: auditor, supervisor
# ✅ Encontrados 12 usuarios para roles: auditor, supervisor
```

**Validación de destinatarios:**
```bash
grep "⚠️ Algunos destinatarios no encontrados" backend/logs/app-*.log
```

**Cantidad de mensajes enviados:**
```bash
grep "📨 Mensaje enviado de.*a.*destinatario" backend/logs/app-*.log
# Salida:
# 📨 Mensaje enviado de Admin a 15 destinatario(s)
```

---

## 🎯 Casos de Uso

### **1. Anuncio General a Todo el Equipo**
```
Admin → Roles: [admin, gerencia, supervisor, auditor, asesor, revendedor]
"🎉 Feliz año nuevo a todo el equipo!"
Resultado: ~50-100 usuarios reciben el mensaje
```

### **2. Comunicación Jerárquica**
```
Gerencia → Roles: [supervisor]
"Recordatorio: reportes mensuales vencen mañana"
Resultado: Todos los supervisores reciben
```

### **3. Coordinación de Auditorías**
```
Supervisor → Roles: [auditor]
"Urgente: auditoría adicional hoy a las 15:00"
Resultado: Todos los auditores disponibles
```

### **4. Cadena de Respuestas**
```
1. Admin envía consulta a Gerencia
2. Gerencia responde (replyTo)
3. Admin responde nuevamente (replyTo al mensaje de gerencia)
Resultado: Conversación trazable
```

### **5. Reenvío Selectivo**
```
1. Auditor recibe procedimiento de Admin
2. Auditor reenvía a Roles: [asesor]
3. Todos los asesores reciben el procedimiento
Resultado: Información distribuida eficientemente
```

---

## ⚙️ Configuración

### **Roles Soportados**

Para agregar nuevos roles, modificar en:

**Frontend:**
```javascript
// frontend/src/pages/InternalMessages.jsx
const availableRoles = [
    { value: "nuevo_rol", label: "Nuevo Rol", icon: "🆕" },
    // ...
];
```

**Backend:**
No requiere cambios, funciona con cualquier rol en User.role

---

## 🔒 Seguridad

### **Validaciones Backend**
- ✅ Solo usuarios autenticados
- ✅ Solo usuarios activos reciben mensajes
- ✅ Remitente se excluye automáticamente en envío por roles
- ✅ Validación de existencia de roles
- ✅ Validación de existencia de usuarios

### **Prevención de Spam**
```javascript
// Futura mejora: rate limiting
// Limitar envíos masivos por usuario
// Ejemplo: máximo 5 envíos masivos por hora
```

---

## 📊 Performance

### **Optimizaciones**

**1. Query de usuarios por rol:**
```javascript
// Optimizado con índice en User.role
await User.find({
    role: { $in: roles },
    active: true
}).select("_id nombre email role");
```

**2. Creación de mensajes:**
```javascript
// Aunque es secuencial, permite:
// - Control de errores por mensaje
// - Emisión inmediata de Socket.io
// - Logs detallados
```

**Métricas esperadas:**
- Envío a 10 usuarios: ~500ms
- Envío a 50 usuarios: ~2-3s
- Envío a 100 usuarios: ~5s

---

## 🆕 Mejoras Futuras

### **Fase 3:**
- [ ] Responder a todos (reply-all si hay múltiples destinatarios)
- [ ] Historial de conversación (thread view)
- [ ] Reenvío con adjuntos originales
- [ ] Plantillas por rol
- [ ] Envío programado por rol
- [ ] Confirmación de lectura masiva
- [ ] Estadísticas de engagement por rol

### **Fase 4:**
- [ ] Grupos personalizados (guardar combinaciones de roles)
- [ ] Exclusiones (enviar a rol excepto usuarios específicos)
- [ ] Prioridad de mensajes
- [ ] Mensajes destacados para ciertos roles

---

## ✅ Checklist de Implementación

- [x] Backend: Parseo de roles[] en FormData
- [x] Backend: Query de usuarios por roles
- [x] Backend: Exclusión del remitente
- [x] Backend: Campos isForward y forwardedFrom
- [x] Frontend: Estado recipientMode (users/roles)
- [x] Frontend: Array availableRoles con iconos
- [x] Frontend: Funciones addRole/removeRole
- [x] Frontend: Función handleReply
- [x] Frontend: Función handleForward
- [x] Frontend: Tabs de selección (usuarios vs roles)
- [x] Frontend: Grid de roles con chips
- [x] Frontend: Botones Responder/Reenviar en vista
- [x] Frontend: Validación de al menos un destinatario
- [x] Documentación completa

---

## 🚀 Para Usar

### **Envío por Rol:**
```bash
1. Login en la plataforma
2. Click botón 📧 (esquina inferior derecha)
3. Click "✉️ Nuevo Mensaje"
4. Click tab "🏷️ Roles/Grupos"
5. Click en roles deseados (ej: Auditores + Supervisores)
6. Escribir mensaje
7. Click "📤 Enviar"
8. ✅ Ver toast con cantidad de destinatarios
```

### **Responder:**
```bash
1. Abrir mensaje recibido
2. Click "↩️ Responder"
3. Modal se abre con datos prellenados
4. Escribir respuesta
5. Click "📤 Enviar"
```

### **Reenviar:**
```bash
1. Abrir mensaje
2. Click "➡️ Reenviar"
3. Seleccionar nuevos destinatarios (usuarios o roles)
4. Agregar comentario opcional
5. Click "📤 Enviar"
```

---

## 📚 Documentación Relacionada

- **`SISTEMA_MENSAJERIA_INTERNA.md`** - Sistema base
- **`MENSAJERIA_GRUPAL.md`** - Envío a múltiples usuarios
- **`NOTIFICACIONES_AUDITORIAS.md`** - Notificaciones automáticas

---

**Estado:** ✅ **Sistema completamente implementado y funcional**

**Última actualización:** 3 de Noviembre, 2025  
**Desarrollado para:** Dann Salud Broadcaster Platform
