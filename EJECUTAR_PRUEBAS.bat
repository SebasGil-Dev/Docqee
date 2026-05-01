@echo off
title Pruebas E2E Docqee
cd /d "%~dp0"
echo.
echo  Iniciando pruebas E2E de Docqee...
echo.
powershell -ExecutionPolicy Bypass -File "EJECUTAR_PRUEBAS.ps1"
set "TEST_EXIT_CODE=%ERRORLEVEL%"
echo.
if "%TEST_EXIT_CODE%"=="0" (
  echo  Las pruebas terminaron correctamente.
) else (
  echo  Las pruebas terminaron con errores. Revisa los mensajes de arriba.
)
exit /b %TEST_EXIT_CODE%
