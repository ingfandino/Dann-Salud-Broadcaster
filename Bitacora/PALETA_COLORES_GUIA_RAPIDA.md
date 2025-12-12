# 🎨 Guía Rápida - Nueva Paleta de Colores

## Colores Principales

```
🔵 Azul Brillante   #009FC2   (Principal)
🔷 Azul Océano      #0078A0   (Secundario)
🟣 Violeta Claro    #C76CF5   (Acentos)
🩷 Fucsia Suave     #E13BEA   (Alertas)
⬛ Fondo Oscuro     #081E33   (Dark)
```

---

## Uso Rápido en Código

### Botones

```jsx
// Principal (Azul Océano)
<button className="bg-blue-600 hover:bg-blue-700 text-white">
  Acción Principal
</button>

// Secundario (Violeta)
<button className="bg-purple-500 hover:bg-purple-600 text-white">
  Acción Secundaria
</button>

// Alerta/Importante (Fucsia)
<button className="bg-pink-500 hover:bg-pink-600 text-white">
  ¡Importante!
</button>
```

### Fondos

```jsx
<div className="bg-primary">...</div>      // Azul Brillante
<div className="bg-secondary">...</div>    // Azul Océano
<div className="bg-accent">...</div>       // Fucsia
<div className="bg-dark">...</div>         // Oscuro
```

### Textos

```jsx
<p className="text-primary">...</p>        // Azul Brillante
<p className="text-secondary">...</p>      // Azul Océano
<p className="text-accent">...</p>         // Fucsia
```

### Gradientes

```jsx
<div className="bg-gradient-1">...</div>   // Azul → Violeta
<div className="bg-gradient-2">...</div>   // Azul Océano → Azul Brillante
<div className="bg-gradient-3">...</div>   // Fucsia → Violeta
<div className="bg-gradient-4">...</div>   // Azul Brillante → Fucsia
<div className="bg-gradient-dark">...</div>// Oscuro → Azul Océano
```

---

## Escala de Tonos

### Blue (Azul)
```
50  #E6F7FB  ░░░░░░░░░░
100 #CCEFF7  ░░░░░░░░
200 #99DFEF  ░░░░░░
300 #66CFE7  ░░░░
400 #33BFDF  ░░
500 #009FC2  ██  ← PRINCIPAL
600 #0078A0  ████ ← SECUNDARIO
700 #00608B  ██████
800 #004876  ████████
900 #003061  ██████████
```

### Purple (Violeta)
```
50  #F9F0FE  ░░░░░░░░░░
100 #F3E1FD  ░░░░░░░░
200 #E7C3FB  ░░░░░░
300 #DBA5F9  ░░░░
400 #CF87F7  ░░
500 #C76CF5  ██  ← PRINCIPAL
600 #B556E3  ████
700 #A340D1  ██████
800 #8C2AAF  ████████
900 #75148D  ██████████
```

### Pink (Fucsia)
```
50  #FDF0F8  ░░░░░░░░░░
100 #FBE1F1  ░░░░░░░░
200 #F7C3E3  ░░░░░░
300 #F3A5D5  ░░░░
400 #EF87C7  ░░
500 #E13BEA  ██  ← PRINCIPAL
600 #D325D7  ████
700 #C50FC4  ██████
800 #A70FA6  ████████
900 #890F88  ██████████
```

---

## Ejemplos Visuales

### Card con Header
```jsx
<div className="bg-white rounded-lg shadow-lg overflow-hidden">
  <div className="bg-gradient-1 p-4 text-white">
    <h2 className="text-xl font-bold">Título</h2>
  </div>
  <div className="p-4">
    <p>Contenido del card</p>
  </div>
</div>
```

### Badge/Etiqueta
```jsx
<span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">
  Nuevo
</span>
```

### Alert
```jsx
<div className="bg-pink-100 border-l-4 border-pink-500 p-4">
  <p className="text-pink-700">¡Atención! Mensaje importante</p>
</div>
```

### Link
```jsx
<a href="#" className="text-blue-600 hover:text-blue-700 underline">
  Ver más
</a>
```

---

## Cheat Sheet

| Necesito | Uso |
|----------|-----|
| Botón principal | `bg-blue-600` |
| Botón secundario | `bg-purple-500` |
| Botón de alerta | `bg-pink-500` |
| Fondo oscuro | `bg-gray-900` |
| Texto destacado | `text-blue-600` |
| Link | `text-blue-600 hover:text-blue-700` |
| Badge importante | `bg-pink-500 text-white` |
| Badge info | `bg-blue-500 text-white` |
| Card header | `bg-gradient-1` |
| Hover azul | `hover:bg-blue-700` |
| Hover violeta | `hover:bg-purple-600` |

---

## 🚨 Recordatorios

- ✅ Siempre usar clases de Tailwind (no hex codes)
- ✅ Mantener consistencia en toda la app
- ✅ `bg-blue-600` = Azul Océano (principal)
- ✅ `bg-purple-500` = Violeta Claro (acentos)
- ✅ `bg-pink-500` = Fucsia (alertas)
- ✅ Rebuild después de cambios: `npm run build`

---

**Ver documentación completa**: `NUEVA_PALETA_DE_COLORES.md`
