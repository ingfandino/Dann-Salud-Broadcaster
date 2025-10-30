# 🔧 Troubleshooting: Problemas con Proxies

## 🚨 Error: Cliente no se puede inicializar con proxy

### Síntomas

```
[WA][userId] Usando proxy con autenticación: host:port (usuario: xxx)
[WA][userId] Usando Chromium de Puppeteer (descarga automática)
[WA][userId] Error al inicializar cliente:
```

### Causas Comunes

#### 1. **Proxy no responde o está bloqueado**

**Verificar conectividad al proxy:**

```bash
# Método 1: Con curl
curl -x http://usuario:password@host:port --connect-timeout 10 http://ifconfig.me

# Método 2: Con telnet
telnet host port

# Método 3: Con netcat
nc -zv host port
```

**Si falla:** El proxy no es accesible desde tu servidor.

**Soluciones:**
- Verificar firewall del servidor permite conexiones salientes al puerto del proxy
- Verificar que Webshare.io no haya bloqueado tu IP
- Verificar credenciales correctas

---

#### 2. **Chromium no puede descargarse a través del proxy**

Puppeteer intenta descargar Chromium en el primer uso, y puede fallar si el proxy no permite la descarga.

**Solución A: Descargar Chromium sin proxy**

```bash
# Detener servidor
pkill -f "node.*server.js"

# Temporalmente comentar proxies en .env
nano backend/.env
# Comentar líneas PROXY_USER_...

# Iniciar servidor para que descargue Chromium
cd backend && npm start

# Esperar 30 segundos a que descargue
# Ctrl+C para detener

# Descomentar proxies en .env
# Reiniciar servidor
npm start
```

**Solución B: Usar Chromium del sistema**

```bash
# Instalar Chromium
sudo apt update
sudo apt install chromium-browser -y

# Encontrar ruta
which chromium-browser
# O: which chromium

# Agregar a .env
echo "WHATSAPP_CHROME_PATH=/usr/bin/chromium-browser" >> backend/.env

# Reiniciar servidor
pkill -f "node.*server.js"
cd backend && npm start
```

---

#### 3. **Formato incorrecto de URL del proxy**

**Formato correcto:**
```bash
PROXY_USER_<userId>=http://username:password@host:port
```

**Errores comunes:**
- ❌ `https://...` → Usar `http://`
- ❌ Faltan credenciales → `http://username:password@...`
- ❌ Caracteres especiales en password no codificados

**Si la contraseña tiene caracteres especiales:**

```bash
# Ejemplo: password con @: p@ss123
# Codificar @ como %40
PROXY_USER_xxx=http://usuario:p%40ss123@host:port
```

**Codificador online:** https://www.urlencoder.org/

---

#### 4. **Webshare.io requiere IP autorizada**

Algunos planes de Webshare requieren que autorices las IPs que usarán los proxies.

**Verificar:**
1. Ir a https://proxy2.webshare.io/
2. Login → **Settings** → **IP Authorization**
3. Agregar IP pública de tu servidor

**Obtener IP pública del servidor:**
```bash
curl ifconfig.me
```

Si tu servidor está detrás de NAT/VPN, usa la IP que Webshare verá (puede ser diferente).

---

#### 5. **Plan gratuito de Webshare tiene limitaciones**

**Plan gratuito:**
- ✅ 10 proxies
- ❌ Solo HTTP (no HTTPS)
- ❌ Bandwidth limitado
- ⏰ Rotación IP cada request (puede causar problemas con WhatsApp)

**Para WhatsApp necesitas:**
- Proxy con IP **estática** (no rotativa)
- Plan de pago de Webshare: https://www.webshare.io/pricing

**Alternativa gratuita temporal:**
Usar VPS propios con Squid (ver `CONFIGURACION_PROXIES.md`)

---

## 🧪 Tests de Diagnóstico

### Test 1: Verificar conectividad básica al proxy

```bash
curl -x http://erylbmeo:lgfi3yxwe1zh@31.59.20.176:6754 --connect-timeout 10 http://ifconfig.me
```

**Resultado esperado:** Muestra una IP diferente a la de tu servidor

**Si falla:** Problema de conectividad o credenciales

---

### Test 2: Verificar que Node.js puede usar el proxy

Crear archivo `test-proxy-node.js`:

```javascript
const http = require('http');
const { URL } = require('url');

const proxyUrl = 'http://erylbmeo:lgfi3yxwe1zh@31.59.20.176:6754';
const proxy = new URL(proxyUrl);

const options = {
  host: proxy.hostname,
  port: proxy.port,
  path: 'http://ifconfig.me',
  headers: {
    'Proxy-Authorization': 'Basic ' + Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')
  }
};

http.request(options, (res) => {
  console.log('✅ Proxy funciona. Status:', res.statusCode);
  res.on('data', (chunk) => console.log('IP:', chunk.toString()));
}).on('error', (err) => {
  console.error('❌ Error:', err.message);
}).end();
```

Ejecutar:
```bash
node test-proxy-node.js
```

---

### Test 3: Verificar que Puppeteer puede usar el proxy

Crear archivo `test-puppeteer-proxy.js`:

```javascript
const puppeteer = require('puppeteer');

(async () => {
  console.log('Iniciando Puppeteer con proxy...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--proxy-server=31.59.20.176:6754'
    ]
  });
  
  const page = await browser.newPage();
  
  // Configurar autenticación
  await page.authenticate({
    username: 'erylbmeo',
    password: 'lgfi3yxwe1zh'
  });
  
  console.log('Navegando a ifconfig.me...');
  await page.goto('http://ifconfig.me', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const content = await page.content();
  console.log('✅ Contenido obtenido:', content.substring(0, 200));
  
  await browser.close();
  console.log('✅ Test exitoso');
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

Ejecutar:
```bash
cd backend
node ../test-puppeteer-proxy.js
```

**Si este test falla:** El problema está en cómo Puppeteer maneja el proxy.

---

## 🔧 Soluciones Rápidas

### Solución 1: Probar sin proxy primero

Para confirmar que el sistema funciona sin proxy:

```bash
# Comentar temporalmente proxies en .env
nano backend/.env

# Comentar líneas:
# PROXY_USER_68e3f605f2d61bb5556b7b20=...
# PROXY_USER_68f65c8b97693bd9803fd67c=...

# Reiniciar
pkill -f "node.*server.js"
cd backend && npm start

# Probar generar QR
```

**Si funciona sin proxy:** El problema está en la configuración del proxy.

**Si no funciona ni sin proxy:** El problema es otra cosa (Chromium, permisos, etc.).

---

### Solución 2: Usar proxies de prueba gratuitos

Para verificar que el código funciona, probar con un proxy público gratuito:

**Lista de proxies gratuitos:** https://free-proxy-list.net/

**Ejemplo:**
```bash
# En .env, probar con proxy sin autenticación
PROXY_USER_68e3f605f2d61bb5556b7b20=http://45.77.230.52:8080
```

⚠️ **Solo para pruebas**, proxies públicos son lentos e inestables.

---

### Solución 3: Usar VPS propios (más confiable)

Si Webshare da problemas, crear proxies propios:

**Paso 1: Contratar VPS pequeño**
- DigitalOcean / Vultr / Linode
- Plan más básico ($5/mes)
- Ubicación: USA, Europa, etc.

**Paso 2: Instalar Squid**
```bash
# SSH al VPS
ssh root@IP_VPS

# Instalar Squid
apt update && apt install squid apache2-utils -y

# Crear usuario
htpasswd -c /etc/squid/passwd dannsalud

# Configurar Squid
cat > /etc/squid/squid.conf << 'EOF'
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm proxy
acl authenticated proxy_auth REQUIRED
http_access allow authenticated
http_access deny all
http_port 3128
forwarded_for delete
EOF

# Reiniciar
systemctl restart squid
systemctl enable squid

# Abrir puerto en firewall
ufw allow 3128/tcp
```

**Paso 3: Usar en .env**
```bash
PROXY_USER_xxx=http://dannsalud:tu_password@IP_VPS:3128
```

---

## 📞 Checklist de Diagnóstico

Antes de reportar un problema, verificar:

- [ ] ¿El servidor puede hacer `curl` al proxy?
- [ ] ¿Las credenciales son correctas?
- [ ] ¿El formato en `.env` es correcto? (`http://user:pass@host:port`)
- [ ] ¿Chromium está descargado? (mirar en `~/.cache/puppeteer/`)
- [ ] ¿El firewall permite conexiones salientes al puerto del proxy?
- [ ] ¿Webshare.io tiene tu IP autorizada? (si aplica)
- [ ] ¿El proxy es estático o rotativo? (WhatsApp requiere estático)
- [ ] ¿Probaste sin proxy y funciona?
- [ ] ¿Los logs muestran algo más específico?

---

## 🆘 Si Nada Funciona

### Opción A: Solución temporal sin proxies

```bash
# Vincular sin VPN (temporal)
# Ver: RESUMEN_SOLUCIONES.md → Opción 3
```

### Opción B: Cambiar de proveedor de proxy

Si Webshare no funciona, probar:
- **SmartProxy:** https://smartproxy.com/
- **Bright Data:** https://brightdata.com/
- **VPS propios con Squid**

### Opción C: Contactar soporte

**Webshare Support:**
- Email: support@webshare.io
- Dashboard: https://proxy2.webshare.io/

**Enviar:**
1. Resultado de `curl -x ... http://ifconfig.me`
2. IP pública de tu servidor (`curl ifconfig.me`)
3. Screenshot del error

---

## 📚 Recursos

- **Documentación Webshare:** https://docs.webshare.io/
- **Puppeteer Proxy Docs:** https://pptr.dev/guides/configuration#proxy
- **WhatsApp-Web.js Issues:** https://github.com/pedroslopez/whatsapp-web.js/issues

---

**Última actualización:** 30 de Octubre, 2025  
**Problema común:** Chromium no puede inicializarse con proxy  
**Solución más común:** Descargar Chromium sin proxy primero
