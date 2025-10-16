# Instrucciones de Despliegue - Dann+Salud Broadcaster

## Requisitos Previos
- MongoDB instalado en el servidor
- Node.js versión 14 o superior
- NPM versión 6 o superior

## Pasos para el Despliegue en Producción

### 1. Preparación del Entorno

El proyecto ya está configurado para producción con:
- Configuración CORS para redes WiFi de la oficina (192.168.1.* y 192.168.2.*)
- Optimización de MongoDB para entorno local
- Manejo de errores mejorado
- Desactivación de usuario auditor por defecto en producción

### 2. Creación de Usuarios de Producción

Ejecuta el script para crear usuarios administradores y auditores:

```
cd "Dann+Salud Online (DEV)"
node scripts/createProdUsers.js
```

Este script te guiará para crear:
- Un usuario administrador (obligatorio)
- Un usuario auditor (opcional)

### 3. Iniciar el Servidor

Simplemente ejecuta el archivo batch incluido:

```
start-production.bat
```

Este script:
- Verifica que MongoDB esté instalado
- Comprueba si MongoDB está en ejecución
- Instala dependencias si es necesario
- Inicia el servidor en modo producción

### 4. Acceso a la Aplicación

Una vez iniciado, accede desde cualquier dispositivo en la red usando:
- `http://[IP-DEL-SERVIDOR]:5000`

Por ejemplo, si la IP del servidor es 192.168.1.74:
- `http://192.168.1.74:5000`

## Notas Importantes

1. **Seguridad**:
   - El usuario auditor de prueba ha sido deshabilitado en producción
   - Las contraseñas deben tener al menos 8 caracteres
   - Los tokens JWT expiran después de 8 horas

2. **Mantenimiento**:
   - Los logs de errores se registran con identificadores únicos para facilitar el seguimiento
   - La conexión a MongoDB está optimizada para entorno local

3. **Solución de Problemas**:
   - Si MongoDB no está en ejecución, el script intentará iniciarlo
   - Si hay problemas de conexión, verifica que MongoDB esté instalado y funcionando
   - Para problemas de CORS, verifica que estás accediendo desde una red permitida

## Contacto para Soporte

Para cualquier problema durante el despliegue, contacta al equipo de desarrollo.