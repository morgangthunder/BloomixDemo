# N8N Workflow Purposes – Developer & Agent Guide

> **When to read this guide:** Whenever you are adding, modifying, or connecting N8N workflows to app functionality. This system is the standard way to link N8N workflows to app features.

## Overview

The **Workflow Purposes** system provides an extensible way to assign N8N workflows to specific application use cases. Instead of hard-coding a single "Use for messages" button, the system maintains a **registry of purpose definitions** on the backend and lets the Super Admin assign any activated workflow (with a production webhook) to any purpose via the UI.

## Architecture

```
┌──────────────────┐     REST API      ┌──────────────────────────────┐
│  Frontend UI     │ ───────────────── │  Backend (NestJS)            │
│  n8n-flows       │                   │                              │
│  component       │  GET  /super-admin/n8n/workflow-purposes         │
│                  │  POST /super-admin/n8n/workflow-purposes/assign  │
│  Purpose modal   │  POST /super-admin/n8n/workflow-purposes/unassign│
│  + lozenges      │                   │                              │
└──────────────────┘                   │  WORKFLOW_PURPOSES[] config  │
                                       │  MessageDeliverySettings     │
                                       │   .workflowPurposes (JSON)   │
                                       └──────────────────────────────┘
```

## Key Files

| File | What it does |
|------|-------------|
| `backend/src/modules/super-admin/n8n-api.service.ts` | **WORKFLOW_PURPOSES array** – the single source of truth for available purpose definitions. Add new purposes here. |
| `backend/src/modules/super-admin/super-admin.controller.ts` | API endpoints: `GET workflow-purposes`, `POST assign`, `POST unassign` |
| `backend/src/modules/message-delivery-settings/message-delivery-settings.service.ts` | Storage & retrieval of purpose assignments (`workflowPurposes` JSON column). Also has `assignPurpose()`, `unassignPurpose()`, `getPurposeAssignments()`, `getWebhookUrlForPurpose()`. |
| `backend/src/entities/message-delivery-settings.entity.ts` | Entity with `workflowPurposes` text column (stores JSON). |
| `frontend/src/app/features/super-admin/n8n-flows.component.ts` | UI: purpose modal, lozenge display, assign/unassign actions. |

## How Purpose Assignments Are Stored

Assignments are stored as a JSON string in `message_delivery_settings.workflow_purposes`:

```json
{
  "message_email": {
    "workflowId": "abc123",
    "webhookUrl": "http://n8n:5678/webhook/send-email",
    "workflowName": "Send email via Brevo API",
    "assignedAt": "2026-02-10T12:00:00.000Z"
  }
}
```

## Adding a New Purpose

### Step 1: Add the purpose definition

In `backend/src/modules/super-admin/n8n-api.service.ts`, add an entry to the `WORKFLOW_PURPOSES` array:

```typescript
export const WORKFLOW_PURPOSES: WorkflowPurpose[] = [
  // ... existing purposes ...
  {
    key: 'lesson_completion',           // Unique key – used in code to look up the webhook
    displayName: 'Lesson completion',   // Shown in the UI modal
    description: 'Triggered when a student completes a lesson.',
    payloadFields: ['userId', 'lessonId', 'lessonTitle', 'completedAt'],
  },
];
```

### Step 2: Use the webhook in your feature code

In whatever service needs to call the workflow:

```typescript
import { MessageDeliverySettingsService } from '../message-delivery-settings/message-delivery-settings.service';

// Inject the service, then:
const url = await this.messageDeliverySettingsService.getWebhookUrlForPurpose('lesson_completion');
if (url) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, lessonId, lessonTitle, completedAt }),
  });
}
```

### Step 3: Create a workflow template (optional but recommended)

Create a JSON file in `n8n/workflows/` (e.g. `upora-lesson-completion-email.json`) with a Webhook trigger node. Add it to the `WORKFLOW_TEMPLATES` array in `n8n-api.service.ts` so it appears in the Templates tab.

### Step 4: Done!

The Super Admin can now:
1. Import the template (or create a workflow manually in N8N)
2. Activate the workflow
3. Click **"Select use case"** → choose **"Lesson completion"** → **Save**

The purpose lozenge appears on the workflow card, and your backend code can now call the webhook.

## Special Behavior: `message_email` Purpose

The `message_email` purpose has **backward-compatible syncing**:
- When assigned, the system also sets `n8nWebhookUrl` and `emailDeliveryMethod = 'n8n_webhook'` on `MessageDeliverySettings`.
- When unassigned, it clears `n8nWebhookUrl`.
- This means the existing `MessagesService.getEffectiveEmailConfig()` continues to work without changes.

If you add a new purpose that needs similar backward compatibility, add sync logic to `assignPurpose()` and `unassignPurpose()` in `message-delivery-settings.service.ts`.

## API Reference

### `GET /super-admin/n8n/workflow-purposes`

Returns available purposes and current assignments.

```json
{
  "purposes": [
    { "key": "message_email", "displayName": "Sending emails", "description": "...", "payloadFields": [...] }
  ],
  "assignments": {
    "message_email": { "workflowId": "...", "webhookUrl": "...", "workflowName": "...", "assignedAt": "..." }
  }
}
```

### `POST /super-admin/n8n/workflow-purposes/assign`

Body: `{ purposeKey, workflowId, webhookUrl, workflowName }`

### `POST /super-admin/n8n/workflow-purposes/unassign`

Body: `{ purposeKey }`

## Checklist for Future Agents

When working with N8N workflows in this codebase:

- [ ] **Read this guide first** before adding any N8N workflow integration
- [ ] Add your purpose to `WORKFLOW_PURPOSES` in `n8n-api.service.ts`
- [ ] Use `getWebhookUrlForPurpose('your_key')` to get the webhook URL at runtime
- [ ] Create a workflow template JSON if applicable
- [ ] Test: import template → activate → assign purpose → trigger from app
- [ ] Update this guide if you add backward-compat sync logic
