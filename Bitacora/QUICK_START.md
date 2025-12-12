# ⚡ Quick Start - Scripts Backend

## 🎯 Uso Rápido

### **Método 1: Menú Interactivo (Recomendado)**
```bash
./backend-manager.sh
```
![Menu interactivo con 6 opciones]

---

### **Método 2: Scripts Individuales**

```bash
# Reiniciar backend
./restart-backend.sh

# Ver logs en tiempo real
./logs-backend.sh

# Ver estado
./status-backend.sh

# Detener backend
./stop-backend.sh
```

---

## 📦 Scripts Creados

| Script | Descripción | Tamaño |
|--------|-------------|--------|
| `backend-manager.sh` | 🎛️ Menú interactivo | 1.5K |
| `restart-backend.sh` | 🔄 Reiniciar | 651B |
| `logs-backend.sh` | 📋 Ver logs | 145B |
| `status-backend.sh` | 📊 Ver estado | 293B |
| `stop-backend.sh` | 🛑 Detener | 326B |

---

## 🚀 Caso de Uso Más Común

**Después de hacer cambios en el código:**

```bash
./restart-backend.sh
```

Eso es todo. El script automáticamente:
1. ✅ Mata procesos en puerto 5000
2. ✅ Reinicia PM2
3. ✅ Muestra logs en tiempo real

---

## 🔧 Para Salir de los Logs

Presiona: **`Ctrl + C`**

---

## 📖 Documentación Completa

Lee: `SCRIPTS_README.md`

---

**¡Listo para usar!** 🎉
