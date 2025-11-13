# Source Content ↔ Processed Content Regeneration Plan

## Overview
When source content (human-readable text) is edited, the system should regenerate the processed content (interaction JSON). This uses the same LLM pipeline that normally generates interactions from content sources.

## Current Implementation (v0.3.6)

### Auto-Generation of Source Content
- **When**: Processed content is loaded without a `content_source_id`
- **How**: `generateSourceTextFromInteraction()` converts JSON to human-readable text
- **Location**: `Upora/backend/src/modules/lesson-editor/lesson-editor.service.ts`

### Current Conversion Methods
1. **True/False Selection**: Extracts statements array, formats as numbered list with TRUE/FALSE labels
2. **Fragment Builder**: Would format fragments (not yet implemented)
3. **Generic Fallback**: Pretty-prints JSON with indentation

## Future Implementation: Regeneration from Edited Source

### Use Case
When a user edits the human-readable source content, we need to regenerate the processed content JSON.

### Strategy: Reuse Content Analyzer Pipeline

Instead of trying to parse the edited text back into JSON (which is fragile), **use the Content Analyzer LLM integration**:

1. **Primary Path** (structured parsing):
   - Try to parse the human-readable text back into the expected JSON format
   - Use regex/string parsing for simple formats (e.g., "1. Statement - TRUE")
   
2. **Fallback Path** (LLM reprocessing):
   - If parsing fails OR if the text has been significantly modified
   - Call the **Content Analyzer → Text Input Analysis** prompt
   - This prompt already includes sample JSONs for ALL interaction types
   - The LLM will analyze the text and generate appropriate interaction JSON
   - This is the SAME pipeline used for creating processed content from sources

### Implementation Details

#### Content Analyzer Integration
- **Prompt Location**: `ai_prompts` table, assistant = 'auto-populator' or 'content-analyzer'
- **Prompt Should Include**: 
  - All interaction type schemas
  - Sample JSON for each interaction type
  - Instructions to detect which interaction type fits the content
  - Instructions to generate valid JSON output

#### Detection of Changes
```typescript
// In lesson-editor.service.ts or content-sources controller
async updateSourceContent(sourceId: string, newText: string) {
  const source = await this.contentSourceRepo.findOne({
    where: { id: sourceId },
    relations: ['processedOutputs'] // Find linked processed content
  });
  
  // Get all processed outputs linked to this source
  const processedOutputs = await this.processedOutputRepo.find({
    where: { contentSourceId: sourceId }
  });
  
  // Regenerate each processed output
  for (const output of processedOutputs) {
    await this.regenerateProcessedContent(output.id, newText);
  }
}
```

#### Regeneration Logic
```typescript
async regenerateProcessedContent(outputId: string, newSourceText: string) {
  const output = await this.processedOutputRepo.findOne({ where: { id: outputId } });
  
  // Step 1: Try structured parsing (fast, no LLM cost)
  try {
    const parsed = this.parseSourceText(newSourceText, output.outputType);
    if (parsed) {
      await this.processedOutputRepo.update(outputId, {
        outputData: parsed
      });
      return;
    }
  } catch (error) {
    this.logger.warn(`Structured parsing failed for ${outputId}, falling back to LLM`);
  }
  
  // Step 2: Fallback to Content Analyzer LLM
  const prompt = await this.getContentAnalyzerPrompt(output.outputType);
  const llmResult = await this.llmService.generateContent({
    prompt: prompt,
    context: newSourceText,
    interactionType: output.outputType
  });
  
  await this.processedOutputRepo.update(outputId, {
    outputData: llmResult.json
  });
}
```

### Benefits of This Approach

1. **Reuses Existing Infrastructure**: Same prompts, same LLM integration already tested
2. **Handles Complex Edits**: LLM can understand intent even if format changes
3. **Graceful Degradation**: Tries cheap parsing first, falls back to LLM
4. **Consistent Quality**: Uses the same generation logic as initial creation
5. **Future-Proof**: Adding new interaction types automatically works

### TODO When Implementing

- [ ] Add structured parsers for each interaction type in `parseSourceText()`
- [ ] Ensure Content Analyzer prompts include all interaction schemas
- [ ] Add API endpoint: `PATCH /api/content-sources/:id` that triggers regeneration
- [ ] Add UI affordance showing when processed content is out of sync with source
- [ ] Track `last_regenerated_at` timestamp to detect stale processed content
- [ ] Add validation to ensure regenerated JSON matches interaction schema
- [ ] Handle multiple processed outputs from the same source (e.g., different interaction types)
- [ ] Consider caching: don't regenerate if source text hasn't actually changed

### Related Files

- `Upora/backend/src/modules/lesson-editor/lesson-editor.service.ts` - Current auto-generation
- `Upora/backend/src/modules/content-sources/` - Source content CRUD
- `Upora/backend/src/modules/ai-prompts/` - Content Analyzer prompts
- `Upora/backend/src/services/llm-generation.service.ts` - LLM integration
- `Upora/frontend/src/app/features/lesson-editor/` - UI for editing source content

### Database Schema Consideration

Consider adding to `content_sources` table:
```sql
ALTER TABLE content_sources ADD COLUMN last_modified_at TIMESTAMP;
ALTER TABLE processed_content_outputs ADD COLUMN last_regenerated_at TIMESTAMP;
ALTER TABLE processed_content_outputs ADD COLUMN regeneration_source VARCHAR(50); -- 'manual', 'auto', 'llm-fallback'
```

This allows tracking when content was edited and whether regeneration is needed.

---

**Version**: Documented in v0.3.6
**Status**: Future Implementation
**Priority**: Medium (needed when users start editing source content)

