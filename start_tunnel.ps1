# PitchAlignerrr Local Tunnel Launcher (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "    PitchAlignerrr Local Backend & Tunnel Runner        " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "Launching start_tunnel.sh inside WSL (Ubuntu)..." -ForegroundColor Green
    $wslPath = (Get-Location).Path.Replace('\', '/').Replace('c:', '/mnt/c').Replace('C:', '/mnt/c')
    wsl -u damianson bash -c "cd `"$wslPath`" && ./start_tunnel.sh"
} else {
    Write-Host "WSL not found. Please run ./start_tunnel.sh in your Linux terminal." -ForegroundColor Red
}

