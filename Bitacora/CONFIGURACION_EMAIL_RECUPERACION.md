# 📧 Configuración de Email para Recuperación de Contraseña

## 🔍 Problema Detectado

La funcionalidad de recuperación de contraseña **está implementada correctamente** pero **NO está enviando correos** porque falta la configuración SMTP en las variables de entorno.

### Estado Actual:
- ✅ Código backend funcional (`authController.js`)
- ✅ Servicio de email implementado (`emailService.js`)
- ✅ Frontend con formularios (ForgotPassword / ResetPassword)
- ❌ **Configuración SMTP faltante** (por eso no envía emails)

---

## 🎯 Solución Rápida

Elige una de estas opciones y sigue los pasos:

---

## 📌 **OPCIÓN 1: Gmail (Más Rápido)** ⚡

### Ventajas:
- ✅ Rápido de configurar (5 minutos)
- ✅ Gratis
- ✅ Familiar

### Desventajas:
- ⚠️ Límite de 500 emails/día
- ⚠️ Puede ser bloqueado si envías muchos correos

### Pasos:

#### 1. **Habilitar "Contraseñas de aplicaciones"** en Gmail

a. Ve a tu cuenta Google: https://myaccount.google.com/

b. Ve a **Seguridad** → **Verificación en 2 pasos** (debes activarla primero)

c. Una vez activada, ve a: https://myaccount.google.com/apppasswords

d. Selecciona:
   - **Aplicación**: Correo
   - **Dispositivo**: Otro (personalizado)
   - **Nombre**: "Dann Salud Broadcaster"

e. Haz click en **Generar** → Copia la contraseña (16 caracteres, formato: `xxxx xxxx xxxx xxxx`)

#### 2. **Editar el archivo `.env`**

Abre `/backend/.env` y descomenta/modifica estas líneas:

```bash
# --- EMAIL (Recuperación de Contraseña) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=tu-email@gmail.com
APP_NAME=Dann+Salud Online
FRONTEND_BASE_URL=http://192.168.1.94:5000
RESET_TOKEN_TTL_MINUTES=60
```

**Reemplaza:**
- `tu-email@gmail.com` → Tu email de Gmail
- `xxxx xxxx xxxx xxxx` → La contraseña de aplicación generada

#### 3. **Reiniciar el servidor**

```bash
cd backend
./start.sh
```

#### 4. **Probar**

1. Ve a http://192.168.1.94:5000/forgot-password
2. Ingresa un email registrado
3. Deberías recibir un correo con el enlace de recuperación

---

## 🏆 **OPCIÓN 2: Brevo (Sendinblue) - Recomendado**

### Ventajas:
- ✅ **300 emails/día gratis** (vs 500 de Gmail pero más confiable)
- ✅ Mejor entregabilidad (menos spam)
- ✅ Panel de control con estadísticas
- ✅ No requiere verificación en 2 pasos
- ✅ Diseñado para aplicaciones

### Desventajas:
- ⚠️ Requiere crear cuenta (5 minutos)

### Pasos:

#### 1. **Crear cuenta en Brevo**

a. Ve a: https://www.brevo.com/

b. Click en **"Sign up free"**

c. Completa el registro (email, contraseña, datos de la empresa)

#### 2. **Obtener credenciales SMTP**

a. Una vez dentro, ve a: **Settings** (⚙️) → **SMTP & API**

b. En la sección **SMTP**, verás:
   - **SMTP Server**: `smtp-relay.brevo.com`
   - **Port**: `587`
   - **Login**: (tu email de registro)
   - **SMTP Key**: Click en **"Create a new SMTP key"**

c. Copia la **SMTP Key** (ej: `xkeysib-a1b2c3d4...`)

#### 3. **Verificar tu email de envío** (Opcional pero recomendado)

a. Ve a **Senders & IP** → **Senders**

b. Agrega tu email o dominio de envío (ej: `noreply@dannsalud.com`)

c. Verifica el email siguiendo las instrucciones

#### 4. **Editar el archivo `.env`**

Abre `/backend/.env`:

```bash
# --- EMAIL (Recuperación de Contraseña) ---
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@brevo.com
SMTP_PASS=xkeysib-a1b2c3d4e5f6g7h8i9j0...
SMTP_FROM=noreply@dannsalud.com
APP_NAME=Dann+Salud Online
FRONTEND_BASE_URL=http://192.168.1.94:5000
RESET_TOKEN_TTL_MINUTES=60
```

**Reemplaza:**
- `tu-email@brevo.com` → El email con el que te registraste en Brevo
- `xkeysib-...` → Tu SMTP Key de Brevo
- `noreply@dannsalud.com` → Email verificado (o usa el de registro)

#### 5. **Reiniciar el servidor**

```bash
cd backend
./start.sh
```

#### 6. **Probar**

1. Ve a http://192.168.1.94:5000/forgot-password
2. Ingresa un email registrado
3. Deberías recibir un correo
4. Puedes ver estadísticas en el panel de Brevo

---

## 🛠️ **OPCIÓN 3: Servidor SMTP Propio** (Para producción con dominio propio)

Si tienes un dominio propio (ej: `dannsalud.com`) con hosting que incluye email:

### Pasos:

#### 1. **Obtener credenciales de tu hosting**

Contacta a tu proveedor de hosting o busca en el panel de control:
- **Servidor SMTP**: `mail.tudominio.com` o `smtp.tudominio.com`
- **Puerto**: `587` (TLS) o `465` (SSL)
- **Usuario**: `noreply@dannsalud.com` (o cualquier cuenta de email)
- **Contraseña**: La contraseña de esa cuenta de email

#### 2. **Editar el archivo `.env`**

```bash
# --- EMAIL (Recuperación de Contraseña) ---
SMTP_HOST=mail.dannsalud.com
SMTP_PORT=587
SMTP_SECURE=false  # true si usas puerto 465
SMTP_USER=noreply@dannsalud.com
SMTP_PASS=contraseña_de_la_cuenta
SMTP_FROM=noreply@dannsalud.com
APP_NAME=Dann+Salud Online
FRONTEND_BASE_URL=http://192.168.1.94:5000
RESET_TOKEN_TTL_MINUTES=60
```

#### 3. **Reiniciar y probar**

```bash
cd backend
./start.sh
```

---

## 🧪 Cómo Probar que Funciona

### Método 1: Frontend (Usuario Final)

1. Abre http://192.168.1.94:5000/forgot-password
2. Ingresa un email registrado en el sistema
3. Click en **"Enviar enlace de recuperación"**
4. **Verifica tu bandeja de entrada** (y spam/promociones)
5. Click en el enlace del email
6. Ingresa nueva contraseña
7. Inicia sesión con la nueva contraseña

### Método 2: Backend (Logs)

Abre los logs del backend y busca:

```bash
# Si la configuración SMTP está CORRECTA:
✅ Email de recuperación enviado a: usuario@ejemplo.com

# Si la configuración SMTP está INCORRECTA:
⚠️ SMTP no configurado; no se envía email de recuperación
❌ Error enviando email de recuperación
```

### Método 3: API (Desarrollo)

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@ejemplo.com"}'
```

**Respuesta esperada con SMTP configurado:**
```json
{
  "ok": true,
  "emailSent": true,
  "expiresAt": "2025-11-04T14:30:00.000Z"
}
```

**Respuesta sin SMTP configurado:**
```json
{
  "ok": true,
  "resetToken": "abc123...",  // Solo en desarrollo
  "emailSent": false,
  "expiresAt": "2025-11-04T14:30:00.000Z"
}
```

---

## 🐛 Troubleshooting

### Error: "SMTP not configured"

**Problema**: Las variables SMTP no están definidas o están comentadas

**Solución**: Verifica que en `.env` las líneas NO comiencen con `#`

```bash
# ❌ INCORRECTO (están comentadas)
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=...

# ✅ CORRECTO
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
```

### Error: "Invalid login"

**Problema**: Credenciales incorrectas

**Solución**:
- **Gmail**: Verifica que uses una "Contraseña de aplicación" (no tu contraseña normal)
- **Brevo**: Verifica que uses el "SMTP Key" (no tu contraseña de login)
- Verifica que el email sea correcto

### Error: "Connection timeout"

**Problema**: Puerto o servidor incorrecto

**Solución**:
- Verifica el puerto: `587` para TLS, `465` para SSL
- Verifica que tu servidor/firewall permita conexiones salientes SMTP
- Prueba con `SMTP_SECURE=true` si usas puerto 465

### Los correos van a SPAM

**Solución**:
- Usa un servicio profesional como Brevo (mejor reputación)
- Verifica el dominio de envío en el servicio
- Configura SPF/DKIM si usas dominio propio

### No recibo el correo

**Checklist**:
1. ✅ Verifica que el email esté registrado en el sistema
2. ✅ Revisa la carpeta de SPAM/Promociones
3. ✅ Verifica los logs del backend
4. ✅ Prueba con otro email
5. ✅ Verifica que SMTP_FROM sea un email válido

---

## 📊 Comparación de Opciones

| Característica | Gmail | Brevo | SMTP Propio |
|---|---|---|---|
| **Configuración** | ⚡ 5 min | ⚡ 5 min | 🛠️ 15 min |
| **Emails/día** | 500 | 300 | Ilimitado |
| **Costo** | Gratis | Gratis | Depende |
| **Entregabilidad** | Media | Alta | Alta* |
| **Panel control** | No | Sí | Depende |
| **Recomendado para** | Desarrollo | Producción | Empresas |

\* Requiere configuración de DNS (SPF, DKIM, DMARC)

---

## ✅ Configuración Completa de Ejemplo

Archivo `.env` completo con Brevo:

```bash
# --- EMAIL (Recuperación de Contraseña) ---
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@dannsalud.com
SMTP_PASS=xkeysib-1234567890abcdef
SMTP_FROM=noreply@dannsalud.com
APP_NAME=Dann+Salud Online
FRONTEND_BASE_URL=http://192.168.1.94:5000
RESET_TOKEN_TTL_MINUTES=60
```

**Después de configurar, SIEMPRE reinicia el servidor:**
```bash
cd backend
./start.sh
```

---

## 📚 Recursos Adicionales

### Gmail:
- Contraseñas de aplicación: https://myaccount.google.com/apppasswords
- Documentación: https://support.google.com/mail/answer/185833

### Brevo (Sendinblue):
- Sitio web: https://www.brevo.com/
- Documentación SMTP: https://developers.brevo.com/docs/send-a-transactional-email

### Nodemailer:
- Documentación: https://nodemailer.com/

---

## ✨ Resumen

1. **Elige un servicio de email** (Gmail, Brevo, o propio)
2. **Obtén las credenciales SMTP**
3. **Edita el archivo `/backend/.env`**
4. **Descomenta y configura las variables SMTP**
5. **Reinicia el servidor**: `./start.sh`
6. **Prueba la funcionalidad** desde el frontend

**¡Listo! La recuperación de contraseña funcionará correctamente.** 🎉
