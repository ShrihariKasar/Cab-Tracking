# Field-Test Launcher: Backend + Public HTTPS Tunnel
# Prerequisites: PostgreSQL running, backend/.env configured, and cloudflared or ngrok installed.

Write-Host "1. Building and starting FleetPulse Backend on port 4000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\backend'; npm run build; npm start"

Start-Sleep -Seconds 3

if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
  Write-Host "2. Starting Cloudflare Tunnel (copy the https://...trycloudflare.com URL into the app's Server URL setting)..." -ForegroundColor Green
  cloudflared tunnel --url http://localhost:4000
} elseif (Get-Command ngrok -ErrorAction SilentlyContinue) {
  Write-Host "2. Starting ngrok Tunnel (copy the https://...ngrok-free.app URL into the app's Server URL setting)..." -ForegroundColor Green
  ngrok http 4000
} else {
  Write-Host "Neither 'cloudflared' nor 'ngrok' is installed." -ForegroundColor Yellow
  Write-Host "Install Cloudflare Tunnel: winget install Cloudflare.cloudflared" -ForegroundColor White
  Write-Host "Then run: cloudflared tunnel --url http://localhost:4000" -ForegroundColor White
}
