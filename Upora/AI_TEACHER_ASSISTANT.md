# AI Teacher Assistant - Technical Documentation

## Overview

The AI Teacher Assistant is a real-time tutoring system that provides contextual guidance to students as they progress through interactive lessons. It uses Large Language Models (LLMs) to understand student questions, analyze lesson context, and provide personalized educational support.

## Architecture

### Components

1. **Frontend Components**
   - `lesson-view.component.ts` - Main lesson viewing interface
   - `floating-teacher-widget.component.ts` - Chat UI widget
   - `websocket.service.ts` - WebSocket communication layer

2. **Backend Services**
   - `chat.gateway.ts` - WebSocket gateway for real-time communication
   - `ai-assistant.service.ts` - Core AI assistant logic
   - `grok.service.ts` - LLM API integration (Grok/X.AI)
   - `weaviate.service.ts` - Vector database for semantic search
   - `ai-prompts.service.ts` - Prompt management

3. **Database**
   - `ai_prompts` table - Stores editable prompts for each assistant
   - `llm_generation_log` table - Tracks token usage and costs
   - `processed_content_output` table - Links lessons to vectorized content

## Data Flow

### 1. Student Sends Message

```
Frontend (lesson-view.component.ts)
  ↓
sendChatMessage()
  ↓
WebSocket Service (websocket.service.ts)
  ↓
sendMessage() - includes:
  - message text
  - conversationHistory
  - lessonData (full lesson JSON)
  - currentStageInfo (stage/sub-stage context)
  - screenshot (optional)
  ↓
WebSocket Gateway (chat.gateway.ts)
  ↓
handleMessage()
```

### 2. Backend Processing

```
Chat Gateway (chat.gateway.ts)
  ↓
Extracts: lessonId, userId, tenantId, message, context
  ↓
Fetches lesson data if not provided
  ↓
Creates User object
  ↓
Formats conversation history
  ↓
AI Assistant Service (ai-assistant.service.ts)
  ↓
chat() method:
  1. Load prompt from database
  2. Process conversation history (summarize if >6000 chars)
  3. Search Weaviate for relevant content (if teacher + lessonId)
  4. Load screenshot criteria prompt
  5. Estimate token usage
  6. Summarize prompt if needed (if >28000 tokens)
  7. Build user message with context
  8. Call Grok API
  9. Log usage
  10. Return response
```

### 3. Response Handling

```
AI Assistant Service
  ↓
Returns: { content, tokensUsed }
  ↓
Chat Gateway
  ↓
Checks for [SCREENSHOT_REQUEST] marker
  ↓
If screenshot requested:
  - Emits 'screenshot-request' event
  - Frontend captures screenshot
  - Student sends screenshot back
Else:
  - Emits 'message' event with AI response
  - Updates chat UI
```

## Context Information Included in Queries

Every AI Teacher query includes the following context sections (in order):

### 1. Current Stage and Sub-Stage (NEW - Always Included)

```
=== CURRENT STAGE AND SUB-STAGE ===
Stage: [Stage Title] ([Stage Type])
Sub-Stage: [Sub-Stage Title] ([Sub-Stage Type])

The student is currently viewing this stage/sub-stage in the lesson. Use this context to provide relevant guidance.
```

**Purpose**: Ensures the AI always knows where the student is in the lesson progression.

**Implementation**:
- Frontend tracks `activeStageId` and `activeSubStageId` in `lesson-view.component.ts`
- Passed via `currentStageInfo` in WebSocket message
- Included at the beginning of context in `buildUserMessage()`

**Cases Handled**:
- ✅ Stage with sub-stage
- ✅ Stage without sub-stage
- ✅ Stage/sub-stage without type
- ✅ Missing stage info (section not included)

### 2. Lesson Data

```
=== LESSON DATA ===
[Full lesson JSON structure]
```

**Purpose**: Provides complete lesson structure, objectives, and content.

**Implementation**:
- Full lesson JSON from database
- Includes all stages, sub-stages, interactions, and metadata

### 3. Relevant Content Chunks (Weaviate Search)

```
=== RELEVANT CONTENT CHUNKS ===
[Content Chunk 1]
Title: [Title]
Summary: [Summary]
Content: [Truncated to 500 chars]
Topics: [Topic1, Topic2, ...]
Source: [URL]
...
```

**Purpose**: Provides semantically relevant content from processed sources linked to the lesson.

**Implementation**:
- Searches `processed_content_output` for lesson's content sources
- Uses Weaviate vector search with student's question
- Returns top relevant chunks with metadata

**Cases Handled**:
- ✅ Content sources found and searched
- ✅ No content sources (empty array)
- ✅ Weaviate search fails (continues without results)

### 4. Screenshot (Optional)

```
=== SCREENSHOT ===
[Base64-encoded image data]
```

**Purpose**: Visual context when student provides screenshot or AI requests one.

**Implementation**:
- Captured using `html2canvas` in frontend
- Sent as base64 string
- Included in context when present

### 5. Reference Document (Optional - For Iframe Interactions)

```
=== REFERENCE DOCUMENT ===
[Document content text]
```

**Purpose**: Guide document uploaded for iframe interactions to help AI understand lesson objectives.

**Implementation**:
- Stored in `interaction_types.iframe_document_url`
- Read from file storage when iframe screenshot is triggered
- Included in iframe screenshot prompt context

**Cases Handled**:
- ✅ Document provided (included in context)
- ✅ No document (section not included)

### 6. Trigger Event (Optional - For Iframe Screenshots)

```
=== TRIGGER EVENT ===
[iframeLoad | iframeUrlChange | postMessage | scriptBlockComplete | periodic]
```

**Purpose**: Indicates why the screenshot was captured.

**Implementation**:
- Set when iframe screenshot is automatically triggered
- Helps AI understand the context of the capture

## Prompt System

### Prompt Types

1. **General Prompt** (`teacher.general`)
   - Main prompt for all AI Teacher queries
   - Editable via `/super-admin/ai-prompts?assistant=teacher`
   - Includes instructions for brief responses (<100 words)

2. **Screenshot Criteria Prompt** (`teacher.screenshot-criteria`)
   - Defines when AI should request screenshots
   - Included in system prompt for teacher assistant
   - Editable via admin interface

3. **Conversation Summary Prompt** (`teacher.conversation-summary`)
   - Used to summarize long conversation history
   - Triggered when history exceeds 6000 characters
   - Editable via admin interface

4. **IFrame Screenshot Prompt** (`teacher.iframe-screenshot`)
   - Specialized prompt for analyzing iframe screenshots
   - Includes instructions to reference document if provided
   - Editable via admin interface

### Prompt Loading

- Prompts loaded from `ai_prompts` table
- Cached in service for performance
- Placeholders replaced with actual context:
  - `{lesson_data}` → "See user message below"
  - `{relevant_content_chunks}` → "See user message below"
  - `{conversation_history}` → "See user message below"
  - `{student_question}` → "See user message below"

## Conversation History Management

### Threshold-Based Summarization

- **Threshold**: 6000 characters total
- **Process**:
  1. Calculate total character count of conversation history
  2. If exceeds threshold, call LLM to summarize
  3. Replace full history with summary message
  4. Continue with summarized context

### Summary Format

```
[Previous conversation summary]: [LLM-generated summary]
```

**Purpose**: Prevents token bloat while preserving important context.

## Token Management

### Estimation

- **Characters per token**: ~4 (approximate)
- **Max estimated tokens**: 28,000
- **Calculation**: `totalChars / 4`

### Dynamic Prompt Summarization

If estimated tokens exceed 28,000:
1. Call LLM to summarize the system prompt
2. Use summarized prompt instead of full prompt
3. Continue with reduced prompt size

**Purpose**: Prevents API errors and reduces costs.

## Weaviate Integration

### Search Process

1. Find all `ProcessedContentOutput` records for lesson's content sources
2. Extract `contentSourceId`s
3. Call `weaviateService.searchByContentSourceIds()` with:
   - Student's question as query
   - Content source IDs as filter
   - Tenant ID for isolation
4. Return top relevant chunks

### Content Chunk Format

Each chunk includes:
- `title` - Content title
- `summary` - Brief summary
- `fullText` - Full text (truncated to 500 chars in context)
- `topics` - Array of topic tags
- `sourceUrl` - Original source URL
- `relevanceScore` - Semantic similarity score

## Screenshot Functionality

### Screenshot Request Flow

1. **AI Requests Screenshot**:
   - AI responds with `[SCREENSHOT_REQUEST]` marker
   - Gateway detects marker
   - Emits `screenshot-request` event to frontend
   - Frontend shows request to student

2. **Student Provides Screenshot**:
   - Frontend captures screenshot using `html2canvas`
   - Sends screenshot as base64 in next message
   - `isScreenshotRequest: true` flag set
   - AI analyzes screenshot with visual context

### Screenshot Criteria

Defined in `teacher.screenshot-criteria` prompt:
- Visual context needed
- Interaction issues
- Layout/display questions
- Progress/state questions
- Unclear context

## Iframe Interaction Support

### Screenshot Triggers

Configurable per iframe interaction type:
- `iframeLoad` - When iframe loads
- `iframeUrlChange` - When iframe URL changes
- `postMessage` - When postMessage received
- `scriptBlockComplete` - When script block completes
- `periodic` - At configured intervals

### Document Upload

- One document per iframe interaction type
- Stored in `interaction_types.iframe_document_url`
- File types: PDF, DOCX, DOC, TXT
- Max size: 10MB
- Always included in iframe screenshot queries

### Iframe Screenshot Prompt

Specialized prompt that:
- Analyzes screenshot of iframed website
- References uploaded document as guide
- Provides brief feedback (<100 words)
- Offers actionable next steps (<50 words)

## Token Usage Tracking

### Logging

Every AI call logs to `llm_generation_log` table:
- `userId` - Student ID
- `tenantId` - Tenant ID
- `assistantId` - 'teacher'
- `promptKey` - Prompt key used
- `tokensUsed` - Total tokens consumed
- `model` - LLM model used
- `timestamp` - When call was made

### Cost Tracking

- Token usage tracked per user/tenant
- Viewable via `/super-admin/llm-usage`
- Helps monitor AI costs

## Input Validation

### Character Limits

- **User input limit**: 2000 characters
- Enforced in frontend (textarea `maxlength`)
- Prevents token limit issues

### Error Handling

- Invalid input: Error message to user
- API failures: Graceful error with retry option
- Weaviate failures: Continue without search results
- Prompt loading failures: Use default prompts

## Cases Handled

### ✅ Implemented

1. **Basic Chat**
   - Student sends message → AI responds
   - Conversation history maintained
   - Context included (stage, lesson, content)

2. **Screenshot Requests**
   - AI can request screenshots
   - Student can provide screenshots
   - Screenshots analyzed with context

3. **Long Conversations**
   - History summarized when >6000 chars
   - Summary preserves important context

4. **Large Prompts**
   - Prompt summarized if >28000 tokens estimated
   - Prevents API errors

5. **Weaviate Integration**
   - Semantic search for relevant content
   - Graceful degradation if search fails

6. **Iframe Screenshots**
   - Automatic screenshot capture on triggers
   - Document reference included
   - Specialized prompt for analysis

7. **Stage/Sub-Stage Context**
   - Always included in queries
   - Helps AI understand lesson position
   - Handles missing stage info gracefully

8. **Multi-Tenant Support**
   - Tenant isolation in Weaviate
   - Tenant-specific prompts (future)
   - Tenant-specific usage tracking

### ⚠️ Not Yet Implemented

1. **Multi-User Support**
   - Currently single-user per lesson
   - No shared chat rooms
   - No teacher-student separation

2. **Voice Input**
   - Text-only input
   - No speech-to-text
   - No voice responses

3. **Image Analysis Beyond Screenshots**
   - No image upload/analysis
   - No diagram recognition
   - No handwriting recognition

4. **Persistent Chat History**
   - Chat history not saved to database
   - Lost on page refresh
   - No chat history retrieval

5. **Advanced Context Filtering**
   - All lesson data sent (could be large)
   - No selective context inclusion
   - No context compression beyond summarization

6. **Multi-Language Support**
   - English-only prompts
   - No language detection
   - No translation

7. **Response Streaming**
   - Full response returned at once
   - No token-by-token streaming
   - No typing indicators from backend

8. **Custom Prompts Per Lesson**
   - Global prompts only
   - No lesson-specific customization
   - No stage-specific prompts

9. **Feedback Collection**
   - No "was this helpful?" feedback
   - No response rating
   - No improvement suggestions

10. **Analytics**
    - Basic token usage tracking
    - No response quality metrics
    - No student engagement tracking
    - No common question patterns

11. **Rate Limiting**
    - No per-user rate limits
    - No abuse prevention
    - No cost controls per user

12. **Context Window Optimization**
    - Fixed context sections
    - No dynamic context selection
    - No relevance-based filtering

13. **Caching**
    - No response caching
    - No prompt caching beyond service level
    - No Weaviate result caching

14. **Error Recovery**
    - Basic error messages
    - No automatic retries
    - No fallback responses

15. **Accessibility**
    - No screen reader optimization
    - No keyboard-only navigation
    - No high contrast mode

## Testing

### Test Coverage

1. **Unit Tests**
   - `ai-assistant.service.spec.ts` - Core service tests
   - `ai-assistant-iframe.spec.ts` - Iframe screenshot tests
   - `ai-assistant-stage-context.spec.ts` - Stage/sub-stage context tests

2. **Test Cases**
   - ✅ Stage/sub-stage inclusion
   - ✅ Missing stage info handling
   - ✅ Weaviate search integration
   - ✅ Screenshot handling
   - ✅ Document reference inclusion
   - ✅ Conversation summarization
   - ✅ Token estimation
   - ✅ Prompt loading

### Running Tests

```bash
# Run all AI assistant tests
npm test -- --testPathPattern="ai-assistant"

# Run specific test file
npm test -- --testPathPattern="ai-assistant-stage-context"
```

## Configuration

### Environment Variables

- `GROK_API_KEY` - X.AI API key
- `GROK_MOCK_MODE` - Use mock responses (true/false)
- `WEAVIATE_URL` - Weaviate instance URL
- `WEAVIATE_API_KEY` - Weaviate API key

### Database Configuration

- Prompts stored in `ai_prompts` table
- Editable via `/super-admin/ai-prompts?assistant=teacher`
- Changes take effect immediately (no restart needed)

## Performance Considerations

### Optimizations

1. **Prompt Caching**: Prompts cached in service
2. **History Summarization**: Prevents token bloat
3. **Content Truncation**: Full text limited to 500 chars
4. **Selective Weaviate Search**: Only for teacher + lessonId

### Bottlenecks

1. **Weaviate Search**: Can be slow with many content sources
2. **Large Lesson Data**: Full JSON can be large
3. **Screenshot Encoding**: Base64 encoding increases size
4. **LLM API Latency**: External API calls add delay

## Security Considerations

### Current Implementation

- ✅ Tenant isolation in Weaviate
- ✅ User ID tracking for usage
- ✅ Input validation (character limits)
- ✅ File upload validation (type, size)

### Potential Improvements

- ⚠️ No rate limiting per user
- ⚠️ No input sanitization for XSS
- ⚠️ No authentication on WebSocket
- ⚠️ No encryption for sensitive data

## Future Enhancements

### Planned Features

1. **Persistent Chat History**
   - Save conversations to database
   - Retrieve previous conversations
   - Search chat history

2. **Advanced Analytics**
   - Response quality metrics
   - Student engagement tracking
   - Common question patterns

3. **Custom Prompts**
   - Lesson-specific prompts
   - Stage-specific prompts
   - Custom instructions per lesson

4. **Multi-Modal Support**
   - Voice input/output
   - Image upload/analysis
   - Video analysis

5. **Response Streaming**
   - Token-by-token streaming
   - Real-time typing indicators
   - Better UX for long responses

## Troubleshooting

### Common Issues

1. **AI Not Responding**
   - Check WebSocket connection
   - Verify API key is set
   - Check backend logs for errors

2. **Missing Context**
   - Verify stage/sub-stage is set
   - Check lesson data is loaded
   - Verify Weaviate search is working

3. **High Token Usage**
   - Check conversation history length
   - Verify prompt size
   - Review lesson data size

4. **Screenshot Not Working**
   - Check `html2canvas` is loaded
   - Verify screenshot capture permissions
   - Check base64 encoding

## Related Documentation

- [Weaviate Integration](./WEAVIATE_INTEGRATION.md) - Vector database setup
- [WebSocket Architecture](./WEBSOCKET_ARCHITECTURE.md) - Real-time communication
- [Prompt Management](./PROMPT_MANAGEMENT.md) - Admin prompt editing

## Version History

- **v0.1.21**: Added stage/sub-stage context inclusion
- **v0.1.20**: Added iframe screenshot support with document references
- **v0.1.19**: Added Weaviate integration for content search
- **v0.1.18**: Added conversation history summarization
- **v0.1.17**: Initial AI Teacher implementation

