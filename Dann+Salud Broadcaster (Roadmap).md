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
- [ ] Probar conexión MongoDB local (`mongosh`, crear DB y colección de prueba)  
- [ ] Crear **repositorio Git** del proyecto (local + remoto en GitHub/GitLab)  
- [ ] Clonar proyecto en el entorno de desarrollo  
- [ ] Instalar dependencias iniciales del proyecto (`npm install`)  

---

## **Capítulo 2: Backend base con Node.js + Express**
✅ Objetivo: Crear el esqueleto del backend.  

### Checklist
- [ ] Inicializar proyecto (`npm init -y`)  
- [ ] Instalar dependencias básicas:  
  - `express` → servidor web  
  - `mongoose` → conexión MongoDB  
  - `dotenv` → manejo de variables de entorno  
  - `nodemon` (dev) → recarga automática  
- [ ] Crear estructura de carpetas:  
  ```
  /src
   ├── server.js
   ├── config/
   ├── models/
   ├── routes/
   └── controllers/
  ```  
- [ ] Configurar **servidor Express básico** (endpoint `/ping`)  
- [ ] Conectar backend a **MongoDB local**  
- [ ] Probar endpoint con **Postman**  

---

## **Capítulo 3: Modelo de datos y lógica de negocio**
✅ Objetivo: Definir cómo se guardará la información.  

### Checklist
- [ ] Definir colecciones necesarias:  
  - `users` (usuarios del sistema)  
  - `contacts` (contactos destino de mensajes)  
  - `messages` (mensajes enviados y recibidos)  
  - `logs` (errores, eventos importantes)  
- [ ] Crear modelos Mongoose para cada colección  
- [ ] Implementar controladores y rutas básicas:  
  - `/users` → CRUD  
  - `/contacts` → CRUD  
  - `/messages` → CRUD  
- [ ] Probar cada ruta con **Postman**  
- [ ] Validar entradas con `express-validator` (opcional)  

---

## **Capítulo 4: Integración con WhatsApp API**
✅ Objetivo: Poder enviar y recibir mensajes reales.  

### Checklist
- [ ] Seleccionar API gratuita/rápida (ej: `whatsapp-web.js` o proveedor gratuito)  
- [ ] Configurar autenticación (QR, token o key según API)  
- [ ] Implementar envío de mensaje de prueba desde backend  
- [ ] Implementar recepción de mensajes (listener/webhook)  
- [ ] Guardar mensajes en MongoDB  
- [ ] Probar flujo completo con Postman (enviar → recibir → guardar)  

---

## **Capítulo 5: Frontend básico (opcional, React o similar)**
✅ Objetivo: Tener una interfaz mínima para operar.  

### Checklist
- [ ] Crear proyecto frontend (ej: `create-react-app`)  
- [ ] Pantalla de login (si aplica)  
- [ ] Pantalla para enviar mensajes  
- [ ] Pantalla para listar mensajes enviados/recibidos  
- [ ] Conexión con backend vía REST o WebSocket  
- [ ] Estilos básicos (Tailwind/Bootstrap)  

---

## **Capítulo 6: Integración y pruebas completas**
✅ Objetivo: Validar todo el flujo y afinar detalles.  

### Checklist
- [ ] Flujo: Usuario → Frontend → Backend → WhatsApp → DB → Respuesta  
- [ ] Manejo de errores en backend  
- [ ] Logs de eventos críticos (ej: fallo de conexión, mensajes rechazados)  
- [ ] Pruebas unitarias simples (Jest o Mocha)  
- [ ] Documentar API con Swagger o Postman Collections  

---

## **Capítulo 7: Consolidación y despliegue**
✅ Objetivo: Subir el proyecto y dejarlo en producción.  

### Checklist
- [ ] Configurar variables de entorno (`.env`)  
- [ ] Crear build de frontend (si aplica)  
- [ ] Elegir plataforma de despliegue (Railway, Render, Vercel, etc.)  
- [ ] Desplegar backend conectado a MongoDB Atlas o servidor propio  
- [ ] Probar flujo en producción  
- [ ] Documentación final y checklist de entrega  

---

📌 **Nota operativa para ChatGPT:**  
Cada 10 mensajes (aprox.) se recomienda refrescar el **Capítulo actual + tareas pendientes**.  
