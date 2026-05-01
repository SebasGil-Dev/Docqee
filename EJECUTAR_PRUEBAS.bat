@echo off
title Pruebas E2E Docqee
cd /d "%~dp0"
echo.
echo  Iniciando pruebas E2E de Docqee...
echo.
powershell -ExecutionPolicy Bypass -File "EJECUTAR_PRUEBAS.ps1"
echo.
echo  El script termino. Si ves este mensaje sin haber visto los tests,
echo  hubo un error. Revisa los mensajes de arriba.
echo.
pause
