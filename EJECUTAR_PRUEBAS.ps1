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

$orderedSuites = @(
    [PSCustomObject]@{ Name = "auth"; Label = "E2E-01 a E2E-05 | auth"; Path = "e2e/auth/login.spec.ts" },
    [PSCustomObject]@{ Name = "solicitudes"; Label = "E2E-06 a E2E-10 | solicitudes"; Path = "e2e/solicitudes/solicitudes.spec.ts" },
    [PSCustomObject]@{ Name = "chat"; Label = "E2E-11 a E2E-12 | chat"; Path = "e2e/chat/chat.spec.ts" },
    [PSCustomObject]@{ Name = "citas"; Label = "E2E-13 a E2E-20 | citas"; Path = "e2e/citas/citas.spec.ts" },
    [PSCustomObject]@{ Name = "valoraciones"; Label = "E2E-21 a E2E-23 | valoraciones"; Path = "e2e/valoraciones/valoraciones.spec.ts" },
    [PSCustomObject]@{ Name = "perfil"; Label = "E2E-24 a E2E-27 | perfil"; Path = "e2e/perfil/perfil.spec.ts" }
)

$missingTests = $orderedSuites | Where-Object {
    -not (Test-Path (Join-Path $frontPath $_.Path))
}

if ($missingTests.Count -gt 0) {
    Write-Host ""
    Write-Host " ERROR: Faltan archivos de pruebas E2E:" -ForegroundColor Red
    foreach ($suite in $missingTests) {
        Write-Host " - $($suite.Path)" -ForegroundColor Yellow
    }
    Exit-WithPause 1
}

Write-Host ""
Write-Host " Ejecutando pruebas... (~3 minutos)" -ForegroundColor Yellow
Write-Host " Orden: auth -> solicitudes -> chat -> citas -> valoraciones -> perfil" -ForegroundColor DarkCyan
Write-Host ""

$blobReportDir = Join-Path $frontPath ("blob-report-ordered-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$failedSuites = @()
$previousBlobOutputDir = $env:PLAYWRIGHT_BLOB_OUTPUT_DIR
$previousBlobOutputName = $env:PLAYWRIGHT_BLOB_OUTPUT_NAME
$previousBlobDoNotRemove = $env:PWTEST_BLOB_DO_NOT_REMOVE

try {
    $env:PLAYWRIGHT_BLOB_OUTPUT_DIR = $blobReportDir
    $env:PWTEST_BLOB_DO_NOT_REMOVE = "1"

    Write-Host " Preparando sesiones..." -ForegroundColor Yellow
    $env:PLAYWRIGHT_BLOB_OUTPUT_NAME = "00-setup.zip"
    & $pw test --project=setup --reporter=blob,list
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host " ERROR: fallo el setup de autenticacion. No se ejecutan las pruebas." -ForegroundColor Red
        Exit-WithPause 1
    }

    for ($i = 0; $i -lt $orderedSuites.Count; $i++) {
        $suite = $orderedSuites[$i]
        $order = "{0:D2}" -f ($i + 1)

        Write-Host ""
        Write-Host " Ejecutando $($suite.Label)..." -ForegroundColor Cyan

        $env:PLAYWRIGHT_BLOB_OUTPUT_NAME = "$order-$($suite.Name).zip"
        & $pw test $($suite.Path) --project=chromium --no-deps --reporter=blob,list

        if ($LASTEXITCODE -ne 0) {
            $failedSuites += $suite.Label
            Write-Host " Fallo: $($suite.Label)" -ForegroundColor Red
        } else {
            Write-Host " OK: $($suite.Label)" -ForegroundColor Green
        }
    }
}
finally {
    $env:PLAYWRIGHT_BLOB_OUTPUT_DIR = $previousBlobOutputDir
    $env:PLAYWRIGHT_BLOB_OUTPUT_NAME = $previousBlobOutputName
    $env:PWTEST_BLOB_DO_NOT_REMOVE = $previousBlobDoNotRemove
}

$ok = ($failedSuites.Count -eq 0)

Write-Host ""
if ($ok) {
    Write-Host " TODOS LOS TESTS PASARON" -ForegroundColor Green
} else {
    Write-Host " Algunos tests fallaron - ver reporte" -ForegroundColor Red
    foreach ($failedSuite in $failedSuites) {
        Write-Host " - $failedSuite" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host " Generando reporte consolidado..." -ForegroundColor Yellow
& $pw merge-reports --reporter html $blobReportDir
if ($LASTEXITCODE -ne 0) {
    Write-Host " No se pudo consolidar el reporte. Revisa: $blobReportDir" -ForegroundColor Red
    Exit-WithPause 1
}

$reportHtml = Join-Path $frontPath "playwright-report\index.html"
if (Test-Path $reportHtml) {
    Write-Host " Abriendo reporte en el navegador..." -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    Start-Process $reportHtml
    Write-Host " Reporte abierto: $reportHtml" -ForegroundColor DarkGreen
} else {
    & $pw show-report --port 9330
}

if ($ok) {
    Exit-WithPause 0
}

Exit-WithPause 1
