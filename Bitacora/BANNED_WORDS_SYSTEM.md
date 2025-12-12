# 🚨 Sistema de Detección de Palabras Prohibidas

## 📋 Descripción General

Sistema completo para detectar, alertar y gestionar palabras prohibidas en campañas de mensajería masiva.

---

## ✨ Características

### 1. **Gestión de Blacklist** (Solo Gerencia)
- ➕ Agregar palabras prohibidas
- 🗑️ Eliminar palabras
- 🏷️ Categorizar (Ofensiva, Legal, Competencia, Otra)
- ⚡ Niveles de severidad (Baja, Media, Alta, Crítica)
- 📝 Notas y contexto

### 2. **Detección Automática**
- 🔍 Escaneo en tiempo real al crear campañas
- 🎯 Detección case-insensitive
- 📊 Registro completo de detecciones
- 💾 Almacenamiento de contexto

### 3. **Sistema de Notificaciones**
- 📢 **Gerencia**: Recibe TODAS las alertas
- 👤 **Supervisores**: Solo alertas de sus asesores (mismo numeroEquipo)
- 📧 Notificaciones internas automáticas
- ⚡ Alertas en tiempo real vía Socket.IO

### 4. **Historial y Auditoría**
- 📊 Dashboard con estadísticas
- 📋 Historial completo de detecciones
- ✅ Marcar como resuelto
- 📈 Top palabras y usuarios

---

## 🎯 Flujo de Funcionamiento

### **Cuando un usuario crea una campaña:**

```
1. Usuario crea campaña de mensajería masiva
   ↓
2. Sistema detecta palabras prohibidas en el mensaje
   ↓
3. Si detecta:
   ├─ Registra detección en BD
   ├─ Notifica a TODOS los usuarios de Gerencia
   └─ Si el usuario es Asesor:
       └─ Notifica también a su Supervisor (mismo numeroEquipo)
   ↓
4. La campaña continúa (o se puede configurar para bloquear)
```

---

## 🔐 Permisos y Roles

| Rol       | Ver Lista | Agregar | Eliminar | Ver Detecciones | Recibir Alertas |
|-----------|-----------|---------|----------|-----------------|-----------------|
| Gerencia  | ✅        | ✅      | ✅       | ✅              | ✅              |
| Supervisor| ✅        | ❌      | ❌       | ❌              | ✅ (sus asesores)|
| Asesor    | ✅        | ❌      | ❌       | ❌              | ❌              |
| Otros     | ❌        | ❌      | ❌       | ❌              | ❌              |

---

## 🚀 Uso del Sistema

### **Para Gerencia:**

#### 1. **Acceder al Sistema**
```
Dashboard → 🛡️ Palabras Prohibidas
```

#### 2. **Agregar Palabra**
1. Click en pestaña **"➕ Agregar Palabra"**
2. Ingresar:
   - Palabra prohibida
   - Categoría (Ofensiva, Legal, Competencia, Otra)
   - Severidad (Baja, Media, Alta, Crítica)
   - Notas (opcional)
3. Click **"Agregar"**

#### 3. **Ver Detecciones**
1. Click en pestaña **"🚨 Detecciones"**
2. Ver lista de alertas con:
   - Palabra detectada
   - Usuario que la usó
   - Campaña
   - Fecha y hora
   - Contexto del mensaje
3. Marcar como **✅ Resuelto** cuando sea necesario

#### 4. **Gestionar Lista**
- 🔍 Buscar palabras
- 🏷️ Filtrar por categoría
- ✅/❌ Filtrar por estado (Activas/Inactivas)
- 🗑️ Eliminar palabras

---

## 📊 Dashboard de Estadísticas

El sistema muestra:
- 📋 **Total de palabras** en la blacklist
- ✅ **Palabras activas**
- 🚨 **Total de detecciones**
- ⚠️ **Detecciones sin resolver**
- 📈 **Top 10 palabras más detectadas**
- 👤 **Top 10 usuarios con más detecciones**

---

## 🔔 Notificaciones

### **Cuando se detecta una palabra prohibida:**

**Gerencia recibe:**
```
🚨 ALERTA: Palabra Prohibida Detectada

Palabra: [palabra]
Usuario: [nombre] ([email])
Rol: [rol]
Equipo/Grupo: [numeroEquipo]
Campaña: [nombre de campaña]
Fecha: [fecha y hora]

Contexto:
"[fragmento del mensaje]..."
```

**Supervisor recibe (si el usuario es Asesor de su equipo):**
```
[Misma notificación]
```

Las notificaciones aparecen:
1. ✉️ En **Mensajes Internos**
2. 🔔 Como **notificación en tiempo real** (Socket.IO)

---

## 🛠️ API Endpoints

### **Gestión de Palabras**

```bash
# Listar palabras
GET /api/banned-words
Query params: ?active=true&category=ofensiva&search=palabra

# Agregar palabra (Solo Gerencia)
POST /api/banned-words
Body: {
  "word": "ejemplo",
  "category": "ofensiva",
  "severity": "alta",
  "notes": "Motivo..."
}

# Actualizar palabra (Solo Gerencia)
PUT /api/banned-words/:id
Body: { "severity": "crítica", "active": false }

# Eliminar palabra (Solo Gerencia)
DELETE /api/banned-words/:id

# Estadísticas
GET /api/banned-words/stats
Query params: ?startDate=2025-01-01&endDate=2025-12-31
```

### **Historial de Detecciones**

```bash
# Listar detecciones (Solo Gerencia)
GET /api/banned-words/detections
Query params: ?userId=xxx&resolved=false&word=ejemplo

# Marcar como resuelta (Solo Gerencia)
PUT /api/banned-words/detections/:id/resolve
Body: { "notes": "Resuelto" }
```

---

## 🔧 Configuración Avanzada

### **Bloquear Envío si se Detecta Palabra**

Para cambiar el comportamiento de alertar a **bloquear**:

En `/backend/src/controllers/sendJobController.js` línea ~108:

```javascript
// ACTUAL: Solo alerta (campaña continúa)
logger.info(`✅ Notificaciones enviadas. Campaña continúa.`);

// CAMBIAR A: Bloquear campaña
return res.status(400).json({ 
    error: "Campaña bloqueada: contiene palabras prohibidas",
    detectedWords: detectedWords.map(w => w.word)
});
```

### **Personalizar Niveles de Severidad**

En `/backend/src/models/BannedWord.js`:

```javascript
severity: {
    type: String,
    enum: ["baja", "media", "alta", "crítica", "bloqueante"],
    //      👆 Agregar nuevos niveles aquí
    default: "media"
}
```

---

## 📝 Ejemplos de Uso

### **Palabras Comunes a Agregar**

**Categoría: Ofensiva**
- insultos, groserías, lenguaje inapropiado

**Categoría: Legal**
- garantía, demanda, ilegal, prohibido

**Categoría: Competencia**
- nombres de empresas competidoras
- marcas registradas

**Categoría: Otra**
- palabras sensibles específicas del negocio

---

## 🐛 Troubleshooting

### **Las detecciones no llegan como notificación**

1. Verificar que el Socket.IO esté conectado:
   ```javascript
   // En consola del navegador
   console.log("Socket conectado:", socket.connected);
   ```

2. Verificar logs del backend:
   ```bash
   # Buscar en logs
   grep "Notificación de palabra prohibida enviada" backend/logs/*.log
   ```

### **Palabras no se detectan**

1. Verificar que estén **activas** (`active: true`)
2. La detección es **case-insensitive** pero busca **palabras completas**
3. Ejemplo:
   - ✅ "malo" detecta: "Esto es malo"
   - ❌ "malo" NO detecta: "maldito" (no es palabra completa)

### **Notificaciones no llegan a Supervisor**

1. Verificar que el Supervisor tenga el **mismo `numeroEquipo`** que el Asesor
2. Verificar que el Supervisor esté **activo** (`active: true`)
3. Verificar en logs del backend las notificaciones enviadas

---

## 📚 Modelos de Base de Datos

### **BannedWord**
```javascript
{
  word: String,          // Palabra prohibida (lowercase)
  category: String,      // Categoría
  severity: String,      // Nivel de severidad
  addedBy: ObjectId,     // Usuario que la agregó
  active: Boolean,       // Estado
  notes: String,         // Notas
  createdAt: Date,
  updatedAt: Date
}
```

### **BannedWordDetection**
```javascript
{
  word: String,              // Palabra detectada
  wordId: ObjectId,          // Referencia a BannedWord
  detectedIn: String,        // Contexto (bulk_message, campaign, template)
  userId: ObjectId,          // Usuario que la usó
  campaignName: String,      // Nombre de la campaña
  messageContent: String,    // Fragmento del mensaje
  fullContext: String,       // Mensaje completo
  notifiedUsers: [{         // Usuarios notificados
    userId: ObjectId,
    notifiedAt: Date,
    role: String
  }],
  resolved: Boolean,         // Si fue resuelta
  resolvedBy: ObjectId,      // Quien la resolvió
  resolvedAt: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎓 Mejores Prácticas

1. **Revisar detecciones regularmente** (al menos 1 vez por semana)
2. **Marcar como resueltas** las alertas después de investigar
3. **Mantener la lista actualizada**: agregar nuevas palabras según necesidad
4. **Usar categorías apropiadas** para mejor organización
5. **Documentar el motivo** en las notas al agregar palabras
6. **Capacitar al equipo** sobre palabras a evitar

---

## 📞 Soporte

Para problemas o sugerencias, contactar a:
- 👨‍💻 **Equipo de Desarrollo**
- 📧 **Email**: soporte@dannsalud.com
- 🐛 **Issues**: GitHub Repository

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0
