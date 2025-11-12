# Lesson Approval Workflow - Automated End-to-End Test Script
# PowerShell script to test the approval workflow using API calls

param(
    [string]$BackendUrl = "http://localhost:3000",
    [string]$TenantId = "10000000-0000-0000-0000-000000000001",
    [string]$UserId = "20000000-0000-0000-0000-000000000001",
    [string]$TestLessonId = "30000000-0000-0000-0000-000000000001"
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Lesson Approval Workflow - E2E Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Backend URL: $BackendUrl"
Write-Host "  Tenant ID: $TenantId"
Write-Host "  User ID: $UserId"
Write-Host "  Test Lesson ID: $TestLessonId"
Write-Host ""

# Function to make HTTP requests
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    $url = "$BackendUrl$Endpoint"
    $allHeaders = @{
        "Content-Type" = "application/json"
        "x-tenant-id" = $TenantId
        "x-user-id" = $UserId
    }
    
    foreach ($key in $Headers.Keys) {
        $allHeaders[$key] = $Headers[$key]
    }
    
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            Write-Host "Request: $Method $url" -ForegroundColor DarkGray
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $allHeaders -Body $jsonBody
        } else {
            Write-Host "Request: $Method $url" -ForegroundColor DarkGray
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $allHeaders
        }
        return @{ Success = $true; Data = $response }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Test counters
$testsPassed = 0
$testsFailed = 0

function Test-Assertion {
    param(
        [string]$TestName,
        [bool]$Condition,
        [string]$FailureMessage = ""
    )
    
    if ($Condition) {
        Write-Host "  ✓ $TestName" -ForegroundColor Green
        $script:testsPassed++
    } else {
        Write-Host "  ✗ $TestName" -ForegroundColor Red
        if ($FailureMessage) {
            Write-Host "    $FailureMessage" -ForegroundColor Red
        }
        $script:testsFailed++
    }
}

# ============================================
# Phase 1: Get Original Lesson Data
# ============================================
Write-Host "`n[Phase 1] Getting original lesson data..." -ForegroundColor Cyan

$getLessonResult = Invoke-ApiRequest -Method "GET" -Endpoint "/lessons/$TestLessonId"

Test-Assertion -TestName "Get lesson endpoint returns data" -Condition $getLessonResult.Success

if ($getLessonResult.Success) {
    $originalLesson = $getLessonResult.Data
    Write-Host "  Original Title: $($originalLesson.title)" -ForegroundColor DarkGray
    Write-Host "  Original Description: $($originalLesson.description)" -ForegroundColor DarkGray
} else {
    Write-Host "  Cannot proceed without original lesson data" -ForegroundColor Red
    exit 1
}

# ============================================
# Phase 2: Create a Draft
# ============================================
Write-Host "`n[Phase 2] Creating a draft with changes..." -ForegroundColor Cyan

$draftData = @{
    title = "TEST DRAFT - $($originalLesson.title)"
    description = "This is a test draft created by the approval workflow test"
    category = $originalLesson.category
    difficulty = $originalLesson.difficulty
    durationMinutes = $originalLesson.durationMinutes
    thumbnailUrl = $originalLesson.thumbnailUrl
    tags = $originalLesson.tags
    structure = @{
        stages = @(
            @{
                title = "Introduction"
                description = "Welcome to the lesson"
                subStages = @(
                    @{
                        title = "Welcome"
                        scriptBlocks = @(
                            @{
                                text = "Welcome to this lesson! This script was modified in the draft."
                                idealTimestamp = 0
                                displayIfMissed = $true
                            }
                        )
                        interaction = $null
                    }
                )
            }
        )
    }
}

$createDraftBody = @{
    lessonId = $TestLessonId
    draftData = $draftData
    changeSummary = "Changed title and modified welcome script"
    changesCount = 2
}

$createDraftResult = Invoke-ApiRequest -Method "POST" -Endpoint "/lesson-drafts" -Body $createDraftBody

Test-Assertion -TestName "Create draft returns success" -Condition $createDraftResult.Success

if ($createDraftResult.Success) {
    $draftId = $createDraftResult.Data.draft.id
    Write-Host "  Draft ID: $draftId" -ForegroundColor DarkGray
    Test-Assertion -TestName "Draft ID is returned" -Condition ($null -ne $draftId)
} else {
    Write-Host "  Cannot proceed without draft ID" -ForegroundColor Red
    exit 1
}

# ============================================
# Phase 3: Verify Draft in Pending List
# ============================================
Write-Host "`n[Phase 3] Verifying draft appears in pending list..." -ForegroundColor Cyan

$getPendingResult = Invoke-ApiRequest -Method "GET" -Endpoint "/lesson-drafts/pending"

Test-Assertion -TestName "Get pending drafts returns success" -Condition $getPendingResult.Success

if ($getPendingResult.Success) {
    $pendingDrafts = $getPendingResult.Data
    Write-Host "  Found $($pendingDrafts.Count) pending draft(s)" -ForegroundColor DarkGray
    
    $ourDraft = $pendingDrafts | Where-Object { $_.lessonId -eq $TestLessonId }
    Test-Assertion -TestName "Our draft is in the pending list" -Condition ($null -ne $ourDraft)
    
    if ($ourDraft) {
        Test-Assertion -TestName "Draft has correct changes count" -Condition ($ourDraft.changesCount -eq 2)
        Test-Assertion -TestName "Draft has lesson title" -Condition ($null -ne $ourDraft.lessonTitle)
    }
}

# ============================================
# Phase 4: Get Draft by Lesson ID
# ============================================
Write-Host "`n[Phase 4] Getting draft by lesson ID..." -ForegroundColor Cyan

$getDraftByLessonResult = Invoke-ApiRequest -Method "GET" -Endpoint "/lesson-drafts/lesson/$TestLessonId"

Test-Assertion -TestName "Get draft by lesson ID returns success" -Condition $getDraftByLessonResult.Success

if ($getDraftByLessonResult.Success) {
    Test-Assertion -TestName "Draft exists flag is true" -Condition ($getDraftByLessonResult.Data.hasDraft -eq $true)
    Write-Host "  Draft Status: $($getDraftByLessonResult.Data.draft.status)" -ForegroundColor DarkGray
}

# ============================================
# Phase 5: Get Diff
# ============================================
Write-Host "`n[Phase 5] Getting diff for the draft..." -ForegroundColor Cyan

$getDiffResult = Invoke-ApiRequest -Method "GET" -Endpoint "/lesson-drafts/$draftId/diff"

Test-Assertion -TestName "Get diff returns success" -Condition $getDiffResult.Success

if ($getDiffResult.Success) {
    $diff = $getDiffResult.Data
    Write-Host "  Found $($diff.changesCount) change(s)" -ForegroundColor DarkGray
    
    Test-Assertion -TestName "Diff has changes array" -Condition ($null -ne $diff.changes)
    Test-Assertion -TestName "Diff changes count matches" -Condition ($diff.changes.Count -gt 0)
    
    Write-Host "  Changes:" -ForegroundColor DarkGray
    foreach ($change in $diff.changes) {
        Write-Host "    - $($change.type): $($change.field)" -ForegroundColor DarkGray
    }
}

# ============================================
# Phase 6: Verify Lesson Unchanged
# ============================================
Write-Host "`n[Phase 6] Verifying original lesson is unchanged..." -ForegroundColor Cyan

$checkLessonResult = Invoke-ApiRequest -Method "GET" -Endpoint "/lessons/$TestLessonId"

Test-Assertion -TestName "Lesson retrieval success" -Condition $checkLessonResult.Success

if ($checkLessonResult.Success) {
    $currentLesson = $checkLessonResult.Data
    Test-Assertion -TestName "Lesson title is unchanged" -Condition ($currentLesson.title -eq $originalLesson.title)
    Test-Assertion -TestName "Lesson description is unchanged" -Condition ($currentLesson.description -eq $originalLesson.description)
}

# ============================================
# Phase 7: Test Approval
# ============================================
Write-Host "`n[Phase 7] Approving the draft..." -ForegroundColor Cyan

$approveDraftResult = Invoke-ApiRequest -Method "POST" -Endpoint "/lesson-drafts/$draftId/approve"

Test-Assertion -TestName "Approve draft returns success" -Condition $approveDraftResult.Success

if ($approveDraftResult.Success) {
    Write-Host "  Approval message: $($approveDraftResult.Data.message)" -ForegroundColor DarkGray
}

# ============================================
# Phase 8: Verify Changes Applied
# ============================================
Write-Host "`n[Phase 8] Verifying changes were applied to live lesson..." -ForegroundColor Cyan

$verifyLessonResult = Invoke-ApiRequest -Method "GET" -Endpoint "/lessons/$TestLessonId"

Test-Assertion -TestName "Lesson retrieval after approval success" -Condition $verifyLessonResult.Success

if ($verifyLessonResult.Success) {
    $updatedLesson = $verifyLessonResult.Data
    Test-Assertion -TestName "Lesson title was updated" -Condition ($updatedLesson.title -eq "TEST DRAFT - $($originalLesson.title)")
    Test-Assertion -TestName "Lesson description was updated" -Condition ($updatedLesson.description -eq "This is a test draft created by the approval workflow test")
    
    Write-Host "  New Title: $($updatedLesson.title)" -ForegroundColor DarkGray
    Write-Host "  New Description: $($updatedLesson.description)" -ForegroundColor DarkGray
}

# ============================================
# Phase 9: Verify Draft No Longer Pending
# ============================================
Write-Host "`n[Phase 9] Verifying draft is no longer in pending list..." -ForegroundColor Cyan

$checkPendingResult = Invoke-ApiRequest -Method "GET" -Endpoint "/lesson-drafts/pending"

Test-Assertion -TestName "Get pending drafts after approval success" -Condition $checkPendingResult.Success

if ($checkPendingResult.Success) {
    $pendingDrafts = $checkPendingResult.Data
    $ourDraft = $pendingDrafts | Where-Object { $_.lessonId -eq $TestLessonId }
    Test-Assertion -TestName "Our draft is no longer in pending list" -Condition ($null -eq $ourDraft)
}

# ============================================
# Phase 10: Test Rejection Workflow
# ============================================
Write-Host "`n[Phase 10] Testing rejection workflow..." -ForegroundColor Cyan

# Create another draft
$rejectDraftData = @{
    title = "REJECT TEST - $($originalLesson.title)"
    description = "This draft will be rejected"
    category = $originalLesson.category
    difficulty = $originalLesson.difficulty
    durationMinutes = $originalLesson.durationMinutes
    thumbnailUrl = $originalLesson.thumbnailUrl
    tags = $originalLesson.tags
    structure = $originalLesson.data.structure
}

$createRejectDraftBody = @{
    lessonId = $TestLessonId
    draftData = $rejectDraftData
    changeSummary = "This will be rejected"
    changesCount = 1
}

$createRejectDraftResult = Invoke-ApiRequest -Method "POST" -Endpoint "/lesson-drafts" -Body $createRejectDraftBody

Test-Assertion -TestName "Create rejection test draft success" -Condition $createRejectDraftResult.Success

if ($createRejectDraftResult.Success) {
    $rejectDraftId = $createRejectDraftResult.Data.draft.id
    Write-Host "  Rejection Test Draft ID: $rejectDraftId" -ForegroundColor DarkGray
    
    # Reject the draft
    $rejectResult = Invoke-ApiRequest -Method "POST" -Endpoint "/lesson-drafts/$rejectDraftId/reject"
    
    Test-Assertion -TestName "Reject draft returns success" -Condition $rejectResult.Success
    
    if ($rejectResult.Success) {
        Write-Host "  Rejection message: $($rejectResult.Data.message)" -ForegroundColor DarkGray
        
        # Verify lesson was not changed
        $verifyNoChangeResult = Invoke-ApiRequest -Method "GET" -Endpoint "/lessons/$TestLessonId"
        
        if ($verifyNoChangeResult.Success) {
            $lessonAfterReject = $verifyNoChangeResult.Data
            Test-Assertion -TestName "Lesson unchanged after rejection" -Condition ($lessonAfterReject.title -ne "REJECT TEST - $($originalLesson.title)")
        }
    }
}

# ============================================
# Phase 11: Cleanup - Restore Original Lesson
# ============================================
Write-Host "`n[Phase 11] Cleanup - Restoring original lesson data..." -ForegroundColor Cyan

# Create a draft with original data
$restoreDraftData = @{
    title = $originalLesson.title
    description = $originalLesson.description
    category = $originalLesson.category
    difficulty = $originalLesson.difficulty
    durationMinutes = $originalLesson.durationMinutes
    thumbnailUrl = $originalLesson.thumbnailUrl
    tags = $originalLesson.tags
    structure = $originalLesson.data.structure
}

$restoreDraftBody = @{
    lessonId = $TestLessonId
    draftData = $restoreDraftData
    changeSummary = "Restoring original data after test"
    changesCount = 2
}

$restoreDraftResult = Invoke-ApiRequest -Method "POST" -Endpoint "/lesson-drafts" -Body $restoreDraftBody

if ($restoreDraftResult.Success) {
    $restoreDraftId = $restoreDraftResult.Data.draft.id
    
    # Auto-approve to restore
    $restoreApproveResult = Invoke-ApiRequest -Method "POST" -Endpoint "/lesson-drafts/$restoreDraftId/approve"
    
    Test-Assertion -TestName "Cleanup: Restore original data" -Condition $restoreApproveResult.Success
    
    if ($restoreApproveResult.Success) {
        Write-Host "  Original lesson data restored" -ForegroundColor Green
    }
}

# ============================================
# Test Summary
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "`n✓ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n✗ Some tests failed" -ForegroundColor Red
    exit 1
}

