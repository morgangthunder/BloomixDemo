# Phase 3: Real-time Features - Implementation Plan

**Date**: October 22, 2025  
**Status**: 🚀 **STARTING NOW**

---

## 🎯 **Phase 3 Goals**

Add real-time chat and AI teacher integration:
- ✅ WebSocket connection (Socket.io)
- ✅ AI chat with Grok API (mocked for MVP)
- ✅ Token usage tracking
- ✅ Real-time notifications
- ✅ Tenant-namespaced rooms

---

## 📋 **Implementation Steps**

### **Step 1: Backend WebSocket Setup**

**Files to Create/Update:**
- `Upora/backend/src/gateway/chat.gateway.ts` - Socket.io gateway
- `Upora/backend/src/services/grok.service.ts` - Mock Grok API
- `Upora/backend/src/services/token-tracking.service.ts` - Token logging
- `Upora/backend/src/modules/chat/chat.module.ts` - Chat module

**Features:**
- Socket.io gateway with authentication
- Tenant-namespaced rooms (tenant-{id})
- Message handling (user → AI teacher)
- Grok API integration (mocked responses)
- Token usage logging to database

---

### **Step 2: Frontend WebSocket Client**

**Files to Create/Update:**
- `Upora/frontend/src/app/core/services/websocket.service.ts` - Socket.io client
- `Upora/frontend/src/app/core/services/chat.service.ts` - Chat state management
- Update Lesson View component with chat UI

**Features:**
- Connect to WebSocket on lesson start
- Send/receive messages
- Display chat history
- Loading states for AI responses
- Disconnect on lesson exit

---

### **Step 3: Chat UI in Lesson View**

**Updates:**
- Add chat panel to lesson view
- Message input field
- Message bubbles (user vs AI)
- Typing indicators
- Token usage display

---

### **Step 4: Token Tracking**

**Features:**
- Track Grok API usage per request
- Store in `token_tracking` table
- Display token usage warnings
- Update user token limits

---

## 🛠️ **Technical Details**

### WebSocket Events

**Client → Server:**
- `join-lesson` - Join lesson room
- `send-message` - Send chat message
- `leave-lesson` - Leave lesson room

**Server → Client:**
- `message` - AI teacher response
- `typing` - AI is typing indicator
- `token-usage` - Token usage update
- `error` - Error messages

### Grok API Mock

**For MVP**, return static responses:
```typescript
{
  role: 'assistant',
  content: 'That's a great question! Let me explain...',
  tokens_used: 150
}
```

**Production**: Replace with real xAI Grok API calls

---

## 📊 **Expected Outcome**

**After Phase 3:**
- Students can chat with AI teacher during lessons
- Messages sent via WebSocket (real-time)
- AI responses appear instantly (mocked)
- Token usage tracked in database
- Multi-tenant isolation maintained

---

## 🧪 **Testing Plan**

1. **WebSocket Connection**
   - Open lesson view → should connect to Socket.io
   - Send message → should receive response
   - Close lesson → should disconnect

2. **AI Chat**
   - Type question → AI responds (mock)
   - Check backend logs → token usage logged
   - Verify database → token_tracking table updated

3. **Multi-tenancy**
   - Different tenants → different rooms
   - Messages isolated per tenant

---

## 📝 **Dependencies to Install**

### Backend:
```bash
# Already installed:
@nestjs/websockets
@nestjs/platform-socket.io
socket.io
```

### Frontend:
```bash
npm install socket.io-client
```

---

## 🚀 **Let's Begin!**

Starting with backend WebSocket gateway setup...

