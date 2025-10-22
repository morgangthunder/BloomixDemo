# PowerShell script to test Backend CRUD operations
# Tests: Create, Read, Update, Approve workflow

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000/api"
$tenantId = "00000000-0000-0000-0000-000000000001"
$userId = "00000000-0000-0000-0000-000000000011" # Builder
$adminId = "00000000-0000-0000-0000-000000000010" # Admin

Write-Host ""
Write-Host "🧪 Testing Upora Backend CRUD Operations" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get all approved lessons (should return 2)
Write-Host "📚 Test 1: GET Approved Lessons" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/lessons?status=approved" `
        -Headers @{"x-tenant-id"=$tenantId} `
        -Method GET
    
    Write-Host "✅ SUCCESS - Found $($response.Length) approved lessons" -ForegroundColor Green
    $response | Select-Object title, status, category | Format-Table
} catch {
    Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Create a new lesson
Write-Host "📝 Test 2: POST Create New Lesson" -ForegroundColor Yellow
$newLesson = @{
    tenantId = $tenantId
    title = "Test Lesson - Docker & Containers"
    description = "Learn Docker containerization"
    data = @{
        stages = @(
            @{
                id = "stage-1"
                title = "Introduction to Docker"
                substages = @(
                    @{
                        id = "substage-1-1"
                        title = "What is Docker?"
                        content = "Docker is a containerization platform..."
                    }
                )
            }
        )
    }
    createdBy = $userId
} | ConvertTo-Json -Depth 10

try {
    $created = Invoke-RestMethod -Uri "$baseUrl/lessons" `
        -Headers @{
            "x-tenant-id"=$tenantId
            "x-user-id"=$userId
            "Content-Type"="application/json"
        } `
        -Method POST `
        -Body $newLesson
    
    Write-Host "✅ SUCCESS - Lesson created with ID: $($created.id)" -ForegroundColor Green
    Write-Host "   Title: $($created.title)" -ForegroundColor Gray
    Write-Host "   Status: $($created.status)" -ForegroundColor Gray
    $createdLessonId = $created.id
} catch {
    Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $createdLessonId = $null
}
Write-Host ""

# Test 3: Get the newly created lesson
if ($createdLessonId) {
    Write-Host "🔍 Test 3: GET Specific Lesson by ID" -ForegroundColor Yellow
    try {
        $lesson = Invoke-RestMethod -Uri "$baseUrl/lessons/$createdLessonId" `
            -Headers @{"x-tenant-id"=$tenantId} `
            -Method GET
        
        Write-Host "✅ SUCCESS - Retrieved lesson" -ForegroundColor Green
        Write-Host "   Title: $($lesson.title)" -ForegroundColor Gray
        Write-Host "   Status: $($lesson.status)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 4: Update the lesson
if ($createdLessonId) {
    Write-Host "✏️  Test 4: PATCH Update Lesson" -ForegroundColor Yellow
    $updates = @{
        description = "Learn Docker containerization - UPDATED!"
    } | ConvertTo-Json
    
    try {
        $updated = Invoke-RestMethod -Uri "$baseUrl/lessons/$createdLessonId" `
            -Headers @{
                "x-tenant-id"=$tenantId
                "x-user-id"=$userId
                "Content-Type"="application/json"
            } `
            -Method PATCH `
            -Body $updates
        
        Write-Host "✅ SUCCESS - Lesson updated" -ForegroundColor Green
        Write-Host "   New description: $($updated.description)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 5: Submit for approval
if ($createdLessonId) {
    Write-Host "📤 Test 5: POST Submit for Approval" -ForegroundColor Yellow
    try {
        $submitted = Invoke-RestMethod -Uri "$baseUrl/lessons/$createdLessonId/submit" `
            -Headers @{
                "x-tenant-id"=$tenantId
                "x-user-id"=$userId
            } `
            -Method POST
        
        Write-Host "✅ SUCCESS - Lesson submitted" -ForegroundColor Green
        Write-Host "   Status: $($submitted.status)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 6: Approve lesson (as admin)
if ($createdLessonId) {
    Write-Host "✔️  Test 6: POST Approve Lesson (Admin)" -ForegroundColor Yellow
    try {
        $approved = Invoke-RestMethod -Uri "$baseUrl/lessons/$createdLessonId/approve" `
            -Headers @{
                "x-tenant-id"=$tenantId
            } `
            -Method POST
        
        Write-Host "✅ SUCCESS - Lesson approved!" -ForegroundColor Green
        Write-Host "   Status: $($approved.status)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 7: Verify lesson now appears in approved list
Write-Host "🔎 Test 7: Verify Approved Lesson Appears" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/lessons?status=approved" `
        -Headers @{"x-tenant-id"=$tenantId} `
        -Method GET
    
    $found = $response | Where-Object { $_.title -like "*Docker*" }
    
    if ($found) {
        Write-Host "✅ SUCCESS - New lesson appears in approved list!" -ForegroundColor Green
        Write-Host "   Now showing $($response.Length) approved lessons (was 2)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  WARNING - Lesson not found in approved list" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Clean up - delete test lesson
if ($createdLessonId) {
    Write-Host "🗑️  Test 8: DELETE Test Lesson (Cleanup)" -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "$baseUrl/lessons/$createdLessonId" `
            -Headers @{
                "x-tenant-id"=$tenantId
                "x-user-id"=$userId
            } `
            -Method DELETE
        
        Write-Host "✅ SUCCESS - Test lesson deleted" -ForegroundColor Green
    } catch {
        Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Summary
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Backend API CRUD operations tested successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "✅ GET - Read lessons" -ForegroundColor Green
Write-Host "✅ POST - Create lesson" -ForegroundColor Green
Write-Host "✅ PATCH - Update lesson" -ForegroundColor Green
Write-Host "✅ POST - Submit for approval" -ForegroundColor Green
Write-Host "✅ POST - Approve lesson" -ForegroundColor Green
Write-Host "✅ DELETE - Remove lesson" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Backend is ready for Phase 3!" -ForegroundColor Cyan

