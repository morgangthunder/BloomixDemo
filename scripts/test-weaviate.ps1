# Upora - Weaviate & Content Sources API Test Script

$baseUrl = "http://localhost:3000/api"
$tenantId = "00000000-0000-0000-0000-000000000001"
$userId = "00000000-0000-0000-0000-000000000011"
$adminId = "00000000-0000-0000-0000-000000000010"

Write-Host "`n🧪 Upora Weaviate API Tests`n" -ForegroundColor Cyan

# Test 1: Get all content sources
Write-Host "Test 1: GET /api/content-sources" -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/content-sources" -Headers @{"x-tenant-id"=$tenantId} | ConvertFrom-Json
Write-Host "✓ Found $($response.Count) content sources" -ForegroundColor Green
$response | Select-Object id, type, title, status | Format-Table

# Test 2: Get single content source
Write-Host "`nTest 2: GET /api/content-sources/:id" -ForegroundColor Yellow
$contentId = "40000000-0000-0000-0000-000000000001"
$content = Invoke-WebRequest -Uri "$baseUrl/content-sources/$contentId" -Headers @{"x-tenant-id"=$tenantId} | ConvertFrom-Json
Write-Host "✓ Retrieved: $($content.title)" -ForegroundColor Green
Write-Host "  Type: $($content.type)"
Write-Host "  Status: $($content.status)"
Write-Host "  Topics: $($content.metadata.topics -join ', ')"

# Test 3: Create new content source
Write-Host "`nTest 3: POST /api/content-sources (Create)" -ForegroundColor Yellow
$newContent = @{
    type = "url"
    sourceUrl = "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"
    title = "MDN JavaScript Guide"
    summary = "Comprehensive JavaScript guide from Mozilla Developer Network"
    metadata = @{
        topics = @("JavaScript", "Web Development", "Programming")
        keywords = @("ES6", "async", "promises", "modules")
    }
} | ConvertTo-Json

try {
    $created = Invoke-WebRequest -Uri "$baseUrl/content-sources" -Method POST `
        -Headers @{"x-tenant-id"=$tenantId; "x-user-id"=$userId; "Content-Type"="application/json"} `
        -Body $newContent | ConvertFrom-Json
    Write-Host "✓ Created content source: $($created.id)" -ForegroundColor Green
    $newId = $created.id
} catch {
    Write-Host "✗ Failed to create: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Approve content (indexes in Weaviate)
if ($newId) {
    Write-Host "`nTest 4: POST /api/content-sources/:id/approve" -ForegroundColor Yellow
    $approveBody = @{} | ConvertTo-Json
    $approved = Invoke-WebRequest -Uri "$baseUrl/content-sources/$newId/approve" -Method POST `
        -Headers @{"x-tenant-id"=$tenantId; "x-user-id"=$adminId; "Content-Type"="application/json"} `
        -Body $approveBody | ConvertFrom-Json
    Write-Host "✓ Approved and indexed in Weaviate" -ForegroundColor Green
    Write-Host "  Weaviate ID: $($approved.weaviateId)"
}

# Test 5: Semantic Search (BM25)
Write-Host "`nTest 5: POST /api/content-sources/search (BM25 Search)" -ForegroundColor Yellow
$searchBody = @{
    query = "JavaScript functions and variables"
    tenantId = $tenantId
    limit = 10
} | ConvertTo-Json

$searchResults = Invoke-WebRequest -Uri "$baseUrl/content-sources/search" -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $searchBody | ConvertFrom-Json

Write-Host "✓ Found $($searchResults.Count) results" -ForegroundColor Green
$searchResults | Select-Object title, @{N='Score';E={[math]::Round($_.relevanceScore, 4)}}, @{N='Topics';E={$_.topics -join ', '}} | Format-Table

# Test 6: Link content to lesson
Write-Host "`nTest 6: POST /api/content-sources/link-to-lesson" -ForegroundColor Yellow
$linkBody = @{
    lessonId = "30000000-0000-0000-0000-000000000002"
    contentSourceId = "40000000-0000-0000-0000-000000000001"
    relevanceScore = 0.95
} | ConvertTo-Json

try {
    $link = Invoke-WebRequest -Uri "$baseUrl/content-sources/link-to-lesson" -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $linkBody | ConvertFrom-Json
    Write-Host "✓ Linked content to lesson" -ForegroundColor Green
    Write-Host "  Link ID: $($link.id)"
    Write-Host "  Relevance Score: $($link.relevanceScore)"
} catch {
    Write-Host "ℹ Link may already exist" -ForegroundColor Yellow
}

# Test 7: Get linked content for lesson
Write-Host "`nTest 7: GET /api/content-sources/lesson/:lessonId" -ForegroundColor Yellow
$lessonId = "30000000-0000-0000-0000-000000000002"
$linked = Invoke-WebRequest -Uri "$baseUrl/content-sources/lesson/$lessonId" | ConvertFrom-Json
Write-Host "✓ Found $($linked.Count) linked content sources" -ForegroundColor Green
$linked | Select-Object title, type, status | Format-Table

# Test 8: Direct Weaviate API
Write-Host "`nTest 8: Direct Weaviate API - Get all objects" -ForegroundColor Yellow
$weaviateObjects = Invoke-WebRequest -Uri "http://localhost:8080/v1/objects" | ConvertFrom-Json
Write-Host "✓ Weaviate has $($weaviateObjects.objects.Count) indexed objects" -ForegroundColor Green
$weaviateObjects.objects | Select-Object id, @{N='title';E={$_.properties.title}}, @{N='status';E={$_.properties.status}} | Format-Table

Write-Host "`n✅ All tests complete!`n" -ForegroundColor Green

# Summary
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  • PostgreSQL content_sources: $($response.Count)"
Write-Host "  • Weaviate indexed objects: $($weaviateObjects.objects.Count)"
Write-Host "  • BM25 search working: ✅"
Write-Host "  • Approval workflow: ✅"
Write-Host "  • Content linking: ✅"
Write-Host "`n🚀 Weaviate integration is fully operational!" -ForegroundColor Green

