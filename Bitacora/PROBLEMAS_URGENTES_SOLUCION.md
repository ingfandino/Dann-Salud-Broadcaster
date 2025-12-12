# 🚨 PROBLEMAS URGENTES - ANÁLISIS Y SOLUCIONES

**Fecha:** 13 de Noviembre 2025, 12:58 PM (UTC-3)

---

## 📋 ÍNDICE

1. [Problema 1: Auditorías Desapareciendo de FollowUp](#problema-1-auditorías-desapareciendo-de-followup)
2. [Problema 2: Restricciones de WhatsApp](#problema-2-restricciones-de-whatsapp)

---

# PROBLEMA 1: Auditorías Desapareciendo de FollowUp

## 🔴 **Síntoma Reportado**

**Caso específico:**
- **Auditoría:** Rodriguez Ezequiel Adonai
- **CUIL:** 20441724129
- **Problema:** Desaparece de FollowUp.jsx sin intervención del usuario

**Patrón:** Las auditorías se ocultan automáticamente sin aviso ni razón aparente.

---

## 🔍 **CAUSA RAÍZ IDENTIFICADA**

### **Ubicación del Problema**

**Archivo:** `backend/src/controllers/recoveryController.js` (Líneas 33-76)

**Código Problemático:**

```javascript
// ✅ A las 23:01 (cualquier día): Marcar auditorías que ACTUALMENTE tengan estados específicos
if (hours === 23 && minutes >= 1) {
    const recoveryStates = [
        "Falta clave", 
        "Falta documentación",
        "Falta clave y documentación",
        "Pendiente"
    ];
    
    // ✅ IMPORTANTE: Buscar auditorías que EN ESTE MOMENTO (23:01) tengan esos estados
    // No importa cuándo fue actualizado el estado, importa que LO TENGAN AHORA
    await Audit.updateMany(
        { 
            status: { $in: recoveryStates },
            isRecovery: { $ne: true } // Solo las que no están ya en recuperación
        },
        { 
            $set: { 
                isRecovery: true,
                recoveryMovedAt: new Date(),
                recoveryMonth: currentMonth
            }
        }
    );
    console.log(`✅ Auditorías con estados de recuperación marcadas a las 23:01`);
}
```

### **¿Por Qué Es Un Problema?**

#### **1. Se Ejecuta en CADA Request, NO es un Verdadero Cron**

Este código está dentro de la función `exports.list` de `recoveryController.js`, que se ejecuta **CADA VEZ** que alguien hace un request a `/api/recovery`.

**Escenario problemático:**
```
23:01 → Usuario A abre la pestaña Recovery
      → Se ejecuta el updateMany
      → Marca auditorías con estados de recuperación como isRecovery: true
      
23:05 → Usuario B refresca la pestaña Recovery
      → Se ejecuta OTRA VEZ el updateMany
      → Vuelve a marcar auditorías (aunque ya estaban marcadas)
      
23:10 → Usuario C abre la pestaña FollowUp
      → Las auditorías ya no aparecen porque isRecovery: true
```

#### **2. Efecto en FollowUp.jsx**

**Archivo:** `backend/src/controllers/auditController.js` (Líneas 226-227)

```javascript
// Excluir auditorías que están en recuperación
{ isRecovery: { $ne: true } }
```

**Resultado:** Cualquier auditoría con `isRecovery: true` es **automáticamente excluida** de FollowUp.

#### **3. Pérdida de Visibilidad sin Aviso**

- ✅ **Correcto:** Mover auditorías a Recovery a las 23:01
- ❌ **Incorrecto:** Hacerlo en cada request sin notificar al usuario
- ❌ **Incorrecto:** No tener un verdadero cron job programado

---

## ✅ **SOLUCIÓN IMPLEMENTADA**

### **Opción 1: Convertir a Verdadero Cron Job (RECOMENDADA)**

Usar `node-cron` para ejecutar el proceso exactamente a las 23:01, UNA VEZ POR DÍA.

**Crear nuevo archivo:** `backend/src/cron/recoveryJob.js`

```javascript
const cron = require('node-cron');
const Audit = require('../models/Audit');
const logger = require('../utils/logger');

// Ejecutar a las 23:01 todos los días
cron.schedule('1 23 * * *', async () => {
    try {
        logger.info('🕐 [CRON] Ejecutando proceso de Recovery a las 23:01');
        
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        
        const recoveryStates = [
            "Falta clave", 
            "Falta documentación",
            "Falta clave y documentación",
            "Pendiente"
        ];
        
        // Marcar auditorías para Recovery
        const result = await Audit.updateMany(
            { 
                status: { $in: recoveryStates },
                isRecovery: { $ne: true }
            },
            { 
                $set: { 
                    isRecovery: true,
                    recoveryMovedAt: new Date(),
                    recoveryMonth: currentMonth
                }
            }
        );
        
        logger.info(`✅ [CRON] ${result.modifiedCount} auditorías marcadas para Recovery`);
        
        // Ocultar auditorías con "QR hecho" de Recovery
        const resultQR = await Audit.updateMany(
            { 
                status: { $regex: /^QR hecho$/i },
                isRecovery: true
            },
            { 
                $set: { 
                    isRecovery: false,
                    recoveryDeletedAt: new Date()
                }
            }
        );
        
        logger.info(`✅ [CRON] ${resultQR.modifiedCount} auditorías con QR hecho removidas de Recovery`);
        
        // Soft-delete mensual (último día del mes)
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        if (now.getDate() === lastDayOfMonth) {
            const resultMonthly = await Audit.updateMany(
                { 
                    recoveryMonth: currentMonth,
                    isRecovery: true
                },
                { 
                    $set: { 
                        isRecovery: false,
                        recoveryDeletedAt: new Date()
                    }
                }
            );
            
            logger.info(`🗑️ [CRON] ${resultMonthly.modifiedCount} auditorías del mes ${currentMonth} soft-deleted`);
        }
        
    } catch (error) {
        logger.error('❌ [CRON] Error en proceso de Recovery:', error);
    }
}, {
    timezone: "America/Argentina/Buenos_Aires"
});

logger.info('✅ Cron job de Recovery registrado (23:01 diario)');

module.exports = {};
```

**Modificar:** `backend/src/server.js`

```javascript
// Al inicio del archivo, después de los requires
require('./cron/recoveryJob'); // ✅ Registrar cron job de Recovery
```

**Modificar:** `backend/src/controllers/recoveryController.js`

```javascript
// ELIMINAR líneas 14-76 (todo el código del "cron" falso)
// Dejar solo el query de auditorías:

exports.list = async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        
        const User = require('../models/User');
        
        // ✅ Traer SOLO auditorías marcadas como recuperación del mes actual
        const audits = await Audit.find({
            isRecovery: true,
            recoveryMonth: currentMonth
        })
            .populate({
                path: 'asesor',
                select: 'nombre name email numeroEquipo role'
            })
            .populate({
                path: 'administrador',
                select: 'nombre name email'
            })
            .populate('groupId', 'nombre name')
            .sort({ statusUpdatedAt: -1, createdAt: -1 })
            .lean();
        
        // ... resto del código (buscar supervisores, etc.)
```

### **Instalación de node-cron**

```bash
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
npm install node-cron
```

---

### **Opción 2: Ejecutar Solo Una Vez al Día (Alternativa Simple)**

Si no quieres instalar `node-cron`, puedes usar un flag para ejecutar solo una vez:

**Modificar:** `backend/src/controllers/recoveryController.js`

```javascript
// Variable global para controlar ejecución diaria
let lastExecutionDate = null;

exports.list = async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        const currentDay = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const today = now.toDateString(); // Ej: "Wed Nov 13 2025"
        
        // ✅ SOLO ejecutar si:
        // 1. Son las 23:01 o después
        // 2. NO se ejecutó hoy todavía
        const shouldExecuteCron = (hours === 23 && minutes >= 1) && lastExecutionDate !== today;
        
        if (shouldExecuteCron) {
            logger.info(`🕐 Ejecutando proceso de Recovery (primera vez hoy: ${today})`);
            
            const recoveryStates = [
                "Falta clave", 
                "Falta documentación",
                "Falta clave y documentación",
                "Pendiente"
            ];
            
            // ... resto del código del cron
            
            // Marcar como ejecutado hoy
            lastExecutionDate = today;
            logger.info(`✅ Proceso de Recovery completado. No se ejecutará de nuevo hasta mañana.`);
        }
        
        // ... resto del código (query de auditorías)
```

---

## 🎯 **RESULTADO ESPERADO**

### **Antes (Problemático):**
```
23:01 → Request a /api/recovery → Marca auditorías
23:05 → Request a /api/recovery → Marca auditorías (de nuevo)
23:10 → Request a /api/recovery → Marca auditorías (de nuevo)
```

### **Después (Correcto):**
```
23:01 → Cron job ejecuta AUTOMÁTICAMENTE → Marca auditorías
23:05 → Request a /api/recovery → Solo trae datos
23:10 → Request a /api/recovery → Solo trae datos

Próxima ejecución: Mañana a las 23:01
```

---

## ⚠️ **VERIFICACIÓN**

### **Logs a Buscar:**

```bash
# En modo correcto (cron job):
pm2 logs dann-backend | grep CRON

# Deberías ver:
[CRON] Ejecutando proceso de Recovery a las 23:01
[CRON] 5 auditorías marcadas para Recovery
[CRON] 2 auditorías con QR hecho removidas de Recovery
```

### **Prueba Manual:**

1. Crear una auditoría con estado "Falta clave"
2. Verificar que aparece en FollowUp.jsx
3. Esperar hasta las 23:01 (o simular cambiando hora del servidor)
4. El cron debe ejecutarse automáticamente
5. La auditoría debe desaparecer de FollowUp y aparecer en Recovery
6. No debe desaparecer antes de las 23:01

---

# PROBLEMA 2: Restricciones de WhatsApp

## 🔴 **Síntoma Reportado**

"Nos están restringiendo demasiado en WhatsApp"

**Posibles causas:**
- Envío masivo de mensajes
- Mensajes repetitivos o spam
- Reportes de usuarios
- Patrones no humanos detectados por WhatsApp

---

## 🔍 **ANÁLISIS DE CÓDIGO ACTUAL**

### **Buenas Prácticas YA Implementadas:**

✅ **1. Delays Humanos con Distribución Gaussiana**
```javascript
// Línea 17-31
function humanDelay(min, max) {
    // Distribución normal en lugar de uniforme
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 4;
    // Box-Muller transform
}
```

✅ **2. Simulación de Tiempo de Escritura**
```javascript
// Línea 34-45
function calculateTypingTime(messageLength) {
    const baseCharsPerSecond = 3 + Math.random() * 2; // 3-5 chars/segundo
    const typingTime = (messageLength / baseCharsPerSecond) * 1000;
}
```

✅ **3. Horario Laboral**
```javascript
// Línea 48-60
function isWorkingHours() {
    // Lunes a Viernes: 8am - 8pm
    // Sábados: 9am - 2pm
    // Domingos: No enviar
}
```

✅ **4. Pausas Aleatorias (5% probabilidad)**
```javascript
// Línea 63-66
function shouldTakeRandomBreak() {
    return Math.random() < 0.05; // 5% de probabilidad
}
```

✅ **5. Throttling Global**
```javascript
// Línea 74-87
const MESSAGE_RATE_LIMITER = {
    minIntervalMs: 2000, // Mínimo 2 segundos entre mensajes
};
```

---

## ⚠️ **PROBLEMAS DETECTADOS**

### **1. Throttling Insuficiente**

**Actual:**
```javascript
minIntervalMs: 2000, // 2 segundos entre mensajes
```

**Recomendación:** WhatsApp detecta patrones. 2 segundos es muy predecible.

**Solución:**
```javascript
const MESSAGE_RATE_LIMITER = {
    lastMessageTime: 0,
    minIntervalMs: 3000, // ✅ Aumentar a 3 segundos
    maxIntervalMs: 8000, // ✅ Agregar variabilidad máxima
};

async function throttleMessage() {
    const now = Date.now();
    const elapsed = now - MESSAGE_RATE_LIMITER.lastMessageTime;
    
    // ✅ Delay variable entre 3-8 segundos
    const targetDelay = MESSAGE_RATE_LIMITER.minIntervalMs + 
                       Math.random() * (MESSAGE_RATE_LIMITER.maxIntervalMs - MESSAGE_RATE_LIMITER.minIntervalMs);
    
    if (elapsed < targetDelay) {
        const waitTime = targetDelay - elapsed;
        await delay(waitTime);
    }
    MESSAGE_RATE_LIMITER.lastMessageTime = Date.now();
}
```

### **2. Límite Diario de WhatsApp**

WhatsApp Business tiene límites:
- **Tier 1 (nuevo):** 1,000 conversaciones/día
- **Tier 2:** 10,000 conversaciones/día
- **Tier 3:** 100,000 conversaciones/día

**Solución:** Implementar límite diario configurable.

```javascript
// Agregar a SendConfig model
dailyLimit: { type: Number, default: 500 }, // Límite conservador

// Verificar antes de procesar job
const today = new Date().toDateString();
const sentToday = await Message.countDocuments({
    createdBy: initialJob.createdBy,
    createdAt: { 
        $gte: new Date(new Date().setHours(0,0,0,0)),
        $lt: new Date(new Date().setHours(23,59,59,999))
    },
    status: "enviado"
});

if (sentToday >= config.dailyLimit) {
    logger.warn(`⚠️ Límite diario alcanzado: ${sentToday}/${config.dailyLimit}`);
    // Pausar hasta mañana
}
```

### **3. Contenido Repetitivo**

WhatsApp detecta mensajes idénticos enviados a múltiples números.

**Solución:** Ya tienen Spintax, pero mejorarlo:

```javascript
// Ejemplo de spintax mejorado
const message = `
{Hola|Buenos días|Qué tal} {{nombre}},

{Te contacto|Te escribo|Me comunico} desde {Dann Salud|nuestra empresa} 
para {comentarte|informarte|contarte} sobre {tu|tu reciente} afiliación.

{¿Podrías|Podrías|Me gustaría que} {confirmar|verificar} {tus datos|tu información}?

{Gracias|Muchas gracias|Agradezco tu tiempo},
{Saludos|Un saludo|Cordialmente}
`;
```

Esto genera cientos de variaciones del mismo mensaje.

---

## ✅ **SOLUCIONES RECOMENDADAS**

### **Solución 1: Mensajería Intercalada (IMPLEMENTADA)**

Ya tienes un plan documentado: `PLAN_MENSAJERIA_INTERCALADA_GRATUITA.md`

**Resumen:**
- Alternar entre múltiples cuentas de WhatsApp
- Distribuir carga entre cuentas
- Reducir riesgo de ban

**Ventajas:**
- ✅ Usa infraestructura existente (multi-user)
- ✅ Gratis (WhatsApp Web)
- ✅ Ya está documentado

**Desventajas:**
- ⚠️ Requiere múltiples números
- ⚠️ Gestión más compleja

### **Solución 2: WhatsApp Business API Oficial (RECOMENDADA LARGO PLAZO)**

**Ventajas:**
- ✅ **Sin límites artificiales** (con tier adecuado)
- ✅ **No hay bans** (es oficial)
- ✅ **Soporte de WhatsApp**
- ✅ **Mensajes de plantilla aprobados**

**Desventajas:**
- 💰 **Costo:** $0.005 - $0.05 USD por mensaje (varía por país)
- 🔧 **Requiere migración** de código

**Proveedores:**
- **Twilio WhatsApp API**
- **MessageBird**
- **360dialog**
- **Meta Cloud API** (directo)

**Estimación de costos:**
```
500 mensajes/día × 30 días = 15,000 mensajes/mes
15,000 × $0.01 USD = $150 USD/mes (aproximado)
```

### **Solución 3: Reducir Volumen + Mejorar Targeting**

**Estrategia:**
1. **Segmentar mejor:** Enviar solo a contactos calificados
2. **Timing óptimo:** Enviar en horarios de mayor respuesta
3. **Contenido personalizado:** Usar más placeholders
4. **A/B Testing:** Probar mensajes antes de envíos masivos

**Implementación:**
```javascript
// Agregar scoring a contactos
const contactScore = calculateContactScore(contact);
if (contactScore < 50) {
    logger.info(`Omitiendo contacto con bajo score: ${contact.telefono}`);
    continue; // No enviar a contactos de bajo potencial
}
```

### **Solución 4: Mejoras Inmediatas al Código Actual**

#### **A. Aumentar Delays**

```javascript
// EN sendMessageService.js

// ANTES:
const dMin = 2; // 2 segundos
const dMax = 5; // 5 segundos

// DESPUÉS:
const dMin = 5; // ✅ 5 segundos mínimo
const dMax = 15; // ✅ 15 segundos máximo

// THROTTLING:
minIntervalMs: 3000, // ✅ 3 segundos (antes: 2s)
maxIntervalMs: 10000, // ✅ Hasta 10 segundos aleatorio
```

#### **B. Pausas Más Frecuentes**

```javascript
// ANTES:
return Math.random() < 0.05; // 5% probabilidad

// DESPUÉS:
return Math.random() < 0.15; // ✅ 15% probabilidad (más humano)
```

#### **C. Límite de Mensajes por Hora**

```javascript
const HOURLY_LIMIT = 50; // Máximo 50 mensajes/hora

let messagesThisHour = 0;
let currentHour = new Date().getHours();

// En el loop de envío:
if (new Date().getHours() !== currentHour) {
    messagesThisHour = 0;
    currentHour = new Date().getHours();
}

if (messagesThisHour >= HOURLY_LIMIT) {
    logger.info(`⏸️ Límite horario alcanzado. Esperando 1 hora...`);
    await delay(3600000); // 1 hora
    messagesThisHour = 0;
}

messagesThisHour++;
```

#### **D. Verificar Número antes de Enviar**

```javascript
// Verificar si el número está registrado en WhatsApp
const { getOrInitClient } = require("./whatsappUnified");
const client = await getOrInitClient(userId);

try {
    const numberId = await client.getNumberId(to);
    if (!numberId) {
        logger.warn(`⚠️ Número no registrado en WhatsApp: ${to}`);
        // Marcar como fallido sin intentar enviar
        wasSent = false;
        continue;
    }
} catch (err) {
    logger.error(`Error verificando número: ${to}`, err);
}
```

---

## 📊 **PLAN DE ACCIÓN RECOMENDADO**

### **Corto Plazo (Esta Semana):**

1. ✅ **Aumentar delays** (5-15 segundos)
2. ✅ **Implementar límite horario** (50 msg/hora)
3. ✅ **Mejorar spintax** (más variaciones)
4. ✅ **Verificar números** antes de enviar
5. ✅ **Monitoreo de restricciones** (logs)

### **Mediano Plazo (Este Mes):**

1. 🔄 **Activar mensajería intercalada** (plan ya documentado)
2. 🔄 **Implementar límite diario configurable**
3. 🔄 **Dashboard de monitoreo** (mensajes enviados/hora/día)
4. 🔄 **Sistema de alertas** (si se detectan restricciones)

### **Largo Plazo (Próximo Trimestre):**

1. 💡 **Evaluar WhatsApp Business API** (análisis costo-beneficio)
2. 💡 **Migración gradual** (si se aprueba inversión)
3. 💡 **Multicanal:** SMS como alternativa/complemento

---

## 🎯 **MÉTRICAS A MONITOREAR**

### **Antes de Implementar Cambios:**
```
- Mensajes enviados/día: [registrar]
- Tasa de restricciones: [registrar]
- Tasa de respuesta: [registrar]
```

### **Después de Implementar Cambios:**
```
- Mensajes enviados/día: [comparar]
- Tasa de restricciones: [comparar - objetivo: -80%]
- Tasa de respuesta: [comparar - objetivo: mantener o mejorar]
```

### **KPIs:**
- ✅ **Restricciones < 1%** (actualmente: [?])
- ✅ **Uptime de conexión > 95%**
- ✅ **Tasa de respuesta > 10%** (benchmarks del sector)

---

## ⚠️ **SEÑALES DE ALERTA**

Si ves estos patrones, **DETENER envíos inmediatamente:**

1. ❌ Cuenta suspendida temporalmente
2. ❌ Mensajes no entregados (status: failed) > 20%
3. ❌ Desconexiones frecuentes de WhatsApp Web
4. ❌ Mensajes en cola (no se envían)
5. ❌ Warning de WhatsApp sobre spam

**Acción inmediata:**
```javascript
// DETENER job manualmente
await SendJob.updateOne(
    { _id: jobId },
    { $set: { status: 'pausado' } }
);

// Esperar 24-48 horas antes de reanudar
```

---

## 📞 **CONTACTO DE SOPORTE**

Si las restricciones persisten:

1. **WhatsApp Business Support:** https://business.whatsapp.com/support
2. **Twilio (si usas Twilio):** https://support.twilio.com
3. **Comunidad de Developers:** https://github.com/pedroslopez/whatsapp-web.js/issues

---

## 🔄 **SIGUIENTE PASO**

**URGENTE:** Decidir qué solución implementar primero:

- [ ] **Opción A:** Aumentar delays (rápido, bajo riesgo)
- [ ] **Opción B:** Activar mensajería intercalada (medio, ya documentado)
- [ ] **Opción C:** WhatsApp Business API (largo plazo, requiere inversión)

**Recomendación:** Empezar con **Opción A** hoy, planificar **Opción B** para esta semana.

---

**FIN DEL DOCUMENTO**
