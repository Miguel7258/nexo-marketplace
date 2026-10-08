@echo off
setlocal
title Nexo - Testar site
cd /d "%~dp0"
if errorlevel 1 goto folder_error

where npm.cmd >nul 2>&1
if errorlevel 1 goto npm_missing

if not exist "node_modules\vite\bin\vite.js" (
    echo A instalar as dependencias do projeto...
    call npm.cmd install
    if errorlevel 1 goto install_error
)

echo.
echo A iniciar o Nexo e a abrir o navegador...
echo Mantem esta janela aberta enquanto testas o site.
echo Para parar, prime Ctrl+C nesta janela.
echo.
call npm.cmd run dev -- --host 127.0.0.1 --open
if errorlevel 1 goto server_error
exit /b 0

:npm_missing
echo Nao foi encontrado o npm. Instala o Node.js e volta a abrir este ficheiro.
goto failed

:install_error
echo Nao foi possivel instalar as dependencias. Consulta o erro acima.
goto failed

:server_error
echo Nao foi possivel iniciar o site. Consulta o erro acima.
goto failed

:folder_error
echo Nao foi possivel abrir a pasta do projeto.

:failed
pause
exit /b 1
