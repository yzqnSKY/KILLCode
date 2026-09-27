$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Stop-WithMessage([string]$message) {
  Write-Host "[KILLCode] $message" -ForegroundColor Red
  exit 1
}

function Get-KILLCodeUrl {
  foreach ($port in 3000..3010) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port" -TimeoutSec 1
      if ($response.Content -match '<title>KILLCode</title>') {
        return "http://127.0.0.1:$port"
      }
    } catch {
      # A closed port or another unavailable local service is not an error here.
    }
  }
  return $null
}

function Test-PortAvailable([int]$port) {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
  try {
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    try { $listener.Stop() } catch { }
  }
}

$existingUrl = Get-KILLCodeUrl
if ($existingUrl) {
  Write-Host "[KILLCode] Already running at $existingUrl"
  Start-Process $existingUrl
  exit 0
}

foreach ($command in @('node', 'npm', 'codex')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    Stop-WithMessage "Required command '$command' was not found in PATH."
  }
}

& node -e "try { require('node:sqlite') } catch { process.exit(1) }" *> $null
if ($LASTEXITCODE -ne 0) {
  Stop-WithMessage 'Node.js 22.13+ is required for the local learning database.'
}

$savedErrorPreference = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
& codex login status *> $null
$codexLoginExitCode = $LASTEXITCODE
$ErrorActionPreference = $savedErrorPreference
if ($codexLoginExitCode -ne 0) {
  Stop-WithMessage 'Codex is not logged in. Run: codex login'
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules\next\package.json'))) {
  Write-Host '[KILLCode] First launch: installing dependencies...'
  $ErrorActionPreference = 'Continue'
  & npm.cmd install
  $npmInstallExitCode = $LASTEXITCODE
  $ErrorActionPreference = $savedErrorPreference
  if ($npmInstallExitCode -ne 0) { Stop-WithMessage 'npm install failed.' }
}

$port = 3000..3010 | Where-Object { Test-PortAvailable $_ } | Select-Object -First 1
if (-not $port) {
  Stop-WithMessage 'No free port was found between 3000 and 3010.'
}

$url = "http://127.0.0.1:$port"
Write-Host "[KILLCode] Starting at $url" -ForegroundColor Cyan
Write-Host '[KILLCode] Keep this window open. Press Ctrl+C to stop.'

$browserJob = Start-Job -ArgumentList $url -ScriptBlock {
  param($targetUrl)
  foreach ($attempt in 1..90) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $targetUrl -TimeoutSec 1
      if ($response.StatusCode -eq 200) {
        Start-Process $targetUrl
        return
      }
    } catch { }
    Start-Sleep -Seconds 1
  }
}

try {
  $ErrorActionPreference = 'Continue'
  & npm.cmd run dev -- --port $port
  $exitCode = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $savedErrorPreference
  if ($browserJob) {
    Stop-Job -Job $browserJob -ErrorAction SilentlyContinue
    Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
  }
}

if ($exitCode -ne 0) {
  Stop-WithMessage "Development server exited with code $exitCode."
}
