# Plan de Implementación - Correcciones de Auditoría

Este plan detalla los pasos para aplicar las correcciones identificadas en el informe de auditoría.

## Backend

### Seguridad y Corrección de Bugs
1.  **Ocultar Token de Recuperación (`backend/src/controllers/authController.js`)**
    *   Modificar `forgotPassword` para no devolver `resetToken` en la respuesta JSON en producción.
2.  **Mitigar Inyección Regex (`backend/src/controllers/auditController.js`)**
    *   Crear utilidad `escapeRegex` en `backend/src/utils/stringUtils.js`.
    *   Aplicar `escapeRegex` a todos los filtros de búsqueda en `auditController.js`.
3.  **Mitigar Condición de Carrera (`backend/src/controllers/auditController.js`)**
    *   Mejorar la lógica de reserva de turnos. Dado que MongoDB no tiene bloqueos de fila simples sin transacciones (y no sabemos si es una réplica set), intentaremos minimizar la ventana de tiempo o usar una operación atómica si es viable. De lo contrario, agregaremos una verificación doble.
4.  **Habilitar CSP y Limpieza (`backend/src/server.js`)**
    *   Configurar `helmet` con una CSP permisiva pero segura.
    *   Eliminar rutas hardcodeadas de Windows.
    *   Desactivar `syncIndexes` automático en cada inicio (mover a script o flag).

### Limpieza de Dependencias
5.  **Eliminar Dependencia WhatsApp No Usada (`backend/package.json`)**
    *   Confirmar cuál se usa (`baileys` vs `whatsapp-web.js`) y eliminar la otra.
    *   **Confirmado**: Se usa `whatsapp-web.js`. Eliminar `@whiskeysockets/baileys`.

## Frontend

### Seguridad y Configuración
1.  **Sanitización HTML (`frontend/src/pages/BulkMessages.jsx`)**
    *   Instalar `dompurify`.
    *   Reemplazar función manual `escapeHtml` por `DOMPurify.sanitize`.
2.  **Configuración HTTPS (`frontend/src/config.js`)**
    *   Modificar `normalizeApiUrl` para respetar el protocolo actual o permitir HTTPS.
3.  **Manejo de Errores 401 (`frontend/src/services/api.js`)**
    *   Implementar redirección a `/login` o limpieza de localStorage en el interceptor 401.

## Verificación
*   Verificar que el login y recuperación de contraseña sigan funcionando.
*   Verificar que la búsqueda de auditorías funcione correctamente con caracteres especiales.
*   Verificar que la aplicación cargue correctamente (CSP no bloqueante).
