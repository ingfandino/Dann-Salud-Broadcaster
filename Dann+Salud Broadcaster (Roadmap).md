# 📘 Roadmap de Desarrollo — Dann+Salud Broadcaster

## **Capítulo 1: Instalación de ambiente de desarrollo full stack**
✅ Objetivo: Dejar el ordenador con todas las herramientas listas y probadas.

### Checklist
- [x] Instalar **Node.js + npm**
- [x] Instalar **Git**
- [x] Instalar **VS Code** (y Visual Studio Community opcional)
- [x] Instalar **Postman**
- [x] Instalar **Navegador** (Chrome recomendado)
- [x] Instalar **MongoDB Server** (verificar con `mongod --version`)
- [x] Instalar **MongoDB Shell (mongosh)** (verificar con `mongosh --version`)
- [x] Probar conexión MongoDB local (`mongosh`, crear DB y colección de prueba)
- [x] Crear **repositorio Git** del proyecto (local + remoto en GitHub/GitLab)
- [x] Clonar proyecto en el entorno de desarrollo
- [x] Instalar dependencias iniciales del proyecto (`npm install`)

---

## **Capítulo 2: Backend base con Node.js + Express**
✅ Objetivo: Crear el esqueleto del backend.

### Checklist
- [x] Inicializar proyecto (`npm init -y`)
- [x] Instalar dependencias básicas:
  - `express` → servidor web
  - `mongoose` → conexión MongoDB
  - `dotenv` → manejo de variables de entorno
  - `nodemon` (dev) → recarga automática
- [x] Crear estructura de carpetas:
  ```
  /src
   ├── server.js
   ├── config/
   ├── models/
   ├── routes/
   └── controllers/
  ```
- [x] Configurar **servidor Express básico** (endpoint `/ping`)
- [x] Conectar backend a **MongoDB local**
- [x] Probar endpoint con **Postman**

---

## **Capítulo 3: Modelo de datos y lógica de negocio**
✅ Objetivo: Definir cómo se guardará la información.

### Checklist
- [x] Definir colecciones necesarias:
  - `users` (usuarios del sistema)
  - `contacts` (contactos destino de mensajes)
  - `messages` (mensajes enviados y recibidos)
  - `logs` (errores, eventos importantes)
- [x] Crear modelos Mongoose para cada colección
- [x] Implementar controladores y rutas básicas:
  - `/users` → CRUD
  - `/contacts` → CRUD
  - `/messages` → CRUD
- [x] Probar cada ruta con **Postman**
- [x] Validar entradas con `express-validator` (opcional)

---

## **Capítulo 4: Integración con WhatsApp API**
✅ Objetivo: Poder enviar y recibir mensajes reales.

### Checklist
- [x] Seleccionar API (`whatsapp-web.js`)
- [x] Configurar autenticación con **QR** (Req. 1)
- [x] Enviar mensaje de prueba (Req. 4)
- [x] Listener para recepción de mensajes (Req. 13)
- [x] Guardar mensajes recibidos en MongoDB (Req. 14)
- [x] Validar números Argentina (Req. 3 ya cumplido en validator)

---

## **Capítulo 5: Funcionalidades de Mensajería Avanzada**
✅ Objetivo: Cubrir los requisitos del **2 al 22**.

### Checklist
- [x] **CSV/XLSX import** de contactos (Req. 2)
- [x] Cuadro de texto enriquecido con placeholders `{{campo}}` (Req. 4)
- [x] Botones de **negrita/cursiva** (Req. 5–6)
- [x] Caja de **emojis** con buscador (Req. 7)
- [x] **Spintax parser** `{a|b|c}` (Req. 8)
- [x] Vista previa mensaje (Req. 9)
- [x] CRUD de **plantillas** de mensajes (Req. 10–11)
- [x] Botones dinámicos con headers detectados (Req. 12)
- [x] Auto-respuesta validada (Req. 13–14)
- [x] Envíos con **delay aleatorio** entre mensajes (Req. 15)
- [x] Envío en **lotes + descanso** entre lotes (Req. 16)
- [x] Controles de **Iniciar/Cancelar/Detener/Reanudar** (Req. 17–20)
- [x] Programar envíos con **fecha/hora** (Req. 21)
- [x] **Métricas en tiempo real** (WebSocket: pendientes, éxito, fallos, ETA) (Req. 22)

---

## **Capítulo 6: Notificaciones y Logs**
✅ Objetivo: Requisitos **23–24**

### Checklist
- [ ] **Toasts dinámicos** en frontend (Req. 23)
- [x] **Log persistente** de sucesos en BD con exportación (Req. 24)

---

## **Capítulo 7: Sesión y Seguridad**
✅ Objetivo: Requisitos **25–26**

### Checklist
- [x] Cerrar sesión (revocar token, desconectar) (Req. 25)
- [x] Reiniciar sesión (re-vincular QR/cliente) (Req. 26)

---

## **Capítulo 8: Exportación final de resultados**
✅ Objetivo: Requisito **27**

### Checklist
- [ ] Generar **.xls** con resultados finales (éxitos, fallos, métricas) (Req. 27)

---

## **Capítulo 9: Frontend Básico (React + Tailwind)**
✅ Objetivo: Interfaz mínima.

### Checklist
- [ ] Login básico (si aplica)
- [ ] Panel para importar contactos y ver headers detectados
- [ ] Editor de mensaje (con negrita/cursiva/emojis/spintax)
- [ ] Vista previa mensaje por contacto
- [ ] Panel de envío (batch, horarios, estado)
- [ ] Panel de métricas (WebSocket)
- [ ] Logs y exportaciones

---

## **Capítulo 10: Integración y despliegue**
✅ Objetivo: Validar todo el flujo y preparar producción.

### Checklist
- [ ] Flujo completo: CSV → Previsualizar → Enviar → WhatsApp → Guardar → Exportar
- [ ] Manejo de errores robusto
- [ ] Documentar API (Swagger/Postman)
- [ ] Configuración `.env`
- [ ] Deploy (Railway/Render con MongoDB Atlas)
- [ ] Pruebas en producción