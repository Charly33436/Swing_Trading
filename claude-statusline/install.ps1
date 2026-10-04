$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js >= 18 is required: https://nodejs.org'
  exit 1
}
Set-Location $PSScriptRoot
node install.mjs @args
