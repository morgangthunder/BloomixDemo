# Lesson Approval Workflow - End-to-End Test Plan

## Overview
This document outlines the manual testing procedure for the lesson approval workflow system, which allows lesson editors to save drafts that must be approved before going live.

## Prerequisites
- Backend server running on http://localhost:3000
- Frontend server running on http://localhost:8100
- Database with at least one lesson (e.g., lesson ID: `30000000-0000-0000-0000-000000000001`)

## Test Workflow

### Phase 1: Create a Draft
**Objective:** Create a lesson draft with changes that will need approval

1. Navigate to the lesson editor for an existing lesson
   - URL: `http://localhost:8100/lesson-editor/{lessonId}`
   - Example: `http://localhost:8100/lesson-editor/30000000-0000-0000-0000-000000000001`

2. Make changes to the lesson:
   - Modify the lesson title
   - Change the description  
   - Edit script blocks
   - Add new script blocks
   - Change interaction types

3. Click "Save Draft" button
   - **Expected:** Draft is saved to the `lesson_drafts` table with status='pending'
   - **Expected:** Success message shows "Draft saved successfully"
   - **Expected:** Changes are NOT applied to the live lesson yet

4. Verify draft in database:
```sql
SELECT * FROM lesson_drafts WHERE lesson_id = '30000000-0000-0000-0000-000000000001';
```

### Phase 2: View Pending Drafts
**Objective:** View all pending drafts in the approval queue

1. Navigate to the Super-Admin dashboard
   - URL: `http://localhost:8100/super-admin`

2. Click on "Lesson Approval Queue" tile
   - URL should change to: `http://localhost:8100/super-admin/approval-queue`

3. Verify the pending draft is listed:
   - **Expected:** Draft card shows lesson title
   - **Expected:** Draft card shows number of changes
   - **Expected:** Draft card shows "Updated X ago" timestamp
   - **Expected:** Draft card has three buttons: "View Changes", "Approve", "Reject"

### Phase 3: View Changes (Diff)
**Objective:** Review the differences between the draft and live lesson

1. Click "View Changes" button on a draft
   - **Expected:** Modal opens showing the changes

2. Verify diff content:
   - **Expected:** Modal title shows "Changes for: [Lesson Title]"
   - **Expected:** Each change is shown with:
     - Change type badge (Title, Description, Script Text, etc.)
     - Field name
     - "Before" value (in red background)
     - Arrow indicator
     - "After" value (in green background)
     - Context (for script blocks showing which stage/sub-stage)

3. Test modal controls:
   - **Expected:** "Close" button closes the modal
   - **Expected:** "Reject" button is visible
   - **Expected:** "Approve" button is visible
   - **Expected:** "X" close button in header works

### Phase 4: Reject a Draft
**Objective:** Test rejecting a draft

1. Create a new draft (repeat Phase 1) OR use the same draft
2. In the approval queue, click "Reject" button (either from the list or from the changes modal)
3. Confirm the rejection in the confirmation dialog
   - **Expected:** Confirmation message shows
   - **Expected:** After confirmation, draft is marked as 'rejected' in database
   - **Expected:** Draft is removed from the pending list
   - **Expected:** Live lesson remains unchanged

4. Verify in database:
```sql
SELECT status, reviewed_at, reviewed_by FROM lesson_drafts WHERE id = '[draft_id]';
```
   - **Expected:** status = 'rejected'
   - **Expected:** reviewed_at is set
   - **Expected:** reviewed_by is set

### Phase 5: Approve a Draft
**Objective:** Test approving a draft and applying changes to live lesson

1. Create a new draft with specific changes (repeat Phase 1)
   - Note the original lesson title/description
   - Change title to: "APPROVED TEST - [Original Title]"
   - Change description to: "This lesson was approved through the workflow"

2. In the approval queue, click "View Changes" to review
3. Click "Approve" button
4. Confirm the approval in the confirmation dialog
   - **Expected:** Confirmation message shows: "Approve changes to "[Lesson Title]"? This will make the changes live."
   - **Expected:** After confirmation, success message: "Draft approved successfully! Changes are now live."
   - **Expected:** Draft is marked as 'approved' in database
   - **Expected:** Draft is removed from the pending list

5. Verify changes were applied to live lesson:
```sql
SELECT title, description FROM lessons WHERE id = '30000000-0000-0000-0000-000000000001';
```
   - **Expected:** Title shows: "APPROVED TEST - [Original Title]"
   - **Expected:** Description shows: "This lesson was approved through the workflow"

6. Navigate to the lesson player and verify changes are live:
   - URL: `http://localhost:8100/lesson/30000000-0000-0000-0000-000000000001`
   - **Expected:** Lesson loads with the new title and description
   - **Expected:** Any script changes are reflected
   - **Expected:** Any interaction changes are reflected

### Phase 6: Multiple Drafts
**Objective:** Test handling multiple drafts from different lessons

1. Create drafts for 2-3 different lessons
2. Navigate to approval queue
   - **Expected:** All pending drafts are listed
   - **Expected:** Drafts are sorted by most recent first

3. Approve one draft
   - **Expected:** Only that draft is removed from the list
   - **Expected:** Other drafts remain in pending status

4. Reject another draft
   - **Expected:** Draft is removed from the pending list
   - **Expected:** Other drafts remain unaffected

### Phase 7: Draft Updates
**Objective:** Test updating an existing draft

1. Create a draft for a lesson (Phase 1)
2. Without approving, go back to the lesson editor
3. Make additional changes
4. Click "Save Draft" again
   - **Expected:** Existing draft is updated (not a new draft created)
   - **Expected:** Updated timestamp changes
   - **Expected:** Changes count may increase

5. Verify in database:
```sql
SELECT COUNT(*) as draft_count FROM lesson_drafts 
WHERE lesson_id = '30000000-0000-0000-0000-000000000001' AND status = 'pending';
```
   - **Expected:** draft_count = 1 (not 2)

### Phase 8: Edge Cases

#### Test 8.1: No Pending Drafts
1. Approve or reject all pending drafts
2. Navigate to approval queue
   - **Expected:** Empty state shows with message "No Pending Drafts"
   - **Expected:** Message shows "All lesson changes have been reviewed!"

#### Test 8.2: Approve Already Reviewed Draft
1. Try to approve a draft that's already been approved (via API call)
   - **Expected:** Error: "Draft has already been reviewed"

#### Test 8.3: Delete Approved Draft
1. Try to delete an approved draft (via API call)
   - **Expected:** Error: "Cannot delete approved draft"

#### Test 8.4: Draft for Non-existent Lesson
1. Try to create a draft for a lesson ID that doesn't exist
   - **Expected:** Error or graceful handling

## API Endpoints to Test

### Create/Update Draft
```http
POST /lesson-drafts
Headers:
  x-tenant-id: 10000000-0000-0000-0000-000000000001
  x-user-id: 20000000-0000-0000-0000-000000000001
Body:
{
  "lessonId": "30000000-0000-0000-0000-000000000001",
  "draftData": { ... lesson JSON ... },
  "changeSummary": "Updated title and script blocks",
  "changesCount": 3
}
```

### Get Pending Drafts
```http
GET /lesson-drafts/pending
Headers:
  x-tenant-id: 10000000-0000-0000-0000-000000000001
```

### Get Draft by Lesson ID
```http
GET /lesson-drafts/lesson/{lessonId}
```

### Get Diff
```http
GET /lesson-drafts/{draftId}/diff
```

### Approve Draft
```http
POST /lesson-drafts/{draftId}/approve
Headers:
  x-user-id: 20000000-0000-0000-0000-000000000001
```

### Reject Draft
```http
POST /lesson-drafts/{draftId}/reject
Headers:
  x-user-id: 20000000-0000-0000-0000-000000000001
```

### Delete Draft
```http
DELETE /lesson-drafts/{draftId}
```

## Database Verification Queries

### Check Draft Status
```sql
SELECT id, lesson_id, status, changes_count, created_at, updated_at, reviewed_at, reviewed_by
FROM lesson_drafts
WHERE tenant_id = '10000000-0000-0000-0000-000000000001';
```

### Check Lesson Data
```sql
SELECT id, title, description, updated_at
FROM lessons
WHERE id = '30000000-0000-0000-0000-000000000001';
```

### Check Approved Drafts
```sql
SELECT * FROM lesson_drafts WHERE status = 'approved' ORDER BY reviewed_at DESC LIMIT 10;
```

### Check Rejected Drafts
```sql
SELECT * FROM lesson_drafts WHERE status = 'rejected' ORDER BY reviewed_at DESC LIMIT 10;
```

## Success Criteria

✅ Drafts can be created and saved without affecting live lessons
✅ Pending drafts appear in the approval queue
✅ Changes can be viewed in a clear, easy-to-understand diff format
✅ Drafts can be approved, applying changes to live lessons
✅ Drafts can be rejected without affecting live lessons
✅ Only one draft per lesson exists at a time
✅ Updating a draft updates the existing one, not creates a new one
✅ Approved drafts cannot be modified or deleted
✅ All changes are tracked with timestamps and reviewer IDs
✅ UI provides clear feedback for all actions
✅ Database integrity is maintained throughout the workflow

## Known Issues / Future Enhancements

1. **Missing Implementation in Lesson Editor:**
   - The `saveDraft()` and `submitForApproval()` methods in lesson-editor.component.ts are currently placeholders
   - Need to implement actual API calls to save drafts
   - Need to integrate with actual lesson data editing

2. **No Edit Tracking:**
   - Currently no visual indication in the lesson editor that a draft exists
   - Could add a banner or indicator when editing a lesson that has a pending draft

3. **No Rollback:**
   - Once approved, changes cannot be reverted through the UI
   - May want to add version history/rollback capability

4. **No Comments:**
   - Reviewers cannot add comments when rejecting
   - May want to add a rejection reason field

5. **No Notifications:**
   - No notifications to editors when their drafts are approved/rejected
   - Could add email or in-app notifications

## Test Results

| Test Phase | Status | Notes |
|------------|--------|-------|
| Phase 1: Create Draft | ⏳ Not Tested | |
| Phase 2: View Pending Drafts | ⏳ Not Tested | |
| Phase 3: View Changes | ⏳ Not Tested | |
| Phase 4: Reject Draft | ⏳ Not Tested | |
| Phase 5: Approve Draft | ⏳ Not Tested | |
| Phase 6: Multiple Drafts | ⏳ Not Tested | |
| Phase 7: Draft Updates | ⏳ Not Tested | |
| Phase 8: Edge Cases | ⏳ Not Tested | |

---

**Test Date:** [To be filled]
**Tester:** [To be filled]
**Version:** Frontend v0.3.0, Backend v0.3.0

