# 🛠️ Scripts de Utilidad - Dann Salud Backend

Scripts para gestionar fácilmente el backend del sistema.

---

## 📋 **Scripts Disponibles**

### 1. **`./restart-backend.sh`** - Reiniciar Backend
```bash
./restart-backend.sh
```
- ✅ Detiene procesos en puerto 5000
- ✅ Reinicia PM2 (dann-salud-backend)
- ✅ Muestra estado y logs en tiempo real

**Cuándo usar**: Después de hacer cambios en el código backend.

---

### 2. **`./logs-backend.sh`** - Ver Logs
```bash
./logs-backend.sh
```
- ✅ Muestra los últimos 50 logs
- ✅ Mantiene stream en tiempo real
- ✅ Presiona `Ctrl+C` para salir

**Cuándo usar**: Para monitorear la actividad del backend o debug.

---

### 3. **`./stop-backend.sh`** - Detener Backend
```bash
./stop-backend.sh
```
- ✅ Detiene PM2
- ✅ Libera puerto 5000
- ✅ Muestra estado final

**Cuándo usar**: Para detener completamente el backend.

---

### 4. **`./status-backend.sh`** - Ver Estado
```bash
./status-backend.sh
```
- ✅ Estado de PM2
- ✅ Procesos en puerto 5000
- ✅ Uso de memoria

**Cuándo usar**: Para verificar si el backend está corriendo.

---

## 🚀 **Flujo de Trabajo Común**

### **Después de cambios en el backend:**
```bash
# 1. Reiniciar
./restart-backend.sh

# 2. Si quieres salir de los logs, presiona Ctrl+C

# 3. Ver estado
./status-backend.sh
```

### **Para monitoreo continuo:**
```bash
./logs-backend.sh
```

### **Si hay problemas de puerto:**
```bash
# Detener todo
./stop-backend.sh

# Esperar 2 segundos
sleep 2

# Reiniciar
./restart-backend.sh
```

---

## ⚙️ **Comandos PM2 Directos**

Si prefieres usar PM2 directamente:

```bash
# Reiniciar
pm2 restart dann-salud-backend

# Ver logs
pm2 logs dann-salud-backend

# Estado
pm2 status

# Detener
pm2 stop dann-salud-backend

# Iniciar
pm2 start dann-salud-backend

# Eliminar del PM2
pm2 delete dann-salud-backend

# Ver info detallada
pm2 show dann-salud-backend
```

---

## 🔧 **Troubleshooting**

### **Error: "address already in use 0.0.0.0:5000"**
```bash
# Matar proceso en puerto 5000
lsof -ti:5000 | xargs kill -9

# Luego reiniciar
./restart-backend.sh
```

### **Backend no arranca**
```bash
# Ver logs de error
pm2 logs dann-salud-backend --err

# Ver últimos 100 logs
pm2 logs dann-salud-backend --lines 100
```

### **Limpiar logs viejos**
```bash
pm2 flush dann-salud-backend
```

---

## 📊 **Ubicación de los Scripts**

Todos los scripts están en la raíz del proyecto:
```
/home/dann-salud/Documentos/Dann-Salud-Broadcaster/
├── restart-backend.sh  ← Reiniciar
├── logs-backend.sh     ← Ver logs
├── stop-backend.sh     ← Detener
└── status-backend.sh   ← Ver estado
```

---

## 💡 **Tips**

1. **Siempre usa `./` antes del nombre del script**
   ```bash
   ./restart-backend.sh  # ✅ Correcto
   restart-backend.sh    # ❌ No funcionará
   ```

2. **Para salir de logs en tiempo real: `Ctrl+C`**

3. **Si editas los scripts, asegúrate de que tengan permisos de ejecución:**
   ```bash
   chmod +x nombre-del-script.sh
   ```

4. **Para ver ayuda de PM2:**
   ```bash
   pm2 --help
   ```

---

**Última actualización**: 6 de noviembre, 2025
