# Test Plan: AI SDK for Interactions Implementation

## Overview
This test plan covers all aspects of the AI SDK implementation for interactions, including the AI Interaction Handler, Inventor assistant, and interaction event handling.

**Date:** 2025-11-29  
**Version:** Frontend 0.1.11, Backend 0.1.3

---

## Prerequisites

1. **Services Running:**
   - Frontend: `http://localhost:8100`
   - Backend: `http://localhost:3000`
   - PostgreSQL, Redis, Weaviate, n8n all healthy

2. **Test Data:**
   - At least one lesson with a True/False interaction
   - At least one content source with processed content
   - Access to Super Admin panel

3. **Tools:**
   - Browser DevTools (Console, Network tab)
   - WebSocket inspector (optional)
   - Database access (optional, for verification)

---

## Test Suite 1: Super Admin - AI Prompts Configuration

### Test 1.1: AI Interaction Handler Tile Display
**Objective:** Verify the AI Interaction Handler tile appears correctly

**Steps:**
1. Navigate to `http://localhost:8100/super-admin/ai-prompts`
2. Verify tile shows as "AI Interaction Handler" (not "AI Teacher (Interactions)")
3. Verify icon is 🤖
4. Verify description mentions "multi-layer prompt system"

**Expected Result:**
- Tile displays correctly with new name
- Description is accurate

---

### Test 1.2: AI Interaction Handler Prompts
**Objective:** Verify all prompts are present and editable

**Steps:**
1. Click on "AI Interaction Handler" tile
2. Verify URL shows `?assistant=ai-teacher`
3. Verify the following prompts are visible:
   - Base System Prompt
   - SDK Content Reference (For AI Interaction Handler Responses)
   - Event Handling Instructions
   - Response Format Instructions
4. Edit each prompt and click "Save"
5. Verify save confirmation appears
6. Refresh page and verify changes persist

**Expected Result:**
- All 4 prompts are visible and editable
- Changes save successfully
- Prompts persist after refresh

---

### Test 1.3: Inventor Assistant SDK Documentation
**Objective:** Verify SDK documentation is available for Inventor

**Steps:**
1. Navigate to `http://localhost:8100/super-admin/ai-prompts`
2. Click on "Inventor (Interaction Builder)" tile
3. Verify the following prompts are visible:
   - HTML Interaction Assistant
   - PixiJS Interaction Assistant
   - iFrame Interaction Assistant
   - General Interaction Assistant
   - **SDK Reference: HTML Interactions** (NEW)
   - **SDK Reference: PixiJS Interactions** (NEW)
   - **SDK Reference: iFrame Interactions** (NEW)
4. Review each SDK Reference prompt content
5. Verify they contain:
   - Setup code with `createIframeAISDK()`
   - Core methods (emitEvent, updateState, onResponse, onAction)
   - Standard events
   - Response actions
   - Example code snippets

**Expected Result:**
- All 3 new SDK Reference prompts are present
- Content is concise but complete
- Examples are relevant to each interaction type

---

## Test Suite 2: Interaction Builder - AI Configuration

### Test 2.1: AI Tab Visibility
**Objective:** Verify AI tab appears in Interaction Builder

**Steps:**
1. Navigate to `http://localhost:8100/interaction-builder`
2. Select an existing interaction (e.g., True/False Selection)
3. Verify "🤖 AI" tab is visible in the tab bar
4. Click on the AI tab
5. Verify AI configuration section loads

**Expected Result:**
- AI tab is visible and clickable
- AI configuration section displays correctly

---

### Test 2.2: AI Tab Content
**Objective:** Verify AI tab contains all expected fields

**Steps:**
1. With an interaction selected, open the AI tab
2. Verify the following fields are present:
   - Custom Prompt Template (textarea)
   - Event Handlers (JSON textarea)
   - Response Actions (JSON textarea)
   - SDK Quick Reference section
3. Verify placeholders and hints are displayed
4. Verify JSON validation error messages appear for invalid JSON

**Expected Result:**
- All fields are present and functional
- Validation works correctly
- Help text is clear

---

### Test 2.3: AI Configuration Save
**Objective:** Verify AI configuration saves correctly

**Steps:**
1. Select an interaction in Interaction Builder
2. Open AI tab
3. Enter custom prompt template: "When a student selects incorrectly, provide encouraging feedback."
4. Enter event handlers JSON:
   ```json
   {
     "user-selection": {
       "triggerLLM": true,
       "responseFormat": "text"
     }
   }
   ```
5. Enter response actions JSON:
   ```json
   {
     "actionTypes": ["highlight", "show-hint"],
     "defaultFormat": "text"
   }
   ```
6. Click "Save" on the interaction
7. Refresh page and reload the interaction
8. Verify AI configuration persisted

**Expected Result:**
- Configuration saves successfully
- Data persists after refresh
- JSON is validated before save

---

## Test Suite 3: True/False Interaction - AI Integration

### Test 3.1: SDK Initialization
**Objective:** Verify SDK initializes when interaction loads

**Steps:**
1. Navigate to a lesson with a True/False interaction
2. Open browser DevTools Console
3. Navigate to the substage with the True/False interaction
4. Look for console logs:
   - `[LessonView] ✅ Initialized AI SDK for interaction: true-false-selection`
   - `[LessonView] AI SDK initialized for interaction: true-false-selection, processedContentId: [id]`

**Expected Result:**
- SDK initialization logs appear
- Processed content ID is included (if available)
- No errors in console

---

### Test 3.2: Event Emission
**Objective:** Verify events are emitted when user interacts

**Steps:**
1. Navigate to True/False interaction in a lesson
2. Open DevTools Console
3. Select a True/False option
4. Look for console logs indicating event emission
5. Check Network tab for WebSocket messages (if visible)
6. Verify event includes:
   - Event type: `user-selection`
   - Data with fragment index and correctness
   - `requiresLLMResponse: true`

**Expected Result:**
- Events are emitted correctly
- Event data is structured properly
- WebSocket connection is active

---

### Test 3.3: AI Response Reception
**Objective:** Verify AI responses are received and handled

**Steps:**
1. Navigate to True/False interaction
2. Select an incorrect answer
3. Wait for AI response (may take a few seconds)
4. Check console for:
   - AI response received logs
   - Response structure (text, actions, stateUpdates)
5. Verify response appears in the UI (if implemented)
6. Check that response is relevant to the interaction context

**Expected Result:**
- AI responses are received
- Response structure matches expected format
- Responses are contextually relevant

---

### Test 3.4: Score Change Events
**Objective:** Verify score changes trigger AI events

**Steps:**
1. Navigate to True/False interaction
2. Select multiple options
3. Click "Check Answers" or submit
4. Verify score change event is emitted
5. Check that AI receives score information
6. Verify AI response acknowledges the score

**Expected Result:**
- Score change events are emitted
- AI receives score data
- AI responds appropriately to score changes

---

## Test Suite 4: Inventor Assistant - Code Generation

### Test 4.1: Accessing Inventor Assistant
**Objective:** Verify Inventor assistant is accessible

**Steps:**
1. Navigate to `http://localhost:8100/interaction-builder`
2. Select or create an interaction
3. Open the chat/assistant panel (if available)
4. Or navigate to a page where Inventor assistant is accessible
5. Verify assistant responds to queries

**Expected Result:**
- Inventor assistant is accessible
- Can send queries and receive responses

---

### Test 4.2: SDK Code Generation - HTML Interaction
**Objective:** Verify Inventor can generate HTML interaction code with SDK

**Steps:**
1. Access Inventor assistant
2. Send query: "Help me create an HTML interaction that uses the AI SDK to emit events when buttons are clicked"
3. Verify response includes:
   - `createIframeAISDK()` setup code
   - `emitEvent()` calls
   - `onResponse()` handlers
   - Proper event types
4. Copy the generated code
5. Test in Interaction Builder (paste into HTML code tab)

**Expected Result:**
- Generated code includes SDK integration
- Code follows SDK patterns from documentation
- Code is syntactically correct

---

### Test 4.3: SDK Code Generation - PixiJS Interaction
**Objective:** Verify Inventor can generate PixiJS interaction code with SDK

**Steps:**
1. Access Inventor assistant
2. Send query: "Create a PixiJS drag-and-drop interaction that uses the AI SDK to send events when sprites are moved"
3. Verify response includes:
   - PixiJS setup code
   - `createIframeAISDK()` integration
   - Event emission on drag events
   - Response handling
4. Verify code references SDK documentation correctly

**Expected Result:**
- Generated code integrates SDK properly
- PixiJS and SDK code work together
- Event handling is correct

---

### Test 4.4: SDK Code Generation - iFrame Interaction
**Objective:** Verify Inventor can generate iFrame interaction code with SDK

**Steps:**
1. Access Inventor assistant
2. Send query: "Help me add AI SDK integration to an iframe interaction for requesting hints"
3. Verify response includes:
   - `createIframeAISDK()` setup
   - Hint request event emission
   - Response handling for hints
4. Verify code is appropriate for iframe context

**Expected Result:**
- Generated code is iframe-appropriate
- SDK integration is correct
- Hint request pattern is followed

---

## Test Suite 5: Prompt Assembly Verification

### Test 5.1: Backend Prompt Building
**Objective:** Verify prompts are assembled correctly in backend

**Steps:**
1. Set up backend logging (or check logs)
2. Trigger an interaction event (e.g., select option in True/False)
3. Check backend logs for:
   - `[AITeacherPromptBuilder] Built prompt for interaction [id]`
   - Prompt length logged
4. Verify prompt includes:
   - Base system prompt
   - SDK content reference
   - Event handling instructions
   - Response format instructions
   - Interaction context
   - Custom instructions (if set)

**Expected Result:**
- Prompts are built correctly
- All layers are included
- Prompt length is reasonable

---

### Test 5.2: Prompt Content Verification
**Objective:** Verify prompt content matches database

**Steps:**
1. Update a prompt in Super Admin (e.g., Base System Prompt)
2. Save the change
3. Trigger an interaction event
4. Check backend logs or add temporary logging to see the actual prompt sent to LLM
5. Verify the updated prompt content is used

**Expected Result:**
- Updated prompts are used immediately
- No caching issues
- Prompt content matches database

---

### Test 5.3: Interaction Context in Prompts
**Objective:** Verify interaction context is included correctly

**Steps:**
1. Navigate to a True/False interaction with processed content
2. Trigger an event
3. Verify prompt includes:
   - Interaction type name and ID
   - Processed content data (if available)
   - Current interaction state
   - Recent events
4. Check that state updates are reflected in subsequent prompts

**Expected Result:**
- Context is included accurately
- State updates appear in prompts
- Recent events are included

---

## Test Suite 6: WebSocket Communication

### Test 6.1: WebSocket Connection
**Objective:** Verify WebSocket connection is established

**Steps:**
1. Navigate to a lesson with an interaction
2. Open DevTools → Network tab
3. Filter for WS (WebSocket)
4. Verify WebSocket connection to `ws://localhost:3000`
5. Check connection status is "Open"

**Expected Result:**
- WebSocket connects successfully
- Connection remains stable
- No connection errors

---

### Test 6.2: Event Transmission
**Objective:** Verify events are sent via WebSocket

**Steps:**
1. Open WebSocket inspector or monitor Network tab
2. Trigger an interaction event
3. Verify message is sent with:
   - Event type: `interaction-event`
   - Payload includes: lessonId, substageId, interactionId, event, currentState
4. Check message structure is correct

**Expected Result:**
- Events are transmitted correctly
- Message structure matches expected format
- No transmission errors

---

### Test 6.3: Response Reception
**Objective:** Verify AI responses are received via WebSocket

**Steps:**
1. Monitor WebSocket messages
2. Trigger an interaction event that requires LLM response
3. Wait for response message
4. Verify message type: `interaction-ai-response`
5. Verify payload includes:
   - Response text
   - Actions (if any)
   - State updates (if any)

**Expected Result:**
- Responses are received correctly
- Response structure matches expected format
- Responses arrive in reasonable time (< 10 seconds)

---

## Test Suite 7: Error Handling

### Test 7.1: Invalid JSON in AI Configuration
**Objective:** Verify validation prevents invalid JSON

**Steps:**
1. Open Interaction Builder → AI tab
2. Enter invalid JSON in Event Handlers field:
   ```json
   {
     "user-selection": {
       "triggerLLM": true
       // Missing comma
       "responseFormat": "text"
     }
   }
   ```
3. Verify error message appears
4. Verify Save button is disabled or shows error

**Expected Result:**
- Invalid JSON is caught
- Clear error message displayed
- Save is prevented

---

### Test 7.2: Missing Processed Content
**Objective:** Verify system handles missing processed content gracefully

**Steps:**
1. Create or use an interaction without processed content
2. Navigate to lesson with this interaction
3. Verify SDK still initializes
4. Trigger an event
5. Verify AI still responds (may be less contextual)

**Expected Result:**
- System handles missing processed content
- No errors thrown
- AI still responds appropriately

---

### Test 7.3: WebSocket Disconnection
**Objective:** Verify system handles WebSocket disconnection

**Steps:**
1. Navigate to interaction in lesson
2. Disconnect network or stop backend
3. Trigger an interaction event
4. Verify error handling (may show message to user)
5. Reconnect network/backend
6. Verify system recovers

**Expected Result:**
- Disconnection is handled gracefully
- User is informed (if applicable)
- System recovers when connection restored

---

## Test Suite 8: Integration Testing

### Test 8.1: End-to-End Interaction Flow
**Objective:** Verify complete flow from event to response

**Steps:**
1. Navigate to True/False interaction in lesson
2. Select an incorrect answer
3. Verify:
   - Event is emitted
   - Event is sent via WebSocket
   - Backend receives event
   - Backend builds prompt
   - Backend calls LLM
   - Response is parsed
   - Response is sent back via WebSocket
   - Frontend receives response
   - Response is handled in interaction component
4. Check console for any errors at each step

**Expected Result:**
- Complete flow works end-to-end
- No errors at any step
- Response appears in reasonable time

---

### Test 8.2: Multiple Rapid Events
**Objective:** Verify system handles rapid event sequences

**Steps:**
1. Navigate to True/False interaction
2. Rapidly select multiple options
3. Verify:
   - All events are emitted
   - Events are queued/handled correctly
   - Responses don't get mixed up
   - State updates correctly

**Expected Result:**
- System handles rapid events
- No event loss
- Responses are correctly associated with events

---

### Test 8.3: Custom Event Types
**Objective:** Verify custom event types work

**Steps:**
1. Create an interaction with custom event handler:
   ```json
   {
     "custom-event": {
       "triggerLLM": true,
       "responseFormat": "text"
     }
   }
   ```
2. In interaction code, emit custom event:
   ```javascript
   aiSDK.emitEvent({
     type: 'custom-event',
     data: { customData: 'value' },
     requiresLLMResponse: true
   });
   ```
3. Verify event is processed
4. Verify AI responds appropriately

**Expected Result:**
- Custom events are accepted
- Custom events trigger LLM responses
- System is flexible with event types

---

## Test Suite 9: Performance Testing

### Test 9.1: Response Time
**Objective:** Verify AI responses arrive in reasonable time

**Steps:**
1. Navigate to interaction
2. Trigger event requiring LLM response
3. Measure time from event to response
4. Repeat 5 times
5. Calculate average response time

**Expected Result:**
- Average response time < 10 seconds
- No timeouts
- Consistent performance

---

### Test 9.2: Prompt Size
**Objective:** Verify prompts don't exceed token limits

**Steps:**
1. Create interaction with large processed content
2. Add custom prompt template
3. Trigger event
4. Check backend logs for prompt length
5. Verify prompt is within reasonable size (< 8000 tokens estimated)

**Expected Result:**
- Prompts stay within limits
- No truncation issues
- System handles large contexts

---

## Test Suite 10: Database Verification

### Test 10.1: AI Configuration Persistence
**Objective:** Verify AI configuration is stored in database

**Steps:**
1. Set AI configuration for an interaction
2. Save interaction
3. Check database:
   ```sql
   SELECT ai_prompt_template, ai_event_handlers, ai_response_actions 
   FROM interaction_types 
   WHERE id = '[interaction-id]';
   ```
4. Verify data matches what was entered

**Expected Result:**
- Data is stored correctly
- JSON fields are valid
- All fields persist

---

### Test 10.2: Prompt Storage
**Objective:** Verify prompts are stored in ai_prompts table

**Steps:**
1. Update a prompt in Super Admin
2. Check database:
   ```sql
   SELECT * FROM ai_prompts 
   WHERE assistant_id = 'ai-teacher' AND prompt_key = '[key]';
   ```
3. Verify content matches what was saved

**Expected Result:**
- Prompts are stored correctly
- Updates are saved
- No data loss

---

## Test Suite 11: UI/UX Testing

### Test 11.1: AI Tab Usability
**Objective:** Verify AI tab is user-friendly

**Steps:**
1. Open Interaction Builder
2. Navigate to AI tab
3. Verify:
   - Fields are clearly labeled
   - Hints are helpful
   - JSON validation errors are clear
   - Save buttons work correctly
   - Layout is clean and organized

**Expected Result:**
- UI is intuitive
- Help text is clear
- Validation feedback is helpful

---

### Test 11.2: Console Logging
**Objective:** Verify console logs are helpful for debugging

**Steps:**
1. Open DevTools Console
2. Navigate through interaction flow
3. Verify logs include:
   - SDK initialization
   - Event emission
   - Response reception
   - State updates
4. Verify logs are not too verbose
5. Verify logs use consistent format

**Expected Result:**
- Logs are informative
- Not overly verbose
- Format is consistent
- Helpful for debugging

---

## Test Suite 12: Edge Cases

### Test 12.1: Empty AI Configuration
**Objective:** Verify system works with empty AI config

**Steps:**
1. Create interaction with no AI configuration
2. Use interaction in lesson
3. Verify:
   - SDK still initializes
   - Events can be emitted
   - System uses default behavior

**Expected Result:**
- System handles empty config
- Default behavior works
- No errors

---

### Test 12.2: Very Long Custom Prompts
**Objective:** Verify system handles long custom prompts

**Steps:**
1. Enter very long custom prompt (2000+ characters)
2. Save interaction
3. Trigger event
4. Verify prompt is included correctly
5. Verify no truncation issues

**Expected Result:**
- Long prompts are handled
- No truncation
- System remains responsive

---

### Test 12.3: Special Characters in Prompts
**Objective:** Verify special characters are handled

**Steps:**
1. Enter prompt with special characters:
   - JSON: `{ "key": "value" }`
   - Code: `function() { }`
   - Markdown: `# Header`
2. Save and verify persistence
3. Verify prompt is used correctly

**Expected Result:**
- Special characters are preserved
- No encoding issues
- Prompts work correctly

---

## Test Suite 13: Cross-Interaction Type Testing

### Test 13.1: HTML Interaction with SDK
**Objective:** Verify HTML interactions can use SDK

**Steps:**
1. Create new HTML interaction
2. Add SDK code using `createIframeAISDK()`
3. Configure AI settings in AI tab
4. Test interaction in lesson
5. Verify events are emitted
6. Verify responses are received

**Expected Result:**
- HTML interactions can use SDK
- postMessage bridge works
- Events and responses function correctly

---

### Test 13.2: PixiJS Interaction with SDK
**Objective:** Verify PixiJS interactions can use SDK

**Steps:**
1. Create new PixiJS interaction
2. Add SDK integration code
3. Configure AI settings
4. Test in lesson
5. Verify drag/drop events trigger AI responses

**Expected Result:**
- PixiJS interactions can use SDK
- Events from PixiJS are captured
- AI responds appropriately

---

### Test 13.3: iFrame Interaction with SDK
**Objective:** Verify iFrame interactions can use SDK

**Steps:**
1. Create new iFrame interaction
2. Add SDK code to embedded page (if possible)
3. Or test with guide URL context
4. Verify AI can provide guidance based on iframe context

**Expected Result:**
- iFrame interactions can use SDK
- Guide URLs provide context
- AI provides relevant guidance

---

## Test Results Template

For each test, record:

- **Test ID:** (e.g., 3.1)
- **Test Name:** (e.g., SDK Initialization)
- **Status:** ✅ Pass / ❌ Fail / ⚠️ Partial
- **Notes:** (Any issues, observations, or deviations)
- **Screenshots/Logs:** (If applicable)

---

## Known Issues / Limitations

Document any known issues discovered during testing:

1. [Issue description]
2. [Issue description]

---

## Sign-off

**Tester:** _________________  
**Date:** _________________  
**Overall Status:** ✅ Pass / ❌ Fail / ⚠️ Partial

---

## Notes

- All tests should be performed in a clean environment when possible
- Clear browser cache between major test sections if needed
- Document any browser-specific issues
- Note any performance concerns
- Record any suggestions for improvement

