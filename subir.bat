@echo off
chcp 65001 >nul
echo ============================================================
echo  SUBIENDO PORTAL ACADEMICO A GITHUB
echo  Repositorio: vannesalopez1994-sys/portal-academico-lnjs
echo ============================================================
echo.

REM Verificar que git esté instalado
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git no está instalado. Descargalo en https://git-scm.com
    pause
    exit /b 1
)

REM Inicializar repositorio git si no existe
if not exist ".git" (
    echo [1/6] Inicializando repositorio Git...
    git init
    echo     OK
) else (
    echo [1/6] Repositorio Git ya inicializado. OK
)

REM Configurar la rama principal como 'main'
echo [2/6] Configurando rama principal como 'main'...
git checkout -b main 2>nul || git checkout main 2>nul
echo     OK

REM Conectar con GitHub (si no hay remote configurado)
echo [3/6] Conectando con GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/vannesalopez1994-sys/portal-academico-lnjs.git
echo     OK

REM Agregar todos los archivos (el .gitignore excluirá .env automáticamente)
echo [4/6] Agregando archivos al commit...
git add .
echo     OK

REM Verificar que .env NO esté incluido
git status | findstr ".env" >nul 2>&1
if not errorlevel 1 (
    echo [AVISO] Asegurandonos de que .env este ignorado...
    git rm --cached .env 2>nul
    git rm --cached .env.production 2>nul
)

REM Hacer el commit
echo [5/6] Creando commit...
git commit -m "Portal Academico LNJS v2.0 - Listo para produccion"
echo     OK

REM Subir a GitHub
echo [6/6] Subiendo a GitHub...
echo.
echo  Si pide usuario y contrasena, ingresa:
echo  Usuario: vannesalopez1994-sys
echo  Contrasena: Tu token de acceso personal de GitHub
echo.
git push -u origin main
echo.
echo ============================================================
echo  EXITO! El codigo fue subido a GitHub.
echo  Ahora puedes continuar con el despliegue en Vercel y Render.
echo ============================================================
echo.
pause
