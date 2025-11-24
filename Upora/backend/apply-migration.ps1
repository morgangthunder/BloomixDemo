# PowerShell script to apply LLM query logging migration
# Run this if Docker exec isn't working

Write-Host "Applying LLM query logging migration..." -ForegroundColor Cyan

# Try to connect via docker exec first
$dockerCmd = "docker exec -i upora-postgres psql -U upora_user -d upora_dev -c `"ALTER TABLE llm_generation_logs ADD COLUMN IF NOT EXISTS request_payload JSONB, ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;`""

Write-Host "Attempting: $dockerCmd" -ForegroundColor Yellow
try {
    Invoke-Expression $dockerCmd
    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker exec failed. Trying direct psql connection..." -ForegroundColor Red
    
    # Alternative: If you have psql installed locally and Postgres is on localhost:5432
    $psqlCmd = "psql -h localhost -p 5432 -U upora_user -d upora_dev -c `"ALTER TABLE llm_generation_logs ADD COLUMN IF NOT EXISTS request_payload JSONB, ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;`""
    Write-Host "Try running manually:" -ForegroundColor Yellow
    Write-Host $psqlCmd -ForegroundColor White
    Write-Host ""
    Write-Host "Or connect to Postgres and run:" -ForegroundColor Yellow
    Write-Host "ALTER TABLE llm_generation_logs ADD COLUMN IF NOT EXISTS request_payload JSONB, ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;" -ForegroundColor White
}

