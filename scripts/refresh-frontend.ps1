# Force Frontend Refresh Script
# Use this when you don't see your changes in the browser

Write-Host "🔄 Force Refreshing Frontend..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Restarting frontend container..." -ForegroundColor Yellow
docker restart upora-frontend

Write-Host "Step 2: Waiting for compilation (40 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 40

Write-Host "Step 3: Checking compilation status..." -ForegroundColor Yellow
docker logs upora-frontend --tail 20

Write-Host ""
Write-Host "✅ Frontend refreshed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. In your browser, press Ctrl+Shift+R (hard refresh)"
Write-Host "2. Or open in incognito mode: Ctrl+Shift+N"
Write-Host "3. Navigate to: http://localhost:8100"
Write-Host ""
Write-Host "If changes still not visible, run:" -ForegroundColor Yellow
Write-Host "  docker-compose restart frontend" -ForegroundColor White
Write-Host "  (or use scripts/docker-dev.ps1 clean for nuclear option)" -ForegroundColor Gray

