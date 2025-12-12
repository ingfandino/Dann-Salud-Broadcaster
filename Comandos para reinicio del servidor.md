# 1. Matar TODO en los puertos
sudo fuser -k 5000/tcp
sudo fuser -k 5001/tcp
pm2 delete all

# 2. Esperar 5 segundos
sleep 5

# 3. Verificar que 5000 esté libre
lsof -i :5000 || echo "Puerto 5000 libre"

# 4. Iniciar backend solo
cd ~/Documentos/Dann-Salud-Broadcaster/backend
pm2 start src/server.js --name backend -f

# 5. Verificar que 5000 SIGA libre
lsof -i :5000 || echo "Puerto 5000 SIGUE libre"

# 6. Iniciar frontend manualmente
cd ~/Documentos/Dann-Salud-Broadcaster/frontend-nextjs
npm run build
npm run start -- -p 5000
