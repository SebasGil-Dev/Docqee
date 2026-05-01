# ============================================================
#  PRUEBAS E2E DOCQEE — PLAYWRIGHT
# ============================================================

$Host.UI.RawUI.WindowTitle = "Pruebas E2E Docqee"

# La carpeta del script — siempre funciona con -File
$rootPath  = $PSScriptRoot
$frontPath = Join-Path $rootPath "Front"
$pw        = Join-Path $frontPath "node_modules\.bin\playwright.cmd"

Write-Host ""
Write-Host " PRUEBAS E2E DOCQEE - PLAYWRIGHT" -ForegroundColor Cyan
Write-Host " ================================" -ForegroundColor Cyan
Write-Host " URL: https://docqee.vercel.app"  -ForegroundColor White
Write-Host ""

# ── Verificar carpeta Front ───────────────────────────────────────────────
if (-not (Test-Path $frontPath)) {
    Write-Host " ERROR: No se encontro la carpeta Front." -ForegroundColor Red
    Write-Host " Asegurate de que el .bat este en la carpeta Docqee." -ForegroundColor Yellow
    Read-Host "`nPresiona Enter para cerrar"
    exit 1
}

# ── Verificar Node.js ─────────────────────────────────────────────────────
$nodeVer = $null
try { $nodeVer = & node --version 2>$null } catch {}
if (-not $nodeVer) {
    Write-Host " ERROR: Node.js no esta instalado." -ForegroundColor Red
    Write-Host " Descargalo en: https://nodejs.org  (version LTS)" -ForegroundColor Yellow
    Read-Host "`nPresiona Enter para cerrar"
    exit 1
}
Write-Host " Node.js: $nodeVer" -ForegroundColor Green

# ── npm install si falta node_modules ────────────────────────────────────
if (-not (Test-Path (Join-Path $frontPath "node_modules"))) {
    Write-Host " Instalando dependencias (primera vez)..." -ForegroundColor Yellow
    Set-Location -LiteralPath $frontPath
    & npm install
}

# ── Instalar Chromium si no existe ────────────────────────────────────────
if (-not (Test-Path (Join-Path $env:LOCALAPPDATA "ms-playwright"))) {
    Write-Host " Descargando Chromium (~150 MB, primera vez)..." -ForegroundColor Yellow
    Set-Location -LiteralPath $frontPath
    & node "node_modules\playwright\cli.js" install chromium
}

# ── Ir a Front y ejecutar ─────────────────────────────────────────────────
Set-Location -LiteralPath $frontPath

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

# Abrir el HTML directamente (evita el error de puerto ocupado)
$reportHtml = Join-Path $frontPath "playwright-report\index.html"
if (Test-Path $reportHtml) {
    Start-Process $reportHtml
    Write-Host " Reporte abierto: $reportHtml" -ForegroundColor DarkGreen
} else {
    # Fallback: intentar show-report en otro puerto
    & $pw show-report --port 9330
}

Write-Host ""
Read-Host "Presiona Enter para cerrar"
