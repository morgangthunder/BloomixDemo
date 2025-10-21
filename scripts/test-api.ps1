# PowerShell script to test API endpoints
# Run from project root: .\scripts\test-api.ps1

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000/api"
$tenantId = "00000000-0000-0000-0000-000000000001"

Write-Host "🧪 Testing Upora API Endpoints" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -Headers $Headers -UseBasicParsing
        Write-Host "✅ SUCCESS - Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))..." -ForegroundColor Gray
    } catch {
        Write-Host "❌ FAILED - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test health endpoint
Test-Endpoint -Name "Health Check" -Url "$baseUrl/health"

# Test users endpoint
Test-Endpoint -Name "Get Users" -Url "$baseUrl/users" -Headers @{ "x-tenant-id" = $tenantId }

# Test lessons endpoint
Test-Endpoint -Name "Get Approved Lessons" -Url "$baseUrl/lessons?status=approved" -Headers @{ "x-tenant-id" = $tenantId }

# Test specific lesson
Test-Endpoint -Name "Get Specific Lesson" -Url "$baseUrl/lessons/30000000-0000-0000-0000-000000000001" -Headers @{ "x-tenant-id" = $tenantId }

Write-Host "🏁 Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Full API Documentation: http://localhost:3000/api-docs (coming soon)" -ForegroundColor Cyan

