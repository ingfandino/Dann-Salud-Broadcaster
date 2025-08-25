# 📦 Proyecto: Aplicación de Mensajería Masiva con WhatsApp (whatsapp-web.js)

## 🛠️ Stack Tecnológico

### Backend

-   **Node.js** (runtime principal).
-   **Express.js** (API y servidor local).
-   **whatsapp-web.js** (sesión, QR, envío de mensajes, respuestas).
-   **xlsx** / **exceljs** + **csv-parser** (lectura de `.csv`, `.xls`,
    `.xlsx`).
-   **fs** + **jsonfile** (persistencia de plantillas, logs y config).
-   **pkg** (para empaquetar ejecutables).

### Frontend

-   **React + Vite** (SPA rápida y modular).
-   **TailwindCSS** (estilos modernos).
-   **shadcn/ui** (componentes preconstruidos).
-   **framer-motion** (animaciones).
-   **Recharts** (métricas gráficas).

### Distribución

-   App local que levanta servidor en `http://localhost:3000`.
-   Cada usuario vincula su **propia cuenta de WhatsApp**.

------------------------------------------------------------------------

## 🎯 Objetivos

1.  Escalabilidad individual (cada usuario maneja su WhatsApp).
2.  Estabilidad con sesiones persistentes.
3.  Compatibilidad total vía ejecutable único.
4.  UI/UX limpia, moderna y sencilla.

------------------------------------------------------------------------

## 🧩 Funcionalidades

### 🔐 Sesión

-   Generar QR para vinculación.
-   Guardar sesión local.
-   **Cerrar sesión** y **Reiniciar sesión**.

### 📂 Archivos

-   Soporte para `.csv`, `.xls`, `.xlsx`.
-   Mostrar cantidad de afiliados.
-   Botones dinámicos según encabezados.

### ✍️ Mensajes

-   Cuadro de texto principal.
-   Formatos: **Negrita**, *Cursiva*, Emojis.
-   **Spintax** para variantes.
-   Vista previa de mensajes.
-   Guardar/borrar **plantillas**.

### 🤖 Respuesta Automática

-   Cuadro de texto para respuesta.
-   Validación contra archivo cargado.
-   Guardado de configuración.

### ⚙️ Parámetros de Envío

-   Delay aleatorio (min--max segundos).
-   Envíos en **lotes** con descanso en minutos.
-   Horario de inicio (opcional).
-   Controles: **Iniciar**, **Cancelar**, **Detener**, **Reanudar**.

### 📊 Métricas y Notificaciones

-   Métricas en tiempo real: pendientes, exitosos, fallidos, duración.
-   Toasters dinámicos (verde/rojo/amarillo).
-   Log de sucesos persistente.

### 📑 Reporte Final

-   Generar `.xls` con:
    -   Números contactados\
    -   Estado (exitoso/fallido)\
    -   Respuesta (sí/no).

------------------------------------------------------------------------

## 🎨 UI/UX

-   Colores de WhatsApp.
-   Botones redondeados y secciones bien separadas.
-   Fuente legible y profesional.
-   Toasts diferenciados por tipo.
-   Spinners de carga para lotes.
