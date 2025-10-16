@echo off
echo ===================================================
echo    DANN+SALUD BROADCASTER - INICIO DE PRODUCCION
echo ===================================================
echo.

REM Verificar si MongoDB está instalado
where mongod >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] MongoDB no está instalado o no está en el PATH.
    echo Instale MongoDB antes de continuar.
    pause
    exit /b 1
)

REM Verificar si MongoDB está en ejecución
netstat -an | find "27017" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [AVISO] MongoDB no parece estar en ejecución.
    echo Iniciando MongoDB...
    start "MongoDB" mongod
    timeout /t 5
)

echo [INFO] Compilando frontend...
cd frontend
call npm install
call npm run build

echo [INFO] Verificando que la carpeta dist sea accesible desde la ruta correcta...
if not exist "dist" (
    echo [ERROR] No se encontró la carpeta dist del frontend
    cd ..
    exit /b 1
)

echo [INFO] Creando enlace simbólico para asegurar acceso desde la ruta esperada...
cd ..
if not exist "%USERPROFILE%\Downloads\frontend" (
    mkdir "%USERPROFILE%\Downloads\frontend"
)

if exist "%USERPROFILE%\Downloads\frontend\dist" (
    rmdir /s /q "%USERPROFILE%\Downloads\frontend\dist"
)

echo [INFO] Copiando archivos compilados a la ubicación esperada...
xcopy /E /I /Y "frontend\dist" "%USERPROFILE%\Downloads\frontend\dist"

echo [INFO] Verificando dependencias del backend...
cd backend
call npm install
cd ..

echo [INFO] Iniciando servidor en modo producción...
cd backend
set NODE_ENV=production
call npm start

pause