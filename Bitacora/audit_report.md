# Informe de Auditoría de Código - Dann Salud Broadcaster

## Resumen Ejecutivo
Se ha realizado una inspección general del código fuente del proyecto (Backend Node.js + Frontend React/Vite). El sistema presenta una arquitectura MVC estándar y funcional. Sin embargo, se han identificado varios puntos de mejora en términos de seguridad, robustez y mantenibilidad.

A continuación se detallan los hallazgos clasificados por severidad y componente.

---

## 1. Backend (`/backend`)

### 🔴 Crítico / Alta Prioridad

1.  **Exposición de Token de Recuperación de Contraseña**
    *   **Archivo**: `src/controllers/authController.js` (Línea 93)
    *   **Problema**: En el endpoint `forgotPassword`, si la configuración SMTP falla o no se detecta (`!hasSmtpConfig()`), el token de recuperación se devuelve en la respuesta JSON.
    *   **Riesgo**: En un entorno de producción donde el servicio de correo falle momentáneamente, un atacante podría solicitar un reset de contraseña para cualquier usuario y obtener el token directamente de la API para secuestrar la cuenta.
    *   **Recomendación**: Nunca devolver el token en la respuesta en producción. Si el email falla, devolver un error 500 o un mensaje genérico, pero no el token.

2.  **Inyección de Expresiones Regulares (Regex Injection)**
    *   **Archivo**: `src/controllers/auditController.js` (Líneas 208, 210, 212, etc.)
    *   **Problema**: Se utilizan valores de `req.query` directamente en expresiones regulares de MongoDB sin escapar caracteres especiales (e.g., `filter.nombre = { $regex: afiliado, $options: "i" }`).
    *   **Riesgo**: Un usuario malintencionado podría enviar caracteres especiales de regex (como `*`, `(`, `|`) para alterar la lógica de búsqueda o causar un consumo excesivo de CPU (ReDoS).
    *   **Recomendación**: Utilizar una función de escape para los inputs del usuario antes de pasarlos a `$regex` (ej. `function escapeRegex(text) { return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); }`).

3.  **Condición de Carrera en Reserva de Turnos**
    *   **Archivo**: `src/controllers/auditController.js` (Líneas 83-87)
    *   **Problema**: La verificación de cupos (`count >= 10`) y la creación de la auditoría no son atómicas.
    *   **Riesgo**: Si dos o más solicitudes llegan simultáneamente cuando hay 9 cupos ocupados, ambas podrían leer que hay espacio y guardar, excediendo el límite de 10.
    *   **Recomendación**: Utilizar transacciones de MongoDB o una operación atómica de actualización (ej. `findOneAndUpdate` con condición de query) para reservar el cupo.

### 🟡 Media Prioridad

4.  **Política de Seguridad de Contenido (CSP) Deshabilitada**
    *   **Archivo**: `src/server.js` (Línea 172)
    *   **Problema**: `helmet` se configura con `contentSecurityPolicy: false`.
    *   **Riesgo**: Reduce la protección contra ataques XSS (Cross-Site Scripting).
    *   **Recomendación**: Configurar una CSP adecuada que permita los recursos necesarios en lugar de deshabilitarla completamente.

5.  **Rutas Hardcodeadas y Dependencia de Sistema Operativo**
    *   **Archivo**: `src/server.js` (Líneas 248-249)
    *   **Problema**: Existen rutas absolutas de Windows hardcodeadas (`C:/Users/Daniel/...`).
    *   **Riesgo**: Dificulta el despliegue en otros entornos o servidores Linux/Docker y ensucia el código.
    *   **Recomendación**: Eliminar estas rutas y confiar únicamente en variables de entorno o rutas relativas.

6.  **Dependencias de WhatsApp Mixtas**
    *   **Archivo**: `package.json`
    *   **Problema**: Se incluyen tanto `whatsapp-web.js` como `@whiskeysockets/baileys`.
    *   **Riesgo**: Aumenta el tamaño del proyecto y la superficie de ataque. Puede haber código muerto.
    *   **Recomendación**: Verificar cuál librería está en uso activo y eliminar la otra.

### 🟢 Baja Prioridad / Optimización

7.  **Sincronización de Índices al Inicio**
    *   **Archivo**: `src/server.js` (Líneas 44-87)
    *   **Observación**: Se llama a `syncIndexes()` en cada inicio. En bases de datos grandes, esto puede ralentizar el arranque.
    *   **Recomendación**: Ejecutar la sincronización de índices solo en scripts de migración o despliegue, no en cada reinicio de la aplicación.

---

## 2. Frontend (`/frontend`)

### 🟡 Media Prioridad

1.  **Almacenamiento de Token en LocalStorage**
    *   **Archivo**: `src/services/api.js` (Línea 16)
    *   **Problema**: El JWT se almacena en `localStorage`.
    *   **Riesgo**: Vulnerable a robo de sesión mediante XSS. Cualquier script malicioso que se ejecute en el navegador puede leer `localStorage`.
    *   **Recomendación**: Almacenar el token en una cookie `httpOnly` y `secure`, o mantenerlo en memoria (con un mecanismo de refresh token).

2.  **Forzado de HTTP en Configuración**
    *   **Archivo**: `src/config.js` (Línea 48)
    *   **Problema**: La función `normalizeApiUrl` fuerza el protocolo a `http:`.
    *   **Riesgo**: Impide el uso de HTTPS en producción, exponiendo los datos (incluyendo credenciales) a intercepción.
    *   **Recomendación**: Respetar el protocolo definido en la variable de entorno o detectar el protocolo de la ventana (`window.location.protocol`).

3.  **Manejo de Errores 401 Incompleto**
    *   **Archivo**: `src/services/api.js` (Línea 29)
    *   **Problema**: El interceptor de respuesta detecta el error 401 pero el bloque `if` está vacío.
    *   **Riesgo**: El usuario puede quedar en un estado inconsistente cuando su sesión expira, sin ser redirigido al login.
    *   **Recomendación**: Implementar la redirección al login o la limpieza del estado de sesión dentro del interceptor.

4.  **Sanitización Manual de HTML**
    *   **Archivo**: `src/pages/BulkMessages.jsx` (Línea 553)
    *   **Problema**: Se utiliza una función propia `escapeHtml` antes de `dangerouslySetInnerHTML`.
    *   **Riesgo**: Las implementaciones manuales de sanitización suelen tener casos borde no cubiertos.
    *   **Recomendación**: Utilizar una librería probada como `dompurify` para sanitizar el HTML antes de renderizarlo.

---

## 3. Recomendaciones Generales

*   **Variables de Entorno**: Asegurar que `PROTECT_UPLOADS` esté en `true` en producción para evitar el acceso público no autorizado a los archivos subidos.
*   **Logging**: Revisar que no se estén logueando datos sensibles (como contraseñas o tokens) en los logs de producción.
*   **Testing**: Aumentar la cobertura de tests unitarios, especialmente para los controladores críticos como `authController` y `auditController`.
