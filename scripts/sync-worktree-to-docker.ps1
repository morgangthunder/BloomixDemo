# Sync worktree changes to Docker location
# This ensures Docker serves the latest code from the worktree

$worktreePath = "C:\Users\Lenovo\.cursor\worktrees\BloomixDemo\uip\Upora"
$dockerPath = "C:\Morgan\Coding\Bloomix\BloomixDemo\Upora"

Write-Host "🔄 Syncing worktree to Docker location..." -ForegroundColor Cyan
Write-Host "   Worktree: $worktreePath" -ForegroundColor Gray
Write-Host "   Docker:   $dockerPath" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $worktreePath)) {
    Write-Host "❌ Worktree path not found: $worktreePath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $dockerPath)) {
    Write-Host "❌ Docker path not found: $dockerPath" -ForegroundColor Red
    exit 1
}

# Sync frontend source
Write-Host "📦 Syncing frontend/src..." -ForegroundColor Yellow
$frontendSrcSource = Join-Path $worktreePath "frontend\src"
$frontendSrcDest = Join-Path $dockerPath "frontend\src"

if (Test-Path $frontendSrcSource) {
    robocopy $frontendSrcSource $frontendSrcDest /E /XD node_modules .angular /NFL /NDL /NJH /NJS /NP /NS /NC
    Write-Host "✅ Frontend source synced" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend source not found in worktree" -ForegroundColor Yellow
}

# Sync backend source
Write-Host "📦 Syncing backend/src..." -ForegroundColor Yellow
$backendSrcSource = Join-Path $worktreePath "backend\src"
$backendSrcDest = Join-Path $dockerPath "backend\src"

if (Test-Path $backendSrcSource) {
    robocopy $backendSrcSource $backendSrcDest /E /XD node_modules dist /NFL /NDL /NJH /NJS /NP /NS /NC
    Write-Host "✅ Backend source synced" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend source not found in worktree" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Sync complete! Docker should now serve the latest code." -ForegroundColor Green
Write-Host "💡 Tip: Run this script after making changes in the worktree." -ForegroundColor Cyan
