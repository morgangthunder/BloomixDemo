# Interaction AI SDK - Quick Reference

## Core Methods (4 methods)

### 1. emitEvent(event)
Emit event that may trigger LLM query.
```typescript
aiSDK.emitEvent({
  type: 'user-selection', // or any custom string
  data: { fragmentIndex: 0, isCorrect: true },
  requiresLLMResponse: true
});
```

### 2. getState() / updateState(key, value)
Manage interaction state accessible to LLM.
```typescript
aiSDK.updateState('attempts', 3);
const state = aiSDK.getState(); // { attempts: 3, ... }
```

### 3. onResponse(callback)
Subscribe to LLM responses.
```typescript
aiSDK.onResponse((response) => {
  console.log(response.response); // Text
  response.actions?.forEach(action => {
    if (action.type === 'highlight') highlight(action.target);
  });
});
```

### 4. requestAIResponse(prompt?)
Explicitly request AI response.
```typescript
const response = await aiSDK.requestAIResponse('Explain why this is wrong');
```

## Event Types (Standard - Custom Allowed)

Standard: `user-selection`, `user-input`, `progress-update`, `score-change`, 
`hint-request`, `explanation-request`, `interaction-started`, `interaction-completed`

Custom: Any string allowed. Configure in Interaction Builder.

## Response Structure

```typescript
{
  response: string, // Main text
  actions?: [{ type: 'highlight'|'show-hint'|'update-ui', target: string, data: any }],
  stateUpdates?: { [key: string]: any }
}
```

## Example: True/False Interaction

```typescript
export class MyInteraction {
  constructor(private aiSDK: InteractionAISDK) {
    aiSDK.onResponse((r) => {
      r.actions?.forEach(a => {
        if (a.type === 'highlight') this.highlight(a.target);
      });
    });
  }
  
  onSelect(index: number) {
    aiSDK.emitEvent({
      type: 'user-selection',
      data: { index, isCorrect: this.isCorrect(index) },
      requiresLLMResponse: true
    });
  }
}
```


