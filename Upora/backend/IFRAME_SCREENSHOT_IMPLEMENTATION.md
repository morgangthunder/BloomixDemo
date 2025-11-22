# Iframe Screenshot Implementation Plan

## Status

### ✅ Completed
1. Frontend UI for screenshot trigger options
2. Frontend UI for document upload
3. Frontend methods for screenshot triggers and document handling
4. Database entity updated with document fields

### 🚧 In Progress
1. Backend document upload endpoints
2. File storage service (S3/MinIO)
3. Database migration for new columns

### ⏳ Pending
1. Iframe event detection in lesson-view component
2. Screenshot handler that sends to AI
3. AI prompt for iframe screenshots
4. Integration with Weaviate and lesson context

## Implementation Details

### Screenshot Triggers
- `iframeLoad`: When iframe src loads
- `iframeUrlChange`: When iframe src changes
- `postMessage`: When iframed site sends postMessage
- `scriptBlockComplete`: When script block finishes
- `periodic`: Timer-based (configurable interval)

### Document Upload
- Max 10MB
- Supported: PDF, DOCX, TXT
- Stored in S3/MinIO
- Associated with interaction via `iframeDocumentUrl` and `iframeDocumentFileName`

### Screenshot Handler Flow
1. Event detected (load, URL change, postMessage, script complete, periodic)
2. Capture screenshot of iframe area
3. Load document content (if exists)
4. Get lesson JSON
5. Query Weaviate for relevant content chunks
6. Send to AI with "IFrame Screenshot Prompt"
7. Display brief AI guidance in chat

