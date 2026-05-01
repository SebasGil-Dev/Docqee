# ============================================================
#  PRUEBAS E2E DOCQEE - PLAYWRIGHT
# ============================================================

$Host.UI.RawUI.WindowTitle = "Pruebas E2E Docqee"

$rootPath = $PSScriptRoot
$frontPath = Join-Path $rootPath "Front"
$nodeModulesPath = Join-Path $frontPath "node_modules"
$pw = Join-Path $frontPath "node_modules\.bin\playwright.cmd"

function Exit-WithPause {
    param([int] $Code)

    Write-Host ""
    Read-Host "Presiona Enter para cerrar"
    exit $Code
}

function Install-FrontDependencies {
    Write-Host " Instalando dependencias del Front..." -ForegroundColor Yellow
    Set-Location -LiteralPath $frontPath
    & npm install --include=dev

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host " ERROR: npm install fallo. Revisa los mensajes anteriores." -ForegroundColor Red
        Exit-WithPause 1
    }
}

Write-Host ""
Write-Host " PRUEBAS E2E DOCQEE - PLAYWRIGHT" -ForegroundColor Cyan
Write-Host " ================================" -ForegroundColor Cyan
Write-Host " URL: https://docqee.vercel.app" -ForegroundColor White
Write-Host ""

# Verificar carpeta Front
if (-not (Test-Path $frontPath)) {
    Write-Host " ERROR: No se encontro la carpeta Front." -ForegroundColor Red
    Write-Host " Asegurate de que el .bat este en la carpeta Docqee." -ForegroundColor Yellow
    Exit-WithPause 1
}

# Verificar Node.js
$nodeVer = $null
try { $nodeVer = & node --version 2>$null } catch {}
if (-not $nodeVer) {
    Write-Host " ERROR: Node.js no esta instalado." -ForegroundColor Red
    Write-Host " Descargalo en: https://nodejs.org (version LTS)" -ForegroundColor Yellow
    Exit-WithPause 1
}
Write-Host " Node.js: $nodeVer" -ForegroundColor Green

# Instalar dependencias si faltan o si node_modules esta incompleto.
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host " No existe node_modules." -ForegroundColor Yellow
    Install-FrontDependencies
} elseif (-not (Test-Path $pw)) {
    Write-Host " Playwright no esta instalado o node_modules esta incompleto." -ForegroundColor Yellow
    Install-FrontDependencies
}

if (-not (Test-Path $pw)) {
    Write-Host ""
    Write-Host " ERROR: No se encontro Playwright despues de instalar dependencias." -ForegroundColor Red
    Write-Host " Ejecuta manualmente: cd Front; npm install --include=dev" -ForegroundColor Yellow
    Exit-WithPause 1
}

# Instalar/verificar Chromium. Playwright no vuelve a descargarlo si ya existe.
Write-Host " Verificando Chromium de Playwright..." -ForegroundColor Yellow
Set-Location -LiteralPath $frontPath
& $pw install chromium
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host " ERROR: No se pudo instalar Chromium para Playwright." -ForegroundColor Red
    Exit-WithPause 1
}

Write-Host ""
Write-Host " Ejecutando pruebas... (~3 minutos)" -ForegroundColor Yellow
Write-Host ""

& $pw test

$ok = ($LASTEXITCODE -eq 0)

Write-Host ""
if ($ok) {
    Write-Host " TODOS LOS TESTS PASARON" -ForegroundColor Green
} else {
    Write-Host " Algunos tests fallaron - ver reporte" -ForegroundColor Red
}

Write-Host ""
Write-Host " Abriendo reporte en el navegador..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

$reportHtml = Join-Path $frontPath "playwright-report\index.html"
if (Test-Path $reportHtml) {
    Start-Process $reportHtml
    Write-Host " Reporte abierto: $reportHtml" -ForegroundColor DarkGreen
} else {
    & $pw show-report --port 9330
}

Exit-WithPause 0
