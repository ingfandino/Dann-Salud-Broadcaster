# 📧 Sistema de Mensajería Interna

**Fecha:** 1 de Noviembre, 2025  
**Estado:** ✅ Implementado y funcional

---

## 🎯 Objetivo

Proporcionar un sistema de comunicación interno entre usuarios de la plataforma, permitiendo enviar mensajes y compartir archivos adjuntos de forma segura y eficiente.

---

## ✨ Características Principales

### **1. Mensajería Completa**
- ✅ Envío de mensajes entre usuarios internos
- ✅ **Envío a múltiples destinatarios simultáneamente (grupal)** 🆕
- ✅ **Envío por roles/grupos (admin, gerencia, auditor, etc.)** 🆕
- ✅ **Responder mensajes (Reply)** 🆕
- ✅ **Reenviar mensajes (Forward)** 🆕
- ✅ Asunto y contenido personalizable
- ✅ Búsqueda de destinatarios
- ✅ Selección múltiple con chips visuales

### **2. Archivos Adjuntos**
- ✅ Soporte múltiples archivos (hasta 5 por mensaje)
- ✅ Límite: 10MB por archivo
- ✅ Tipos permitidos:
  - Imágenes: JPEG, PNG, GIF, WebP
  - Documentos: PDF, Word (DOC/DOCX), Excel (XLS/XLSX)
  - Datos: CSV, TXT
  - Comprimidos: ZIP

### **3. Organización**
- ✅ Bandeja de entrada (Recibidos)
- ✅ Mensajes enviados
- ✅ Mensajes destacados (★)
- ✅ Marcar como leído/no leído
- ✅ Eliminación (soft delete)

### **4. Notificaciones en Tiempo Real**
- ✅ Badge con contador de mensajes no leídos
- ✅ Actualización automática vía Socket.io
- ✅ Notificación cuando llega nuevo mensaje
- ✅ Notificación cuando mensaje es leído

### **5. Accesibilidad**
- ✅ Botón flotante en esquina inferior derecha
- ✅ Acceso desde cualquier pantalla de la plataforma
- ✅ Badge rojo con número de no leídos
- ✅ Modal full-screen con diseño tipo Gmail/Outlook

---

## 🏗️ Arquitectura

### **Backend**

#### **Modelo: InternalMessage**
```javascript
{
    from: ObjectId (User),      // Remitente
    to: ObjectId (User),         // Destinatario
    subject: String,             // Asunto
    content: String,             // Contenido del mensaje
    attachments: [{              // Archivos adjuntos
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
        uploadedAt: Date
    }],
    read: Boolean,               // Leído/No leído
    readAt: Date,                // Fecha de lectura
    starred: Boolean,            // Destacado
    archived: Boolean,           // Archivado
    deletedBy: [ObjectId],       // Usuarios que eliminaron
    replyTo: ObjectId,           // Mensaje al que responde
    timestamps: true             // createdAt, updatedAt
}
```

#### **Endpoints API**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/internal-messages/inbox` | Bandeja de entrada |
| `GET` | `/api/internal-messages/sent` | Mensajes enviados |
| `GET` | `/api/internal-messages/starred` | Mensajes destacados |
| `GET` | `/api/internal-messages/unread-count` | Contador de no leídos |
| `GET` | `/api/internal-messages/recipients` | Buscar destinatarios |
| `GET` | `/api/internal-messages/:id` | Obtener mensaje por ID |
| `POST` | `/api/internal-messages` | Enviar nuevo mensaje |
| `DELETE` | `/api/internal-messages/:id` | Eliminar mensaje |
| `PATCH` | `/api/internal-messages/:id/starred` | Marcar/desmarcar destacado |
| `PATCH` | `/api/internal-messages/:id/read` | Marcar como leído/no leído |
| `GET` | `/api/internal-messages/:messageId/attachments/:attachmentId` | Descargar adjunto |

#### **Archivos Backend**
- `backend/src/models/InternalMessage.js` - Modelo de datos
- `backend/src/controllers/internalMessageController.js` - Controladores
- `backend/src/routes/internalMessageRoutes.js` - Rutas y middleware de upload
- `backend/uploads/internal-messages/` - Almacenamiento de adjuntos

---

### **Frontend**

#### **Componentes**

**1. InternalMessages.jsx**
- Componente principal modal
- Vista de tres columnas:
  - Sidebar: Inbox / Enviados / Destacados
  - Lista: Mensajes del folder activo
  - Contenido: Detalle del mensaje seleccionado
- Compositor de mensajes con upload de archivos
- Descarga de adjuntos

**2. InternalMessageButton.jsx**
- Botón flotante en esquina inferior derecha
- Badge con contador de no leídos
- Actualización en tiempo real
- Abre modal de InternalMessages

#### **Ubicación Visual**

```
┌─────────────────────────────────────────┐
│                                         │
│         Contenido de la página          │
│                                         │
│                                         │
│                                 ┌──┐    │
│                                 │⚙│    │ ← Settings (izquierda)
│                             ┌──┐└──┘    │
│                             │📧│        │ ← Mensajería (derecha)
│                             └──┘        │
│                              (99)       │ ← Badge con contador
└─────────────────────────────────────────┘
```

---

## 🎨 Interfaz de Usuario

### **Botón Flotante**
- **Posición:** Inferior derecha (bottom-6 right-6)
- **Icono:** 📧
- **Color:** Azul (bg-blue-600)
- **Badge:** Rojo con número de no leídos
- **Hover:** Escala 1.1x

### **Modal de Mensajes**

```
┌──────────────────────────────────────────────────────┐
│  📧 Mensajería Interna    [✉️ Nuevo Mensaje]    [×]  │
├──────┬──────────────────┬──────────────────────────────┤
│      │                  │                              │
│ 📬   │  Juan Pérez      │  De: María González         │
│Inbox │  ⭐ Reporte      │  Para: Juan Pérez           │
│      │  Adjunto: archivo│  Fecha: 01/11/2025 14:30    │
│ 📤   │  Hace 5 min      │                              │
│Enviá │  ──────────────  │  Hola Juan,                 │
│dos   │  Ana López       │                              │
│      │  Consulta        │  Te envío el reporte que... │
│ ⭐   │  Urgente         │                              │
│Desta │  Hace 1 hora     │  [Contenido completo]       │
│cados │                  │                              │
│      │                  │  📎 Archivos adjuntos:      │
│      │                  │  • reporte.xlsx [📥]        │
└──────┴──────────────────┴──────────────────────────────┘
```

### **Compositor de Mensajes**

```
┌────────────────────────────────────────────┐
│  ✉️ Nuevo Mensaje                     [×]  │
├────────────────────────────────────────────┤
│  Para: [Buscar usuario...]                 │
│        ↓ Juan Pérez - juan@example.com     │
│                                             │
│  Asunto: [Reporte mensual]                 │
│                                             │
│  Mensaje:                                  │
│  ┌──────────────────────────────────────┐  │
│  │ Te envío el reporte...               │  │
│  │                                      │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [📎 Adjuntar archivos]                    │
│  • reporte.xlsx                        [×] │
│  • imagen.png                          [×] │
│                                             │
│              [Cancelar]  [📤 Enviar]       │
└────────────────────────────────────────────┘
```

---

## 🔒 Seguridad

### **Autenticación**
- ✅ Todos los endpoints requieren `requireAuth` middleware
- ✅ Solo usuarios autenticados pueden acceder

### **Autorización**
- ✅ Solo remitente y destinatario pueden ver un mensaje
- ✅ Solo destinatario puede marcar como leído
- ✅ Solo remitente/destinatario pueden eliminar (su copia)

### **Archivos**
- ✅ Validación de tipos de archivo permitidos
- ✅ Límite de tamaño: 10MB por archivo
- ✅ Nombres únicos generados con timestamp
- ✅ Almacenamiento seguro en servidor
- ✅ Descarga solo por usuarios autorizados

### **Soft Delete**
- ✅ Los mensajes no se borran físicamente
- ✅ Se agregan a `deletedBy[]` array
- ✅ Cada usuario ve su propia vista (eliminado/no eliminado)

---

## 📡 Socket.io - Eventos en Tiempo Real

### **Eventos Emitidos**

**1. `new_message`**
```javascript
// Enviado a: to (destinatario)
{
    _id: "message_id",
    from: { nombre, email, role },
    subject: "Asunto",
    content: "Primeros 100 caracteres...",
    createdAt: Date,
    hasAttachments: Boolean
}
```

**2. `message_read`**
```javascript
// Enviado a: from (remitente)
{
    messageId: "message_id",
    readBy: "user_id",
    readAt: Date
}
```

### **Eventos Escuchados (Frontend)**

```javascript
socket.on("new_message", (data) => {
    // Actualizar contador de no leídos
    // Mostrar notificación toast
    // Reproducir sonido (opcional)
});

socket.on("message_read", (data) => {
    // Actualizar estado del mensaje en "Enviados"
    // Mostrar "✓✓" de leído
});
```

---

## 🚀 Uso

### **1. Acceder al Sistema**
- Click en botón flotante 📧 (esquina inferior derecha)
- Modal se abre mostrando bandeja de entrada

### **2. Leer Mensajes**
- Mensajes no leídos aparecen en azul claro
- Click en mensaje para ver contenido completo
- Automáticamente se marca como leído

### **3. Enviar Mensaje**
1. Click en "✉️ Nuevo Mensaje"
2. Buscar destinatario por nombre/email
3. Escribir asunto y mensaje
4. (Opcional) Adjuntar archivos
5. Click en "📤 Enviar"

### **4. Gestionar Mensajes**
- ⭐ Click en estrella para destacar
- 🗑️ Click en papelera para eliminar
- Cambiar entre Inbox/Enviados/Destacados en sidebar

### **5. Descargar Adjuntos**
- Ver sección "📎 Archivos adjuntos" en mensaje
- Click en "📥 Descargar" junto al archivo

---

## 🧪 Pruebas

### **Test 1: Envío Básico**
```bash
1. Usuario A: Enviar mensaje a Usuario B
2. Usuario B: Debe ver notificación en badge
3. Usuario B: Abrir mensajería, ver mensaje en inbox
4. Usuario B: Click en mensaje → Marca como leído
5. Usuario A: Ver "✓✓" en mensajes enviados
```

### **Test 2: Archivos Adjuntos**
```bash
1. Enviar mensaje con 3 archivos (imagen, PDF, Excel)
2. Verificar que se suben correctamente
3. Destinatario descarga cada archivo
4. Verificar que se descargan con nombre correcto
```

### **Test 3: Destacados**
```bash
1. Marcar mensaje como destacado (⭐)
2. Ir a folder "Destacados"
3. Verificar que mensaje aparece
4. Desmarcar mensaje
5. Verificar que desaparece de destacados
```

### **Test 4: Eliminación**
```bash
1. Usuario A elimina mensaje en su bandeja
2. Usuario A: Mensaje desaparece
3. Usuario B: Mensaje sigue visible (solo A lo eliminó)
4. Usuario B elimina mensaje
5. Ambos: Mensaje eliminado de sus vistas
```

---

## 📊 Métricas y Monitoreo

### **Logs Backend**
```bash
# Ver mensajes enviados
grep "📨 Mensaje enviado" backend/logs/app-*.log

# Ver descargas de adjuntos
grep "Descargando adjunto" backend/logs/app-*.log
```

### **Queries MongoDB**
```javascript
// Mensajes no leídos por usuario
db.internalmessages.countDocuments({ to: userId, read: false })

// Mensajes enviados hoy
db.internalmessages.countDocuments({
    createdAt: { $gte: startOfDay }
})

// Usuarios más activos
db.internalmessages.aggregate([
    { $group: { _id: "$from", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
])
```

---

## 🔄 Futuras Mejoras (Roadmap)

### **Fase 2:**
- [ ] Conversaciones agrupadas (hilos)
- [x] **Mensajes grupales (múltiples destinatarios)** ✅ COMPLETADO
- [x] **Envío por rol/equipo** ✅ COMPLETADO
- [x] **Responder mensajes (Reply)** ✅ COMPLETADO
- [x] **Reenviar mensajes (Forward)** ✅ COMPLETADO
- [ ] Grupos predefinidos (guardar listas de destinatarios)
- [ ] Etiquetas/categorías personalizadas
- [ ] Búsqueda avanzada (por contenido, fecha, remitente)
- [ ] Borradores guardados automáticamente

### **Fase 3:**
- [ ] Mensajes programados (enviar después)
- [ ] Plantillas de mensajes frecuentes
- [ ] Firma personalizable
- [ ] Vista previa de imágenes en línea
- [ ] Notificaciones por email (opcional)

### **Fase 4:**
- [ ] Integración con otros servicios internos
- [ ] API pública para automatizaciones
- [ ] Webhooks para eventos
- [ ] Estadísticas de uso por usuario/departamento

---

## 🛠️ Configuración

### **Variables de Entorno**
Ninguna configuración adicional requerida. El sistema usa la configuración existente de:
- `PORT` - Puerto del servidor
- `MONGODB_URI` - Conexión a MongoDB
- `JWT_SECRET` - Autenticación

### **Estructura de Directorios**
```
backend/
  uploads/
    internal-messages/     ← Archivos adjuntos almacenados aquí
      1730476800000-123456789.pdf
      1730476801000-987654321.jpg
      ...
```

---

## 📚 Dependencias

### **Backend (ya instaladas)**
- `express` - Framework web
- `multer` - Upload de archivos
- `mongoose` - MongoDB ORM
- `socket.io` - WebSockets en tiempo real

### **Frontend (ya instaladas)**
- `react` - UI library
- `framer-motion` - Animaciones
- `react-toastify` - Notificaciones
- `axios` - HTTP client

---

## ⚡ Performance

### **Optimizaciones Implementadas**

**1. Índices MongoDB**
```javascript
// Consultas rápidas de inbox
{ to: 1, read: 1, createdAt: -1 }

// Consultas de enviados
{ from: 1, createdAt: -1 }

// Consultas de archivados
{ to: 1, archived: 1, createdAt: -1 }
```

**2. Paginación**
- 20 mensajes por página (configurable)
- Lazy loading de contenido
- Solo se cargan adjuntos al abrir mensaje

**3. Actualización en Tiempo Real**
- Socket.io para notificaciones instantáneas
- Polling cada 30s como fallback
- Cache del contador de no leídos

---

## ✅ Checklist de Implementación

- [x] Modelo de datos (InternalMessage)
- [x] Controladores backend
- [x] Rutas API con autenticación
- [x] Middleware de upload de archivos
- [x] Eventos Socket.io
- [x] Componente de mensajería (modal)
- [x] Botón flotante con badge
- [x] Búsqueda de destinatarios
- [x] Sistema de adjuntos
- [x] Descarga de archivos
- [x] Marcado de leído/destacado
- [x] Eliminación (soft delete)
- [x] Notificaciones en tiempo real
- [x] Documentación completa

---

## 📝 Notas de Desarrollo

**Decisiones de Diseño:**

1. **Soft Delete vs Hard Delete:** Se eligió soft delete para permitir que cada usuario gestione su propia vista sin afectar al otro participante.

2. **Socket.io vs Polling:** Socket.io para actualizaciones inmediatas, con polling cada 30s como fallback para casos donde la conexión WebSocket falle.

3. **Almacenamiento Local vs Cloud:** Archivos almacenados localmente en servidor. Para futuro: considerar migración a S3/Cloud Storage para escalabilidad.

4. **Sin Conversaciones Agrupadas (v1):** Primera versión usa modelo simple de mensajes individuales. Conversaciones agrupadas se agregarán en Fase 2.

5. **Mensajería Grupal (v2):** Se implementó envío a múltiples destinatarios simultáneamente, creando un mensaje individual por destinatario para mantener independencia de estados.

6. **Envío por Roles (v3):** Se agregó soporte para envío por rol/grupo (admin, gerencia, auditor, etc.), permitiendo comunicación masiva eficiente. El remitente se excluye automáticamente para evitar auto-mensajes.

7. **Responder/Reenviar (v3):** Implementación de funcionalidades estándar de email: responder con citación del original y reenviar con indicación del remitente original.

---

## 📚 Documentación Adicional

- **`MENSAJERIA_GRUPAL.md`** - Guía completa de envío a múltiples destinatarios
- **`MENSAJERIA_ROLES_RESPONDER.md`** - Envío por roles/grupos + Responder/Reenviar
- **`NOTIFICACIONES_AUDITORIAS.md`** - Notificaciones automáticas del sistema

---

**Estado:** ✅ **Sistema completamente funcional y listo para producción**

**Última actualización:** 3 de Noviembre, 2025 (v3: Roles + Responder/Reenviar)  
**Desarrollado para:** Dann Salud Broadcaster Platform
