# 📱 Plan: Mensajería Intercalada WhatsApp + SMS (Servicios Gratuitos)

**Fecha:** Noviembre 2025  
**Objetivo:** Implementar sistema de mensajería masiva que intercale automáticamente WhatsApp y SMS usando únicamente servicios gratuitos para maximizar alcance y evitar bloqueos.

---

## 🎯 **Concepto Principal**

Intercalar envíos entre WhatsApp Web (vía Baileys/Whatsapp-web.js) y SMS (vía Twilio Free Tier o alternativas gratuitas) para:

1. ✅ **Evitar bloqueos de WhatsApp** por spam masivo
2. ✅ **Maximizar tasa de entrega** combinando dos canales
3. ✅ **Aprovechar servicios gratuitos** (sin costos adicionales)
4. ✅ **Mantener control total** sobre infraestructura
5. ✅ **Diversificar canales** ante caídas de servicio

---

## 📊 **Estrategia de Intercalado**

### **Patrón de Envío Propuesto**

**Opción 1: Intercalado Secuencial (Más Seguro)**
```
Mensaje 1  → WhatsApp
Mensaje 2  → SMS
Mensaje 3  → WhatsApp
Mensaje 4  → SMS
...
```

**Opción 2: Bloques por Lotes (Más Eficiente)**
```
Lote 1 (10 mensajes) → WhatsApp
Descanso (5 min)
Lote 2 (10 mensajes) → SMS
Descanso (5 min)
Lote 3 (10 mensajes) → WhatsApp
...
```

**Opción 3: Prioridad Inteligente (Más Optimizado)**
```
- Números con WhatsApp activo → WhatsApp
- Números sin WhatsApp → SMS
- Alternar cada N mensajes para evitar patrones detectables
```

---

## 🔧 **Servicios Gratuitos Disponibles**

### **1. WhatsApp (Gratuito)**

#### **Opción A: Baileys (Recomendado)**
- 📦 **Librería:** `@whiskeysockets/baileys`
- ✅ **Ventajas:**
  - Completamente gratuito
  - No requiere API oficial
  - Usa protocolo nativo de WhatsApp
  - Soporte multi-device
  - Más estable que whatsapp-web.js
- ⚠️ **Desventajas:**
  - Riesgo de bloqueo si se abusa
  - Requiere QR para autenticación
  - Mantenimiento de sesión

#### **Opción B: Whatsapp-web.js**
- 📦 **Librería:** `whatsapp-web.js`
- ✅ **Ventajas:**
  - Más popular y documentada
  - Emula WhatsApp Web
  - Gratis ilimitado
- ⚠️ **Desventajas:**
  - Menos estable que Baileys
  - Mayor consumo de recursos (Puppeteer)
  - Requiere navegador headless

---

### **2. SMS (Opciones Gratuitas)**

#### **Opción A: Twilio Free Tier**
- 💰 **Costo:** $15 USD de crédito gratis (trial)
- 📊 **Límite:** ~500-1000 SMS según país
- ✅ **Ventajas:**
  - API robusta y confiable
  - Fácil integración
  - Soporte internacional
- ⚠️ **Limitaciones:**
  - Solo trial gratuito (no renovable)
  - Requiere verificación de números destino en trial

#### **Opción B: Vonage (Nexmo) Free Tier**
- 💰 **Costo:** €2 de crédito gratis
- 📊 **Límite:** ~100-200 SMS
- ✅ **Ventajas:**
  - API simple
  - Buenos documentos
- ⚠️ **Limitaciones:**
  - Crédito limitado
  - Requiere tarjeta de crédito

#### **Opción C: SMS Gateway Propio (Modem GSM)**
- 💰 **Costo:** Hardware inicial (~$50-100 USD)
- 📊 **Límite:** Ilimitado (solo costo de chip/línea)
- ✅ **Ventajas:**
  - **Completamente gratuito** a largo plazo
  - Control total
  - No depende de APIs externas
  - Escalable con múltiples módems
- ⚠️ **Limitaciones:**
  - Requiere hardware físico
  - Configuración técnica
  - Velocidad limitada (1-2 SMS/seg por módem)

**Librería recomendada:** `gammu` o `node-sms`

#### **Opción D: Android como Gateway SMS**
- 💰 **Costo:** Gratis (usa teléfono Android viejo)
- 📦 **App:** SMS Gateway API, Termux + scripts
- ✅ **Ventajas:**
  - 100% gratuito
  - Solo necesitas un Android + chip
  - API HTTP simple
- ⚠️ **Limitaciones:**
  - Requiere teléfono siempre encendido
  - Velocidad moderada

---

## 🏗️ **Arquitectura Propuesta**

### **Modelo de Base de Datos**

**Tabla: `SendJob` (Ya existe - modificar)**
```javascript
{
  name: String,
  contacts: [ObjectId],
  message: String,
  status: String, // pendiente, ejecutando, pausado, descanso, completado
  
  // ✅ NUEVO: Configuración de canales
  channelStrategy: {
    type: String,
    enum: ['whatsapp_only', 'sms_only', 'intercalado_secuencial', 'intercalado_bloques', 'inteligente'],
    default: 'whatsapp_only'
  },
  
  // ✅ NUEVO: Estadísticas por canal
  channelStats: {
    whatsapp: {
      sent: Number,
      failed: Number,
      pending: Number
    },
    sms: {
      sent: Number,
      failed: Number,
      pending: Number
    }
  },
  
  // Configuración existente
  delayMin: Number,
  delayMax: Number,
  batchSize: Number,
  pauseBetweenBatchesMinutes: Number,
  
  // ✅ NUEVO: Control de intercalado
  currentChannel: { type: String, enum: ['whatsapp', 'sms'], default: 'whatsapp' },
  messagesInCurrentChannel: { type: Number, default: 0 },
  switchThreshold: { type: Number, default: 10 }, // Cambiar cada N mensajes
  
  stats: { ... },
  createdBy: ObjectId,
  currentIndex: Number
}
```

**Tabla: `Contact` (Modificar)**
```javascript
{
  telefono: String,
  nombre: String,
  
  // ✅ NUEVO: Información de canales
  hasWhatsApp: { type: Boolean, default: null }, // null = no verificado
  whatsappVerifiedAt: Date,
  smsCapable: { type: Boolean, default: true },
  
  // Historial de envíos
  lastWhatsAppSent: Date,
  lastSMSSent: Date,
  
  // Preferencia (opcional)
  preferredChannel: { type: String, enum: ['whatsapp', 'sms', 'auto'] }
}
```

---

## 🔄 **Flujo de Trabajo**

### **1. Preparación de Campaña**

```javascript
// Frontend: Selección de estrategia
const channelStrategies = [
  { value: 'whatsapp_only', label: 'Solo WhatsApp', icon: '💚' },
  { value: 'sms_only', label: 'Solo SMS', icon: '📱' },
  { value: 'intercalado_secuencial', label: 'WhatsApp + SMS (alternado)', icon: '🔄' },
  { value: 'intercalado_bloques', label: 'WhatsApp + SMS (bloques)', icon: '📦' },
  { value: 'inteligente', label: 'Automático (inteligente)', icon: '🤖' }
];
```

### **2. Ejecución de Envío**

**Pseudocódigo:**
```javascript
async function processSendJob(jobId) {
  const job = await SendJob.findById(jobId);
  const contacts = await Contact.find({ _id: { $in: job.contacts } });
  
  for (let i = job.currentIndex; i < contacts.length; i++) {
    const contact = contacts[i];
    
    // Determinar canal según estrategia
    let channel = determineChannel(job, contact);
    
    // Verificar si necesita cambiar de canal
    if (shouldSwitchChannel(job)) {
      channel = switchChannel(job.currentChannel);
      await updateJobChannel(job._id, channel);
    }
    
    // Enviar por el canal seleccionado
    if (channel === 'whatsapp') {
      await sendWhatsApp(contact, job.message);
    } else {
      await sendSMS(contact, job.message);
    }
    
    // Actualizar estadísticas
    await updateChannelStats(job._id, channel, 'sent');
    
    // Delay aleatorio
    await sleep(randomDelay(job.delayMin, job.delayMax));
    
    // Verificar si es momento de descanso entre lotes
    if ((i + 1) % job.batchSize === 0) {
      await updateJobStatus(job._id, 'descanso');
      await sleep(job.pauseBetweenBatchesMinutes * 60 * 1000);
      await updateJobStatus(job._id, 'ejecutando');
    }
    
    // Guardar progreso
    await updateJobProgress(job._id, i + 1);
  }
  
  await updateJobStatus(job._id, 'completado');
}
```

---

## 🎨 **Interfaz de Usuario**

### **Nuevos Componentes**

**1. Selector de Estrategia de Canal**
```jsx
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    📡 Estrategia de Envío
  </label>
  <select 
    value={channelStrategy} 
    onChange={e => setChannelStrategy(e.target.value)}
    className="w-full border rounded px-3 py-2"
  >
    <option value="whatsapp_only">💚 Solo WhatsApp (gratis)</option>
    <option value="sms_only">📱 Solo SMS (trial gratuito)</option>
    <option value="intercalado_secuencial">🔄 Alternado 1:1 (recomendado)</option>
    <option value="intercalado_bloques">📦 Bloques de 10 (eficiente)</option>
    <option value="inteligente">🤖 Automático (detecta WhatsApp)</option>
  </select>
</div>
```

**2. Monitor de Canales en Tiempo Real**
```jsx
<div className="grid grid-cols-2 gap-4 mt-4">
  {/* WhatsApp Stats */}
  <div className="border rounded p-4 bg-green-50">
    <h4 className="font-semibold text-green-800 mb-2">💚 WhatsApp</h4>
    <div className="space-y-1 text-sm">
      <div>Enviados: {job.channelStats.whatsapp.sent}</div>
      <div>Fallidos: {job.channelStats.whatsapp.failed}</div>
      <div>Pendientes: {job.channelStats.whatsapp.pending}</div>
    </div>
  </div>
  
  {/* SMS Stats */}
  <div className="border rounded p-4 bg-blue-50">
    <h4 className="font-semibold text-blue-800 mb-2">📱 SMS</h4>
    <div className="space-y-1 text-sm">
      <div>Enviados: {job.channelStats.sms.sent}</div>
      <div>Fallidos: {job.channelStats.sms.failed}</div>
      <div>Pendientes: {job.channelStats.sms.pending}</div>
    </div>
  </div>
</div>

{/* Indicador de Canal Actual */}
<div className="mt-4 p-3 bg-gray-100 rounded text-center">
  <span className="text-sm font-medium">
    Canal actual: {job.currentChannel === 'whatsapp' ? '💚 WhatsApp' : '📱 SMS'}
  </span>
</div>
```

---

## 🚀 **Plan de Implementación**

### **Fase 1: Infraestructura Base (1-2 días)**
- [ ] Modificar modelo `SendJob` con campos de canales
- [ ] Modificar modelo `Contact` con información de WhatsApp
- [ ] Actualizar migraciones de base de datos

### **Fase 2: Integración WhatsApp (2-3 días)**
- [ ] Instalar y configurar Baileys
- [ ] Implementar autenticación QR
- [ ] Crear servicio `whatsappService.js`
- [ ] Implementar envío de mensajes
- [ ] Manejar errores y reconexiones

### **Fase 3: Integración SMS (2-3 días)**

**Opción recomendada: Android Gateway (gratis)**
- [ ] Configurar teléfono Android + SMS Gateway App
- [ ] Exponer API HTTP del gateway
- [ ] Crear servicio `smsService.js`
- [ ] Implementar envío de SMS
- [ ] Manejar errores y reintentos

### **Fase 4: Lógica de Intercalado (2-3 días)**
- [ ] Implementar función `determineChannel()`
- [ ] Implementar función `shouldSwitchChannel()`
- [ ] Implementar estrategias de intercalado
- [ ] Crear sistema de verificación de WhatsApp

### **Fase 5: Frontend (2-3 días)**
- [ ] Agregar selector de estrategia de canal
- [ ] Mostrar estadísticas por canal en tiempo real
- [ ] Indicador visual de canal activo
- [ ] Configuración de parámetros de intercalado

### **Fase 6: Testing y Optimización (2-3 días)**
- [ ] Pruebas con 100 contactos
- [ ] Pruebas de intercalado
- [ ] Optimización de delays
- [ ] Manejo de errores masivos

---

## 💰 **Análisis de Costos**

### **Escenario 100% Gratuito**

| Componente | Solución | Costo Mensual |
|------------|----------|---------------|
| **WhatsApp** | Baileys (open source) | $0 |
| **SMS** | Android + chip prepago ($5/mes) | $5 |
| **Servidor** | Backend existente | $0 |
| **Internet** | Conexión actual | $0 |
| **TOTAL** | | **$5/mes** |

**Capacidad estimada:**
- WhatsApp: ~1,000-2,000 mensajes/día (sin bloqueo)
- SMS: ~500-1,000 mensajes/día (según plan chip)
- **Total combinado:** ~2,500 mensajes/día = **75,000 mensajes/mes**

---

## ⚠️ **Consideraciones y Riesgos**

### **WhatsApp**
- ⚠️ **Riesgo de bloqueo:** WhatsApp puede banear números que envían spam masivo
- ✅ **Mitigación:** Usar delays largos (30-60 seg), respetar horarios, no más de 500 msg/día
- ✅ **Plan B:** Tener números de respaldo listos

### **SMS vía Android Gateway**
- ⚠️ **Confiabilidad:** Requiere teléfono siempre encendido y conectado
- ✅ **Mitigación:** UPS para el teléfono, monitoreo automático
- ✅ **Plan B:** Tener Twilio configurado como fallback

### **Legal**
- ⚠️ **Consentimiento:** Asegurar que todos los contactos han consentido recibir mensajes
- ⚠️ **Horarios:** No enviar fuera de horarios comerciales (8am-8pm)
- ⚠️ **Opt-out:** Permitir que usuarios se den de baja fácilmente

---

## 📈 **Métricas de Éxito**

- ✅ **Tasa de entrega combinada:** > 90%
- ✅ **Costo por mensaje:** < $0.01 USD
- ✅ **Tiempo promedio de envío:** < 3 días para 10,000 mensajes
- ✅ **Tasa de bloqueo WhatsApp:** < 1%
- ✅ **Uptime del sistema:** > 95%

---

## 🔮 **Roadmap Futuro**

### **Corto Plazo (1-3 meses)**
- Implementación básica WhatsApp + SMS
- Estrategia de intercalado simple
- Dashboard de monitoreo

### **Mediano Plazo (3-6 meses)**
- Machine Learning para predecir mejor canal
- Verificación automática de WhatsApp activo
- Múltiples números de WhatsApp en rotación
- Múltiples módems GSM para SMS

### **Largo Plazo (6-12 meses)**
- Integración con Telegram (gratuito)
- A/B testing de mensajes
- Análisis de tasa de respuesta por canal
- API pública para otros sistemas

---

## 📚 **Recursos y Referencias**

### **Documentación Técnica**
- Baileys: https://github.com/WhiskeySockets/Baileys
- Whatsapp-web.js: https://wwebjs.dev/
- SMS Gateway Android: https://smsgateway.me/
- Gammu (SMS Modem): https://wammu.eu/gammu/

### **Librerías NPM**
```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "^6.x",
    "qrcode-terminal": "^0.12.0",
    "node-sms": "^1.x",
    "axios": "^1.x"
  }
}
```

---

## ✅ **Checklist de Inicio**

Antes de comenzar la implementación, verificar:

- [x] Servidor backend con Node.js actualizado
- [x] MongoDB para almacenar sesiones de WhatsApp
- [x] Teléfono Android con chip activo (para SMS)
- [x] Número de WhatsApp dedicado para broadcast
- [x] Lista de contactos limpia y con consentimiento
- [ ] Backup del sistema actual
- [ ] Plan de rollback en caso de fallas

---

**Última actualización:** Noviembre 2025  
**Autor:** Sistema Dann-Salud-Broadcaster  
**Estado:** Planificación - Pendiente de implementación
