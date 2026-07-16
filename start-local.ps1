#Requires -Version 5.1
<#
.SYNOPSIS
  Start GRCx locally without Docker (AI + Backend + Frontend).

.DESCRIPTION
  Opens three PowerShell windows and verifies prerequisites.
  Docker files remain untouched — use docker compose later when available.
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Write-Step "Checking prerequisites"
Assert-Command "python"
Assert-Command "node"
Assert-Command "npm"

$pyVer = python --version 2>&1
$nodeVer = node --version 2>&1
Write-Host "Python: $pyVer"
Write-Host "Node:   $nodeVer"

$aiDir = Join-Path $Root "ai-service"
$backendDir = Join-Path $Root "backend"
$frontendDir = Join-Path $Root "frontend"

foreach ($dir in @($aiDir, $backendDir, $frontendDir)) {
  if (-not (Test-Path $dir)) {
    throw "Missing required folder: $dir"
  }
}

# Prefer stable junction ai-service/current; fall back to package path
$imtithalDir = Join-Path $aiDir "current"
if (-not (Test-Path (Join-Path $imtithalDir "server.py"))) {
  $imtithalDir = Join-Path $aiDir "Imtithal_AItest-20260716T135353Z-1-004\Imtithal_AItest"
}
if (-not (Test-Path (Join-Path $imtithalDir "imtithal"))) {
  Write-Warning "Imtithal AITest package not found. AI service may fail to load the model."
}

if (-not (Test-Path (Join-Path $backendDir ".env"))) {
  throw "Missing backend/.env — create it before starting."
}
$frontendEnv = Join-Path $frontendDir ".env.local"
if (-not (Test-Path $frontendEnv)) {
  @"
VITE_API_BASE_URL=http://localhost:8002/api/v1
VITE_USE_MOCKS=false
"@ | Set-Content -Path $frontendEnv -Encoding UTF8
  Write-Host "Created frontend/.env.local"
}

$aiVenvActivate = Join-Path $aiDir ".venv\Scripts\Activate.ps1"
$backendVenvActivate = Join-Path $backendDir ".venv\Scripts\Activate.ps1"

if (-not (Test-Path $aiVenvActivate)) {
  Write-Step "Creating AI service virtual environment"
  Push-Location $aiDir
  python -m venv .venv
  Pop-Location
}
if (-not (Test-Path $backendVenvActivate)) {
  Write-Step "Creating backend virtual environment"
  Push-Location $backendDir
  python -m venv .venv
  Pop-Location
}

Write-Step "Starting services in separate windows"

$aiCmd = @"
Set-Location '$imtithalDir'
& '$aiVenvActivate'
`$env:AI_PORT = '8001'
`$env:AI_HOST = '127.0.0.1'
Write-Host 'AI Service (Imtithal AraBERT) — http://127.0.0.1:8001' -ForegroundColor Green
Write-Host 'Health: http://127.0.0.1:8001/health'
Write-Host 'Ready:  http://127.0.0.1:8001/ready'
python server.py
"@

$backendCmd = @"
Set-Location '$backendDir'
& '$backendVenvActivate'
Write-Host 'Backend — http://127.0.0.1:8002' -ForegroundColor Green
Write-Host 'Docs:   http://127.0.0.1:8002/docs'
Write-Host 'Health: http://127.0.0.1:8002/api/v1/health'
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
"@

$frontendCmd = @"
Set-Location '$frontendDir'
if (-not (Test-Path 'node_modules')) { npm install }
Write-Host 'Frontend — http://localhost:5173' -ForegroundColor Green
npm run dev -- --host 0.0.0.0 --port 5173
"@

Start-Process powershell -ArgumentList @("-NoExit", "-Command", $aiCmd)
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $backendCmd)
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $frontendCmd)

Write-Host ""
Write-Host "GRCx local stack launching:" -ForegroundColor Green
Write-Host "  AI Service  http://127.0.0.1:8001"
Write-Host "  Backend     http://127.0.0.1:8002"
Write-Host "  Frontend    http://localhost:5173"
Write-Host ""
Write-Host "First AI start may take 30–60s while AraBERT loads once into memory."
Write-Host "Login: test@grcx.local / 123456"
Write-Host ""
Write-Host "To stop: close the three PowerShell windows (Ctrl+C in each)."
Write-Host "Do not bind the local backend to port 8000 (stuck on some Windows hosts)."
Write-Host "Docker files are unchanged — use 'docker compose up' when Docker is available."
