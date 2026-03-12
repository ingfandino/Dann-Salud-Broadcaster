# Implementación de Interfaz de Contabilidad

## Resumen
Se implementó una interfaz completa de gestión de gastos mensuales con acceso exclusivo para roles **Gerencia** y **Encargado**.

---

## Backend - Archivos Creados

### 1. Modelo de Gastos
**Archivo:** `backend/src/models/Expense.js`

**Campos principales:**
- `fecha`: Fecha del gasto (requerido, indexado)
- `categoria`: Categoría del gasto (enum: Salarios, Servicios, Marketing, Tecnología, Oficina, Transporte, Capacitación, Legal, Impuestos, Otros)
- `descripcion`: Descripción del gasto (requerido)
- `monto`: Monto del gasto (requerido, mínimo 0)
- `metodoPago`: Método de pago (enum: Efectivo, Transferencia, Tarjeta de Crédito, Tarjeta de Débito, Cheque)
- `responsable`: Usuario responsable (referencia a User, requerido)
- `notas`: Notas opcionales
- `createdBy`: Usuario que creó el registro
- `updatedBy`: Usuario que actualizó el registro
- `deletedAt`: Soft delete (null = activo)

**Índices:** fecha, categoria, responsable, createdBy, deletedAt

---

### 2. Controlador de Gastos
**Archivo:** `backend/src/controllers/expenseController.js`

**Endpoints implementados:**
- `getAllExpenses()`: Lista gastos con filtros (mes, año, categoría, búsqueda)
- `getExpenseById()`: Obtiene un gasto específico
- `createExpense()`: Crea nuevo gasto con validaciones
- `updateExpense()`: Actualiza gasto existente
- `deleteExpense()`: Soft delete de gasto
- `getExpenseStats()`: Estadísticas completas (mes actual, trimestre, variación, tendencias)

**Estadísticas calculadas:**
- Total del mes actual
- Total del trimestre actual
- Total del mes anterior
- Variación mes a mes (%)
- Gastos por categoría (mes actual)
- Tendencia mensual (últimos 6 meses)

---

### 3. Rutas de API
**Archivo:** `backend/src/routes/expenses.js`

**Middleware:** Requiere autenticación + rol Gerencia o Encargado

**Rutas:**
- `GET /api/expenses` - Lista de gastos con filtros
- `GET /api/expenses/stats` - Estadísticas completas
- `GET /api/expenses/:id` - Gasto específico
- `POST /api/expenses` - Crear gasto
- `PUT /api/expenses/:id` - Actualizar gasto
- `DELETE /api/expenses/:id` - Eliminar gasto (soft delete)

---

### 4. Integración en Rutas Principales
**Archivo:** `backend/src/routes/index.js`

Agregado:
```javascript
const expenseRoutes = require("./expenses");
router.use("/expenses", expenseRoutes);
```

---

## Frontend - Archivos Creados

### 1. Componente Principal de Contabilidad
**Archivo:** `frontend-nextjs/components/dashboard/contabilidad.tsx`

**Funcionalidades implementadas:**

#### Panel de Métricas
- **Gasto del Mes**: Total mensual con ícono de dólar
- **Gasto del Trimestre**: Total trimestral
- **Registros del Mes**: Contador de gastos
- **Variación**: Comparación con mes anterior (% con indicador visual)

#### Gráfica de Tendencias
- Gráfico de línea con Chart.js
- Últimos 6 meses de gastos
- Adaptado a tema claro/oscuro
- Tooltips con formato de moneda

#### Filtros Avanzados
- Búsqueda por texto (descripción/notas)
- Filtro por mes
- Filtro por año (últimos 5 años)
- Filtro por categoría

#### Tabla de Gastos
- Columnas: Fecha, Categoría, Descripción, Monto, Responsable, Acciones
- Badges de categoría con colores
- Botones de editar y eliminar
- Formato de moneda argentino (ARS)
- Responsive con scroll horizontal

#### Modal de Formulario
- Campos: Fecha, Categoría, Monto, Método de Pago, Responsable, Descripción, Notas
- Validaciones en tiempo real
- Modo crear/editar
- Selector de usuarios para responsable
- Animaciones suaves

#### Frases Motivacionales
- Rotación diaria automática
- 10 frases de economistas y empresarios reconocidos
- Diseño elegante y no intrusivo
- Integrado en el header con gradiente

**Características UX:**
- Animaciones y transiciones suaves
- Microinteracciones en botones
- Feedback visual al guardar
- Confirmación antes de eliminar
- Tema claro/oscuro completo
- Totalmente responsive

---

### 2. Página de Contabilidad
**Archivo:** `frontend-nextjs/app/dashboard/contabilidad/page.tsx`

**Control de acceso:**
- Verifica rol del usuario
- Solo permite acceso a Gerencia y Encargado
- Redirección automática si no tiene permisos
- Loading state mientras verifica autenticación

---

### 3. Integración en Sidebar
**Archivo:** `frontend-nextjs/components/dashboard/sidebar.tsx`

**Cambios:**
- Agregado ícono `Wallet` de Lucide
- Nuevo item de menú: "Contabilidad"
- Visible para roles Gerencia y Encargado
- Posicionado antes de "Gestión de Usuarios"

---

### 4. Integración en Dashboard Layout
**Archivo:** `frontend-nextjs/app/dashboard/layout.tsx`

**Cambios:**
- Agregado mapeo de ruta: `'contabilidad': '/dashboard/contabilidad'`
- Componente cargado dinámicamente en sectionComponents

---

## Categorías de Gastos

1. **Salarios** - Sueldos y compensaciones
2. **Servicios** - Servicios contratados (hosting, utilities, etc.)
3. **Marketing** - Publicidad y promoción
4. **Tecnología** - Software, hardware, licencias
5. **Oficina** - Suministros y equipamiento
6. **Transporte** - Viáticos y movilidad
7. **Capacitación** - Formación y desarrollo
8. **Legal** - Asesoría legal y trámites
9. **Impuestos** - Obligaciones fiscales
10. **Otros** - Gastos varios

---

## Métodos de Pago

1. Efectivo
2. Transferencia
3. Tarjeta de Crédito
4. Tarjeta de Débito
5. Cheque

---

## Frases Motivacionales

1. "El éxito no es la clave de la felicidad. La felicidad es la clave del éxito." - Albert Schweitzer
2. "No cuentes los días, haz que los días cuenten." - Muhammad Ali
3. "El dinero es solo una herramienta. Te llevará a donde desees, pero no te reemplazará como conductor." - Ayn Rand
4. "La riqueza consiste mucho más en el disfrute que en la posesión." - Aristóteles
5. "No ahorres lo que te queda después de gastar, gasta lo que te queda después de ahorrar." - Warren Buffett
6. "El precio es lo que pagas. El valor es lo que obtienes." - Warren Buffett
7. "La inversión en conocimiento paga el mejor interés." - Benjamin Franklin
8. "El éxito es la suma de pequeños esfuerzos repetidos día tras día." - Robert Collier
9. "No esperes. El momento nunca será el perfecto." - Napoleon Hill
10. "La disciplina es el puente entre metas y logros." - Jim Rohn

---

## Tecnologías Utilizadas

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Middleware de autenticación y autorización

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Chart.js + react-chartjs-2
- Lucide Icons
- Sonner (toasts)
- Zustand (state management)

---

## Características de Seguridad

✅ **Autenticación requerida**: Todos los endpoints protegidos con JWT
✅ **Autorización por rol**: Solo Gerencia y Encargado tienen acceso
✅ **Validaciones backend**: Campos requeridos, tipos de datos, rangos
✅ **Validaciones frontend**: Feedback inmediato al usuario
✅ **Soft delete**: Los registros no se eliminan físicamente
✅ **Auditoría**: Registro de quién creó/actualizó cada gasto

---

## Características de UX/UI

✅ **Tema claro/oscuro**: Adaptación completa a ambos modos
✅ **Responsive**: Funciona en móvil, tablet y desktop
✅ **Animaciones suaves**: Transiciones y microinteracciones
✅ **Feedback visual**: Confirmaciones, errores, loading states
✅ **Formato de moneda**: Pesos argentinos (ARS) sin decimales
✅ **Filtros avanzados**: Búsqueda, mes, año, categoría
✅ **Gráficas interactivas**: Tooltips, hover effects
✅ **Frases motivacionales**: Rotación diaria automática

---

## Acciones Requeridas

### 1. Reiniciar Backend
```bash
cd /home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend
pm2 restart dann-salud-backend
```

O si usas nodemon, se reiniciará automáticamente.

### 2. Verificar Roles de Usuario
Asegurarse de que existan usuarios con roles:
- `gerencia`
- `encargado`

Desde la interfaz de Gestión de Usuarios (AdminUsers), verificar o crear usuarios con estos roles.

### 3. Probar la Interfaz
1. Iniciar sesión con usuario Gerencia o Encargado
2. Navegar a "Contabilidad" en el sidebar
3. Crear un gasto de prueba
4. Verificar métricas y gráficas
5. Probar filtros y búsqueda
6. Editar y eliminar registros

---

## Resultado Final

✅ **Backend completo**: Modelo, controlador, rutas, validaciones
✅ **Frontend completo**: Componente, página, integración
✅ **Control de acceso**: Solo Gerencia y Encargado
✅ **Métricas avanzadas**: Mes, trimestre, variación, tendencias
✅ **Gráficas interactivas**: Chart.js con tema adaptativo
✅ **CRUD completo**: Crear, leer, actualizar, eliminar
✅ **Filtros avanzados**: Búsqueda, mes, año, categoría
✅ **UX pulida**: Animaciones, feedback, responsive
✅ **Frases motivacionales**: Rotación diaria elegante
✅ **Tema adaptativo**: Claro/oscuro completo

---

## Estructura de Archivos

```
backend/src/
├── models/Expense.js (NUEVO)
├── controllers/expenseController.js (NUEVO)
├── routes/
│   ├── expenses.js (NUEVO)
│   └── index.js (MODIFICADO)

frontend-nextjs/
├── components/dashboard/
│   ├── contabilidad.tsx (NUEVO)
│   └── sidebar.tsx (MODIFICADO)
├── app/dashboard/
│   ├── contabilidad/
│   │   └── page.tsx (NUEVO)
│   └── layout.tsx (MODIFICADO)
```

---

## Notas Importantes

1. **Soft Delete**: Los gastos eliminados no se borran de la base de datos, solo se marcan con `deletedAt`
2. **Auditoría**: Cada gasto registra quién lo creó y quién lo modificó
3. **Validaciones**: El monto debe ser mayor a 0, todos los campos requeridos deben completarse
4. **Formato de Moneda**: Se usa el formato argentino (ARS) sin decimales
5. **Frases Diarias**: La frase cambia automáticamente cada día según el día del año
6. **Gráficas**: Se muestran los últimos 6 meses de gastos en formato de línea

---

## Mantenimiento Futuro

### Posibles Mejoras
- Exportación a Excel/PDF
- Presupuestos mensuales con alertas
- Comparación año a año
- Gráficas adicionales (torta por categoría, barras por método de pago)
- Adjuntar comprobantes/facturas
- Aprobación de gastos (workflow)
- Notificaciones de gastos importantes
- Dashboard ejecutivo con KPIs
