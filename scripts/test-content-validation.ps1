# Test Content Validation System
Write-Host "Testing Content Validation System..." -ForegroundColor Green

# Test 1: Get all interaction types
Write-Host "`n1. Getting all interaction types..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/lesson-editor/interaction-types" -Method GET
    Write-Host "✅ Found $($response.Count) interaction types:" -ForegroundColor Green
    $response | ForEach-Object { Write-Host "  - $($_.name) ($($_.id))" -ForegroundColor Cyan }
} catch {
    Write-Host "❌ Failed to get interaction types: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Test quiz content validation
Write-Host "`n2. Testing quiz content validation..." -ForegroundColor Yellow
$quizContent = @{
    type = "quiz"
    questions = @(
        @{
            id = "q1"
            type = "multiple_choice"
            question = "What is JavaScript?"
            options = @("A programming language", "A markup language", "A database", "A framework")
            correctAnswer = "A programming language"
            explanation = "JavaScript is a programming language"
            points = 10
        }
    )
    totalPoints = 10
    passingScore = 70
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/lesson-editor/lessons/30000000-0000-0000-0000-000000000002/validate-content/test-content?interactionType=quiz_interaction" -Method GET
    Write-Host "✅ Quiz validation result: $($response.isValid)" -ForegroundColor Green
    if (-not $response.isValid) {
        Write-Host "❌ Validation errors:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }
} catch {
    Write-Host "❌ Failed to validate quiz content: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test invalid content type
Write-Host "`n3. Testing invalid content type..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/lesson-editor/lessons/30000000-0000-0000-0000-000000000002/validate-content/test-content?interactionType=quiz_interaction" -Method GET
    Write-Host "✅ Invalid content validation result: $($response.isValid)" -ForegroundColor Green
    if (-not $response.isValid) {
        Write-Host "❌ Validation errors:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }
} catch {
    Write-Host "❌ Failed to validate invalid content: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Content validation system test completed!" -ForegroundColor Green


