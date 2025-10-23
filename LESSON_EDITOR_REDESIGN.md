# Comprehensive Lesson Editor Redesign

## 🎯 **Design Goals**

Based on your React implementation + improvements:
1. ✅ Mobile-first responsive design
2. ✅ Tab-based navigation (not overwhelming sidebars)
3. ✅ Context-aware UI (show relevant options)
4. ✅ Side-by-side views where useful
5. ✅ Quick view switching
6. ✅ All 6 required panels integrated

---

## 🏗️ **Architecture Overview**

### **Layout Structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back]  Edit: JavaScript Fundamentals  [Save] [Submit]        │
├──────────┬──────────────────────────────────────────────────────┤
│  STRUCT  │  📋 Details  🏗️ Structure  📜 Script  📚 Content  │
│   TREE   │   🔍 Preview  🤖 AI Assistant                        │
│          ├──────────────────────────────────────────────────────┤
│ ✓ Lesson │                                                      │
│  ├─Stage1│         ACTIVE PANEL CONTENT HERE                    │
│  │ ├─Sub1│         (Changes based on selected tab)              │
│  │ └─Sub2│                                                      │
│  └─Stage2│                                                      │
│    └─Sub3│                                                      │
│          │                                                      │
│ [+Stage] │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- **Desktop (>1024px):** Sidebar + tabs + main panel
- **Tablet (768-1024px):** Collapsible sidebar + tabs + main
- **Mobile (<768px):** Bottom sheet sidebar + full-width tabs

---

## 📋 **Panel Descriptions**

### **1. Details Panel** (Already exists)
- Lesson title, description, category, difficulty
- Duration, tags, thumbnail
- **Keep current implementation** ✅

### **2. Structure Panel** (NEW)
**Purpose:** Add/edit/reorder stages and substages

**Features:**
- Add Stage button (with stage type selector: Trigger, Explore, Absorb, Cultivate, Hone)
- Add Substage button (context-aware based on stage type)
- Drag-to-reorder (stages and substages)
- Delete stage/substage
- Expand/collapse stages
- Visual hierarchy (indented tree)

**UI:**
```
┌─ Lesson Structure ──────────────────────────┐
│ [+ Add Stage ▼]                             │
│                                              │
│ ▼ Stage 1: Trigger (TIE)                   │
│   ├─ Tease: Hook the Student              │
│   ├─ Ignite: Spark Interest               │
│   └─ Evoke: Emotional Connection          │
│   [+ Add Substage ▼]                        │
│                                              │
│ ▼ Stage 2: Explore (HUNT)                  │
│   ├─ Handle: Introduce Concept             │
│   └─ Uncover: Deeper Understanding         │
│   [+ Add Substage ▼]                        │
└──────────────────────────────────────────────┘
```

### **3. Substage Config Panel** (NEW)
**Purpose:** Configure selected substage details

**Features:**
- Substage title, type, duration
- **Interaction Type Selector:**
  - Dropdown of all interaction types
  - Preview interaction config
  - "Change" button
- **Processed Content Selector:**
  - Dropdown of lesson's processed content outputs
  - "View Content" button
  - "Select Different Content" button
- **Script Button:** "Edit Script →" (opens Script panel)

**UI:**
```
┌─ Substage: Tease ─────────────────────────┐
│ Title: [Hook the Student_______________]  │
│ Type: Tease (Trigger stage)               │
│ Duration: [5] minutes                      │
│                                            │
│ Interaction Type:                          │
│ ┌────────────────────────────────────────┐ │
│ │ [Drag & Drop ▼]        [Change]        │ │
│ │ Interactive drag-and-drop exercise      │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Processed Content:                         │
│ ┌────────────────────────────────────────┐ │
│ │ [Key Q&A Pairs ▼]      [View] [Change] │ │
│ │ From: React Docs (Extract Q&A)         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ [📜 Edit Script Timeline →]                │
└────────────────────────────────────────────┘
```

### **4. Script Editor Panel** (NEW)
**Purpose:** Timeline-based script for teacher talk + actions

**Features:**
- Timeline view (0:00 to substage duration)
- Add Script Block button
  - "Teacher Talk" - text the AI teacher says
  - "Load Interaction" - triggers interaction at specific time
  - "Pause for Question" - allows student interaction
- Drag blocks to reorder on timeline
- Start/end time for each block
- Preview mode (play through script)

**UI:**
```
┌─ Script Timeline (Tease - 5 min) ─────────────┐
│ [+ Add Block ▼] [Teacher Talk|Load Interaction]│
│                                                 │
│ 0:00 ─┬─ 👨‍🏫 Teacher Talk ─────────────────┐│
│       │  "Welcome to JavaScript! Let's start"  ││
│       │  [0:00 - 0:30] [Edit] [Delete]         ││
│       └────────────────────────────────────────┘│
│ 0:30 ─┬─ 🎯 Load Interaction ────────────────┐│
│       │  Type: Drag & Drop                     ││
│       │  [0:30 - 2:00] [Edit] [Delete]         ││
│       └────────────────────────────────────────┘│
│ 2:00 ─┬─ 👨‍🏫 Teacher Talk ─────────────────┐│
│       │  "Great job! Now let's explore..."     ││
│       │  [2:00 - 3:00] [Edit] [Delete]         ││
│       └────────────────────────────────────────┘│
│ 5:00 ──────────────── End ──────────────────────│
│                                                 │
│ [▶ Preview Script]                              │
└─────────────────────────────────────────────────┘
```

### **5. Content Processing Panel** (NEW)
**Purpose:** Add content, apply N8N flows, store processed outputs

**Features:**
- **Add Source Content:**
  - Search existing content library (Weaviate)
  - Upload new file (PDF, image, etc.)
  - Paste URL
  - Add text directly
- **Select N8N Workflow:**
  - List available workflows (from workflows table)
  - Upload custom N8N JSON
  - Common flows: Extract Q&A, Summarize, Extract Facts, Vectorize
- **Process Content:**
  - Trigger n8n workflow
  - Show processing status
  - Display output preview
  - Save as "Processed Content Output" for this lesson
- **Manage Outputs:**
  - List all processed content for this lesson
  - View/edit outputs
  - Delete outputs
  - Use in substages

**UI:**
```
┌─ Content Processing ──────────────────────────────┐
│                                                    │
│ Step 1: Add Source Content                        │
│ ┌────────────────────────────────────────────────┐│
│ │ [📚 Search Library] [📄 Upload File] [🔗 URL] ││
│ │                                                 ││
│ │ Selected: React Hooks Documentation             ││
│ │ Type: URL  Status: ✓ Approved                  ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ Step 2: Select Processing Workflow                │
│ ┌────────────────────────────────────────────────┐│
│ │ [Extract Q&A Pairs ▼]        [Upload JSON]     ││
│ │ Extracts key questions and answers              ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ Step 3: Process & Review                          │
│ [⚡ Run Workflow]                                 │
│                                                    │
│ Processing Status: ⏳ Running... (30%)            │
│                                                    │
│ Output Preview:                                   │
│ ┌────────────────────────────────────────────────┐│
│ │ Q: What are React hooks?                        ││
│ │ A: Functions that let you use state...          ││
│ │                                                  ││
│ │ Q: When to use useState?                        ││
│ │ A: When component needs local state...          ││
│ │                                                  ││
│ │ [🤖 AI: Refine Output]                          ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ Output Name: [React Hooks Q&A_______________]     │
│ [💾 Save as Processed Content]                    │
│                                                    │
│ ─────────────────────────────────────────────────  │
│ Saved Outputs for This Lesson:                    │
│ • React Hooks Q&A (Extract Q&A) [View] [Use]      │
│ • JS Fundamentals Summary (Summarize) [View] [Use]│
└────────────────────────────────────────────────────┘
```

### **6. Preview Panel** (NEW)
**Purpose:** Test interactions and see student view

**Features:**
- Renders selected substage as student would see it
- If interaction configured: renders interactive element
- If script exists: plays through script timeline
- Test mode: actually functional (can drag, click, etc.)
- Fullscreen toggle
- Timeline scrubber (jump to different times)

**UI:**
```
┌─ Preview: Student View ───────────────────────┐
│ [⛶ Fullscreen] [0:30 ───○─────── 5:00]       │
│                                                │
│ ┌────────────────────────────────────────────┐│
│ │  👨‍🏫 AI Teacher:                           ││
│ │  "Welcome to JavaScript! Let's start"       ││
│ │                                              ││
│ │  ┌─────────────────────────────────────┐   ││
│ │  │   [Drag & Drop Interaction]         │   ││
│ │  │   Drag variables to correct zones:  │   ││
│ │  │                                      │   ││
│ │  │   [ let x = 5 ]  [ const y = 10 ]   │   ││
│ │  │                                      │   ││
│ │  │   Drop Zone: Variables ⬜            │   ││
│ │  └─────────────────────────────────────┘   ││
│ │                                              ││
│ │  💬 Chat with AI Teacher                    ││
│ │  [Ask a question...]                        ││
│ └────────────────────────────────────────────┘│
│                                                │
│ [▶ Play Script] [⏸ Pause] [⏹ Reset]          │
└────────────────────────────────────────────────┘
```

### **7. AI Assistant Panel** (NEW)
**Purpose:** Chat with AI for help with lesson building

**Features:**
- Chat interface
- Context: Current lesson, selected stage/substage
- AI can help with:
  - Content suggestions
  - Script writing
  - Interaction ideas
  - Formatting content
  - **Directly edit processed content outputs**
- Prompt examples/suggestions
- Token usage indicator

**UI:**
```
┌─ AI Lesson Assistant ─────────────────────────┐
│ 🤖 I'm here to help build your lesson          │
│                                                 │
│ Context: Substage "Tease" in Trigger stage     │
│                                                 │
│ 💬 Chat History:                               │
│ ┌─────────────────────────────────────────────┐│
│ │ You: Help me write a hook for JavaScript    ││
│ │                                               ││
│ │ AI: Great! Here's a engaging hook:           ││
│ │ "Did you know JavaScript powers 97% of       ││
│ │ all websites? Let's unlock its secrets!"     ││
│ │                                               ││
│ │ You: Refine the Q&A pairs output            ││
│ │                                               ││
│ │ AI: I've reviewed your Q&A pairs. Here       ││
│ │ are suggested improvements:                  ││
│ │ [Apply to Output] [View Changes]             ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Quick Actions:                                  │
│ • Help write script for this substage          │
│ • Suggest interaction type                     │
│ • Improve content output                       │
│ • Generate teacher talk dialogue               │
│                                                 │
│ [Type your question...]          [Send] (50tok)│
│ Token usage: 2.5K / 20K                         │
└─────────────────────────────────────────────────┘
```

---

## 🎨 **Improved UX Design**

### **Tab Navigation (Top):**
```
┌───────────────────────────────────────────────────┐
│ 📋 Details │ 🏗️ Structure │ 📜 Script │ 📚 Content│
│           ACTIVE          │                       │
├───────────────────────────────────────────────────┤
│ 🔍 Preview │ 🤖 AI Assistant │                    │
└───────────────────────────────────────────────────┘
```

**Tab Behavior:**
- Persists selection across page reloads
- Keyboard shortcuts (Ctrl+1, Ctrl+2, etc.)
- Badge indicators (e.g., "3 outputs" on Content tab)
- Active tab highlighted

### **Left Sidebar (Collapsible):**
- Always visible on desktop (can collapse with resize handle)
- Slide-out drawer on mobile
- Shows lesson structure tree
- Click item → updates tab content contextually
- **Smart auto-switching:**
  - Click stage → switches to Structure tab
  - Click substage → switches to Script tab (if script exists) or Config

### **Main Panel (Dynamic):**
- Content changes based on active tab
- Context-aware based on sidebar selection
- Responsive grid layouts
- Smooth transitions between views

---

## 🔧 **Backend Requirements**

### **New Database Tables:**

**1. Processed Content Outputs:**
```sql
CREATE TABLE processed_content_outputs (
  id UUID PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id),
  content_source_id UUID REFERENCES content_sources(id),
  workflow_id UUID REFERENCES interaction_workflows(id),
  output_name VARCHAR(255),
  output_type VARCHAR(50), -- 'qa_pairs', 'summary', 'facts', 'chunks'
  output_data JSONB, -- The actual processed data
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**2. Script Blocks:**
```sql
CREATE TABLE script_blocks (
  id UUID PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id),
  substage_id VARCHAR(50), -- Substage identifier within lesson JSON
  block_type VARCHAR(50), -- 'teacher_talk', 'load_interaction', 'pause'
  content TEXT,
  start_time INTEGER, -- seconds from substage start
  end_time INTEGER,
  metadata JSONB, -- {interactionId, contentOutputId, etc.}
  sequence_order INTEGER,
  created_at TIMESTAMP
);
```

### **New Backend Endpoints:**

```typescript
// Processed Content
POST   /api/lessons/:id/process-content     - Trigger n8n workflow
GET    /api/lessons/:id/processed-outputs   - List outputs
DELETE /api/lessons/:id/processed-outputs/:outputId
PATCH  /api/lessons/:id/processed-outputs/:outputId - AI refinement

// Script Management
GET    /api/lessons/:id/script/:substageId  - Get script blocks
POST   /api/lessons/:id/script/:substageId  - Add script block
PATCH  /api/lessons/:id/script/blocks/:blockId
DELETE /api/lessons/:id/script/blocks/:blockId
POST   /api/lessons/:id/script/reorder      - Reorder blocks

// AI Assistant (lesson context)
POST   /api/ai/lesson-assist                - AI help with lesson building
POST   /api/ai/refine-content               - AI refine processed output
```

---

## 📱 **Mobile-First Design Improvements**

### **Your React Version Issues:**
- ❌ Multiple sidebars (overwhelming on mobile)
- ❌ Complex navigation between views
- ❌ Hard to see full context on small screens

### **New Design Solutions:**
- ✅ **Bottom Sheet Navigation** on mobile (like Google Maps)
- ✅ **Swipeable tabs** (horizontal scroll)
- ✅ **Collapsible panels** (accordion-style)
- ✅ **Floating Action Button** for quick actions
- ✅ **Full-screen modes** for preview and AI chat

**Mobile Layout:**
```
┌─────────────────────────────┐
│ [≡ Structure]  JavaScript   │
│ Details│Script│Content│More▼ │ ← Swipeable
├─────────────────────────────┤
│                              │
│   ACTIVE TAB CONTENT         │
│   (Full width on mobile)     │
│                              │
├─────────────────────────────┤
│ [○] FAB: Quick Actions       │ ← Floating button
└─────────────────────────────┘

Tap FAB → Bottom Sheet:
┌─────────────────────────────┐
│ Quick Actions:              │
│ • Add Stage                  │
│ • Add Substage               │
│ • Process Content            │
│ • AI Assistant               │
│ • Preview Lesson             │
└─────────────────────────────┘
```

---

## 🚀 **Implementation Plan**

### **Phase 1: Core Structure** (2-3 hours)
- [ ] Fix header overlay (margin-top for lesson-editor pages)
- [ ] Create tab navigation component
- [ ] Build collapsible structure sidebar
- [ ] Implement tab switching logic
- [ ] Responsive breakpoints

### **Phase 2: Structure Panel** (2 hours)
- [ ] Stage/substage tree component
- [ ] Add/delete stage/substage
- [ ] Drag-to-reorder functionality
- [ ] Stage type selector (TEACH method)
- [ ] Substage type based on stage

### **Phase 3: Script Editor** (3 hours)
- [ ] Timeline component
- [ ] Script block editor (teacher talk, load interaction)
- [ ] Time range inputs
- [ ] Drag blocks on timeline
- [ ] Preview script playback

### **Phase 4: Content Processing** (3 hours)
- [ ] Content source selector (Weaviate search)
- [ ] N8N workflow selector
- [ ] Trigger processing
- [ ] Output preview
- [ ] Save processed outputs
- [ ] List lesson's outputs

### **Phase 5: Preview Panel** (2 hours)
- [ ] Render substage content
- [ ] Interaction renderer integration
- [ ] Script playback
- [ ] Timeline scrubber
- [ ] Fullscreen mode

### **Phase 6: AI Assistant** (2 hours)
- [ ] Chat interface
- [ ] Context-aware prompts
- [ ] Quick action buttons
- [ ] Refine content outputs
- [ ] Token usage display

### **Phase 7: Backend** (3-4 hours)
- [ ] ProcessedContentOutput entity
- [ ] ScriptBlock entity
- [ ] API endpoints for outputs
- [ ] API endpoints for script
- [ ] N8N workflow triggers
- [ ] AI assistant endpoints

**Total Estimated Time: 17-20 hours**

---

## 💡 **Key Improvements Over React Version**

### **1. Tab-Based vs. Multiple Sidebars:**
- **React:** Left sidebar (structure) + right sidebar (config) + content panel = 3 panels
- **New:** Structure sidebar + tabs + main panel = clearer hierarchy

### **2. Mobile Navigation:**
- **React:** Desktop-focused, hard to use on mobile
- **New:** Bottom sheets, swipeable tabs, floating action button

### **3. Context-Aware UI:**
- **React:** All options visible always
- **New:** Show relevant options based on selection (stage vs substage)

### **4. Unified Content:**
- **React:** Separate content processing nav
- **New:** Integrated in Content tab with step-by-step workflow

### **5. AI Integration:**
- **React:** No AI assistance
- **New:** Dedicated AI panel that can directly edit outputs

---

## 🎯 **Immediate Next Steps**

**Quick Fix (5 min):**
1. Fix header overlay on lesson-editor and course-details pages

**Full Implementation (this session or next):**
2. Build comprehensive lesson-editor with all 6 panels
3. Create backend entities and endpoints
4. Test complete workflow

---

**Should I:**
1. **Quick fix header now** + start building the new lesson editor (long session)
2. **Document this design** and tackle it in the next session when fresh
3. **Build incrementally** - one panel at a time, testing as we go

What's your preference? This is 17-20 hours of work for the full implementation. 🚀
