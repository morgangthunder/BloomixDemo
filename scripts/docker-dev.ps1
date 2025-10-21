# PowerShell script for managing Docker development environment
# Run from project root: .\scripts\docker-dev.ps1 <command>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('start', 'stop', 'restart', 'logs', 'status', 'clean', 'rebuild', 'db')]
    [string]$Command = 'start'
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Upora Docker Development Manager" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

switch ($Command) {
    'start' {
        Write-Host "▶️  Starting all services..." -ForegroundColor Green
        docker-compose up -d
        Write-Host ""
        Write-Host "✅ Services started!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Frontend: http://localhost:8100" -ForegroundColor Yellow
        Write-Host "🔧 Backend: http://localhost:3000/api" -ForegroundColor Yellow
        Write-Host "🗄️  PostgreSQL: localhost:5432" -ForegroundColor Yellow
        Write-Host "📦 MinIO: http://localhost:9001" -ForegroundColor Yellow
        Write-Host "⚙️  n8n: http://localhost:5678" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "View logs: .\scripts\docker-dev.ps1 logs" -ForegroundColor Cyan
    }
    
    'stop' {
        Write-Host "⏹️  Stopping all services..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "✅ Services stopped!" -ForegroundColor Green
    }
    
    'restart' {
        Write-Host "🔄 Restarting all services..." -ForegroundColor Yellow
        docker-compose restart
        Write-Host "✅ Services restarted!" -ForegroundColor Green
    }
    
    'logs' {
        Write-Host "📋 Showing logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker-compose logs -f
    }
    
    'status' {
        Write-Host "📊 Service Status:" -ForegroundColor Cyan
        docker-compose ps
    }
    
    'clean' {
        Write-Host "🧹 Cleaning up (removing volumes)..." -ForegroundColor Red
        $confirm = Read-Host "This will delete all data. Continue? (y/N)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            docker-compose down -v
            Write-Host "✅ Cleanup complete!" -ForegroundColor Green
        } else {
            Write-Host "❌ Cancelled" -ForegroundColor Yellow
        }
    }
    
    'rebuild' {
        Write-Host "🔨 Rebuilding all containers..." -ForegroundColor Yellow
        docker-compose up -d --build
        Write-Host "✅ Rebuild complete!" -ForegroundColor Green
    }
    
    'db' {
        Write-Host "🗄️  Connecting to PostgreSQL..." -ForegroundColor Cyan
        docker exec -it upora-postgres psql -U upora_user -d upora_dev
    }
}

