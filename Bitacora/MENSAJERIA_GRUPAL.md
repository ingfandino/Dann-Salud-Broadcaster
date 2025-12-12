# 👥 Mensajería Grupal - Actualización

**Fecha:** 3 de Noviembre, 2025  
**Estado:** ✅ Implementado y funcional

---

## 🎯 Objetivo

Permitir el envío del mismo mensaje a múltiples usuarios simultáneamente, facilitando la comunicación grupal dentro de la plataforma.

---

## ✨ Nuevas Funcionalidades

### **1. Selección Múltiple de Destinatarios** ✅
- ✅ Búsqueda y selección de múltiples usuarios
- ✅ Vista de chips/badges con destinatarios seleccionados
- ✅ Eliminación individual de destinatarios antes de enviar
- ✅ Prevención de duplicados

### **2. Envío Grupal** ✅
- ✅ Crear mensaje individual para cada destinatario
- ✅ Mismo contenido y adjuntos para todos
- ✅ Notificación en tiempo real a todos los destinatarios
- ✅ Confirmación con cantidad de mensajes enviados

---

## 🏗️ Arquitectura

### **Backend**

**Controlador:** `backend/src/controllers/internalMessageController.js`

```javascript
// Función sendMessage ahora soporta array de destinatarios
exports.sendMessage = async (req, res) => {
    // Parsear 'to' como array (FormData envía 'to[]')
    const recipients = Array.isArray(to) ? to : [to];
    
    // Validar todos los destinatarios
    const validRecipients = await User.find({
        _id: { $in: recipients },
        active: true
    });
    
    // Crear un mensaje para cada destinatario
    for (const recipient of validRecipients) {
        const newMessage = new InternalMessage({
            from: fromUserId,
            to: recipient._id,
            subject,
            content,
            attachments
        });
        await newMessage.save();
        
        // Notificación en tiempo real
        io.to(`user_${recipient._id}`).emit("new_message", {...});
    }
    
    // Respuesta con cantidad enviada
    res.json({
        success: true,
        sentCount: validRecipients.length,
        recipients: [...]
    });
}
```

**Características Backend:**
- ✅ Compatibilidad hacia atrás (soporta envío simple)
- ✅ Validación de destinatarios (solo usuarios activos)
- ✅ Warning si algunos destinatarios no se encuentran
- ✅ Mismos adjuntos para todos los destinatarios
- ✅ Notificación Socket.io individual por destinatario

---

### **Frontend**

**Componente:** `frontend/src/pages/InternalMessages.jsx`

**Estado del Formulario:**
```javascript
const [composeForm, setComposeForm] = useState({
    to: [],           // Array de IDs de destinatarios
    subject: "",
    content: "",
    attachments: []
});

const [selectedRecipients, setSelectedRecipients] = useState([]); 
// Array de objetos {_id, nombre, email} para mostrar chips
```

**Funciones Clave:**
```javascript
// Agregar destinatario sin duplicados
const addRecipient = (recipient) => {
    if (composeForm.to.includes(recipient._id)) {
        toast.warning("Este destinatario ya está agregado");
        return;
    }
    setComposeForm(prev => ({
        ...prev,
        to: [...prev.to, recipient._id]
    }));
    setSelectedRecipients(prev => [...prev, recipient]);
};

// Eliminar destinatario
const removeRecipient = (recipientId) => {
    setComposeForm(prev => ({
        ...prev,
        to: prev.to.filter(id => id !== recipientId)
    }));
    setSelectedRecipients(prev => prev.filter(r => r._id !== recipientId));
};

// Enviar con validación
const handleSendMessage = async (e) => {
    if (composeForm.to.length === 0 || !composeForm.content) {
        toast.error("Selecciona al menos un destinatario y escribe un mensaje");
        return;
    }
    
    // FormData con array
    composeForm.to.forEach(recipientId => {
        formData.append("to[]", recipientId);
    });
    
    const res = await apiClient.post("/internal-messages", formData);
    toast.success(`✅ Mensaje enviado a ${res.data.sentCount} destinatario(s)`);
};
```

---

## 🎨 Interfaz de Usuario

### **Compositor de Mensajes - Vista Mejorada**

```
┌────────────────────────────────────────────┐
│  ✉️ Nuevo Mensaje                     [×]  │
├────────────────────────────────────────────┤
│  Para: (puedes seleccionar múltiples)      │
│                                             │
│  [Juan Pérez ×] [María López ×] [Ana G ×] │ ← Chips de destinatarios
│                                             │
│  [Buscar y agregar usuarios...]            │
│  ↓ Pedro González - pedro@dann.com         │
│  ↓ Carlos Ruiz - carlos@dann.com     ✓     │ ← Ya agregado
│                                             │
│  Asunto: [Reporte mensual]                 │
│                                             │
│  Mensaje:                                  │
│  ┌──────────────────────────────────────┐  │
│  │ Hola equipo, les comparto...         │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [📎 Adjuntar archivos]                    │
│  • reporte.xlsx                        [×] │
│                                             │
│              [Cancelar]  [📤 Enviar a 3]   │ ← Muestra cantidad
└────────────────────────────────────────────┘
```

**Elementos Visuales:**
1. **Chips de Destinatarios:** Fondo azul claro, con botón × para eliminar
2. **Lista de Búsqueda:** Muestra checkmark verde si ya está agregado
3. **Botón Enviar:** Muestra cantidad de destinatarios seleccionados
4. **Toast de Confirmación:** "✅ Mensaje enviado a 3 destinatario(s)"

---

## 🔄 Flujo de Uso

### **Escenario 1: Envío a Múltiples Usuarios**

```bash
1. Usuario Admin: Click "✉️ Nuevo Mensaje"
2. Buscar "Juan"
3. Click en "Juan Pérez" → Aparece chip azul
4. Buscar "María"
5. Click en "María López" → Aparece otro chip
6. Buscar "Ana"
7. Click en "Ana González" → Tercer chip
8. Escribir asunto: "Reunión Semanal"
9. Escribir mensaje: "Confirmación de reunión..."
10. Click "📤 Enviar"
11. Toast: "✅ Mensaje enviado a 3 destinatario(s)"
12. Cada destinatario recibe:
    - Notificación en tiempo real (Socket.io)
    - Badge +1 en botón de mensajería
    - Mensaje en su bandeja de entrada
```

### **Escenario 2: Eliminar Destinatario Antes de Enviar**

```bash
1. Agregar 4 destinatarios
2. Ver chips: [Juan ×] [María ×] [Ana ×] [Pedro ×]
3. Click en × del chip "Pedro"
4. Chip de Pedro desaparece
5. Enviar → Solo 3 destinatarios reciben mensaje
```

### **Escenario 3: Prevención de Duplicados**

```bash
1. Buscar y agregar "Juan Pérez"
2. Buscar nuevamente "Juan"
3. Click en "Juan Pérez" (ya agregado)
4. Toast warning: "Este destinatario ya está agregado"
5. No se duplica el chip
```

---

## 📊 Base de Datos

### **Modelo de Mensajes**

Cada mensaje se crea **individualmente** por destinatario:

```javascript
// Si envías a 3 destinatarios, se crean 3 documentos:

// Mensaje 1
{
    _id: "msg_001",
    from: "user_admin",
    to: "user_juan",       // Primer destinatario
    subject: "Reunión Semanal",
    content: "Confirmación de reunión...",
    attachments: [...],
    read: false,
    createdAt: "2025-11-03T10:30:00Z"
}

// Mensaje 2
{
    _id: "msg_002",
    from: "user_admin",
    to: "user_maria",      // Segundo destinatario
    subject: "Reunión Semanal",
    content: "Confirmación de reunión...",
    attachments: [...],    // Mismos adjuntos
    read: false,
    createdAt: "2025-11-03T10:30:01Z"
}

// Mensaje 3
{
    _id: "msg_003",
    from: "user_admin",
    to: "user_ana",        // Tercer destinatario
    subject: "Reunión Semanal",
    content: "Confirmación de reunión...",
    attachments: [...],    // Mismos adjuntos
    read: false,
    createdAt: "2025-11-03T10:30:02Z"
}
```

**Ventajas de este diseño:**
- ✅ Cada usuario tiene su propia copia del mensaje
- ✅ Estado de lectura independiente por usuario
- ✅ Eliminación independiente (soft delete por usuario)
- ✅ Destacados independientes
- ✅ Queries simples y rápidas

---

## 🧪 Pruebas

### **Test 1: Envío Grupal Básico**
```bash
1. Login como Admin
2. Crear mensaje nuevo
3. Seleccionar 3 usuarios: Juan, María, Ana
4. Verificar chips aparecen correctamente
5. Escribir mensaje y enviar
6. ✅ Verificar: Toast "Mensaje enviado a 3 destinatario(s)"
7. Login como Juan → ✅ Ver mensaje en inbox
8. Login como María → ✅ Ver mensaje en inbox
9. Login como Ana → ✅ Ver mensaje en inbox
```

### **Test 2: Archivos Adjuntos Grupales**
```bash
1. Seleccionar 2 usuarios
2. Adjuntar archivo PDF
3. Enviar mensaje
4. Login como Usuario 1 → ✅ Descargar PDF correctamente
5. Login como Usuario 2 → ✅ Descargar mismo PDF
```

### **Test 3: Eliminación Independiente**
```bash
1. Enviar mensaje a 2 usuarios
2. Login como Usuario 1 → Eliminar mensaje
3. Usuario 1: ✅ Mensaje no aparece en inbox
4. Login como Usuario 2 → ✅ Mensaje sigue visible
```

### **Test 4: Estados Independientes**
```bash
1. Enviar mensaje a 3 usuarios
2. Login como Usuario 1 → Marcar como leído
3. Login como Usuario 2 → ✅ Mensaje sigue sin leer
4. Login como Usuario 3 → ✅ Mensaje sigue sin leer
```

### **Test 5: Notificaciones en Tiempo Real**
```bash
1. Tener 3 usuarios con sesión activa
2. Enviar mensaje grupal a los 3
3. ✅ Verificar: Los 3 badges se incrementan inmediatamente
4. ✅ Verificar: Cada usuario recibe notificación Socket.io
```

---

## 🔒 Seguridad

### **Validaciones Backend**
- ✅ Solo usuarios autenticados pueden enviar mensajes
- ✅ Validación de destinatarios (deben existir y estar activos)
- ✅ Límite de archivos adjuntos (5 archivos, 10MB cada uno)
- ✅ Sanitización de IDs de destinatarios

### **Validaciones Frontend**
- ✅ Mínimo 1 destinatario requerido
- ✅ Contenido de mensaje requerido
- ✅ Prevención de duplicados en selección
- ✅ Validación de tipos de archivos permitidos

---

## 📈 Performance

### **Optimizaciones Implementadas**

**1. Creación de Mensajes en Lote**
```javascript
// Aunque se crean múltiples documentos,
// el proceso está optimizado con async/await secuencial
// para mantener control de errores
for (const recipient of validRecipients) {
    await newMessage.save();
    // Emitir notificación inmediatamente después de guardar
}
```

**2. Validación de Destinatarios**
```javascript
// Una sola query para validar todos los destinatarios
const validRecipients = await User.find({
    _id: { $in: recipients },
    active: true
}).select("_id nombre email");
```

**3. Notificaciones Socket.io**
```javascript
// Emit individual por destinatario (targeting preciso)
io.to(`user_${recipient._id}`).emit("new_message", {...});
```

**Métricas Esperadas:**
- Envío a 10 usuarios: ~500ms
- Envío a 50 usuarios: ~2s
- Envío a 100 usuarios: ~4s

---

## 🆕 Compatibilidad

### **Envío Simple (Anterior)**
```javascript
// ✅ SIGUE FUNCIONANDO
formData.append("to", "userId123");  // String simple
```

### **Envío Grupal (Nuevo)**
```javascript
// ✅ NUEVO SOPORTE
formData.append("to[]", "userId123");
formData.append("to[]", "userId456");
formData.append("to[]", "userId789");
```

**Backend detecta automáticamente:**
- Si `to` es string → Crea array de 1 elemento
- Si `to[]` existe → Lo usa como array
- Compatibilidad total hacia atrás

---

## 📝 Cambios en el Código

### **Backend**
- ✅ `backend/src/controllers/internalMessageController.js`
  - Modificada función `sendMessage()`
  - Soporte para múltiples destinatarios
  - Parser de FormData arrays

### **Frontend**
- ✅ `frontend/src/pages/InternalMessages.jsx`
  - Estado `composeForm.to` cambiado de string a array
  - Nuevo estado `selectedRecipients` para chips
  - Funciones `addRecipient()` y `removeRecipient()`
  - UI actualizada con chips y contador

---

## 🎯 Casos de Uso

### **1. Comunicación de Equipo**
```
Supervisor → Todos los asesores de su equipo
"Recordatorio: reunión de equipo mañana a las 10am"
```

### **2. Anuncios Generales**
```
Admin → Todos los usuarios activos
"Mantenimiento programado este domingo"
```

### **3. Grupos de Trabajo**
```
Gerencia → Auditores + Supervisores
"Nueva política de auditorías efectiva desde hoy"
```

### **4. Notificaciones Masivas**
```
Sistema → Usuarios con rol "revendedor"
"Nuevas auditorías disponibles para recuperación"
```

---

## 🔮 Futuras Mejoras (Roadmap)

### **Fase 2:**
- [ ] Grupos predefinidos (guardar listas de destinatarios)
- [ ] Envío por rol ("Enviar a todos los auditores")
- [ ] Envío por equipo ("Enviar a equipo #5")
- [ ] Historial de grupos recientes

### **Fase 3:**
- [ ] Responder a todos (reply-all)
- [ ] Reenvío de mensajes grupales
- [ ] Límite de destinatarios por mensaje (ej: máx 50)
- [ ] Vista de quién leyó el mensaje

---

## 📊 Métricas de Adopción

```bash
# Ver mensajes grupales enviados
db.internalmessages.aggregate([
    {
        $group: {
            _id: { from: "$from", subject: "$subject", createdAt: "$createdAt" },
            count: { $sum: 1 }
        }
    },
    { $match: { count: { $gt: 1 } } },  // Más de 1 destinatario
    { $sort: { count: -1 } },
    { $limit: 10 }
])

# Usuario más activo en envíos grupales
db.internalmessages.aggregate([
    {
        $group: {
            _id: "$from",
            totalRecipients: { $sum: 1 }
        }
    },
    { $sort: { totalRecipients: -1 } },
    { $limit: 5 }
])
```

---

## ✅ Checklist de Implementación

- [x] Backend: Parser de arrays en FormData
- [x] Backend: Validación de múltiples destinatarios
- [x] Backend: Creación de mensajes individuales
- [x] Backend: Notificaciones Socket.io por destinatario
- [x] Frontend: Estado composeForm.to como array
- [x] Frontend: Estado selectedRecipients para chips
- [x] Frontend: Función addRecipient()
- [x] Frontend: Función removeRecipient()
- [x] Frontend: UI con chips visuales
- [x] Frontend: Prevención de duplicados
- [x] Frontend: Toast con cantidad de enviados
- [x] Compatibilidad hacia atrás
- [x] Pruebas de envío grupal
- [x] Documentación completa

---

## 🚀 Para Usar

**Activar el sistema:**
```bash
# Reiniciar backend (si estaba corriendo)
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
pkill -f "node.*server.js"
npm start

# Frontend (si es necesario)
cd ../frontend
npm start
```

**Probar la funcionalidad:**
1. Login en la plataforma
2. Click en botón flotante 📧
3. Click "✉️ Nuevo Mensaje"
4. Buscar y seleccionar múltiples usuarios
5. Escribir mensaje y enviar
6. ✅ Verificar toast con cantidad de destinatarios

---

## 📚 Documentación Relacionada

- `SISTEMA_MENSAJERIA_INTERNA.md` - Sistema base de mensajería
- `NOTIFICACIONES_AUDITORIAS.md` - Notificaciones automáticas

---

**Estado:** ✅ **Mensajería grupal implementada y funcional**

**Última actualización:** 3 de Noviembre, 2025  
**Desarrollado para:** Dann Salud Broadcaster Platform
